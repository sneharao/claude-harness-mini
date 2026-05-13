# Naming Conventions

Universal naming rules that apply regardless of language or framework. Stack-specific naming (e.g. React component file casing, Python module structure) is layered on top by `init-harness` per the chosen persona.

## Identifiers

| Kind | Case | Example |
|------|------|---------|
| Types, classes, interfaces, enums | `PascalCase` | `OrderService`, `CustomerId`, `OrderStatus` |
| Functions and methods | `camelCase` | `placeOrder`, `getCustomerById` |
| Variables (local and module-level) | `camelCase` | `currentUser`, `pendingOrders` |
| Constants (compile-time, top-level) | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_TIMEOUT_MS` |
| File and directory names | `kebab-case` | `order-service.ts`, `place-order.test.ts` |
| Boolean values | `is` / `has` / `should` / `can` prefix | `isActive`, `hasUnsavedChanges` |
| Async functions | imperative verb, no `Async` suffix | `fetchOrders`, not `fetchOrdersAsync` |
| Test files | `<thing>.test.<ext>` or `<thing>.integration.test.<ext>` | `order-service.test.ts` |

> **Stack overrides:** the **file and directory** row is the only one a stack persona may override. For example, `skills/init/persona-react-vite.md` uses PascalCase for component files (`CreateUser.tsx`) and feature folders (`src/Features/CreateUser/`), following React community convention. `skills/init/persona-nextjs.md` keeps kebab-case because Next's filesystem routing turns folder names into URLs. The identifier rows (types, functions, constants, etc.) are universal — personas do not override them.

## Interfaces

- **No `I` prefix.** Write `OrderRepository`, not `IOrderRepository`. The hungarian-style prefix is a relic of older codebases — modern type systems make it redundant.
- Suffix interfaces with their **role** when ambiguity exists: `OrderRepository` (port), `OrderService` (use case), `OrderDTO` (transport).

## Functions

- **Verb-first.** `placeOrder`, `validateCart`, `loadConfig`.
- **Boolean-returning functions** use the same boolean-prefix rule: `isExpired(order)`, `hasInventory(sku)`.
- **Side-effect markers** — if a function mutates external state in a non-obvious way, name reflects it: `saveOrder` not `process`, `evictCacheFor(key)` not `clean(key)`.

## Files

- **Kebab-case across all languages.** Avoid mixed case (`OrderService.ts` vs `order-service.ts`) within one repo — pick one and `init-harness` will lock it in for the chosen stack.
- **One concept per file.** If a file exports more than one top-level type or function, ask whether they belong together.
- **Co-locate tests** with source by default (`order-service.ts` + `order-service.test.ts` side by side), unless the stack overrides this via `init-harness`.

## Constants and Magic Numbers

- Hoist any literal that has meaning into a named constant. `if (retries > 3)` becomes `if (retries > MAX_RETRIES)`.
- Group related constants in an enum or const object — do not pepper magic strings throughout the codebase.

## Abbreviations

- **No.** Spell it out: `customer` not `cust`, `configuration` not `cfg`, `database` not `db` (`Database` is fine as a class name).
- The exceptions are universally-understood acronyms in uppercase when they appear as identifiers: `parseURL`, `jsonResponse`, `HTTPClient`. In modern style, prefer camel-cased acronyms for readability: `parseUrl`, `HttpClient`.

## Domain Terminology

- Use the same word for the same concept everywhere. If the product calls it an "order", code calls it `order`, not `purchase`, not `transaction`, not `cart` (unless cart is a distinct concept).
- Resist invented terms. If the team says "customer", do not introduce `Account` or `User` to mean the same thing.

## Anti-patterns

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| `data`, `info`, `obj`, `item` as variable names | Conveys nothing | Name after the thing: `orderLineItems`, `customerProfile` |
| `getX` for a non-trivial computation | Implies cheap lookup | `computeX`, `deriveX` |
| `manager`, `helper`, `util` as a class name | Catch-all bucket; the class probably violates SRP | Split by responsibility; name after what it does |
| `temp`, `tmp`, `_old`, `_new` in committed code | Leftover scaffolding | Delete or rename to the real concept |
| Different spellings of the same word (`color` vs `colour`) | Trips search, hurts consistency | Pick one (default: US English) and stick |
