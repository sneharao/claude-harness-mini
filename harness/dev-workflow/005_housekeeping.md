# 005 — Housekeeping

## What This Is

A set of instructions you must adopt and execute. When triggered after a PR is merged, you become the Housekeeping Agent.

## Purpose

Sweep up every reviewer comment that was dismissed or deferred during triage and convert it into a trackable backlog item, archive the exec-plan, sync the debt file, and promote any correction patterns from the agent corrections log.

The aim is simple: **deferred findings must never silently disappear into chat scrollback or PR history.**

## Context You Have Access To

### Harness Context

`AGENTS.md` is the entry point. From there, consult harness knowledge and skills as needed.

### Plan Artifacts

- `harness/exec-plans/NNN-<jira-key>-short-desc/plan.md` — for context on what was built and why.

### PR Context

- The merged PR — full diff and all comments.
- All four reviewer personas' comments (QA, Code Quality, Security, Architecture Conformance) with their severity tags (P0–P3).
- The human's triage decisions — what was addressed, what was dismissed, what was deferred.

## Execution Steps

### Step 1 — Scan All PR Comments

Use `harness/skills/accessing-systems/github.md` to fetch all comments on the merged PR. Identify every reviewer comment that was:

- Explicitly dismissed by the human.
- Marked as deferred / "will address later".
- Left unresolved without a corresponding code change.

### Step 2 — Build Backlog Entries

For each deferred or dismissed item, prepare a backlog entry with:

- A clear title describing the issue.
- The original reviewer comment (persona, severity, file/line reference).
- A link back to the PR comment for traceability.
- The severity tag from the original review (P0–P3).
- Any human context on why it was deferred (if provided).

### Step 3 — Write the Housekeeping Audit

Create `housekeeping_audit.md` inside the matching `harness/exec-plans/NNN-<jira-key>-short-desc/` directory for the merged branch. Format the backlog entries from Step 2 as a readable audit log:

```markdown
# Housekeeping Audit — NNN-<jira-key>-short-desc

## Deferred findings

### <Title>

- **Persona:** <QA | Code Quality | Security | Architecture Conformance>
- **Severity:** <P0 | P1 | P2 | P3>
- **File:** `<path>:<line>`
- **PR comment:** <URL>
- **Reviewer concern:** <quoted or summarised>
- **Human triage note:** <why deferred / dismissed>

## Dismissed findings

<same shape, separate section>
```

### Step 4 — Archive the Exec-Plan

Move the exec-plan directory into the archive:

```bash
git mv harness/exec-plans/NNN-<jira-key>-short-desc \
       harness/exec-plans/_archive/NNN-<jira-key>-short-desc
```

Commit the move with a `chore:` message. The archive preserves history while keeping the active `exec-plans/` directory uncluttered.

### Step 5 — Sync the Debt File

If the merged PR's work touched any entry in `harness/housekeeping/debt.md`:

- Update the matching entry's `last surveyed` date to today.
- Update the tier (`widespread` / `scattered` / `isolated`) if the work changed the scope of the debt.
- If the debt entry was fully resolved by this PR, mark it as resolved and move it under a `## Resolved` section.

Do not add new debt entries here. New findings go into the housekeeping audit from Step 3 (or your team's backlog tracker — e.g. Jira, Linear, GitHub Issues).

### Step 6 — Promote Correction Patterns

Read `harness/housekeeping/agent-corrections.md` and look for `status: open` entries related to the work in this PR.

- If any open entry describes a pattern you have now seen again in this PR's review cycle, that is a signal worth noting. Read `harness/skills/housekeeping/harness-improvement-review.md` to assess whether a harness change is warranted.
- If no open entries are relevant, skip this step.

### Step 7 — Open the Housekeeping PR

1. Create a new branch (e.g. `chore/housekeeping-NNN-<jira-key>-short-desc`).
2. Commit the housekeeping audit, the archived exec-plan, and any debt-file updates.
3. Push the branch and open a PR to `main` with:
   - A title like `Housekeeping — NNN-<jira-key>-short-desc`.
   - The label `housekeeping`.

## Done

Your work is complete when the housekeeping audit PR is open with the audit file committed, the exec-plan is archived, and the debt file is current. This is the final stage of the feature lifecycle — no further agent action is triggered. The audit enters the team's normal review and prioritisation process.
