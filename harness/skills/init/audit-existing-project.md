# Audit Existing Project

## When to use this skill

You are called by `harness/skills/init/init-harness.md` after the human has confirmed they are grafting the harness onto an existing project. Your output seeds the domain knowledge step that follows.

**This skill is read-only.** You only inspect — no edits to source code, no renames, no auto-fixes. Output a single `audit.md` file under `harness/exec-plans/000-onboard/` and return.

## What you produce

`harness/exec-plans/000-onboard/audit.md` with five sections:

1. Detected stack.
2. Detected domains.
3. Architecture shape classification.
4. Branch-naming compliance.
5. Naming-convention drift.

## Steps

### Step 1 — Create the output directory

```bash
mkdir -p harness/exec-plans/000-onboard
```

If `audit.md` already exists, ask the caller whether to overwrite. Default to no — if no, return and let the caller decide.

### Step 2 — Detect the stack

Inspect manifest files to determine language, framework, and package manager:

| File | Tells you |
|------|-----------|
| `package.json` | Node / TypeScript / JS — read `dependencies`/`devDependencies` to spot React, Vue, Next, Vite, etc. |
| `pyproject.toml`, `requirements.txt` | Python — look for Django, FastAPI, Flask |
| `go.mod` | Go — look for gin, fiber, echo in `require` |
| `*.csproj`, `*.sln` | C# / .NET — look for `Microsoft.AspNetCore.*` |
| `Cargo.toml` | Rust — look for axum, actix |
| `pom.xml`, `build.gradle` | Java / Kotlin — look for spring-boot, ktor |
| `Gemfile` | Ruby — look for rails, sinatra |

Record one line: language, framework (if identifiable), package manager.

### Step 3 — Detect domain nouns

Scan folder and file names under `src/`, `app/`, or whatever the project's source root is. You are looking for **domain nouns** — singular nouns that represent business concepts.

Run a few greps to build a candidate list:

```bash
find src app -type d -maxdepth 4 2>/dev/null | awk -F/ '{print $NF}' | sort -u
```

Filter out generic technical names: `components`, `utils`, `lib`, `services`, `controllers`, `models`, `repositories`, `infrastructure`, `shared`, `core`, `helpers`, `types`, `hooks`, `pages`, `routes`, `api`, `tests`, `__tests__`, `node_modules`.

Also scan `README.md` (if present) for capitalised nouns that appear in feature descriptions.

Output up to 15 candidates. Do not invent — only list nouns that actually appear in the codebase or README.

### Step 4 — Classify the architecture shape

Look at the structure under the source root. Match against these patterns:

| Pattern | Shape |
|---------|-------|
| `src/features/<x>/`, `Features/<X>/` (.NET), `src/app/<x>/` (Next.js App Router) — per-feature folders that own multiple concerns | **vertical slices** (run the persona-based drift check below for stack-specific anti-patterns inside the slice) |
| `src/{controllers,services,repositories}` or `app/{routes,services,models}` (sibling layer folders, code grouped by technical role) | **n-tier** |
| `domain/`, `application/`, `infrastructure/` (ring layout) | **onion / hexagonal** |
| Source files mostly flat under `src/`, no obvious grouping | **flat** |
| Multiple patterns coexist | **mixed** — record which patterns appear where |
| None of the above | **unclassified** — describe what you do see |

For each classification, also flag **drift**: places where the detected shape doesn't hold. For example, "Mostly vertical slices, but `src/utils.ts` is a bucket of unrelated helpers that several slices import — violates cross-slice isolation."

### Step 4b — Persona-based drift check (stack-specific)

After the generic classification above, check whether a stack persona exists for the detected stack:

```bash
ls harness/skills/init/persona-*.md
```

Match the detected stack against persona filenames and first headings. If exactly one persona matches (e.g. detected stack is "Next.js" → `persona-nextjs.md`), **read the persona file in full** and treat its **"Anti-patterns"** and **"Discipline rules"** sections as the stack-specific drift contract.

Then scan the codebase for violations of *those specific rules* and list them as stack-specific drift.

For example, when `persona-nextjs.md` matches, the audit walks each `src/app/<feature>/` and `src/features/<feature>/` folder and checks the persona's rules — e.g. files inside `src/app/<feature>/` that aren't Next routing primitives (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `actions.ts`), or `handler.ts` files missing `import "server-only";` on the first line, or Next cache primitives (`revalidatePath`, `revalidateTag`) called inside `handler.ts`. The persona is the authoritative source; this skill never inlines its rules.

