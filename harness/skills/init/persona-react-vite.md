# Persona — React + Vite + Tailwind + TS + Vitest

The default UI persona. Picks React 19, Vite 7, TypeScript strict, Tailwind 4, Vitest 2 — with Zod for boundary validation. Optimised for **Onion-ready vertical slices**: each feature separates transport (Web/HTTP) from business logic, so the project can graduate to onion/hex later without rewriting the logic layer.

## Stack

- React 19
- React Router v7 (data routers — `loader` + `action`)
- Vite 7
- TypeScript 5.4+ (strict)
- Tailwind CSS 4
- Vitest 2 (V8 coverage)
- Zod for input/output schemas at the boundary

## Layout Override (this persona's slice shape)

This persona **overrides** the generic shape in `harness/knowledge/repo-architecture/vertical-slice-conventions.md`. The contract (endpoint / command / handler / view) is unchanged; the file names, casing, and role-splitting are React+Vite-specific.

### Folder casing

Feature folders are **PascalCase**: `src/Features/CreateUser/`. This is the persona's authoritative override of the default kebab-case rule in `naming-conventions.md`.

### Slice contents (default — React Router data router)

```
src/Features/CreateUser/
├── Route.tsx          ← Driving Adapter: loader (GET) and action (POST). Handles transport.
├── Page.tsx           ← UI Layer: the React component (the "Screen").
├── Handler.ts         ← Application Service: pure logic, called by action.
├── Contract.ts        ← DTO: Zod schemas for request/response/form validation.
└── Components/        ← Slice-local UI pieces used only by this Page.
```

| File | Role | Onion equivalent | Responsibilities |
|------|------|------------------|------------------|
| `Route.tsx` | Driving Adapter | Controller / HTTP boundary | Parse `FormData` / `URL`; call `Contract`'s Zod schema; on failure return `400`; on success delegate to `Handler` and return `redirect` / `Response`. **No business logic.** |
| `Page.tsx` | View | UI Layer | Render the page using loader data. Receives props or uses `useLoaderData`. Knows about layout and `Components/`; does not know about the database. |
| `Handler.ts` | Application Service | Application Service | Pure async function (or small object). Receives a validated input from `Route.tsx`. Calls `shared/Domain` for rules, `shared/Abstractions` for ports. Returns a result. **No `Request`, no `Response`, no React.** |
| `Contract.ts` | DTO + boundary | DTO / Schema | Zod schemas for the request body, form payload, response shape. Exports inferred types. The single source of truth for what `Route.tsx` accepts. |
| `Components/` | Slice-local UI | UI Layer | Sub-components used **only** by this slice's `Page.tsx`. If a component is reused across slices, lift it to `src/Shared/Components/`. |

### SPA variant (no React Router)

If the project does not use React Router (pure SPA with client-side fetching), swap `Route.tsx` for `Api.ts`:

```
src/Features/CreateUser/
├── Api.ts             ← The fetch / useMutation that talks to a backend. Calls Handler.ts indirectly via HTTP.
├── Page.tsx           ← unchanged
├── Handler.ts         ← unchanged (lives server-side, or in-browser if logic is client-only)
└── Contract.ts        ← unchanged
```

The fact that `Handler.ts` and `Contract.ts` are unchanged across both variants is the point — switching the transport layer (React Router → Next.js → plain SPA) does not touch business logic.

### Tests per slice

```
tests/CreateUser/
├── api/              ← Tests against Route.tsx loader/action — request shape in, response shape + status out
├── boundary/         ← Tests against Contract.ts Zod schemas — every rejection case
├── integration/      ← Tests against Handler.ts end-to-end with fake or real Abstractions
└── ui/               ← Tests against Page.tsx using React Testing Library
```

A slice missing `boundary/` has unvalidated input. A slice missing `integration/` has untested logic. A slice missing `ui/` has unverified UI.

### Designs

Designs (Figma exports, Jira screenshots) for a slice live under `designs/CreateUser/`. UI work goes through `harness/skills/development/add-ui-component.md`.

### Shared kernel paths

- `src/Shared/Domain/` — entities (`User.ts`).
- `src/Shared/Abstractions/` — ports (`UserRepository.ts`, `Mailer.ts`).
- `src/Shared/Infrastructure/` — adapters (`MongoUserRepository.ts`, `ResendMailer.ts`).
- `src/Shared/Components/` — design-system primitives shared across slices.
- `src/Shared/Hooks/` — cross-cutting hooks (DOM, viewport, debounce — zero domain coupling).
- `src/Shared/Lib/` — pure helpers (no I/O).

