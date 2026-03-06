# Command: quality-check

Run comprehensive code quality checks for AppBoard Web.

## Usage

```
/quality-check
/quality-check --fix
```

---

## What This Command Does

Runs all quality checks in sequence:
1. ESLint
2. TypeScript type checking
3. Tests
4. Build verification

---

## Steps

### Step 1: ESLint

```bash
bun run lint
```

**Expected Output:**
- No errors or warnings
- All files properly linted

### Step 2: TypeScript Check

```bash
bunx tsc --noEmit
```

**Expected Output:**
- No type errors
- All imports resolved

### Step 3: Run Tests

```bash
bun test
```

**Expected Output:**
- All tests passing
- No skipped tests (unless intentional)

### Step 4: Build Verification

```bash
bun run build
```

**Expected Output:**
- Build completes without errors
- `.next/` output generated

---

## Common Issues and Fixes

### ESLint Errors

| Error | Fix |
|-------|-----|
| Unused imports | Remove or prefix with `_` |
| Missing React import | Not needed in React 19 |
| Hook rules violation | Move hook to top level |

### TypeScript Errors

| Error | Fix |
|-------|-----|
| Missing types | Add explicit type annotations |
| Import errors | Check `@/` path aliases |
| Module not found | Run `bun install` |

### Test Failures

| Error | Fix |
|-------|-----|
| DOM not found | Check happy-dom setup |
| Hook error | Wrap in QueryClientProvider |
| Timeout | Increase test timeout |

---

## Pre-Commit Checklist

Before committing, ensure:

- [ ] `bun run lint` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun test` passes
- [ ] No `console.log` statements left
- [ ] No hardcoded secrets
- [ ] All new features have tests

---

## Quick Commands

```bash
# Full quality check
bun run lint && bunx tsc --noEmit && bun test && bun run build

# Lint only
bun run lint

# Type check only
bunx tsc --noEmit

# Tests only
bun test
```
