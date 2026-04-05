# MedFlow -- User Management Rebuild

## Current State

The existing `UserManagementPanel` component (lines ~9671-10437 in App.tsx) has a critical session bug:
- `const sess = getSession()` is called at component mount and stored in a plain variable (not React state), so it can be stale
- `distributorId` is sometimes missing from the session (when local `lookupUser()` matches before the backend distributor login call sets it)
- This causes "Session expire ho gayi" toast on every Add User / Sync Users click
- Backend sync silently fails in some cases
- Actor loading race condition: button can be clicked before actor is ready

## Requested Changes (Diff)

### Add
- Brand new `UserManagementPanel` component replacing the old one entirely
- Backend-first user add: call `addStaffForDistributor` first, only save to localStorage after backend confirms with a staffId
- Backend-first user delete: call `deleteStaffRecord(BigInt(backendStaffId))` first, then remove from localStorage
- Password change: call `updateStaffRecordPassword(BigInt(backendStaffId), newPassword)` + update localStorage
- Edit display name / username: re-add user with new details (delete old, add new) since backend has no updateStaff name API
- Sync button: load all staff from backend via `getStaffByDistributor`, merge into localStorage, push any local-only users to backend
- `distributorId` is always read fresh via `getSession()` inside every async action (never from component-level variable)
- Actor readiness guard: all action buttons disabled + show spinner until `actor` is non-null AND `!isActorLoading`
- Clear loading states for each action (adding, deleting, syncing, changing password)
- Show each user's role badge, display name, username

### Modify
- Replace existing `UserManagementPanel` function entirely (same component name, same usage at line 15390)
- Keep all existing types: `AppUser`, `UserRole`, `getCustomUsers()`, `saveCustomUsers()`, `CUSTOM_USERS_KEY`
- Keep backend APIs used: `addStaffForDistributor`, `deleteStaffRecord`, `updateStaffRecordPassword`, `getStaffByDistributor`

### Remove
- Old `UserManagementPanel` implementation with stale `sess` variable and race conditions
- `handleSyncUsersToBackend` old logic that checked stale sess
- Old auto-sync useEffect that ran on mount with stale sess

## Implementation Plan

1. In `UserManagementPanel`, remove the component-level `const sess = getSession()` -- always call `getSession()` fresh inside each async handler
2. Add a `isReady` computed: `!isActorLoading && actor !== null` -- disable all action buttons when not ready, show "Connecting..." text
3. Rewrite `handleAddUser`:
   - Read `getSession()` fresh
   - If `!actor || !freshSess?.distributorId` -- show appropriate error and return
   - Call `addStaffForDistributor` -- await result
   - On success: save to localStorage with `backendStaffId` set
   - On failure: show error, do NOT save to localStorage
4. Rewrite `handleDeleteUser(username)`:
   - Find user in customUsers to get `backendStaffId`
   - If has backendStaffId: call `deleteStaffRecord(BigInt(backendStaffId))`
   - Remove from localStorage regardless (local cleanup)
   - Password-protected confirmation
5. Rewrite `handleChangePassword(username, newPwd)`:
   - Find user backendStaffId
   - If has backendStaffId: call `updateStaffRecordPassword`
   - Update localStorage copy
6. Rewrite `handleSyncUsers`:
   - Read fresh session
   - Call `getStaffByDistributor(BigInt(distId))`
   - Merge backend list into localStorage (add missing, update backendStaffIds)
   - Push any localStorage-only users (no backendStaffId) to backend
   - Show count: "X users synced"
7. On component mount useEffect: load staff from backend (using actor + fresh session read inside the effect), merge into state -- only runs once when actor is ready
8. UI: show spinner/disabled state on all buttons when actor not ready; show per-row loading indicators during delete/password change
