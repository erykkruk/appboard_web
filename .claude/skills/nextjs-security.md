# name: nextjs-security

description: Next.js security best practices covering Server Actions, input validation, authentication, authorization, and protection against OWASP vulnerabilities.

---

# Next.js Security Guide

Based on [Next.js Security Blog](https://nextjs.org/blog/security-nextjs-server-components-actions), [OWASP guidelines](https://owasp.org/), and 2025 best practices.

## Critical Security Updates (2025)

Warning: **CVE-2025-29927**: Middleware authentication bypass vulnerability. Upgrade to Next.js 15.2.3+ and implement defense-in-depth.

---

## 1. Server Actions Security

**All Server Actions are public HTTP endpoints.** Treat them like API routes.

### Every Server Action MUST:

1. Verify authentication
2. Check authorization
3. Validate all inputs
4. Sanitize outputs

```typescript
'use server';

import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Schema for validation
const createAppSchema = z.object({
  name: z.string().min(1).max(100),
  bundleId: z.string().min(1).max(200),
  platform: z.enum(['app_store', 'google_play']),
});

export async function createApp(formData: FormData) {
  // 1. Authentication
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  // 2. Authorization
  if (!session.user.workspaceId) {
    throw new Error('Forbidden');
  }

  // 3. Input Validation
  const rawData = {
    name: formData.get('name'),
    bundleId: formData.get('bundleId'),
    platform: formData.get('platform'),
  };

  const result = createAppSchema.safeParse(rawData);
  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // 4. Safe operation
  try {
    const app = await api.post('/api/apps', result.data);

    revalidatePath('/apps');
    return { success: true, id: app.id };
  } catch (error) {
    console.error('Failed to create app:', error);
    return { error: 'Failed to create app' };
  }
}
```

### Using .bind() Safely

```typescript
// DANGEROUS: Sensitive data in bind
const deleteWithId = deleteApp.bind(null, sensitiveToken, app.id);

// SAFE: Only public identifiers
const deleteWithId = deleteApp.bind(null, app.id);

// In the action, fetch sensitive data server-side
export async function deleteApp(id: string) {
  const session = await getSession();
  // ... validate and proceed
}
```

---

## 2. Input Validation

**Never trust client data.** Validate everything with Zod.

### Validation Patterns

```typescript
import { z } from 'zod';

// String validation
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z0-9\s-]+$/, 'Invalid characters');

// Email validation
const emailSchema = z.string().email('Invalid email');

// URL validation
const urlSchema = z.string().url().optional();

// Enum validation
const platformSchema = z.enum(['app_store', 'google_play']);

// Object validation
const appSchema = z.object({
  name: nameSchema,
  bundleId: z.string().min(1),
  platform: platformSchema,
  // Prevent prototype pollution
  __proto__: z.never().optional(),
  constructor: z.never().optional(),
});

// Array validation with limits
const itemsSchema = z.array(appSchema).max(100);

// File validation
const fileSchema = z.object({
  name: z.string(),
  size: z.number().max(5 * 1024 * 1024), // 5MB
  type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
```

### API Route Validation

```typescript
// app/api/apps/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);

  const result = querySchema.safeParse(searchParams);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: result.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, search } = result.data;
  // Safe to use validated data
}
```

---

## 3. Authentication Best Practices

### Defense-in-Depth (Post CVE-2025-29927)

```typescript
// DON'T rely only on middleware
// middleware.ts
export function middleware(request: NextRequest) {
  // This alone is NOT sufficient!
}

// DO verify at multiple layers

// 1. Middleware (first line of defense)
export async function middleware(request: NextRequest) {
  const session = await getSession();
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// 2. Page level (second line)
// app/(app)/page.tsx
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return <Dashboard user={session.user} />;
}

// 3. Data Access Layer (third line)
// All API calls go through the backend which validates workspace context
// Backend verifyAppOwnership / verifyStoreOwnership checks

// 4. Server Actions (fourth line)
export async function updateApp(id: string, data: UpdateData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  // Proceed with update via backend API
}
```

### Session Management (Better Auth)

```typescript
// AppBoard uses Better Auth for session management
// Session cookies are httpOnly, secure, sameSite: 'lax'
// Auth client is in src/lib/auth-client.ts

import { authClient } from '@/lib/auth-client';

// Check session
const session = await authClient.getSession();

// Sign out
await authClient.signOut();
```

---

## 4. XSS Prevention

### React's Built-in Protection

```typescript
// React automatically escapes - SAFE
function Comment({ text }: { text: string }) {
  return <p>{text}</p>; // Escaped automatically
}

// DANGEROUS: Raw HTML
function Comment({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// If HTML is needed, sanitize first
import DOMPurify from 'isomorphic-dompurify';

function SafeHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
    ALLOWED_ATTR: ['href'],
  });
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### URL Validation

```typescript
// DANGEROUS: javascript: URLs
<a href={userUrl}>Link</a>

// SAFE: Validate URLs
function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  const isValid = /^https?:\/\//.test(url);
  if (!isValid) return <span>{children}</span>;
  return <a href={url}>{children}</a>;
}
```

---

## 5. Environment Variables

```bash
# Server-only secrets (no prefix)
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-key
API_KEY=sk-...

# Client-safe variables (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_APP_URL=https://app.appboard.io
NEXT_PUBLIC_ANALYTICS_ID=G-...

# NEVER expose secrets to client
NEXT_PUBLIC_API_KEY=sk-... # WRONG!
```

### Using server-only

```typescript
// lib/secrets.ts
import 'server-only'; // Build error if imported in client

export const secrets = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
};
```

---

## 6. Content Security Policy

```typescript
// next.config.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self' https://api.appboard.io;
  frame-ancestors 'none';
  form-action 'self';
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

---

## 7. Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip ?? 'anonymous';
    const { success, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'X-RateLimit-Remaining': remaining.toString() },
        }
      );
    }
  }
}
```

---

## Security Checklist

### Before Every Deployment

- [ ] All Server Actions validate inputs with Zod
- [ ] Authentication checked at multiple layers
- [ ] No secrets in NEXT_PUBLIC_ variables
- [ ] No dangerouslySetInnerHTML without sanitization
- [ ] Rate limiting on API routes
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Dependencies updated (bun audit)

### OWASP Top 10 Coverage

- [x] Broken Access Control -> Multi-layer auth
- [x] Injection -> Zod validation, ORM
- [x] Cryptographic Failures -> Secure cookies, HTTPS
- [x] Insecure Design -> Defense-in-depth
- [x] Security Misconfiguration -> CSP, headers
- [x] Vulnerable Components -> bun audit
- [x] Auth Failures -> Secure session handling (Better Auth)
- [x] Data Integrity -> Input validation
- [x] Logging Failures -> Error handling
- [x] SSRF -> URL validation
