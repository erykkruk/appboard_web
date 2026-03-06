# Testing Review Agent - AppBoard Web

## Purpose
Validates test quality, coverage, and patterns in the AppBoard Web codebase.

## When to Run
- After writing new tests
- During code review
- Before merging PRs

---

## Test Stack

| Tool | Purpose |
|------|---------|
| Bun test | Test runner |
| happy-dom | DOM environment |
| @testing-library/react | Component rendering |
| @testing-library/user-event | User interaction simulation |
| @testing-library/jest-dom | DOM assertions |

---

## Validation Rules

### 1. Test Structure

#### AAA Pattern (Arrange-Act-Assert)
```typescript
// ✅ CORRECT
test("should display app name", () => {
  // Arrange
  const app = { id: "1", name: "Test App" };

  // Act
  render(<AppCard app={app} />);

  // Assert
  expect(screen.getByText("Test App")).toBeInTheDocument();
});

// ❌ VIOLATION — mixed arrange/act/assert
test("should display app name", () => {
  render(<AppCard app={{ id: "1", name: "Test App" }} />);
  expect(screen.getByText("Test App")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Clicked")).toBeInTheDocument();
});
```

#### Descriptive Test Names
```typescript
// ✅ CORRECT
test("should show error toast when API call fails", () => { ... });
test("should redirect to login when session expires", () => { ... });

// ❌ VIOLATION
test("works", () => { ... });
test("test 1", () => { ... });
```

#### Co-located Test Files
```
// ✅ CORRECT
src/components/actions-menu.tsx
src/components/actions-menu.test.tsx

// Also acceptable
src/test/setup.ts  (shared test utilities)
```

---

### 2. Component Testing

#### Use Testing Library Queries
```typescript
// ✅ CORRECT — accessible queries
screen.getByRole("button", { name: "Save" });
screen.getByText("App Name");
screen.getByLabelText("Email");

// ❌ VIOLATION — implementation details
container.querySelector(".btn-save");
screen.getByTestId("save-button"); // Only as last resort
```

#### Simulate User Events with userEvent
```typescript
// ✅ CORRECT
import userEvent from "@testing-library/user-event";

test("should call onSave when button clicked", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  render(<SaveButton onSave={onSave} />);

  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledOnce();
});

// ❌ VIOLATION — fireEvent (less realistic)
fireEvent.click(screen.getByRole("button"));
```

---

### 3. Hook Testing

#### Wrap Hooks with QueryClient Provider
```typescript
// ✅ CORRECT
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

test("should fetch apps", async () => {
  const { result } = renderHook(() => useApps(), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

---

### 4. API Mocking

#### Mock API Client, Not fetch
```typescript
// ✅ CORRECT — mock the API client
import { api } from "@/lib/api";
vi.mock("@/lib/api");

beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({ data: mockApps });
});

// ❌ VIOLATION — mocking global fetch
global.fetch = vi.fn().mockResolvedValue(...);
```

---

### 5. Test Isolation

#### Each Test Must Be Independent
```typescript
// ✅ CORRECT — fresh state per test
beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

// ❌ VIOLATION — shared mutable state
let sharedData = [];
test("test 1", () => { sharedData.push("a"); });
test("test 2", () => { /* depends on sharedData */ });
```

---

### 6. Coverage Targets

| Layer | Target |
|-------|--------|
| Hooks (`src/hooks/`) | 90%+ |
| Lib utilities (`src/lib/`) | 90%+ |
| Components (`src/components/`) | 80%+ |
| Pages (`src/app/`) | 70%+ |

---

## Testing Checklist

### Every Test File
- [ ] Uses AAA pattern
- [ ] Descriptive test names
- [ ] Tests isolated (no shared state)
- [ ] Mocks cleaned up in beforeEach/afterEach

### Component Tests
- [ ] Uses Testing Library queries (getByRole, getByText)
- [ ] Uses userEvent for interactions
- [ ] Tests loading, error, and success states
- [ ] Tests user interactions

### Hook Tests
- [ ] Wrapped in QueryClientProvider
- [ ] Tests query success and error states
- [ ] Tests mutation side effects (invalidation, toast)

### API Tests
- [ ] API client mocked (not global fetch)
- [ ] Tests error responses
- [ ] Tests loading states

---

## Report Format

```
## Testing Review — AppBoard Web

### Critical (Must Fix)
1. `src/hooks/use-apps.test.ts`
   - Missing error state test
   - Fix: Add test for API failure scenario

### Warnings
1. `src/components/app-card.test.tsx:15`
   - Using fireEvent instead of userEvent
   - Fix: Switch to userEvent.setup()

### Coverage
| Layer | Current | Target | Status |
|-------|---------|--------|--------|
| Hooks | 85% | 90% | ⚠️ |
| Lib | 92% | 90% | ✅ |
| Components | 78% | 80% | ⚠️ |

### Passed
- Test isolation ✓
- AAA pattern ✓
- Mock cleanup ✓
```
