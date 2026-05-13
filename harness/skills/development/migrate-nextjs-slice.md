# Migrate Next.js Slice (single feature)

## When to use this skill

You have an existing Next.js (App Router) project with business logic living inside `src/app/<feature>/` and you want to lift **one feature at a time** into `src/features/<feature>/` per `persona-nextjs.md`. Each invocation handles a single feature on its own branch, with tests verifying nothing broke before commit. Other features in the codebase are not touched.

Use when:

- The onboarding audit (`/harness/init-harness`) flagged stack-specific drift for this feature, **or**
- Drift accumulated later and you want to clean it up, **or**
- You're iteratively rebalancing the codebase toward the persona contract.

Do **not** use when:

- The project uses Pages Router. This skill is App Router only (same scope as `persona-nextjs.md`).
- You want to migrate multiple features at once. Run the skill once per feature.
- The feature is already in `src/features/<feature>/` with no logic in `src/app/<feature>/`. Nothing to migrate.

## What you'll produce

- A branch named `refactor/migrate-<feature>-slice`.
- The slice's logic moved into `src/features/<feature>/{command.ts, handler.ts, view.tsx, ...}` per `persona-nextjs.md`.
- Thin transport shims in `src/app/<feature>/{page.tsx, actions.ts}` and `src/app/api/<feature>/route.ts` where applicable.
- All previously-passing tests still passing. Test scaffolding under `tests/<feature>/{api,boundary,integration,ui}/` if it didn't exist.
- One commit recording the migration.
- A short report to the human listing follow-ups that need human judgement.

## Scope and safety

- **One feature per invocation.** Never migrate multiple at once.
- **Read-only inspection first.** Confirm the migration plan with the human before any file mutation.
- **Tests are the gate.** If verification fails, stop and report — do not commit broken code.
- **No business-logic rewrites.** Extract existing schemas / handlers where they exist; do not invent them. If logic is tangled into JSX in a way that requires judgement to extract, stop and ask.
- **Do not modify `src/shared/`, do not modify other features.** If the slice cross-imports another feature, flag it and stop.
- **Do not push.** Commit on the branch; the human pushes after reviewing.

## Context

- `harness/skills/init/persona-nextjs.md` — authoritative source for the target shape. **Read it in full before mutating anything.**
- `harness/exec-plans/000-onboard/audit.md` (optional) — if a prior audit ran, its "Stack-specific drift" section may already list this feature's violations. Use as a starting inventory.
- `harness/knowledge/repo-architecture/vertical-slice-conventions.md` — generic slice contract.
- `harness/skills/development/commit-changes.md` — commit message conventions.

## Steps

### Step 1 — Confirm input

Ask the human:

- **Feature name** — the kebab-case folder name as it appears in `src/app/`, e.g. `users`, `create-user`. Use exactly the folder name; do not pluralise or transform.
- **Optional one-line note** — used in the commit message.

Validate:

```bash
test -d src/app/<feature> && echo "found" || echo "MISSING"
```

If the folder doesn't exist, list `src/app/` children and ask whether the user meant a different name. Do not proceed until a valid folder is confirmed.

If `src/app/<feature>/` contains **dynamic route segments** (`[id]`, `[slug]`, `(group)`) **or** nested route subfolders that themselves contain logic, stop. Tell the human: this skill handles one flat feature folder at a time; nested routes need a per-route decision the agent should not make automatically. Ask whether to treat the nested route as a separate feature or to migrate only the top-level files for now.

### Step 2 — Read the persona

Read `harness/skills/init/persona-nextjs.md` in full. The persona is the contract — every decision below must conform to it. Pay particular attention to:

- The **Discipline rules** section (`import "server-only";`, one Zod schema, no logic in `app/`, no `revalidatePath` inside `handler.ts`).
- The **Anti-patterns** section (the violations you are migrating *away from*).
- The **Role mapping** table (which file becomes which role in the target shape).

If the persona has been edited recently and conflicts with what's below, the **persona wins**. Tell the human about the conflict.

### Step 3 — Inventory the slice

List every file currently in scope:

