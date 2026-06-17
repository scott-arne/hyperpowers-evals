import { expect, test } from 'bun:test';
import type { ToolCallView } from '../src/atif/project.ts';
import { isSkillInvocation } from '../src/detect/skill.ts';

// Helpers
function call(tool: string, args: Record<string, unknown>): ToolCallView {
  return { tool, args };
}

const dir = 'foo';

// --- Native Skill tool calls ---

test('Skill tool with matching skill dir → true', () => {
  expect(
    isSkillInvocation(call('Skill', { skill: 'superpowers:foo' }), dir),
  ).toBe(true);
});

test('Skill tool with different skill dir → false', () => {
  expect(
    isSkillInvocation(call('Skill', { skill: 'superpowers:other' }), dir),
  ).toBe(false);
});

// --- Forked namespace: match on the skill dir segment, not the namespace ---

test('Skill tool with forked hyperpowers: namespace, same dir → true', () => {
  // The hyperpowers fork invokes hyperpowers:foo where upstream scenarios
  // assert superpowers:foo; both name the same `foo` skill dir.
  expect(
    isSkillInvocation(call('Skill', { skill: 'hyperpowers:foo' }), dir),
  ).toBe(true);
});

test('Skill tool with forked namespace but different dir → false', () => {
  expect(
    isSkillInvocation(call('Skill', { skill: 'hyperpowers:other' }), dir),
  ).toBe(false);
});

test('Skill tool with bare skill name (no namespace), same dir → true', () => {
  expect(isSkillInvocation(call('Skill', { skill: 'foo' }), dir)).toBe(true);
});

// --- Shell reads via Bash ---

test('Bash with superpowers/ prefix in path → true', () => {
  expect(
    isSkillInvocation(
      call('Bash', { command: 'cat skills/superpowers/foo/SKILL.md' }),
      dir,
    ),
  ).toBe(true);
});

test('Bash without superpowers/ prefix (optional) → true', () => {
  expect(
    isSkillInvocation(
      call('Bash', { command: 'cat skills/foo/SKILL.md' }),
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
      'brainstorming',
    ),
  ).toBe(true);
});

test('Read with wrong skill dir → false', () => {
  expect(
    isSkillInvocation(
      call('Read', { file_path: '/tmp/run/skills/writing-plans/SKILL.md' }),
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
      dir,
    ),
  ).toBe(false);
});

// --- Wrong tool ---

test('Edit tool → false', () => {
  expect(isSkillInvocation(call('Edit', {}), dir)).toBe(false);
});

// --- Shell variants ---

test('Shell tool recognized same as Bash → true', () => {
  expect(
    isSkillInvocation(call('Shell', { command: 'skills/foo/SKILL.md' }), dir),
  ).toBe(true);
});

test('LocalShellCall with cmd field → true', () => {
  expect(
    isSkillInvocation(
      call('LocalShellCall', { cmd: 'cat skills/foo/SKILL.md' }),
      dir,
    ),
  ).toBe(true);
});

// --- Defensive: missing / non-string args ---

test('Skill tool with missing skill arg → false', () => {
  expect(isSkillInvocation(call('Skill', {}), dir)).toBe(false);
});

test('Read with missing path fields → false', () => {
  expect(isSkillInvocation(call('Read', {}), dir)).toBe(false);
});
