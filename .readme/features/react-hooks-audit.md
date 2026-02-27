# React Hooks Audit

**Status:** Done

## Overview

Audit of React hook usage across the codebase: useEffect correctness, memoization analysis, stale closure detection, Zustand store patterns, infinite loop risks, and cleanup completeness. Targets React 19 best practices.

## Scope

### In Scope
- `useEffect` correctness (dependency arrays, cleanup functions, unnecessary effects)
- `useMemo` / `useCallback` usage (over-memoization, missing memoization)
- Stale closure detection (refs vs state in callbacks)
- Zustand store patterns (selector stability, subscription efficiency)
- Infinite loop risks (effect → state → re-render → effect cycles)
- Cleanup completeness (subscriptions, timers, event listeners, abort controllers)
- Custom hook design (composition, reusability, naming)
- React 19 patterns (use of `use()`, server/client boundaries)

### Out of Scope
- TanStack Query hook configuration (covered in [Client API Audit](client-api-audit.md))
- Component rendering performance (separate concern from hook correctness)

## Audit Areas

### 1. useEffect Correctness

**Checks:**
- Dependency arrays complete (no missing dependencies)
- No unnecessary effects (could be derived state, event handler, or useMemo)
- Effects that sync external systems (DOM, subscriptions) vs effects that compute derived state
- Empty dependency array effects (`[]`) only for true mount-once logic
- Effects that set state based on props/state (often a code smell)
- Async operations in effects (proper cleanup with abort controllers)

**Key Files:**
- `src/features/editor/hooks/` — editor effects (collaboration, auto-save)
- `src/features/sidebar/` — sidebar state effects
- `src/features/graph/` — D3 effects
- `src/shared/hooks/` — shared hooks

**Pass Criteria:**
- No eslint-disable for exhaustive-deps without documented justification
- No effects that could be replaced with useMemo or event handlers
- All async effects handle component unmount

### 2. useMemo / useCallback Analysis

**Checks:**
- Over-memoization: memoizing cheap computations or stable values
- Missing memoization: expensive computations or objects passed as deps to child effects
- Callback stability: functions passed to child components or used in effect deps
- Memo dependencies correct (not missing or over-specified)
- Module-level constants used for empty array/object fallbacks (per project convention)

**Key Files:**
- `src/features/editor/` — editor component tree (complex memoization)
- `src/features/graph/` — D3 integration (expensive computations)
- `src/features/sidebar/` — tree rendering
- `src/shared/components/` — shared components

**Pass Criteria:**
- Expensive computations (filtering, sorting, tree building) are memoized
- Empty array/object fallbacks use module-level constants (not inline `[]` or `{}`)
- No unnecessary memoization of primitive values or stable references

### 3. Stale Closure Detection

**Checks:**
- Callbacks in `useEffect` that reference state (need refs or effect deps)
- Event handlers registered once but needing current state
- Timer callbacks (setTimeout, setInterval, debounce) with state access
- Subscription callbacks (realtime, BroadcastChannel) with state access
- Zustand selectors in closures

**Key Files:**
- `src/features/editor/hooks/useCollaborativeEditor.ts` — realtime callbacks
- `src/features/editor/lib/SupabaseYjsProvider.ts` — provider callbacks
- `src/features/editor/hooks/useAutoSave.ts` — save callbacks (if exists)
- `src/shared/lib/data/` — subscription callbacks

**Pass Criteria:**
- All long-lived callbacks use refs for mutable state access
- No stale closures causing bugs (save old data, miss updates)
- Debounced/throttled functions have stable references

### 4. Zustand Store Patterns

**Checks:**
- Selector granularity (selecting only what's needed, not entire store)
- Selector stability (no inline anonymous selectors creating new references)
- Store slicing vs monolithic store
- Actions defined inside store (not external functions modifying state)
- Subscriptions vs selectors (when to use `subscribe` vs `useStore`)
- Store initialization and cleanup

**Key Files:**
- `src/features/editor/` — editor store (if Zustand-based)
- Any files importing from `zustand`

**Pass Criteria:**
- Selectors are stable (defined outside components or memoized)
- Components only subscribe to the state they use
- No unnecessary re-renders from selector instability

### 5. Infinite Loop Detection

**Checks:**
- Effect → setState → re-render → effect cycles
- Object/array dependencies that are recreated every render
- TanStack Query `data ?? []` pattern (inline fallback creates new reference)
- Zustand selector returning new objects each call
- Context value objects recreated on every render
- Custom hooks returning unstable objects/arrays

**Key Files:**
- All hooks in `src/features/*/hooks/`
- `src/shared/hooks/`
- Provider components in `src/shared/` and `src/features/`

**Pass Criteria:**
- No effect dependency cycles possible
- All array/object fallbacks use stable references
- Context values memoized when containing objects

### 6. Cleanup Completeness

**Checks:**
- Supabase realtime subscriptions unsubscribed on unmount
- BroadcastChannel closed on unmount
- Yjs provider disconnected on unmount
- Event listeners removed (window, document, ResizeObserver)
- Timers cleared (setTimeout, setInterval, debounce timers)
- AbortController signaled for in-flight requests
- IntersectionObserver disconnected
- Focus trap cleanup

**Key Files:**
- `src/features/editor/hooks/useCollaborativeEditor.ts` — collaboration cleanup
- `src/features/editor/lib/SupabaseYjsProvider.ts` — provider lifecycle
- `src/features/graph/` — D3 event listeners, ResizeObserver
- `src/features/sidebar/` — any sidebar subscriptions
- `src/shared/hooks/` — shared hooks with subscriptions

**Pass Criteria:**
- Every `addEventListener` has matching `removeEventListener` in cleanup
- Every `subscribe` has matching `unsubscribe`
- No memory leaks from zombie subscriptions or timers
- React strict mode (double mount) doesn't cause issues

### 7. Custom Hook Design

**Checks:**
- Hooks follow naming convention (`use` prefix)
- Hooks compose well (no deeply nested hook chains)
- Return values are stable (memoized objects, stable callbacks)
- Error handling consistent across custom hooks
- Hooks don't have hidden side effects (unexpected fetches, state changes)
- Hooks are colocated with their feature (not in shared unless truly shared)

**Key Files:**
- `src/features/*/hooks/` — all feature hooks
- `src/shared/hooks/` — shared hooks

**Pass Criteria:**
- Hooks have clear single responsibility
- Return types are documented or obvious from usage
- No circular hook dependencies

### 8. React 19 Patterns

**Checks:**
- `use()` hook for promises/context (where applicable)
- Transition API usage for non-urgent updates
- Server Component vs Client Component hook usage
- `useOptimistic` for optimistic UI (where applicable)
- `useFormStatus` / `useActionState` for form handling (if using Server Actions)

**Key Files:**
- `src/app/` — route components
- `src/features/*/components/` — interactive components

**Pass Criteria:**
- No React 19 deprecation warnings
- Transitions used for expensive state updates
- New APIs adopted where they simplify existing patterns

## Methodology

1. Static analysis: grep for patterns (useEffect with missing deps, inline `[]`, stale closures)
2. Hook inventory: catalog all custom hooks, their deps, and their cleanup
3. Zustand review: trace store usage through selectors and subscriptions
4. Runtime testing: React strict mode double-mount verification
5. ESLint review: check for suppressed exhaustive-deps warnings

## Deliverables

- Hook inventory (hook → deps → cleanup → issues)
- Stale closure risk map
- Infinite loop risk assessment
- Fix PRs for correctness issues (missing cleanup, stale closures, loops)
- Updated spec with final results
