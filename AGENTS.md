# AGENTS.md

## Project Overview

React Native + Expo SDK 54 mobile app (Expo Router v6, React 19, RN 0.81) for managing
building equipment maintenance checklists. Targets Spanish-speaking users in Peru.
Backend: Supabase (auth, DB, storage) + a REST API. Offline-first architecture using
expo-sqlite mirror tables with background sync to Supabase.

## Project Skill Standard

Use `.agents/skills/gt-checklist-standards/SKILL.md` as the base operating
standard for any task in this repository. Apply it by default, and layer
domain-specific skills only when needed.

## Build / Run / Lint Commands

```bash
# Start Expo dev server
npm start            # or: npx expo start

# Run on device/emulator
npm run android      # npx expo run:android
npm run ios          # npx expo run:ios

# Lint (ESLint with expo flat config)
npm run lint         # npx expo lint

# Format (Prettier)
npm run format       # prettier --write .
npm run format:check # prettier --check .

# EAS builds (requires eas-cli)
npx eas build --profile development --platform android
npx eas build --profile preview --platform android
npx eas build --profile production --platform android
```

### Testing

There is **no test runner configured**. No test files, no test dependencies, no test
scripts exist in this project. If you add tests, use Jest with `jest-expo` preset
(standard for Expo projects) and place test files next to source as `*.test.ts(x)`.

## Project Structure

```
app/                  # Expo Router file-based routes (screens)
  _layout.tsx         # Root layout (providers, Sentry, DB init)
  (tabs)/             # Bottom tab navigator (role-gated)
  auth/               # Auth screens
  maintenance/        # Maintenance flow screens
  equipment-record/   # Equipment detail screens
components/           # Reusable UI components
config/               # App configuration (API endpoints, URLs)
constants/            # Static values (theme colors, fonts, route maps)
contexts/             # React Context providers (Auth, UserRole)
hooks/                # Custom hooks (one hook per file, React Query wrappers)
lib/                  # Core utilities (HTTP client, Supabase client, QueryProvider)
schemas/              # Zod validation schemas
services/             # Business logic & data access
  db/                 # SQLite database (connection, migrations, queries)
  supabase-*.ts       # Supabase service classes (one per domain)
  sync.ts             # Sync orchestrator (push/pull, 15s polling)
  sync-queue.ts       # Retry queue with exponential backoff
types/                # TypeScript interfaces, enums, type definitions
```

## Architecture: Offline-First

This is the core architectural pattern. Nearly every data path reads from local SQLite
mirror tables first, then syncs with Supabase in the background.

- **Mirror tables**: read-only local copies of Supabase data for instant reads
- **Offline work tables**: write queue for changes made without connectivity
- **SyncService** (`services/sync.ts`): orchestrates push/pull with 15s polling + NetInfo
- **SyncQueue** (`services/sync-queue.ts`): exponential backoff retry (10s/30s/60s/2min)
- Auth session persisted to SQLite for instant app load without network

When modifying data flows, always consider the offline path. New features that read data
should fall back to local SQLite. New features that write data should queue writes for
sync when offline.

## Code Style Guidelines

### Formatting (Prettier - enforced)

- Single quotes, trailing commas, semicolons
- 2-space indent, 80-char print width, LF line endings
- `arrowParens: "avoid"`, `bracketSameLine: true`
- Run `npm run format` before committing

### TypeScript

- **Strict mode** is enabled (`tsconfig.json`)
- Use the `@/*` path alias for imports from project root (e.g., `@/types/api`)
- Relative imports are also used; both patterns coexist. Prefer `@/` for cross-directory.
- Use `type` keyword for type-only imports: `import type { Foo } from '...'`
- Define interfaces in `types/` directory; use `interface` for object shapes, `enum` for
  string unions that map to API values
- Use `unknown` over `any` where possible (some legacy `any` exists)
- Nullable fields use `T | null` (matching Supabase/API conventions), not `T | undefined`

### Naming Conventions

