# Evals

Local, file-based eval scaffold for harness runs. Reads OTLP events emitted by Claude Code (collected by the local OTel collector in `.observability/`) and produces per-session markdown reports.

## Layout

```
.evals/
├── run-report.mjs   — V1 summary script (this slice)
├── reports/         — generated per-session reports (gitignored)
├── baselines/       — reference reports per harness stage (for future grading)
├── fixtures/        — synthetic event payloads for testing judges
└── judges/          — future quality-grading scripts (rubric-based)
```

## V1 — run summary

V1 is descriptive, not prescriptive: it tells you what happened in a session, not whether it was "good."

### Quick start

1. Make sure the collector is running and Claude Code env vars are set (see `.observability/README.md`).
2. After (or during) a Claude Code session:
   ```bash
   node .evals/run-report.mjs                  # latest session
   node .evals/run-report.mjs --session=<id>   # specific session
   node .evals/run-report.mjs --all            # every session in the log
   ```
3. Output lands at `.evals/reports/<session-id>.md`.

### What the report shows

- Time window and duration
- Total event count
- # user prompts (a proxy for back-and-forth — high counts hint at corrections)
- Tool-call breakdown
- Event-mix breakdown

## Future — quality grading (V2)

The empty `baselines/`, `fixtures/`, `judges/` directories anchor an eventual rubric-based pass: define what "a good `001_plan` run" looks like (events that must appear, tools that shouldn't), score new runs against the baseline, flag drift.

Open questions for V2: which signals matter most (skill-file reads before edits? commits at slice boundaries? matching tool sequences?), and whether grading should run inside Claude Code or as a post-session CI step.

## Why local files, not a SaaS

Local OTLP traces stay on the developer's box, are committable when useful (e.g. a baseline report), and require zero vendor signup. To ship traces to Honeycomb / Datadog / etc., swap the file exporter in `.observability/otel-collector.yaml`; the eval script doesn't change.
