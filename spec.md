# MedOrder - Medicine Distributor

## Current State

The app is a fully frontend-only React app with:
- Login screen (staff name + ID, no real auth)
- Dashboard with stat cards and recent orders
- Pharmacy list screen with search and area filters
- Order-taking screen with medicine catalog (category tabs, search, qty controls, cart)
- Order history screen with status filter tabs
- Order detail screen with status update button

All data is hardcoded in constants (PHARMACIES, MEDICINES, INITIAL_ORDERS). Orders are stored in React reducer state only -- they are lost on page refresh.

The backend (main.mo) already has full CRUD APIs:
- `registerStaff`, `addPharmacy`, `addMedicine`, `createOrder`, `updateOrderStatus`
- `getPharmacies`, `getMedicines`, `getAllStaffOrders`, `getOrder`, `getStaffOrders`

Frontend has `backend.d.ts` bindings but is NOT calling any backend functions.

## Requested Changes (Diff)

### Add
- On app startup (after login): seed backend with pharmacies and medicines if empty (call `addPharmacy` / `addMedicine` for each)
- On login: call `registerStaff` (handle "already exists" error gracefully)
- On order submit: call `createOrder(pharmacyId, orderLines)` to save to backend; show loading state on submit button
- On order history screen: load orders from backend via `getAllStaffOrders()`; show loading spinner
- On order detail screen: load order from backend via `getOrder(orderId)`; call `updateOrderStatus` when status is changed
- On pharmacy list: load pharmacies from backend via `getPharmacies()`
- On medicines catalog: load medicines from backend via `getMedicines()`

### Modify
- `handleSubmitOrder`: after local dispatch `SUBMIT_ORDER`, also call backend `createOrder` with mapped orderLines (medicineId as bigint, quantity as bigint)
- Order IDs: use backend-returned numeric IDs (bigint) converted to string `ORD-${id}`
- `updateOrderStatus` on OrderDetail screen: call backend `updateOrderStatus` then refresh local state
- PHARMACIES and MEDICINES constants: keep as seed data but only use them for seeding backend on first load, then replace with backend data
- Login: after local LOGIN dispatch, call `registerStaff` in background (swallow "already exists" error)

### Remove
- No hardcoded INITIAL_ORDERS used at runtime (use backend orders instead)
- Pure local-only order state management (replace with backend-fetched data)

## Implementation Plan

1. Import `backend` from `./backend` in App.tsx
2. Add `useEffect` on login to call `registerStaff(name, password="staff123")`
3. Add `useEffect` after login to seed pharmacies and medicines from constants if backend returns empty arrays; then load them into local state
4. On pharmacy list mount: call `getPharmacies()` and update local pharmacy state
5. On medicine catalog (OrderTakingScreen): call `getMedicines()` and use backend data
6. In `handleSubmitOrder`: call `backend.createOrder(BigInt(pharmacyId), orderLines)` and use returned orderId for the Order record
7. On order history mount: call `getAllStaffOrders()`, map backend OrderRecord to local Order type using medicines/pharmacies lookup
8. On order detail: call `getOrder(orderId)` to fetch fresh data; call `backend.updateOrderStatus` on status change
9. Add loading states (spinner/disabled button) for async operations
10. Handle errors with toast notifications