```bash
find src/app/<feature> -maxdepth 1 -type f
find src/app/api/<feature> -maxdepth 1 -type f 2>/dev/null
find src/features/<feature> -type f 2>/dev/null     # may already partially exist
find tests/<feature> -type f 2>/dev/null
git grep -l "from ['\"].*<feature>" -- 'src/**' 'tests/**'   # callers that will need import updates
```

Read every file in `src/app/<feature>/` and `src/app/api/<feature>/`. Classify each:

| File pattern | Classification | Action |
|---|---|---|
| `page.tsx` containing only data fetch + render | **Pure transport** | Stays; may need refactor to the thin-RSC pattern |
| `page.tsx` containing data-fetch + business logic | **Mixed** | Extract logic to `features/<feature>/handler.ts`, leave thin RSC |
| `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `default.tsx`, `template.tsx` | **Routing primitives** | Stay; Next requires them at these paths |
| `route.ts` | **Transport (HTTP)** | Stays at `app/api/<feature>/route.ts`; refactor to thin shim if it has logic |
| `actions.ts` (`"use server"`) | **Transport (Action)** | Stays at `app/<feature>/actions.ts`; refactor to thin shim if it has logic |
| Tests (`*.test.*`, `*.spec.*`) | **Tests** | Move to `tests/<feature>/{api,boundary,integration,ui}/` per their role |
| Zod schema file (e.g. `schema.ts`, `<feature>-schema.ts`) | **Slice contract** | Move and rename to `src/features/<feature>/command.ts` |
| Logic file (`handler.ts`, `service.ts`, `<feature>-actions.ts` that's not `"use server"`, anything calling DB/external APIs) | **Slice logic** | Move and rename to `src/features/<feature>/handler.ts` |
| `<Component>.tsx` (not a Next routing primitive) | **View or sub-component** | Main view → `src/features/<feature>/view.tsx`; sub-components → flat kebab-case `.tsx` in the slice folder |
| Anything else | **Investigate** | Ask the human |

Note any **cross-feature imports** (the slice imports from another `src/features/<x>/` or another `src/app/<x>/`). Do **not** attempt to fix these automatically — flag them and stop the migration if they exist.

### Step 4 — Produce a migration plan

Write the plan to `harness/exec-plans/migrate-<feature>-slice/plan.md`:

```markdown
# Migrate <feature> slice

Generated: <YYYY-MM-DD>
Run by: `harness/skills/development/migrate-nextjs-slice.md`

## Feature
<feature> — <one-line note from Step 1>

## Inventory
<the Step 3 table for this feature>

## Move map

| Source | Target | Notes |
|---|---|---|
| `src/app/<feature>/page.tsx` | (stays) | Refactor to thin RSC |
| `src/app/<feature>/UsersList.tsx` | `src/features/<feature>/view.tsx` | Rename to view.tsx |
| `src/app/<feature>/user-schema.ts` | `src/features/<feature>/command.ts` | Rename to command.ts |
| `src/app/<feature>/create-user.ts` | `src/features/<feature>/handler.ts` | Add `import "server-only";`, strip `"use server"` if present, move `revalidatePath` to actions.ts |
| `src/app/api/<feature>/route.ts` | (stays) | Refactor to thin shim |
| `tests/<feature>-test.test.ts` | `tests/<feature>/integration/<feature>.integration.test.ts` | Place per test role |

## Decisions requiring human input
- ❓ <e.g. "two `.tsx` files look like candidate views — which is the main view.tsx?">

## Risks / non-trivial transforms
- <e.g. "handler.ts currently calls `revalidatePath('/users')` — will move that to actions.ts">
- <e.g. "page.tsx contains a `useState` — needs a `"use client"` child component, not a server component">

