# AppBoard Web

[![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-black.svg)](https://bun.sh/)

> Open-source ASO (App Store Optimization) admin panel — manage App Store Connect & Google Play listings, screenshots, reviews, and publishing from a single dashboard.

AppBoard Web is the admin panel for [AppBoard Backend](https://github.com/erykkruk/appboard-backend). It is a [Next.js](https://nextjs.org/) app that talks to the backend through a server-side `/api/*` proxy, so the browser never needs to know the backend's address.

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Runtime | [Bun](https://bun.sh/) | 1.3.x |
| Framework | [Next.js](https://nextjs.org/) | 16.x |
| UI | [React](https://react.dev/) | 19.x |
| Data fetching | [TanStack Query](https://tanstack.com/query) | 5.x |
| Auth | [Better Auth](https://better-auth.com/) | 1.4.x |
| Styling | [Tailwind CSS](https://tailwindcss.com/) | 4.x |
| Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) | - |
| Drag & drop | [dnd-kit](https://dndkit.com/) | - |
| Linter | [ESLint](https://eslint.org/) | 9.x |
| Package Manager | [Bun](https://bun.sh/) | - |

---

## Prerequisites

- [Bun](https://bun.sh/) `>= 1.3`
- A running [AppBoard Backend](https://github.com/erykkruk/appboard-backend) (defaults to `http://localhost:6680`)

---

## Setup & Run

```bash
git clone https://github.com/erykkruk/appboard-web.git
cd appboard-web
bun install
bun dev
```

The admin panel is now available at [http://localhost:6600](http://localhost:6600).

No configuration is required for local development as long as the backend runs on the default `http://localhost:6680`.

---

## Environment

All configuration is optional for local use. The single environment variable is the server-side backend URL:

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_URL` | | `http://localhost:6680` | Server-side base URL of the AppBoard Backend. Used by the Next.js `/api/*` proxy rewrite and by SSR Better Auth calls. Self-hosters running the backend on a non-localhost host/port should override it. |

Copy the example file and adjust if you run the backend elsewhere:

```bash
cp .env.example .env
```

### How the `/api/*` proxy works

The browser never calls the backend directly. Instead, `next.config.ts` rewrites every `/api/*` request to the backend:

```ts
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:6680";

async rewrites() {
  return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
}
```

Because the proxy runs server-side, the same-origin browser requests carry the Better Auth session cookie automatically, and there are no CORS concerns in the browser. Server-rendered Better Auth calls (`src/lib/auth-client.ts`) also use `BACKEND_URL` directly. The proxy timeout is raised to 120s (`experimental.proxyTimeout`) to accommodate long-running store sync and AI operations.

---

## Build & Deploy

```bash
bun run build   # production build
bun run start   # serve the production build (port 3000)
```

When deploying, set `BACKEND_URL` to the public URL of your AppBoard Backend. Image optimization is restricted to the App Store (`**.mzstatic.com`) and Google Play (`play-lh.googleusercontent.com`) CDNs via `images.remotePatterns` in `next.config.ts` — add hosts there if you serve assets from elsewhere.

---

## Project Structure

```
src/
├── app/            # Next.js App Router
│   ├── (app)/      # Authenticated route group (dashboard, apps, groups, settings, …)
│   └── (auth)/     # Public route group (login, register)
├── components/     # UI components (shadcn/ui + feature components)
├── hooks/          # TanStack Query hooks (use-apps, use-listings, use-features, …)
├── lib/            # API client, auth client, types, CSV/diff utilities
└── test/           # Test setup
```

---

## Development

```bash
bun dev          # dev server with watch mode (port 6600)
bun run lint     # ESLint
bun run typecheck # tsc --noEmit
bun test         # run tests
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and the PR process.

By contributing you agree that your contributions will be licensed under the PolyForm Noncommercial License 1.0.0.

Planned work and known gaps are tracked in [GitHub Issues](https://github.com/erykkruk/appboard-web/issues).

---

## Security

Found a security issue? Please **do not** open a public issue. See [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## License

Source-available under the **PolyForm Noncommercial License 1.0.0** — free for personal and non-commercial use; commercial use and resale are not permitted. This is not an OSI open-source license.

© 2026 [Eryk Kruk](https://github.com/erykkruk). See [LICENSE](LICENSE) for the full text.
