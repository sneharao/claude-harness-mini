# Persona — Next.js (App Router) + TypeScript + Tailwind + Vitest

The Next.js UI persona. Picks Next 15 (App Router), TypeScript strict, Tailwind 4, Vitest 2 — with Zod for boundary validation. Optimised for **hex/onion-ready vertical slices on Next App Router**: the slice lives outside Next's routing tree so the project can graduate to onion/hex later without rewriting business logic.

This persona is an alternative to `persona-react-vite.md`. Exactly one stack persona is applied per project. The knowledge files this persona writes overlap in path with the React+Vite persona's outputs — that's expected, since only one of them ever runs in a given repo.

## Stack

- Next.js 15 (App Router only — Pages Router is out of scope for this persona)
- React 19 (Server Components by default)
- TypeScript 5.4+ (strict)
- Tailwind CSS 4
- Vitest 2 (V8 coverage) for unit / boundary / integration
- Playwright (optional) for true end-to-end through the running Next server
- Zod for input/output schemas at every transport boundary
- `server-only` and `client-only` packages as compile-time guards

## The core decision this persona encodes

> **`src/app/` is a driving adapter, not the home of features.**

Next's App Router is a transport layer — a way to turn HTTP requests into function calls. Business logic does not live there. Slices live in `src/features/<feature>/`. Everything in `src/app/` is a thin shim that parses input and delegates.

This is what makes the project hex/onion-ready: when you graduate, `src/app/` stays as the driving-adapter ring with no migration, `src/features/<feature>/handler.ts` becomes the application-service / use-case ring, `src/shared/domain/` becomes the domain ring. Folders rename; code doesn't move.

## Layout Override (this persona's slice shape)

This persona **overrides** the generic shape in `harness/knowledge/repo-architecture/vertical-slice-conventions.md`. The contract (endpoint / command / handler / view) is unchanged. Next-specific:

### Folder casing

Feature folders are **kebab-case**: `src/features/create-user/`, `src/app/users/`, `src/app/api/users/`. This matches Next's filesystem-routing conventions (the folder name becomes the URL segment) and the harness default in `naming-conventions.md`. Do not PascalCase folders under `app/` — `/CreateUser` is not a URL you want.

### Full project layout

```
src/
├── app/                           ← Driving adapter: Next App Router transport ONLY
│   ├── layout.tsx                 ← Root layout
│   ├── page.tsx                   ← Root route
│   ├── users/
│   │   ├── page.tsx               ← thin: import { UsersView } from "@/features/users/view"
│   │   ├── actions.ts             ← "use server" — thin: parse → command → handler
│   │   └── loading.tsx            ← Next primitives (loading/error/not-found) stay here
│   ├── api/
│   │   └── users/
│   │       └── route.ts           ← thin: parse → command → handler → respond
│   └── _lib/                      ← "_" prefix = Next ignores for routing; transport helpers only
│
├── features/                      ← THE vertical slice — the unit of change
│   └── users/
│       ├── command.ts             ← Zod schemas (input contract, single source of truth)
│       ├── handler.ts             ← Logic. First line: import "server-only";
│       ├── view.tsx               ← The page UI (RSC by default; opt into client with "use client")
│       ├── form.tsx               ← Slice-local UI piece (zero or more)
│       └── progress-bar.tsx       ← Another slice-local piece — kept flat, no nested folder
│
├── shared/                        ← The small, stable kernel
│   ├── domain/                    ← Entities, value objects — framework-free, pure TS
│   ├── abstractions/              ← Ports (interfaces)
│   ├── infrastructure/            ← Adapters (db clients, http clients, queue clients)
│   ├── components/                ← Design-system primitives (Button, Input, Card)
│   ├── hooks/                     ← Cross-cutting hooks (DOM, viewport, debounce)
│   └── lib/                       ← Pure helpers, no I/O (e.g. cn.ts)
│
└── tests/
    └── users/
        ├── api/                   ← Tests against app/api/users/route.ts and actions.ts
        ├── boundary/              ← Tests against features/users/command.ts Zod schemas
        ├── integration/           ← Tests against features/users/handler.ts with fake adapters
        └── ui/                    ← Tests against features/users/view.tsx with RTL
```

## Role mapping

