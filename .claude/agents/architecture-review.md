# Architecture Review Agent - AppBoard Web

## Purpose
Validates architecture principles and layer boundaries in the Next.js App Router codebase.

## When to Run
- After creating new pages/features
- During code review
- Before major refactoring

---

## Architecture Pattern

**App Router + Hooks-based** — bez feature-based folders:

```
Pages (src/app/)  →  Hooks (src/hooks/)  →  API Client (src/lib/api.ts)  →  Backend
     ↓                     ↓
Components            TanStack Query
(src/components/)     (cache + mutations)
```

---

## Validation Rules

### 1. Directory Structure

#### Pages Must Be in App Router Groups
```
// ✅ CORRECT — route groups
src/app/(app)/dashboard/page.tsx
src/app/(auth)/login/page.tsx

// ❌ VIOLATION — pages outside groups
src/app/dashboard/page.tsx
```

#### Hooks Must Live in `src/hooks/`
```
// ✅ CORRECT
src/hooks/use-apps.ts
src/hooks/use-stores.ts

// ❌ VIOLATION — hooks in components or pages
src/components/hooks/use-apps.ts
src/app/(app)/apps/use-apps.ts
```

#### Shared Components in `src/components/`
```
// ✅ CORRECT
src/components/page-header.tsx
src/components/ui/button.tsx

// ❌ VIOLATION — shared components in page folders
src/app/(app)/apps/shared-component.tsx
```

---

### 2. Layer Dependencies

#### Pages → Hooks (ALLOWED)
```typescript
// ✅ CORRECT — page uses hook
import { useApps } from "@/hooks/use-apps";

export default function AppsPage() {
  const { data } = useApps();
  return <AppList apps={data} />;
}
```

#### Pages → API Client (FORBIDDEN)
```typescript
// ❌ VIOLATION — page calls API directly
import { api } from "@/lib/api";

export default function AppsPage() {
  const data = await api.get("/api/apps"); // WRONG!
}
```

#### Components → Hooks (ALLOWED, but prefer props)
```typescript
// ✅ PREFERRED — component receives data via props
function AppCard({ app }: { app: App }) { ... }

// ✅ ACCEPTABLE — component uses hook for self-contained logic
function AppList() {
  const { data } = useApps();
  ...
}

// ❌ VIOLATION — component calls API directly
function AppCard() {
  const data = await fetch("/api/apps"); // NEVER
}
```

#### Hooks → API Client (REQUIRED)
```typescript
// ✅ CORRECT — hook uses API client
import { api } from "@/lib/api";

export function useApps() {
  return useQuery({
    queryKey: ["apps"],
    queryFn: () => api.get("/api/apps"),
  });
}

// ❌ VIOLATION — hook uses raw fetch
export function useApps() {
  return useQuery({
    queryKey: ["apps"],
    queryFn: () => fetch("/api/apps"), // Use api client!
  });
}
```

---

### 3. TanStack Query Patterns

#### Every Query Must Have a Unique queryKey
```typescript
// ✅ CORRECT — descriptive, hierarchical key
useQuery({ queryKey: ["apps", appId, "versions"], ... });

// ❌ VIOLATION — generic or missing key
useQuery({ queryKey: ["data"], ... });
```

#### Mutations Must Invalidate Related Queries
```typescript
// ✅ CORRECT
useMutation({
  mutationFn: (data) => api.post("/api/apps", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["apps"] });
  },
});

// ❌ VIOLATION — no invalidation
useMutation({
  mutationFn: (data) => api.post("/api/apps", data),
  // Missing onSuccess invalidation!
});
```

---

### 4. Component Patterns

#### Must Use shadcn/ui Components
```typescript
// ✅ CORRECT — uses shadcn/ui
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ❌ VIOLATION — custom button when shadcn exists
<button className="bg-blue-500 ...">Click</button>
```

#### Must Use `cn()` for Conditional Classes
```typescript
// ✅ CORRECT
import { cn } from "@/lib/utils";
<div className={cn("base-class", isActive && "active-class")} />

// ❌ VIOLATION — string concatenation
<div className={`base-class ${isActive ? "active-class" : ""}`} />
```

---

### 5. Import Rules

#### Must Use `@/` Path Aliases
```typescript
// ✅ CORRECT
import { useApps } from "@/hooks/use-apps";
import { Button } from "@/components/ui/button";

// ❌ VIOLATION — relative imports
import { useApps } from "../../../hooks/use-apps";
```

#### Import Order
```typescript
// 1. React/Next.js
import { useState } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// 3. Project imports (@/)
import { useApps } from "@/hooks/use-apps";
import { Button } from "@/components/ui/button";

// 4. Types (last)
import type { App } from "@/lib/types";
```

---

## Validation Checklist

### Pages
- [ ] Located in correct route group `(app)` or `(auth)`
- [ ] Uses hooks for data fetching (not direct API calls)
- [ ] Composes components from `src/components/`
- [ ] Has appropriate `layout.tsx` if needed

### Hooks
- [ ] Located in `src/hooks/`
- [ ] Named `use-{feature}.ts`
- [ ] Uses TanStack Query (`useQuery` / `useMutation`)
- [ ] Uses API client from `src/lib/api.ts`
- [ ] Exports typed return values

### Components
- [ ] Located in `src/components/`
- [ ] Uses shadcn/ui primitives
- [ ] Receives data via props (preferred) or hooks
- [ ] No direct API calls

### Lib
- [ ] Types defined in `src/lib/types.ts`
- [ ] API client centralized in `src/lib/api.ts`
- [ ] Auth client in `src/lib/auth-client.ts`
- [ ] Utilities in `src/lib/utils.ts`

---

## Report Format

```
## Architecture Review — AppBoard Web

### Critical (Must Fix)
1. `src/app/(app)/apps/page.tsx:15`
   - Direct API call in page component
   - Fix: Move to hook in `src/hooks/use-apps.ts`

### Warnings
1. `src/components/app-card.tsx:8`
   - Relative import path
   - Fix: Use `@/hooks/use-apps` alias

### Passed
- Directory structure ✓
- Layer dependencies ✓
- TanStack Query patterns ✓
- Import order ✓
```
