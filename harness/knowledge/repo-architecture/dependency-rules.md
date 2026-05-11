# Dependency Rules

What's allowed to import what. Non-negotiable — every new file and refactor must comply. For the overall layout, see [overview.md](./overview.md). For the per-slice contract, see [vertical-slice-conventions.md](./vertical-slice-conventions.md).

## The Rings

There are only four:

| Ring | Lives in | Purpose |
|------|----------|---------|
| **Feature slice** | `src/features/<feature>/` | One feature, end-to-end |
| **Domain** | `src/shared/domain/` | Entities, value objects, pure business rules |
| **Abstractions** | `src/shared/abstractions/` | Interfaces (ports) declared for what slices need |
| **Infrastructure** | `src/shared/infrastructure/` | Concrete adapters that implement abstractions; wraps third-party SDKs |

A composition entry point (`src/main.ts`, `src/index.ts`, framework entrypoint, etc. — set by the persona) is the **only** place concrete adapters are instantiated and wired to slices.

## Import Matrix

Rows import from columns. ✓ allowed, ✗ forbidden.

| From ↓ / To → | features | domain | abstractions | infrastructure | composition root |
|---|---|---|---|---|---|
| **feature** (`src/features/<X>/`) | ✗ (no cross-slice) | ✓ | ✓ | ✗ (use the abstraction) | ✗ |
| **domain** (`src/shared/domain/`) | ✗ | ✓ | ✗ | ✗ | ✗ |
| **abstractions** (`src/shared/abstractions/`) | ✗ | ✓ (types only) | ✓ | ✗ | ✗ |
| **infrastructure** (`src/shared/infrastructure/`) | ✗ | ✓ | ✓ | ✓ | ✗ |
| **composition root** | ✓ | ✓ | ✓ | ✓ | n/a |

Reading the matrix:

- **Features may not import other features.** If two features share logic, the shared piece belongs in `domain/` (a rule) or `abstractions/` + `infrastructure/` (a capability), not as a cross-slice import.
- **Features depend on abstractions, not infrastructure.** A feature handler depends on the `UserRepository` interface, never on `PostgresUserRepository` directly. The composition root injects the concrete.
- **Domain is the leaf.** It depends on nothing inside the project. Only itself and computation libraries (see below).
- **Abstractions may reference domain types.** A port like `UserRepository` references `User` (a domain entity) — that's fine; types only, no behaviour.
- **Composition root is the only graph wiring point.** Concrete classes are named together exactly once.

## Third-Party Libraries

External libraries split into two classes by the **swap test**: *if this library were replaced with an equivalent, would the change ripple through `domain/`, `abstractions/`, or feature code?*

- **Collaboration libraries** (yes, it would ripple) — anything that mediates with the outside world: HTTP clients, database drivers, LLM SDKs, message bus clients, third-party service SDKs. Imported only inside `infrastructure/` adapters. Examples: `mongodb`, `mongoose`, `openai`, `axios`, `@sendgrid/mail`.
- **Computation libraries** (no, it wouldn't) — pure in-process work, no I/O: schema validators, date math, functional primitives, crypto. Importable from any ring. Examples: `zod`, `date-fns`, `lodash`, `uuid`.

When in doubt, default to treating it as collaboration and hide it behind an abstraction.

**Logging caveat:** logging is on the border. Default to treating it as collaboration (define a logger abstraction, implement it in `infrastructure/`) unless the team has explicitly chosen otherwise.

## Common Scenarios

### "Two features need the same business rule"

Put the rule in `src/shared/domain/`. Both features call into it. Never cross-import slice A from slice B.

### "Two features need the same external capability"

Define a port in `src/shared/abstractions/<noun>.<role>.ts`. Implement an adapter in `src/shared/infrastructure/<tech>-<noun>.<role>.ts`. Wire both at the composition root. Both features depend on the port.

### "I need to wrap a third-party SDK"

The SDK is **collaboration** — imported only inside its adapter file in `src/shared/infrastructure/`. Define a thin port in `src/shared/abstractions/` for the capability your features actually need (not the SDK's full surface). The adapter translates between port and SDK. Feature code never imports the SDK.

### "I need a utility used everywhere"

If it's pure (no I/O) → `src/shared/domain/` (if domain-related) or a small `src/shared/lib/` (if generic — e.g. `formatDate`). If it touches I/O → it's not a utility, it's an adapter; put it in `infrastructure/` behind a port.

### "The composition root is getting big"

That's a smell that the project is outgrowing the shared kernel — too many ports, too many adapters wired in one place. Open an ADR; the migration target is usually onion/hex with proper application services and a per-context composition. Don't preempt this; let the pain show up first.

## Stack Overrides

If the chosen persona prescribes a different file layout (e.g. Next.js places feature folders under `app/` instead of `src/features/`), the **ring concepts above remain** — only the *paths* change. Cross-feature isolation, domain-leaf rule, abstractions-over-infrastructure rule, and the third-party library split are universal. Personas may rename folders; they may not relax the rules.

## Enforcement

Until the project wires up an ESLint or similar enforcement layer, these rules are documentation-enforced — caught in code review. When tooling is added, the enforcement contracts go in `harness/enforcement/` (e.g. ESLint boundaries, no-restricted-imports) and this file links to the configs.
