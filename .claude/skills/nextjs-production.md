# name: nextjs-production

description: Next.js production readiness checklist covering performance, SEO, security, and deployment optimization based on official Next.js documentation.

---

# Next.js Production Checklist

Based on [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist).

---

## Automatic Optimizations (Enabled by Default)

- **Server Components** - Zero client-side JS impact
- **Code-splitting** - Route-based automatic splitting
- **Link prefetching** - Instant navigation
- **Static rendering** - Build-time with caching
- **Data caching** - Request and asset caching

---

## 1. Routing & Rendering

### Layouts for Shared UI

```typescript
// app/(app)/layout.tsx
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar /> {/* Only renders once */}
      <main>{children}</main>
    </div>
  );
}
```

### Client-Side Navigation

```typescript
// Always use Link component
import Link from 'next/link';

// Good - prefetches automatically
<Link href="/apps">Apps</Link>

// Bad - full page reload
<a href="/apps">Apps</a>
```

### Custom Error Pages

```typescript
// app/not-found.tsx - 404 page
export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
    </div>
  );
}

// app/error.tsx - Error boundary (must be 'use client')
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

// app/global-error.tsx - Root error boundary
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### Strategic 'use client' Boundaries

```typescript
// Bad - entire page becomes client
'use client';
export default function Page() { /* ... */ }

// Good - minimal client boundary
export default function Page() {
  return (
    <div>
      <ServerComponent />
      <InteractiveButton /> {/* Only this is client */}
    </div>
  );
}

// interactive-button.tsx
'use client';
export function InteractiveButton() {
  const [clicked, setClicked] = useState(false);
  // ...
}
```

---

## 2. Data Fetching & Caching

### Parallel Data Fetching

```typescript
// Bad - sequential waterfall
async function Page() {
  const user = await getUser();      // 200ms
  const apps = await getApps();      // 300ms
  // Total: 500ms

  return <div>{/* ... */}</div>;
}

// Good - parallel fetching
async function Page() {
  const [user, apps] = await Promise.all([
    getUser(),   // 200ms
    getApps(),   // 300ms
  ]);
  // Total: 300ms (max of both)

  return <div>{/* ... */}</div>;
}
```

### Streaming with Loading UI

```typescript
// app/apps/loading.tsx
export default function Loading() {
  return <AppListSkeleton />;
}

// Or use Suspense for granular control
export default function Page() {
  return (
    <>
      <Header /> {/* Immediate */}
      <Suspense fallback={<AppListSkeleton />}>
        <AppList /> {/* Streams when ready */}
      </Suspense>
    </>
  );
}
```

### Caching Strategies

```typescript
// Default: cached
fetch('https://api.example.com/data');

// No cache
fetch('https://api.example.com/data', { cache: 'no-store' });

// Revalidate every hour
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 },
});

// For non-fetch requests, use unstable_cache
import { unstable_cache } from 'next/cache';

const getCachedData = unstable_cache(
  async () => {
    return db.query();
  },
  ['cache-key'],
  { revalidate: 3600 }
);
```

---

## 3. UI & Accessibility

### Image Optimization

```typescript
import Image from 'next/image';

// Optimized image
<Image
  src="/hero.jpg"
  alt="App screenshot"
  width={800}
  height={600}
  priority // For LCP images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>

// Responsive images
<Image
  src="/app-icon.jpg"
  alt="App icon"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  className="object-cover"
/>
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### Script Optimization

```typescript
import Script from 'next/script';

// Analytics - load after interaction
<Script
  src="https://analytics.example.com/script.js"
  strategy="lazyOnload"
/>

// Critical script - load before interactive
<Script
  src="https://critical.example.com/script.js"
  strategy="beforeInteractive"
/>
```

### Accessibility

```typescript
// next.config.ts
module.exports = {
  eslint: {
    // Run ESLint with accessibility plugin
    dirs: ['src'],
  },
};

// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:jsx-a11y/recommended"
  ]
}
```

---

## 4. Metadata & SEO

### Metadata API

```typescript
// app/layout.tsx - Global metadata
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | AppBoard',
    default: 'AppBoard',
  },
  description: 'ASO management panel for App Store and Google Play',
  metadataBase: new URL('https://app.appboard.io'),
  openGraph: {
    title: 'AppBoard',
    description: 'ASO management panel',
    images: ['/og-image.png'],
  },
};

// app/apps/page.tsx - Page-specific
export const metadata: Metadata = {
  title: 'Apps', // Becomes "Apps | AppBoard"
  description: 'Manage all your apps',
};

// Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const app = await getApp(params.appId);
  return {
    title: app.name,
    description: app.description,
  };
}
```

### Sitemap & Robots

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    {
      url: 'https://app.appboard.io',
      lastModified: new Date(),
    },
  ];
}

// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://app.appboard.io/sitemap.xml',
  };
}
```

---

## 5. Before Deployment

### Build & Test

```bash
# 1. Run build to catch errors
bun run build

# 2. Test production locally
bun run start

# 3. Run Lighthouse audit
# Open Chrome DevTools -> Lighthouse -> Generate report
```

### Bundle Analysis

```bash
# Install analyzer
bun add -d @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // your config
});

# Run analysis
ANALYZE=true bun run build
```

### Core Web Vitals

```typescript
// app/layout.tsx
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    switch (metric.name) {
      case 'LCP':
        console.log('LCP:', metric.value);
        break;
      case 'FID':
        console.log('FID:', metric.value);
        break;
      case 'CLS':
        console.log('CLS:', metric.value);
        break;
    }

    // Send to analytics
    analytics.send(metric);
  });

  return null;
}
```

---

## Production Checklist

### Routing & Rendering

- [ ] Use Layouts for shared UI
- [ ] Use Link component for navigation
- [ ] Implement error.tsx and not-found.tsx
- [ ] Strategic 'use client' boundaries
- [ ] Be intentional with Dynamic APIs

### Data Fetching

- [ ] Parallel data fetching (Promise.all)
- [ ] Implement Loading UI (loading.tsx)
- [ ] Configure caching appropriately
- [ ] Preload critical data

### UI & Accessibility

- [ ] Optimize images with next/image
- [ ] Optimize fonts with next/font
- [ ] Optimize scripts with next/script
- [ ] Run jsx-a11y ESLint plugin

### Security

- [ ] Environment variables in .gitignore
- [ ] Server Actions authorization
- [ ] Consider CSP headers
- [ ] Use 'server-only' for secrets

### Metadata & SEO

- [ ] Implement Metadata API
- [ ] Generate sitemap.xml
- [ ] Generate robots.txt
- [ ] Add Open Graph images

### Performance

- [ ] Run next build successfully
- [ ] Test with next start
- [ ] Run Lighthouse audit (90+ scores)
- [ ] Analyze bundle size
- [ ] Monitor Core Web Vitals
