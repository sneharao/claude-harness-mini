# Branch Naming

Every working branch in this project follows the same shape.

## Pattern

```
<type>/<short-desc>
```

- `<type>` — one of the conventional commit types below
- `<short-desc>` — kebab-case, 2–5 words describing the work
- Total length: aim for ≤ 50 characters

## Types

| Type | Use for |
|------|---------|
| `feat` | A new user-facing capability |
| `fix` | A bug fix |
| `refactor` | Internal restructuring with no behaviour change |
| `chore` | Tooling, config, dependencies, build scripts |
| `docs` | Documentation only |
| `test` | Tests only |
| `perf` | Performance improvements |

## Examples

```
feat/login-screen
feat/order-export-csv
fix/cart-total-rounding
refactor/extract-currency-helpers
chore/upgrade-vite-7
docs/setup-readme
test/checkout-edge-cases
```

## Rules

- One branch per planned feature or fix — keep the unit of work small.
- The short description must be specific enough to remember at a glance. `feat/improvements` is too vague; `feat/order-filter-by-date` is fine.
- Do not include ticket numbers in the branch name unless your project requires it — the commit body or PR description is a better home.
- Never push to `main` directly. Always merge via PR (or fast-forward from an approved local branch).
- Delete merged branches locally and on origin to keep the branch list clean.

## Mapping to commits

The branch type sets the expected commit `Type:` tag (see `harness/skills/development/commit-changes.md`). A `feat/*` branch should produce one or more commits whose `Type:` line is `feat`. Mixed types on one branch is a smell — consider splitting.