| File | Role | Onion equivalent | Responsibilities |
|------|------|------------------|------------------|
| `src/app/<feature>/page.tsx` | Driving Adapter (View transport) | UI Controller | Async server component. Calls handler directly for data, renders the slice's view. **No business logic, no Zod parsing, no DB calls.** |
| `src/app/<feature>/actions.ts` | Driving Adapter (Server Action transport) | Application Service entry | `"use server"`. Parse `FormData`/input with `command`. On failure return structured error. On success call `handler`, invalidate cache, return result. **No business logic.** |
| `src/app/api/<feature>/route.ts` | Driving Adapter (HTTP transport) | HTTP Controller | Parse `Request` body with `command`. On failure return `400`. On success call `handler`, return `Response`. **No business logic.** |
| `src/features/<feature>/view.tsx` | View | UI Layer | The React component. Composes slice-local pieces and shared primitives. Knows nothing about transport or the database. RSC by default. |
| `src/features/<feature>/handler.ts` | Application Service | Application Service | First line: `import "server-only";`. Pure async function. Receives validated input. Calls `shared/domain/` for rules, `shared/abstractions/` for ports. Returns a result. **No `Request`, no `Response`, no `"use server"`, no React, no `revalidatePath`.** |
| `src/features/<feature>/command.ts` | DTO + boundary | DTO / Schema | Zod schemas for input. Exports inferred types. The single source of truth — both `route.ts` and `actions.ts` reuse it. |
| `src/features/<feature>/*.tsx` (other) | Slice-local UI | UI Layer | Sub-components used only by this slice's view. Flat files in the feature folder. If reused across slices, lift to `src/shared/components/`. |

### Why both `actions.ts` and `route.ts` may exist

| Caller | Transport | Where |
|--------|-----------|-------|
| Your own React UI (form submit, button click) | Server Action | `src/app/<feature>/actions.ts` |
| Browser `fetch`, mobile client, webhook, internal service | HTTP route handler | `src/app/api/<feature>/route.ts` |
| Server Component reading data | Direct handler call inside the RSC | no transport — `page.tsx` calls `handler()` directly |

All three import the **same** `command` schema and the **same** `handler` from `src/features/<feature>/`. The handler doesn't know which one called it.

If a feature only ever has internal UI callers, skip `route.ts`. If it only ever has REST callers and no UI, skip `view.tsx` and `actions.ts`. Don't create files to be symmetric.

## Discipline rules

These are not style preferences — violations break either the hex migration story or the server/client boundary.

### 1. `src/app/` contains no logic

Every file under `src/app/` parses input, calls the slice, returns. If a `route.ts` exceeds ~30 lines or has a conditional that isn't HTTP-status mapping, the logic belongs in `handler.ts`. Same for `actions.ts` and `page.tsx`.

### 2. `handler.ts` starts with `import "server-only";`

This is a runtime/build-time guard. If any client component transitively imports the handler, the build fails. Folder placement is convention; `server-only` is enforcement.

```ts
// src/features/users/handler.ts
import "server-only";
import type { CreateUserCommand } from "./command";
import type { UserRepository } from "@/shared/abstractions/user-repository";

type Deps = { userRepository: UserRepository };

export async function createUserHandler(
  cmd: CreateUserCommand,
  deps: Deps,
): Promise<{ id: string }> {
  const existing = await deps.userRepository.findByEmail(cmd.email);
  if (existing) throw new ConflictError("Email already in use");
  return deps.userRepository.create({ email: cmd.email, name: cmd.name });
}
```

The handler takes `deps` rather than importing concrete adapters. The composition root wires concretes (see below).

### 3. One Zod schema, every transport reuses it

`command.ts` is the single source of truth. `route.ts` and `actions.ts` both import the same schema. If you find yourself defining a "request body schema" and a "form schema" separately for the same operation, you have two truths and they will drift.

```ts
// src/features/users/command.ts
import { z } from "zod";

export const CreateUserCommand = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
});

export type CreateUserCommand = z.infer<typeof CreateUserCommand>;
```

### 4. The route handler shim

```ts
// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { CreateUserCommand } from "@/features/users/command";
import { createUserHandler } from "@/features/users/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = CreateUserCommand.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const result = await createUserHandler(parsed.data, adapters);
  return NextResponse.json(result, { status: 201 });
}
```

That's the whole file. No business logic, no domain knowledge, no surprise behaviour.

### 5. The server-action shim

```ts
// src/app/users/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { CreateUserCommand } from "@/features/users/command";
import { createUserHandler } from "@/features/users/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export async function createUser(formData: FormData) {
  const parsed = CreateUserCommand.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  await createUserHandler(parsed.data, adapters);
  revalidatePath("/users");
  return { ok: true };
}
```

Same shape: parse → handler → respond. Cache invalidation (`revalidatePath`, `revalidateTag`) lives here, in the transport, not in the handler — it's a Next concern, not a domain concern.

### 6. The page is a thin RSC that calls the handler

```tsx
// src/app/users/page.tsx
import { UsersView } from "@/features/users/view";
import { listUsersHandler } from "@/features/users/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export default async function Page() {
  const users = await listUsersHandler({}, adapters);
  return <UsersView users={users} />;
}
```

