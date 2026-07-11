import { expect, test } from 'bun:test';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  anchorAwsTokenCaches,
  detectClaudeProvider,
  resolveAgent,
  resolveClaudeAutoModel,
  vertexAdcExportLine,
} from '../src/agents/index.ts';
import type { AgentConfig } from '../src/contracts/agent-config.ts';
import { makeTempHome } from './provision-helpers.ts';

// The claude.yaml surface the adapter depends on. required_env carries
// ANTHROPIC_API_KEY, the trigger for the per-run env-file + API-key approval.
function claudeConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    name: 'claude',
    binary: 'claude',
    home_config_subdir: '.claude',
    session_log_dir: '${QUORUM_AGENT_HOME}/.claude/projects',
    session_log_glob: '*.jsonl',
    normalizer: 'claude',
    required_env: ['ANTHROPIC_API_KEY', 'SUPERPOWERS_ROOT'],
    runtime_family: 'claude',
    ...overrides,
  };
}

const API_KEY = 'sk-ant-0123456789abcdefghijklmnopqrstuvwxyz';

// Set (or delete, for undefined) env vars the adapter reads via env.ts ->
// process.env, run body, then restore. env.ts has no setter; test/agent-*.ts
// is exempted from noProcessEnv in biome.json.
function withEnv(
  vars: Record<string, string | undefined>,
  body: () => void,
): void {
  const keys = Object.keys(vars);
  const prev: Record<string, string | undefined> = {};
  for (const key of keys) {
    prev[key] = process.env[key];
    const value = vars[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    body();
  } finally {
    for (const key of keys) {
      const original = prev[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  }
}

// Pre-seed configDir/.claude.json so provision() extends an existing file. Claude
// no longer copies a home skeleton (IS_DEMO/onboarding state is unnecessary —
// recent claude boots on API-key auth + the trust block alone), so prior state
// is modeled by writing .claude.json directly rather than via a skeleton copy.
function seedClaudeJson(configDir: string, claudeJson: unknown): void {
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, '.claude.json'), JSON.stringify(claudeJson));
}

// The per-project trust block must carry all four keys, including
// hasClaudeMdExternalIncludesWarningShown.
test('provision writes all four trust keys including the external-includes warning flag', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv({ ANTHROPIC_API_KEY: API_KEY }, () => {
      const agent = resolveAgent(claudeConfig());
      agent.provision(home, undefined as never);

      const claudeJson: { projects: Record<string, unknown> } = JSON.parse(
        readFileSync(join(home.configDir, '.claude.json'), 'utf8'),
      );
      const projectKeys = Object.keys(claudeJson.projects);
      expect(projectKeys.length).toBe(1);
      const firstKey = projectKeys[0] ?? '';
      expect(claudeJson.projects[firstKey]).toEqual({
        hasTrustDialogAccepted: true,
        projectOnboardingSeenCount: 1,
        hasClaudeMdExternalIncludesApproved: true,
        hasClaudeMdExternalIncludesWarningShown: true,
      });
    });
  } finally {
    cleanup();
  }
});

// claude provisioning writes the per-project trust block UNCONDITIONALLY (a
// deliberate divergence from the retired Python, which gated it on a seeded
// skeleton): claude no longer ships an onboarding skeleton, so provision always
// synthesizes the trust block from {} so the workspace-trust prompt never fires.
test('provision writes the trust block even with no prior .claude.json', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv({ ANTHROPIC_API_KEY: API_KEY }, () => {
      const agent = resolveAgent(claudeConfig());
      agent.provision(home, undefined as never);

      const claudeJson: { projects: Record<string, unknown> } = JSON.parse(
        readFileSync(join(home.configDir, '.claude.json'), 'utf8'),
      );
      expect(Object.keys(claudeJson.projects).length).toBe(1);
    });
  } finally {
    cleanup();
  }
});

