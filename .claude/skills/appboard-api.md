# name: appboard-api

description: Backend API reference for AppBoard. Covers all endpoints, schemas, and authentication methods. Use this when building features that interact with the backend.

---

# AppBoard Backend API Reference

**Backend project**: `appboard_backend/` (Elysia + Bun + Drizzle ORM)

## Base URL

```
NEXT_PUBLIC_API_URL=http://localhost:6680/api
```

All API calls from the web panel go through Next.js rewrites (`/api/*` -> `localhost:6680/api/*`).

---

## Authentication

### Methods

| Type       | Description                                          |
| ---------- | ---------------------------------------------------- |
| **Cookie** | Better Auth session cookie (primary for web panel)   |
| **Bearer** | `Authorization: Bearer <token>` - Bearer token auth  |

### Auth Endpoints (Better Auth)

| Method | Endpoint                            | Description              |
| ------ | ----------------------------------- | ------------------------ |
| POST   | `/api/auth/sign-in/email`           | Email sign-in            |
| POST   | `/api/auth/sign-up/email`           | Email registration       |
| GET    | `/api/auth/get-session`             | Get current session      |
| POST   | `/api/auth/sign-out`                | Sign out                 |
| POST   | `/api/auth/change-password`         | Change password          |
| POST   | `/api/auth/update-user`             | Update user profile      |
| GET    | `/api/auth/list-sessions`           | List all sessions        |
| POST   | `/api/auth/revoke-session`          | Revoke specific session  |

---

## Stores (Store Connections)

| Method | Endpoint                           | Description                        |
| ------ | ---------------------------------- | ---------------------------------- |
| GET    | `/api/stores`                      | List all connected stores          |
| POST   | `/api/stores`                      | Connect a new store                |
| GET    | `/api/stores/{id}`                 | Get store by ID                    |
| PUT    | `/api/stores/{id}`                 | Update store                       |
| DELETE | `/api/stores/{id}`                 | Delete store connection            |
| POST   | `/api/stores/{id}/sync`            | Sync apps from store               |

### Store Schema

