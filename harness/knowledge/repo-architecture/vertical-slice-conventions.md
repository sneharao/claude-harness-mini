# Vertical Slice Conventions

How a single feature slice is shaped. For the overall layout and graduation rules, see [overview.md](./overview.md). For import rules, see [dependency-rules.md](./dependency-rules.md).

## The Contract

A **slice owns one feature end-to-end**: how it's invoked, what input it accepts, the logic it runs, the UI (if any), and its own tests. Every slice exposes the same conceptual parts:

| Part | What it does | Lives in |
|------|--------------|----------|
| **Endpoint** | How the feature is invoked from outside — HTTP route, RPC handler, CLI command, queue consumer. Thin. | Feature folder |
| **Command** | The input contract — the shape of data the feature accepts. Validated at the boundary. | Feature folder |
| **Handler** | The logic — orchestrates `shared/domain` and `shared/abstractions` to produce the output. | Feature folder |
| **UI component** (when the stack has UI) | The user-facing surface, built against designs in `/designs/<feature>/`. Built via the `add-ui-component` skill. | Feature folder |
| **Tests** | API contract / boundary / integration / UI tests for the slice. | `/tests/<feature>/` |

A slice does **not** own:

- **Entities** — live in `/src/shared/domain/`, reused across slices.
- **Ports** — interfaces declared by slice needs; live in `/src/shared/abstractions/`. Slices depend on the port, never the concrete class.
- **Adapters** — concrete implementations; live in `/src/shared/infrastructure/`. Wired at the composition root.
- **Cross-cutting concerns** — logging, auth context, request IDs. Provided by the shared kernel.

## Generic Shape

A slice folder, in language-agnostic form:

```
src/features/create-user/
├── <endpoint file>             ← driving adapter (HTTP route, RPC handler, CLI, queue consumer)
├── <command/contract file>     ← input contract with validation (e.g. Zod schema)
├── <handler file>              ← business logic — pure, no transport concerns
├── <view file>                 ← UI component (only when the stack has a UI)
└── <sub-component files>       ← optional slice-local sub-components — flat files alongside the view; only used by this slice

tests/create-user/
├── api/          ← contract tests against the endpoint
├── boundary/     ← command-validation tests
├── integration/  ← handler end-to-end against real (or high-fidelity fake) infra
└── ui/          ← component tests (when applicable)

designs/create-user/            ← Figma / Jira designs referenced by the view file
```

The **exact file names**, **casing**, and **mapping to language idioms** are set by the persona, not by this file. See the "Stack Overrides" section below for the persona pointers.

UI components are built via `harness/skills/development/add-ui-component.md`. The skill reads the design files and aligns the component with the project's design system.

## Stack Overrides

The chosen persona is the authoritative source for the slice shape in that stack. When the persona prescribes a layout, follow the persona — including file casing, file names, and any role-splitting decisions.

Known persona overrides shipped today:

- **React + Vite (`persona-react-vite.md`)** — Onion-ready split. Folders are PascalCase (`Features/CreateUser/`). Slice files: `Route.tsx` (loader/action — driving adapter), `Page.tsx` (view), `Handler.ts` (logic), `Contract.ts` (Zod schemas), with any slice-local sub-components as flat `.tsx` files in the feature folder (no `Components/` subdirectory). SPA variant (no React Router) swaps `Route.tsx` for `Api.ts`. See the persona file for the full details and rationale.
- **Next.js** (when a persona is added) — feature folders live under `app/<feature>/` (App Router) or `pages/<feature>/` (Pages Router). The endpoint becomes the route's `route.ts` (App Router API) or the page-level data-fetcher. The view becomes `page.tsx`. Command and handler still exist as separate files inside the feature folder.
- **C# / .NET** (when a persona is added) — folders are `PascalCase` (`Features/CreateUser/`), files use `.cs`, no view file (UI is decided per project — Razor, Blazor, separate SPA).
- **Backend-only services** (when a persona is added) — no view file, no `/designs/`, no `ui/` tests. Everything else holds.

If your stack lacks a persona, default to the generic shape above and document any deviations in an ADR.

## Endpoint = Thin

The endpoint receives the request, parses the command, hands it to the handler, returns the response. That's it.

If the endpoint is doing anything else — branching on user state, calling multiple handlers, transforming results in non-obvious ways — that work belongs in the handler.

## Command = Input Contract

The command is the typed, validated shape of the input. Validation happens **inside the command's parser**, not inside the handler. Once the handler receives a `CreateUserCommand`, every field is trustworthy.

## Handler = Logic

The handler orchestrates: calls into `shared/domain/` for business rules, depends on `shared/abstractions/` for ports it needs, returns a result. The handler composes domain logic into a use case — it does not *define* domain rules (those live in entities and domain services).

When a handler gets long enough that you want to split it: the right split is usually pulling logic into a domain function in `shared/domain/`, not splitting the handler file itself.

## UI Component (when applicable)

The `.tsx` file in the slice renders the feature's user-facing surface. It is built against a design in `/designs/<feature>/` (Figma export, Jira screenshot, sketch). When adding or modifying a UI component, use the `add-ui-component` skill at `harness/skills/development/add-ui-component.md` — it sets the contract for how the component reads the design and aligns with the project's design system.

If `/designs/<feature>/` is missing, ask the human for the design before writing the component.

## Tests Split

| Folder | What it tests | When it fails |
|--------|---------------|---------------|
| `api/` | Endpoint contract — request shape in, response shape + status out. | The wire contract drifted. |
| `boundary/` | Command validation — every rejection case (missing field, wrong type, out-of-range value) returns the right error. | An invalid input made it past the boundary. |
| `integration/` | Handler end-to-end against real infrastructure (or a high-fidelity fake). | Feature logic is wrong, or its interaction with infra regressed. |
| `ui/` (when applicable) | UI component renders against the design, handles user interaction, surfaces error states. | The component drifted from the design or breaks on user input. |

A slice with no `boundary/` tests has no input validation. A slice with no `integration/` tests has untested logic. A UI slice with no `ui/` tests is unverified against the design.

## Cross-Slice Communication

Slices may not import from other slices. If feature B needs something feature A produces:

1. Both go through the shared kernel (an entity in `domain/`, a port in `abstractions/`).
2. Use a domain event — feature A emits, feature B subscribes. Set up the event bus in `shared/infrastructure/` once.

If neither feels right, the two slices are probably one slice with a confused name. Merge them.

## Naming (default — persona may override)

| Thing | Convention | Example |
|-------|------------|---------|
| Feature folder | `kebab-case` verb-noun | `create-user`, `list-orders`, `cancel-subscription` |
| Endpoint file | `<feature>.endpoint.<ext>` | `create-user.endpoint.ts` |
| Command file | `<feature>.command.<ext>` | `create-user.command.ts` |
| Handler file | `<feature>.handler.<ext>` | `create-user.handler.ts` |
| View file (when applicable) | `<feature>.<view-ext>` | `create-user.tsx` |
| Entity (in shared/domain) | `<noun>.<ext>` | `user.ts`, `order.ts` |
| Port (in shared/abstractions) | `<noun>.<role>.<ext>` | `user.repository.ts`, `mailer.gateway.ts` |
| Adapter (in shared/infrastructure) | `<tech>-<noun>.<role>.<ext>` | `postgres-user.repository.ts`, `resend-mailer.gateway.ts` |

When the chosen persona overrides these (the React+Vite persona uses PascalCase folders + role-named files like `Route.tsx` / `Page.tsx` / `Handler.ts` / `Contract.ts`; C# uses `PascalCase` + `.cs`), the persona wins.