// B1-claude-api-key-approval: when ANTHROPIC_API_KEY is in required_env, write
// the per-run approval fingerprint (api_key[-20:]) into
// customApiKeyResponses.approved and scrub it from rejected (Python
// _approve_claude_api_key 466-483).
test('provision seeds the customApiKeyResponses approval fingerprint and scrubs rejected', () => {
  const { home, cleanup } = makeTempHome();
  // Pre-existing .claude.json pre-rejected this exact fingerprint; approval must move it.
  const fingerprint = API_KEY.slice(-20);
  seedClaudeJson(home.configDir, {
    customApiKeyResponses: { approved: [], rejected: [fingerprint, 'other'] },
  });
  try {
    withEnv({ ANTHROPIC_API_KEY: API_KEY }, () => {
      const agent = resolveAgent(claudeConfig());
      agent.provision(home, undefined as never);

      const claudeJson: {
        customApiKeyResponses: { approved: string[]; rejected: string[] };
      } = JSON.parse(
        readFileSync(join(home.configDir, '.claude.json'), 'utf8'),
      );
      expect(claudeJson.customApiKeyResponses.approved).toEqual([fingerprint]);
      // The matching fingerprint is removed from rejected; others stay.
      expect(claudeJson.customApiKeyResponses.rejected).toEqual(['other']);
    });
  } finally {
    cleanup();
  }
});

// B1-claude-api-key-approval (idempotence): a fingerprint already approved is
// not duplicated (Python `if fingerprint not in approved`).
test('provision does not duplicate an already-approved fingerprint', () => {
  const { home, cleanup } = makeTempHome();
  const fingerprint = API_KEY.slice(-20);
  seedClaudeJson(home.configDir, {
    customApiKeyResponses: { approved: [fingerprint] },
  });
  try {
    withEnv({ ANTHROPIC_API_KEY: API_KEY }, () => {
      const agent = resolveAgent(claudeConfig());
      agent.provision(home, undefined as never);
      const claudeJson: {
        customApiKeyResponses: { approved: string[] };
      } = JSON.parse(
        readFileSync(join(home.configDir, '.claude.json'), 'utf8'),
      );
      expect(claudeJson.customApiKeyResponses.approved).toEqual([fingerprint]);
    });
  } finally {
    cleanup();
  }
});

// B1-x-claude-envfile-chmod-reenforce: the .claude-env mode must be 0600 even
// when the file already existed with looser perms (Python double-fchmods;
// writeFileSync's mode is ignored for an existing file, so a follow-up chmod is
// required).
test('provision re-enforces 0600 on a pre-existing looser-perm .claude-env', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv({ ANTHROPIC_API_KEY: API_KEY }, () => {
      // Pre-create configDir and a world-readable .claude-env.
      mkdirSync(home.configDir, { recursive: true });
      const envFile = join(home.configDir, '.claude-env');
      writeFileSync(envFile, 'STALE\n', { mode: 0o644 });
      expect(statSync(envFile).mode & 0o777).toBe(0o644);

      const agent = resolveAgent(claudeConfig());
      agent.provision(home, undefined as never);

      expect(readFileSync(envFile, 'utf8')).toBe(
        `export ANTHROPIC_API_KEY='${API_KEY}'\n`,
      );
      expect(statSync(envFile).mode & 0o777).toBe(0o600);
    });
  } finally {
    cleanup();
  }
});

// Contract change (claude-auto): a config that pins NO provider var no longer
// silently skips auth seeding — provision auto-detects the provider from the
// host env instead (see the claude-auto tests below). With only an API key in
// the env, the auto path seeds API-key auth exactly like the pinned path.
test('provision (no pinned provider) auto-detects instead of silently skipping auth', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ANTHROPIC_API_KEY: API_KEY,
        CLAUDE_CODE_USE_BEDROCK: undefined,
        CLAUDE_CODE_USE_VERTEX: undefined,
      },
      () => {
        const agent = resolveAgent(
          claudeConfig({ required_env: ['SUPERPOWERS_ROOT'] }),
        );
        agent.provision(home, undefined as never);
        const envFile = join(home.configDir, '.claude-env');
        expect(existsSync(envFile)).toBe(true);
        expect(readFileSync(envFile, 'utf8')).toContain(
          `export ANTHROPIC_API_KEY='${API_KEY}'`,
        );
      },
    );
  } finally {
    cleanup();
  }
});

