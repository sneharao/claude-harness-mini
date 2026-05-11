# Seed Domain Knowledge

## When to use this skill

You are called by either:

- `harness/dev-workflow/000_design.md` — for a **fresh project**, no source code yet. Inputs come entirely from the human.
- `harness/skills/init/init-harness.md` — for an **existing project**, after `audit-existing-project.md` has produced findings. Inputs are *seeded* from the audit and the human confirms or corrects.

The output is the same in either case:

- `harness/knowledge/domain/problem-statement.md`
- `harness/knowledge/domain/entities.md`
- `harness/knowledge/domain/ubiquitous-language.md`

These three files are what makes the agent able to talk about *this* project in *this* project's terms.

## Inputs

| Input | Source for fresh project | Source for existing project |
|-------|--------------------------|------------------------------|
| Problem statement | Human, fresh conversation | Human, with prompt seeded from `README.md` if present |
| Entity list | Human | Seeded from audit findings (detected nouns), then human confirms |
| Term definitions | Human, asked one entity at a time | Seeded from audit findings, then human confirms |

If you are running for an existing project, **read `harness/exec-plans/000-onboard/audit.md` first** — its "Detected domains" section is the seed list. If that file is missing, stop and tell the caller to run the audit skill first.

## Steps

### Step 1 — Problem Statement

Ask the human (or pre-fill from `README.md` if it exists and offer it for editing):

> Who is this project for, what painful thing are they trying to do today, and what does success look like in one or two sentences?

You are looking for three short paragraphs:

- **Who** — the user / actor / persona.
- **Pain** — what is broken or missing for them today.
- **Success** — what the world looks like when the project is doing its job.

Do not invent. If the human is vague, ask follow-up questions until each paragraph would mean the same thing to a stranger.

Write to `harness/knowledge/domain/problem-statement.md`:

```markdown
# Problem Statement

## Who this is for

<one paragraph — the user or actor>

## The pain today

<one paragraph — what is broken / missing>

## What success looks like

<one paragraph — what changes when the project is doing its job>

---

*Authored during the design phase. Update via an ADR if the answer materially changes after the project ships.*
```

### Step 2 — Entity Inventory

For a fresh project, ask:

> What are the main nouns this project deals with? Things the user creates, sees, or acts on; things the system tracks. List them — no need for definitions yet, just names.

For an existing project, present the audit's detected nouns and ask:

> The audit found these candidates: `<list>`. Which are real domain entities? What's missing?

You are looking for a flat list of 3–15 nouns. Avoid:

- Implementation details (`Database`, `Queue`, `Cache`) — those are not domain entities.
- Synonyms (`Customer` vs `Account` vs `User` — pick one).
- Plural forms (`Users` vs `User` — singular).

Write to `harness/knowledge/domain/entities.md`:

```markdown
# Entities

The main nouns this project deals with. One line per entity; the *who/what*, not the *how*.

| Entity | One-line description |
|--------|----------------------|
| <Name> | <what it is, in plain English> |
| <Name> | ... |
```

If the human gives you more than 15 entities, push back: "That's a lot — are some of these attributes of others, or are we actually two projects?" Resolve before writing.

### Step 3 — Ubiquitous Language

For each entity, ask the human (or seed from audit findings and ask to confirm):

- The **definition** (one sentence, in domain terms — not implementation).
- A **synonym** the team should *not* use, if one is a common trap.

Also collect any **verbs** that appear repeatedly in the conversation (e.g. "upload", "embed", "cite") and define them too. Verbs often carry domain meaning that gets lost when re-named in code.

Write to `harness/knowledge/domain/ubiquitous-language.md`:

```markdown
# Ubiquitous Language

The shared vocabulary used in conversation, design docs, and code for this project. When a concept appears here, **use this term — not a synonym**. Update via an ADR if the meaning shifts.

## Entities

| Term | Meaning | Do NOT use |
|------|---------|------------|
| <Entity> | <one-sentence definition> | <synonym to avoid, or "—"> |

## Verbs

| Term | Meaning | Do NOT use |
|------|---------|------------|
| <verb> | <one-sentence definition> | <—> |

## Other

| Term | Meaning | Do NOT use |
|------|---------|------------|
| <noun or phrase> | ... | ... |
```

If the project has no entries for a section, omit that section entirely. Do not ship empty tables.

### Step 4 — Confirm Output

Read all three files back to the human. Ask for explicit confirmation, or capture corrections and re-write. Iterate until the human says they're done.

## Done

Three files exist under `harness/knowledge/domain/` with non-empty, human-confirmed content. Control returns to the caller (`000_design.md` or `init-harness.md`).