The page calls the handler directly (no HTTP indirection for server-rendered data). It does not contain JSX for the actual UI — that's `view.tsx` in the slice.

### 7. Features never import other features

`src/features/users/` does not import from `src/features/orders/`. If you want to, the shared piece belongs in `src/shared/`, or the two features are one feature, or you need an event/bus whose interface lives in `src/shared/abstractions/`.

### 8. No `pages/` directory

This persona is App Router only. If you need Pages Router (legacy interop, a specific data-fetching pattern), document the deviation in an ADR before adding it.

## Composition root

Adapters from `src/shared/infrastructure/` are instantiated once and exposed as a typed `adapters` object. Both `actions.ts` and `route.ts` import from this root. The handler receives the adapters as `deps` — it never imports concretes directly.

```ts
// src/shared/infrastructure/composition-root.ts
import "server-only";
import { PrismaUserRepository } from "./prisma-user-repository";
import { ResendMailer } from "./resend-mailer";
import { prisma } from "./prisma-client";
import type { UserRepository } from "@/shared/abstractions/user-repository";
import type { Mailer } from "@/shared/abstractions/mailer";

export const adapters: { userRepository: UserRepository; mailer: Mailer } = {
  userRepository: new PrismaUserRepository(prisma),
  mailer: new ResendMailer(process.env.RESEND_API_KEY!),
};
```

The composition root is the one place concretes are wired. Tests inject fakes for the same `adapters` shape — never mock the concretes, fake the ports.

## Hex/onion graduation story

When the smell justifies the move (3+ slices share unstable logic, or domain rings emerge — see `repo-architecture/overview.md`), rename rather than rewrite:

| Today | After graduation |
|-------|------------------|
| `src/app/` | `src/app/` (unchanged — already a driving adapter) |
| `src/features/<x>/handler.ts` | `src/application/use-cases/<x>.ts` |
| `src/features/<x>/command.ts` | `src/application/use-cases/<x>-command.ts` |
| `src/features/<x>/view.tsx` | `src/ui/<x>-view.tsx` (or stays under `app/` as a thin page) |
| `src/shared/domain/` | `src/domain/` |
| `src/shared/abstractions/` | `src/application/ports/` |
| `src/shared/infrastructure/` | `src/infrastructure/` |

The composition root stays. The Zod schemas stay. The handler logic stays. The migration is mechanical because the boundaries were already in the right places — they were just collapsed under `features/` and `shared/` for a smaller codebase.

**Acid test:** could you delete `src/app/` and rebuild the product as an Express server + a separate React SPA, without touching `src/features/` or `src/shared/`? If yes, you are hex-ready.

## Tests per slice

```
tests/users/
├── api/              ← Tests app/api/users/route.ts AND app/users/actions.ts.
│                       Build a Request (or call the action) and assert on the result.
├── boundary/         ← Tests features/users/command.ts Zod schemas. Every rejection case.
├── integration/      ← Tests features/users/handler.ts with fake adapters injected.
└── ui/               ← Tests features/users/view.tsx with React Testing Library.
                        Pass props directly — the view is a pure component given props.
```

Notes:

- **Server actions are testable directly.** Import the action, call it with a built `FormData`. No need to spin up Next.
- **Route handlers are testable directly.** Import the `POST`/`GET` export, call with `new Request("...")`, assert on the returned `Response`.
- **RSC `page.tsx`** stays thin (`await handler(); render <View data={...}/>`), which keeps the view pure and unit-testable.
- **Playwright** is the only honest end-to-end option for full Next behaviour (caching, streaming, hydration). Use it for happy-path smoke tests; do not duplicate boundary tests at the e2e level.

A slice missing `boundary/` has unvalidated input. A slice missing `integration/` has untested logic. A slice missing `ui/` has unverified UI.

## Anti-patterns specific to Next

- **`handler.ts` inside `src/app/<feature>/`.** Comfortable from a Next tutorial, but it puts business logic inside the framework's routing tree and cements the slice to Next's bundler. Lift it to `src/features/`.
- **`_actions/` folder grouping server actions across features.** Folder-by-technical-concern, same anti-pattern as `controllers/services/repositories`. Actions colocate with the page that uses them: `app/<feature>/actions.ts`.
- **`"use server"` in `handler.ts`.** The handler is not a server action. It's a plain async function that runs on the server (enforced by `import "server-only"`). The `"use server"` directive belongs only on the transport file (`actions.ts`).
- **Cache invalidation inside `handler.ts`.** `revalidatePath` / `revalidateTag` are Next primitives. They go in `actions.ts` or `route.ts`. If you graduate to hex, the handler must not reference Next at all.
- **`Request` / `Response` types in the handler signature.** The handler accepts the inferred Zod type, not raw HTTP types. If `Request` is in the handler, transport has leaked into application.
- **A `utils/` or `helpers/` bucket inside `src/features/<x>/`.** That's a shared kernel in disguise. Move to `src/shared/lib/`.