// --- Bedrock auth (claude-bedrock.yaml) ---
// The claude-bedrock surface: runtime_family claude, required_env carries
// CLAUDE_CODE_USE_BEDROCK (the trigger) instead of ANTHROPIC_API_KEY.
function bedrockConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    name: 'claude-bedrock',
    binary: 'claude',
    home_config_subdir: '.claude',
    session_log_dir: '${QUORUM_AGENT_HOME}/.claude/projects',
    session_log_glob: '*.jsonl',
    normalizer: 'claude',
    required_env: ['CLAUDE_CODE_USE_BEDROCK', 'AWS_REGION', 'SUPERPOWERS_ROOT'],
    runtime_family: 'claude',
    model: 'us.anthropic.claude-opus-4-8',
    ...overrides,
  };
}

// Bedrock + profile auth: the env-file exports CLAUDE_CODE_USE_BEDROCK and
// AWS_REGION, forwards AWS_PROFILE, and anchors the AWS config/credentials files
// at the real home so the throwaway HOME does not hide the profile. No API key,
// no approval block, file is 0600.
test('provision (bedrock, profile) writes Bedrock env-file with AWS file anchors and no API key', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ANTHROPIC_API_KEY: undefined,
        CLAUDE_CODE_USE_BEDROCK: '1',
        AWS_REGION: 'us-east-1',
        AWS_PROFILE: 'claude-code',
        AWS_ACCESS_KEY_ID: undefined,
        AWS_SECRET_ACCESS_KEY: undefined,
        AWS_SESSION_TOKEN: undefined,
        AWS_DEFAULT_REGION: undefined,
      },
      () => {
        const agent = resolveAgent(bedrockConfig());
        agent.provision(home, undefined as never);

        const envFile = join(home.configDir, '.claude-env');
        expect(existsSync(envFile)).toBe(true);
        const body = readFileSync(envFile, 'utf8');
        expect(body).toContain("export CLAUDE_CODE_USE_BEDROCK='1'");
        expect(body).toContain("export AWS_REGION='us-east-1'");
        expect(body).toContain("export AWS_PROFILE='claude-code'");
        expect(body).toContain('export AWS_CONFIG_FILE=');
        expect(body).toContain('export AWS_SHARED_CREDENTIALS_FILE=');
        expect(body).toContain('/.aws/config');
        expect(body).toContain('/.aws/credentials');
        // No API key in Bedrock mode.
        expect(body).not.toContain('ANTHROPIC_API_KEY');
        // 0600 perms.
        expect(statSync(envFile).mode & 0o777).toBe(0o600);
        // No API-key approval block written.
        const claudeJsonPath = join(home.configDir, '.claude.json');
        const claudeJson: {
          customApiKeyResponses?: unknown;
          projects: Record<string, unknown>;
        } = JSON.parse(readFileSync(claudeJsonPath, 'utf8'));
        expect(claudeJson.customApiKeyResponses).toBeUndefined();
        // Trust block still written (so the workspace-trust prompt never fires).
        expect(Object.keys(claudeJson.projects).length).toBe(1);
      },
    );
  } finally {
    cleanup();
  }
});

// Bedrock + static keys: when no AWS_PROFILE is set, forward static keys and the
// session token; do not write the profile-only AWS file anchors.
test('provision (bedrock, static keys) forwards static AWS keys without file anchors', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ANTHROPIC_API_KEY: undefined,
        CLAUDE_CODE_USE_BEDROCK: '1',
        AWS_REGION: 'us-west-2',
        AWS_PROFILE: undefined,
        AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'secret123',
        AWS_SESSION_TOKEN: 'token123',
      },
      () => {
        const agent = resolveAgent(bedrockConfig());
        agent.provision(home, undefined as never);

        const body = readFileSync(join(home.configDir, '.claude-env'), 'utf8');
        expect(body).toContain("export AWS_ACCESS_KEY_ID='AKIAEXAMPLE'");
        expect(body).toContain("export AWS_SECRET_ACCESS_KEY='secret123'");
        expect(body).toContain("export AWS_SESSION_TOKEN='token123'");
        expect(body).not.toContain('AWS_PROFILE');
        expect(body).not.toContain('AWS_CONFIG_FILE');
      },
    );
  } finally {
    cleanup();
  }
});

