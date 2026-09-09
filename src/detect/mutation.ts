// detect/mutation.ts — "did this tool call change a file in the working copy?"
//
// `isImplementationPath` answers that for tools that name their target in a
// path argument (Edit, Write, NotebookEdit). It cannot answer it for Bash,
// whose target lives inside a command string, so an ordering check built only
// on the path-argument tools passes a run that rewrites the same files with
// `sed -i`, a redirection, or `perl -pi`. This module closes that hole.
//
// The rule is deliberately shape-based rather than "any Bash call": a review
// session runs dozens of read-only commands (git log, git diff, node -e to
// reproduce a defect) before it changes anything, and treating those as
// mutations would fail every honest run. Only commands whose recognized shape
// writes a file count, and only when the file they name resolves inside the
// agent's working copy — an absolute path elsewhere is scratch, and a `$VAR`
// or a glob cannot be resolved here so it is not guessed at.

import type { ToolCallView } from '../atif/project.ts';
import {
  isImplementationPath,
  isImplementationRel,
  workdirRelpath,
} from './implementation.ts';

/** Tools that mutate a file named directly in a path argument. */
const PATH_ARG_MUTATORS = new Set([
  'Edit',
  'MultiEdit',
  'Write',
  'NotebookEdit',
  'create_file',
  'edit_file',
  'str_replace_editor',
]);

// Filler for spans whose content is data rather than syntax. One character
// wide, so masking preserves offsets and callers can slice the command with
// indices found in the mask; not whitespace, so `sed -i '' 's/a/b/' f` still
// tokenizes into four words; a plain letter, so it can never be read as a
// redirection, a separator or a quote.
const OPAQUE = 'x';

/**
 * Drop heredoc bodies, keeping the line that opens them.
 *
 * `cat > src/f.js <<'EOF' ... EOF` writes a file, and the redirection on the
 * opening line already says so. The body is data: agent scripts routinely
 * embed review prose, diffs and other shell text there, and reading that as
 * syntax is how a detector invents writes that never happened. The body is
 * removed rather than blanked because tokenizing recovers text from the
 * unmasked command, which would put the body's words back in play.
 */
function stripHeredocs(command: string): string {
  const lines = command.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] as string;
    out.push(line);
    i++;
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
    if (m === null) continue;
    const delim = m[2] as string;
    while (i < lines.length && (lines[i] as string).trim() !== delim) i++;
    if (i < lines.length) i++; // the closing delimiter line
  }
  return out.join('\n');
}

/**
 * Return a same-length copy of the command with every quoted span and command
 * substitution replaced by opaque filler.
 *
 * Redirection operators and separators are syntax; the same characters inside
 * a quoted string are data. `$(...)` and backticks are masked too: their
 * content is a nested command whose quoting does not compose with the outer
 * string, and mis-tracking it desynchronizes everything after it.
 */
function maskData(command: string): string {
  const out = command.split('');
  let quote: string | null = null;
  let substDepth = 0;
  for (let i = 0; i < out.length; i++) {
    const ch = out[i] as string;
    if (substDepth > 0) {
      if (ch === '(') substDepth++;
      else if (ch === ')') substDepth--;
      out[i] = OPAQUE;
      continue;
    }
    if (quote === null) {
      if (ch === '$' && out[i + 1] === '(') {
        substDepth = 1;
        out[i] = OPAQUE;
        out[++i] = OPAQUE;
        continue;
      }
      if (ch === '`') {
        out[i] = OPAQUE;
        while (++i < out.length && out[i] !== '`') out[i] = OPAQUE;
        if (i < out.length) out[i] = OPAQUE;
        continue;
      }
      if (ch === "'" || ch === '"') {
        quote = ch;
        out[i] = OPAQUE;
      }
    } else {
      if (quote === '"' && ch === '\\') {
        out[i] = OPAQUE;
        if (i + 1 < out.length) out[++i] = OPAQUE;
        continue;
      }
      if (ch === quote) quote = null;
      out[i] = OPAQUE;
    }
  }
  return out.join('');
}

/** One pipeline/list segment: its text and its masked twin, same length. */
interface Segment {
  raw: string;
  masked: string;
}

function segments(command: string): Segment[] {
  const raw = stripHeredocs(command);
  const masked = maskData(raw);
  const cuts: number[] = [0];
  for (let i = 0; i < masked.length; i++) {
    const two = masked.slice(i, i + 2);
    if (two === '&&' || two === '||') {
      cuts.push(i, i + 2);
      i++;
    } else if (';|&\n'.includes(masked[i] as string)) {
      cuts.push(i, i + 1);
    }
  }
  cuts.push(masked.length);

  const out: Segment[] = [];
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const start = cuts[i] as number;
    const end = cuts[i + 1] as number;
    if (end > start) {
      out.push({ raw: raw.slice(start, end), masked: masked.slice(start, end) });
    }
  }
  return out;
}

