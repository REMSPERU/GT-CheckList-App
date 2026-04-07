---
name: gt-checklist-standards
description: Project operating standard for GT-CheckList-App. Use this skill for any coding task in this repository (features, fixes, refactors, docs, DB, sync, forms, routing) so outputs stay consistent with the offline-first architecture, TypeScript conventions, and delivery checklist.
license: MIT
metadata:
  author: GT-CheckList team
  version: '1.1.0'
  project: GT-CheckList-App
  stack: Expo Router v6, React Native 0.81, React 19, Supabase, expo-sqlite
---

# GT CheckList Project Standard

Apply this skill by default for any task inside this repository.

## Goal

Keep all changes aligned with one consistent standard:

- Preserve offline-first behavior
- Match project structure and naming conventions
- Keep TypeScript strict and predictable
- Follow existing UI and data patterns
- Deliver changes with clear validation steps
- Enforce one modern, minimalist design line across the app
- Reuse components before creating new ones

## How this skill is used

Use this as the default base skill for every task in this repository.

- Feature work: apply this skill first, then add domain skills if needed
- Bug fixes/refactors: keep the same architecture and visual line
- DB requests: keep this skill active and layer Supabase-specific guidance

If the user asks for a change that breaks the shared line, explain the impact and
propose the closest compliant alternative.

## Mandatory workflow

Follow this sequence on every implementation task.

1. Understand scope and affected layers
2. Locate existing domain patterns before writing code
3. Implement with offline-first and type-safe defaults
4. Verify with lint/build checks that are available
5. Report what changed, why, and how it was validated

If a request conflicts with this standard, explain the tradeoff and use the safest default.

## Architecture guardrails (critical)

This app is offline-first. Protect these rules:

- Reads: prefer local SQLite mirror tables for immediate data
- Writes: queue offline writes and sync later instead of requiring network
- Sync: keep compatibility with `services/sync.ts` and `services/sync-queue.ts`
- Auth/session: preserve local persistence behavior
- Failures: network errors should degrade gracefully to local data when possible

Do not introduce a network-only path for core user flows unless explicitly required.

## Project structure rules

Respect directory boundaries:

- `app/`: routes/screens only
- `components/`: reusable UI
- `hooks/`: one hook per file, React Query wrappers
- `services/`: business logic and data access
- `services/db/`: SQLite access and migrations
- `schemas/`: Zod schemas
- `types/`: interfaces/enums shared across layers

When adding files, prefer existing folder conventions over creating new top-level patterns.

## Naming and TypeScript rules

- New files: kebab-case
- Shared components: named exports
- Screen files in `app/`: default export
- Use `type` imports for type-only imports
- Prefer `unknown` over `any`
- Use `T | null` (not `undefined`) for nullable API/Supabase fields
- Keep query key factories close to hooks and follow existing key style

Preserve Spanish domain naming in API/data fields (`tipo_mantenimiento`,
`dia_programado`, etc.).

## Data and form rules

- Use React Query for server state and caching
- Keep service methods throwing on error (do not silently swallow critical errors)
- For complex forms, use `react-hook-form` + Zod schemas
- Persist multistep drafts in AsyncStorage where the flow already expects it

## UI and UX consistency

When editing existing screens/components:

- Preserve established visual language and navigation behavior
- Avoid introducing a new design system style in isolated screens
- Keep mobile-first behavior for Android/iOS
- Use existing component patterns before adding a new abstraction

## Design line: modern and minimalist (required)

All UI changes must follow one coherent style:

- Minimal visual noise: clean layouts, clear hierarchy, no decorative overload
- Consistent spacing scale and typography rhythm across screens
- Neutral, intentional palette with strong readability and accessible contrast
- Repeated patterns for cards, inputs, buttons, headers, and feedback states
- Consistent interaction behavior (loading, empty, error, success states)

Do not introduce one-off visual styles that break the global design line.

## Reuse-first component policy

Before creating a new component:

1. Search for existing reusable components in `components/`
2. Extend existing variants/props when the pattern is equivalent
3. Create a new component only when reuse is not practical

When creating new shared UI, keep it generic, typed, and composable so other
screens can reuse it.

Avoid copy-pasting JSX blocks across screens if a reusable component can cover it.

## Database workflow: Supabase CLI sync and verification (required)

When the user asks for database work, assume the model can and should use
Supabase CLI to connect, inspect, modify, and verify database state.

Primary objective:

- Ensure project DB artifacts (migrations, SQL, types, assumptions in code)
  match Supabase state
- Detect and resolve schema drift between repository and Supabase

Required approach:

1. Inspect current DB context (local + Supabase project context)
2. Use Supabase CLI as the default path for DB operations
3. Apply changes through reproducible migrations/SQL in the repository
4. Verify that repository state and Supabase state match after changes
5. Report what was checked, changed, and verified

Prefer CLI-based verification and synchronization over ad-hoc/manual edits.

If an operation is potentially destructive (reset/drop/data loss), warn clearly
before executing and propose a safe alternative first.

## Imports and formatting

Use import order already used in the codebase:

1. React / React Native
2. Expo modules
3. Third-party libs
4. Internal modules (`@/` preferred for cross-directory imports)

Formatting must match project tooling:

- single quotes
- semicolons
- trailing commas
- 2 spaces

## Validation checklist

After code changes, run what is available and relevant:

- `npm run lint`
- If formatting drift appears: `npm run format` or `npm run format:check`

Testing note: this repo currently has no configured test runner. Do not claim tests were run unless a test setup was added.

## Delivery format for responses

When reporting work, include:

- What changed
- Why this approach
- Offline-first impact (if data flow changed)
- Validation executed (commands + result)
- Remaining risks or follow-ups

Keep responses concise and implementation-focused.

## Skill composition guidance

When task scope matches these domains, also load:

- `supabase-postgres-best-practices` for SQL/schema/query tuning
- `vercel-react-native-skills` for RN/Expo performance and UI behavior
- `documentation` for READMEs/runbooks/guides

This skill is the base standard; domain skills are additive.
