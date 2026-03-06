# Performance Review Agent - AppBoard Web

## Purpose
Validates performance patterns, rendering optimization, and bundle size in the AppBoard Web codebase.

## When to Run
- After adding new pages or heavy components
- During code review for UI changes
- When investigating slow load times

---

## Validation Rules

### 1. Component Rendering

#### Memoize Expensive Computations
```typescript
// ✅ CORRECT
const sortedApps = useMemo(
  () => apps.sort((a, b) => a.name.localeCompare(b.name)),
  [apps]
);

// ❌ VIOLATION — recomputed every render
const sortedApps = apps.sort((a, b) => a.name.localeCompare(b.name));
```

#### Stable Callback References
```typescript
// ✅ CORRECT — for callbacks passed to child components
const handleClick = useCallback((id: string) => {
  mutation.mutate(id);
}, [mutation]);

// ❌ UNNECESSARY — if not passed to memoized children
// Don't over-optimize; only use useCallback when needed
```

---

### 2. Data Fetching

#### Use TanStack Query Stale Time
```typescript
// ✅ CORRECT — prevents unnecessary refetches
useQuery({
  queryKey: ["apps"],
  queryFn: () => api.get("/api/apps"),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// ❌ VIOLATION — refetches on every mount
useQuery({
  queryKey: ["apps"],
  queryFn: () => api.get("/api/apps"),
  // No staleTime = refetch every focus/mount
});
```

#### Prefetch Data for Navigation
```typescript
// ✅ CORRECT — prefetch on hover
const queryClient = useQueryClient();

<Link
  href={`/apps/${app.id}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ["apps", app.id],
      queryFn: () => api.get(`/api/apps/${app.id}`),
    });
  }}
>
```

---

### 3. Image Optimization

#### Use Next.js Image Component
```typescript
// ✅ CORRECT
import Image from "next/image";
<Image src={app.icon} alt={app.name} width={64} height={64} />

// ❌ VIOLATION — raw img tag
<img src={app.icon} alt={app.name} />
```

#### Specify Image Dimensions
```typescript
// ✅ CORRECT — prevents layout shift
<Image src={url} width={200} height={300} alt="Screenshot" />

// ❌ VIOLATION — no dimensions
<Image src={url} alt="Screenshot" fill /> // Only use fill with sized container
```

---

### 4. Bundle Size

#### Dynamic Import for Heavy Components
```typescript
// ✅ CORRECT — lazy load heavy components
import dynamic from "next/dynamic";

const MonetizationPlanner = dynamic(
  () => import("@/components/monetization-planner"),
  { loading: () => <Skeleton className="h-96" /> }
);

// ❌ VIOLATION — importing heavy component statically
import { MonetizationPlanner } from "@/components/monetization-planner";
```

#### No Unused Imports
```typescript
// ❌ VIOLATION — importing entire library
import * as Icons from "lucide-react";

// ✅ CORRECT — tree-shakeable import
import { Home, Settings } from "lucide-react";
```

---

### 5. List Rendering

#### Use Stable Keys
```typescript
// ✅ CORRECT — unique, stable key
{apps.map((app) => (
  <AppCard key={app.id} app={app} />
))}

// ❌ VIOLATION — index as key
{apps.map((app, index) => (
  <AppCard key={index} app={app} />
))}
```

#### Virtualize Long Lists
```typescript
// For lists > 50 items, consider virtualization
// Use @tanstack/react-virtual or similar
```

---

### 6. Core Web Vitals

| Metric | Target | What Affects It |
|--------|--------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s | Image loading, server response time |
| FID (First Input Delay) | < 100ms | Heavy JS execution, hydration |
| CLS (Cumulative Layout Shift) | < 0.1 | Missing image dimensions, dynamic content |

---

## Performance Checklist

### Rendering
- [ ] Expensive computations memoized with `useMemo`
- [ ] Callbacks stabilized with `useCallback` (when passed to memoized children)
- [ ] No unnecessary re-renders (check React DevTools Profiler)

### Data Fetching
- [ ] TanStack Query with appropriate `staleTime`
- [ ] Prefetching for anticipated navigation
- [ ] No redundant API calls

### Images
- [ ] Uses Next.js `<Image>` component
- [ ] Dimensions specified (prevents CLS)
- [ ] Remote images configured in `next.config.ts`

### Bundle
- [ ] Heavy components dynamically imported
- [ ] Tree-shakeable imports only
- [ ] No unused dependencies

### Lists
- [ ] Stable keys (not index)
- [ ] Virtualization for 50+ items

---

## Report Format

```
## Performance Review — AppBoard Web

### Critical (Must Fix)
1. `src/app/(app)/apps/page.tsx:25`
   - Raw `<img>` tag without optimization
   - Fix: Use Next.js `<Image>` component

### Warnings
1. `src/hooks/use-apps.ts:8`
   - Missing staleTime on frequently used query
   - Fix: Add `staleTime: 5 * 60 * 1000`

### Passed
- Memoization ✓
- Dynamic imports ✓
- Image optimization ✓
```
