# Error Handling

Universal principles for handling errors. Stack-specific patterns (Zod parse errors, React Router error boundaries, Effect/Result types) are added by the chosen persona — see `code-standards/typescript-and-zod.md` and `code-standards/ui/react-patterns.md` if those files exist.

## Provide Context with Exceptions

Every thrown error should carry enough information to determine the source and nature of the failure: what operation was attempted, and why it failed. Bare `throw new Error("invalid")` forces the reader to grep for the source.

## Don't Return Null

Returning `null` forces every caller to add a null check, and one missed check is a runtime crash. Prefer:

- An empty collection (`[]`, `Map<>`) when "no results" is meaningful.
- A discriminated union (`Result<T, E>`, `Option<T>`) when the language supports it.
- A thrown error if the situation is exceptional.

## Don't Pass Null

Don't accept `null` as an argument unless the API explicitly allows it. Forbid it and fail fast at the boundary.

## Define Exceptions by Caller Reaction

Don't create one exception class per possible failure cause. Group them by how the *caller* needs to react: `NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`. The caller decides how to respond to a category; the message carries the specifics.

## Fail Fast at System Boundaries

Validate all input at entry points (API routes, message handlers, CLI args, file readers). Once data crosses into the rest of your code, it should already be valid and typed. Don't sprinkle "just in case" checks deeper in.

## Translate at Module Edges

Catch and translate errors at module boundaries. Internal errors should not leak their representation into API responses or callers in other modules. Map them explicitly to whatever the boundary's contract is.

## Never Swallow Silently

If you catch an error, either:

- Handle it (recover, retry, fall back) **and** log the original.
- Re-throw it (possibly wrapped with extra context).
- Translate it (e.g. domain error → HTTP response) **and** log if appropriate.

A `catch (e) {}` with an empty body is a bug.

## Logging at Failure Points

Log errors with context at the point you handle them. The log entry should answer: *what operation failed, with what inputs, and what was the underlying cause?* When a structured logger is wired up for the project, document the integration in `harness/knowledge/infra/` (or whatever path the project uses) and update this file with the chosen pattern.
