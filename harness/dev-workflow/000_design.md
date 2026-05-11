# 000 — Design

## What This Is

A set of instructions you must adopt and execute. When told to read and execute this file, you become the Design Agent. Run **once per project**, at the start, before any feature work.

For an *existing* project (you ran `rsync --ignore-existing` to graft the harness onto a codebase that already has source), do not run this — run `/harness/init-harness` instead. That skill audits the existing code and seeds the same knowledge files from observed reality.

## Purpose

Produce the project-level knowledge files the agent needs to work accurately:

- The problem the project solves.
- The entities (nouns) it deals with.
- The ubiquitous language — terms with definitions.
- The architecture shape (default: vertical slices + shared kernel).
- The stack (via a persona) — `package.json` (or equivalent), stack-specific code-standards.

The output is a set of `.md` files under `harness/knowledge/domain/` and a bootstrapped stack. After this stage, every feature goes through Plan → Build → Review.

## Context

- `harness/knowledge/repo-architecture/overview.md` — vertical-slice + shared-kernel default.
- `harness/knowledge/repo-architecture/vertical-slice-conventions.md` — per-slice contract.
- `harness/knowledge/architecture-decision-records/ABOUT.md` — how to capture an architecture override.
- `harness/skills/init/seed-domain-knowledge.md` — the sub-skill that writes the three domain files.
- `harness/skills/init/persona-*.md` — available stack personas.

## Steps

### Step 1 — Verify Edit-Capable Mode

Confirm your runtime supports writing files and running shell commands. If not, switch before proceeding.

### Step 2 — Confirm Project Is Fresh

Check whether the project already has source code:

```bash
ls -la src/ 2>/dev/null
ls -la app/ 2>/dev/null
```

If a populated `src/`, `app/`, or equivalent is present, stop and tell the human:

> This looks like an existing project. Run `/harness/init-harness` instead — it audits the existing code and seeds knowledge from what's there.

Only proceed when the project is genuinely fresh (no source code yet, just the harness).

### Step 3 — Collect Project Identity

Ask the human:

- Project name (one short phrase, used as the title in knowledge files).
- One-line tagline (what the project is, in plain English).

Do not write anything yet — these are inputs for the next steps.

### Step 4 — Seed Domain Knowledge

Read and execute `harness/skills/init/seed-domain-knowledge.md` in full. That skill produces:

- `harness/knowledge/domain/problem-statement.md`
- `harness/knowledge/domain/entities.md`
- `harness/knowledge/domain/ubiquitous-language.md`

It is an interactive conversation with the human. Do not invent answers — surface ambiguity and ask. When the skill returns, confirm the three files exist and the human is satisfied with their content.

### Step 5 — Confirm Architecture Shape

Show the human the default architecture:

> **Default: vertical slices + shared kernel.** Each feature is one folder owning endpoint + command + handler + UI (if applicable) + its own tests. Shared kernel holds entities (`domain/`), ports (`abstractions/`), and adapters (`infrastructure/`). Read `harness/knowledge/repo-architecture/overview.md` for the full picture.

Ask: *Stick with this default, or override?*

- **Stick with default** (recommended for new projects) → proceed to Step 6.
- **Override** (e.g. starting from a known onion/hex layout, or an unusual stack constraint) → stop here, read and execute `harness/skills/planning/write-adr.md` to record the override decision as ADR-0001 *before* any code goes in. The ADR is the project's record of why it diverges from the default. Then return here.

### Step 6 — Pick Stack Persona

List available personas:

```bash
ls harness/skills/init/persona-*.md
```

Show the human the options. Each persona declares the stack it bootstraps (read the persona's front matter or first heading). Ask the human which one to apply.

If no listed persona fits, stop and tell the human:

> No persona matches the requested stack. Either pick the closest existing persona and we'll adjust afterwards, or add a new `persona-<stack>.md` first. I won't fabricate one.

### Step 7 — Execute Persona

Read the chosen persona file in full. Execute its instructions:

- Materialise files declared in `### Output → <path>` blocks (typically `package.json`, stack-specific code-standards files like `typescript-and-zod.md` or `ui/react-patterns.md`, framework config).
- Merge any `### Merge into package.json` blocks into the existing `package.json` (if one was created by an earlier persona step).
- Install dependencies if the persona declares them and the human approves (do not run package-manager commands without confirmation).
- Note any **layout override** the persona declares (e.g. Next.js places features under `app/`) — this is the persona authoritatively shaping the project structure, see [`vertical-slice-conventions.md` § Stack Overrides](../knowledge/repo-architecture/vertical-slice-conventions.md#stack-overrides).

### Step 8 — Initialise Source Tree

Create the empty top-level directories implied by the architecture shape. Default vertical-slice + shared kernel:

```bash
mkdir -p src/features src/shared/domain src/shared/abstractions src/shared/infrastructure tests designs
```

If the persona overrides the layout, use the persona's paths instead. Do not pre-create per-feature folders — those land when the first feature is planned.

### Step 9 — Commit

Stage and commit the design output:

```bash
git add harness/knowledge/domain/ harness/knowledge/architecture-decision-records/ package.json src/ tests/ designs/
git commit
```

Use a commit message that captures the design output, per `harness/skills/development/commit-changes.md`. Push if a remote is configured.

### Step 10 — Summary

Tell the human:

- Which domain files were written.
- Which architecture default was confirmed (or which ADR records the override).
- Which persona was applied.
- What to run next: `/harness/001-plan` for the first feature.

## Done

The project has:

- Domain knowledge files committed (`problem-statement`, `entities`, `ubiquitous-language`).
- Architecture default confirmed (or an ADR recording the override).
- Stack bootstrapped via the chosen persona.
- An initial source tree.
- A commit on the default branch (or a `design/initial-setup` branch — the persona may direct).

The human can now run `/harness/001-plan` to plan the first feature.
