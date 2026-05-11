# 003.1 — Review PR (pushed branch)

## What This Is

This is a set of instructions you must adopt and execute, not background context. When triggered, you become the Reviewer Agent. You will perform **four review passes**, each under a distinct persona, against **code that has already been committed and pushed** to the current branch. Follow the execution steps below.

This is the fresh-context cousin of `003_2_review_local.md`. The two share personas, the Evidence Rule, and the severity scale. They differ only in scope:

| | What it inspects | When to run |
|---|---|---|
| **003.2 Review Local** | `git diff HEAD` — staged + unstaged changes | Mid-iteration, before pushing |
| **003.1 Review PR (this skill)** | `git diff main...HEAD` — every commit on the branch | After pushing, before merging |

**Subagent dispatch is preferred.** If your runtime supports subagents, launch one per persona so all four passes run in parallel. Aggregate findings before presenting the final report. Otherwise run sequentially in the listed order.

## Purpose

Review committed work on the current branch across four focus areas — QA, Code Quality, Security, Architecture Conformance — and present findings triaged by severity. Optionally post a summary comment to the associated PR if one exists.

## Reviewer Personas

You execute all four personas. Each pass has a distinct focus and evaluation source:

| Persona | Focus | Evaluation Source |
|---------|-------|-------------------|
| **QA** | Functional correctness, edge cases, test coverage gaps, regression risks. | The diff and the feature intent. If a plan exists under `harness/exec-plans/` on this branch, use it; otherwise infer from the code. |
| **Code Quality** | Clarity, maintainability, naming, duplication, adherence to codebase conventions, SOLID. | The harness — start at `harness/knowledge/code-standards/_index.md` as the lookup table from "what the diff touches" to "which doc to read". |
| **Security** | Injection vectors, auth/authz gaps, data exposure, dependency vulnerabilities, input validation. | Your internal knowledge of security best practices and common vulnerability patterns. |
| **Architecture Conformance** | Structural and dependency rule violations the linter cannot catch. | `harness/knowledge/repo-architecture/overview.md` for orientation, then `dependency-rules.md` for the actual rules. Walk every item against the diff. |

## Evidence Rule

Every **Code Quality** and **Architecture Conformance** finding MUST either:

(a) cite the specific harness doc and the rule it contradicts — `<rule-name> — harness/path/to/file.md`, or
(b) state `"harness silent — general principle: <reasoning>"`.

Findings that fail this rule must not be included.

## Execution Steps

### Step 1 — Gather the Branch Diff

```bash
git fetch origin main
git log --oneline main..HEAD
git diff main...HEAD
git diff --stat main...HEAD
```

This scopes the review to every commit on the branch since it diverged from `main`. Read the diff in full. If a plan exists at `harness/exec-plans/` on the branch, cross-reference it.

If `main` is not the integration branch, substitute the correct base.

### Step 1.2 — Map the Diff to Harness Coverage (Code Quality persona)

For each meaningful change:

- Identify what the change touches in this repo's vocabulary (component, hook, route, service, type, etc.).
- Look up the relevant harness doc via `harness/knowledge/code-standards/_index.md`.
- Read those docs in full before forming any Code Quality finding on that hunk.

### Step 2 — Architecture Conformance Pass

Read `harness/knowledge/repo-architecture/dependency-rules.md`. For each rule, inspect the diff for violations. Record each violation as a finding. Apply the Evidence Rule.

### Step 3 — Identify Issues (all personas)

Within each persona's focus area, identify issues that are actionable and material.

### Step 4 — Triage Each Issue

Assign a severity:

| Severity | Meaning | Expectation |
|----------|---------|-------------|
| **P0** | Blocking — must be fixed before merge. | Bug, security vulnerability, broken functionality, data loss risk. |
| **P1** | High — strongly recommended fix. | Significant quality issue, missing test for critical path, architectural concern. |
| **P2** | Medium — should be addressed. | Code clarity, minor test gap, non-critical convention violation. |
| **P3** | Low / nit — optional. | Style preference, minor naming suggestion, non-functional improvement. |

### Step 5 — Present Findings

List all findings grouped by persona, ordered by severity (P0 first). Each finding must include:

- **Persona** that raised it (`QA`, `Code Quality`, `Security`, `Architecture Conformance`).
- **File and line range**.
- A clear **description** of the issue.
- The **citation** backing it up (Evidence Rule).
- The **severity tag** (`P0`–`P3`) with concise reasoning.
- A **suggested fix** where possible.

Write the full findings to `review-findings.md` at the repo root (gitignored) for easy reference during fixes. Also print a summary table to the terminal:

```
| Persona | P0 | P1 | P2 | P3 | Total |
|---------|----|----|----|----|-------|
| QA      |  0 |  1 |  2 |  0 |     3 |
| Code    |  0 |  0 |  3 |  1 |     4 |
| ...
```

### Step 6 — Optional: Post Summary to PR

If a PR exists for this branch, ask the human whether to post the summary. If yes:

```bash
gh pr comment --body-file review-findings.md
```

Do not auto-post — wait for human approval.

## Done

Your work is complete when all findings have been listed, triaged, written to `review-findings.md`, and (optionally) posted to the PR.
