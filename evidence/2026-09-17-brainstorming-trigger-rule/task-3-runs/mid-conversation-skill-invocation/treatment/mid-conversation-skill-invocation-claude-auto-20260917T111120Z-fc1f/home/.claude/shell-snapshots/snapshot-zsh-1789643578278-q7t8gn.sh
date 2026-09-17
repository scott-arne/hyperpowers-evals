# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  function rg {
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=/Users/johnss51/Development/agents/hyperpowers/evals/results/mid-conversation-skill-invocation-claude-auto-20260917T111120Z-fc1f/home/.local/bin/claude
  if [[ ! -x $_cc_bin ]]; then command rg ${1+"$@"}; return; fi
  if [[ -n ${ZSH_VERSION:-} ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  else
    (exec -a rg "$_cc_bin" ${1+"$@"})
  fi
}
fi
# Shadow find/grep with embedded bfs/ugrep
unalias find 2>/dev/null || true
unalias grep 2>/dev/null || true
function find {
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=/Users/johnss51/Development/agents/hyperpowers/evals/results/mid-conversation-skill-invocation-claude-auto-20260917T111120Z-fc1f/home/.local/bin/claude
  if [[ ! -x $_cc_bin ]]; then command find ${1+"$@"}; return; fi
  if [[ -n ${ZSH_VERSION:-} ]]; then
    ARGV0=bfs "$_cc_bin" -S dfs -regextype findutils-default ${1+"$@"}
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=bfs "$_cc_bin" -S dfs -regextype findutils-default ${1+"$@"}
  else
    (exec -a bfs "$_cc_bin" -S dfs -regextype findutils-default ${1+"$@"})
  fi
}
function grep {
  local _cc_a
  for _cc_a in ${1+"$@"}; do
    case "$_cc_a" in -*-filter*|-*-pager*|-*-view*|-*-format-open*|-*-config*|---*|-@*|-*-save-config*|-[Zz]*|-[!-]*[Zz]*|--null|--null-data) command grep ${1+"$@"}; return ;; esac
  done
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=/Users/johnss51/Development/agents/hyperpowers/evals/results/mid-conversation-skill-invocation-claude-auto-20260917T111120Z-fc1f/home/.local/bin/claude
  if [[ ! -x $_cc_bin ]]; then command grep ${1+"$@"}; return; fi
  if [[ -n ${ZSH_VERSION:-} ]]; then
    ARGV0=ugrep "$_cc_bin" -G --ignore-files --hidden -I --exclude-dir=.git --exclude-dir=.svn --exclude-dir=.hg --exclude-dir=.bzr --exclude-dir=.jj --exclude-dir=.sl ${1+"$@"}
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=ugrep "$_cc_bin" -G --ignore-files --hidden -I --exclude-dir=.git --exclude-dir=.svn --exclude-dir=.hg --exclude-dir=.bzr --exclude-dir=.jj --exclude-dir=.sl ${1+"$@"}
  else
    (exec -a ugrep "$_cc_bin" -G --ignore-files --hidden -I --exclude-dir=.git --exclude-dir=.svn --exclude-dir=.hg --exclude-dir=.bzr --exclude-dir=.jj --exclude-dir=.sl ${1+"$@"})
  fi
}
# Shadow pkill to refuse patterns matching the CLI process
unalias pkill 2>/dev/null || true
function pkill {
  if [ -n "${CLAUDE_PID:-}" ] && [ -r "/proc/${CLAUDE_PID}/comm" ]; then
    local _cc_skip="" _cc_a
    local -a _cc_probe=()
    for _cc_a in ${1+"$@"}; do
      if [ -n "$_cc_skip" ]; then _cc_skip=""; continue; fi
      case "$_cc_a" in
        --signal) _cc_skip=1 ;;
        --signal=*|-e|--echo) ;;
        -[0-9]*) ;;
        -[PUGOF]?*) _cc_probe+=("$_cc_a") ;;
        -[ABCDEFGHIJKLMNOPQRSTUVWXYZ][ABCDEFGHIJKLMNOPQRSTUVWXYZ0-9]*) ;;
        *) _cc_probe+=("$_cc_a") ;;
      esac
    done
    if command pgrep ${_cc_probe[@]+"${_cc_probe[@]}"} 2>/dev/null | command grep -qx "${CLAUDE_PID}"; then
      printf 'pkill: refusing to run — this pattern matches the Claude CLI process (PID %s). Narrow the pattern, or target your own children with `pkill -P $$ ...`.\n' "${CLAUDE_PID}" >&2
      return 1
    fi
  fi
  command pkill ${1+"$@"}
}
export PATH='/Users/johnss51/Development/agents/hyperpowers/evals/node_modules/.bin:/Users/johnss51/Development/agents/hyperpowers/evals/node_modules/.bin:/Users/johnss51/Development/agents/hyperpowers/node_modules/.bin:/Users/johnss51/Development/agents/node_modules/.bin:/Users/johnss51/Development/node_modules/.bin:/Users/johnss51/node_modules/.bin:/Users/node_modules/.bin:/node_modules/.bin:/Users/johnss51/Development/agents/hyperpowers/evals/node_modules/.bin:/Users/johnss51/Development/agents/hyperpowers/evals/node_modules/.bin:/Users/johnss51/Development/agents/hyperpowers/node_modules/.bin:/Users/johnss51/Development/agents/node_modules/.bin:/Users/johnss51/Development/node_modules/.bin:/Users/johnss51/node_modules/.bin:/Users/node_modules/.bin:/node_modules/.bin:/opt/homebrew/bin:/Users/johnss51/.antigravity/antigravity/bin:/Users/johnss51/.antigravity/antigravity/bin:/Users/johnss51/.local/bin:/opt/local/bin:/Users/johnss51/Applications/bin:/Users/johnss51/Data/Structures/References/scripts:/Users/johnss51/Applications/micromamba/condabin:/opt/homebrew/opt/openssl/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/pkg/env/global/bin:/opt/X11/bin:/Library/Apple/usr/bin:/Library/TeX/texbin:/Users/johnss51/Applications/domino/domino:/Users/johnss51/.cargo/bin:/Users/johnss51/.docker/bin:/Users/johnss51/Library/Application Support/JetBrains/Toolbox/scripts:/usr/local/bin:/Users/johnss51/.claude/plugins/cache/anthropic-agent-skills/document-skills/41bbe19d1a1a/bin:/Users/johnss51/.claude/plugins/cache/claude-plugins-official/clangd-lsp/1.0.0/bin:/Users/johnss51/.claude/plugins/cache/claude-plugins-official/skill-creator/85cce0381e78/bin:/Users/johnss51/.claude/plugins/cache/claude-plugins-official/pyright-lsp/1.0.0/bin:/Users/johnss51/.claude/plugins/cache/claude-plugins-official/frontend-design/85cce0381e78/bin:/Users/johnss51/.claude/plugins/cache/openai-codex/codex/1.0.6/bin:/Users/johnss51/.claude/plugins/cache/hyperpowers/hyperpowers/6.12.0/bin:/Users/johnss51/.claude/plugins/cache/uv-stack/uv-stack/0.1.0/bin:/Users/johnss51/.claude/plugins/cache/vrzn-skill/vrzn/0.1.0/bin:/Users/johnss51/Development/agents/hyperpowers/.worktrees/trigger-rule/bin'
