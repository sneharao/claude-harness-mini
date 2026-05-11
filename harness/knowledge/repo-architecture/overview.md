# Repo Architecture — Overview

This codebase uses **vertical slices with a shared kernel** as its starting architecture. New projects default to this shape. As complexity grows, projects may migrate to a layered architecture (onion / hexagonal / clean) — but only via an Architecture Decision Record (ADR) once the smell justifies the move.

For the conventions of a single slice, see [vertical-slice-conventions.md](./vertical-slice-conventions.md). For what's allowed to import what, see [dependency-rules.md](./dependency-rules.md). For how to capture an architecture migration, see [`../architecture-decision-records/ABOUT.md`](../architecture-decision-records/ABOUT.md) and the skill at `harness/skills/planning/write-adr.md`.

## Layout

```
/src
 ├── /features                        ← one folder per feature; the unit of change
 │    └── /create-user
 │         ├── create-user.endpoint   ← how the feature is invoked (HTTP route, RPC, CLI)
 │         ├── create-user.command    ← the input contract (shape of data going in)
 │         └── create-user.handler    ← the logic performed
 │
 ├── /shared                          ← the small, stable kernel
 │    ├── /domain                     ← the nouns (entities, value objects)
 │    ├── /abstractions               ← the ports (interfaces declared here)
 │    └── /infrastructure             ← the adapters (concrete implementations of ports)
 │
 └── /tests
      └── /create-user                ← tests mirror features 1:1
           ├── /api                   ← contract tests against the endpoint
           ├── /boundary              ← input-validation tests against the command
           └── /integration           ← end-to-end through the handler against real infra
```

File extensions, casing, and exact filenames are stack-specific and set by the persona. The structure above is the contract.

## Why Vertical Slices First

- **Feature work stays inside one folder.** Adding, changing, or deleting a feature touches the slice and its tests — usually nothing else.
- **No premature layering.** N-tier (controllers → services → repositories) commits to an architecture before you know what the domain wants. Vertical slices defer that decision.
- **The migration to onion/hex is local lifting.** When 3+ slices share logic and the duplication starts hurting, you extract into the shared kernel (or, eventually, into application/domain rings). Slice boundaries usually match future bounded-context boundaries.

## When to Graduate

Reach for an ADR when one or more of these is true:

- 3+ slices share an unstable piece of logic and the duplication is causing bugs.
- The shared kernel's `infrastructure/` is growing fast and starts to need its own sub-shape (multiple databases, multiple gateways per concern).
- A single feature's handler exceeds what a person can hold in their head — and the right split is *layers* (domain rules vs orchestration vs I/O), not *more slices*.
- Multiple bounded contexts emerge and slices from different contexts start cross-importing.

The ADR records *why* the migration is happening, *what* the new shape is, and *what* gets extracted. After the ADR is accepted, the slices migrate incrementally — you do not rewrite the whole repo.

Do not graduate "because the project is getting big." Bigness alone is not a smell. Pain is.

## Anti-patterns

- **A "common" or "utils" bucket inside `/features`.** That's a shared kernel in disguise, placed at the wrong level. Move it to `/shared/`.
- **Features importing from other features.** Use the shared kernel or an event. If neither feels right, the two features are probably one feature.
- **Logic in the endpoint.** Endpoints are thin: receive request, hand to handler, return response. If you're tempted to add a conditional in the endpoint, it belongs in the handler.
- **Tests outside the per-feature folder.** Every slice has a matching `tests/<feature>/` folder. A test that doesn't fit there is a sign that the code under test belongs in `/shared/`.
