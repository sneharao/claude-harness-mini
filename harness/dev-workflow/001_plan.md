# 001 — Plan

## What This Is

A set of instructions you must adopt and execute. When told to read and execute this file, you become the Planning Agent. Follow the steps in order.

## Purpose

Collaborate with the human to produce a complete, unambiguous coding plan that a downstream Coding Agent can execute without further clarification.

## Context

- `AGENTS.md` — harness entry point, project conventions
- Task definition — chat message, ticket file, or spec
- Design artifacts (Figma, sketches, written spec) if any
- Library docs via Context7 MCP or web search
- `harness/skills/personas/README.md` — expert advisory personas. Consult its Phase Map and Pairing Matrix to pick which to invoke; use `persona-panel.md` when a decision benefits from structured dissent.

## Steps

### Step 1 — Verify read-only mode

This skill needs iterative read-only collaboration. If you are in an edit-capable mode, switch to read-only before proceeding.

### Step 2 — Understand the task

Ask the human for a clear task definition. If designs or context you'd need are missing, ask for them. Do not proceed until the task is clear.

### Step 3 — Study the task definition

Extract scope, acceptance criteria, linked artifacts, priority, constraints. Follow every reference.

### Step 4 — Deep-dive the codebase

Use `AGENTS.md` to find existing patterns, code standards in `harness/knowledge/code-standards/`, and dependency rules in `harness/knowledge/repo-architecture/`.

⚠️ **Beware "satisfaction of search."** Do not stop at the first relevant file. Ask: *"What else might this affect that I haven't looked at yet?"*

### Step 5 — Collaborative planning

Interactive session with the human. Surface ambiguities, present trade-offs with pros/cons, agree on test strategy and risks. Iterate until aligned.

### Step 6 — Draft the plan

The plan must specify:
- Files created or modified.
- Implementation approach (patterns, libraries, decisions).
- Mapping of acceptance criteria to tests.
- Risks, trade-offs, and resolved decisions.

### Step 7 — Self-critique

Read and execute `harness/skills/planning/critique-coding-plan.md` against your draft. Present the plan **and** the critique to the human; let the human decide which points to accept.

### Step 8 — Finalise

Apply accepted critique. Create `harness/exec-plans/NNN-short-desc/` (next available `NNN`; see `harness/exec-plans/README.md`). Write:

- `plan.md` — the finalised coding plan.
- `conversation-summary.md` — key decisions, tradeoffs, rationale.

Ask the human for explicit approval. Iterate if requested.

### Step 9 — Branch and commit

After approval:

1. Create a feature branch (default: `<type>/<short-desc>`, e.g. `feat/login-screen`).
2. Commit the plan files.
3. Push to origin if a remote is configured.

Opening a draft PR is optional in the solo template.

## Done

The plan is committed to a feature branch and the human has approved it.
