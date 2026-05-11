#!/usr/bin/env bash
# SessionStart hook — runs once when Claude Code opens a session in this repo.
#
# Solves two problems:
#   1. Silent observability gaps. Without the OTel collector running, Claude
#      Code emits telemetry into the void and .evals/run-report.mjs produces
#      empty reports. This hook starts the collector if Docker is available
#      and the container isn't already up — so traces are captured by default.
#   2. Cold-start context. Every fresh session, the agent has no idea which
#      branch you're on, what's dirty, or whether there's an in-flight plan.
#      This hook prints a one-screen orientation so the agent can act without
#      a flurry of `git status` / `ls` tool calls.
#
# Best-effort only — never blocks the session. Missing Docker, missing git,
# uninitialised repo: all degrade to a warning and continue.

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 0

# 1. OTel collector — start it if compose file is present and container is down.
if [ -f .observability/docker-compose.yml ]; then
  if command -v docker >/dev/null 2>&1; then
    running="$(docker ps --filter name=harness-otel-collector --format '{{.Names}}' 2>/dev/null)"
    if [ -z "$running" ]; then
      if (cd .observability && docker compose up -d >/dev/null 2>&1); then
        echo "[harness] started otel-collector"
      else
        echo "[harness] could not start otel-collector — run \`cd .observability && docker compose up -d\` manually"
      fi
    fi
  else
    echo "[harness] docker not on PATH — telemetry disabled until you start the collector"
  fi
fi

# 2. Telemetry env sanity check (warn-only).
if [ -z "${CLAUDE_CODE_ENABLE_TELEMETRY:-}" ]; then
  echo "[harness] CLAUDE_CODE_ENABLE_TELEMETRY not set — see .observability/README.md to wire env"
fi

# 3. Orientation: branch, last commit, dirty count, active exec-plan.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
last="$(git log -1 --oneline 2>/dev/null)"
dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"

[ -n "$branch" ] && echo "[harness] branch: $branch"
[ -n "$last" ]   && echo "[harness] last commit: $last"
[ -n "$dirty" ] && [ "$dirty" != "0" ] && echo "[harness] dirty files: $dirty"

if [ -d harness/exec-plans ]; then
  active="$(find harness/exec-plans -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -1)"
  [ -n "$active" ] && echo "[harness] active plan: $active"
fi

exit 0