## Remediation

When the audit (or your own inspection) finds a feature in violation of this persona's discipline rules / anti-patterns — typically: logic inside `src/app/<feature>/` that should live in `src/features/<feature>/` — use:

- **Skill:** `harness/skills/development/migrate-nextjs-slice.md`
- **Scope:** one feature per invocation. Other features untouched. Single commit on a `refactor/migrate-<feature>-slice` branch.
- **When:** any time after the persona is in place — onboarding cleanup, drift accumulated mid-project, or iterative rebalancing.

Tools that surface persona violations (e.g. `harness/skills/init/audit-existing-project.md` step 4b) should quote this pointer in their findings so the human can navigate from the violation to the fix.

---

### Output → harness/knowledge/code-standards/typescript-and-zod.md

```markdown
# TypeScript + Zod Conventions

Rules for TypeScript files in this codebase. Universal rules (naming, design principles) live in `code-standards/naming-conventions.md` and `code-standards/design-principles.md`.

## TypeScript

### Strict mode is non-negotiable

`tsconfig.json` ships with `"strict": true`, `"noUncheckedIndexedAccess": true`, and `"exactOptionalPropertyTypes": true`. Do not relax these.

### No `any`

If you reach for `any`, you have a missing type. Options in order of preference:

1. Define the type properly.
2. Use `unknown` and narrow with a type guard or a Zod schema.
3. If a third-party library is genuinely untyped, declare a `.d.ts` shim narrowing exactly what you use.

`// eslint-disable-next-line @typescript-eslint/no-explicit-any` is only acceptable with an inline comment naming the third-party library and the issue.

### No `@ts-ignore`, no `@ts-expect-error` without a reason

Always pair with an inline comment explaining what's broken and why it's worth bypassing. Better: fix the underlying type.

### Named exports only

No default exports — they hurt grep, hurt rename, and let consumers invent their own name. Exceptions enforced by Next:

- `app/<route>/page.tsx` must have a default export (Next requires it).
- `app/<route>/layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `default.tsx` must have a default export.
- `app/api/<route>/route.ts` uses named exports (`GET`, `POST`, …) — keep them named.
- `next.config.ts` uses a default export.

Everywhere else: named exports.

### Async functions are `Promise<T>`, never `Promise<any>`

If a function might fail, the failure is part of the type contract — throw a typed error and document it, or return a discriminated union.

## Zod

### Zod is the boundary layer

Every external input — HTTP request body, server-action `FormData`, URL search params, environment variables, third-party API response — is parsed through a Zod schema before it enters the rest of the code.

```ts
// command.ts
import { z } from "zod";

export const CreateUserCommand = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  age: z.number().int().min(18).optional(),
});

export type CreateUserCommand = z.infer<typeof CreateUserCommand>;
```

### Parse at the boundary, trust inside

`route.ts` and `actions.ts` parse with `CreateUserCommand.safeParse(...)`. On failure they return a structured error. On success they pass the inferred `CreateUserCommand` type into `handler.ts`. The handler signature accepts the parsed type — it never sees `unknown`.

### One schema per concept

Don't multiplex one schema for request, response, and database row — they drift independently. Define each, and let `z.infer` derive the types.

### One schema per command, reused by every transport

`actions.ts` and `route.ts` both import `CreateUserCommand` from the same `command.ts`. Do not write a "form schema" and a "request schema" for the same operation.

### Schema composition over duplication

```ts
const UserBase = z.object({ email: z.string().email(), name: z.string().min(1) });
export const CreateUserCommand = UserBase.extend({ password: z.string().min(8) });
export const UserResponse = UserBase.extend({ id: z.string().uuid(), createdAt: z.string().datetime() });
```

### Errors at the boundary translate, not propagate

When `safeParse` fails, build a structured error response from `result.error.flatten()`. Don't re-throw the `ZodError` past the boundary; the handler should not know Zod exists.

## Discriminated unions

Use them for branching on type, not strings. The exhaustiveness check is the value.

```ts
type Result<T> =
  | { kind: "ok"; value: T }
  | { kind: "error"; reason: "not-found" | "forbidden" | "conflict" };

function render(r: Result<User>) {
  switch (r.kind) {
    case "ok": return r.value.name;
    case "error": return r.reason;
  }
  // TS will error if a new variant is added but not handled.
}
```

## Imports

- Use the path alias `@/...` for `src/...` (configured in `tsconfig.json`).
- Group imports: external libs → `@/shared/...` → `@/features/...` → relative `./` → types-only (`import type`).
- A feature never imports from another feature. That's a `dependency-rules.md` violation, not a style choice.
- A handler never imports from `@/app/`. The app layer is downstream of the slice.
```

