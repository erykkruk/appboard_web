# name: react-performance

description: React and Next.js performance optimization patterns based on Vercel's 10+ years of optimization knowledge. Covers waterfalls, bundle size, re-renders, and rendering performance.

---

# React Performance Optimization Guide

Based on [Vercel's React Best Practices](https://github.com/vercel-labs/agent-skills) - 40+ rules across 8 categories.

## Priority Categories

| Priority | Category                 | Impact     |
| -------- | ------------------------ | ---------- |
| 1        | Eliminating Waterfalls   | CRITICAL   |
| 2        | Bundle Size Optimization | CRITICAL   |
| 3        | Server-Side Performance  | HIGH       |
| 4        | Re-render Optimization   | MEDIUM     |
| 5        | Rendering Performance    | MEDIUM     |
| 6        | JavaScript Performance   | LOW-MEDIUM |

---

## 1. Eliminating Waterfalls (CRITICAL)

Waterfalls are the #1 performance killer. Each sequential await adds full network latency.

### Rule: async-parallel

```typescript
// BAD: Sequential - each await blocks the next
async function loadData() {
  const user = await getUser(); // 200ms
  const apps = await getApps(); // 300ms
  const stats = await getStats(); // 200ms
  // Total: 700ms (sequential)
}

// GOOD: Parallel - all start immediately
async function loadData() {
  const [user, apps, stats] = await Promise.all([
    getUser(), // 200ms
    getApps(), // 300ms
    getStats(), // 200ms
  ]);
  // Total: 300ms (parallel, limited by slowest)
}
```

### Rule: async-defer-await

```typescript
// BAD: Awaiting early blocks execution
async function handler(id: string) {
  const data = await fetch(`/api/${id}`); // Blocks here
  if (!data) return null;
  return process(data);
}

// GOOD: Start promise early, await late
async function handler(id: string) {
  const dataPromise = fetch(`/api/${id}`); // Starts immediately
  // ... other work can happen here
  const data = await dataPromise; // Await only when needed
  if (!data) return null;
  return process(data);
}
```

### Rule: async-suspense-boundaries

```typescript
// BAD: Parent waits for all data before rendering
async function Page() {
  const [header, content, sidebar] = await Promise.all([...]);
  return (
    <Layout header={header} sidebar={sidebar}>
      {content}
    </Layout>
  );
}

// GOOD: Stream with Suspense boundaries
function Page() {
  return (
    <Layout>
      <Suspense fallback={<HeaderSkeleton />}>
        <AsyncHeader />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <AsyncContent />
      </Suspense>
    </Layout>
  );
}
```

---

## 2. Bundle Size Optimization (CRITICAL)

Direct impact on initial load time and Core Web Vitals.

### Rule: bundle-barrel-imports

```typescript
// BAD: Barrel import loads ALL exports (can be 10,000+ modules)
import { Button, Input } from '@/components';
import { format } from 'date-fns';

// GOOD: Direct imports - tree-shaking friendly
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns/format';
```

### Rule: bundle-dynamic-imports

```typescript
// BAD: Heavy component in main bundle
import { HeavyEditor } from './heavy-editor';

// GOOD: Dynamic import with loading state
import dynamic from 'next/dynamic';

const HeavyEditor = dynamic(() => import('./heavy-editor'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false, // Skip SSR if not needed
});
```

### Rule: bundle-defer-third-party

```typescript
// BAD: Analytics blocks hydration
import { Analytics } from '@vercel/analytics';

// GOOD: Load after hydration
import dynamic from 'next/dynamic';

const Analytics = dynamic(() => import('@vercel/analytics').then((mod) => mod.Analytics), {
  ssr: false,
});
```

### Rule: bundle-conditional

```typescript
// BAD: Feature always loaded
import { AdminPanel } from './admin-panel';

// GOOD: Load only when feature is active
const AdminPanel = user.isAdmin ? dynamic(() => import('./admin-panel')) : () => null;
```

### Rule: bundle-preload

```typescript
// Preload on hover for perceived speed
<Link
  href="/heavy-page"
  onMouseEnter={() => {
    import('./heavy-page-component');
  }}
>
  Go to Heavy Page
</Link>
```

---

## 3. Re-render Optimization (MEDIUM)

### Rule: rerender-memo

```typescript
// BAD: Expensive computation on every render
function List({ items, filter }) {
  const filtered = items.filter(item => /* expensive */ );
  return filtered.map(item => <Item key={item.id} {...item} />);
}

// GOOD: Memoize expensive work
const MemoizedItem = memo(function Item({ item }) {
  return <div>{item.name}</div>;
});

function List({ items, filter }) {
  const filtered = useMemo(
    () => items.filter(item => /* expensive */),
    [items, filter]
  );
  return filtered.map(item => <MemoizedItem key={item.id} item={item} />);
}
```

### Rule: rerender-dependencies

```typescript
// BAD: Object dependency changes every render
useEffect(() => {
  fetchData(options);
}, [options]); // { page: 1, limit: 10 } !== { page: 1, limit: 10 }

// GOOD: Primitive dependencies
useEffect(() => {
  fetchData({ page, limit });
}, [page, limit]); // Primitives compare by value
```

### Rule: rerender-lazy-state-init

```typescript
// BAD: Expensive computation runs on every render
const [state, setState] = useState(computeExpensiveValue());

// GOOD: Lazy initialization - runs once
const [state, setState] = useState(() => computeExpensiveValue());
```

### Rule: rerender-derived-state

```typescript
// BAD: Subscribes to entire cart object
const cart = useCartStore((state) => state.cart);
const isEmpty = cart.length === 0;

// GOOD: Subscribe only to derived boolean
const isEmpty = useCartStore((state) => state.cart.length === 0);
```

### Rule: rerender-transitions

```typescript
// BAD: Filter update blocks typing
function SearchList({ items }) {
  const [query, setQuery] = useState('');
  const filtered = items.filter(i => i.includes(query));

  return (
    <input value={query} onChange={e => setQuery(e.target.value)} />
  );
}

// GOOD: Non-urgent update with transition
function SearchList({ items }) {
  const [query, setQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    startTransition(() => {
      setDeferredQuery(e.target.value);
    });
  };

  const filtered = items.filter(i => i.includes(deferredQuery));
  // ...
}
```

---

## 4. Rendering Performance (MEDIUM)

### Rule: rendering-hoist-jsx

```typescript
// BAD: Static JSX recreated every render
function Component() {
  return (
    <div>
      <header>Static Header</header>
      {dynamicContent}
    </div>
  );
}

// GOOD: Static JSX hoisted outside
const StaticHeader = <header>Static Header</header>;

function Component() {
  return (
    <div>
      {StaticHeader}
      {dynamicContent}
    </div>
  );
}
```

### Rule: rendering-content-visibility

```css
/* Skip rendering off-screen content */
.long-list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 100px;
}
```

### Rule: rendering-conditional-render

```typescript
// BAD: && can render 0 or NaN
{count && <Items count={count} />}  // Renders "0" when count is 0

// GOOD: Explicit boolean or ternary
{count > 0 && <Items count={count} />}
{count ? <Items count={count} /> : null}
```

---

## 5. JavaScript Performance (LOW-MEDIUM)

### Rule: js-set-map-lookups

```typescript
// BAD: O(n) lookup on every check
const isSelected = selectedIds.includes(id);

// GOOD: O(1) lookup with Set
const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
const isSelected = selectedSet.has(id);
```

### Rule: js-early-exit

```typescript
// BAD: Nested conditions
function process(item) {
  if (item) {
    if (item.isValid) {
      if (item.data) {
        return transform(item.data);
      }
    }
  }
  return null;
}

// GOOD: Early returns
function process(item) {
  if (!item) return null;
  if (!item.isValid) return null;
  if (!item.data) return null;
  return transform(item.data);
}
```

### Rule: js-combine-iterations

```typescript
// BAD: Multiple iterations
const filtered = items.filter((x) => x.active);
const mapped = filtered.map((x) => x.value);
const sum = mapped.reduce((a, b) => a + b, 0);

// GOOD: Single iteration
const sum = items.reduce((acc, item) => {
  if (item.active) acc += item.value;
  return acc;
}, 0);
```

---

## Quick Checklist

### Before Every PR

- [ ] No sequential awaits (use Promise.all)
- [ ] No barrel imports (import from source)
- [ ] Heavy components dynamically imported
- [ ] useMemo/useCallback where appropriate
- [ ] Primitive effect dependencies
- [ ] No && with numbers

### Bundle Size Audit

```bash
# Analyze bundle
bun run build
bunx @next/bundle-analyzer

# Check specific imports
bunx source-map-explorer .next/static/chunks/*.js
```

---

## References

- [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)
- [React Performance Guidelines](https://react.dev/learn/render-and-commit)
- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