### Composition root

`src/main.tsx` (Vite entry) is the composition root. It instantiates concrete adapters from `Shared/Infrastructure/` and wires them into a typed context. `Route.tsx` reads adapters from the context — it does not import concretes directly.

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

No default exports — they hurt grep, hurt rename, and let consumers invent their own name. One exception: framework-required default exports (e.g. Vite's `App` entry, Vitest config files). Document those in a comment.

### Async functions are `Promise<T>`, never `Promise<any>`

If a function might fail, the failure is part of the type contract — throw a typed error and document it, or return a discriminated union.

## Zod

### Zod is the boundary layer

Every external input — HTTP request body, URL params, form data, environment variables, third-party API response — is parsed through a Zod schema before it enters the rest of the code.

```ts
// Contract.ts
import { z } from 'zod';

export const CreateUserCommand = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  age: z.number().int().min(18).optional(),
});

export type CreateUserCommand = z.infer<typeof CreateUserCommand>;
```

### Parse at the boundary, trust inside

`Route.tsx` parses with `CreateUserCommand.safeParse(formData)`. If parsing fails, return `400`. If it succeeds, pass the inferred `CreateUserCommand` type into `Handler.ts`. The handler signature accepts the parsed type — it never sees `unknown`.

### One schema per concept

Don't multiplex one schema for request and response. They drift independently. Define both, and let `z.infer` derive the types.

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
  | { kind: 'ok'; value: T }
  | { kind: 'error'; reason: 'not-found' | 'forbidden' | 'conflict' };

function render(r: Result<User>) {
  switch (r.kind) {
    case 'ok': return r.value.name;
    case 'error': return r.reason;
  }
  // TS will error if a new variant is added but not handled.
}
```

## Imports

- Use the path alias `~/...` for `src/...` (configured in both `tsconfig.json` and `vite.config.ts`).
- Group imports: external libs → `~/Shared/...` → `~/Features/...` → relative `./` → types-only (`import type`).
- No deep imports across slices — that's a `dependency-rules.md` violation, not just a style choice.
```

### Output → harness/knowledge/code-standards/ui/react-patterns.md

```markdown
# React Patterns

Idioms for React 19 components and hooks in this codebase. Universal rules (naming, design principles) live in the parent `code-standards/` directory.

## Components

### Function components only

No class components. There is no use case in modern React that justifies a class component.

### One component per file

A file exports one component (with optional sub-components co-located *only* if they are never imported from elsewhere). Multiple top-level component exports per file is a smell.

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
- Pull complex conditional trees out into helper functions (`renderEmptyState`, `renderError`).

### Lists need keys, and the key must be stable

`key={index}` is wrong unless the list is genuinely append-only and immutable. Use the item's id.

## Hooks

### Where hooks live (decision tree)

In order — stop at the first match:

1. **Cross-cutting infrastructure** (DOM, viewport, debounce, network status, no domain knowledge) → `src/Shared/Hooks/<hook>.ts`.
2. **Used by only one slice** → inside the slice folder (e.g. `src/Features/CreateUser/use-create-user-form.ts`).
3. **Used by multiple slices and domain-aware** → if such a hook exists, the logic probably belongs in a `Handler.ts` plus a thin per-slice wrapper. Pull it down before sharing it.

### Naming

`useXxx.ts` — camelCase, `use` prefix. The file name matches the exported hook name.

### Hooks are pure

A hook is a function. It can call other hooks, but it should not have side effects at module-load time. All side effects go inside `useEffect`, `useLayoutEffect`, or event handlers.

### Custom hooks return objects, not tuples

`useUserForm()` returns `{ formData, errors, submit }`, not `[formData, errors, submit]`. Callers can destructure what they need; adding a new return value is non-breaking. Tuple returns are fine when there are 2–3 values and the order is unambiguous (`useState`'s `[value, setValue]`).

## State

### Lift state where it belongs, not "as high as possible"

Component state stays in the component until two siblings need it. Then lift to the lowest common ancestor. Don't preemptively hoist state to a context provider.

### `useState` for local; `useReducer` for local-but-complex; context for cross-tree

- 1–2 boolean / string fields → `useState`.
- A state machine, a form, anything with > 4 transitions → `useReducer`.
- App-wide identity (current user, theme) → context with a typed provider in `Shared/`.

### No global mutable state

No module-level `let` for state, no singleton stores outside React's tree. If you reach for one, lift to context.

## Routes (React Router v7)

### `Route.tsx` is thin

```tsx
import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from 'react-router';
import { CreateUserCommand } from './Contract';
import { createUserHandler } from './Handler';
import { Page } from './Page';

export async function loader({ context }: LoaderFunctionArgs) {
  return { /* data needed by Page */ };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const parsed = CreateUserCommand.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return Response.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  await createUserHandler(parsed.data, context.adapters);
  return redirect('/users');
}

export default Page;
```

### `Page.tsx` is presentation

It reads from `useLoaderData()`, renders, and submits forms back to the action. It does not know about Zod, the database, or how the user gets persisted.

### `Handler.ts` is pure async logic

```ts
import type { CreateUserCommand } from './Contract';
import type { UserRepository } from '~/Shared/Abstractions/UserRepository';

type Deps = { userRepository: UserRepository };

export async function createUserHandler(cmd: CreateUserCommand, deps: Deps): Promise<{ id: string }> {
  const existing = await deps.userRepository.findByEmail(cmd.email);
  if (existing) throw new ConflictError('User with this email already exists');
  return deps.userRepository.create({ email: cmd.email, name: cmd.name });
}
```

Note the handler takes `deps` rather than importing a concrete adapter. The composition root in `main.tsx` wires concretes; `Route.tsx` reads them from context.

## Styling

- Tailwind for all styling. No inline `style={{ ... }}`, no CSS modules, no styled-components.
- Use design tokens from `tailwind.config.ts` (`theme.extend.colors`, etc.) rather than raw hex values in `className`.
- Compose long `className` strings with `cn()` (clsx + tailwind-merge), exported from `~/Shared/Lib/cn.ts`.
```

### Output → harness/knowledge/code-standards/ui/testing.md

```markdown
# UI Testing — Vitest + React Testing Library

How to write tests for the four buckets each slice owns: `api/`, `boundary/`, `integration/`, `ui/`. Universal testing principles live in `harness/skills/development/tdd-based-development.md`.

## Tooling

- **Vitest 2** — test runner, assertion library, mocking.
- **@testing-library/react** — component rendering, query selectors that mirror user behaviour.
- **@testing-library/user-event** — simulates real user interactions (keyboard, click, hover).
- **MSW (Mock Service Worker)** — optional, for intercepting fetch in `ui/` tests when needed.

Each is added via the persona's `package.json` block. Do not add competing alternatives (jest, enzyme, sinon) — pick one stack and stick.

## The Four Buckets

| Bucket | Tests what | Style |
|--------|-----------|-------|
| `api/` | `Route.tsx` loader/action — request shape in, response status + body out | Integration-style; call the loader/action directly with a built `Request`, assert on the `Response` |
| `boundary/` | `Contract.ts` Zod schemas — every rejection case | Unit; call `.safeParse()`, assert on `error.flatten()` |
| `integration/` | `Handler.ts` end-to-end with fake or real `Shared/Abstractions` | Inject fake adapters, assert on output and side effects |
| `ui/` | `Page.tsx` and `Components/` — what the user sees and how they interact | Render with RTL, query by accessible role, simulate events with `user-event` |

A slice missing any of these has a known gap. Don't skip `boundary/` because "the form validates" — Zod schemas drift faster than UIs.

## File Naming

- Unit / boundary / contract: `<thing>.test.ts(x)`.
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

### Arrange-Act-Assert with whitespace

Three sections separated by blank lines. Reader can scan the test structure at a glance.

### One assertion per test (soft rule)

Tests that assert one thing fail with one cause. Tests with five assertions fail with ambiguous causes. The exception: when several assertions describe the same observation (e.g. checking three fields are all reset after a form submit).

### Don't mock what you own

If the slice owns `Handler.ts`, do not mock it in the slice's own UI test. Render the slice with a fake adapter from `Shared/Abstractions/` and let the real handler run. Mocks come in only at the `Shared/Abstractions/` boundary.

### Fake the adapters, not the ports

```ts
// In tests/CreateUser/integration/createUserHandler.integration.test.ts
const fakeUserRepository: UserRepository = {
  findByEmail: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({ id: 'abc-123' }),
};
const result = await createUserHandler(validCmd, { userRepository: fakeUserRepository });
expect(result).toEqual({ id: 'abc-123' });
expect(fakeUserRepository.create).toHaveBeenCalledWith({ email: ..., name: ... });
```

### Don't test the framework

No tests for React Router's `redirect()`, no tests for Zod's `.email()`, no tests for `fetch`. Test only the code you wrote.

## Running

```bash
npm test              # all tests, once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

Coverage thresholds — set whatever is honest for the project. The harness does not enforce a number; it enforces that the four buckets exist per slice.
```

### Output → harness/knowledge/code-standards/ui/design-system.md

```markdown
# Design System

How design tokens, components, and design references hang together in this project. The goal: every UI built in this codebase is recognisably from the same product, and an agent that opens a Figma export can produce matching output without inventing styles.

## Three Layers

1. **Tokens** — colours, spacing, typography, radii, shadows. Defined in `tailwind.config.ts` under `theme.extend`. The single source of truth.
2. **Primitives** — generic UI building blocks (`Button`, `Input`, `Modal`, `Card`). Live in `src/Shared/Components/`. No business knowledge.
3. **Slice components** — feature-specific UI. Live in the slice's `Components/` folder. Compose primitives; do not redefine them.

If you find yourself adding a colour, font, or spacing value directly in JSX, you skipped layer 1. Add it to `tailwind.config.ts` first.

## Designs as Source of Truth

For every slice with a UI, designs live under `designs/<FeatureName>/` (Figma exports, screenshots, sketches). When building a `Page.tsx` or new component:

1. Open the design.
2. Identify the tokens (colours, spacing, type) used. If a token is missing from `tailwind.config.ts`, add it before writing JSX.
3. Identify primitives used (`Button`, `Input`, …). If a primitive is missing from `Shared/Components/`, add it before writing the slice's JSX.
4. Assemble the slice's `Page.tsx` from primitives + Tailwind classes.

The `add-ui-component` skill at `harness/skills/development/add-ui-component.md` walks this process.

## Adding a Primitive

A new primitive lives in `src/Shared/Components/<Name>.tsx`. Rules:

- Zero business knowledge — no domain types in the props.
- Accessible by default — semantic HTML, `aria-*` where needed, keyboard interactions.
- Variant via prop, not via class override. `<Button variant="primary">`, not `<Button className="bg-blue-500">`.
- Forward refs when the consumer might need them.

## Tailwind Discipline

- Use design tokens in `className`, not raw hex values: `bg-brand-500`, not `bg-[#3b82f6]`. Add the token to `tailwind.config.ts` if it's missing.
- Compose long class strings via `cn()` (from `~/Shared/Lib/cn.ts`, which combines `clsx` + `tailwind-merge`). This handles conditional classes and resolves Tailwind conflicts when classes are merged.
- Avoid arbitrary values (`p-[17px]`) — almost always a token is missing. Add it to the config.
- No inline `style={{ ... }}`, no CSS modules, no styled-components.

## Dark Mode

If the project supports dark mode, declare the dark variants in `tailwind.config.ts` and apply them via the `dark:` prefix in JSX. Do not branch on a theme prop in JSX — that's how dark-mode drift starts.
```

### Merge into package.json

```json
{
  "name": "PROJECT_NAME_PLACEHOLDER",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitest/coverage-v8": "^2.0.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.4.0",
    "vite": "^7.0.0",
    "vitest": "^2.0.0"
  }
}
```

When merging into an existing `package.json`, replace `PROJECT_NAME_PLACEHOLDER` with the project name. If the existing `package.json` already has a `name`, keep it.

This persona does not generate `vite.config.ts`, `tsconfig.json`, or `tailwind.config.ts`. Scaffold those with `npm create vite@latest . --template react-ts` (fresh project) or wire by hand. The persona's job is to lock in the **knowledge files** — Vite's own scaffolding handles the build tooling.

---

## After init

Tell the human:

```
✅ React + Vite persona applied.

Knowledge files written:
  - harness/knowledge/code-standards/typescript-and-zod.md
  - harness/knowledge/code-standards/ui/react-patterns.md
  - harness/knowledge/code-standards/ui/testing.md
  - harness/knowledge/code-standards/ui/design-system.md

Slice shape: src/Features/<Name>/{Route.tsx, Page.tsx, Handler.ts, Contract.ts, Components/}

Next:
  1. npm create vite@latest . --template react-ts   (if not already scaffolded)
  2. npm install
  3. /harness/001-plan   ← plan your first feature
```