// Bedrock + SSO profile: provision symlinks the real ~/.aws/sso/cache (and
// cli/cache) into the throwaway run home so the SDK — which finds the SSO token
// via HOME, not AWS_CONFIG_FILE — can resolve the operator's `aws sso login`
// token under the pinned HOME.
test('anchorAwsTokenCaches symlinks the real SSO + CLI caches into the run home', () => {
  const { home, cleanup } = makeTempHome();
  const fakeRealHome = mkdtempSync(join(tmpdir(), 'quorum-realhome-'));
  const realAwsDir = join(fakeRealHome, '.aws');
  mkdirSync(join(realAwsDir, 'sso', 'cache'), { recursive: true });
  mkdirSync(join(realAwsDir, 'cli', 'cache'), { recursive: true });
  writeFileSync(
    join(realAwsDir, 'sso', 'cache', 'token.json'),
    '{"accessToken":"x"}',
  );
  try {
    const runHome = join(home.configDir, '..');
    mkdirSync(runHome, { recursive: true });
    anchorAwsTokenCaches(runHome, realAwsDir);

    const ssoLink = join(runHome, '.aws', 'sso', 'cache');
    const cliLink = join(runHome, '.aws', 'cli', 'cache');
    expect(lstatSync(ssoLink).isSymbolicLink()).toBe(true);
    expect(lstatSync(cliLink).isSymbolicLink()).toBe(true);
    expect(realpathSync(ssoLink)).toBe(
      realpathSync(join(realAwsDir, 'sso', 'cache')),
    );
    expect(existsSync(join(ssoLink, 'token.json'))).toBe(true);
  } finally {
    cleanup();
    rmSync(fakeRealHome, { recursive: true, force: true });
  }
});

// Best-effort: when the real cache dirs are absent (static-key auth, or SSO
// never logged in), the helper creates no symlink and does not throw.
test('anchorAwsTokenCaches is a no-op when the real cache dirs are absent', () => {
  const { home, cleanup } = makeTempHome();
  const fakeRealHome = mkdtempSync(join(tmpdir(), 'quorum-realhome-'));
  const realAwsDir = join(fakeRealHome, '.aws'); // intentionally not created
  try {
    const runHome = join(home.configDir, '..');
    mkdirSync(runHome, { recursive: true });
    expect(() => anchorAwsTokenCaches(runHome, realAwsDir)).not.toThrow();
    expect(existsSync(join(runHome, '.aws', 'sso', 'cache'))).toBe(false);
  } finally {
    cleanup();
    rmSync(fakeRealHome, { recursive: true, force: true });
  }
});

// Mixed case: only sso/cache present (cli/cache absent). Each rel is anchored
// independently, so the sso link is created and no cli link is left behind.
test('anchorAwsTokenCaches anchors sso/cache even when cli/cache is absent', () => {
  const { home, cleanup } = makeTempHome();
  const fakeRealHome = mkdtempSync(join(tmpdir(), 'quorum-realhome-'));
  const realAwsDir = join(fakeRealHome, '.aws');
  mkdirSync(join(realAwsDir, 'sso', 'cache'), { recursive: true });
  // cli/cache intentionally NOT created
  try {
    const runHome = join(home.configDir, '..');
    mkdirSync(runHome, { recursive: true });
    anchorAwsTokenCaches(runHome, realAwsDir);
    expect(
      lstatSync(join(runHome, '.aws', 'sso', 'cache')).isSymbolicLink(),
    ).toBe(true);
    expect(existsSync(join(runHome, '.aws', 'cli', 'cache'))).toBe(false);
  } finally {
    cleanup();
    rmSync(fakeRealHome, { recursive: true, force: true });
  }
});

