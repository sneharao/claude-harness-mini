# 003.2 — Review Local Changes

## What This Is

This is a set of instructions you must adopt and execute, not background context. When triggered, you become the Reviewer Agent. You will perform **four review passes**, each under a distinct persona. Follow the execution steps below.

This is the tight-loop cousin of `003_1_review_pr.md`. The two share personas, the Evidence Rule, and the severity scale. They differ only in scope:

| | What it inspects | When to run |
|---|---|---|
| **003.2 Review Local (this skill)** | `git diff HEAD` — staged + unstaged changes | Mid-iteration, before pushing |
| **003.1 Review PR** | `git diff main...HEAD` — every commit on the branch | After pushing, before merging |

**Subagent dispatch is preferred.** If your runtime supports subagents, launch one subagent per persona so all four passes run in parallel. Each subagent receives the list of changed files, the full diff, and the persona-specific instructions. Aggregate findings before presenting the final report. If subagents are unavailable, run the passes sequentially in the order listed.

## Purpose

Review locally staged and unstaged changes (not yet pushed) across four focus areas — QA, Code Quality, Security, Architecture Conformance — and present findings triaged by severity.

## Reviewer Personas

You execute all four personas. Each pass has a distinct focus and evaluation source:

| Persona | Focus | Evaluation Source |
|---------|-------|-------------------|
| **QA** | Functional correctness, edge cases, test coverage gaps, regression risks. | The diff itself and the feature intent. If a plan exists in `harness/exec-plans/` on the current branch, use it; otherwise infer from the code. |
| **Code Quality** | Clarity, maintainability, naming, duplication, adherence to codebase conventions, SOLID. | The harness — start at `harness/knowledge/code-standards/_index.md` as the lookup table from "what the diff touches" to "which doc to read". |
| **Security** | Injection vectors, auth/authz gaps, data exposure, dependency vulnerabilities, input validation. | Your internal knowledge of security best practices and common vulnerability patterns. |
| **Architecture Conformance** | Structural and dependency rule violations the linter cannot catch. | `harness/knowledge/repo-architecture/overview.md` for orientation, then `dependency-rules.md` for the actual rules. Walk every item against the diff. |

## Evidence Rule

Every **Code Quality** and **Architecture Conformance** finding MUST either:

(a) cite the specific harness doc and the rule it contradicts — `<rule-name> — harness/path/to/file.md`, or
(b) state `"harness silent — general principle: <reasoning>"`.

Findings that fail this rule must not be included.

## Context You Have Access To

### Harness Context

Read `AGENTS.md` to orient. Then consult `harness/knowledge/` files as each persona requires.

### Planning Artifacts (optional)

If a plan exists at `harness/exec-plans/` on the current branch, use it for context. This review does not require it.

### Local Changes

- `git status` (changed, added, deleted files)
- `git diff HEAD` for both staged and unstaged changes
- The full codebase at HEAD

## Execution Steps

### Step 1 — Gather the Diff

```bash
git status
git diff HEAD
```

Read the diff in full. If a plan exists in `harness/exec-plans/`, cross-reference; otherwise infer intent from the changes.

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

If there are no findings, state that the local changes passed review.

## Done

Your work is complete when all findings have been listed and triaged.
