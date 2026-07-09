# Contributing to AppBoard Web

Thanks for your interest in contributing to AppBoard! This is the admin panel
(Next.js 16, React 19, TanStack Query, Better Auth) for the source-available,
self-hostable ASO (App Store Optimization) tool. Contributions of all kinds are
welcome — bug fixes, features, docs, and tests.

AppBoard is **source-available and free for personal & non-commercial use under
the [PolyForm Noncommercial License 1.0.0](LICENSE)**. Note that this is **not**
an OSI-approved open-source license — it restricts commercial use. By
contributing, you agree that your contributions will be licensed under the same
PolyForm Noncommercial License 1.0.0.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold it. Please report unacceptable
behavior to conduct@appboard.dev.

## Prerequisites

- [Bun](https://bun.sh/) `>= 1.3`
- A running [AppBoard Backend](https://github.com/erykkruk/appboard_backend)
  (defaults to `http://localhost:6680`)

## Local Setup

```bash
# 1. Fork and clone the repo, then:
bun install

# 2. (Optional) create a local env file — only needed if the backend
#    runs somewhere other than http://localhost:6680
cp .env.example .env

# 3. Start the dev server
bun dev
```

The admin panel runs at `http://localhost:6600`. All `/api/*` requests are
proxied server-side to the backend (`BACKEND_URL`, default
`http://localhost:6680`), so the browser never calls the backend directly.

## Before You Open a PR

Run the full local check suite and make sure everything passes:

```bash
bun run lint        # ESLint
bun run typecheck   # tsc --noEmit
bun test            # tests
bun run build       # production build (catches build-time issues)
```

- Add or update tests for any behavior you change.
- Keep changes focused — one logical change per PR.

## Branch Model

- **`develop`** is the integration branch. Base your work on it and open PRs
  **into `develop`**.
- **`main`** is the released/deployed branch. Do not target it directly.

```bash
git checkout develop
git pull
git checkout -b feat/my-change
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add screenshot reordering to the listings editor
fix: preserve query cache on workspace switch
chore: bump next to 16.2.4
docs: update local setup instructions
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`.

## Pull Requests

1. Ensure lint, type check, tests, and the build pass locally.
2. Push your branch and open a PR **targeting `develop`**.
3. Fill out the PR template (Summary, Changes, Related issue, Testing, Checklist).
4. Use a Conventional Commits style PR title.

### Review Expectations

- Every PR requires review and approval before it can be merged — direct pushes
  to `develop`/`main` are not accepted.
- A maintainer will review for correctness, UI/UX consistency, accessibility,
  and adherence to the conventions in `CLAUDE.md`.
- Be responsive to review feedback; keep the discussion constructive.

## Security

Please do not report security vulnerabilities via public issues. See
[SECURITY.md](SECURITY.md) for responsible disclosure.