// Leave-alone: a real (non-symlink) dir already at the destination is neither
// replaced nor followed — its contents survive untouched.
test('anchorAwsTokenCaches leaves a pre-existing real dir at the destination untouched', () => {
  const { home, cleanup } = makeTempHome();
  const fakeRealHome = mkdtempSync(join(tmpdir(), 'quorum-realhome-'));
  const realAwsDir = join(fakeRealHome, '.aws');
  mkdirSync(join(realAwsDir, 'sso', 'cache'), { recursive: true });
  try {
    const runHome = join(home.configDir, '..');
    // Pre-create a REAL dir at the link destination.
    const dest = join(runHome, '.aws', 'sso', 'cache');
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, 'preexisting.txt'), 'keep me');
    anchorAwsTokenCaches(runHome, realAwsDir);
    // Still a real dir (not replaced with a symlink), and its content is intact.
    expect(lstatSync(dest).isSymbolicLink()).toBe(false);
    expect(existsSync(join(dest, 'preexisting.txt'))).toBe(true);
  } finally {
    cleanup();
    rmSync(fakeRealHome, { recursive: true, force: true });
  }
});

// Bedrock provisioning fails at setup when AWS_REGION is unset, rather than
// writing a half-configured auth file.
test('provision (bedrock) throws when AWS_REGION is unset', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ANTHROPIC_API_KEY: undefined,
        CLAUDE_CODE_USE_BEDROCK: '1',
        AWS_REGION: undefined,
        AWS_PROFILE: 'claude-code',
      },
      () => {
        const agent = resolveAgent(bedrockConfig());
        expect(() => agent.provision(home, undefined as never)).toThrow(
          /AWS_REGION/,
        );
      },
    );
  } finally {
    cleanup();
  }
});

// Integration: provision wires anchorAwsTokenCaches for the Bedrock+profile
// case. os.homedir() is not redirectable in-process, so this asserts against
// the real ~/.aws when present (a dev/CI box with an `aws sso login` session)
// and otherwise verifies the best-effort no-throw path. Either way provision
// must not break.
test('provision (bedrock, profile) wires SSO cache anchoring without throwing', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ANTHROPIC_API_KEY: undefined,
        CLAUDE_CODE_USE_BEDROCK: '1',
        AWS_REGION: 'us-east-1',
        AWS_PROFILE: 'claude-code',
        AWS_ACCESS_KEY_ID: undefined,
        AWS_SECRET_ACCESS_KEY: undefined,
        AWS_SESSION_TOKEN: undefined,
      },
      () => {
        const agent = resolveAgent(bedrockConfig());
        expect(() => agent.provision(home, undefined as never)).not.toThrow();
        const runHome = join(home.configDir, '..');
        const realSso = join(homedir(), '.aws', 'sso', 'cache');
        const linkPath = join(runHome, '.aws', 'sso', 'cache');
        if (existsSync(realSso)) {
          // Real SSO cache present → provision anchored it.
          expect(lstatSync(linkPath).isSymbolicLink()).toBe(true);
        } else {
          // No real cache → best-effort skip, no link created.
          expect(existsSync(linkPath)).toBe(false);
        }
      },
    );
  } finally {
    cleanup();
  }
});

// Static-key auth (no AWS_PROFILE) must NOT create any .aws symlink in the run
// home — the token caches are only relevant to profile/SSO auth.
test('provision (bedrock, static keys) does not anchor SSO caches', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ANTHROPIC_API_KEY: undefined,
        CLAUDE_CODE_USE_BEDROCK: '1',
        AWS_REGION: 'us-west-2',
        AWS_PROFILE: undefined,
        AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'secret123',
        AWS_SESSION_TOKEN: 'token123',
      },
      () => {
        const agent = resolveAgent(bedrockConfig());
        agent.provision(home, undefined as never);
        const runHome = join(home.configDir, '..');
        expect(existsSync(join(runHome, '.aws'))).toBe(false);
      },
    );
  } finally {
    cleanup();
  }
});

