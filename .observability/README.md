# Observability

OpenTelemetry tracing for Claude Code (and any OTLP-compatible coding agent). Local-first: metrics, logs, and traces land in JSON-line files under `.observability/traces/`, which Slice 6's eval scaffold reads to grade harness runs.

## What's traced

- **Metrics** — token usage, tool-call counts, latency, errors. *Stable.*
- **Logs** — events (skill loaded, tool invoked, response received). *Stable.*
- **Traces** — distributed spans for a full session. *Beta — requires `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1`.*

By default, prompt content and tool I/O are **redacted**. Opt-in to capture more — see § Privacy below.

## Quick start

1. **Start the collector:**

   ```bash
   cd .observability
   docker compose up -d
   ```

   This runs `otel/opentelemetry-collector-contrib` listening on `localhost:4317` (gRPC) and `localhost:4318` (HTTP). Traces land in `.observability/traces/{metrics,logs,traces}.jsonl`.

2. **Load the env:**

   ```bash
   cp .env.example .env
   set -a; source .env; set +a
   ```

   Or paste the values into `.claude/settings.local.json` under an `"env"` block:

   ```json
   {
     "env": {
       "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
       "OTEL_METRICS_EXPORTER": "otlp",
       "OTEL_LOGS_EXPORTER": "otlp",
       "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317"
     }
   }
   ```

3. **Verify:**

   ```bash
   docker compose logs -f otel-collector | head -20      # collector banner + first batches
   tail -f .observability/traces/logs.jsonl              # events as they arrive
   ```

   Run any Claude Code session — token-usage metrics and event logs should appear within a few seconds.

## Configuration

The collector config (`otel-collector.yaml`) receives OTLP → batches → exports to file + a `debug` exporter (stdout, useful during setup).

### Swap for a managed backend

To send traces to a managed OTLP backend (Honeycomb, Grafana Cloud, Axiom, Datadog), add an exporter and reference it in each pipeline. Example for Honeycomb:

```yaml
exporters:
  otlphttp/honeycomb:
    endpoint: https://api.honeycomb.io
    headers:
      x-honeycomb-team: ${env:HONEYCOMB_API_KEY}

service:
  pipelines:
    metrics:
      exporters: [file/metrics, otlphttp/honeycomb, debug]
```

Set `HONEYCOMB_API_KEY` in the collector's env (via `docker-compose.yml`'s `environment:` block, *not* the harness's `.env`).

## Privacy

Content capture is **opt-in**. Default behaviour: prompts, tool args, and API bodies are redacted before they leave Claude Code.

| Flag | Captures | Use when |
|------|----------|----------|
| `OTEL_LOG_USER_PROMPTS=1` | User message text | Grading plan/build outputs against the request |
| `OTEL_LOG_TOOL_DETAILS=1` | Tool names, skill names | Verifying the agent invoked the right skill |
| `OTEL_LOG_TOOL_CONTENT=1` | Tool input/output bodies (60 KB cap) | Inspecting what files were read/written |
| `OTEL_LOG_RAW_API_BODIES=1` | Full request/response JSON | Deep debugging only |

Only enable on your own development machine. `.gitignore` already excludes `.env` and `.observability/traces/` so captured content never ships.

## How evals consume this

`.evals/` (Slice 6) reads `.observability/traces/*.jsonl` to grade harness runs. Each Plan / Build / Review session writes its trace ID into the exec-plan's `conversation-summaries.md`, so a graded result can be correlated back to its plan.

## Docs

- Claude Code telemetry: https://code.claude.com/docs/en/monitoring-usage.md
- OpenTelemetry Collector: https://opentelemetry.io/docs/collector/
- Collector Contrib distribution: https://github.com/open-telemetry/opentelemetry-collector-contrib
