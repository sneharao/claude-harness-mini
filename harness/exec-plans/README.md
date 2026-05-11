# Exec-Plans

Per-feature execution plans live here, on the working branch. They are the artifact produced by `001_plan.md` and consumed by `002_build.md`.

## Directory Naming

```
NNN-short-desc/
```

- `NNN` — zero-padded 3-digit sequential number (`001`, `002`, …, `042`)
- `short-desc` — kebab-case, 2–5 words describing the feature
- Examples: `001-login-screen/`, `017-cart-export-csv/`, `042-refactor-currency-helpers/`

## Files Inside Each Plan

| File | Purpose |
|------|---------|
| `plan.md` | The finalised coding plan — what to build, file-by-file approach, mapping of acceptance criteria to tests, risks. |
| `conversation-summary.md` | Key decisions, tradeoffs, and rationale from the planning session. Gives the Coding Agent (or a future you) enough context to act without re-litigating choices. |

Optional, depending on the plan:

- `adr-NNN.md` — Architecture Decision Record(s) for choices the plan locks in.
- `screenshots/`, `mocks/` — design references.

## Picking the Next NNN

Inspect existing directories (including `_archive/` if present) and pick `max(NNN) + 1`. If two planners on different branches race to the same `NNN`, the second to merge bumps. The number is a *sortable identifier*, not a permanent contract — collisions are rare and easy to fix.

## Archiving Old Plans

When a feature is fully shipped and no longer relevant to active work, move its directory into `_archive/` to keep the top level focused on recent and in-flight work:

```
harness/exec-plans/
├── 042-cart-export-csv/      ← in-flight
├── 041-login-screen/         ← recently shipped
├── _archive/
│   ├── 001-initial-setup/
│   └── 002-...
└── README.md
```

`_archive/` is just for visual hygiene — it does not change `NNN` semantics. Numbers stay unique across `_archive/` and the top level.

## Why Plans Live on the Branch

Plans are committed alongside the code they describe so that:

- Downstream agents (the Coding Agent, Reviewer Agent) have full context without scrolling back through chat history.
- The diff a reviewer sees on the PR shows *intent* (plan) and *implementation* (code) together.
- Reverting a feature reverts its plan too — no orphaned plans pointing at deleted code.

## Anti-patterns

- **Editing the plan after the build starts.** If the implementation diverges from the plan, write a new ADR or a `conversation-summary.md` addendum explaining why. The plan is a snapshot of intent at approval time.
- **Skipping the plan for "small" changes.** If the change is small enough that a plan feels heavy, write a one-paragraph `plan.md`. Don't skip it — the habit is the point.
- **Mixing two features in one `NNN-` directory.** Split into separate plans, separate branches.
