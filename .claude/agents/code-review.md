# Code Review Agent - AppBoard Web

## Purpose
Validates code quality, type safety, naming conventions, and patterns in the AppBoard Web codebase.

## When to Run
- During code review
- After implementing new features
- Before creating PRs

---

## Validation Rules

### 1. TypeScript Usage

#### No `any` Type
```typescript
// ❌ VIOLATION
const data: any = await api.get("/api/apps");
function handleClick(e: any) { ... }

// ✅ CORRECT
const data: AppListResponse = await api.get("/api/apps");
function handleClick(e: React.MouseEvent<HTMLButtonElement>) { ... }
```

#### Explicit Return Types for Hooks
```typescript
// ❌ VIOLATION — implicit return
export function useApps() {
  return useQuery({ ... });
}

// ✅ CORRECT — typed or inferred through TanStack Query generics
export function useApps() {
  return useQuery<App[]>({
    queryKey: ["apps"],
    queryFn: () => api.get<App[]>("/api/apps"),
  });
}
```

#### Types in `src/lib/types.ts`
```typescript
// ❌ VIOLATION — types scattered across files
// src/hooks/use-apps.ts
interface App { id: string; name: string; }

// ✅ CORRECT — centralized types
// src/lib/types.ts
export interface App { id: string; name: string; }
```

---

### 2. Error Handling

#### Mutations Must Handle Errors
```typescript
// ❌ VIOLATION — no error handling
useMutation({
  mutationFn: (data) => api.post("/api/apps", data),
});

// ✅ CORRECT — error toast
useMutation({
  mutationFn: (data) => api.post("/api/apps", data),
  onError: (error) => {
    toast.error(error.message || "Failed to create app");
  },
});
```

#### No Silent Error Swallowing
```typescript
// ❌ VIOLATION
try { await doSomething(); } catch (e) { /* ignore */ }

// ✅ CORRECT
try {
  await doSomething();
} catch (error) {
  toast.error("Operation failed");
}
```

---

### 3. Component Patterns

#### Use `cn()` for Class Merging
```typescript
// ❌ VIOLATION
<div className={`text-sm ${isActive ? "text-blue-500" : "text-gray-500"}`} />

// ✅ CORRECT
<div className={cn("text-sm", isActive ? "text-blue-500" : "text-gray-500")} />
```

#### Destructure Props
```typescript
// ❌ VIOLATION
function AppCard(props: AppCardProps) {
  return <h2>{props.app.name}</h2>;
}

// ✅ CORRECT
function AppCard({ app }: AppCardProps) {
  return <h2>{app.name}</h2>;
}
```

#### Use shadcn/ui Components
```typescript
// ❌ VIOLATION — custom elements when shadcn exists
<button onClick={onClick}>Save</button>
<input type="text" value={value} onChange={onChange} />

// ✅ CORRECT — shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

<Button onClick={onClick}>Save</Button>
<Input value={value} onChange={onChange} />
```

---

### 4. Hook Patterns

#### Hook Files Named `use-{feature}.ts`
```
// ✅ CORRECT
src/hooks/use-apps.ts
src/hooks/use-stores.ts

// ❌ VIOLATION
src/hooks/apps.ts
src/hooks/appHook.ts
```

#### One Domain Per Hook File
```typescript
// ❌ VIOLATION — multiple domains in one hook
// src/hooks/use-data.ts
export function useApps() { ... }
export function useStores() { ... }

// ✅ CORRECT — one file per domain
// src/hooks/use-apps.ts
export function useApps() { ... }
// src/hooks/use-stores.ts
export function useStores() { ... }
```

---

### 5. Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Component files | kebab-case.tsx | `app-sidebar.tsx` |
| Hook files | use-kebab-case.ts | `use-apps.ts` |
| Lib files | kebab-case.ts | `auth-client.ts` |
| Components | PascalCase | `AppSidebar` |
| Hooks | camelCase | `useApps` |
| Variables | camelCase | `appList` |
| Constants | SCREAMING_SNAKE | `MAX_ITEMS` |
| Types | PascalCase | `AppListItem` |

---

### 6. Import Rules

#### Order
```
1. React / Next.js imports
2. Third-party packages (@tanstack, sonner, lucide-react)
3. Project imports (@/hooks, @/components, @/lib)
4. Type-only imports (last)
```

#### No Deep Relative Imports
```typescript
// ❌ VIOLATION
import { Button } from "../../../components/ui/button";

// ✅ CORRECT
import { Button } from "@/components/ui/button";
```

---

### 7. Anti-patterns

| Anti-pattern | Why |
|-------------|-----|
| `console.log` in production | Use toast or error boundary |
| Direct `fetch()` calls | Use `api` client from `src/lib/api.ts` |
| Inline styles | Use Tailwind classes |
| `any` type | Always use explicit types |
| String concatenation for classes | Use `cn()` utility |
| Business logic in components | Move to hooks |

---

## Validation Checklist

- [ ] No `any` types
- [ ] No `console.log` statements
- [ ] No direct `fetch()` calls (use API client)
- [ ] All mutations have `onError` handler
- [ ] Uses `cn()` for conditional classes
- [ ] shadcn/ui components used where applicable
- [ ] Props destructured
- [ ] Naming conventions followed
- [ ] Import order correct
- [ ] Types centralized in `src/lib/types.ts`
- [ ] No deep relative imports

---

## Report Format

```
## Code Review — AppBoard Web

### Critical (Must Fix)
1. `src/hooks/use-apps.ts:12`
   - Uses `any` type for API response
   - Fix: Define typed response in `src/lib/types.ts`

### Warnings
1. `src/components/app-card.tsx:5`
   - Missing error handling in mutation
   - Fix: Add `onError` callback with toast

### Passed
- Naming conventions ✓
- Import order ✓
- shadcn/ui usage ✓
```
