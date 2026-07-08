# name: nextjs-server-components

description: Next.js App Router patterns for Server Components and Client Components. Covers composition, boundaries, data fetching, and streaming.

---

# Server & Client Components Guide

Based on [Next.js Documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components) and 2025 best practices.

## Key Concepts

| Aspect        | Server Components   | Client Components       |
| ------------- | ------------------- | ----------------------- |
| Default       | Yes                 | No (needs 'use client') |
| JavaScript    | None sent to client | Sent to client          |
| Data Fetching | Direct async/await  | TanStack Query          |
| Secrets       | Can access          | Cannot access           |
| Interactivity | No hooks/events     | Full interactivity      |

---

## 1. When to Use Each

### Server Components (Default)

```typescript
// Perfect for Server Components
// - Data fetching
// - Accessing backend/database
// - Using secrets/API keys
// - Large dependencies
// - Static content

async function AppList() {
  // Direct API access - no client-side JS
  const apps = await fetch('http://localhost:6680/api/apps').then(r => r.json());

  return (
    <ul>
      {apps.map(app => (
        <li key={app.id}>{app.name}</li>
      ))}
    </ul>
  );
}
```

### Client Components

```typescript
'use client';

// Perfect for Client Components
// - useState, useEffect, useContext
// - Event handlers (onClick, onChange)
// - Browser APIs (localStorage, window)
// - Custom hooks with state
// - Real-time updates

function SearchInput() {
  const [query, setQuery] = useState('');

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search apps..."
    />
  );
}
```

---

## 2. Composition Patterns

### Pattern: Keep Client Components Leaf-Level

```typescript
// BAD: 'use client' too high - entire subtree becomes client
'use client';

function Page() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Header /> {/* Now client-side! */}
      <Sidebar /> {/* Now client-side! */}
      <MainContent /> {/* Now client-side! */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

// GOOD: Only Modal is client-side
// page.tsx (Server Component)
function Page() {
  return (
    <div>
      <Header /> {/* Server Component */}
      <Sidebar /> {/* Server Component */}
      <MainContent /> {/* Server Component */}
      <ModalWrapper /> {/* Minimal client boundary */}
    </div>
  );
}

// modal-wrapper.tsx
'use client';
function ModalWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  return <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}
```

### Pattern: Server Component Wrapper with Client Children

```typescript
// layout.tsx - Server Component
async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser(); // Server-side auth

  return (
    <div className="dashboard">
      <Sidebar user={user} /> {/* Can be server component */}
      <main>{children}</main>
    </div>
  );
}

// But Sidebar needs interactivity? Split it:
// sidebar.tsx - Server Component
async function Sidebar({ user }: { user: User }) {
  const menuItems = await getMenuItems(user.role);

  return (
    <aside>
      <UserInfo user={user} /> {/* Static, server */}
      <Navigation items={menuItems} /> {/* Client for interactions */}
    </aside>
  );
}

// navigation.tsx - Client Component (only the interactive part)
'use client';
function Navigation({ items }: { items: MenuItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  // ... interactive logic
}
```

### Pattern: Server Component Slot in Client Component

```typescript
// modal.tsx - Client Component
'use client';

function Modal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            {children} {/* Server Component can go here! */}
          </div>
        </div>
      )}
    </>
  );
}

// page.tsx - Server Component
async function Page() {
  return (
    <Modal>
      <AppDetails /> {/* This stays a Server Component */}
    </Modal>
  );
}

async function AppDetails() {
  const data = await fetchAppDetails(); // Runs on server
  return <div>{data.description}</div>;
}
```

---

## 3. Data Fetching Patterns

### Server Component Data Fetching

```typescript
// Fetch directly in Server Components
async function AppsPage() {
  // Parallel fetching
  const [apps, stats] = await Promise.all([
    fetch('http://localhost:6680/api/apps').then(r => r.json()),
    fetch('http://localhost:6680/api/stats').then(r => r.json()),
  ]);

  return (
    <div>
      <Stats data={stats} />
      <AppList apps={apps} />
    </div>
  );
}
```