Record each violation under a new audit section **"Stack-specific drift (`<persona>`)"** with:
- The rule violated (quoted from the persona).
- The file or location.
- A one-line "what to do" pointer (e.g. "lift logic into `src/features/<x>/handler.ts`; leave `src/app/<x>/` as a transport shim").

Also read the persona's **`## Remediation`** section (if present). It names the skill that fixes violations of this persona — quote it once at the top of the "Stack-specific drift" section so the human can navigate from the audit to the fix. If the persona has no `## Remediation` section, omit; do not invent one.

If no persona matches the detected stack, skip this step and note in the audit: *"No stack persona available for `<stack>` — stack-specific drift not checked."*

This skill remains read-only. Do not auto-fix anything.

### Step 5 — Branch-naming compliance

List local and remote branches:

```bash
git branch -a --format='%(refname:short)' | grep -v '^HEAD' | sed 's|^origin/||' | sort -u
```

For each branch (excluding `main`, `master`, `develop`), check whether it matches `<type>/<short-desc>` where `<type>` is one of `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf` (see `harness/knowledge/code-standards/branch-naming.md`).

Record:

- Total branches considered.
- Number compliant.
- Compliance percentage.
- A list of up to 10 non-compliant branch names.

Do **not** rename or delete anything.

### Step 6 — Naming-convention drift

Sample source files for compliance with `harness/knowledge/code-standards/naming-conventions.md`. Universal checks:

- File names should be `kebab-case` (with extension): `order-service.ts`, not `OrderService.ts` or `orderService.ts`. Exception: stacks that mandate other casing (C# PascalCase, Java files matching class name) — the persona's override applies; flag those as conformant.
- Test files should follow `<thing>.test.<ext>` or `<thing>.integration.test.<ext>`.

Sample 20 source files; tally how many match each rule. Record:

- File-casing compliance: `N of 20 sampled`.
- Test-naming compliance: `N of M sampled tests`.
- A list of up to 10 violating filenames (per check).

Do not rename anything.

### Step 7 — Write the audit

Write `harness/exec-plans/000-onboard/audit.md` with this shape:

```markdown
# Onboarding Audit

Generated: <YYYY-MM-DD>
Run by: `harness/skills/init/audit-existing-project.md`

## Detected stack

- **Language:** <language>
- **Framework:** <framework or "none detected">
- **Package manager:** <manager>
- **Notable libraries:** <list>

## Detected domains

Candidate domain nouns extracted from folder/file names and README:

- `<noun>` — source: <where it was found>
- ...

These are *candidates*. The human confirms or corrects in the next step (seed-domain-knowledge).

## Architecture shape

**Classification:** <vertical slices | n-tier | onion | flat | mixed | unclassified>

<one-paragraph description of what's actually in the source tree>

### Drift

<places where the classification doesn't hold; e.g. a "shared bucket" or cross-slice import>

## Stack-specific drift (`<persona>` or "not checked")

<If a stack persona matched in step 4b:

- First line: quote the persona's `## Remediation` pointer (the skill that fixes these violations), if the persona has one. Skip if the persona doesn't declare one.
- Then list each violation: quote the rule from the persona, name the file, give a one-line "what to do" pointer.

If no persona matched, write: "No stack persona available for `<stack>` — stack-specific drift not checked.">

## Branch-naming compliance

- **Branches considered:** <N>
- **Compliant:** <N> (<percentage>%)
- **Non-compliant examples:** `<branch>`, `<branch>`, ... (up to 10)

Reference: `harness/knowledge/code-standards/branch-naming.md`.

## Naming-convention drift

- **File casing (kebab-case):** <N of 20 sampled> conformant
  - Violations: `<file>`, `<file>`, ...
- **Test naming (`.test.<ext>`):** <N of M sampled> conformant
  - Violations: `<file>`, `<file>`, ...

Reference: `harness/knowledge/code-standards/naming-conventions.md`.

## Recommended next steps

- <e.g. "Rename 3 non-compliant branches" — explicit list>
- <e.g. "Fix file-casing on the 7 listed files">
- <e.g. "Open ADR-0001 capturing why the project uses onion architecture instead of the vertical-slice default">

These are suggestions. The human triages and decides which to address via `/harness/001-plan`.
```

### Step 8 — Return

Tell the caller: "Audit complete. Findings written to `harness/exec-plans/000-onboard/audit.md`." Return.

## Done

`audit.md` exists with all five sections populated. No source files have been edited. The caller now has the information needed to seed domain knowledge and present drift findings to the human.
