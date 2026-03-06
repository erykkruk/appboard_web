# Command: commit

Create a well-formatted git commit for AppBoard Web.

## Usage

```
/commit
/commit "Custom commit message"
```

---

## What This Command Does

1. Runs quality checks
2. Stages relevant files
3. Creates commit with conventional format

---

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Build, config, dependencies |

### Scopes

| Scope | Description |
|-------|-------------|
| `auth` | Authentication (Better Auth) |
| `apps` | App management pages |
| `stores` | Store connections |
| `versions` | Version management |
| `listings` | App listings / metadata |
| `screenshots` | Screenshots / graphics |
| `aso` | ASO profile / optimization |
| `settings` | Workspace settings |
| `onboarding` | Onboarding flow |
| `templates` | Listing templates |
| `purchases` | In-app purchases |
| `reviews` | App reviews |
| `ui` | Shared UI components |
| `hooks` | Custom hooks |
| `api` | API client / lib |
| `core` | Root layout, providers, config |

### Examples

```bash
feat(apps): add app detail dashboard page

fix(auth): resolve session redirect loop

refactor(hooks): extract use-auto-save from use-apps

chore(ui): update shadcn button component

feat(screenshots): add crop dialog for screenshots

- Add react-easy-crop integration
- Support custom aspect ratios
- Show preview before saving
```

---

## Pre-Commit Steps

### Step 1: Run Quality Checks

```bash
bun run lint
bun test
```

### Step 2: Review Changes

```bash
git status
git diff
```

### Step 3: Stage Files

```bash
git add src/hooks/use-apps.ts
git add src/app/(app)/apps/
```

### Step 4: Create Commit

```bash
git commit -m "feat(scope): description"
```

---

## Files to Exclude from Commits

Never commit:
- `.env` / `.env.local` files
- `node_modules/`
- `.next/`
- `.DS_Store`
- `tsconfig.tsbuildinfo`

---

## Commit Checklist

Before committing:

- [ ] `bun run lint` passes
- [ ] `bun test` passes
- [ ] Changes are logically grouped
- [ ] Commit message follows convention
- [ ] No secrets in staged files
- [ ] No `console.log` statements
- [ ] Tests added for new features
