# MedFlow App

## Current State
- Login flow has a critical bug: `lookupUser()` checks localStorage first, and if a match is found, session is saved WITHOUT `distributorId`. This causes "Distributor session missing" error in User Management.
- UserManagementPanel allows adding custom users but no builtin slots exist for staff/delivery.
- Admin must manually type all user details from scratch -- no pre-existing slots.
- `distributorId` is only set in session when backend `verifyDistributorLogin` completes, but if localStorage match fires first (faster), backend is skipped and `distributorId` is never set.

## Requested Changes (Diff)

### Add
- 5 builtin Staff slots pre-created for each distributor: usernames `staff1`-`staff5`, default password `1234`, role `staff`
- 5 builtin Delivery slots pre-created for each distributor: usernames `delivery1`-`delivery5`, default password `1234`, role `delivery`
- These 10 builtin slots are shown in User Management as editable rows (not add-new form)
- Each slot has Edit button: distributor can change username, display name, password anytime
- On Save, changes go to backend first, then localStorage -- same backend-first pattern
- Builtin slots show in two sections: Staff (5) and Delivery (5)

### Modify
- Login `handleLogin` function: when `lookupUser` finds a match for `admin` role, DO NOT skip backend -- still call `verifyDistributorLogin` to get `distributorId`, then set full session with `distributorId`
- For staff/delivery `lookupUser` match: still call backend `verifyStaffLoginForDistributor` to get proper `distributorId` and `staffId`
- If backend unavailable (actor null), fall back to local login but log warning
- `AppUser` type: add optional `distributorId` field so distributor-linked users carry their distributorId
- Builtin slots are stored in backend under the distributor on first initialization (when distributor logs in for first time)
- UserManagementPanel: show Staff and Delivery sections separately with 5 slots each, each slot editable inline

### Remove
- Nothing removed -- existing Add User form stays for adding extra users beyond the 10 builtin slots

## Implementation Plan
1. Fix `handleLogin`: for admin role, always call backend even if lookupUser matches -- get distributorId
2. Fix `handleLogin`: for staff/delivery, always call backend verifyStaffLoginForDistributor even if lookupUser matches -- get distributorId
3. Add `BUILTIN_STAFF_SLOTS` and `BUILTIN_DELIVERY_SLOTS` constants (5 each) with default username/password
4. On distributor first login / UserManagementPanel mount: initialize builtin slots in backend if not already present
5. UserManagementPanel: render two sections (Staff 5 slots, Delivery 5 slots) loaded from backend, each with inline Edit
6. Edit slot handler: update backend first, then localStorage -- show success only after backend confirms
7. Keep existing Add User form below the builtin slots section for adding extra users
