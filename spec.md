# MedFlow -- 9 Changes Build

## Current State

- `src/frontend/src/App.tsx` -- 17562 lines, contains all dashboards
- `DeliveryDashboard` component (line 15356): has logout button directly in header, no hamburger menu, shows all orders (pending + delivered + returned) in one list, no history screen, no separate delivered/returned sections
- `MobileApp` (staff dashboard, line 16558): offline orders show on main dashboard screen mixed with regular orders. `SideDrawer` component (line 855) has Pharmacies, Order History, Manage nav items + Logout at bottom -- no Offline Orders item
- User add logic (line 9801): `addStaffForDistributor` backend call is wrapped in try/catch with `/* ignore if backend unavailable */` -- silently fails, user only saves to localStorage

## Requested Changes (Diff)

### Add
- Delivery Dashboard: hamburger menu (3 lines) button in header
- Delivery Dashboard: menu drawer with options -- Delivered Orders, Return Orders, History, Logout
- Delivery Dashboard: date-wise History screen inside delivery (delivered + returned orders grouped by date, like staff/office order history)
- Delivery Dashboard: Delivered Orders screen (separate view showing all delivered orders)
- Delivery Dashboard: Return Orders screen (separate view showing all returned orders)
- Staff Dashboard SideDrawer: "Offline Orders" menu item (navigates to offline orders screen)
- Staff Dashboard: Offline Orders screen (shows pendingOfflineOrders list)

### Modify
- Delivery Dashboard main screen: show ONLY pending/active orders (status not delivered and not returned). Remove delivered/returned from main list
- Delivery Dashboard: move Logout out of header into hamburger menu
- Staff Dashboard: remove offline orders banner/section from main dashboard screen -- they should only appear in the dedicated Offline Orders screen via menu
- User Management (UserManagementPanel, line 9691): fix backend sync -- if `addStaffForDistributor` fails, show error toast and do NOT silently ignore. Also on app load, attempt to sync any local-only users (those without backendStaffId) to backend

### Remove
- Delivery Dashboard header: standalone Logout button (moves to hamburger menu)
- Staff Dashboard main screen: offline orders display section (moves to dedicated screen)

## Implementation Plan

1. **Delivery Dashboard hamburger menu**: Add `deliveryMenuOpen` state. Add hamburger (Menu icon, 3 lines) button to delivery header (replace or alongside existing buttons). Build a slide-in drawer/sheet with items: Delivered Orders, Return Orders, History, Logout

2. **Delivery Dashboard main screen filter**: Change the orders displayed on main screen to only show orders where status is NOT 'delivered' and NOT 'returned'. Use existing `allOrders` or `pendingOrders` state -- filter to active/pending only

3. **Delivery Dashboard -- Delivered Orders view**: New view state `deliveryView: 'main' | 'delivered' | 'returned' | 'history'`. When 'delivered' selected from menu, show all delivered orders list

4. **Delivery Dashboard -- Return Orders view**: Same view state, when 'returned' show all returned orders

5. **Delivery Dashboard -- History view**: Date-wise grouped history (like `OfficeOrderHistoryHierarchy` pattern). Group allOrders by date, show months > dates > orders, include both delivered and returned orders

6. **Staff SideDrawer -- Offline Orders item**: Add new nav item to `SideDrawer` navItems array: `{ icon: <WifiOff>, label: 'Offline Orders', urdu: 'آف لائن آرڈر', screen: { name: 'offline-orders' } }`. Add badge showing count if >0

7. **Staff -- Offline Orders screen**: Create `OfflineOrdersScreen` component that displays `pendingOfflineOrders` list. Pass `pendingOfflineOrders` to it. Show each order with customer name, medicines, amount, "Pending sync" badge. If empty, show "No offline orders" message

8. **Staff main dashboard**: Remove the offline orders banner and inline offline orders list from `DashboardScreen` -- they move to the dedicated screen. Synced orders should appear normally in main orders list (this already works)

9. **User backend sync fix**: In `UserManagementPanel.handleAddUser`, change catch block from `/* ignore */` to show `toast.error("User locally saved but backend sync failed -- cross-device login may not work")`. Also add a `useEffect` on component mount that loops through `customUsers` without `backendStaffId` and attempts to sync them to backend via `addStaffForDistributor`
