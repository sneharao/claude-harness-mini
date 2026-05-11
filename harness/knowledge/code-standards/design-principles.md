# Design Principles

Principles for design trade-offs across the whole codebase. Consult when choosing between approaches or evaluating whether code is well-structured. These are language-agnostic; stack-specific rules layer on top via the chosen persona.

## Code Quality Values

- **Readability over cleverness.** Code is read more than written.
- **Type safety.** Functions are fully typed for parameters and return values.
- **Composition over inheritance.** Prefer composing small pieces over class hierarchies.
- **Easy to Change (ETC).** Between two approaches, pick the one that's easier to change later. This is the meta-principle behind the rest.

### Immutability by Default

Default to immutable bindings (`const`, `final`, `val`). Reach for mutation only when it's genuinely unavoidable and tightly encapsulated. If you find yourself reaching for a mutable variable, try restructuring first — extract a function, use a ternary, return early.

## Functions

### Small, One Level of Abstraction

A function does one thing. Statements within a function operate at the same level of abstraction, reading top-to-bottom like a narrative (the Step-Down Rule).

### Name the Business Rule, Not the Mechanics

When code encodes a business rule, the reader should recognise *which* rule without tracing the implementation. Extract named functions so the call site reads as the domain question, not the boolean algebra.

The litmus test: can someone unfamiliar with the implementation read the call site and understand the domain intent? If they have to open the body to learn what the code *decides*, the abstraction boundary is in the wrong place.

### Extract Till You Drop

If you can pull out a meaningful sub-function, do. Short functions with descriptive names replace comments.

### Guard Clauses

Replace nested conditionals with early returns for special cases. Flatten the happy path.

### Parameter Object

When a function takes more than four parameters that logically belong together, wrap them in a typed object.

## Structure

### Shy Code — Reveal Little, Depend on Little

Modules expose as little as possible and depend on as few things as possible. A change in one module should not force changes in unrelated modules.

- Make things `private` / file-local by default; widen only when a concrete consumer requires it.
- Don't export a symbol "in case something needs it later" — that's speculative generality.

### YAGNI

Don't build abstractions, hooks, or parameters "in case we need them someday." If there's no current use, don't add it. Speculative generality is one of the most common sources of unnecessary complexity.

### Comments as Deodorant

A comment explaining confusing code is a signal to rewrite the code, not to document the confusion. Good code is its own documentation. Comments should explain *why*, not *what*.

### Design by Contract

Functions should have clear preconditions, postconditions, and invariants. In typed languages this translates to strict input types and runtime guards at boundaries.

### Transform Programming

Think of programs as pipelines that transform data. Each step takes input, produces output, the next step takes over. This is cleaner than deeply nested control flow.

### Replace Conditional with Polymorphism

Long switch / if-else chains on type discriminators should become polymorphic types with per-variant behaviour. Especially relevant when the language supports discriminated unions.

## Boundaries

### Wrap Third-Party Interfaces at the Edge

Don't scatter direct calls to third-party libraries throughout the codebase. Define your own interface for the capability you need; wrap the third-party call in one adapter; depend on the interface everywhere else. This is what keeps libraries swappable, mockable, and contained from breaking changes.

The exception: pure in-process computation libraries (date math, schema validation, functional primitives, crypto) are fine to import directly. The rule applies to libraries that mediate a conversation with something outside the process — HTTP clients, database drivers, LLM SDKs, message bus clients.

### Fail Fast at System Boundaries

Validate input at entry points (API routes, message handlers, CLI args). Once data crosses into the rest of your code, it should already be valid and typed.

## Code Layout

### Vertical Ordering

Higher-level functions appear first, called functions appear below. Read a file top-to-bottom like a newspaper: headline, then details.

### Vertical Proximity

Concepts that are closely related should be vertically close in the source file. Don't make the reader jump around.
