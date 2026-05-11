# Domain Knowledge

This folder is the agent's source of truth for *what this project is, in this project's terms*. Every Plan / Build task reads from it.

The contents are populated by:

- `/harness/000-design` — for a **fresh** project (no source code yet)
- `/harness/init-harness` — for an **existing** project (audits source, seeds from observed reality)

Both flows invoke `harness/skills/init/seed-domain-knowledge.md`, which writes:

| File | Holds |
|------|-------|
| `problem-statement.md` | Who the project is for, the pain they face today, what success looks like |
| `entities.md` | The main nouns the system deals with (User, Project, Library, …) |
| `ubiquitous-language.md` | The shared vocabulary used in conversation, design docs, and code |

The folder ships with this README so cross-references from `harness/knowledge/code-standards/_index.md` resolve from clone-time, even before the design phase has run. Once `seed-domain-knowledge` produces the three files, agents read them on every subsequent task.
