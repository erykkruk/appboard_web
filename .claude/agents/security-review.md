# Security Review Agent - AppBoard Web

## Purpose
Validates security patterns, authentication, input validation, and data protection in the AppBoard Web panel.

## When to Run
- After implementing auth-related features
- During code review for API-consuming code
- Before deploying to production

---

## Validation Rules

### 1. Authentication

#### All Authenticated Routes Must Be in `(app)` Group
```
// ✅ CORRECT — protected by (app) layout
src/app/(app)/dashboard/page.tsx
src/app/(app)/apps/page.tsx

// ❌ VIOLATION — auth route outside (app) group
src/app/dashboard/page.tsx
```

#### Auth Client Must Be Used from `src/lib/auth-client.ts`
```typescript
// ✅ CORRECT
import { authClient } from "@/lib/auth-client";

// ❌ VIOLATION — custom auth implementation
const session = await fetch("/api/auth/session");
```

#### Session Check in Protected Layouts
```typescript
// ✅ CORRECT — layout checks session
export default function AppLayout({ children }) {
  const session = useSession(); // from Better Auth
  if (!session) redirect("/login");
  return <>{children}</>;
}
```

---

### 2. API Security

#### Never Expose Secrets in Client Code
```typescript
// ❌ VIOLATION — secret in client bundle
const API_KEY = "sk-1234567890";

// ✅ CORRECT — use server-side env or proxy
// Secrets stay in backend, web uses session cookies
```

#### API Calls Must Use Relative Paths
```typescript
// ✅ CORRECT — proxy through Next.js rewrites
api.get("/api/apps");

// ❌ VIOLATION — direct backend URL in client
api.get("http://localhost:6680/api/apps");
```

#### Never Pass Sensitive Data in URL Parameters
```typescript
// ❌ VIOLATION
api.get(`/api/auth?token=${token}`);

// ✅ CORRECT — use headers or cookies (handled by Better Auth)
api.get("/api/apps"); // session cookie sent automatically
```

---

### 3. Input Validation

#### Validate User Input Before Sending to API
```typescript
// ✅ CORRECT — validate before mutation
const handleSubmit = (data: FormData) => {
  if (!data.name.trim()) {
    toast.error("Name is required");
    return;
  }
  mutation.mutate(data);
};
```

#### Sanitize Display Data
```typescript
// ✅ CORRECT — React auto-escapes JSX
<p>{userInput}</p>

// ❌ VIOLATION — dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

### 4. XSS Prevention

#### Never Use `dangerouslySetInnerHTML`
```typescript
// ❌ VIOLATION
<div dangerouslySetInnerHTML={{ __html: data.description }} />

// ✅ CORRECT — use React text rendering
<p>{data.description}</p>
```

#### Validate URLs Before Rendering
```typescript
// ❌ VIOLATION — unvalidated URL
<a href={userProvidedUrl}>Link</a>
<img src={userProvidedUrl} />

// ✅ CORRECT — validate protocol
const isValidUrl = (url: string) =>
  url.startsWith("https://") || url.startsWith("http://");
```

---

### 5. Sensitive Data Handling

#### Never Log Sensitive Data
```typescript
// ❌ VIOLATION
console.log("User token:", session.token);
console.log("API response:", JSON.stringify(data));

// ✅ CORRECT — no logging of sensitive data
// Use Sonner toast for user-facing feedback only
```

#### Store Tokens in httpOnly Cookies Only
```
// Better Auth handles this automatically via session cookies
// NEVER store tokens in:
// - localStorage
// - sessionStorage
// - Client-side cookies (non-httpOnly)
```

---

### 6. Environment Variables

#### Client-Side Env Must Use `NEXT_PUBLIC_` Prefix
```typescript
// ✅ CORRECT
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ VIOLATION — accessing server env in client
const secret = process.env.DATABASE_URL; // Won't work and shouldn't
```

#### Never Commit `.env` Files
```
// .gitignore must include:
.env
.env.local
.env.production
```

---

## Security Checklist

### Authentication
- [ ] All protected routes in `(app)` group
- [ ] Session check in `(app)/layout.tsx`
- [ ] Auth client from `@/lib/auth-client.ts`
- [ ] No custom token handling

### API Security
- [ ] All API calls use relative paths (proxy)
- [ ] No secrets in client code
- [ ] No sensitive data in URL params
- [ ] Session cookies used (httpOnly)

### XSS Prevention
- [ ] No `dangerouslySetInnerHTML`
- [ ] URLs validated before rendering
- [ ] User input escaped by React

### Data Protection
- [ ] No sensitive data in logs
- [ ] No tokens in localStorage/sessionStorage
- [ ] `.env` files in `.gitignore`
- [ ] Only `NEXT_PUBLIC_*` env vars in client

---

## Report Format

```
## Security Review — AppBoard Web

### Critical (Must Fix)
1. `src/app/(app)/settings/page.tsx:23`
   - API key exposed in client bundle
   - Fix: Move to server-side env variable

### Warnings
1. `src/components/app-card.tsx:15`
   - Using dangerouslySetInnerHTML
   - Fix: Use React text rendering

### Passed
- Authentication ✓
- API security ✓
- XSS prevention ✓
```