---

### Output → harness/knowledge/code-standards/ui/react-patterns.md

```markdown
# React Patterns

Idioms for React 19 components and hooks in this codebase. Universal rules (naming, design principles) live in the parent `code-standards/` directory. Next App Router transport rules live in `code-standards/nextjs-patterns.md`.

## Server vs client components

Next App Router defaults every component to a **Server Component (RSC)**. RSCs run on the server, never ship JS for themselves to the client, can be async, and can call server-only code directly.

A component becomes a **Client Component** by starting the file with `"use client";`. Use it only when the component needs:

- React state (`useState`, `useReducer`)
- Effects (`useEffect`, `useLayoutEffect`)
- Refs (`useRef`, `useImperativeHandle`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Event handlers wired to JSX (`onClick`, `onChange`)

If the component takes data and renders it without any of the above, leave it as a Server Component.

### The boundary is one-way

A Server Component can render a Client Component. A Client Component cannot import a Server Component (it can receive one as a `children` prop, but cannot directly call it). When you mark a file `"use client"`, every component below it in the import tree becomes client-bundled.

For this reason: keep `"use client"` files small and at the leaves of the component tree, not at the root.

### Compile-time guards

- `import "server-only";` at the top of a module guarantees it cannot run on the client. The build fails if a client component imports it. Apply to every handler and to any server-side helper.
- `import "client-only";` does the inverse — apply to modules that use browser APIs.

## Components

### Function components only

No class components.

### One component per file

A file exports one component (with optional sub-components co-located *only* if they are never imported from elsewhere).

### Props are typed inline or as a `Props` type

```tsx
type Props = {
  user: User;
  onSave: (user: User) => void;
};

export function UserCard({ user, onSave }: Props) {
  ...
}
```

Don't use `React.FC` — it adds nothing in React 19, hides the children-by-default question, and breaks generics.

### Children typing

Be explicit. If a component takes children, declare `children: React.ReactNode`. Don't make consumers guess.

### Conditional rendering

- Use `&&` only when the falsy value can't render as `0` or `""`. Otherwise use a ternary returning `null`.
- Pull complex conditional trees out into helper functions.

### Lists need keys, and the key must be stable

`key={index}` is wrong unless the list is genuinely append-only and immutable. Use the item's id.

## Async server components

Server Components can be `async` and `await` data inside their function body. This replaces the loader pattern from other frameworks.

```tsx
// src/app/users/page.tsx
import { UsersView } from "@/features/users/view";
import { listUsersHandler } from "@/features/users/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export default async function Page() {
  const users = await listUsersHandler({}, adapters);
  return <UsersView users={users} />;
}
```

The page stays thin — fetch via handler, render view. The view (`features/users/view.tsx`) is itself an RSC by default; it receives data as props and renders.

## Hooks (client components only)

Hooks only work inside Client Components. If you find yourself wanting a hook in an RSC, you're in the wrong file — either lift the state/effect into a Client Component or do the work on the server.

### Where hooks live (decision tree)

In order — stop at the first match:

1. **Cross-cutting infrastructure** (DOM, viewport, debounce, network status, no domain knowledge) → `src/shared/hooks/<hook>.ts`.
2. **Used by only one slice** → inside the slice folder (e.g. `src/features/create-user/use-create-user-form.ts`).
3. **Used by multiple slices and domain-aware** → if such a hook exists, the logic probably belongs in a `handler.ts` plus a thin per-slice wrapper. Pull it down before sharing it.

### Naming

`useXxx.ts` — camelCase, `use` prefix. The file name matches the exported hook name.

### Custom hooks return objects, not tuples

`useUserForm()` returns `{ formData, errors, submit }`, not `[formData, errors, submit]`. Tuple returns are fine when there are 2–3 values and the order is unambiguous.

## State

### Lift state where it belongs, not "as high as possible"

Component state stays in the component until two siblings need it. Then lift to the lowest common ancestor. Don't preemptively hoist state to a context provider.

### `useState` for local; `useReducer` for local-but-complex; context for cross-tree

- 1–2 boolean / string fields → `useState`.
- A state machine, a form, anything with > 4 transitions → `useReducer`.
- App-wide identity (current user, theme) → context with a typed provider in `@/shared/`.

### No global mutable state

No module-level `let` for state. If you reach for one, lift to context.

## Forms and server actions

Forms in this codebase POST to server actions defined in `app/<feature>/actions.ts`. A form is typically:

```tsx
"use client";
import { createUser } from "../actions";