### Passing Data to Client Components

```typescript
// BAD: Passing entire database object
async function Page() {
  const app = await getApp(id);
  return <ClientComponent app={app} />; // Serializes everything!
}

// GOOD: Pass only what's needed (DTO pattern)
async function Page() {
  const app = await getApp(id);
  return <ClientComponent app={{ id: app.id, name: app.name, platform: app.platform }} />;
}
```

### Streaming with Suspense

```typescript
// page.tsx
import { Suspense } from 'react';

export default function AppPage() {
  return (
    <div>
      {/* Renders immediately */}
      <Header />

      {/* Streams when ready */}
      <Suspense fallback={<AppSkeleton />}>
        <AppDetails />
      </Suspense>

      {/* Can load independently */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews />
      </Suspense>
    </div>
  );
}

async function AppDetails() {
  const app = await fetchApp(); // Slow API
  return <div>{app.name}</div>;
}

async function Reviews() {
  const reviews = await fetchReviews(); // Even slower API
  return <ReviewList reviews={reviews} />;
}
```

---

## 4. Props Serialization

### What Can Be Passed to Client Components

```typescript
// Serializable props - OK
interface ClientProps {
  // Primitives
  id: string;
  count: number;
  isActive: boolean;

  // Plain objects
  user: { name: string; email: string };

  // Arrays
  items: string[];

  // Date as string
  createdAt: string; // ISO string, not Date object
}

// Non-serializable - NOT OK
interface BadProps {
  onClick: () => void; // Functions
  ref: React.Ref<any>; // Refs
  classInstance: MyClass; // Class instances
  map: Map<string, any>; // Map/Set
  date: Date; // Date objects
}
```

### Passing Actions

```typescript
// Server Actions work!
// actions.ts
'use server';

export async function deleteApp(id: string) {
  await api.delete(`/api/apps/${id}`);
  revalidatePath('/apps');
}

// page.tsx - Server Component
import { deleteApp } from './actions';

function AppCard({ app }: { app: App }) {
  return (
    <div>
      <h3>{app.name}</h3>
      <DeleteButton deleteAction={deleteApp.bind(null, app.id)} />
    </div>
  );
}

// delete-button.tsx - Client Component
'use client';

function DeleteButton({ deleteAction }: { deleteAction: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => deleteAction())}
      disabled={isPending}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

---

## 5. Common Mistakes

### Mistake 1: Importing Server-Only Code in Client

```typescript
// This will fail - server module can't be used on client
'use client';
import { db } from '@/lib/db';

// Use 'server-only' package to catch this at build time
// lib/db.ts
import 'server-only';
export const db = prisma;
```

### Mistake 2: Using Route Handlers from Server Components

```typescript
// BAD: Unnecessary network hop
async function ServerComponent() {
  const res = await fetch('http://localhost:6600/api/apps');
  const data = await res.json();
}

// GOOD: Call backend directly
async function ServerComponent() {
  const res = await fetch('http://localhost:6680/api/apps');
  const data = await res.json();
}
```

### Mistake 3: State in Server Components

```typescript
// This will fail - no hooks in Server Components
async function ServerComponent() {
  const [state, setState] = useState(); // Error!
}

// Use a Client Component for state
function Page() {
  return (
    <StatefulWrapper>
      <ServerContent />
    </StatefulWrapper>
  );
}
```

---

## Quick Reference

### File Naming Convention

```
app/
├── page.tsx              # Server Component (default)
├── layout.tsx            # Server Component (default)
├── loading.tsx           # Server Component (default)
├── error.tsx             # Must be 'use client'
├── not-found.tsx         # Server Component (default)
└── components/
    ├── server-list.tsx   # Server Component
    └── client-form.tsx   # 'use client' at top
```

### Decision Flowchart

```
Need useState/useEffect/events?
|-- Yes -> Client Component
|-- No
    |-- Need browser APIs?
    |   |-- Yes -> Client Component
    |   |-- No
    |       |-- Fetching data?
    |       |   |-- Yes -> Server Component
    |       |   |-- No
    |       |       |-- Default: Server Component
```
