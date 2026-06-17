import { expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { resolveAgent } from '../src/agents/index.ts';
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

// B1-claude-api-key-approval (gating): when ANTHROPIC_API_KEY is NOT in
// required_env, the adapter must not write a .claude-env or approval block
// (Python gates both on `ANTHROPIC_API_KEY in required_env`).
test('provision skips env-file and approval when ANTHROPIC_API_KEY is not required', () => {
  const { home, cleanup } = makeTempHome();
  try {
    withEnv({ ANTHROPIC_API_KEY: API_KEY }, () => {
      const agent = resolveAgent(
        claudeConfig({ required_env: ['SUPERPOWERS_ROOT'] }),
      );
      agent.provision(home, undefined as never);
      expect(existsSync(join(home.configDir, '.claude-env'))).toBe(false);
      const claudeJsonPath = join(home.configDir, '.claude.json');
      if (existsSync(claudeJsonPath)) {
        const claudeJson: { customApiKeyResponses?: unknown } = JSON.parse(
          readFileSync(claudeJsonPath, 'utf8'),
        );
        expect(claudeJson.customApiKeyResponses).toBeUndefined();
      }
    });
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
