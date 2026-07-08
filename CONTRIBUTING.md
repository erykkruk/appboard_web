# Contributing to AppBoard Web

First off — thanks for taking the time to contribute! 🎉

This document describes how to set up a development environment, our code style, and the pull request process for the AppBoard admin panel.

---

## Ways to Contribute

- **Report bugs** — open an issue describing the problem and how to reproduce it
- **Request features** — open an issue describing the use case
- **Improve docs** — README, inline docs, examples
- **Fix bugs / implement features** — see below

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) `>= 1.3`
- A running [AppBoard Backend](https://github.com/erykkruk/appboard-backend) (defaults to `http://localhost:6680`)

### Setup

```bash
git clone https://github.com/erykkruk/appboard-web.git
cd appboard-web
bun install
bun dev
```

The admin panel listens on `http://localhost:6600`. No configuration is required as long as the backend runs on the default `http://localhost:6680`. If your backend lives elsewhere, copy `.env.example` to `.env` and set `BACKEND_URL`.

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

The browser talks to the backend through the server-side `/api/*` proxy configured in `next.config.ts` — never call the backend host directly from client code.

---

## Code Style

- **Linter:** [ESLint](https://eslint.org/) (`eslint-config-next`) — run `bun run lint` before committing
- **Type safety:** run `bun run typecheck` (`tsc --noEmit`) — no `any`, prefer precise types or `unknown` + narrowing
- **Naming:**
  - Files: `kebab-case.ts` / `kebab-case.tsx`
  - Components: `PascalCase`
  - Hooks: `useCamelCase` in `kebab-case` files (e.g. `use-apps.ts`)
  - Functions/variables: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`
- **Imports:** use the `@/` path alias instead of deep relative imports
- **Data fetching:** use [TanStack Query](https://tanstack.com/query) hooks in `src/hooks/` — keep fetch logic out of components
- **No business logic in components** — keep it in hooks / `src/lib/`

---

## Testing

Tests run with the built-in Bun test runner and [Testing Library](https://testing-library.com/).

```bash
bun test                     # all tests
bun test src/hooks           # only hooks
```

### Writing Tests

- Follow **Arrange → Act → Assert** structure
- Test behavior, not implementation details
- Co-locate test files next to the code they cover (e.g. `use-history.test.ts`)

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.

Examples:
```
feat(listings): add bulk language switcher
fix(auth): redirect stale sessions to login
chore(deps): bump next to 16.1.6
```

---

## Pull Request Process

1. **Fork** the repo and create a branch from `main`: `git checkout -b feat/my-feature`
2. **Make your changes** — keep commits focused and well-described
3. **Add tests** for any new logic or bug fix
4. **Run the full quality gate** locally before opening a PR:
   ```bash
   bun run lint
   bun run typecheck
   bun test
   bun run build
   ```
5. **Update docs** if your change affects public behavior, config, or the UI surface
6. **Open a PR** — link any related issue
7. **Respond to review** — be open to feedback, we aim to be constructive

All checks must pass before a PR can be merged.

---

## Questions?

Open a [GitHub issue](https://github.com/erykkruk/appboard-web/issues). We're happy to help.
