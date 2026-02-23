# Toast Notification System

**Status:** Done

## Context

The app uses a custom toast notification system for transient, non-blocking feedback. Toasts surface action confirmations, errors, and informational messages without interrupting workflow.

## Implementation

### Architecture
- **State management:** Zustand store (`src/shared/hooks/useToast.ts`)
- **UI primitive:** Radix UI Toast (`src/shared/components/ui/Toast.tsx`)
- **Animations:** Tailwind CSS via `tw-animate-css`
- **Mounted in:** `src/app/providers.tsx` as `<Toaster />`

### API
```typescript
import { toast } from '@/shared/hooks/useToast'

toast({ description: 'Item saved', variant: 'success' })
toast({ description: 'Something went wrong', variant: 'destructive' })
toast({ description: 'Moved to trash', variant: 'info' })
toast({ title: 'Warning', description: 'Offline mode', variant: 'warning' })
toast({ description: 'Neutral message' })  // default variant
```

### Toast Variants
Each variant has a distinct color scheme, border, and icon for quick visual identification:
- **`default`** — neutral background, no icon
- **`success`** — green tint, CheckCircle2 icon (completed actions: save, delete, share)
- **`info`** — blue tint, Info icon (neutral information: moved to trash, collaborator joined)
- **`warning`** — amber tint, AlertTriangle icon (non-critical alerts: offline mode)
- **`destructive`** — red tint, XCircle icon (failed operations)

All color variants support light and dark modes.

### Accessibility
- Radix UI Toast provides `role="status"` and `aria-live="polite"` by default on the viewport
- **Urgent variants** (`destructive`, `warning`) override to `role="alert"` + `aria-live="assertive"` so screen readers announce immediately
- Each variant has a distinct icon — meaning is not conveyed by color alone (WCAG 1.4.1)
- Close button has `aria-label="Close notification"` and is keyboard-focusable (`focus:opacity-100`)
- Swipe-to-dismiss via Radix gesture support (right swipe)

### Behavior
- Auto-dismiss after 5 seconds
- Manual dismiss via close button or swipe right
- Stacks vertically in bottom-right corner (reverse order)
- Imperative `toast()` function works outside React components

## Integration Points

Currently wired into:
- Object delete (move to trash) — `info`
- Object restore from trash — `success`
- Permanent delete — `success`
- Template save/delete — `success`
- Type delete — `success`
- Tag delete — `success`
- Share/unshare actions — `success`
- Leave space — `success`
- Create entry failure — `destructive`
- Cover image upload failure — `destructive`
