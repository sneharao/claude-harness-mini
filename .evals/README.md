# Evals

Local, file-based eval scaffold for harness runs. Reads OTLP events emitted by Claude Code (collected by the local OTel collector in `.observability/`) and produces per-session markdown reports.

## Layout

```
.evals/
├── run-report.mjs       — descriptive summary script (what happened)
├── judges/
│   └── conformance.mjs  — six-parameter harness-control score (what was followed)
└── reports/             — generated per-session reports (gitignored)
```

## Run summary — descriptive

Tells you what happened in a session, not whether it was "good."

```bash
node .evals/run-report.mjs                  # latest session
node .evals/run-report.mjs --session=<id>   # specific session
node .evals/run-report.mjs --all            # every session
```

Shows: time window, total events, user prompts, tool-call breakdown, event-mix breakdown.

## Conformance judge — prescriptive

Quantifies how much the harness controlled the agent's behaviour during a session.

```bash
node .evals/judges/conformance.mjs                   # latest session
node .evals/judges/conformance.mjs --session=<id>    # specific session
node .evals/judges/conformance.mjs --all             # every session
node .evals/judges/conformance.mjs --logs=<path>     # custom log file
```

Writes `.evals/reports/conformance-<session-id>.md` with a composite Harness Control % built from six parameters:

| # | Parameter | What it measures | Default weight |
|---|---|---|---|
| 1 | Skill-Read-Before-Action coverage | Did the agent Read the required skill file before performing the action it governs? (commit → `commit-changes.md`, checks → `run-code-checks.md`, test file → `tdd-based-development.md`, UI component → `add-ui-component.md`) | 30% |
| 2 | Stage trajectory | Was any `/harness:*` slash command invoked? | 15% |
| 3 | Correction rate (inverted) | Non-slash `user_prompt` count vs total prompts — how often the user had to steer | 15% |
| 4 | Harness-topic correction rate (inverted) | Corrections whose text matches keywords for harness-covered topics (TDD, test, run, verify, browser, lint, commit, review) — the **most direct** signal of "harness instructed, agent skipped" | 25% |
| 5 | Tool error rate (inverted) | Failed `tool_result` events + `internal_error` events vs total tool calls | 10% |
| 6 | Hook engagement | Did `hook_execution_start` events fire at all? Sanity check that the harness scaffolding is installed | 5% |

Weights are documented in `judges/conformance.mjs` — edit `WEIGHTS` to re-balance.

`N/A` for any parameter means the trigger never fired this session (e.g. no corrections → no harness-topic-correction score). The composite re-normalises across whatever parameters did produce a score.

### Required for parameter #1: extended tool-input hook

Claude Code's built-in `tool_decision` / `tool_result` events redact tool arguments — no `file_path`, no `command`. To compute "did the agent Read X before Y", the harness ships `.claude/hooks/log-tool-input.sh`, which emits a custom `harness_tool_input` OTLP record on every Read/Write/Edit/Bash/Grep/Glob. The collector picks it up alongside Claude Code's own events.

The hook is wired up in `.claude/settings.json`. It runs only when `CLAUDE_CODE_ENABLE_TELEMETRY` is set and is bounded to 500ms fire-and-forget — tool latency is unchanged even if the collector is down.

Sessions captured before the hook was wired up will report Skill-Read-Before-Action as N/A; the composite re-normalises across the remaining five parameters.

## Why local files, not a SaaS

Local OTLP traces stay on the developer's box, are committable when useful (e.g. a baseline report), and require zero vendor signup. To ship traces to Honeycomb / Datadog / etc., swap the file exporter in `.observability/otel-collector.yaml`; the eval scripts do not change.
