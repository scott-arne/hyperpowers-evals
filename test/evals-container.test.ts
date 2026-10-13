import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = resolve(import.meta.dir, '..');
const WRAPPER = join(REPO, 'scripts', 'evals-container');

const FAKE_DOCKER = `#!/usr/bin/env bash
set -euo pipefail

python3 -c 'import json,sys; print(json.dumps(sys.argv[1:]))' "$@" >> "$EVALS_CONTAINER_DOCKER_LOG"

state_file="\${EVALS_CONTAINER_DOCKER_STATE:?}"
exists=false
running=false
name=

if [[ -f "$state_file" ]]; then
  # shellcheck disable=SC1090
  source "$state_file"
fi

write_state() {
  {
    printf 'exists=%q\\n' "$exists"
    printf 'running=%q\\n' "$running"
    printf 'name=%q\\n' "$name"
  } > "$state_file"
}

run_name() {
  local expect_name=false
  local arg
  for arg in "$@"; do
    if [[ "$expect_name" == true ]]; then
      printf '%s\\n' "$arg"
      return 0
    fi
    case "$arg" in
      --name)
        expect_name=true
        ;;
      --name=*)
        printf '%s\\n' "\${arg#--name=}"
        return 0
        ;;
    esac
  done
}

case "$1" in
  build)
    exit 0
    ;;
  exec)
    if [[ "\${EVALS_CONTAINER_RESULTS_PROBE_FAIL:-}" == true && "\${3:-}" == "bash" && "\${4:-}" == "-lc" && "\${5:-}" == *"/workspace/evals/results"* ]]; then
      exit 1
    fi
    if [[ "\${3:-}" == "bash" && "\${4:-}" == "-lc" && "\${5:-}" == *": >"* && "\${5:-}" =~ (\\.evals-container-probe\\.[A-Za-z0-9._-]+) ]]; then
      probe_name="\${BASH_REMATCH[1]}"
      if [[ "\${EVALS_CONTAINER_RESULTS_HOST_VISIBLE_FAIL:-}" != true && -n "\${EVALS_CONTAINER_FAKE_RESULTS_HOST_DIR:-}" ]]; then
        mkdir -p "$EVALS_CONTAINER_FAKE_RESULTS_HOST_DIR"
        : > "$EVALS_CONTAINER_FAKE_RESULTS_HOST_DIR/$probe_name"
      fi
    fi
    exit 0
    ;;
  ps)
    if [[ "$exists" == true && "$running" == true && -n "$name" ]]; then
      printf '%s\\n' "$name"
    fi
    exit 0
    ;;
  container)
    if [[ "\${2:-}" != "inspect" ]]; then
      exit 1
    fi

    if [[ "$exists" != true ]]; then
      exit 1
    fi

    if [[ "\${3:-}" == "-f" ]]; then
      if [[ "\${5:-}" != "$name" ]]; then
        exit 1
      fi
      if [[ "\${4:-}" == "{{.State.Running}}" ]]; then
        printf '%s\\n' "$running"
      fi
      exit 0
    fi

    [[ "\${3:-}" == "$name" ]]
    ;;
  inspect)
    printf 'generic inspect is not supported by this fake docker\\n' >&2
    exit 2
    ;;
  run)
    name="$(run_name "$@")"
    if [[ -z "$name" || "$name" == -* ]]; then
      exit 1
    fi
    exists=true
    running=true
    write_state
    exit 0
    ;;
  start)
    if [[ "$exists" != true || "\${2:-}" != "$name" ]]; then
      exit 1
    fi
    running=true
    write_state
    exit 0
    ;;
  stop)
    if [[ "$exists" != true || "\${2:-}" != "$name" ]]; then
      exit 1
    fi
    running=false
    write_state
    exit 0
    ;;
  rm)
    if [[ "$exists" != true || "\${2:-}" != "$name" ]]; then
      exit 1
    fi
    exists=false
    running=false
    write_state
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
`;

// Answers the launcher's two build-source reads and logs every call, so a test
// can pin the values and the pathspecs; any other git call fails loudly.
//
// FAKE_GIT_HEAD2 and FAKE_GIT_STATUS2 replace the answer on a repeat read of
// the same directory, which is how a test moves the checkout during the build;
// FAKE_GIT_CHANGE_DIR narrows that to one directory so each recorded value can
// be pinned on its own.
const FAKE_GIT = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "\${FAKE_GIT_LOG:?}"
repeat_read() { # <subcommand> <dir>
  [[ -z "\${FAKE_GIT_CHANGE_DIR:-}" || "$2" == "$FAKE_GIT_CHANGE_DIR" ]] || return 1
  local seen="\${FAKE_GIT_LOG}.$1.\${2//[^A-Za-z0-9]/_}"
  [[ -f "$seen" ]] && return 0
  : > "$seen"
  return 1
}
case "\${3:-}" in
  rev-parse)
    [[ "\${FAKE_GIT_REVPARSE:-ok}" == fail ]] && exit 128
    head="\${FAKE_GIT_HEAD:?}"
    if [[ -n "\${FAKE_GIT_HEAD2:-}" ]] && repeat_read rev-parse "$2"; then
      head="$FAKE_GIT_HEAD2"
    fi
    printf '%s\\n' "$head"
    ;;
  status)
    [[ "\${FAKE_GIT_STATUS:-clean}" == fail ]] && exit 128
    state="\${FAKE_GIT_STATUS:-clean}"
    if [[ -n "\${FAKE_GIT_STATUS2:-}" ]] && repeat_read status "$2"; then
      state="$FAKE_GIT_STATUS2"
    fi
    [[ "$state" == dirty ]] && printf ' M container/Dockerfile\\n'
    exit 0
    ;;
  *)
    echo "fake git: unexpected $*" >&2
    exit 1
    ;;