/** Split a segment into words on real (unmasked) whitespace. */
function tokens(seg: Segment): string[] {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= seg.masked.length; i++) {
    const ws = i === seg.masked.length || /\s/.test(seg.masked[i] as string);
    if (ws) {
      if (start >= 0) {
        out.push(seg.raw.slice(start, i));
        start = -1;
      }
    } else if (start < 0) {
      start = i;
    }
  }
  return out;
}

/** Strip one layer of surrounding quotes from a shell word. */
function unquote(word: string): string {
  const m = /^(['"])([\s\S]*)\1$/.exec(word);
  return m ? (m[2] as string) : word;
}

/**
 * True when a shell word names a file inside the working copy. A word the
 * shell would expand — a variable, a glob, a home reference — cannot be
 * resolved here, so it is refused rather than guessed at.
 */
function isWorkdirTarget(word: string): boolean {
  const raw = unquote(word);
  if (raw === '' || /[$*?~]/.test(raw) || raw.startsWith('-')) return false;
  if (raw.startsWith('/dev/')) return false;
  return isImplementationRel(workdirRelpath(raw));
}

/** A segment split into its redirections and the words that remain. */
interface Redirected {
  /** Files the segment redirects output into. */
  targets: string[];
  /** The same segment with every redirection blanked out. */
  command: Segment;
}

/**
 * Separate redirections from command words.
 *
 * Both halves matter. `> f` and `>> f` write a file and are the point of the
 * scan; but the operator and its target must also be removed before the
 * segment is tokenized, or `rm -rf /tmp/x 2>/dev/null` hands `2>/dev/null` to
 * `rm` as though it were a relative path in the working copy.
 */
function splitRedirections(seg: Segment): Redirected {
  const rawArr = seg.raw.split('');
  const maskArr = seg.masked.split('');
  const targets: string[] = [];

  for (let i = 0; i < seg.masked.length; i++) {
    const ch = seg.masked[i] as string;
    if (ch !== '>' && ch !== '<') continue;

    // A file descriptor written against the operator belongs to it: `2>`.
    let start = i;
    if (
      start > 0 &&
      /[0-9]/.test(seg.masked[start - 1] as string) &&
      (start < 2 || /[\s;|&]/.test(seg.masked[start - 2] as string))
    ) {
      start--;
    }

    let end = i + 1;
    if (seg.masked[end] === ch) end++; // `>>` or `<<`
    const isWrite = ch === '>';

    while (end < seg.masked.length && /[ \t]/.test(seg.masked[end] as string)) {
      end++;
    }
    if (seg.masked[end] === '&') {
      // `2>&1` and `>&2` duplicate a descriptor; they write no file.
      end++;
      while (end < seg.masked.length && /[0-9-]/.test(seg.masked[end] as string)) {
        end++;
      }
    } else {
      const word = /^[^\s;|&<>()]+/.exec(seg.masked.slice(end));
      if (word !== null) {
        if (isWrite) targets.push(seg.raw.slice(end, end + word[0].length));
        end += word[0].length;
      }
    }

    for (let k = start; k < end; k++) {
      rawArr[k] = ' ';
      maskArr[k] = ' ';
    }
    i = end - 1;
  }

  return {
    targets,
    command: { raw: rawArr.join(''), masked: maskArr.join('') },
  };
}

/** In-place flags for the stream editors. `-i.bak` and `-pi` both count. */
const INPLACE_RE = /^-{1,2}(?:[a-zA-Z]*i[a-zA-Z]*(?:\.\S*)?|in-place(?:=\S*)?)$/;

/** Write functions recognized inside an interpreter one-liner. */
const INTERPRETER_WRITE_RE =
  /\b(?:writeFileSync|appendFileSync|createWriteStream|write_text|writelines|os\.replace|fs\.rename|shutil\.(?:copy|copyfile|move))\b|\bopen\s*\([^)]*['"][rbt]*[wax]\+?[rbt]*['"]/;

/** Git subcommands that rewrite tracked files in the working tree. */
const GIT_WRITE_SUBCOMMANDS = new Set([
  'apply',
  'restore',
  'am',
  'revert',
  'cherry-pick',
  'clean',
  'stash',
]);

/** Words that precede the real command without being it. */
const WRAPPERS = new Set([
  'sudo',
  'env',
  'command',
  'nice',
  'time',
  'xargs',
  'then',
  'do',
  'else',
]);

/**
 * Targets of an in-place stream editor invocation, or null when the call is
 * not in place. Parsed positionally so `sed -i '' 's/a/b/' f` (the BSD backup
 * suffix form) does not mistake its own script for a filename, and so
 * `perl -pi -e SCRIPT f` does not drop its only real target.
 */
function streamEditorTargets(rest: string[]): string[] | null {
  let inPlace = false;
  let scriptGiven = false;
  const operands: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const w = rest[i] as string;
    if (w === '-e' || w === '-f' || w === '--expression' || w === '--file') {
      scriptGiven = true;
      i++; // the script or script file is this flag's argument, not a target
      continue;
    }
    if (w === '-i' || w === '--in-place') {
      inPlace = true;
      // BSD sed takes the backup suffix as a separate (usually empty) word.
      const next = rest[i + 1];
      if (next !== undefined && unquote(next) === '') i++;
      continue;
    }
    if (INPLACE_RE.test(w) || (w.startsWith('-i') && !w.startsWith('--'))) {
      inPlace = true;
      continue;
    }
    if (w === 'inplace' || w.startsWith('inplace=')) {
      inPlace = true; // awk -i inplace
      continue;
    }
    if (w.startsWith('-')) continue;
    operands.push(w);
  }

  if (!inPlace) return null;
  // Without an -e/-f flag the first operand is the script, not a file.
  return scriptGiven ? operands : operands.slice(1);
}

/** True when one pipeline segment writes a file inside the working copy. */
function segmentMutates(seg: Segment): boolean {
  const { targets: redirected, command } = splitRedirections(seg);
  if (redirected.some(isWorkdirTarget)) return true;

  const words = tokens(command);
  let i = 0;
  while (
    i < words.length &&
    (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i] as string) ||
      WRAPPERS.has(words[i] as string))
  ) {
    i++;
  }
  if (i >= words.length) return false;

  const argv = words.slice(i);
  const name = (unquote(argv[0] as string).split('/').pop() ?? '').trim();
  const rest = argv.slice(1);
  const operands = rest.filter((w) => !w.startsWith('-'));

  switch (name) {
    case 'sed':
    case 'perl':
    case 'ruby':
    case 'gawk':
    case 'awk': {
      const targets = streamEditorTargets(rest);
      return targets !== null && targets.some(isWorkdirTarget);
    }
    case 'tee':
      return operands.some(isWorkdirTarget);
    case 'cp':
    case 'mv':
    case 'install':
      return (
        operands.length >= 2 &&
        isWorkdirTarget(operands[operands.length - 1] as string)
      );
    case 'rm':
    case 'truncate':
      return operands.some(isWorkdirTarget);
    case 'dd':
      return rest
        .filter((w) => w.startsWith('of='))
        .some((w) => isWorkdirTarget(w.slice(3)));
    case 'patch':
      // patch names its targets inside the diff, not on the command line.
      return true;
    case 'git': {
      const sub = operands[0] ?? '';
      if (GIT_WRITE_SUBCOMMANDS.has(sub)) return true;
      // `git checkout -- <path>` and `git reset --hard` overwrite the tree;
      // checking out or resetting a ref alone does not rewrite a reviewed file.
      if (sub === 'checkout' && rest.includes('--')) return true;
      if (sub === 'reset' && rest.includes('--hard')) return true;
      return false;
    }
    default:
      break;
  }

  // An interpreter one-liner that both calls a write function and names a path
  // inside the working copy. Both halves are required: the write alone may
  // target scratch, and the path alone may only be read.
  if (INTERPRETER_WRITE_RE.test(command.raw)) {
    const literals = (command.raw.match(/['"]([^'"\n]+)['"]/g) ?? []).map(unquote);
    return literals.some(isWorkdirTarget);
  }

  return false;
}

/** True when a Bash command writes a file inside the agent's working copy. */
export function shellMutates(command: string): boolean {
  return segments(command).some(segmentMutates);
}

/**
 * True when a tool call changed a file in the working copy, by any path: the
 * path-argument editors, or a Bash command with a write-capable shape.
 */
export function isMutatingCall(call: ToolCallView): boolean {
  if (PATH_ARG_MUTATORS.has(call.tool)) return isImplementationPath(call);
  if (call.tool === 'Bash' || call.tool === 'run_terminal_cmd') {
    return shellMutates(String(call.args['command'] ?? ''));
  }
  return false;
}

/** Human-readable target for a failure detail. */
export function mutationDescription(call: ToolCallView): string {
  if (PATH_ARG_MUTATORS.has(call.tool)) {
    const p = String(call.args['file_path'] ?? call.args['path'] ?? '');
    return `${call.tool}(${workdirRelpath(p)})`;
  }
  const command = String(call.args['command'] ?? '').replace(/\s+/g, ' ');
  const shown = command.length > 80 ? `${command.slice(0, 77)}...` : command;
  return `${call.tool}(${shown})`;
}
