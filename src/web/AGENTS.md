# Parc Fermé - Frontend (React) Agent Instructions

## Project Context

This is the React 18 + TypeScript frontend for Parc Fermé, a "Letterboxd for motorsport" platform. The UI must implement the critical Spoiler Shield system - hiding race results by default to protect delayed viewers.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build**: Vite 7
- **State**: Redux Toolkit (RTK)
- **Routing**: React Router 7
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest + React Testing Library

## Project Structure

```
/src
  /components     # Reusable UI components
  /hooks          # Custom React hooks
  /lib            # Utility functions
  /pages          # Route page components
  /services       # API client services
  /store          # Redux store and slices
  /types          # TypeScript type definitions
  /test           # Test utilities and mocks
```

## Critical Patterns

### The Spoiler Shield Protocol
**This is the most critical feature.** The UI must protect users from unwanted spoilers:

1. **Default State**: All results hidden until user has logged the race
2. **Blur/Mask**: Use CSS blur or placeholder content for hidden data
3. **User Preference**: Respect user's `spoilerMode` setting (Strict, Moderate, None)
4. **Explicit Reveal**: Allow users to manually reveal spoilers with confirmation

```tsx
// Pattern: Spoiler-aware component
function ResultDisplay({ result, isRevealed }: Props) {
  if (!isRevealed) {
    return <SpoilerMask onClick={onRevealRequest} />;
  }
  return <FullResult data={result} />;
}
```

### Spoiler Mode Levels
```typescript
type SpoilerMode = 'Strict' | 'Moderate' | 'None';

// Strict: Hide all results, images, review text until logged
// Moderate: Show thumbnails and excitement ratings, hide winner/podium
// None: Show everything immediately
```

### Redux State Management
Use Redux Toolkit for global state:
```typescript
// Slice pattern
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => { ... }
  }
});

// Selectors for derived state
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
```

### Type Safety
**All API responses must be typed.** Types live in `/types/`:
```typescript
// ✅ Correct - typed API call
const response = await api.get<SessionDto>('/api/v1/sessions/123');

// ❌ Wrong - untyped
const response = await api.get('/api/v1/sessions/123');
```

### Component Patterns

#### Page Components
```tsx
// pages/SessionPage.tsx
export function SessionPage() {
  const { id } = useParams();
  // Page-level data fetching and layout
  return <SessionDetail sessionId={id} />;
}
```

#### Feature Components
```tsx
// components/SessionDetail.tsx
export function SessionDetail({ sessionId }: Props) {
  // Feature-specific logic and UI
}
```

#### UI Components
```tsx
// components/ui/SpoilerMask.tsx
export function SpoilerMask({ onReveal, children }: Props) {
  // Reusable spoiler protection UI
}
```

### Styling with Tailwind
Use Tailwind utility classes. Custom styles go in `/index.css`:
```tsx
// ✅ Preferred - Tailwind classes
<div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">

// For complex animations or states, use CSS
// in index.css with @apply if needed
```

### API Services
API calls go through service modules:
```typescript
// services/sessionsApi.ts
export const sessionsApi = {
  getSession: (id: string) => api.get<SessionDto>(`/api/v1/sessions/${id}`),
  getSessions: (params: SessionQuery) => api.get<SessionDto[]>('/api/v1/sessions', { params }),
};
```

## Key Business Rules

1. **Spoiler Shield is non-negotiable** - Results hidden by default
2. **Excitement Rating (0-10)** is always visible (spoiler-safe)
3. **Star Rating (0.5-5.0)** may contain spoiler implications
4. **Review text** with `containsSpoilers: true` must be masked
5. **Winner celebration images** must never be shown until revealed

## Testing

- Test files: `*.test.ts` or `*.test.tsx` co-located with source
- Use Vitest + React Testing Library
- Mock API calls with MSW (see `/test/`)

```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage
```

## Common Commands

```bash
npm run dev           # Start dev server (port 3000)
npm run build         # Production build
npm run lint          # ESLint
npm run type-check    # TypeScript check without emit
```

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `SessionCard.tsx`)
- Hooks: `useCamelCase.ts` (e.g., `useSpoilerReveal.ts`)
- Utilities: `camelCase.ts` (e.g., `formatters.ts`)
- Types: `camelCase.ts` or grouped by domain (e.g., `api.ts`)
- Tests: `*.test.ts` or `*.test.tsx`

## Design System Notes

- Dark theme by default (racing aesthetic)
- Primary accent: Racing red (#E10600)
- Use racing metaphors in UI copy (e.g., "Pit Stop" for loading)
- Checkered flag motifs for completion states