// --- Vertex auth (claude-vertex.yaml) ---
// The claude-vertex surface: runtime_family claude, required_env carries
// CLAUDE_CODE_USE_VERTEX (the trigger) instead of ANTHROPIC_API_KEY.
function vertexConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    name: 'claude-vertex',
    binary: 'claude',
    home_config_subdir: '.claude',
    session_log_dir: '${QUORUM_AGENT_HOME}/.claude/projects',
    session_log_glob: '*.jsonl',
    normalizer: 'claude',
    required_env: [
      'CLAUDE_CODE_USE_VERTEX',
      'CLOUD_ML_REGION',
      'ANTHROPIC_VERTEX_PROJECT_ID',
      'SUPERPOWERS_ROOT',
    ],
    runtime_family: 'claude',
    ...overrides,
  };
}

// Every provider-signal var the adapter reads, pinned per test so results do
// not depend on the host's real Claude provider (dev boxes have live Vertex or
// Bedrock env).
const PROVIDER_ENV_CLEARED: Record<string, string | undefined> = {
  ANTHROPIC_API_KEY: undefined,
  ANTHROPIC_MODEL: undefined,
  CLAUDE_CODE_USE_BEDROCK: undefined,
  CLAUDE_CODE_USE_VERTEX: undefined,
  CLOUD_ML_REGION: undefined,
  ANTHROPIC_VERTEX_PROJECT_ID: undefined,
  GOOGLE_APPLICATION_CREDENTIALS: undefined,
  GOOGLE_CLOUD_PROJECT: undefined,
  GOOGLE_CLOUD_LOCATION: undefined,
  AWS_REGION: undefined,
  AWS_PROFILE: undefined,
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  AWS_SESSION_TOKEN: undefined,
};

// Vertex: the env-file exports the three provider vars, anchors ADC via the
// operator-set GOOGLE_APPLICATION_CREDENTIALS, forwards the optional Google
// Cloud context, and carries no API key or approval block. File is 0600.
test('provision (vertex) writes Vertex env-file with ADC anchor and no API key', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ...PROVIDER_ENV_CLEARED,
        CLAUDE_CODE_USE_VERTEX: '1',
        CLOUD_ML_REGION: 'global',
        ANTHROPIC_VERTEX_PROJECT_ID: 'proj-example',
        GOOGLE_APPLICATION_CREDENTIALS: '/tmp/fake-adc.json',
        GOOGLE_CLOUD_PROJECT: 'proj-example',
      },
      () => {
        const agent = resolveAgent(vertexConfig());
        agent.provision(home, undefined as never);

        const envFile = join(home.configDir, '.claude-env');
        expect(existsSync(envFile)).toBe(true);
        const body = readFileSync(envFile, 'utf8');
        expect(body).toContain("export CLAUDE_CODE_USE_VERTEX='1'");
        expect(body).toContain("export CLOUD_ML_REGION='global'");
        expect(body).toContain(
          "export ANTHROPIC_VERTEX_PROJECT_ID='proj-example'",
        );
        expect(body).toContain(
          "export GOOGLE_APPLICATION_CREDENTIALS='/tmp/fake-adc.json'",
        );
        expect(body).toContain("export GOOGLE_CLOUD_PROJECT='proj-example'");
        // Unset optional context is not forwarded.
        expect(body).not.toContain('GOOGLE_CLOUD_LOCATION');
        // No API key in Vertex mode.
        expect(body).not.toContain('ANTHROPIC_API_KEY');
        // 0600 perms.
        expect(statSync(envFile).mode & 0o777).toBe(0o600);
        // No API-key approval block written.
        const claudeJsonPath = join(home.configDir, '.claude.json');
        const claudeJson: { customApiKeyResponses?: unknown } = JSON.parse(
          readFileSync(claudeJsonPath, 'utf8'),
        );
        expect(claudeJson.customApiKeyResponses).toBeUndefined();
      },
    );
  } finally {
    cleanup();
  }
});

