# AppBoard Web

## Overview

Panel webowy AppBoard — narzędzie ASO (App Store Optimization) do zarządzania aplikacjami, listingami, screenshotami i metadanymi w App Store i Google Play.

---

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| UI Library | React | 19.x |
| Server State | TanStack React Query | 5.x |
| Auth | Better Auth (client) | 1.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui + Radix UI | latest |
| Drag & Drop | dnd-kit | latest |
| Icons | Lucide React | latest |
| Toasts | Sonner | latest |
| Theme | next-themes | latest |
| Linter | ESLint (next config) | 9.x |
| Testing | Bun test + RTL + happy-dom | latest |
| Package Manager | Bun | latest |

---

## Development Commands

| Command | Description |
|---------|------------|
| `bun dev` | Start dev server on port 6600 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | ESLint check |
| `bun test` | Run tests (Bun + happy-dom) |

---

## Directory Structure

```
src/
├── app/
│   ├── (app)/                   # Authenticated layout group
│   │   ├── layout.tsx           # Sidebar + providers
│   │   ├── page.tsx             # Dashboard redirect
│   │   ├── dashboard/           # Main dashboard
│   │   ├── apps/
│   │   │   └── [appId]/         # App detail pages
│   │   │       ├── layout.tsx   # App-level layout
│   │   │       ├── dashboard/   # App dashboard
│   │   │       ├── information/ # App metadata/listing
│   │   │       ├── versions/    # Version management
│   │   │       │   └── [versionId]/ # Version detail
│   │   │       │       ├── age-rating/
│   │   │       │       ├── graphics/
│   │   │       │       └── languages/
│   │   │       ├── publish/     # Publishing flow
│   │   │       ├── purchases/   # In-app purchases
│   │   │       ├── reviews/     # User reviews
│   │   │       ├── settings/    # App settings
│   │   │       └── setup/       # Initial setup
│   │   ├── onboarding/          # First-time setup
│   │   ├── settings/            # Workspace settings
│   │   └── templates/           # Listing templates
│   ├── (auth)/                  # Auth layout group (login/register)
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles (Tailwind)
│   └── not-found.tsx            # 404 page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── app-sidebar.tsx          # Main sidebar navigation
│   ├── page-header.tsx          # Page header component
│   ├── providers.tsx            # QueryClient + Theme providers
│   ├── actions-menu.tsx         # Context actions menu
│   ├── character-counter.tsx    # Input character counter
│   ├── prompt-editor.tsx        # AI prompt editor
│   ├── screenshot-crop-dialog.tsx
│   ├── screenshot-split-dialog.tsx
│   └── monetization-planner/    # Monetization planning widget
├── hooks/
│   ├── use-apps.ts              # App CRUD operations
│   ├── use-stores.ts            # Store connections
│   ├── use-settings.ts          # Workspace settings
│   ├── use-aso-profile.ts       # ASO profile management
│   ├── use-assets.ts            # Screenshots/graphics
│   ├── use-publishing.ts        # Publishing flow
│   ├── use-purchases.ts        # In-app purchases
│   ├── use-reviews.ts           # App reviews
│   ├── use-ai.ts                # AI features
│   ├── use-app-ai-prompts.ts    # AI prompt management
│   ├── use-age-rating.ts        # Age rating
│   ├── use-app-groups.ts        # App grouping
│   ├── use-auto-save.ts         # Auto-save hook
│   ├── use-capabilities.ts      # Feature capabilities
│   ├── use-mobile.ts            # Mobile detection
│   ├── use-monetization-chat.ts # Monetization AI chat
│   ├── use-privacy-declaration.ts # Privacy declarations
│   └── use-prompts.ts           # Prompt management
├── lib/
│   ├── api.ts                   # API client (fetch wrapper)
│   ├── auth-client.ts           # Better Auth client
│   ├── types.ts                 # Shared TypeScript types
│   ├── utils.ts                 # Utility functions (cn, etc.)
│   ├── aso-profile-csv.ts       # ASO profile CSV export
│   ├── listings-csv.ts          # Listings CSV export
│   ├── gp-data-safety-catalog.ts # Google Play data safety
│   └── privacy-catalog.ts       # Privacy catalog data
├── proxy.ts                     # API proxy configuration
└── test/                        # Test setup & utilities
```

---

## Architecture Pattern

**App Router + Hooks-based architecture** (bez feature-based folders):

