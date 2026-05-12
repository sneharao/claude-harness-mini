# 004 — Apply Fixes

## What This Is

A set of instructions you must adopt and execute. When told to read and execute this file, you become the Fixer Agent.

After a PR has been reviewed (`003_1_review_pr.md`) and the human has triaged the comments, your job is to address every comment that still requires a code change.

## Purpose

Walk the PR comments, classify each one (apply / skip), apply the fixes, verify locally, and bound the loop with an Impasse Protocol so the agent never burns through unbounded retries.

## Context You Have Access To

### Harness Context

Read `AGENTS.md` to orient. Consult `harness/knowledge/` files as each fix requires.

### Planning Artifacts

If a plan exists for this branch, it lives at:

- `harness/exec-plans/NNN-<jira-key>-short-desc/plan.md` — the approved coding plan.
- `harness/exec-plans/NNN-<jira-key>-short-desc/conversation-summaries.md` — key decisions and rationale (if recorded by the planning stage).

Find the directory by inspecting `harness/exec-plans/` on the current branch.

### PR Context

- The current PR diff — what has been implemented so far.
- **All PR comments** — from the four reviewer personas (QA, Code Quality, Security, Architecture Conformance) and from the human.
- **Human triage decisions** — which comments the human marked for fixing vs. dismissing.
- Previous conversation history from prior fix cycles (if this is a second+ pass).

## Execution Steps

### Step 1 — Verify You Are in an Edit-Capable Mode

Confirm that your current runtime mode supports writing files and running shell commands. If it does not, switch to one that does before proceeding.

### Step 2 — Read PR Comments

Use `harness/skills/accessing-systems/github.md` to fetch **all comments** on the current PR. These are your primary input — they carry the review findings and the human's triage decisions.

### Step 3 — Build a Fix List

Walk every PR comment and classify it:

- **Skip** comments already marked as resolved.
- **Skip** comments where the human explicitly said the issue does not need to be fixed (dismissed, deferred, rejected).
- **Include** everything else — these are the issues you must address.

Create a todo list of the included items. Each entry captures:

- The **URL of the PR comment** — primary reference. The comment itself carries the full fix context (file, line, persona, severity, issue description, suggested fix).
- A short summary of the issue (for at-a-glance tracking).
- A **round counter**, initialised to 0 for each new comment thread.

### Step 4 — Read Supporting Context

Before making changes, read the plan and any conversation summaries to understand the original intent. For each item on your fix list, make sure you understand:

- What was built and why (the plan).
- The reviewer's concern (the comment).
- Any human guidance on the fix direction.

### Step 5 — Apply Fixes

Work through the todo list item by item:

1. **Re-read the PR comment** at its URL to get the full fix context with zero information loss.
2. If the comment references code, patterns, or concepts you need more context on, read the relevant files or harness knowledge first.
3. Increment the round counter for this comment thread.
4. **If the round counter has reached 3** — do not make another attempt. Post an Impasse comment (see Impasse Protocol below) and move to the next item.
5. Make the code change that addresses the issue.
6. Ensure the fix does not introduce regressions or violate the plan's intent.
7. **If the fix required applying something you should have known from the harness** — log it before marking the item complete. Read `harness/skills/housekeeping/log-agent-correction.md`, write the entry, then return here.
8. Mark the item complete on your todo list before moving to the next.

### Step 6 — Verify Locally

Run all local checks per `harness/skills/testing/run-code-checks.md`:

- **Tests** — all tests pass.
- **Typecheck + lint + build** — zero errors.

If any check fails, diagnose and fix. Loop until all checks pass with zero failures.

### Step 7 — Push and Reply

Push the fix commit. Reply on each addressed comment thread referencing the commit SHA that resolves it. Leave Impasse threads open (see below).

## Impasse Protocol

An impasse occurs when:

- The fixer has made 3 attempts on a comment thread without the reviewer accepting the fix, OR
- The fixer genuinely disagrees with the review comment based on a harness rule.

**When an impasse occurs, do not push a fourth attempt.** Instead, post a comment on the thread structured as:

```
## Impasse — <thread title>

**What I did:** <Brief description of the fix attempt(s)>

**What the reviewer asked for:** <The reviewer's request, quoted or paraphrased>

**Why these conflict:** <Explain the tension — either N attempts without resolution, or the reviewer's request conflicts with a specific harness rule>

**Harness citation (if applicable):** <rule-name — harness/path/to/file.md>

**Recommended next step:** Human resolution required. Please either clarify the fix direction, override the reviewer comment, or confirm the harness rule should be updated.
```

Leave the thread open. Do not push further changes on this thread until a human responds.

## Done

Your work is complete when every item on the fix list is addressed (either fixed or in impasse), all local checks pass, and the fix commits are pushed.
