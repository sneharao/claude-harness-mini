# claude-harness-mini

A solo-developer **coding harness** for Claude Code (and any other AGENTS.md-aware AI assistant). Drop it onto a new or existing project and the agent gets a structured Plan → Build → Local-Review workflow, a skill library it must consult, and built-in observability + evals — so the AI's quality stays honest as the project grows.

The "mini" name is deliberate: this is the lean, solo-grade variant. An enterprise variant (cloud review, multi-agent fan-out, scheduled Dreams, housekeeping) is a separate template.

---

## What's inside

```
.
├── AGENTS.md                — canonical entry point read by every AI assistant
├── CLAUDE.md                — Claude Code shim that @-imports AGENTS.md
├── .claude/                 — slash commands, hooks, settings.json
├── .evals/                  — OTLP-log summarizer + dirs reserved for future quality grading
├── .observability/          — local OTel collector (Docker) writing JSONL traces
└── harness/
    ├── dev-workflow/        — Plan, Build, Local Review stage files
    ├── exec-plans/          — per-feature plans live here on the branch
    ├── knowledge/           — code-standards, repo-architecture (the what & why)
    └── skills/              — TDD, commit, run-app, add-ui-component, init-harness, ...
```

---

## Use this template — three paths

### A. New project on GitHub (recommended)

```bash
gh repo create <your-username>/<my-app> \
  --public \
  --template sneharao/claude-harness-mini \
  --clone

cd <my-app>
claude
```

In Claude: `/harness/000-design` → interactive design phase (problem statement, entities, ubiquitous language, architecture shape, stack persona) → you're ready.

### B. Local-only project (no GitHub yet)

```bash
npx degit sneharao/claude-harness-mini my-app
cd my-app
git init -b main
claude
```

Run `/harness/000-design` the same way.

### C. Graft onto an existing project

```bash
cd ~/path/to/existing-project
rsync -a --ignore-existing \
  ~/Downloads/projects/claude-harness-mini/ \
  ./
claude
```

Run `/harness/init-harness` — it audits the existing code, seeds domain files from what's there, and surfaces drift against the harness conventions.

---

## Quick start (after init)

| Goal | Slash command |
|---|---|
| Design a fresh project (no source code yet) | `/harness/000-design` |
| Graft the harness onto an existing project | `/harness/init-harness` |
| Plan a feature | `/harness/001-plan` |
| Build the planned feature | `/harness/002-build` |
| 4-persona review of uncommitted changes | `/harness/003-review-local` |
| 4-persona review of the pushed branch | `/harness/003-review-pr` |
| Format and create a commit | `/develop/commit-changes` |
| Run typecheck + build + tests | `/develop/run-checks` |

---

## What runs automatically (SessionStart hook)

`.claude/hooks/session-start.sh` fires once each time you open Claude Code in this repo. It solves two recurring annoyances:

1. **Silent observability gaps.** If the OTel collector isn't running, telemetry vanishes and `.evals/run-report.mjs` produces empty reports. The hook starts the collector if Docker is available and the container isn't already up.
2. **Cold-start context.** Every fresh session, the agent has no clue which branch you're on or what's dirty. The hook prints a one-screen orientation (branch, last commit, dirty count, active exec-plan) so the agent skips a flurry of `git status` tool calls.

Best-effort only — missing Docker, missing git, etc. degrade to a warning and continue. Registered in `.claude/settings.json`; disable by removing the `SessionStart` entry.

---

## Why a harness?

Without one, every AI session reinvents conventions, re-litigates decisions, and silently drifts away from the project's actual standards. A harness gives the agent:

- **Roles** (dev-workflow files) — what to do at each stage and when to stop
- **Truth** (knowledge files) — the project's standards and architecture, read on demand
- **Technique** (skill files) — concrete playbooks for specific tasks (TDD, commit message format, etc.)
- **Memory** (exec-plans + auto-memory) — decisions survive across sessions

---

## Versioning

`v0.1.0` is the first publishable cut. Use the template, file issues for what hurt, iterate. `v1.0.0` ships only after three real projects have used `v0.x` and the lessons are folded in.

---

## License

MIT — see `LICENSE`.