// Vertex provisioning fails at setup when a required provider var is unset,
// rather than writing a half-configured auth file.
test('provision (vertex) throws when CLOUD_ML_REGION is unset', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ...PROVIDER_ENV_CLEARED,
        CLAUDE_CODE_USE_VERTEX: '1',
        ANTHROPIC_VERTEX_PROJECT_ID: 'proj-example',
        GOOGLE_APPLICATION_CREDENTIALS: '/tmp/fake-adc.json',
      },
      () => {
        const agent = resolveAgent(vertexConfig());
        expect(() => agent.provision(home, undefined as never)).toThrow(
          /CLOUD_ML_REGION/,
        );
      },
    );
  } finally {
    cleanup();
  }
});

// ADC anchor precedence: an operator-set GOOGLE_APPLICATION_CREDENTIALS is
// forwarded as-is; otherwise the well-known file under the real gcloud dir is
// exported; with neither, fail at setup with the gcloud fix in the message.
test('vertexAdcExportLine forwards an operator-set GOOGLE_APPLICATION_CREDENTIALS', () => {
  withEnv({ GOOGLE_APPLICATION_CREDENTIALS: '/tmp/op-adc.json' }, () => {
    expect(vertexAdcExportLine('/nonexistent-gcloud')).toBe(
      "export GOOGLE_APPLICATION_CREDENTIALS='/tmp/op-adc.json'",
    );
  });
});

test('vertexAdcExportLine anchors the well-known ADC file when present', () => {
  const gcloudDir = mkdtempSync(join(tmpdir(), 'quorum-gcloud-'));
  const adc = join(gcloudDir, 'application_default_credentials.json');
  writeFileSync(adc, '{"type":"authorized_user"}');
  try {
    withEnv({ GOOGLE_APPLICATION_CREDENTIALS: undefined }, () => {
      expect(vertexAdcExportLine(gcloudDir)).toBe(
        `export GOOGLE_APPLICATION_CREDENTIALS='${adc}'`,
      );
    });
  } finally {
    rmSync(gcloudDir, { recursive: true, force: true });
  }
});

test('vertexAdcExportLine throws with the gcloud fix when no ADC exists', () => {
  const gcloudDir = mkdtempSync(join(tmpdir(), 'quorum-gcloud-'));
  try {
    withEnv({ GOOGLE_APPLICATION_CREDENTIALS: undefined }, () => {
      expect(() => vertexAdcExportLine(gcloudDir)).toThrow(
        /gcloud auth application-default login/,
      );
    });
  } finally {
    rmSync(gcloudDir, { recursive: true, force: true });
  }
});

// --- Provider auto-detection (claude-auto.yaml) ---
// The claude-auto surface: required_env pins NO provider var, so provision
// detects the provider from the host environment.
function autoConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    name: 'claude-auto',
    binary: 'claude',
    home_config_subdir: '.claude',
    session_log_dir: '${QUORUM_AGENT_HOME}/.claude/projects',
    session_log_glob: '*.jsonl',
    normalizer: 'claude',
    required_env: ['SUPERPOWERS_ROOT'],
    runtime_family: 'claude',
    model: 'auto',
    ...overrides,
  };
}

// The explicit provider switch wins over an incidental API key: an operator
// who moved to Vertex often still carries a stale ANTHROPIC_API_KEY.
test('detectClaudeProvider prefers the CLAUDE_CODE_USE_* switch over a stale API key', () => {
  withEnv(
    {
      ...PROVIDER_ENV_CLEARED,
      CLAUDE_CODE_USE_VERTEX: '1',
      ANTHROPIC_API_KEY: API_KEY,
    },
    () => {
      expect(detectClaudeProvider()).toBe('vertex');
    },
  );
  withEnv(
    {
      ...PROVIDER_ENV_CLEARED,
      CLAUDE_CODE_USE_BEDROCK: '1',
      ANTHROPIC_API_KEY: API_KEY,
    },
    () => {
      expect(detectClaudeProvider()).toBe('bedrock');
    },
  );
  withEnv({ ...PROVIDER_ENV_CLEARED, ANTHROPIC_API_KEY: API_KEY }, () => {
    expect(detectClaudeProvider()).toBe('api-key');
  });
  withEnv(PROVIDER_ENV_CLEARED, () => {
    expect(detectClaudeProvider()).toBe(null);
  });
});

