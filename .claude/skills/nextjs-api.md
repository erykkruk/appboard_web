# name: nextjs-api

description: Create an API route with proper validation and error handling. Generates Next.js App Router API route.

arguments:

- name: routeName
  description: Name of the API route (e.g., "apps", "stores")
  required: true
- name: methods
  description: HTTP methods to implement (GET, POST, PUT, PATCH, DELETE)
  required: false
  default: "GET,POST"

---

# Next.js API Route Generator

This skill creates API routes following Next.js App Router patterns.

## Generated Structure

```
src/app/api/{routeName}/
├── route.ts                    # Collection routes (GET all, POST)
└── [id]/
    └── route.ts               # Single item routes (GET one, PATCH, DELETE)
```

## Template: api/{routeName}/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/lib/api';

const create{{PascalName}}Schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';

    const response = await api.get('/api/{{kebabName}}', {
      page, limit, search,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/{{kebabName}} error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch {{kebabName}}' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = create{{PascalName}}Schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const response = await api.post('/api/{{kebabName}}', result.data);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('POST /api/{{kebabName}} error:', error);
    return NextResponse.json(
      { error: 'Failed to create {{camelName}}' },
      { status: 500 }
    );
  }
}
```

## Template: api/{routeName}/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '@/lib/api';

const update{{PascalName}}Schema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const response = await api.get(`/api/{{kebabName}}/${id}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/{{kebabName}}/[id] error:', error);
    return NextResponse.json(
      { error: '{{PascalName}} not found' },
      { status: 404 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = update{{PascalName}}Schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const response = await api.put(`/api/{{kebabName}}/${id}`, result.data);

    return NextResponse.json(response);
  } catch (error) {
    console.error('PATCH /api/{{kebabName}}/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update {{camelName}}' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await api.delete(`/api/{{kebabName}}/${id}`);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/{{kebabName}}/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete {{camelName}}' },
      { status: 500 }
    );
  }
}
```

## Instructions

1. Replace placeholders:
   - `{{PascalName}}` -> PascalCase (e.g., "App")
   - `{{camelName}}` -> camelCase (e.g., "app")
   - `{{kebabName}}` -> kebab-case (e.g., "app")

2. Customize validation schemas based on your data model

3. Add authentication/authorization if needed

4. Test endpoints with appropriate HTTP client