## Cross-feature imports
- <list any, with file/line — if present, migration is BLOCKED until resolved by human>
```

Show the plan to the human. **Wait for explicit approval.** Revise if requested. Do not proceed to Step 5 until the human says go.

If cross-feature imports were flagged, do not proceed at all — those must be resolved first (lift the shared piece to `src/shared/` via a separate task, then re-run this skill).

### Step 5 — Create the branch

```bash
git checkout -b refactor/migrate-<feature>-slice
```

If the branch already exists from a previous attempt, ask before reusing — usually best to delete the old branch first (`git branch -D refactor/migrate-<feature>-slice`) and start fresh, but confirm with the human.

### Step 6 — Execute the moves

Ensure target folders exist:

```bash
mkdir -p src/features/<feature> tests/<feature>/api tests/<feature>/boundary tests/<feature>/integration tests/<feature>/ui
```

For each entry in the approved move map, in this order:

1. **Move the schema file → `command.ts`** using `git mv` (preserves history). If the source file had a different name, rename during the move.

2. **Move the logic file → `handler.ts`**. Then edit:
   - Insert `import "server-only";` as the **first line** if not already present.
   - Remove a top-of-file `"use server"` directive if present (the handler is not a server action; that directive belongs in `app/<feature>/actions.ts`).
   - Find every `revalidatePath(...)` and `revalidateTag(...)` call. **Remove them from the handler** and record their locations and arguments — they move to the `actions.ts` shim in Step 7.
   - Find every reference to `cookies()`, `headers()`, `redirect()` from `next/*`. These are transport concerns. Remove them from the handler and record — they move to the transport shim.
   - Ensure the handler signature is `(cmd: <Command>, deps: { ... }) => Promise<...>`. If it currently reads from a `Request` or returns a `Response`, that's transport leakage — flag for the report (do not silently rewrite the signature; ask the human).

3. **Move view component(s)**. The chosen main view → `src/features/<feature>/view.tsx`. Sub-components → flat kebab-case `.tsx` files in `src/features/<feature>/` (no `components/` subdirectory; per persona).

4. **Move tests** to `tests/<feature>/{api,boundary,integration,ui}/` per their role:
   - Tests targeting `route.ts` or `actions.ts` → `api/`
   - Tests targeting Zod schemas (`command.ts`) → `boundary/`
   - Tests targeting the handler with fake adapters → `integration/`
   - Tests targeting the view / sub-components → `ui/`
   - Use `git mv` and rename to `<thing>.test.ts(x)` or `<thing>.integration.test.ts(x)` per `code-standards/ui/testing.md`.

5. **Update imports inside moved files** to use the `@/` alias and point at the new paths.

6. **Update imports in callers**. Find them:

```bash
git grep -l "from ['\"]@/app/<feature>/[^'\"]*['\"]"
git grep -l "from ['\"]\\.\\./<feature>/[^'\"]*['\"]"
git grep -l "from ['\"]\\.\\./\\.\\./app/<feature>/[^'\"]*['\"]"
```

For each match, rewrite the import to point at the new location (typically `@/features/<feature>/...`).

### Step 7 — Rebuild transport shims in `src/app/<feature>/`

After Step 6, the files in `src/app/<feature>/` may have orphaned imports or partial structure. Rebuild each per the persona.

#### 7a — `src/app/<feature>/page.tsx`

Must be a thin RSC that calls the handler and renders the view. Template:

```tsx
import { <FeatureView> } from "@/features/<feature>/view";
import { <listHandler> } from "@/features/<feature>/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export default async function Page() {
  const data = await <listHandler>({}, adapters);
  return <<FeatureView> data={data} />;
}
```

If the existing `page.tsx` did more than this (had inline JSX, conditional logic, etc.), rebuild it to this shape and put the JSX in the view. If the JSX is complex enough that the right split isn't obvious mechanically, **stop and ask the human** — do not invent a refactor.

If the page doesn't need server data (purely static), the page can be:

```tsx
import { <FeatureView> } from "@/features/<feature>/view";
export default function Page() { return <<FeatureView> />; }
```

#### 7b — `src/app/<feature>/actions.ts` (only if needed)

Create this file only if either:
- The slice has UI forms / mutations that callers will invoke (typically: there's a `<form action={...}>` somewhere in the view), **or**
- The handler had `revalidatePath` / `revalidateTag` calls recorded in Step 6.2.

Template:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { <Command> } from "@/features/<feature>/command";
import { <mutateHandler> } from "@/features/<feature>/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export async function <actionName>(formData: FormData) {
  const parsed = <Command>.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  await <mutateHandler>(parsed.data, adapters);
  revalidatePath("<the-path-that-was-being-revalidated>");
  return { ok: true };
}
```

Place the recorded `revalidatePath` / `revalidateTag` calls here, in the action, after the handler returns. Same for any `redirect()` / `cookies()` / `headers()` calls that were stripped from the handler — they go in the transport, near the call site.

If no UI mutation paths exist and no revalidation was recorded, do **not** create `actions.ts`.

#### 7c — `src/app/api/<feature>/route.ts` (only if it existed already)

If a `route.ts` was in the inventory, ensure it's now a thin shim:

```ts
import { NextResponse } from "next/server";
import { <Command> } from "@/features/<feature>/command";
import { <handler> } from "@/features/<feature>/handler";
import { adapters } from "@/shared/infrastructure/composition-root";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = <Command>.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const result = await <handler>(parsed.data, adapters);
  return NextResponse.json(result, { status: 201 });
}
```

Preserve the original HTTP methods (if the source had `GET`, keep `GET`). Do not introduce a `route.ts` that didn't exist — the persona allows skipping the REST shim when the feature has no public HTTP surface.

### Step 8 — Verify

Run, in order, and read each output:

```bash
npm run typecheck   # or: npx tsc --noEmit
npm test
npm run build       # full Next build — catches "use server" / server-only violations the typecheck misses
```

Diagnose any red:

- **Type errors** — almost always wrong import paths. Walk each one, fix.
- **Test failures** — read the failure:
  - Path / import issue → fix imports.
  - Behaviour change → there's a real bug in the migration. Diagnose and fix.
  - Test was testing the old internal structure → update the test to target the new structure (e.g. previously imported the handler via `@/app/<feature>/...`, now `@/features/<feature>/...`).
- **Build errors** — usually `server-only` flagged a client import. Trace the import chain and break it (e.g. the view imports the handler directly — wrong; the page should call the handler and pass data as props to the view).

If after a reasonable effort the slice doesn't go green, **stop and report**. Tell the human:

- Which checks failed.
- The shortest reproduction (one failing test name, or one type error).
- Your best guess at root cause.
- Where the migration is incomplete.

Do **not** commit broken code. If the migration is unsalvageable, the branch can be discarded:

```bash
git checkout main
git branch -D refactor/migrate-<feature>-slice
```

### Step 9 — Commit

Once typecheck, tests, and build are all green, stage and commit:

```bash
git add src/app/<feature>/ src/app/api/<feature>/ src/features/<feature>/ tests/<feature>/ harness/exec-plans/migrate-<feature>-slice/
git commit
```

Commit message (per `harness/skills/development/commit-changes.md`):

```
refactor(<feature>): migrate slice from app/ to features/

Lift <feature> logic out of src/app/<feature>/ into src/features/<feature>/
per persona-nextjs.md. src/app/<feature>/ retains only Next routing
primitives (page.tsx, actions.ts) as thin transport shims.

Tests pass. Build clean. No behaviour change intended.
```

If the human gave a one-line note in Step 1, weave it into the body.

Do **not** push without explicit human confirmation. Pushing decisions live with the human.

### Step 10 — Report

Tell the human in a short summary:

- **Branch:** `refactor/migrate-<feature>-slice`
- **Moved:** N files, K imports rewritten
- **Created shims:** which of `page.tsx` / `actions.ts` / `route.ts` were rebuilt
- **Flagged for follow-up** (anything that needs human judgement, not auto-fixed):
  - Cross-feature imports (if any survived to Step 6 — should not happen, but list)
  - JSX-embedded logic that needs extracting by hand
  - Tests that target removed internal structure and need rewriting
  - `Request` / `Response` types in handler signatures
- **Next steps:**
  - Review the diff (`git diff main..refactor/migrate-<feature>-slice`).
  - Push when ready (`git push -u origin refactor/migrate-<feature>-slice`).
  - Optionally run `/harness/003-2-review-local` for a 4-persona review before push.
  - Run `/harness/init-harness` again later if you want a fresh audit — the "Stack-specific drift" section should now be shorter for this feature.

## Done

- Single feature migrated. Other features untouched.
- `src/features/<feature>/` contains the slice. `src/app/<feature>/` contains only Next routing primitives as thin shims.
- All tests pass. Build is clean.
- Single commit on a `refactor/migrate-<feature>-slice` branch.
- The human has a clear list of any items that need their judgement.

If the human wants to migrate another feature, they re-invoke this skill with the next feature name. Each run is independent — they can review, test, and ship migrations slice-by-slice without batching.