export function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="email" type="email" required />
      <input name="name" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

The action validates the `FormData` against the slice's Zod schema, calls the handler, returns a result. The form file is a Client Component (because of the form element interaction), the action is a server function. No client-side `fetch` boilerplate.

## Styling

- Tailwind for all styling. No inline `style={{ ... }}`, no CSS modules, no styled-components.
- Use design tokens from `tailwind.config.ts` (`theme.extend.colors`, etc.) rather than raw hex values in `className`.
- Compose long `className` strings with `cn()` (clsx + tailwind-merge), exported from `@/shared/lib/cn.ts`.
```

---

### Output → harness/knowledge/code-standards/ui/testing.md

```markdown
# UI Testing — Vitest + React Testing Library

How to write tests for the four buckets each slice owns: `api/`, `boundary/`, `integration/`, `ui/`. Universal testing principles live in `harness/skills/development/tdd-based-development.md`.

## Tooling

- **Vitest 2** — test runner, assertion library, mocking.
- **@testing-library/react** — component rendering, query selectors that mirror user behaviour.
- **@testing-library/user-event** — simulates real user interactions.
- **Playwright** (optional) — true browser e2e through the running Next server, for caching/streaming/hydration behaviour Vitest can't reproduce.
- **MSW** (optional) — for intercepting `fetch` in `ui/` tests when needed.

Each is added via the persona's `package.json` block. Do not add competing alternatives (jest, enzyme, sinon).

## The Four Buckets

| Bucket | Tests what | Style |
|--------|-----------|-------|
| `api/` | `app/<feature>/actions.ts` and `app/api/<feature>/route.ts` | Import the action/route export, call with built `FormData`/`Request`, assert on result/Response |
| `boundary/` | `features/<feature>/command.ts` Zod schemas — every rejection case | Unit; call `.safeParse()`, assert on `error.flatten()` |
| `integration/` | `features/<feature>/handler.ts` end-to-end with fake `shared/abstractions/` | Inject fake adapters, assert on output and side effects |
| `ui/` | `features/<feature>/view.tsx` and slice sub-components — what the user sees | Render with RTL, query by accessible role, simulate events with `user-event` |

A slice missing any of these has a known gap. Don't skip `boundary/` because "the form validates" — Zod schemas drift faster than UIs.

## File Naming

- Unit / boundary: `<thing>.test.ts(x)`.
- Integration: `<thing>.integration.test.ts(x)`.
- One test file per source file under test, named after it.

## Patterns

### Test by behaviour, not implementation

Query by accessible role (`getByRole('button', { name: /save/i })`), not by class or test-id. If you can't query it, neither can a screen reader — fix the component.

```tsx
// Good
await user.click(screen.getByRole('button', { name: /create user/i }));
expect(screen.getByRole('alert')).toHaveTextContent('User created');

// Avoid
const btn = container.querySelector('.btn-primary');
fireEvent.click(btn!);
```

### Testing server actions directly

```ts
// tests/users/api/create-user.action.test.ts
import { createUser } from "@/app/users/actions";
import { vi } from "vitest";

vi.mock("@/shared/infrastructure/composition-root", () => ({
  adapters: {
    userRepository: { findByEmail: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "abc" }) },
    mailer: { send: vi.fn() },
  },
}));

test("creates a user given valid form data", async () => {
  const formData = new FormData();
  formData.set("email", "a@b.com");
  formData.set("name", "Ada");

  const result = await createUser(formData);

  expect(result).toEqual({ ok: true });
});

test("returns errors for invalid email", async () => {
  const formData = new FormData();
  formData.set("email", "not-an-email");
  formData.set("name", "Ada");

  const result = await createUser(formData);

  expect(result).toHaveProperty("errors.email");
});
```

### Testing route handlers directly

```ts
// tests/users/api/create-user.route.test.ts
import { POST } from "@/app/api/users/route";

test("POST /api/users returns 201 on success", async () => {
  const req = new Request("http://localhost/api/users", {
    method: "POST",
    body: JSON.stringify({ email: "a@b.com", name: "Ada" }),
    headers: { "Content-Type": "application/json" },
  });

  const res = await POST(req);

  expect(res.status).toBe(201);
});
```

### Testing the handler with fake adapters (integration bucket)

```ts
// tests/users/integration/create-user.integration.test.ts
import { createUserHandler } from "@/features/users/handler";
import type { UserRepository } from "@/shared/abstractions/user-repository";

const fakeUserRepository: UserRepository = {
  findByEmail: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({ id: "abc-123" }),
};

test("createUserHandler persists a new user", async () => {
  const result = await createUserHandler(
    { email: "a@b.com", name: "Ada" },
    { userRepository: fakeUserRepository, mailer: { send: vi.fn() } },
  );

  expect(result).toEqual({ id: "abc-123" });
  expect(fakeUserRepository.create).toHaveBeenCalledWith({ email: "a@b.com", name: "Ada" });
});
```