// Both switches set at once is ambiguous: fail loud rather than pick one.
test('detectClaudeProvider throws when both provider switches are set', () => {
  withEnv(
    {
      ...PROVIDER_ENV_CLEARED,
      CLAUDE_CODE_USE_VERTEX: '1',
      CLAUDE_CODE_USE_BEDROCK: '1',
    },
    () => {
      expect(() => detectClaudeProvider()).toThrow(/unambiguous/);
    },
  );
});

// claude-auto on a Vertex host seeds the Vertex env-file.
test('provision (claude-auto) seeds Vertex auth when the host is Vertex', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(
      {
        ...PROVIDER_ENV_CLEARED,
        CLAUDE_CODE_USE_VERTEX: '1',
        CLOUD_ML_REGION: 'global',
        ANTHROPIC_VERTEX_PROJECT_ID: 'proj-example',
        GOOGLE_APPLICATION_CREDENTIALS: '/tmp/fake-adc.json',
      },
      () => {
        const agent = resolveAgent(autoConfig());
        agent.provision(home, undefined as never);
        const body = readFileSync(join(home.configDir, '.claude-env'), 'utf8');
        expect(body).toContain("export CLAUDE_CODE_USE_VERTEX='1'");
        expect(body).not.toContain('ANTHROPIC_API_KEY');
      },
    );
  } finally {
    cleanup();
  }
});

// claude-auto with only an API key seeds the API-key env-file + approval.
test('provision (claude-auto) seeds API-key auth when only ANTHROPIC_API_KEY is set', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv({ ...PROVIDER_ENV_CLEARED, ANTHROPIC_API_KEY: API_KEY }, () => {
      const agent = resolveAgent(autoConfig());
      agent.provision(home, undefined as never);
      const body = readFileSync(join(home.configDir, '.claude-env'), 'utf8');
      expect(body).toContain(`export ANTHROPIC_API_KEY='${API_KEY}'`);
    });
  } finally {
    cleanup();
  }
});

// claude-auto with no provider signal fails at setup with the fix options.
test('provision (claude-auto) throws when no provider signal is present', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv(PROVIDER_ENV_CLEARED, () => {
      const agent = resolveAgent(autoConfig());
      expect(() => agent.provision(home, undefined as never)).toThrow(
        /no Claude provider detected/,
      );
    });
  } finally {
    cleanup();
  }
});

// model: auto — the host's ANTHROPIC_MODEL wins; otherwise the detected
// provider's Opus id; no provider signal throws.
test('resolveClaudeAutoModel resolves from ANTHROPIC_MODEL, then provider default', () => {
  withEnv(
    {
      ...PROVIDER_ENV_CLEARED,
      CLAUDE_CODE_USE_VERTEX: '1',
      ANTHROPIC_MODEL: 'claude-fable-5',
    },
    () => {
      expect(resolveClaudeAutoModel()).toBe('claude-fable-5');
    },
  );
  withEnv({ ...PROVIDER_ENV_CLEARED, CLAUDE_CODE_USE_VERTEX: '1' }, () => {
    expect(resolveClaudeAutoModel()).toBe('claude-opus-4-8');
  });
  withEnv({ ...PROVIDER_ENV_CLEARED, CLAUDE_CODE_USE_BEDROCK: '1' }, () => {
    expect(resolveClaudeAutoModel()).toBe('us.anthropic.claude-opus-4-8');
  });
  withEnv({ ...PROVIDER_ENV_CLEARED, ANTHROPIC_API_KEY: API_KEY }, () => {
    expect(resolveClaudeAutoModel()).toBe('opus');
  });
  withEnv(PROVIDER_ENV_CLEARED, () => {
    expect(() => resolveClaudeAutoModel()).toThrow(
      /no Claude provider detected/,
    );
  });
});
