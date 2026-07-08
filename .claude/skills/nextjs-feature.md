# name: nextjs-feature

description: Create a complete feature scaffold with API hooks, types, components, and page. Generates full feature module following project architecture.

arguments:

- name: featureName
  description: Name of the feature (e.g., "apps", "stores", "versions", "listings")
  required: true

---

# Next.js Feature Generator

This skill creates a complete feature scaffold following the AppBoard project architecture.

## Generated Structure

```
src/hooks/
└── use-{featureName}.ts          # TanStack Query hooks

src/lib/
└── types.ts                       # Add types here (shared types file)

src/components/
├── {feature}-list.tsx             # List component
├── {feature}-card.tsx             # Card component
└── {feature}-form.tsx             # Form component

src/app/(app)/
└── {featureName}/
    └── page.tsx                   # Page component
```

## Template: types (add to src/lib/types.ts)

```typescript
export interface {{PascalName}} {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Create{{PascalName}}Dto {
  name: string;
  description?: string;
}

export interface Update{{PascalName}}Dto extends Partial<Create{{PascalName}}Dto> {}
```

## Template: hooks/use-{featureName}.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { {{PascalName}}, Create{{PascalName}}Dto, Update{{PascalName}}Dto } from '@/lib/types';
import { toast } from 'sonner';

export const {{camelName}}Keys = {
  all: ['{{kebabName}}'] as const,
  lists: () => [...{{camelName}}Keys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...{{camelName}}Keys.lists(), filters] as const,
  details: () => [...{{camelName}}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{{camelName}}Keys.details(), id] as const,
};

export function use{{PascalName}}s() {
  return useQuery({
    queryKey: {{camelName}}Keys.lists(),
    queryFn: () => api.get<{{PascalName}}[]>('/api/{{kebabName}}').then(res => res.data),
  });
}

export function use{{PascalName}}(id: string) {
  return useQuery({
    queryKey: {{camelName}}Keys.detail(id),
    queryFn: () => api.get<{{PascalName}}>(`/api/{{kebabName}}/${id}`).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreate{{PascalName}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create{{PascalName}}Dto) =>
      api.post<{{PascalName}}>('/api/{{kebabName}}', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {{camelName}}Keys.lists() });
      toast.success('{{PascalName}} created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create {{camelName}}');
    },
  });
}

export function useUpdate{{PascalName}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update{{PascalName}}Dto }) =>
      api.put<{{PascalName}}>(`/api/{{kebabName}}/${id}`, data).then(res => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: {{camelName}}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: {{camelName}}Keys.lists() });
      toast.success('{{PascalName}} updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update {{camelName}}');
    },
  });
}

export function useDelete{{PascalName}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/{{kebabName}}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {{camelName}}Keys.lists() });
      toast.success('{{PascalName}} deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete {{camelName}}');
    },
  });
}
```

## Template: components/{feature}-card.tsx

```typescript
import type { {{PascalName}} } from '@/lib/types';

interface {{PascalName}}CardProps {
  {{camelName}}: {{PascalName}};
  onSelect?: (id: string) => void;
}

export function {{PascalName}}Card({ {{camelName}}, onSelect }: {{PascalName}}CardProps) {
  return (
    <div
      className="card cursor-pointer hover:border-accent-primary transition-colors"
      onClick={() => onSelect?.({{camelName}}.id)}
    >
      <h3 className="font-medium">{{{camelName}}.name}</h3>
      {{{camelName}}.description && (
        <p className="text-foreground-secondary text-sm mt-sm">
          {{{camelName}}.description}
        </p>
      )}
    </div>
  );
}
```

## Template: components/{feature}-list.tsx

```typescript
'use client';

import { use{{PascalName}}s } from '@/hooks/use-{{kebabName}}';
import { {{PascalName}}Card } from '@/components/{{kebabName}}-card';

export function {{PascalName}}List() {
  const { data, isLoading, error } = use{{PascalName}}s();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-destructive">Failed to load {{kebabName}}</div>;
  }

  if (!data?.length) {
    return <div className="text-muted-foreground">No {{kebabName}} found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item) => (
        <{{PascalName}}Card key={item.id} {{camelName}}={item} />
      ))}
    </div>
  );
}
```

## Template: app/(app)/{featureName}/page.tsx

```typescript
import { {{PascalName}}List } from '@/components/{{kebabName}}-list';

export default function {{PascalName}}sPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{{PascalName}}s</h1>
        <button className="btn-primary">Add {{PascalName}}</button>
      </div>
      <{{PascalName}}List />
    </div>
  );
}
```

## Instructions

1. Replace placeholders:
   - `{{PascalName}}` -> PascalCase (e.g., "App")
   - `{{camelName}}` -> camelCase (e.g., "app")
   - `{{kebabName}}` -> kebab-case (e.g., "app")

2. Create all files in the correct directories

3. Add the route to sidebar navigation in `src/components/app-sidebar.tsx`

4. Run quality checks: `bun run lint && bun test && bun run build`