### Testing the view (ui bucket)

```tsx
// tests/users/ui/users-view.test.tsx
import { render, screen } from "@testing-library/react";
import { UsersView } from "@/features/users/view";

test("renders the list of users", () => {
  render(<UsersView users={[{ id: "1", email: "a@b.com", name: "Ada" }]} />);
  expect(screen.getByRole("listitem", { name: /ada/i })).toBeInTheDocument();
});
```

Because `view.tsx` receives data as props (the page handles the fetch), the UI test does not need to mock any handler.

### Don't mock what you own

If the slice owns `handler.ts`, do not mock it in the slice's own UI or boundary test. Render the slice with a fake adapter from `shared/abstractions/` and let the real handler run. Mocks come in only at the `shared/abstractions/` boundary.

### Don't test the framework

No tests for `revalidatePath`, no tests for `NextResponse.json`, no tests for Zod's `.email()`. Test only the code you wrote.

## Running

```bash
npm test              # all tests, once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

Coverage thresholds — set whatever is honest. The harness enforces that the four buckets exist per slice, not a number.
```

---

### Output → harness/knowledge/code-standards/ui/design-system.md

```markdown
# Design System

How design tokens, components, and design references hang together. The goal: every UI built in this codebase is recognisably from the same product, and an agent that opens a Figma export can produce matching output without inventing styles.

## Three Layers

1. **Tokens** — colours, spacing, typography, radii, shadows. Defined in `tailwind.config.ts` under `theme.extend`. The single source of truth.
2. **Primitives** — generic UI building blocks (`Button`, `Input`, `Modal`, `Card`). Live in `src/shared/components/`. No business knowledge.
3. **Slice components** — feature-specific UI. Live in the slice folder. Compose primitives; do not redefine them.

If you find yourself adding a colour, font, or spacing value directly in JSX, you skipped layer 1. Add it to `tailwind.config.ts` first.

## Designs as Source of Truth

For every slice with a UI, designs live under `designs/<feature-name>/` (Figma exports, screenshots, sketches). When building a `view.tsx` or new component:

1. Open the design.
2. Identify the tokens (colours, spacing, type) used. If a token is missing from `tailwind.config.ts`, add it before writing JSX.
3. Identify primitives used. If a primitive is missing from `shared/components/`, add it before writing the slice JSX.
4. Assemble the slice's `view.tsx` from primitives + Tailwind classes.

The `add-ui-component` skill at `harness/skills/development/add-ui-component.md` walks this process.

## Adding a Primitive

A new primitive lives in `src/shared/components/<name>.tsx`. Rules:

- Zero business knowledge — no domain types in the props.
- Accessible by default — semantic HTML, `aria-*` where needed, keyboard interactions.
- Variant via prop, not via class override. `<Button variant="primary">`, not `<Button className="bg-blue-500">`.
- Forward refs when the consumer might need them.

## Tailwind Discipline

- Use design tokens in `className`, not raw hex values: `bg-brand-500`, not `bg-[#3b82f6]`. Add the token to `tailwind.config.ts` if it's missing.
- Compose long class strings via `cn()` (from `@/shared/lib/cn.ts`, combining `clsx` + `tailwind-merge`). Handles conditional classes and resolves Tailwind conflicts.
- Avoid arbitrary values (`p-[17px]`) — almost always a token is missing. Add it to the config.
- No inline `style={{ ... }}`, no CSS modules, no styled-components.

## Dark Mode

If the project supports dark mode, declare the dark variants in `tailwind.config.ts` and apply them via the `dark:` prefix in JSX. Do not branch on a theme prop in JSX.
```

---

### Output → harness/knowledge/code-standards/nextjs-patterns.md

```markdown
# Next.js App Router Patterns

How Next App Router slots into the vertical-slice + shared-kernel layout. Universal React patterns live in `ui/react-patterns.md`; this file covers only the Next-specific rules.

## Core principle

`src/app/` is a transport layer. Slices live in `src/features/`. Every file under `src/app/` is a thin shim that parses input and delegates to a handler in `src/features/`.

If you find yourself writing business logic in `page.tsx`, `route.ts`, or `actions.ts`, stop. The logic belongs in `src/features/<feature>/handler.ts`.

## The three transports

| Caller | File | Notes |
|--------|------|-------|
| Server component rendering page data | `app/<feature>/page.tsx` | Async RSC. Calls handler directly, passes result to view. |
| Your own React UI mutating state | `app/<feature>/actions.ts` | `"use server"`. Parses FormData, calls handler, invalidates cache. |
| HTTP client (browser fetch, mobile, webhook, service) | `app/api/<feature>/route.ts` | Exports `GET`/`POST`/etc. Parses Request, calls handler, returns Response. |

All three import the same Zod schema from `features/<feature>/command.ts` and the same function from `features/<feature>/handler.ts`. One definition of "what this feature accepts," one definition of "what this feature does."

## Server / client boundary discipline

- Every `handler.ts` starts with `import "server-only";`.
- Every file that must run only on the client starts with `"use client";` (and ideally `import "client-only";` for stronger enforcement).
- Components default to RSC. Only mark `"use client"` when you need state, effects, refs, or browser APIs.
- Never import a handler from a client component. The build fails thanks to `server-only`. If you need the handler's result on the client, fetch it via an action or route handler.

## Cache invalidation lives in transport

`revalidatePath`, `revalidateTag`, `unstable_noStore`, `cookies()`, and `headers()` are Next primitives. They go in `actions.ts` or `route.ts`, never in `handler.ts`. If the handler needs to signal a change, it returns a value the transport interprets; the transport calls the Next API.

## Composition root

`src/shared/infrastructure/composition-root.ts` wires concrete adapters into a typed `adapters` object. Transports import `adapters` and pass it to handlers. Tests inject fakes with the same shape.

```ts
// good — transport gets adapters from the root
import { adapters } from "@/shared/infrastructure/composition-root";
await createUserHandler(parsed.data, adapters);

// bad — transport reaches into a concrete adapter
import { prisma } from "@/shared/infrastructure/prisma-client";
await prisma.user.create(...);
```

## Imports

- Path alias `@/...` for `src/...` (configured in `tsconfig.json`).
- Group order: external libs → `@/shared/...` → `@/features/...` → relative `./` → types-only (`import type`).
- A feature never imports another feature. Lift the shared piece to `@/shared/`.
- A handler never imports from `@/app/`. The app layer is downstream of the slice.

## Things that look like features but aren't

- **Authentication / session management** — usually a `@/shared/abstractions/session.ts` port with adapters under `@/shared/infrastructure/`. Not a feature folder.
- **Layouts and shells** — `app/layout.tsx`, navigation, theme toggles are app-shell, not slices. Live under `src/app/_lib/` or `src/shared/components/`.
- **Middleware** — `middleware.ts` is its own concern. Treat it as a driving-adapter cross-cutting concern; it should also stay thin and delegate.

## Hex/onion graduation

When 3+ slices share unstable logic, graduate via ADR. The migration is mechanical:

- `src/app/` stays as the driving-adapter ring.
- `src/features/<x>/handler.ts` becomes `src/application/use-cases/<x>.ts`.
- `src/shared/domain/` becomes `src/domain/`.
- `src/shared/abstractions/` becomes `src/application/ports/`.
- `src/shared/infrastructure/` becomes `src/infrastructure/`.

The Zod schemas, the handler logic, and the composition root all survive unchanged.
```

---

### Merge into package.json

```json
{
  "name": "PROJECT_NAME_PLACEHOLDER",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "zod": "^3.23.0",
    "server-only": "^0.0.1",
    "client-only": "^0.0.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitest/coverage-v8": "^2.0.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

This persona does not generate `next.config.ts`, `tsconfig.json`, or `tailwind.config.ts`. Scaffold those with `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"` (fresh project) or by hand.

When merging into an existing `package.json`, replace `PROJECT_NAME_PLACEHOLDER`. Preserve any existing `name`.

---

## After init

Tell the human:

```
✅ Next.js (App Router) persona applied.

Knowledge files written:
  - harness/knowledge/code-standards/typescript-and-zod.md
  - harness/knowledge/code-standards/ui/react-patterns.md
  - harness/knowledge/code-standards/ui/testing.md
  - harness/knowledge/code-standards/ui/design-system.md
  - harness/knowledge/code-standards/nextjs-patterns.md

Slice shape:
  src/app/<feature>/{page.tsx, actions.ts}        ← transport shims
  src/app/api/<feature>/route.ts                  ← REST shim (optional)
  src/features/<feature>/{command, handler, view, *.tsx}   ← THE slice
  src/shared/{domain, abstractions, infrastructure, components, hooks, lib}

Discipline:
  - handler.ts starts with: import "server-only";
  - app/ files are thin shims — parse → handler → respond
  - one Zod schema in command.ts, reused by every transport
  - features never import other features

Next:
  1. npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
     (skip if already scaffolded)
  2. npm install server-only client-only zod
  3. /harness/001-plan   ← plan your first feature
```