```
Pages (src/app/)  →  Hooks (src/hooks/)  →  API Client (src/lib/api.ts)  →  Backend
     ↓                     ↓
Components            TanStack Query
(src/components/)     (cache + mutations)
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Pages** | `src/app/` | Route handling, layout, page composition |
| **Components** | `src/components/` | Reusable UI, presentation logic |
| **Hooks** | `src/hooks/` | Business logic, API calls via TanStack Query |
| **Lib** | `src/lib/` | API client, types, utilities, auth client |

### Key Patterns

- **Hooks = business logic layer** — każdy hook opakowuje TanStack Query (`useQuery`, `useMutation`)
- **Components = prezentacja** — nie wywołują API bezpośrednio, używają hooków
- **Pages = kompozycja** — składają hooks + components w stronę
- **API client** (`lib/api.ts`) — centralny fetch wrapper, proxy przez Next.js rewrites do backendu

---

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files (components) | kebab-case.tsx | `actions-menu.tsx` |
| Files (hooks) | use-kebab-case.ts | `use-apps.ts` |
| Files (lib) | kebab-case.ts | `auth-client.ts` |
| Components | PascalCase | `ActionsMenu` |
| Hooks | camelCase (use prefix) | `useApps` |
| Functions | camelCase | `fetchApps` |
| Constants | SCREAMING_SNAKE | `MAX_SCREENSHOT_SIZE` |
| Types/Interfaces | PascalCase | `AppListItem` |
| Route params | camelCase | `[appId]`, `[versionId]` |

---

## Error Handling

- API errors handled through TanStack Query `onError` callbacks
- Toast notifications via Sonner for user-facing errors
- Never swallow errors silently — always show toast or log

```typescript
// Pattern for mutations
const mutation = useMutation({
  mutationFn: (data) => api.post("/api/apps", data),
  onSuccess: () => {
    toast.success("App created");
    queryClient.invalidateQueries({ queryKey: ["apps"] });
  },
  onError: (error) => {
    toast.error(error.message || "Something went wrong");
  },
});
```

---

## Anti-patterns

- NEVER use `console.log` in production — use toast or error boundaries
- NEVER call API directly from components — use hooks from `src/hooks/`
- NEVER use `any` type — always use explicit types from `src/lib/types.ts`
- NEVER hardcode API URLs — use relative `/api/*` paths (proxy handles routing)
- NEVER put business logic in page components — extract to hooks
- NEVER use inline styles when Tailwind classes exist
- NEVER skip `queryKey` in TanStack Query — cache depends on it
- NEVER use `fetch` directly — use the API client from `src/lib/api.ts`
- NEVER create components without considering shadcn/ui first

---

## Best Practices

- ALWAYS use shadcn/ui components for UI — check `src/components/ui/` first
- ALWAYS use TanStack Query for server state (queries + mutations)
- ALWAYS invalidate related queries after mutations
- ALWAYS use `@/` path aliases for imports (never deep relative `../../..`)
- ALWAYS use Sonner `toast` for user feedback
- ALWAYS type API responses in `src/lib/types.ts`
- ALWAYS use `cn()` from `src/lib/utils.ts` for conditional classes
- ALWAYS run `bun run lint` before committing
- ALWAYS create hooks in `src/hooks/` for new API integrations
- ALWAYS use Next.js `<Image>` for optimized images

---

## New Feature Checklist

1. **Define types** in `src/lib/types.ts`
2. **Create hook** in `src/hooks/use-{feature}.ts` with TanStack Query
3. **Create/update page** in `src/app/(app)/...`
4. **Create components** in `src/components/` (use shadcn/ui)
5. **Add navigation** in `src/components/app-sidebar.tsx` (if new section)
6. **Write tests** in co-located `.test.tsx` files
7. **Run quality check** — `bun run lint && bun test && bun run build`

---

## Claude Code Integration

### Agents

| Agent | File | Scope |
|-------|------|-------|
| architecture-review | `.claude/agents/architecture-review.md` | Struktura katalogów, warstwy, zależności |
| code-review | `.claude/agents/code-review.md` | Jakość kodu, typy, nazewnictwo, importy |
| security-review | `.claude/agents/security-review.md` | Auth, walidacja, XSS, dane wrażliwe |
| testing-review | `.claude/agents/testing-review.md` | Jakość testów, pokrycie, izolacja |
| performance-review | `.claude/agents/performance-review.md` | Rendering, bundle, Core Web Vitals |

### Commands

| Command | Purpose |
|---------|---------|
| `/commit` | Conventional commit z pre-commit checks |
| `/pr` | Structured PR z template |
| `/review` | Routing zmian do odpowiednich agentów |
| `/quality-check` | lint + test + build pipeline |

---

## Ports

| Service | Port |
|---------|------|
| Next.js dev server | 6600 |
| Backend API (proxy target) | 6680 |
