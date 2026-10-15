// Drift-guard: the sourced check prelude (src/checks/prelude.sh) must define
// EXACTLY the bare-verb vocabulary — Object.keys(FS_VERBS) ∪ {not,
// check-transcript, setup-helpers} plus the one internal dispatcher helper
// (__quorum_bun) — and nothing more or less.
//
// The FS verbs are generated at source time from src/cli/list-check-verbs.ts
// (Object.keys(FS_VERBS)), so a new FS verb propagates automatically; this guard
// catches the cases the generator does NOT cover: a hand-added/removed extra
// (not / check-transcript / setup-helpers) silently diverging from the source.

import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { FS_VERBS } from '../src/check/dispatch.ts';

const REPO = resolve(import.meta.dir, '..');
const PRELUDE = resolve(REPO, 'src', 'checks', 'prelude.sh');

const EXTRA_VERBS = ['not', 'check-transcript', 'setup-helpers'] as const;

// Not a verb: the shared `bun run` wrapper every verb function calls, which pins
// Bun's configuration away from the agent workdir.
const INTERNAL_HELPERS = ['__quorum_bun'] as const;

/** Source the prelude in a clean bash and list the function names it defines. */
function preludeFunctionNames(): string[] {
  // `compgen -A function` lists every defined function name, one per line.
  const proc = spawnSync(
    'bash',
    ['-c', `source '${PRELUDE}'; compgen -A function`],
    {
      env: { ...process.env, QUORUM_REPO_ROOT: REPO },
      encoding: 'utf8',
    },
  );
  return proc.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

test('prelude defines exactly Object.keys(FS_VERBS) ∪ {not, check-transcript, setup-helpers, __quorum_bun}', () => {
  const expected = new Set<string>([
    ...Object.keys(FS_VERBS),
    ...EXTRA_VERBS,
    ...INTERNAL_HELPERS,
  ]);
  const defined = new Set(preludeFunctionNames());
  expect(defined).toEqual(expected);
});
