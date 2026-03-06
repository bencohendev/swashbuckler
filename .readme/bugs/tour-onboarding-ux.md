# Tour & Onboarding UX Issues

Six related bugs affecting the new-user experience.

## 1. ~~Dismissing intro tour should disable all tours~~ (Fixed)

`onSkip` now uses `skipAll` when `activeTourId === 'intro'` in `TutorialController.tsx`.

## 2. ~~Local database (IndexedDB) persists after guest leave / user logout~~ (Fixed)

`handleSignOut()` in `Header.tsx` now calls `clearLocalData()` to wipe IndexedDB on logout.

## 3. ~~"Tour this page" button shows welcome dialog instead of starting tour~~ (Fixed)

Sidebar help menu now computes `startStep` to skip step 0 when it's a dialog type.

## 4. Tour fires before setup dialog / loading states not resolved

**Current**: Intro tour auto-starts after 1s delay, checking `isOnboarding` flag. But `isOnboarding` is set asynchronously (preferences fetch). Race condition: tour can start before the "Set up your workspace" dialog appears, causing a flash of tour → dialog overlap.

**Fix**: Add an `isSpaceReady` flag to SpaceProvider that only becomes `true` after all async loading is complete (spaces loaded, preferences checked, onboarding dialog decision made). Tour auto-start waits for this flag.

**Files**: `TutorialController.tsx`, `SpaceProvider.tsx`

## 5. ~~Remove sharing page tour~~ (Fixed)

`sharing-settings` removed from `TourId`, `TOURS`, and `PATH_TO_TOUR` in `tours.ts`.

## 6. ~~Consent banner competes with tours / poor UX~~ (Fixed)

Consent moved to a checkbox in onboarding dialogs (`NewUserDialog` / `GuestModeDialog`). Banner removed. Analytics disabled by default until user opts in.
