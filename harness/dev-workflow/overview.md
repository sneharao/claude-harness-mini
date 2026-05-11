# Agent Harness — Overview

> **Type:** Context · **Audience:** All agents

This document is **orientation context**, not an executable skill. Your specific instructions for the current stage are in `001_plan`, `002_build`, `003_1_review_pr`, or `003_2_review_local`.

---

## Stages

| Stage | Skill File |
|-------|------------|
| Plan | `001_plan.md` |
| Build | `002_build.md` |
| Review (PR) | `003_1_review_pr.md` |
| Review (local) | `003_2_review_local.md` |

- **Plan** — Planning Agent + Human, read-only.
- **Build** — Coding Agent, edits + shell.
- **Review (PR)** — Reviewer Agent runs 4 personas against a pushed branch (`git diff main...HEAD`).
- **Review (local)** — Reviewer Agent runs the same 4 personas against `git diff HEAD` before pushing.

Every stage runs locally in this mini template. The **enterprise** variant adds cloud reviewers, multi-agent fan-out, apply-fixes, and housekeeping.

The two review modes share personas (QA, Code Quality, Security, Architecture) and the Evidence Rule. Use **local** mid-iteration for a tight loop; use **PR** once code is pushed for a fresh-context pass before merge.

---

## Flow

```mermaid
flowchart LR
    H1([Human]) -->|trigger| P[001 Plan]
    P -->|plan committed| H2{{Approve plan}}
    H2 -->|trigger build| B[002 Build]
    B -->|"implement → verify → fix"| H3{{Approve diff}}
    H3 -->|before push| RL[003.2 Local]
    H3 -->|after push| RPR[003.1 PR]
    RL --> F[Findings P0-P3]
    RPR --> F
    F -->|fixes needed| B
    F -->|approved| M([Merge to main])
```

---

## Key Concepts

- **Skills define behaviour.** Each agent adopts a skill that specifies what to do, what context it needs, and what outputs it produces.
- **`AGENTS.md` is the entry point.** All agents start there.
- **Artifacts travel on the branch.** The plan lives under `harness/exec-plans/NNN-short-desc/`, committed to the branch.
- **Loops are bounded.** Build runs until checks pass. Review terminates when the human approves the findings.
