---
name: gt-checklist-standards
description: Base operating standard for GT-CheckList-App. Keep changes aligned with offline-first architecture, strict TypeScript, and stable sync behavior.
license: MIT
metadata:
  author: GT-CheckList team
  version: '1.2.1'
  project: GT-CheckList-App
  stack: Expo Router v6, React Native 0.81, React 19, Supabase, expo-sqlite
---

# GT CheckList Project Standard

Use this skill by default for any task in this repo.

## Must keep

- Offline-first behavior
- Existing project structure and naming
- Strict TypeScript conventions
- Reuse existing components and patterns

## Required workflow

1. Understand scope and impacted layers
2. Reuse existing patterns before creating new ones
3. Implement with local-first + safe sync
4. Validate with available commands
5. Report what changed and why

## Offline-first rules (critical)

- Reads: local SQLite mirror first
- Writes: queue offline, sync later
- Sync compatibility: `services/sync.ts` and `services/sync-queue.ts`
- No network-only path for core flows unless explicitly requested

## Sync controller rules (critical)

- Single-flight sync (no concurrent full sync)
- Every trigger needs explicit `reason`
- Dedup close triggers with a time window
- Keep pull throttling
- If sync is running, queue one pending run
- Drain offline queue on reconnect

When adding a new trigger, justify why existing triggers are not enough.

## Screen loading contract

- Hydrate local data before empty state
- Use clear states: `hydrating-local`, `ready`, `syncing-remote`
- Run remote sync/fetch in background
- Show empty only after local hydration finishes

## Navigation contract

- Use Expo Router dynamic path style (e.g. `/equipment-record/[propertyId]/history`)
- Do not duplicate params in path interpolation + params object
- Keep params minimal and typed

## Logging contract

- Operational logs: concise and structured (`reason`, counts, elapsed ms)
- Debug logs behind `__DEV__`
- Avoid repeated identical logs from re-renders/effects
- Fix warnings; do not ignore as normal noise

## Structure and naming

- `app/`: screens/routes
- `components/`: reusable UI
- `hooks/`: one hook per file (React Query wrappers)
- `services/`: business/data logic
- `services/db/`: SQLite/migrations
- `schemas/`: Zod
- `types/`: shared interfaces/enums

Naming:

- New files in kebab-case
- `app/` screens export default
- Shared components use named exports
- Use `type` imports for type-only
- Prefer `unknown` over `any`
- Nullable API fields as `T | null`

## Validation

- `npm run lint`
- If needed: `npm run format` or `npm run format:check`

Note: there is no configured test runner unless explicitly added.

## Response format

Always report:

- What changed
- Why
- Offline-first impact (if any)
- Validation run
- Remaining risks/follow-ups

## Add-on skills

Load additionally when needed:

- `supabase-postgres-best-practices` (DB/SQL)
- `vercel-react-native-skills` (RN/Expo performance)
