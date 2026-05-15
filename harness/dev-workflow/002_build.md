# 002 — Build

## What This Is

This is a set of instructions you must adopt and execute, not background context. When you are told to read and execute this file, you become the Coding Agent. Follow the execution steps below in order.

## Purpose

Implement the coding plan that was produced in the planning stage, verify your work against all local checks, and push clean, passing code to the branch.

## Context You Have Access To

### Coding Agent Harness and Internal Context

Read `AGENTS.md` to understand the context and guidance provided by the harness.

### Planning Artifacts

The execution plan created by the planning agent must be used, as found at:

- `harness/exec-plans/NNN-short-desc/plan.md` — the approved coding plan. This is your primary instruction set.
- `harness/exec-plans/NNN-short-desc/conversation-summary.md` — key decisions and rationale from planning. Use this to understand intent and trade-offs.

Identify the correct directory by inspecting `harness/exec-plans/` on the current branch.

## Execution Steps

Follow these steps in order.

### Step 1 — Verify Edit-Capable Mode

Confirm that your current runtime supports writing files and running shell commands. If it does not, switch to one that does before proceeding.

### Step 2 — Read the Plan

Read the plan and conversation summary fully before writing any code. If anything in the plan is ambiguous, check the summary for clarification.

If your work crosses into a code category not covered by the current skill (e.g. you start adding API logic while implementing a component), stop and consult the matching skill in `harness/skills/development/` before continuing.

### Step 3 — Implement → Verify → Fix Loop

Execute the following loop until all checks pass:

#### 3a. Implement

Implement the functionality laid out in the plan. Follow the implementation approach, file structure, and patterns specified. Respect all guidance from the harness, pulling actively from `harness/skills/` and `harness/knowledge/` as needed.

Use TDD per `harness/skills/development/tdd-based-development.md` for new feature development.

#### 3b. Verify Functionality

Verify that what you built actually works and meets the success criteria in the plan:

- Cross-reference your implementation against the plan's acceptance criteria — does every criterion pass?
- Use available tools (browser via `run-app-in-browser.md`, API client, etc.) to manually exercise the feature end-to-end.
- Check edge cases and error paths called out in the plan.

#### 3c. Conformance Self-Review

Before running automated checks, perform a manual conformance pass over every file you changed. The linter alone cannot catch these.

For each area below, **read the referenced harness file now** and derive the applicable checks from it against your diff. Do not rely on memory.

**Dependency rules** — read `harness/knowledge/repo-architecture/dependency-rules.md`. For every rule, determine whether this diff touches it and verify accordingly.

**Code standards** — read `harness/knowledge/code-standards/_index.md` and follow its pointers to whichever sub-files (naming conventions, error handling, etc.) are relevant to what you changed. Verify each applicable rule.

**Citation requirement:** For every conformance item that applies to your diff, add a one-line citation under a `## Conformance` heading in the commit body or PR body:

```
- <rule-name> — harness/knowledge/path/to/file.md
```

If a rule does not apply, do not cite it. If you verify a rule and it passes, still cite it so the reviewer knows it was checked.

#### 3d. Verify Checks

Run all local checks per `harness/skills/testing/run-code-checks.md`:

- **Test suite** — all existing and new tests must pass.
- **Linting + type checking** — zero errors.
- **Build** — must produce a clean bundle.

#### 3e. Fix if needed

If any verification step fails (functionality, conformance, or automated checks), diagnose and fix. Do not suppress failures. Return to 3a if the fix requires further implementation changes.

#### Loop Exit

Exit only when: **all automated checks pass with zero failures** AND **the Conformance Self-Review is complete and documented**.

### Step 4 — Human Review

**Stop here and wait for human approval before proceeding.**

Present a summary of the changes:

- What was implemented and why.
- Notable decisions or trade-offs.
- Confirmation that all checks pass.
- The completed `## Conformance` section.

Then **explicitly offer the pre-push 4-persona review** (`003_2_review_local`) as an option — do not assume the human knows it is available. The review inspects `git diff HEAD` (staged + unstaged), so it must run while the changes are still uncommitted; running it after Step 5 is not possible.

Ask the human to choose one of:

- **Approve and push** — proceed to Step 5 without running `003_2_review_local`. Acceptable for small or low-risk changes; `003_1_review_pr` can still run after the push.
- **Run the pre-push review first** — invoke `003_2_review_local`, present findings, then return to this step. If the review surfaces blocking findings, return to the Step 3a (Implement) loop to address them and re-run Steps 3b–3e; otherwise proceed to Step 5.
- **Request changes** — implement changes and return to the Step 3a (Implement) loop, then return to this step.

Do not proceed to Step 5 until the human has explicitly chosen one of the options above.

### Step 5 — Commit and Push

1. **Commit** with a clear message per `harness/skills/development/commit-changes.md`.
2. **Push** to the current branch.

After pushing, run `003_1_review_pr` — a fresh-context pass against the pushed branch — unless `003_2_review_local` already ran in Step 4 and no further changes were made.

## Done

Your work is complete when the code is pushed, all local checks pass, and the Conformance Self-Review is documented in the commit body.
