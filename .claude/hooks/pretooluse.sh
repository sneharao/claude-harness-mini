#!/usr/bin/env bash
# PreToolUse hook — Claude Code Bash tool only.
#
# Blocks shell commands that would dump .env file contents.
# Git-commit gating is handled by .githooks/pre-commit (git-level),
# not here — see SessionStart hook for the activation reminder.
#
# Fails open if node isn't on PATH (can't parse JSON → don't block).
# Exit 2 → blocks the tool call and shows stderr to Claude.

set -u

if ! command -v node >/dev/null 2>&1; then
  exit 0
fi

command="$(cat | node -e "
let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>{
  try{
    const j=JSON.parse(s);
    process.stdout.write((j.tool_input&&j.tool_input.command)||'');
  }catch{ process.stdout.write(''); }
});
")"

# Block bash commands that read .env file contents.
if [[ "$command" == *".env"* ]]; then
  case "$command" in
    *"cat "*.env*  | *"grep "*.env* | *"head "*.env* | \
    *"tail "*.env* | *"less "*.env* | *"more "*.env* | \
    *"sed "*.env*  | *"awk "*.env*  | *"source "*.env* | \
    *". "*.env*    | *"cp "*.env*   | *"mv "*.env*)
      echo "[harness] blocked: command reads .env contents." >&2
      echo "[harness] use \`printenv VAR_NAME\` for individual values instead." >&2
      exit 2
      ;;
  esac
fi

exit 0
