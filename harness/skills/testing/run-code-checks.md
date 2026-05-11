# Run Checks

Run all local verification checks to confirm the code compiles, passes tests, and builds cleanly. This skill is referenced by the build stage (`002_build.md`).

---

## Check Suite

Run all three before considering code verified.

### 1. Type Checking

```bash
npm run typecheck
```

Runs `tsc --noEmit` (and any framework-specific typegen, like `react-router typegen`). Must exit with code 0 and produce no errors.

Common failures:
- Missing imports after adding new files.
- Mismatched types between schemas and TypeScript interfaces.
- Stale references to renamed or deleted exports.

### 2. Build Verification

```bash
npm run build
```

Runs the production build (Vite/Rollup or your bundler of choice). Must exit with code 0.

This catches failure classes that `tsc` does not: unresolved import aliases, dynamic imports that can't be statically analysed, SSR/client boundary violations, env vars required at build time, and circular dependencies that break tree-shaking. A failing `build` blocks deploy.

### 3. Tests

```bash
npm run test
```

Runs the test suite once (Vitest by default in this template). Picks up `tests/**/*.test.ts` and `tests/**/*.integration.test.ts`. Must exit with code 0.

For TDD work, use `npm run test:watch`. For coverage, use `npm run test:coverage`.

### 4. Smoke Run (optional)

```bash
npm run dev
```

Starts the dev server. Useful as a smoke check before committing — confirm the app boots without runtime errors. See `harness/skills/development/run-app-in-browser.md` for the full browser flow.

---

## Planned (added when adopted)

These commands are not present in `package.json` by default. They will be added — and this document expanded — once the relevant tooling is chosen:

- **Formatting** (e.g. Prettier) — `npm run format`, `npm run format:check`
- **Linting** (e.g. ESLint with typed-linting and `eslint-plugin-boundaries`) — `npm run lint`, `npm run lint:fix`
- **End-to-end tests** — `npm run test:e2e`

When you wire any of these in, update this file with the command, what it covers, and how to interpret typical failures.

---

## Interpreting Failures

### Type check failures

Read the error output carefully — `tsc` reports file, line, and expected vs actual type. Fix at the source. Do not use `as any` or `@ts-ignore` to suppress errors.

### Build failures

Build failures usually surface as Vite/Rollup errors with a file and import path. Common causes: an alias unresolved by the bundler (check `vite.config.ts`), a server-only module imported into a client bundle (or vice versa), a missing build-time env var, or a top-level side effect that can't be statically analysed. Reproduce locally with the exact CI command — `npm run dev` uses different module resolution and won't catch these.

---

## Rules

- All available checks (`typecheck`, `build`, `test`) must pass before committing.
- Do not suppress type errors with `as any` or `@ts-ignore`.
- Do not `.skip()` failing tests to make the suite pass.
- If a pre-existing failure is unrelated to your change, flag it — do not silently ignore it.
