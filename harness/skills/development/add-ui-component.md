# Add UI Component

Add a new React component following the project's conventions for structure, typing, styling, and placement.

This skill assumes **React + TypeScript + Tailwind CSS** — the default frontend stack baked into this template. If your project picked a different framework at `init-harness` time, adapt this skill there.

If your work crosses into a code category not covered by this skill (e.g. you start adding an API endpoint while building a component), stop and consult the matching skill in `harness/skills/development/` before continuing.

---

## Prerequisites

Read these before starting:
- `harness/knowledge/repo-architecture/overview.md` — UI directory structure and import rules
- `harness/knowledge/code-standards/naming-conventions.md` — naming patterns

---

## Step 1 — Choose the Category

Components live in one of three directories under `src/components/`. Pick the right one:

| Category | Directory | When to use |
|----------|-----------|-------------|
| **Common** | `components/common/` | Generic, reusable primitives — no domain knowledge (Button, Modal, Table, SearchBar) |
| **Domain** | `components/domain/<context>/` | Tied to a business concept — knows about a specific entity (e.g. `User`, `Order`, `Project`) |
| **Layout** | `components/layout/` | App shell structure — sidebar, navigation, page frames |

If unsure: does the component know about a specific entity type? → `domain/`. Could it work in any app? → `common/`. Does it define the page frame? → `layout/`.

---

## Step 2 — Create the File Structure

Every component gets a named directory with `index.tsx` and `types.ts`:

```
components/<category>/<ComponentName>/
├── index.tsx        # Component implementation and named export
└── types.ts         # Props interface and component-specific types
```

For composite components with sub-components, nest them:

```
components/domain/order/OrderList/
├── index.tsx
├── types.ts
├── OrderCard/
│   ├── index.tsx
│   └── types.ts
└── EmptyOrdersState/
    ├── index.tsx
    └── types.ts
```

---

## Step 3 — Define the Props Interface

Props interfaces live in `types.ts` with JSDoc on every prop.

```typescript
// components/domain/order/OrderCard/types.ts
import type { Order } from '@shared/types/order';

export interface OrderCardProps {
  /** The order to display */
  order: Order;
  /** Callback when the card is clicked */
  onClick?: (orderId: string) => void;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### Rules

- Plain PascalCase — e.g. `OrderCardProps`. Do not prefix with `I`.
- JSDoc every prop.
- Include `className?: string` for style composition.
- Import shared types from `@shared/types/...` (or your chosen shared-types alias); never import from backend-only modules.

---

## Step 4 — Implement the Component

```typescript
// components/domain/order/OrderCard/index.tsx
import { cn } from '~/utils/cn';
import type { OrderCardProps } from './types';

export function OrderCard({
  order,
  onClick,
  isLoading = false,
  className,
}: OrderCardProps): JSX.Element {
  if (isLoading) {
    return <div className={cn('animate-pulse h-24 bg-gray-100 rounded', className)} />;
  }

  return (
    <div
      className={cn('p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow', className)}
      onClick={() => onClick?.(order.id)}
      role="button"
      tabIndex={0}
      aria-label={`Order: ${order.reference}`}
    >
      <h3 className="font-medium text-gray-900">{order.reference}</h3>
      {order.summary && (
        <p className="text-sm text-gray-600">{order.summary}</p>
      )}
    </div>
  );
}
```

### Rules

- Functional components only — no class components.
- Explicit `JSX.Element` return type.
- Default values for optional props in the destructuring.
- Handle loading and error states.
- Use `cn()` (or `clsx`) to merge className props with internal classes.
- Use Tailwind CSS for all styling — no inline styles, no CSS modules.
- Accessible: semantic HTML, `aria-label` on interactive elements, keyboard support.

---

## Step 5 — Respect Import Boundaries

Each category has strict import rules:

### `common/` components

```
✅ utils, hooks (cross-cutting)
✅ shared/types       — only non-domain shared types
❌ domain/            — common must not know about business concepts
❌ backend/server/    — never
```

### `domain/` components

```
✅ common/            — reusable primitives
✅ utils, hooks
✅ shared/types       — entity types
✅ API client / SDK   — for data fetching
❌ backend/server/    — never
❌ routes/pages/      — never
```

### `layout/` components

```
✅ common/            — reusable primitives
✅ utils, hooks
❌ domain/            — layout should not contain domain logic
❌ backend/server/    — never
```

---

## Step 6 — Add a Custom Hook (if needed)

If the component fetches data or manages complex state, extract a hook and **co-locate it with its callers**.

For a hook used by exactly one component, the hook lives inside that component's directory:

```typescript
// components/domain/order/OrderList/useOrders.ts
import { useState, useEffect } from 'react';
import { fetchOrders } from '~/api/orders';
import type { Order } from '@shared/types/order';

export interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setOrders(await fetchOrders());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { orders, isLoading, error, refetch: load };
}
```

### Rules

- Return a typed interface (`Use<Name>Return`).
- Include `isLoading`, `error`, and data states.
- Provide a `refetch` function.
- Hooks used by exactly one component dir → live inside that dir.
- Hooks used by multiple components in one category → `<category>/<context>/hooks/`.
- Generic infra hooks (DOM, viewport, debounce) → `~/hooks/`.

---

## Step 7 — Connect to a Page Route

Page routes consume components. Two data-loading patterns are typical:

### Server-side via route loader (preferred for initial page data)

```typescript
// routes/orders.tsx (React Router v7 example)
import { useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { fetchOrdersForUser } from '~/api/orders.server';
import { OrderList } from '~/components/domain/order/OrderList';

export async function loader({ request }: LoaderFunctionArgs) {
  const orders = await fetchOrdersForUser(request);
  return { orders };
}

export default function OrdersPage() {
  const { orders } = useLoaderData<typeof loader>();
  return <OrderList orders={orders} />;
}
```

### Client-side fetch (for dynamic interactions)

```typescript
import { fetchOrders } from '~/api/orders';

const handleSearch = async (query: string) => {
  const results = await fetchOrders({ q: query });
  setOrders(results);
};
```

---

## Step 8 — Run Checks

Execute `harness/skills/testing/run-code-checks.md`:

- `npm run typecheck` — catches type mismatches in props and imports
- `npm run build` — catches bundler-level boundary violations
- `npm run lint` (if configured) — catches boundary violations and style nits

---

## Checklist

Before considering the component complete:

- [ ] Placed in the correct category (`common/`, `domain/`, `layout/`)
- [ ] Directory structure: `ComponentName/index.tsx` + `types.ts`
- [ ] Props interface uses bare PascalCase (no `I` prefix) and JSDoc on every prop
- [ ] `className` prop accepted and merged with `cn()`
- [ ] Loading and error states handled
- [ ] Accessible: semantic HTML, aria labels, keyboard support
- [ ] Import boundaries respected (no backend imports, correct category rules)
- [ ] Hook co-located per the rule above if the component manages async data
- [ ] Tailwind CSS used for all styling
- [ ] All checks pass (`typecheck`, `build`)
