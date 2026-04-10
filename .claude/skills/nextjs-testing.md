# name: nextjs-testing

description: Testing best practices for Next.js applications using Bun test runner, React Testing Library, and MSW. Covers component testing, hook testing, and integration testing.

---

# Next.js Testing Guide

Based on [React Testing Library](https://testing-library.com/) philosophy and 2025 best practices.

## Core Philosophy

> "The more your tests resemble the way your software is used, the more confidence they can give you."

**Test behavior, not implementation.**

---

## 1. Setup

### Install Dependencies

```bash
bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event msw happy-dom
```

### Bun Test Configuration

AppBoard uses Bun's built-in test runner with happy-dom for DOM environment.

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning:')) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
```

---

## 2. Component Testing

### Query Priority (Accessibility First)

```typescript
// 1. getByRole - BEST (accessible to everyone)
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('textbox', { name: 'Email' });
screen.getByRole('heading', { level: 1 });

// 2. getByLabelText - GOOD (form inputs)
screen.getByLabelText('Email address');

// 3. getByPlaceholderText - OK
screen.getByPlaceholderText('Enter email');

// 4. getByText - OK (for content)
screen.getByText('Welcome back');

// 5. getByTestId - LAST RESORT
screen.getByTestId('custom-element');
```

### Arrange-Act-Assert Pattern

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppCard } from '@/components/app-card';

const mockApp = {
  id: '1',
  name: 'My App',
  bundleId: 'com.example.app',
  platform: 'app_store' as const,
};

describe('AppCard', () => {
  it('renders app information', () => {
    // Arrange
    render(<AppCard app={mockApp} />);

    // Assert
    expect(screen.getByRole('heading', { name: 'My App' })).toBeInTheDocument();
    expect(screen.getByText('com.example.app')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<AppCard app={mockApp} onSelect={onSelect} />);

    // Act
    await user.click(screen.getByRole('article'));

    // Assert
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

describe('SearchForm', () => {
  it('submits search query', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();

    render(<SearchForm onSearch={onSearch} />);

    // Type in search field
    await user.type(screen.getByRole('searchbox'), 'My App');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('My App');
  });

  it('clears search on escape key', async () => {
    const user = userEvent.setup();

    render(<SearchForm onSearch={jest.fn()} />);

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
  });
});
```

---

## 3. Form Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppForm } from '@/components/forms/app-form';

describe('AppForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();

    render(<AppForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'New App');
    await user.type(screen.getByLabelText(/bundle id/i), 'com.example.app');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New App',
        bundleId: 'com.example.app',
      });
    });
  });

  it('displays validation errors', async () => {
    const user = userEvent.setup();

    render(<AppForm onSubmit={mockOnSubmit} />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Check for error messages
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('clears errors when user types', async () => {
    const user = userEvent.setup();

    render(<AppForm onSubmit={mockOnSubmit} />);

    // Trigger error
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    // Start typing
    await user.type(screen.getByLabelText(/name/i), 'N');

    // Error should clear
    await waitFor(() => {
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
    });
  });
});
```

---

## 4. Hook Testing

### TanStack Query Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useApps } from '@/hooks/use-apps';

const mockApps = [
  { id: '1', name: 'App A' },
  { id: '2', name: 'App B' },
];

// MSW server setup
const server = setupServer(
  http.get('/api/apps', () => {
    return HttpResponse.json(mockApps);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Wrapper for TanStack Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useApps', () => {
  it('fetches apps successfully', async () => {
    const { result } = renderHook(() => useApps(), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockApps);
  });

  it('handles server error', async () => {
    // Override handler for this test
    server.use(
      http.get('/api/apps', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useApps(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useToggle } from '@/hooks/use-toggle';

describe('useToggle', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current.value).toBe(false);
  });

  it('initializes with provided value', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current.value).toBe(true);
  });

  it('toggles value', () => {
    const { result } = renderHook(() => useToggle());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.value).toBe(false);
  });
});
```

---

## 5. Async Testing

```typescript
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';

describe('AsyncComponent', () => {
  it('shows loading then content', async () => {
    render(<AsyncComponent />);

    // Loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for content
    await waitFor(() => {
      expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    });

    // Loading should be gone
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('removes loading indicator', async () => {
    render(<AsyncComponent />);

    // Wait for loading to disappear
    await waitForElementToBeRemoved(() => screen.getByText(/loading/i));

    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
  });
});
```

---

## 6. MSW for API Mocking

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET list
  http.get('/api/apps', () => {
    return HttpResponse.json([
      { id: '1', name: 'App A' },
      { id: '2', name: 'App B' },
    ]);
  }),

  // GET single
  http.get('/api/apps/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'App Details',
    });
  }),

  // POST create
  http.post('/api/apps', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  }),

  // DELETE
  http.delete('/api/apps/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Error case
  http.get('/api/error', () => {
    return HttpResponse.json({ message: 'Server error' }, { status: 500 });
  }),
];

// mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

## 7. Test Organization

### File Structure

```
src/
├── hooks/
│   ├── use-apps.ts
│   └── __tests__/
│       └── use-apps.test.ts
├── components/
│   ├── app-card.tsx
│   └── __tests__/
│       └── app-card.test.tsx
└── test/
    ├── setup.ts
    └── integration/
        └── create-app.test.tsx
```

### Test Naming Convention

```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('does expected behavior', () => {});
  });

  describe('user interactions', () => {
    it('handles click event', () => {});
    it('handles form submission', () => {});
  });

  describe('error states', () => {
    it('displays error message', () => {});
  });
});
```

---

## 8. Coverage Targets

| Layer      | Target |
| ---------- | ------ |
| API Hooks  | 90%+   |
| Stores     | 90%+   |
| Utils      | 90%+   |
| Components | 80%+   |
| Pages      | 70%+   |

### Run Coverage

```bash
bun test --coverage
```

---

## Quick Checklist

- [ ] Use `screen` for queries
- [ ] Use `userEvent` over `fireEvent`
- [ ] Query by role first
- [ ] Test behavior, not implementation
- [ ] Use Arrange-Act-Assert
- [ ] Mock API with MSW
- [ ] Clean up mocks in beforeEach
- [ ] Use waitFor for async
- [ ] Don't test implementation details
