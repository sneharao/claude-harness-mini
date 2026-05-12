#!/usr/bin/env bash
# PreToolUse telemetry hook — emits a custom OTLP log record for every
# matched tool call, capturing tool_name + file_path (Read/Write/Edit/Grep/
# Glob) or command (Bash). This unlocks "did the agent Read skill X before
# doing Y" conformance checks in .evals/judges/conformance.mjs — Claude
# Code's built-in tool_decision events redact tool arguments, so we backfill.
#
# Fire-and-forget: curl is detached with `&` and bounded by --max-time so
# tool latency is unchanged even if the collector is down. Never blocks.
#
# Disabled when CLAUDE_CODE_ENABLE_TELEMETRY is unset — same gate the
# session-start hook uses.

set -u

if [ -z "${CLAUDE_CODE_ENABLE_TELEMETRY:-}" ]; then
  exit 0
fi

if ! command -v node >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  exit 0
fi

OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_LOGS_ENDPOINT:-http://localhost:4318/v1/logs}"

# Parse the hook payload (stdin JSON) into shell vars via node. We only emit
# fields that exist for the given tool — file_path for Read/Write/Edit/Grep/Glob,
# command for Bash, pattern for Grep/Glob.
read -r SESSION_ID TOOL_NAME FILE_PATH COMMAND PATTERN < <(
  cat | node -e "
    let s='';
    process.stdin.on('data', d => s += d);
    process.stdin.on('end', () => {
      try {
        const j = JSON.parse(s);
        const sid = j.session_id || '';
        const tn  = j.tool_name || '';
        const ti  = j.tool_input || {};
        const out = [
          sid,
          tn,
          (ti.file_path || '').replace(/[\\s]/g, ''),
          (ti.command   || '').replace(/[\\s]/g, ' ').slice(0, 500),
          (ti.pattern   || '').replace(/[\\s]/g, ''),
        ];
        // tab-separated so the shell read -r splits cleanly; no embedded tabs in fields.
        process.stdout.write(out.map(s => String(s).replace(/\t/g, ' ')).join('\t'));
      } catch { process.stdout.write('\t\t\t\t'); }
    });
  "
)

# Nothing to log if we didn't get a session id or tool name.
if [ -z "$SESSION_ID" ] || [ -z "$TOOL_NAME" ]; then
  exit 0
fi

NOW_NS="$(node -e 'process.stdout.write(String(Date.now() * 1000000))')"

# Build attributes array. file_path / command / pattern only when present.
ATTRS="[{\"key\":\"event.name\",\"value\":{\"stringValue\":\"harness_tool_input\"}}"
ATTRS+=",{\"key\":\"session.id\",\"value\":{\"stringValue\":\"$SESSION_ID\"}}"
ATTRS+=",{\"key\":\"tool_name\",\"value\":{\"stringValue\":\"$TOOL_NAME\"}}"
[ -n "$FILE_PATH" ] && ATTRS+=",{\"key\":\"file_path\",\"value\":{\"stringValue\":\"$FILE_PATH\"}}"
[ -n "$COMMAND" ]   && ATTRS+=",{\"key\":\"command\",\"value\":{\"stringValue\":\"$(printf '%s' "$COMMAND" | sed 's/"/\\"/g')\"}}"
[ -n "$PATTERN" ]   && ATTRS+=",{\"key\":\"pattern\",\"value\":{\"stringValue\":\"$PATTERN\"}}"
ATTRS+="]"

PAYLOAD="{\"resourceLogs\":[{\"resource\":{\"attributes\":[{\"key\":\"service.name\",\"value\":{\"stringValue\":\"harness-hook\"}}]},\"scopeLogs\":[{\"scope\":{\"name\":\"harness.tool_input\"},\"logRecords\":[{\"timeUnixNano\":\"$NOW_NS\",\"attributes\":$ATTRS}]}]}]}"

# Detached, bounded; collector unreachable = silent no-op.
( curl --silent --max-time 0.5 -X POST "$OTLP_ENDPOINT" \
       -H 'Content-Type: application/json' \
       -d "$PAYLOAD" >/dev/null 2>&1 ) &

exit 0
