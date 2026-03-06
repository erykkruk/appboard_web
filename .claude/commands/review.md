# Command: review

Perform a comprehensive code review for AppBoard Web changes.

## Usage

```
/review
/review <file_path>
/review <pr_number>
```

---

## What This Command Does

Runs appropriate review agents based on changed files and generates a consolidated report.

---

## Review Process

### Step 1: Identify Changed Files

```bash
git diff --cached --name-only
git diff --name-only
gh pr diff <pr_number> --name-only
```

### Step 2: Route to Appropriate Reviews

Based on changed files:

| File Pattern | Reviews to Run |
|--------------|----------------|
| `src/app/**/*.tsx` | Architecture, Security |
| `src/components/**/*.tsx` | Code, Performance |
| `src/components/ui/**` | Code (shadcn/ui compliance) |
| `src/hooks/**/*.ts` | Architecture, Code, Testing |
| `src/lib/api.ts` | Security, Architecture |
| `src/lib/auth-client.ts` | Security |
| `src/lib/types.ts` | Code |
| `src/lib/*.ts` | Code, Testing |
| `*.test.tsx` / `*.test.ts` | Testing |
| `next.config.ts` | Security, Performance |
| `package.json` | Security (new deps) |

### Step 3: Run Agent Checklists

For each matched agent, validate against its checklist.

---

## Review Agents

### 1. Architecture Review

**File:** `.claude/agents/architecture-review.md`

**Checks:**
- Directory structure compliance
- Layer dependencies (Pages → Hooks → API)
- TanStack Query patterns
- Import rules (`@/` aliases)

### 2. Code Review

**File:** `.claude/agents/code-review.md`

**Checks:**
- TypeScript type safety (no `any`)
- Naming conventions
- Error handling
- shadcn/ui usage
- Import order

### 3. Security Review

**File:** `.claude/agents/security-review.md`

**Checks:**
- Auth route protection
- No secrets in client code
- API call patterns (relative paths)
- XSS prevention

### 4. Testing Review

**File:** `.claude/agents/testing-review.md`

**Checks:**
- AAA pattern
- Testing Library queries
- Hook test wrappers
- Test isolation
- Coverage targets

### 5. Performance Review

**File:** `.claude/agents/performance-review.md`

**Checks:**
- Memoization
- TanStack Query staleTime
- Next.js Image usage
- Dynamic imports
- Bundle optimization

---

## Review Report Template

```markdown
## Code Review Report — AppBoard Web

**Date:** YYYY-MM-DD
**Reviewer:** Claude
**Files Reviewed:** X files

---

### Critical Issues (Must Fix)

1. **File:** `src/hooks/use-apps.ts:12`
   - **Issue:** Uses `any` type
   - **Fix:** Define typed response

---

### Warnings (Should Fix)

1. **File:** `src/components/app-card.tsx:8`
   - **Issue:** Missing error handling in mutation
   - **Recommendation:** Add onError callback

---

### Suggestions (Nice to Have)

1. **File:** `src/hooks/use-stores.ts`
   - **Suggestion:** Add staleTime for less frequent refetches

---

### Passed Checks

- [x] Architecture structure
- [x] Security patterns
- [x] Naming conventions
- [x] Import order

---

### Summary

| Category | Status |
|----------|--------|
| Architecture | ✅ Pass |
| Code Quality | ⚠️ 1 warning |
| Security | ✅ Pass |
| Testing | ⚠️ Missing tests |
| Performance | ✅ Pass |

**Overall:** Ready for merge / Requires changes
```
