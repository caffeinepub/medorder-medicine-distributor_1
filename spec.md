# MedOrder - Medicine Distributor

## Current State

- Staff mobile app (login, dashboard, pharmacies, order taking, order history, manage)
- Office Dashboard at `/office` -- PC layout with orders table, status filters, per-order Confirm/Mark Delivered buttons, auto-refresh
- Delivery Dashboard at `/delivery`
- Test view at `/test`
- Backend: medicines have `id, name, price, description, company, strength, packSize` fields
- Orders have `id, staffId, pharmacyId, status, orderLines, timestamp`

## Requested Changes (Diff)

### Add

1. **Office Dashboard -- Confirm All button**: A "Confirm All | سب تصدیق کریں" button that sets all pending orders to `confirmed` status in one click (calls `updateOrderStatus` for each pending order in parallel).

2. **Office Dashboard -- Print All PDF**: A "Print All | سب پرنٹ" button that generates a printable PDF invoice view for all currently visible/filtered orders and triggers browser print dialog. Each order should be a separate section with order ID, pharmacy name, date, items table (medicine, qty, price, total), and grand total. Use browser's `window.print()` with a dedicated print stylesheet (hidden on screen, visible on print via CSS `@media print`).

3. **Office Dashboard -- Inventory section**: A new "Inventory | انوینٹری" tab/section in the office dashboard (alongside the orders table) showing all medicines grouped by company name. Each company has its own named block/card. Within each block, medicines are listed with name, strength, pack size, price. Office staff can also set a stock quantity for each medicine (stored in local state for now, or as a new `stockQty` field if backend supports it -- frontend only is acceptable).

4. **Staff Dashboard / Order Taking -- Inventory visibility**: In the `OrderTakingScreen`, when browsing medicines to order, show the current stock quantity next to each medicine (read from the same inventory state). This gives staff visibility into available stock while ordering.

5. **Office Dashboard -- Medicines grouped by company**: In the Inventory tab, medicines are displayed in named company blocks (e.g. "GlaxoSmithKline", "Abbott", "Sanofi"). Each company block is visually distinct with the company name as a header.

### Modify

- Office Dashboard header: add "Inventory" tab button to switch between Orders view and Inventory view
- `OrderTakingScreen` medicine cards: show stock qty badge if inventory data available
- Office Dashboard filter/action bar: add "Confirm All" and "Print All" buttons

### Remove

Nothing removed.

## Implementation Plan

1. **OfficeDashboard**: Add `activeView` state toggling between `"orders"` and `"inventory"`. Header gets two tab buttons.

2. **Confirm All button**: In orders view toolbar, add button. On click, find all pending orders in current list, call `updateOrderStatus(id, confirmed)` for each in parallel, then reload.

3. **Print All button**: Add a hidden `<div id="print-area">` that renders all filtered orders as invoice cards. Add `@media print` CSS to show only `#print-area` and hide everything else. Button calls `window.print()`.

4. **Inventory view**: Load medicines from backend (already loaded). Group by `company` field. Render one card per company with company name as heading. Inside each card, list medicines in a table (name, strength, packSize, price, stockQty input). `stockQty` is managed in a `Map<string, number>` local state (medicine id -> qty).

5. **Stock in OrderTaking**: Pass `inventoryStock: Map<string, number>` (medicine backendId -> qty) down from MobileApp (or read from a shared context/lifted state). In `OrderTakingScreen` medicine cards, show a small badge "Stock: X" if value exists.

6. Since inventory stock is frontend-local state (no backend change needed), lift it to a shared state in `MobileApp` or pass via props from office dashboard. For the staff app, expose a simple readonly view of stock per medicine. Stock can be stored in `localStorage` so it persists across sessions and is shared between office and staff (same browser). Key: `medorder_stock_<medicineId>`.
