# {{PROJECT_NAME}}

{{PROJECT_TAGLINE}}

> This file is the canonical entry point for **any AI coding assistant** working in this repo — Claude Code, Cursor, Cline, Aider, Continue, GitHub Copilot Chat. Whatever tool you use, this is where you start. `CLAUDE.md` simply imports this file via `@AGENTS.md`.

---

## Coding Agent Harness

This project uses a structured **coding harness** under `harness/`. The harness is not documentation you skim — it is a **pipeline of agent roles** you adopt by reading the matching file, plus a library of skills and knowledge those roles pull in on demand.

**This is not optional.** Code produced outside the harness drifts from the project's conventions, accumulates silent debt, and is harder to review.

### Harness Manifesto

The harness treats the model as a code-generation backend in a compiler pipeline. Knowledge files are optimisation passes, skills are required compiler stages, linters and tests are verification passes. Read the relevant knowledge or skill file **at the point of use**, not all up-front.

### Harness Structure

```
harness/
├── dev-workflow/        — Stages the harness guides you through (Plan, Build, Review, Apply Fixes, Housekeeping)
├── exec-plans/          — Per-feature plan + decisions, lives on the branch (archived under _archive/ post-merge)
├── housekeeping/        — Long-lived ledgers: technical debt + agent corrections log
├── knowledge/           — What the system is, why it is built this way (read on demand)
│   ├── code-standards/                 — Naming, error handling, language idioms
│   └── repo-architecture/              — Structure, dependency rules, conventions
└── skills/              — How-to playbooks: read BEFORE performing the task
    ├── development/                    — Writing code (TDD, add-*, commit, run-app)
    ├── testing/                        — Running checks
    ├── planning/                       — Plan critique
    ├── housekeeping/                   — Logging corrections, harness-improvement reviews
    ├── accessing-systems/              — How to reach external systems (GitHub, etc.)
    ├── init/                           — One-time project bootstrap (stack personas)
    └── personas/                       — Expert advisory personas + persona-panel meta-skill (see personas/README.md)
```

### How to Use

- **`knowledge/`** — the *what* and *why*. Consult proactively whenever a task touches architecture, conventions, or domain concepts.
- **`skills/`** — mandatory step-by-step playbooks. Read the matching skill **before** performing the task, not after.
- **`dev-workflow/`** — the stages the harness guides work through. Skim at session start to know which stage you are in.
- **`exec-plans/`** — per-feature plans live here, committed to the branch so downstream agents have full context.

### Harness Check (do this BEFORE any non-readonly action)

For every user request:

1. Identify what the task touches (an action, a convention, a workflow stage, etc.).
2. Discover what the harness already says about it:

   ```bash
   harness/utils/list-harness.sh                    # all areas
   harness/utils/list-harness.sh knowledge skills    # narrow by area
   ```

3. Read every matching file in full and follow it.

Skip only when, after checking, the harness has nothing relevant. The harness takes precedence over your defaults.

> **Context guard:** two unrelated kinds of "persona" live in this harness, do not conflate them. `skills/init/persona-*.md` are **stack personas** (React+Vite, etc.) — large files, used once during `/harness/000-design` or `/harness/init-harness` to scaffold the project; do not read on routine plan/build/review tasks. `skills/personas/*.md` are **expert advisory personas** — smaller files, consulted on demand during design/planning/review; see their `README.md` for the Phase Map.

---

## Workflow at a glance

| Stage | File | When |
|---|---|---|
| **Design (fresh project, once)** | `harness/dev-workflow/000_design.md` | First run on a new project — produces domain knowledge files + stack bootstrap |
| **Init (existing project, once)** | `harness/skills/init/init-harness.md` | When grafting the harness onto a codebase that already has source |
| **① Plan** | `harness/dev-workflow/001_plan.md` | Start of every feature — produces an exec-plan |
| **② Build** | `harness/dev-workflow/002_build.md` | After the plan is approved |
| **③ Review (local)** | `harness/dev-workflow/003_2_review_local.md` | Before pushing — 4-persona review of `git diff HEAD` |
| **③ Review (PR)** | `harness/dev-workflow/003_1_review_pr.md` | After pushing — 4-persona review of `git diff main...HEAD` |
| **④ Apply Fixes** | `harness/dev-workflow/004_apply_fixes.md` | After the human triages PR comments — apply, verify, push (Impasse Protocol bounds the loop) |
| **⑤ Housekeeping** | `harness/dev-workflow/005_housekeeping.md` | After merge — capture deferred findings, archive exec-plan, sync debt file |

Multi-agent fan-out (running personas in separate isolated runtimes) and cloud reviewers live in larger variants. This template ships the full feature lifecycle — including the loop-closing stages — so deferred findings never silently vanish.

---

## Observability

Agent calls are traced via OpenTelemetry to a local collector that writes JSONL files under `.observability/traces/`. See `.observability/README.md` for setup. The SessionStart hook starts the collector automatically if Docker is available.

## Evals

`.evals/` holds a run-summary script. Run `node .evals/run-report.mjs` after a session to get a per-session report from the OTLP traces (duration, tool-call breakdown, event mix).

## Memory

`SessionStart` hook loads project memory from `~/.claude/projects/<slug>/memory/MEMORY.md` if present. See `.claude/hooks/session-start.sh`.