```typescript
interface Store {
  id: string;
  name: string;
  platform: "app_store" | "google_play";
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Apps

| Method | Endpoint                           | Description                        |
| ------ | ---------------------------------- | ---------------------------------- |
| GET    | `/api/apps`                        | List all apps (paginated)          |
| GET    | `/api/apps/{id}`                   | Get app by ID                      |
| PUT    | `/api/apps/{id}`                   | Update app                         |
| DELETE | `/api/apps/{id}`                   | Delete app                         |

### App Schema

```typescript
interface App {
  id: string;
  name: string;
  bundleId: string;
  platform: "app_store" | "google_play";
  storeId: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Versions

| Method | Endpoint                                  | Description                    |
| ------ | ----------------------------------------- | ------------------------------ |
| GET    | `/api/apps/{appId}/versions`              | List versions for app          |
| GET    | `/api/apps/{appId}/versions/{versionId}`  | Get version details            |
| PUT    | `/api/apps/{appId}/versions/{versionId}`  | Update version                 |

---

## Listings (Localizations)

| Method | Endpoint                                                  | Description              |
| ------ | --------------------------------------------------------- | ------------------------ |
| GET    | `/api/apps/{appId}/versions/{versionId}/listings`         | List all listings        |
| GET    | `/api/apps/{appId}/versions/{versionId}/listings/{locale}`| Get listing by locale    |
| PUT    | `/api/apps/{appId}/versions/{versionId}/listings/{locale}`| Update listing           |
| POST   | `/api/apps/{appId}/versions/{versionId}/listings`         | Create listing           |
| DELETE | `/api/apps/{appId}/versions/{versionId}/listings/{locale}`| Delete listing           |

### Listing Schema

```typescript
interface Listing {
  id: string;
  locale: string;
  title?: string;
  subtitle?: string;
  description?: string;
  keywords?: string;
  whatsNew?: string;
  promotionalText?: string;
  appId: string;
  versionId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Screenshots & Graphics

| Method | Endpoint                                                          | Description                |
| ------ | ----------------------------------------------------------------- | -------------------------- |
| GET    | `/api/apps/{appId}/versions/{versionId}/assets`                   | List all assets            |
| POST   | `/api/apps/{appId}/versions/{versionId}/assets`                   | Upload asset               |
| PUT    | `/api/apps/{appId}/versions/{versionId}/assets/{assetId}`         | Update asset               |
| DELETE | `/api/apps/{appId}/versions/{versionId}/assets/{assetId}`         | Delete asset               |
| PUT    | `/api/apps/{appId}/versions/{versionId}/assets/reorder`           | Reorder assets             |

---

## ASO Profiles

| Method | Endpoint                                | Description              |
| ------ | --------------------------------------- | ------------------------ |
| GET    | `/api/apps/{appId}/aso-profile`         | Get ASO profile          |
| PUT    | `/api/apps/{appId}/aso-profile`         | Update ASO profile       |

---

## Purchases (In-App Purchases)

| Method | Endpoint                                | Description                     |
| ------ | --------------------------------------- | ------------------------------- |
| GET    | `/api/apps/{appId}/purchases`           | List in-app purchases           |
| GET    | `/api/apps/{appId}/purchases/{id}`      | Get purchase by ID              |
| PUT    | `/api/apps/{appId}/purchases/{id}`      | Update purchase                 |

---

## Reviews

| Method | Endpoint                                | Description              |
| ------ | --------------------------------------- | ------------------------ |
| GET    | `/api/apps/{appId}/reviews`             | List app reviews         |

---

## Publishing

| Method | Endpoint                                    | Description              |
| ------ | ------------------------------------------- | ------------------------ |
| POST   | `/api/apps/{appId}/versions/{versionId}/publish` | Publish version     |

---

## AI Features

| Method | Endpoint                                    | Description                   |
| ------ | ------------------------------------------- | ----------------------------- |
| POST   | `/api/ai/generate-listing`                  | AI generate listing metadata  |
| POST   | `/api/ai/generate-keywords`                 | AI generate ASO keywords      |

---

## Settings

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| GET    | `/api/settings`         | Get workspace settings   |
| PUT    | `/api/settings`         | Update workspace settings|

---

## Common Schemas

### Pagination Response

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Error Handling

### Validation Error (422)

```typescript
interface ValidationError {
  type: "validation";
  on: string;
  summary?: string;
  message?: string;
  property?: string;
  expected?: string;
  found?: unknown;
}
```

### Usage in TanStack Query

```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
```

---

## TanStack Query Keys Convention

```typescript
// Apps
export const appKeys = {
  all: ["apps"] as const,
  lists: () => [...appKeys.all, "list"] as const,
  list: (filters: object) => [...appKeys.lists(), filters] as const,
  details: () => [...appKeys.all, "detail"] as const,
  detail: (id: string) => [...appKeys.details(), id] as const,
};

// Stores
export const storeKeys = {
  all: ["stores"] as const,
  lists: () => [...storeKeys.all, "list"] as const,
  details: () => [...storeKeys.all, "detail"] as const,
  detail: (id: string) => [...storeKeys.details(), id] as const,
};

// Versions
export const versionKeys = {
  all: ["versions"] as const,
  byApp: (appId: string) => [...versionKeys.all, { appId }] as const,
  detail: (appId: string, versionId: string) =>
    [...versionKeys.all, { appId, versionId }] as const,
};

// Listings
export const listingKeys = {
  all: ["listings"] as const,
  byVersion: (appId: string, versionId: string) =>
    [...listingKeys.all, { appId, versionId }] as const,
};
```

---

## Example API Hooks

### useApps

```typescript
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { App } from "@/lib/types";

export function useApps() {
  return useQuery({
    queryKey: ["apps"],
    queryFn: () => api.get<App[]>("/api/apps").then((res) => res.data),
  });
}
```

### useStores

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Store } from "@/lib/types";
import { toast } from "sonner";

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => api.get<Store[]>("/api/stores").then((res) => res.data),
  });
}

export function useConnectStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConnectStoreDto) =>
      api.post<Store>("/api/stores", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      toast.success("Store connected");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to connect store");
    },
  });
}
```

---

## API Client Setup

```typescript
// src/lib/api.ts
// Centralized fetch wrapper with cookie-based auth
// All requests go through Next.js proxy: /api/* -> localhost:6680/api/*
// Uses relative paths - never hardcode backend URL

export const api = {
  get: <T>(url: string, params?: Record<string, string>) => fetch(url, ...),
  post: <T>(url: string, body: unknown) => fetch(url, ...),
  put: <T>(url: string, body: unknown) => fetch(url, ...),
  delete: (url: string) => fetch(url, ...),
};
```
