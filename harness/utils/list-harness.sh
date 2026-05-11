#!/usr/bin/env bash
# List the contents of one or more top-level harness areas.
#
# Usage:
#   harness/utils/list-harness.sh                        # all agent-facing areas
#   harness/utils/list-harness.sh knowledge skills       # only the named areas
#
# Agents: run this before acting on a task to discover which knowledge
# or skill files exist before deciding which ones to read.

set -euo pipefail

DEFAULT_AREAS=(dev-workflow knowledge skills exec-plans housekeeping)

if [[ $# -gt 0 ]]; then
  areas=("$@")
else
  areas=("${DEFAULT_AREAS[@]}")
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for area in "${areas[@]}"; do
  target="$repo_root/harness/$area"
  if [[ ! -d "$target" ]]; then
    echo "No such harness area: $area" >&2
    continue
  fi
  ( cd "$repo_root" && find "harness/$area" -maxdepth 6 -print ) \
    | sort \
    | sed -e 's/[^\/]*\//│   /g' -e 's/│   \([^│]\)/├── \1/'
done
