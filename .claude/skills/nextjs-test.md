# name: nextjs-test

description: Generate test scaffolds for components, hooks, and API routes. Creates comprehensive tests following testing best practices.

arguments:

- name: targetPath
  description: Path to the file to test (e.g., "src/hooks/use-apps.ts")
  required: true
- name: testType
  description: Type of test (unit, integration, e2e)
  required: false
  default: "unit"

---

# Next.js Test Generator

This skill creates test scaffolds following testing best practices.

## Test Types

| Type        | Location                        | Purpose                    |
| ----------- | ------------------------------- | -------------------------- |
| Unit        | `__tests__/unit/` or co-located | Individual functions, hooks|
| Integration | `__tests__/integration/`        | Component + API interaction|
| E2E         | `e2e/`                          | Full user flows            |

## Template: Component Test

```typescript
// __tests__/components/app-card.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppCard } from '@/components/app-card';

const mockApp = {
  id: 'app-1',
  name: 'My App',
  bundleId: 'com.example.app',
  platform: 'app_store' as const,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('AppCard', () => {
  describe('rendering', () => {
    it('displays the app name', () => {
      render(<AppCard app={mockApp} />);

      expect(screen.getByText('My App')).toBeInTheDocument();
    });

    it('displays the bundle ID when provided', () => {
      render(<AppCard app={mockApp} />);

      expect(screen.getByText('com.example.app')).toBeInTheDocument();
    });

    it('displays platform badge', () => {
      render(<AppCard app={mockApp} />);

      expect(screen.getByText('App Store')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onSelect with app id when clicked', async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();

      render(<AppCard app={mockApp} onSelect={onSelect} />);

      await user.click(screen.getByRole('article'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('app-1');
    });

    it('does not crash when onSelect is not provided', async () => {
      const user = userEvent.setup();

      render(<AppCard app={mockApp} />);

      await user.click(screen.getByRole('article'));
      // No error should be thrown
    });
  });
});
```

## Template: Hook Test (TanStack Query)

```typescript
// __tests__/hooks/use-apps.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useApps, useCreateApp } from '@/hooks/use-apps';

const mockApps = [
  { id: '1', name: 'App A', platform: 'app_store' },
  { id: '2', name: 'App B', platform: 'google_play' },
];

const server = setupServer(
  http.get('/api/apps', () => {
    return HttpResponse.json(mockApps);
  }),
  http.post('/api/apps', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '3', ...body }, { status: 201 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useApps', () => {
  it('fetches apps successfully', async () => {
    const { result } = renderHook(() => useApps(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockApps);
  });

  it('handles fetch error', async () => {
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

describe('useCreateApp', () => {
  it('creates an app successfully', async () => {
    const { result } = renderHook(() => useCreateApp(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ name: 'New App', platform: 'app_store' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

## Template: Form Test

```typescript
// __tests__/components/app-form.test.tsx
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

  it('displays validation error for empty name', async () => {
    const user = userEvent.setup();

    render(<AppForm onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('displays default values when provided', () => {
    render(
      <AppForm
        defaultValues={{ name: 'Existing App', bundleId: 'com.example.existing' }}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue('Existing App');
    expect(screen.getByLabelText(/bundle id/i)).toHaveValue('com.example.existing');
  });

  it('disables submit button when submitting', () => {
    render(<AppForm onSubmit={mockOnSubmit} isSubmitting />);

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
```

## Template: API Route Test

```typescript
// __tests__/api/apps.test.ts
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/apps/route';

// Mock the API client
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { api } from '@/lib/api';

describe('/api/apps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns apps list', async () => {
      const mockData = [{ id: '1', name: 'App' }];
      (api.get as jest.Mock).mockResolvedValue({ data: mockData });

      const request = new NextRequest('http://localhost:6600/api/apps');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockData);
    });
  });

  describe('POST', () => {
    it('creates an app with valid data', async () => {
      const newApp = { id: '1', name: 'New App' };
      (api.post as jest.Mock).mockResolvedValue({ data: newApp });

      const request = new NextRequest('http://localhost:6600/api/apps', {
        method: 'POST',
        body: JSON.stringify({ name: 'New App' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(newApp);
    });

    it('returns 400 for invalid data', async () => {
      const request = new NextRequest('http://localhost:6600/api/apps', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
```

## Test Setup Files

```typescript
// test-setup.ts (for Bun test runner)
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
```

## Instructions

1. Install testing dependencies:

   ```bash
   bun add -d @testing-library/react @testing-library/jest-dom @testing-library/user-event msw happy-dom
   ```

2. Create test setup file

3. Add test scripts to `package.json`

4. Follow the testing patterns for your specific file type
