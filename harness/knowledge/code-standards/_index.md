# Code Standards — Quick Reference

Read only the file(s) relevant to the task at hand. Do not front-load all files.

| I'm about to... | Read |
|---|---|
| Name a variable, function, file | `code-standards/naming-conventions.md` |
| Make a design trade-off (when in doubt) | `code-standards/design-principles.md` |
| Handle or propagate errors | `code-standards/error-handling.md` |
| Create a git branch | `code-standards/branch-naming.md` |
| Check what's allowed to import what | `repo-architecture/dependency-rules.md` |
| Understand the overall code layout | `repo-architecture/overview.md` |
| Add a feature (where do files go?) | `repo-architecture/vertical-slice-conventions.md` |
| Capture a load-bearing architectural decision | `architecture-decision-records/ABOUT.md`, skill: `harness/skills/planning/write-adr.md` |
| Look up domain language | `domain/ubiquitous-language.md`, `domain/entities.md` |

Stack-specific files (e.g. `typescript-and-zod.md`, `ui/react-patterns.md`, `backend/api-conventions.md`) are added by the stack persona at design time. If a row above references a file that doesn't exist in this project, the stack didn't ship one — defer to general principles or open an ADR.
