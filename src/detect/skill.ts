import type { ToolCallView } from '../atif/project.ts';

/** Escape all regex metacharacters in a literal string for use in RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true when the tool call represents an agent loading the skill whose
 * directory segment is `dir`. Matching keys off the skill *dir*, not a
 * namespace, so it is agnostic to which plugin (superpowers/hyperpowers/…)
 * exposes the skill. Three patterns are recognized:
 *
 *   1. Native Skill tool call whose `.args.skill` dir segment is `dir`.
 *   2. Shell command (Bash / Shell / LocalShellCall) whose command/cmd
 *      contains `skills/(superpowers/)?<dir>/SKILL.md` with appropriate
 *      word-boundary characters on each side.
 *   3. Read call whose file_path/path ends with
 *      `(^|/)skills/(superpowers/)?<dir>/SKILL.md`.
 */
export function isSkillInvocation(call: ToolCallView, dir: string): boolean {
  const safeDir = escapeRegex(dir);

  // 1. Native Skill tool
  //
  // Match on the skill's directory segment (the part after the last `:`)
  // rather than the full `<namespace>:<dir>` string, so a forked plugin that
  // renames the invocation namespace still matches. The hyperpowers fork of
  // Superpowers invokes `hyperpowers:brainstorming` where upstream scenarios
  // assert `superpowers:brainstorming`; both name the same `brainstorming`
  // skill dir. A different skill (e.g. `superpowers:other` vs dir `foo`) still
  // fails because the segment differs. The shell/Read branches below already
  // key off `dir` and are namespace-agnostic in the same way.
  if (call.tool === 'Skill') {
    const invoked = String(call.args['skill'] ?? '');
    if (!invoked) return false;
    const invokedDir = invoked.includes(':')
      ? invoked.slice(invoked.lastIndexOf(':') + 1)
      : invoked;
    return invokedDir === dir;
  }

  // 2. Shell tools: Bash, Shell, LocalShellCall
  if (/^(Bash|Shell|LocalShellCall)$/.test(call.tool ?? '')) {
    const cmd = String(call.args['command'] ?? call.args['cmd'] ?? '');
    // Leading boundary: start-of-string or [\s'"/]
    // Trailing boundary: end-of-string or [\s'";]
    const shellRe = new RegExp(
      `(^|[\\s'"/])skills/(superpowers/)?${safeDir}/SKILL\\.md([\\s'";]|$)`,
    );
    return shellRe.test(cmd);
  }

  // 3. Read tool
  if (call.tool === 'Read') {
    const p = String(call.args['file_path'] ?? call.args['path'] ?? '');
    const readRe = new RegExp(
      `(^|/)skills/(superpowers/)?${safeDir}/SKILL\\.md$`,
    );
    return readRe.test(p);
  }

  return false;
}
