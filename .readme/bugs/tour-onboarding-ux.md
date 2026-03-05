# Tour & Onboarding UX Issues

Six related bugs affecting the new-user experience.

## 1. Dismissing intro tour should disable all tours

**Current**: `skip()` marks the intro as completed, which unlocks page-specific tours via `PageTourTrigger`. User dismisses intro → 1.5s later the editor tour fires.

**Fix**: When the user dismisses the intro tour (clicks "Dismiss" on the welcome dialog), call `skipAll()` instead of `skip()`. The intro tour is the opt-in gate — declining it means declining all tours.

**Files**: `TutorialController.tsx` (passes `onSkip={skip}` to WelcomeDialog), `useTutorial.ts`

## 2. Local database (IndexedDB) persists after guest leave / user logout

**Current**: `handleSignOut()` in `Header.tsx` clears the guest cookie and TanStack Query cache but never calls `clearLocalData()`. Dexie persists across sessions. Returning guests see stale data; "start blank" guests don't get a Getting Started page because the space already exists from the previous session.

**Fix**: Call `clearLocalData()` in `handleSignOut()`. Also clear local data when in guest mode and no guest cookie is present (stale session detection).

**Files**: `Header.tsx` (`handleSignOut`), `local.ts` (`clearLocalData`)

## 3. "Tour this page" button shows welcome dialog instead of starting tour

**Current**: `restartTour(pageTourId)` in `Sidebar.tsx` starts at step 0, which is a `dialog` step for every tour. User has to click through the dialog to get to the actual coachmarks.

**Fix**: When restarting a page tour from the help menu, skip the dialog step — start at step 1 if step 0 is a dialog. Same logic `PageTourTrigger` already uses.

**Files**: `Sidebar.tsx` (help menu handler)

## 4. Tour fires before setup dialog / loading states not resolved

**Current**: Intro tour auto-starts after 1s delay, checking `isOnboarding` flag. But `isOnboarding` is set asynchronously (preferences fetch). Race condition: tour can start before the "Set up your workspace" dialog appears, causing a flash of tour → dialog overlap.

**Fix**: Add an `isSpaceReady` flag to SpaceProvider that only becomes `true` after all async loading is complete (spaces loaded, preferences checked, onboarding dialog decision made). Tour auto-start waits for this flag.

**Files**: `TutorialController.tsx`, `SpaceProvider.tsx`

## 5. Remove sharing page tour

**Current**: `sharing-settings` tour auto-triggers when navigating to `/settings/sharing`. The settings tour already covers the sharing card — a dedicated sharing page tour is redundant.

**Fix**: Remove `sharing-settings` from `TourId`, `TOURS`, and `PATH_TO_TOUR`. Remove `data-tour` attributes from the sharing page.

**Files**: `tours.ts`, `steps.ts` (if referenced), `/settings/sharing/page.tsx`

## 6. Consent banner competes with tours / poor UX

**Current**: `AnalyticsBanner` renders as a fixed full-width bottom bar immediately on first visit. It competes with the tour overlay and onboarding dialog. Users either don't notice it or find it annoying.

**Fix**: Move analytics consent into the "Set up your workspace" dialog (`NewUserDialog`) and the guest mode dialog (`GuestModeDialog`) as a small toggle/checkbox. Remove the standalone `AnalyticsBanner` component. For users who already made a choice (existing localStorage value), respect it. Default to analytics disabled until consent is given.

**Files**: `AnalyticsBanner.tsx` (remove), `NewUserDialog.tsx` (add toggle), `GuestModeDialog.tsx` (add toggle), `providers.tsx` (remove banner mount)
