import { expect, test } from 'bun:test';
import type { ToolCallView } from '../src/atif/project.ts';
import { isSkillInvocation } from '../src/detect/skill.ts';

// Helpers
function call(tool: string, args: Record<string, unknown>): ToolCallView {
  return { tool, args };
}

const name = 'superpowers:foo';
const dir = 'foo';

// --- Native Skill tool calls ---

test('Skill tool with matching skill name → true', () => {
  expect(
    isSkillInvocation(call('Skill', { skill: 'superpowers:foo' }), name, dir),
  ).toBe(true);
});

test('Skill tool with different skill name → false', () => {
  expect(
    isSkillInvocation(call('Skill', { skill: 'superpowers:other' }), name, dir),
  ).toBe(false);
});

// --- Forked namespace: match on the skill dir segment, not the namespace ---

test('Skill tool with forked hyperpowers: namespace, same dir → true', () => {
  // The hyperpowers fork invokes hyperpowers:foo where the scenario asserts
  // superpowers:foo; both name the same `foo` skill dir.
  expect(
    isSkillInvocation(call('Skill', { skill: 'hyperpowers:foo' }), name, dir),
  ).toBe(true);
});

test('Skill tool with forked namespace but different dir → false', () => {
  expect(
    isSkillInvocation(
      call('Skill', { skill: 'hyperpowers:other' }),
      name,
      dir,
    ),
  ).toBe(false);
});

test('Skill tool with bare skill name (no namespace), same dir → true', () => {
  expect(isSkillInvocation(call('Skill', { skill: 'foo' }), name, dir)).toBe(
    true,
  );
});

test('Skill tool asserted under hyperpowers: name still matches superpowers: invocation', () => {
  // Symmetry: a scenario authored with a hyperpowers: assertion must also match
  // an upstream superpowers: invocation, so the detector is namespace-agnostic
  // in both directions.
  expect(
    isSkillInvocation(
      call('Skill', { skill: 'superpowers:brainstorming' }),
      'hyperpowers:brainstorming',
      'brainstorming',
    ),
  ).toBe(true);
});

// --- Shell reads via Bash ---

test('Bash with superpowers/ prefix in path → true', () => {
  expect(
    isSkillInvocation(
      call('Bash', { command: 'cat skills/superpowers/foo/SKILL.md' }),
      name,
      dir,
    ),
  ).toBe(true);
});

test('Bash without superpowers/ prefix (optional) → true', () => {
  expect(
    isSkillInvocation(
      call('Bash', { command: 'cat skills/foo/SKILL.md' }),
      name,
      dir,
    ),
  ).toBe(true);
});

// --- Read calls (antigravity / normalized) ---

test('Read with file_path under skills/superpowers/ → true (brainstorming)', () => {
  expect(
    isSkillInvocation(
      call('Read', {
        file_path: '/tmp/run/skills/superpowers/brainstorming/SKILL.md',
      }),
      'superpowers:brainstorming',
      'brainstorming',
    ),
  ).toBe(true);
});

test('Read with path field (superpowers/skills/brainstorming) → true via (^|/) anchor', () => {
  // Path: /tmp/run/superpowers/skills/brainstorming/SKILL.md
  // Regex: (^|/)skills/(superpowers/)?brainstorming/SKILL.md$
  // Matches at /skills/brainstorming/SKILL.md$
  expect(
    isSkillInvocation(
      call('Read', {
        path: '/tmp/run/superpowers/skills/brainstorming/SKILL.md',
      }),
      'superpowers:brainstorming',
      'brainstorming',
    ),
  ).toBe(true);
});

test('Read with wrong skill dir → false', () => {
  expect(
    isSkillInvocation(
      call('Read', { file_path: '/tmp/run/skills/writing-plans/SKILL.md' }),
      'superpowers:brainstorming',
      'brainstorming',
    ),
  ).toBe(false);
});

// --- Bash false cases ---

test('Bash with no skills/ segment boundary → false', () => {
  // 'notes/mangrep-foo/SKILL.md' has no 'skills/' segment
  expect(
    isSkillInvocation(
      call('Bash', { command: 'cat notes/mangrep-foo/SKILL.md' }),
      name,
      dir,
    ),
  ).toBe(false);
});

// --- Wrong tool ---

test('Edit tool → false', () => {
  expect(isSkillInvocation(call('Edit', {}), name, dir)).toBe(false);
});

// --- Shell variants ---

test('Shell tool recognized same as Bash → true', () => {
  expect(
    isSkillInvocation(
      call('Shell', { command: 'skills/foo/SKILL.md' }),
      name,
      dir,
    ),
  ).toBe(true);
});

test('LocalShellCall with cmd field → true', () => {
  expect(
    isSkillInvocation(
      call('LocalShellCall', { cmd: 'cat skills/foo/SKILL.md' }),
      name,
      dir,
    ),
  ).toBe(true);
});

// --- Defensive: missing / non-string args ---

test('Skill tool with missing skill arg → false', () => {
  expect(isSkillInvocation(call('Skill', {}), name, dir)).toBe(false);
});

test('Read with missing path fields → false', () => {
  expect(isSkillInvocation(call('Read', {}), name, dir)).toBe(false);
});