esac
`;

const IMAGE_ARGS = [
  'QUORUM_IMAGE_EVALS_COMMIT',
  'QUORUM_IMAGE_CONTAINER_CLEAN',
  'QUORUM_IMAGE_GAUNTLET_COMMIT',
  'QUORUM_IMAGE_GAUNTLET_CLEAN',
];

function makeHarness(extraEnv: NodeJS.ProcessEnv = {}): {
  root: string;
  dockerLog: string;
  dockerState: string;
  gauntletRoot: string;
  env: NodeJS.ProcessEnv;
} {
  const root = mkdtempSync(join(tmpdir(), 'evals-container-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const docker = join(bin, 'docker');
  const dockerLog = join(root, 'docker.log');
  const dockerState = join(root, 'docker-state');
  const gauntletRoot = join(root, 'gauntlet');
  mkdirSync(gauntletRoot);
  writeFileSync(join(gauntletRoot, 'package.json'), '{"name":"gauntlet"}\n');
  writeFileSync(docker, FAKE_DOCKER);
  chmodSync(docker, 0o755);

  return {
    root,
    dockerLog,
    dockerState,
    gauntletRoot,
    env: {
      ...Bun.env,
      ...extraEnv,
      EVALS_CONTAINER_DOCKER_LOG: dockerLog,
      EVALS_CONTAINER_DOCKER_STATE: dockerState,
      EVALS_CONTAINER_FAKE_RESULTS_HOST_DIR: join(REPO, 'results'),
      GAUNTLET_ROOT: gauntletRoot,
      PATH: `${bin}:${Bun.env['PATH'] ?? ''}`,
    },
  };
}

function writeFakeGit(
  harness: ReturnType<typeof makeHarness>,
  env: Record<string, string>,
): string {
  const git = join(harness.root, 'bin', 'git');
  writeFileSync(git, FAKE_GIT);
  chmodSync(git, 0o755);
  const log = join(harness.root, 'git.log');
  Object.assign(harness.env, { FAKE_GIT_LOG: log, ...env });
  return log;
}

function buildArgs(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--build-arg') {
      const value = args[i + 1] ?? '';
      const eq = value.indexOf('=');
      out[value.slice(0, eq)] = value.slice(eq + 1);
    }
  }
  return out;
}

function writeDockerState(
  harness: ReturnType<typeof makeHarness>,
  state: { exists: boolean; running: boolean; name: string },
): void {
  writeFileSync(
    harness.dockerState,
    [
      `exists=${state.exists ? 'true' : 'false'}`,
      `running=${state.running ? 'true' : 'false'}`,
      `name=${state.name}`,
      '',
    ].join('\n'),
  );
}

function runWrapper(
  harness: ReturnType<typeof makeHarness>,
  args: string[],
  options: { cwd?: string; wrapper?: string } = {},
): ReturnType<typeof spawnSync> {
  return spawnSync(options.wrapper ?? WRAPPER, args, {
    cwd: options.cwd,
    env: harness.env,
    encoding: 'utf8',
  });
}

function dockerLogLines(path: string): string[] {
  try {
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

function dockerCommands(path: string): string[][] {
  return dockerLogLines(path).map((line) => JSON.parse(line) as string[]);
}

function dockerCommand(path: string, command: string): string[] {
  const found = dockerCommands(path).find((args) => args[0] === command);
  expect(found).toBeDefined();
  return found ?? [];
}

function dockerCommandsNamed(path: string, command: string): string[][] {
  return dockerCommands(path).filter((args) => args[0] === command);
}

function expectNoGenericInspect(path: string): void {
  expect(dockerCommandsNamed(path, 'inspect')).toEqual([]);
}

function mountArgs(args: string[]): string[] {
  const mounts: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--mount') {
      mounts.push(args[i + 1] ?? '');
    } else if (arg?.startsWith('--mount=')) {
      mounts.push(arg.slice('--mount='.length));
    }
  }
  return mounts;
}

function mountForTarget(args: string[], target: string): string {
  const found = mountArgs(args).find((mount) =>
    mount.split(',').some((part) => part === `target=${target}`),
  );
  expect(found).toBeDefined();
  return found ?? '';
}

function expectMountSource(mount: string, source: string): void {
  const expectedSource = realpathSync(source);
  const hasSource = mount
    .split(',')
    .some(
      (part) =>
        part === `source=${expectedSource}` || part === `src=${expectedSource}`,
    );
  expect(hasSource).toBe(true);
}

function expectReadonly(mount: string): void {
  expect(mount.split(',').some((part) => part.includes('readonly'))).toBe(true);
}

function envValue(args: string[], name: string): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--env') {
      const value = args[i + 1];
      if (value?.startsWith(`${name}=`)) {
        return value.slice(name.length + 1);
      }
    } else if (arg?.startsWith(`--env=${name}=`)) {
      return arg.slice(`--env=${name}=`.length);
    }
  }
}

function expectDockerfileArg(dockerfile: string | undefined): void {
  expect(dockerfile).toBeDefined();
  expect(resolve(REPO, dockerfile ?? '')).toBe(
    join(REPO, 'container', 'Dockerfile'),
  );
}

function writeEnvFile(root: string): string {
  const envFile = join(root, 'credentials.env');
  writeFileSync(envFile, 'OPENAI_API_KEY=sk-test\n');
  return envFile;
}

function makeSuperpowersRoot(root: string): string {
  const superpowersRoot = join(root, 'superpowers');
  mkdirSync(superpowersRoot);
  return superpowersRoot;
}

function removeResultProbeFiles(): void {
  const results = join(REPO, 'results');
  try {
    for (const entry of readdirSync(results)) {
      if (entry.startsWith('.evals-container-probe.')) {
        unlinkSync(join(results, entry));
      }
    }
  } catch {
    return;
  }
}

function resultProbeFiles(): string[] {
  try {
    return readdirSync(join(REPO, 'results')).filter((entry) =>
      entry.startsWith('.evals-container-probe.'),
    );
  } catch {
    return [];
  }
}

function removeContainerRuntimeFiles(): void {
  rmSync(join(REPO, 'results', '.container-runtime'), {
    recursive: true,
    force: true,
  });
}

describe('scripts/evals-container', () => {
  test('build calls Docker build with the container Dockerfile and repo context', () => {
    const harness = makeHarness();
    try {
      const proc = runWrapper(harness, ['build']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'build');
      const dockerfileIndex = args.indexOf('-f');
      expect(dockerfileIndex).toBeGreaterThanOrEqual(0);
      expectDockerfileArg(args[dockerfileIndex + 1]);
      const contextIndex = args.indexOf('--build-context');
      expect(contextIndex).toBeGreaterThanOrEqual(0);
      expect(args[contextIndex + 1]).toBe(
        `gauntlet=${realpathSync(harness.gauntletRoot)}`,
      );
      expect(args[args.length - 1]).toBe(REPO);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('build passes the build source as four build args, read with the real git', () => {
    const harness = makeHarness();
    // The Gauntlet root is a plain directory; the ceiling keeps git from
    // finding a repository above it.
    harness.env['GIT_CEILING_DIRECTORIES'] = harness.root;
    try {
      const proc = runWrapper(harness, ['build']);
      expect(proc.status).toBe(0);
      const got = buildArgs(dockerCommand(harness.dockerLog, 'build'));
      expect(Object.keys(got).sort()).toEqual([...IMAGE_ARGS].sort());
      const head = spawnSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).stdout.trim();
      const containerStatus = spawnSync(
        'git',
        [
          '-C',
          REPO,
          'status',
          '--porcelain',
          '--untracked-files=all',
          '--',
          'container',
        ],
        { encoding: 'utf8' },
      ).stdout;
      expect(got['QUORUM_IMAGE_EVALS_COMMIT']).toBe(head);
      expect(got['QUORUM_IMAGE_CONTAINER_CLEAN']).toBe(
        containerStatus.trim() === '' ? 'true' : 'false',
      );
      expect(got['QUORUM_IMAGE_GAUNTLET_COMMIT']).toBe('');
      expect(got['QUORUM_IMAGE_GAUNTLET_CLEAN']).toBe('');
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('build reads the commit and container/ (evals) and the whole checkout (Gauntlet)', () => {
    const harness = makeHarness();
    const log = writeFakeGit(harness, { FAKE_GIT_HEAD: 'a'.repeat(40) });
    try {
      expect(runWrapper(harness, ['build']).status).toBe(0);
      expect(buildArgs(dockerCommand(harness.dockerLog, 'build'))).toEqual({
        QUORUM_IMAGE_EVALS_COMMIT: 'a'.repeat(40),
        QUORUM_IMAGE_CONTAINER_CLEAN: 'true',
        QUORUM_IMAGE_GAUNTLET_COMMIT: 'a'.repeat(40),
        QUORUM_IMAGE_GAUNTLET_CLEAN: 'true',
      });
      const calls = readFileSync(log, 'utf8');
      expect(calls).toContain(
        `-C ${REPO} status --porcelain --untracked-files=all -- container\n`,
      );
      expect(calls).toContain(
        `-C ${realpathSync(harness.gauntletRoot)} status --porcelain --untracked-files=all -- .\n`,
      );
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('build records a dirty checkout as false', () => {
    const harness = makeHarness();
    writeFakeGit(harness, {
      FAKE_GIT_HEAD: 'a'.repeat(40),
      FAKE_GIT_STATUS: 'dirty',
    });
    try {
      expect(runWrapper(harness, ['build']).status).toBe(0);
      const got = buildArgs(dockerCommand(harness.dockerLog, 'build'));
      expect(got['QUORUM_IMAGE_CONTAINER_CLEAN']).toBe('false');
      expect(got['QUORUM_IMAGE_GAUNTLET_CLEAN']).toBe('false');
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('a failing rev-parse passes empty commits and the build still runs', () => {
    const harness = makeHarness();
    writeFakeGit(harness, {
      FAKE_GIT_HEAD: 'a'.repeat(40),
      FAKE_GIT_REVPARSE: 'fail',
    });
    try {
      expect(runWrapper(harness, ['build']).status).toBe(0);
      const got = buildArgs(dockerCommand(harness.dockerLog, 'build'));
      expect(got['QUORUM_IMAGE_EVALS_COMMIT']).toBe('');
      expect(got['QUORUM_IMAGE_GAUNTLET_COMMIT']).toBe('');
      expect(got['QUORUM_IMAGE_CONTAINER_CLEAN']).toBe('true');
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('a failing status passes empty clean flags, never true, and the build still runs', () => {
    const harness = makeHarness();
    writeFakeGit(harness, {
      FAKE_GIT_HEAD: 'a'.repeat(40),
      FAKE_GIT_STATUS: 'fail',
    });
    try {
      expect(runWrapper(harness, ['build']).status).toBe(0);
      const got = buildArgs(dockerCommand(harness.dockerLog, 'build'));
      expect(got['QUORUM_IMAGE_CONTAINER_CLEAN']).toBe('');
      expect(got['QUORUM_IMAGE_GAUNTLET_CLEAN']).toBe('');
      expect(got['QUORUM_IMAGE_EVALS_COMMIT']).toBe('a'.repeat(40));
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  // One test per recorded value, so a launcher that re-reads only some of them
  // is caught; each is its own test to stay inside the per-test time limit.
  for (const { name, target, moved } of [
    {
      name: 'evals commit',
      target: 'evals',
      moved: { FAKE_GIT_HEAD2: 'b'.repeat(40) },
    },
    {
      name: 'gauntlet commit',
      target: 'gauntlet',
      moved: { FAKE_GIT_HEAD2: 'b'.repeat(40) },
    },
    {
      name: 'container clean',
      target: 'evals',
      moved: { FAKE_GIT_STATUS2: 'dirty' },
    },
    {
      name: 'gauntlet clean',
      target: 'gauntlet',
      moved: { FAKE_GIT_STATUS2: 'dirty' },
    },
  ]) {
    test(`build fails when the ${name} moves during the build`, () => {
      const harness = makeHarness();
      writeFakeGit(harness, {
        FAKE_GIT_HEAD: 'a'.repeat(40),
        FAKE_GIT_CHANGE_DIR:
          target === 'evals' ? REPO : realpathSync(harness.gauntletRoot),
        ...moved,
      });
      try {
        const proc = runWrapper(harness, ['build']);
        // The fake docker build exits 0, so only the re-read can fail this.
        expect(proc.status).not.toBe(0);
        expect(proc.stderr).toContain(
          'the build source changed during the build; rebuild',
        );
        expect(proc.stderr).toContain(`changed: ${name}`);
      } finally {
        rmSync(harness.root, { recursive: true, force: true });
      }
    });
  }

  test('the Dockerfile declares the build source after its last RUN', () => {
    const lines = readFileSync(
      join(REPO, 'container', 'Dockerfile'),
      'utf8',
    ).split('\n');
    const lastRun = lines.reduce(
      (last, line, i) => (line.startsWith('RUN ') ? i : last),
      -1,
    );
    for (const name of IMAGE_ARGS) {
      const arg = lines.indexOf(`ARG ${name}=`);
      const env = lines.indexOf(`ENV ${name}=$${name}`);
      expect(arg).toBeGreaterThan(lastRun);
      expect(env).toBeGreaterThan(arg);
    }
  });

  test('build fails before Docker when the Gauntlet checkout is missing', () => {
    const harness = makeHarness({ GAUNTLET_ROOT: undefined });
    try {
      rmSync(harness.gauntletRoot, { recursive: true, force: true });

      const proc = runWrapper(harness, [
        '--gauntlet-root',
        harness.gauntletRoot,
        'build',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain('Gauntlet root does not exist');
      expect(dockerLogLines(harness.dockerLog)).toEqual([]);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('non-exec commands reject arguments placed after the command', () => {
    for (const command of ['build', 'up', 'down', 'status', 'shell']) {
      const harness = makeHarness();
      try {
        const proc = runWrapper(harness, [command, '--env-file', 'prod.env']);

        expect(proc.error).toBeUndefined();
        expect(proc.status).not.toBe(0);
        expect(proc.stderr).toContain(`unexpected argument after ${command}`);
        expect(proc.stderr).toContain('put options before the command');
        expect(dockerLogLines(harness.dockerLog)).toEqual([]);
      } finally {
        rmSync(harness.root, { recursive: true, force: true });
      }
    }
  });

  test('up bind-mounts evals, superpowers, and results paths', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'run');
      expectMountSource(mountForTarget(args, '/workspace/evals'), REPO);
      expectMountSource(
        mountForTarget(args, '/workspace/superpowers'),
        superpowersRoot,
      );
      expectMountSource(
        mountForTarget(args, '/workspace/evals/results'),
        join(REPO, 'results'),
      );
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up gives the numeric container user writable host-visible home and XDG state', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'run');
      expect(envValue(args, 'HOME')).toBe(
        '/workspace/evals/results/.container-home',
      );
      expect(envValue(args, 'XDG_CACHE_HOME')).toBe(
        '/workspace/evals/results/.container-home/.cache',
      );
      expect(envValue(args, 'XDG_CONFIG_HOME')).toBe(
        '/workspace/evals/results/.container-home/.config',
      );
      expect(envValue(args, 'XDG_STATE_HOME')).toBe(
        '/workspace/evals/results/.container-home/.local/state',
      );
      expect(envValue(args, 'TMPDIR')).toBe('/tmp');
      expect(args.slice(-3, -1)).toEqual(['bash', '-lc']);
      expect(args.at(-1)).toContain('mkdir -p "$HOME"');
      expect(args.at(-1)).toContain('exec sleep infinity');
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up mounts host-generated passwd and group files for the numeric container user', () => {
    const harness = makeHarness();
    removeContainerRuntimeFiles();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'run');
      const passwdMount = mountForTarget(args, '/etc/passwd');
      const groupMount = mountForTarget(args, '/etc/group');
      expectReadonly(passwdMount);
      expectReadonly(groupMount);

      const uid = process.getuid?.();
      const gid = process.getgid?.();
      expect(uid).toBeDefined();
      expect(gid).toBeDefined();
      const passwd = readFileSync(
        join(REPO, 'results', '.container-runtime', 'passwd'),
        'utf8',
      );
      const group = readFileSync(
        join(REPO, 'results', '.container-runtime', 'group'),
        'utf8',
      );
      expect(passwd).toContain(`evals:x:${uid}:${gid}:`);
      expect(passwd).toContain('/workspace/evals/results/.container-home');
      expect(group).toContain(`evals:x:${gid}:`);
    } finally {
      removeContainerRuntimeFiles();
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up mounts an explicit env file read-only at the credential path', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const envFile = writeEnvFile(harness.root);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        '--env-file',
        envFile,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'run');
      const mount = mountForTarget(args, '/run/evals/credentials.env');
      expectMountSource(mount, envFile);
      expectReadonly(mount);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  // The file is sourced, so every one of these changes the recorded build
  // source. The last line is the case a comment-stripping pattern misses: the
  // `#` sits inside a value, so the assignment after it still runs. One test
  // per line keeps each inside the per-test time limit.
  for (const line of [
    'QUORUM_IMAGE_EVALS_COMMIT=aaaa',
    'export QUORUM_IMAGE_GAUNTLET_COMMIT=aaaa',
    'unset QUORUM_IMAGE_CONTAINER_CLEAN',
    'A=x#y; QUORUM_IMAGE_EVALS_COMMIT=aaaa',
  ]) {
    test(`up refuses an env file with the line: ${line}`, () => {
      const harness = makeHarness();
      try {
        const superpowersRoot = makeSuperpowersRoot(harness.root);
        const envFile = join(harness.root, 'reserved.env');
        writeFileSync(envFile, `OPENAI_API_KEY=sk-test\n${line}\n`);
        const proc = runWrapper(harness, [
          '--superpowers-root',
          superpowersRoot,
          '--env-file',
          envFile,
          'up',
        ]);

        expect(proc.error).toBeUndefined();
        expect(proc.status).not.toBe(0);
        expect(proc.stderr).toContain(realpathSync(envFile));
        expect(proc.stderr).toContain('QUORUM_IMAGE_');
        expect(proc.stderr).toContain('reserved');
        expect(dockerCommandsNamed(harness.dockerLog, 'run')).toEqual([]);
      } finally {
        rmSync(harness.root, { recursive: true, force: true });
      }
    });
  }

  // The evals root's own .env.container is selected without a flag, so an
  // existing container is reused with no mount change, yet the file is
  // bind-mounted live and an edit made after creation reaches the next quorum.
  // The guard therefore has to fire in every state `up` can find. The launcher
  // takes its evals root from its own location, so each test runs a copy that
  // sits in a temp root owning the env file.
  for (const state of ['absent', 'stopped', 'running'] as const) {
    for (const content of ['reserved', 'clean'] as const) {
      const label =
        state === 'absent' ? 'no container' : `a ${state} container`;
      test(`up with ${label} and an auto-selected ${content} env file`, () => {
        const harness = makeHarness();
        try {
          const evalsRoot = join(harness.root, 'evals');
          mkdirSync(join(evalsRoot, 'scripts'), { recursive: true });
          const wrapper = join(evalsRoot, 'scripts', 'evals-container');
          writeFileSync(wrapper, readFileSync(WRAPPER, 'utf8'));
          chmodSync(wrapper, 0o755);
          const envFile = join(evalsRoot, '.env.container');
          writeFileSync(
            envFile,
            content === 'reserved'
              ? 'OPENAI_API_KEY=sk-test\nQUORUM_IMAGE_EVALS_COMMIT=aaaa\n'
              : 'OPENAI_API_KEY=sk-test\n',
          );
          const name = 'evals-auto-env-container';
          if (state !== 'absent') {
            writeDockerState(harness, {
              exists: true,
              running: state === 'running',
              name,
            });
          }
          const proc = runWrapper(harness, ['--name', name, 'up'], { wrapper });
          const runs = dockerCommandsNamed(harness.dockerLog, 'run');
          const starts = dockerCommandsNamed(harness.dockerLog, 'start');

          expect(proc.error).toBeUndefined();
          if (content === 'reserved') {
            expect(proc.status).not.toBe(0);
            expect(proc.stderr).toContain(realpathSync(envFile));
            expect(proc.stderr).toContain('QUORUM_IMAGE_');
            expect(proc.stderr).toContain('reserved');
            expect(runs).toEqual([]);
            expect(starts).toEqual([]);
          } else {
            expect(proc.status).toBe(0);
            expect(runs).toHaveLength(state === 'absent' ? 1 : 0);
            expect(starts.map((args) => args.slice(1))).toEqual(
              state === 'stopped' ? [[name]] : [],
            );
            if (state === 'running') {
              expect(proc.stdout).toBe(`${name}\n`);
            }
          }
        } finally {
          rmSync(harness.root, { recursive: true, force: true });
        }
      });
    }
  }

  test('up accepts an env file that only mentions a reserved image name in a comment', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const envFile = join(harness.root, 'commented.env');
      writeFileSync(
        envFile,
        '# QUORUM_IMAGE_EVALS_COMMIT=x\nOPENAI_API_KEY=sk-test\n',
      );
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        '--env-file',
        envFile,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      expect(dockerCommandsNamed(harness.dockerLog, 'run')).toHaveLength(1);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('build does not read the env file, so a reserved name there does not stop it', () => {
    const harness = makeHarness();
    try {
      const envFile = join(harness.root, 'reserved.env');
      writeFileSync(envFile, 'QUORUM_IMAGE_EVALS_COMMIT=aaaa\n');
      const proc = runWrapper(harness, ['--env-file', envFile, 'build']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      expect(dockerCommandsNamed(harness.dockerLog, 'build')).toHaveLength(1);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up fails before Docker when an explicit env file is missing', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const missingEnvFile = join(harness.root, 'missing.env');
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        '--env-file',
        missingEnvFile,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain(missingEnvFile);
      expect(dockerLogLines(harness.dockerLog)).toEqual([]);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up fails before Docker when an explicit env file is unreadable', () => {
    const harness = makeHarness();
    const envFile = writeEnvFile(harness.root);
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      chmodSync(envFile, 0o000);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        '--env-file',
        envFile,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain(envFile);
      expect(proc.stderr).toContain('readable');
      expect(dockerLogLines(harness.dockerLog)).toEqual([]);
    } finally {
      chmodSync(envFile, 0o600);
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up mounts an explicit Codex auth directory read-only', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const envFile = writeEnvFile(harness.root);
      const codexAuth = join(harness.root, 'codex-auth');
      mkdirSync(codexAuth);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        '--env-file',
        envFile,
        '--auth',
        `codex=${codexAuth}`,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'run');
      const mount = mountForTarget(args, '/auth/codex');
      expectMountSource(mount, codexAuth);
      expectReadonly(mount);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up canonicalizes relative explicit mount sources before calling Docker', () => {
    const harness = makeHarness();
    try {
      const cwd = join(harness.root, 'cwd');
      const superpowersRoot = join(cwd, 'superpowers');
      const codexAuth = join(cwd, 'codex-auth');
      const envFile = join(cwd, 'credentials.env');
      mkdirSync(superpowersRoot, { recursive: true });
      mkdirSync(codexAuth);
      writeFileSync(envFile, 'OPENAI_API_KEY=sk-test\n');

      const proc = runWrapper(
        harness,
        [
          '--superpowers-root',
          'superpowers',
          '--env-file',
          'credentials.env',
          '--auth',
          'codex=codex-auth',
          'up',
        ],
        { cwd },
      );

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'run');
      expectMountSource(
        mountForTarget(args, '/workspace/superpowers'),
        superpowersRoot,
      );
      expectMountSource(
        mountForTarget(args, '/run/evals/credentials.env'),
        envFile,
      );
      expectMountSource(mountForTarget(args, '/auth/codex'), codexAuth);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up rejects mount sources with commas before calling Docker', () => {
    const harness = makeHarness();
    try {
      const commaRoot = join(harness.root, 'superpowers,with-comma');
      mkdirSync(commaRoot);
      const proc = runWrapper(harness, ['--superpowers-root', commaRoot, 'up']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain('comma');
      expect(proc.stderr).toContain(commaRoot);
      expect(dockerLogLines(harness.dockerLog)).toEqual([]);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up fails before Docker when an explicit auth directory is missing', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const envFile = writeEnvFile(harness.root);
      const missingAuth = join(harness.root, 'missing-codex-auth');
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        '--env-file',
        envFile,
        '--auth',
        `codex=${missingAuth}`,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain(missingAuth);
      expect(dockerLogLines(harness.dockerLog)).toEqual([]);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up does not mount the host Docker socket', () => {
    const harness = makeHarness();
    try {
      const superpowersRoot = makeSuperpowersRoot(harness.root);
      const proc = runWrapper(harness, [
        '--superpowers-root',
        superpowersRoot,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      expect(dockerLogLines(harness.dockerLog).join('\n')).not.toContain(
        '/var/run/docker.sock',
      );
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up with an already running container prints its name and does not run a new container', () => {
    const harness = makeHarness();
    try {
      const name = 'evals-running-container';
      writeDockerState(harness, { exists: true, running: true, name });
      const proc = runWrapper(harness, ['--name', name, 'up']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      expect(proc.stdout).toBe(`${name}\n`);
      expect(dockerCommandsNamed(harness.dockerLog, 'run')).toEqual([]);
      expectNoGenericInspect(harness.dockerLog);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up with an existing stopped container starts it and does not run a new container', () => {
    const harness = makeHarness();
    try {
      const name = 'evals-stopped-container';
      writeDockerState(harness, { exists: true, running: false, name });
      const proc = runWrapper(harness, ['--name', name, 'up']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      expect(dockerCommand(harness.dockerLog, 'start').slice(1)).toEqual([
        name,
      ]);
      expect(dockerCommandsNamed(harness.dockerLog, 'run')).toEqual([]);
      expectNoGenericInspect(harness.dockerLog);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('up refuses to reuse an existing container when explicit mounts were requested', () => {
    const harness = makeHarness();
    try {
      const name = 'evals-existing-container';
      const envFile = writeEnvFile(harness.root);
      writeDockerState(harness, { exists: true, running: true, name });
      const proc = runWrapper(harness, [
        '--name',
        name,
        '--env-file',
        envFile,
        'up',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain(name);
      expect(proc.stderr).toContain('down');
      expect(dockerCommandsNamed(harness.dockerLog, 'run')).toEqual([]);
      expect(dockerCommandsNamed(harness.dockerLog, 'start')).toEqual([]);
      expectNoGenericInspect(harness.dockerLog);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('status reports missing, stopped, and running containers', () => {
    const missing = makeHarness();
    const stopped = makeHarness();
    const running = makeHarness();
    try {
      const name = 'evals-status-container';
      writeDockerState(stopped, { exists: true, running: false, name });
      writeDockerState(running, { exists: true, running: true, name });

      const missingStatus = runWrapper(missing, ['--name', name, 'status']);
      const stoppedStatus = runWrapper(stopped, ['--name', name, 'status']);
      const runningStatus = runWrapper(running, ['--name', name, 'status']);

      expect(missingStatus.error).toBeUndefined();
      expect(stoppedStatus.error).toBeUndefined();
      expect(runningStatus.error).toBeUndefined();
      expect(missingStatus.status).toBe(0);
      expect(stoppedStatus.status).toBe(0);
      expect(runningStatus.status).toBe(0);
      expect(missingStatus.stdout).toContain('missing');
      expect(stoppedStatus.stdout).toContain('stopped');
      expect(runningStatus.stdout).toContain('running');
      expectNoGenericInspect(stopped.dockerLog);
      expectNoGenericInspect(running.dockerLog);
    } finally {
      rmSync(missing.root, { recursive: true, force: true });
      rmSync(stopped.root, { recursive: true, force: true });
      rmSync(running.root, { recursive: true, force: true });
    }
  });

  test('down stops then removes a running container', () => {
    const harness = makeHarness();
    try {
      const name = 'evals-down-running-container';
      writeDockerState(harness, { exists: true, running: true, name });
      const proc = runWrapper(harness, ['--name', name, 'down']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const commands = dockerCommands(harness.dockerLog);
      const stopIndex = commands.findIndex((args) => args[0] === 'stop');
      const rmIndex = commands.findIndex((args) => args[0] === 'rm');
      expect(stopIndex).toBeGreaterThanOrEqual(0);
      expect(rmIndex).toBeGreaterThan(stopIndex);
      expect(commands[stopIndex]?.slice(1)).toEqual([name]);
      expect(commands[rmIndex]?.slice(1)).toEqual([name]);
      expectNoGenericInspect(harness.dockerLog);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('down removes a stopped container without stopping it', () => {
    const harness = makeHarness();
    try {
      const name = 'evals-down-stopped-container';
      writeDockerState(harness, { exists: true, running: false, name });
      const proc = runWrapper(harness, ['--name', name, 'down']);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      expect(dockerCommandsNamed(harness.dockerLog, 'stop')).toEqual([]);
      expect(dockerCommand(harness.dockerLog, 'rm').slice(1)).toEqual([name]);
      expectNoGenericInspect(harness.dockerLog);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('exec passes raw trailing args directly to docker exec', () => {
    const harness = makeHarness();
    try {
      const proc = runWrapper(harness, [
        '--name',
        'evals-test-container',
        'exec',
        'bash',
        '-lc',
        'echo ok',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const args = dockerCommand(harness.dockerLog, 'exec');
      expect(args[1]).toBe('evals-test-container');
      expect(args.slice(2)).toEqual(['bash', '-lc', 'echo ok']);
      expect(args.slice(2)).not.toContain('--');
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('exec quorum creates and removes a host-visible results probe before the final command', () => {
    const harness = makeHarness();
    removeResultProbeFiles();
    try {
      const proc = runWrapper(harness, [
        '--name',
        'evals-test-container',
        'exec',
        'quorum',
        'run-all',
        '--jobs',
        '1',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const execs = dockerCommandsNamed(harness.dockerLog, 'exec');
      expect(execs).toHaveLength(2);
      expect(execs[0]?.slice(1, 4)).toEqual([
        'evals-test-container',
        'bash',
        '-lc',
      ]);
      expect(execs[0]?.[4]).toContain('/workspace/evals/results');
      expect(execs[0]?.[4]).toContain(': >');
      expect(execs[1]?.slice(1)).toEqual([
        'evals-test-container',
        'quorum',
        'run-all',
        '--jobs',
        '1',
      ]);
      expect(resultProbeFiles()).toEqual([]);
    } finally {
      removeResultProbeFiles();
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('exec quorum fails before the final command when the results probe is not host-visible', () => {
    const harness = makeHarness({
      EVALS_CONTAINER_RESULTS_HOST_VISIBLE_FAIL: 'true',
    });
    removeResultProbeFiles();
    try {
      const proc = runWrapper(harness, [
        '--name',
        'evals-test-container',
        'exec',
        'quorum',
        'list',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain('host-visible');
      const execs = dockerCommandsNamed(harness.dockerLog, 'exec');
      expect(execs.some((args) => args[2] === 'quorum')).toBe(false);
    } finally {
      removeResultProbeFiles();
      rmSync(harness.root, { recursive: true, force: true });
    }
  });

  test('exec quorum fails before the final command when the results probe fails', () => {
    const harness = makeHarness({
      EVALS_CONTAINER_RESULTS_PROBE_FAIL: 'true',
    });
    try {
      const proc = runWrapper(harness, [
        '--name',
        'evals-test-container',
        'exec',
        'quorum',
        'list',
      ]);

      expect(proc.error).toBeUndefined();
      expect(proc.status).not.toBe(0);
      expect(proc.stderr).toContain('/workspace/evals/results');
      const execs = dockerCommandsNamed(harness.dockerLog, 'exec');
      expect(execs).toHaveLength(1);
      expect(execs[0]?.slice(1, 4)).toEqual([
        'evals-test-container',
        'bash',
        '-lc',
      ]);
      expect(execs[0]?.[4]).toContain('/workspace/evals/results');
      expect(execs.some((args) => args[2] === 'quorum')).toBe(false);
    } finally {
      rmSync(harness.root, { recursive: true, force: true });
    }
  });
});

// The shim's paths are fixed to the container's, so these tests run a copy
// with them pointed at a temp directory and the final command replaced by
// `env`, which prints what the quorum process would have inherited.
describe('container/bin/quorum', () => {
  const SHIM = join(REPO, 'container', 'bin', 'quorum');
  const SUBSTITUTED = [
    'cd /workspace/evals',
    '/run/evals/credentials.env',
    'exec bun run src/cli/index.ts "$@"',
  ];

  function runShimCopy(
    credentials: string,
    imageEnv: Record<string, string>,
  ): Record<string, string> {
    const dir = mkdtempSync(join(tmpdir(), 'evals-quorum-shim-'));
    try {
      const source = readFileSync(SHIM, 'utf8');
      for (const text of SUBSTITUTED) {
        expect(source).toContain(text);
      }
      const credentialsFile = join(dir, 'credentials.env');
      writeFileSync(credentialsFile, credentials);
      const copy = join(dir, 'quorum');
      writeFileSync(
        copy,
        source
          .replaceAll('cd /workspace/evals', `cd ${dir}`)
          .replaceAll('/run/evals/credentials.env', credentialsFile)
          .replace('exec bun run src/cli/index.ts "$@"', 'exec env'),
      );
      const proc = spawnSync('bash', [copy], {
        env: { PATH: Bun.env['PATH'] ?? '', ...imageEnv },
        encoding: 'utf8',
      });
      expect(proc.error).toBeUndefined();
      expect(proc.status).toBe(0);
      const printed: Record<string, string> = {};
      for (const line of proc.stdout.split('\n')) {
        const eq = line.indexOf('=');
        if (eq > 0) {
          printed[line.slice(0, eq)] = line.slice(eq + 1);
        }
      }
      return printed;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test('keeps the image build source when the credentials file assigns or unsets it', () => {
    // GAUNTLET_CLEAN is set but empty, the state of an image built from a
    // checkout git could not read, and must stay set rather than vanish.
    const image = {
      QUORUM_IMAGE_EVALS_COMMIT: 'a'.repeat(40),
      QUORUM_IMAGE_CONTAINER_CLEAN: 'true',
      QUORUM_IMAGE_GAUNTLET_COMMIT: 'c'.repeat(40),
      QUORUM_IMAGE_GAUNTLET_CLEAN: '',
    };
    const printed = runShimCopy(
      [
        'OPENAI_API_KEY=sk-test',
        'QUORUM_IMAGE_EVALS_COMMIT=changed',
        'QUORUM_IMAGE_GAUNTLET_CLEAN=true',
        'unset QUORUM_IMAGE_GAUNTLET_COMMIT',
        '',
      ].join('\n'),
      image,
    );

    expect(printed['OPENAI_API_KEY']).toBe('sk-test');
    for (const [name, value] of Object.entries(image)) {
      expect(name in printed).toBe(true);
      expect(printed[name]).toBe(value);
    }
  });

  test('leaves the build source unset when the image has none, whatever the credentials file says', () => {
    const printed = runShimCopy(
      'OPENAI_API_KEY=sk-test\nQUORUM_IMAGE_EVALS_COMMIT=aaaa\n',
      {},
    );

    expect(printed['OPENAI_API_KEY']).toBe('sk-test');
    expect('QUORUM_IMAGE_EVALS_COMMIT' in printed).toBe(false);
  });
});
