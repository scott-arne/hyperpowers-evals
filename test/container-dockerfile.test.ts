import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO = resolve(import.meta.dir, '..');
const DOCKERFILE = join(REPO, 'container', 'Dockerfile');

function dockerfileSource(): string {
  expect(existsSync(DOCKERFILE)).toBe(true);
  return readFileSync(DOCKERFILE, 'utf8');
}

function expectInstallIntent(source: string, token: string): void {
  expect(source).toContain(token);
}

test('container Dockerfile uses the verified Ubuntu 26.04 devcontainer base', () => {
  const source = dockerfileSource();

  expect(source).toMatch(
    /^FROM mcr\.microsoft\.com\/devcontainers\/base:3\.0\.1-ubuntu26\.04$/m,
  );
  expect(source).not.toContain('ubuntu24.04');
});

test('container Dockerfile installs the core development toolchain families', () => {
  const source = dockerfileSource();

  for (const packageName of [
    'git',
    'gh',
    'curl',
    'jq',
    'ripgrep',
    'fd-find',
    'shellcheck',
    'build-essential',
    'python3-pip',
    'python3-venv',
    'ruby-full',
    'golang-go',
  ]) {
    expectInstallIntent(source, packageName);
  }

  for (const toolIntent of [
    'deb.nodesource.com',
    'bun.sh/install',
    'astral.sh/uv/install.sh',
    'sh.rustup.rs',
    'mise.run',
  ]) {
    expectInstallIntent(source, toolIntent);
  }
});

test('container Dockerfile installs headless agent CLIs without desktop IDE sprawl', () => {
  const source = dockerfileSource();

  for (const npmPackage of [
    '@anthropic-ai/claude-code',
    '@openai/codex',
    '@google/gemini-cli',
    'opencode-ai',
    '@github/copilot',
    '@factory/cli',
    '@qoder-ai/qodercli',
    '@qwen-code/qwen-code',
    '@moonshot-ai/kimi-code',
    '@kilocode/cli',
    'openclaw',
    '@sourcegraph/amp',
    '@augmentcode/auggie',
    '@continuedev/cli',
    'cline',
    '@mariozechner/pi-coding-agent',
  ]) {
    expectInstallIntent(source, npmPackage);
  }

  for (const externalInstall of [
    'cursor.com/install',
    'aider-chat',
    'goose_1.31.1_amd64.deb',
    'AGY_OAUTH_HOME',
    'KIMI_OAUTH_HOME',
  ]) {
    expectInstallIntent(source, externalInstall);
  }

  for (const commandIntent of [
    '/usr/local/bin/kilo',
    '/usr/local/bin/droid',
    '/usr/local/bin/cn',
    '/usr/local/bin/cursor-agent',
  ]) {
    expectInstallIntent(source, commandIntent);
  }

  expect(source).toContain(
    'curl -fsSL https://cursor.com/install | HOME=/opt/cursor-agent bash',
  );
  expect(source).not.toContain(
    'HOME=/opt/cursor-agent curl -fsSL https://cursor.com/install | bash',
  );
  expect(source).toContain('UV_TOOL_BIN_DIR=/usr/local/bin');
  expect(source).not.toContain('uv tool install --tool-dir');

  for (const forbidden of [
    '.devcontainer/devcontainer.json',
    '/var/run/docker.sock',
    'xvfb',
    'vnc',
    'novnc',
    'cursor.deb',
    'kiro',
    'trae',
    'antigravity',
  ]) {
    expect(source.toLowerCase()).not.toContain(forbidden);
  }
});

test('container Dockerfile exposes quorum shims and stable workspace entrypoint', () => {
  const source = dockerfileSource();

  expect(source).toContain('COPY container/bin/quorum /usr/local/bin/quorum');
  expect(source).toContain(
    'COPY container/bin/evals-tool-versions /usr/local/bin/evals-tool-versions',
  );
  expect(source).toContain(
    'chmod +x /usr/local/bin/quorum /usr/local/bin/evals-tool-versions',
  );
  expect(source).toMatch(/^WORKDIR \/workspace\/evals$/m);
  expect(source).toMatch(/^CMD \["sleep", "infinity"\]$/m);
});
