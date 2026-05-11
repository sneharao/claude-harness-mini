# Add UI Component

Add a new React component following the slice-local + Shared kernel layout this template uses.

This skill assumes the **React + Vite + TypeScript + Tailwind** persona (`persona-react-vite.md`) is the active layout. If a different persona is active, adapt this skill or read the persona's UI conventions directly.

If your work crosses into a category not covered by this skill (e.g. you start touching the API endpoint while building a component), stop and consult the matching skill in `harness/skills/development/` before continuing.

## Prerequisites

Read these before starting:

- `harness/knowledge/code-standards/ui/react-patterns.md` — component / hook / state idioms (produced by the persona)
- `harness/knowledge/code-standards/ui/design-system.md` — design tokens, primitives, Tailwind discipline (produced by the persona)
- `harness/knowledge/repo-architecture/vertical-slice-conventions.md` — slice contract
- `harness/knowledge/code-standards/naming-conventions.md` — file naming
- The design files under `designs/<FeatureName>/` for the slice you're working on. If missing, stop and ask the human for the design before writing.

## Step 1 — Decide: slice-local or Shared?

| Question | Where it lives |
|----------|----------------|
| Used **only** by this slice's `Page.tsx`? | `src/Features/<FeatureName>/<ComponentName>.tsx` — flat, alongside `Page.tsx` |
| Generic primitive (`Button`, `Modal`, `Card`, `Input`) reusable across slices, with no domain knowledge? | `src/Shared/Components/<ComponentName>.tsx` |

Decision rules:

- **Default to slice-local.** Most components only belong to one slice. Lifting prematurely fragments the design system.
- **Lift to `Shared/Components/`** only when a second slice genuinely needs it *and* the component is generic (no entity-shaped props).
- If a "shared" component still wants entity-shaped props, it's a domain component — keep it slice-local in the slice that owns the entity.

## Step 2 — Create the File

A component is **a single `.tsx` file**. No per-component directory. No `index.tsx` + `types.ts` split. One file per component.

```
src/Features/CreateUser/Form.tsx           ← slice-local
src/Shared/Components/Button.tsx           ← cross-slice primitive
```

File name = component name = export name. PascalCase. Use a named export (no `default`).

## Step 3 — Implement

```tsx
// src/Features/CreateUser/Form.tsx
import { cn } from '~/Shared/Lib/cn';

type Props = {
  busy?: boolean;
  className?: string;
};

export function Form({ busy = false, className }: Props) {
  return (
    <form
      className={cn('space-y-4 p-6', className)}
      aria-busy={busy}
    >
      <input
        name="email"
        type="email"
        required
        aria-label="email"
        className="w-full rounded border border-neutral-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Create'}
      </button>
    </form>
  );
}
```

### Rules

- **Function components only.** No class components, no `React.FC`.
- **Props are typed inline** as a `Props` type. JSDoc only when a prop's meaning isn't obvious from its name.
- **Accept `className`** and merge with `cn()` so callers can extend styling without overrides.
- **Default values for optional props** in the destructuring, not via `defaultProps`.
- **Accessible by default**: semantic HTML, `aria-*` attributes where needed, keyboard reachable, focus visible.
- **Tailwind classes only**. No inline `style={{}}`, no CSS modules, no styled-components.
- **Design tokens, not raw hex values**. If a colour / spacing token isn't in `tailwind.config.ts`, add it there before using it in the component.

## Step 4 — Import Boundaries

Slice-local components (`src/Features/<FeatureName>/*.tsx`) may import:

- ✅ `~/Shared/Components/*` — generic primitives
- ✅ `~/Shared/Lib/*` — pure helpers (`cn`, formatters)
- ✅ `~/Shared/Hooks/*` — cross-cutting hooks (debounce, viewport, …)
- ✅ `~/Shared/Domain/*` — domain types
- ✅ same-slice files (`./Handler`, `./Contract`, `./<SiblingComponent>`)
- ❌ `~/Features/<otherSlice>/*` — never. If you need it, lift to Shared.
- ❌ `~/Shared/Infrastructure/*` — UI never touches concrete adapters; the composition root wires them.

`Shared/Components/*` primitives may import:

- ✅ `~/Shared/Lib/*`, `~/Shared/Hooks/*`
- ❌ any domain type (no entity-shaped props — that's the test for "is this still generic?")
- ❌ any `~/Features/*`
- ❌ any `~/Shared/Infrastructure/*`

These mirror `dependency-rules.md`; they apply with no exception in the UI layer.

## Step 5 — Tests

A UI component test lives in the slice's `ui/` bucket:

```
tests/CreateUser/ui/Form.test.tsx
```

Follow `harness/knowledge/code-standards/ui/testing.md`: query by accessible role (`getByRole('button', { name: /create/i })`), simulate with `@testing-library/user-event`, one assertion per test as a soft rule.

## Step 6 — Hooks (if needed)

If the component manages state or fetches data, extract the hook:

- **Used by one component in this slice** → `src/Features/<FeatureName>/use<Thing>.ts` — flat, alongside the components.
- **Used across multiple slices** → before sharing, check whether the logic actually belongs in `Handler.ts` (with a thin per-slice wrapper hook). Lift to `Shared/Hooks/` only if the logic has zero domain knowledge.
- **Cross-cutting infrastructure** (debounce, viewport, network status) → `src/Shared/Hooks/use<Thing>.ts`.

Hooks return objects, not tuples — adding a new field is non-breaking.

## Step 7 — Run Checks

Execute `harness/skills/testing/run-code-checks.md`:

- `npm run typecheck` — catches type mismatches in props and imports
- `npm run lint` (if configured) — catches boundary violations and style nits
- `npm run build` — catches bundler-level errors (unresolved imports, circular deps) that typecheck alone misses
- `npm test` for the slice you're in

## Checklist

- [ ] Single `.tsx` file (no per-component directory)
- [ ] Placed correctly: slice-local in `src/Features/<X>/` (flat) or `src/Shared/Components/` if generic
- [ ] PascalCase file name = component name = named export
- [ ] Props typed inline as a `Props` type
- [ ] Accepts `className`; merges with `cn()` from `~/Shared/Lib/cn`
- [ ] Tailwind classes only; design tokens not raw hex
- [ ] Accessible (semantic HTML, ARIA, keyboard, focus visible)
- [ ] Test at `tests/<FeatureName>/ui/<ComponentName>.test.tsx`
- [ ] Import boundaries respected (no cross-slice, no Infrastructure)
- [ ] Hook co-located per the rule above if the component manages async state
- [ ] All checks pass (`typecheck`, `lint`, `build`, `test`)
