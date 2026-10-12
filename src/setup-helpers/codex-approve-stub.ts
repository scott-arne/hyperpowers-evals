// Install the shared Codex approve-stub (fixtures/codex-stubs/approve-companion.mjs)
// into the coding agent's throwaway home, for the brainstorming scenarios whose
// approach and spec gates call the companion's `task` subcommand. The stub
// lived as a heredoc copy in each of eight setup.sh files; one fixture keeps
// the copies from drifting. Same install layout and registry as
// seed_codex_plugin_cc (codex-seed.ts), whose stub answers code-review gates
// instead.
import { chmodSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../paths.ts';
import { agentHomeFromWorkdir, registryJson } from './codex-seed.ts';
import type { HelperContext } from './context.ts';

const STUB = join(
  repoRoot(),
  'fixtures',
  'codex-stubs',
  'approve-companion.mjs',
);

// Dispatchable as `setup-helpers run seed_codex_approve_stub`. Layers onto an
// existing fixture (home-relative writes only; no git init).
export function seedCodexApproveStub(ctx: HelperContext): void {
  const pluginsDir = join(
    agentHomeFromWorkdir(ctx.workdir),
    '.claude',
    'plugins',
  );
  const installPath = join(
    pluginsDir,
    'cache',
    'openai-codex',
    'codex',
    'stub',
  );
  const scriptsDir = join(installPath, 'scripts');
  mkdirSync(scriptsDir, { recursive: true });
  const companion = join(scriptsDir, 'codex-companion.mjs');
  copyFileSync(STUB, companion);
  chmodSync(companion, 0o755);
  mkdirSync(join(installPath, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(installPath, '.claude-plugin', 'plugin.json'),
    '{ "name": "codex", "version": "0.0.0-stub" }\n',
    'utf8',
  );
  writeFileSync(
    join(pluginsDir, 'installed_plugins.json'),
    registryJson(installPath),
    'utf8',
  );
}
