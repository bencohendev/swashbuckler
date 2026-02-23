# Toast Notification System

**Status:** Not started

## Context

The app currently lacks a unified way to surface transient feedback to users. Actions like saving, deleting, sharing, and error states either show nothing or use `window.alert()` / inline messages inconsistently. A toast notification system provides non-blocking, auto-dismissing feedback that keeps users informed without interrupting their workflow.

## Requirements

### Core Behavior
- Non-blocking notifications that appear in a fixed screen position (bottom-right default)
- Auto-dismiss after a configurable duration (default ~5 seconds)
- Manual dismiss via close button or swipe
- Stack multiple toasts vertically with smooth enter/exit animations
- Maximum visible toasts capped (e.g., 3–5) with older toasts dismissed when exceeded

### Toast Variants
- **Success** — confirmation of completed actions (save, delete, share)
- **Error** — failed operations with optional retry action
- **Info** — neutral information (e.g., "Collaborator joined")
- **Warning** — non-critical alerts (e.g., "Offline mode")

### Features
- Optional action button per toast (e.g., "Undo" on delete, "Retry" on error)
- Pause auto-dismiss on hover
- Accessible: appropriate ARIA roles (`role="status"` / `aria-live="polite"`), keyboard-dismissable
- Works in both guest and authenticated modes

## Design Decisions

- **Use shadcn/ui Toast** — the project already uses shadcn components; its toast primitive (built on Radix) provides accessibility and animation out of the box
- **Sonner as alternative** — if shadcn toast feels too low-level, Sonner is a popular drop-in with better stacking UX; evaluate during implementation
- **Shared hook API** — expose a `useToast()` hook or a standalone `toast()` function callable from anywhere (components, mutation callbacks, event handlers)
- **No persistent/stored toasts** — toasts are ephemeral UI-only; no database or localStorage involvement

## Integration Points

Key places to wire in toasts (non-exhaustive):
- Object save success/failure
- Object delete + undo action
- Object restore from trash
- Share/unshare actions
- Template save/apply
- Export complete
- Collaboration events (user joined/left)
- Offline/online status transitions
- Clipboard copy confirmations
- Form validation errors that aren't field-level

## Implementation Notes

- Feature location: `src/shared/components/ui/` (since it's a shared primitive, not feature-specific)
- Toast provider should be mounted once in `providers.tsx` or the root layout
- If using shadcn toast: run `npx shadcn@latest add toast` and customize
- If using Sonner: `npm install sonner`, add `<Toaster />` to layout

## Verification

1. Trigger a success toast (e.g., save an entry) — appears, auto-dismisses
2. Trigger an error toast — appears with appropriate styling, stays longer or until dismissed
3. Trigger multiple toasts — stack correctly, cap is respected
4. Hover over a toast — auto-dismiss pauses
5. Click close / press Escape — toast dismisses immediately
6. Action button (e.g., Undo) — fires callback and dismisses toast
7. Screen reader announces toast content appropriately
