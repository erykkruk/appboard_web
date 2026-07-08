# Command: pr

Create a pull request for AppBoard Web.

## Usage

```
/pr
/pr "PR Title"
```

---

## What This Command Does

1. Runs quality checks
2. Pushes current branch
3. Creates PR with template
4. Opens PR in browser (optional)

---

## PR Template

```markdown
## Summary

Brief description of changes.

## Changes

- [ ] Change 1
- [ ] Change 2

## Type of Change

- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring
- [ ] Performance
- [ ] Tests

## Testing

- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist

- [ ] Code follows project conventions
- [ ] ESLint passes
- [ ] TypeScript compiles without errors
- [ ] No console.log statements
- [ ] shadcn/ui components used for UI
- [ ] TanStack Query patterns followed

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Related Issues

Closes #123
```

---

## Pre-PR Steps

### Step 1: Ensure Branch is Up to Date

```bash
git fetch origin
git rebase origin/main
```

### Step 2: Run Full Quality Check

```bash
bun run lint
bun test
bun run build
```

### Step 3: Push Branch

```bash
git push -u origin feature/branch-name
```

### Step 4: Create PR

```bash
gh pr create --title "feat(scope): description" --body "PR body"
```

---

## Branch Naming Convention

```
<type>/<description>

Examples:
feature/add-app-dashboard
fix/session-redirect-loop
chore/update-shadcn-components
refactor/extract-auto-save-hook
```

---

## PR Size Guidelines

| Size | Files Changed | Lines Changed |
|------|---------------|---------------|
| Small | 1-5 | < 100 |
| Medium | 5-15 | 100-500 |
| Large | 15+ | 500+ (consider splitting) |

---

## PR Checklist

Before creating PR:

- [ ] Branch is up to date with main
- [ ] All commits are meaningful
- [ ] Quality checks pass (`/quality-check`)
- [ ] Tests added for new code
- [ ] No debug code left
- [ ] No secrets exposed
