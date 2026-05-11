# Architecture Decision Records

## What an ADR Is

An Architecture Decision Record (ADR) is a short document — typically one page — that captures **one** load-bearing decision: the context that forced the decision, the choice made, the alternatives considered, and the consequences. ADRs are the durable memory of why this codebase is shaped the way it is.

Write an ADR when:

- A decision constrains future work (architecture, framework choice, layering, persistence strategy).
- Reversing the decision later will be expensive.
- A future contributor (or a future you) will reasonably ask "why on earth did we do it this way?"

Don't write an ADR for choices a code comment would cover.

## Status Lifecycle

Each ADR has one of:

- **proposed** — under discussion, not yet committed.
- **accepted** — the decision is active; the codebase follows it.
- **superseded** — replaced by a later ADR (link to the successor). The original document is never rewritten — it stays as the historical record of what we used to think.

Once an ADR is accepted, do not edit it. If reality changes, write a new ADR that supersedes it.

## How to Write One

Use the skill at `harness/skills/planning/write-adr.md`. It loads this template and walks you through filling it in.

## Index

| # | Title | Status | Supersedes |
|---|-------|--------|------------|
| _none yet_ |   |   |   |

When the first ADR is written, replace this row.

## Template

ADR files live in this directory, named `NNNN-short-kebab-title.md` (zero-padded, four digits). Use this template:

```markdown
# ADR-NNNN — <Title>

- **Status:** proposed | accepted | superseded by ADR-MMMM
- **Date:** YYYY-MM-DD
- **Deciders:** <names>

## Context

What forced this decision? What constraints, pain points, or new requirements made the previous approach inadequate? Be specific — link to the slice or area showing the smell.

## Decision

The single sentence form of what we will do.

Then a paragraph or two explaining the choice in enough detail that someone implementing against this ADR can act on it.

## Alternatives Considered

For each: what it was, why we didn't pick it. Brief — one sentence each is fine.

## Consequences

What changes as a result. What gets easier, what gets harder, what migration cost is implied. What we have committed to that we couldn't easily walk back.

## Follow-ups

Concrete work items this ADR creates: files to move, conventions to add, code to refactor. Optional; can be deferred to a plan if the migration is non-trivial.
```

Keep it short. If it exceeds two pages, you are documenting an implementation rather than a decision — split the implementation into a plan under `harness/exec-plans/` and link to it from the ADR.
