# Test-Driven Development

Use TDD when implementing new feature behaviour. This skill describes how to write tests that protect behaviour, enable safe refactoring, and avoid the brittleness that comes from testing implementation details.

The principles here are drawn from Kent Beck's *Test Driven Development: By Example* and Ian Cooper's talk *TDD, Where Did It All Go Wrong*, which re-examines Beck's original methodology and corrects common misunderstandings.

---

## Core Principle

**Test behaviours, not implementation details.**

The trigger for writing a new test is a *requirement you want to implement* — never a method you want to add to a class. A test should express what the system does for its consumers, not how it does it internally.

- **Behaviour:** "Adding two amounts in different currencies produces a correctly converted total."
- **Not behaviour:** "The `convert` method on `ExchangeRateService` is called with the correct parameters."

The system under test is the **public API of a module** — its exports, its facade — not the individual classes or helpers that make up the implementation behind it.

---

## When to Use TDD

Apply TDD when implementing **new behaviour** — a new feature, a new use case, a new business rule. This includes:

- New service methods or endpoint handlers that fulfil a requirement
- New logic with meaningful branching or computation
- Bug fixes where a failing test can first reproduce the defect

**Skip TDD** for:

- Pure wiring (registering a route, adding an import, wiring DI)
- Trivial getters/setters with no logic
- UI component layout (use browser verification per `run-app-in-browser.md` instead)
- Refactoring that does not change behaviour (existing tests already cover you)

---

## The Red-Green-Refactor Cycle

### 1. Red — Write a Failing Test

Write a test that describes the behaviour you are about to implement. The test name should read like a requirement:

```typescript
it("should return the total in the target currency when adding amounts in different currencies", async () => { ... });
```

Not like an implementation detail:

```typescript
it("should call exchangeRateService.convert twice", async () => { ... });
```

**Run the test and confirm it fails.** A test you have never seen fail proves nothing. The red step establishes that your test can actually detect the absence of the behaviour.

### 2. Green — Make It Pass Quickly

Get the test to pass by the fastest route possible. Write direct, inline, ugly code. Hard-coded return values you know you'll replace.

The goal of this step is to **understand how to solve the problem**, not to write production-quality code. Separate the two concerns: solve first, engineer second.

> *"For this brief moment, speed trumps design."* — Kent Beck

### 3. Refactor — Clean Up Without New Tests

Now improve the code. Extract helpers, apply patterns, remove duplication, rename, restructure. This is where clean code happens.

**Critical rule: do not write new tests during the refactoring step.**

Refactoring is defined as changing the structure of code without changing its behaviour. Your behaviour test from step 1 already covers you. If you extract a helper, do not write a separate test for it — it is an implementation detail, free to change.

If during refactoring you discover a genuinely new behaviour (a new conditional, a new public-facing capability), that signals a new requirement. Stop refactoring, go back to Red.

Use code coverage to keep yourself honest: if coverage drops during refactoring, you have likely introduced an untested conditional, which means you introduced new behaviour and need a new test.

---

## What to Test

### Test the Public Contract

The public contract is the stable interface external consumers depend on. Aim tests at:

- **Exported functions and module facades** — the seams between subsystems
- **Service / use-case methods** — the consumer-facing API of an application service
- **Controller / handler methods** — driving adapters (HTTP, CLI)
- **Adapter integration tests** — `.integration.test.ts` against real external systems (test DB, sandbox provider)

### Do Not Test Internals

Implementation details are everything behind the public API: private methods, extracted helpers, internal data transformations, specific sequences of calls between collaborators.

These must remain free to change without breaking any test. That freedom is what makes refactoring safe.

**Practical checks:**

- If you find yourself making something `public` or `export`ed solely to get it under test — stop. It is an implementation detail.
- If a test describes *how* the code works rather than *what* it achieves — rewrite it as a behaviour test or delete it.

---

## Mocking Guidance

### The Unit of Isolation Is the Test, Not the Class

A common mistake is to interpret "unit test" as "test a class in isolation by mocking all its dependencies." This leads to mock-heavy tests tightly coupled to implementation details, breaking on every refactor.

Kent Beck's original definition: unit tests should be able to run together in a suite without one test impacting another. The isolation is between *tests*, not between the class and its collaborators.

### When to Mock

Mock at **ports** — the seams where your code talks to the outside world:

- **Repository / data-store ports** — substitute with in-memory fakes, not the real DB adapter
- **Gateway ports** — auth providers, third-party APIs, agents
- **Clock, ID generator, event publisher** — for determinism

The shape:

- **Pure logic / domain** is unit-tested **without mocks** — construct objects, call methods, assert on results.
- **Application services** are unit-tested with **fake or in-memory ports** — no real database or network.
- **Adapters** are **integration-tested** against the real external system. Use the `.integration.test.ts` suffix.

### When Not to Mock

- **Internal collaborators within a module** — if your service calls a helper, let the real helper run. Mocking it couples your test to the call sequence and prevents safe refactoring.
- **To verify call sequences** — a mock that asserts "method X was called before method Y with these exact args" is testing implementation, not behaviour. Assert on the *outcome* instead.

---

## Shifting Gears

Not every piece of code demands the same TDD rigour.

### High Gear (Default)

Test the public API. Write the green step cleanly because the solution is obvious. Refactor minimally. Default for straightforward features.

### Standard Gear

Full red-green-refactor. Write quick-and-dirty green code, then refactor thoroughly. Use when the solution is non-trivial but you know the shape.

### Low Gear (Probing)

When you don't know *how* to go green — the problem is unfamiliar or algorithmic — shift down. Write smaller, more granular tests to probe.

**But: delete these probing tests when you are done.** They helped *you* understand the problem. They will be a maintenance burden for the next developer. Keep only the behaviour-level tests that protect the public contract.

---

## Test Structure

Use the given-when-then pattern to make behaviour explicit:

```typescript
describe("OrderService", () => {
  describe("placeOrder", () => {
    it("should reject an order when the customer's credit limit is exceeded", async () => {
      // Given: a customer with $50 of credit remaining
      const customers = new InMemoryCustomerRepository([customerWithCreditLimit(50)]);
      const service = new OrderService(customers);

      // When: they try to place a $100 order
      const result = await service.placeOrder({ customerId, amount: 100 });

      // Then: the order is rejected with a clear reason
      expect(result.ok).toBe(false);
      expect(result.error).toBe("credit_limit_exceeded");
    });
  });
});
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it hurts | What to do instead |
|---|---|---|
| Writing a test for every class extracted during refactoring | Couples tests to implementation; refactoring breaks tests | Test the behaviour through the public API only |
| Mock-heavy tests that mirror the call sequence | Tests become a brittle specification of *how*, not *what* | Mock only at architectural boundaries; assert on outcomes |
| Making internals public/exported to test them | Breaks encapsulation | Test through the module's public facade |
| Test names that describe methods (`should call X`) | Tests are unreadable and don't document requirements | Name tests after behaviours (`should return X when Y`) |
| Keeping probing/exploratory tests permanently | Burden on future developers; blocks refactoring | Delete probing tests once you've solved the problem |
| Skipping the red step | You can't trust a test you've never seen fail | Always run the test and confirm it fails before implementing |
| Writing new tests during refactoring | Creates unnecessary coupling to the new structure | Refactoring is covered by existing behaviour tests |

---

## Reference

- Kent Beck — *Test Driven Development: By Example* (2002)
- Ian Cooper — [*TDD, Where Did It All Go Wrong*](https://www.youtube.com/watch?v=EZ05e7EMOLM)
- Martin Fowler — *Refactoring: Improving the Design of Existing Code*