- **Files**: kebab-case for most files (`use-property-query.ts`, `building-card.tsx`).
  Some legacy components use PascalCase (`ErrorBoundary.tsx`, `EquipmentList.tsx`).
  Prefer kebab-case for new files.
- **Services**: kebab-case files, class-based singletons exported at module level.
  Pattern: `class FooService { ... } export const fooService = new FooService();`
  Supabase services: `supabase-{domain}.service.ts`
- **Hooks**: one hook per file, kebab-case (`use-{domain}-query.ts`). Export named
  functions (`export function useFoo()`). Wrap React Query's `useQuery`/`useMutation`.
- **Query key factories**: defined per domain at top of hook files:
  ```ts
  export const fooKeys = {
    all: ['foos'] as const,
    lists: () => [...fooKeys.all, 'list'] as const,
    list: (filters?: any) => [...fooKeys.lists(), filters] as const,
    details: () => [...fooKeys.all, 'detail'] as const,
    detail: (id: string) => [...fooKeys.details(), id] as const,
  };
  ```
- **Components**: PascalCase for component names, function components (not arrow).
  Default export for screen components in `app/`, named exports for shared components.
- **Constants**: UPPER_SNAKE_CASE for config objects (`API_CONFIG`, `ENDPOINTS`)
- **Enums**: PascalCase name, UPPER_SNAKE_CASE members (`MaintenanceStatusEnum.EN_PROGRESO`)
- **Interfaces**: PascalCase, suffixed with purpose (`PropertyResponse`,
  `PropertyCreateRequest`, `PropertyListResponse`)
- **Domain terms are in Spanish**: `equipamento`, `mantenimiento`, `tablero_electrico`,
  `dia_programado`, `tipo_mantenimiento`. Preserve existing Spanish naming in types/API
  fields. Code structure (hooks, services, file names) uses English.

### Error Handling

- HTTP errors: Axios interceptors in `lib/http-client.ts` handle 401 globally (auto sign-out)
- Service methods: return data directly, throw on error. Let React Query handle retries.
- Offline errors: caught silently with `console.log`, app falls back to local data
- Use `ErrorBoundary` component (class-based, in `components/ErrorBoundary.tsx`) for
  React tree errors
- Sentry wraps the root layout for crash reporting

### State Management (5 layers)

1. **React Query** (TanStack v5): server state, caching, background refetch
2. **React Context**: AuthContext, UserRoleContext (with offline fallback)
3. **SQLite** (expo-sqlite): mirror tables for reads, offline tables for pending writes
4. **AsyncStorage**: form drafts, Supabase auth tokens
5. **Supabase**: remote source of truth

### Form Handling

- **react-hook-form v7** for complex forms
- **Zod v4** schemas in `schemas/` directory, resolved via `@hookform/resolvers`
- Multi-step forms persist drafts to AsyncStorage between steps

### Imports Order (convention observed in codebase)

1. React / React Native
2. Expo modules
3. Third-party libraries (tanstack, axios, zod, etc.)
4. Internal: config, lib, services, contexts, hooks, components, types, schemas, constants

### Comments

- JSDoc `/** ... */` on exported functions and hooks
- Comments in Spanish are common (matching the user base)
- Inline comments for non-obvious logic, especially offline/sync behavior

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~54.0 | Framework |
| react / react-native | 19.1 / 0.81 | UI |
| expo-router | ~6.0 | File-based routing |
| @supabase/supabase-js | ^2.88 | Backend client |
| @tanstack/react-query | ^5.90 | Server state |
| expo-sqlite | ~16.0 | Local database |
| react-hook-form | ^7.68 | Form management |
| zod | ^4.2 | Schema validation |
| axios | ^1.12 | HTTP client |
| @sentry/react-native | ^8.0 | Error tracking |

## CI/CD

GitHub Actions workflow (`.github/workflows/android-apk.yml`) builds Android APK using
EAS local build. Auto version bump on `main` pushes, creates GitHub Release with APK.

## Environment Variables

See `.env.example` for required variables:
- `EXPO_PUBLIC_API_BASE_URL` - REST API base URL
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase config
- `SENTRY_DSN` - Sentry crash reporting
