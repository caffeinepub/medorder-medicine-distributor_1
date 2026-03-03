# MedOrder - Medicine Distributor

## Current State
Full-stack medicine distributor order management app with:
- Staff mobile dashboard with side drawer navigation
- Office dashboard (`/office`) with left sidebar (hamburger toggle), multiple views: Active Orders, History, Inventory, Purchasing, Add Order, Payments, Daily Sale Statement, Customer Wise Sales, Add Customer
- Delivery dashboard (`/delivery`) with order return/payment flow
- Backend stores orders, medicines, pharmacies, customers, purchases

## Requested Changes (Diff)

### Add
1. **Order color coding in Office Active Orders table** — add a left-border color indicator per row based on discount/bonus presence:
   - Has both discount AND bonus items → purple left border
   - Only discount items (no bonus) → red left border
   - Only bonus items (no discount) → blue left border
   - Neither discount nor bonus → green left border
   - Also add a small colored dot/badge in the row to make it visible
2. **NTN# and CNIC fields in Add Customer form** — two new text input fields below the existing fields
3. **NTN# and CNIC display in invoices** (buildPrintHtml) — show these fields in the invoice header if set on the customer/pharmacy

### Modify
1. **Office sidebar auto-close on item select** — when any sidebar nav button is clicked (setActiveView), also call `setSidebarOpen(false)` to close the sidebar automatically. The hamburger toggle still opens/closes manually.
2. **Customer Wise Sales — link all tabs to selected customer** — add a customer search/select at the top of the Customer Wise Sales view. When a customer is selected, ALL tabs (All Over, Company Wise, Group Wise, Area Wise, Product Wise) filter to show only orders from that specific customer's pharmacy (matched by name). If no customer selected, show all data (current behavior).
3. **Daily Sale Statement — delivered orders only + exclude returned items** — the `filteredOrders` in DailySaleStatement should only include orders with `status === "delivered"`. Items that are in `returnItems` array should be excluded from the sale quantities. The DailySaleStatement receives `allOrders` prop from `[...ordersWithLines, ...historyOrders]` — filter to delivered only and subtract returned item quantities.

### Remove
- Nothing removed

## Implementation Plan

1. **Office sidebar close on nav click** — In OfficeDashboard, wrap each `setActiveView(...)` call inside sidebar nav buttons with `() => { setActiveView("..."); setSidebarOpen(false); }` for all nav buttons.

2. **Customer Wise Sales — customer selector** — Add `cwsSelectedCustomer` state (Customer | null). Add a search input at the top of the customer-wise-sales view that filters `allCustomers` and shows a dropdown to select. When selected, filter all CWS tabs to orders where `o.pharmacyName.toLowerCase() === selectedCustomer.name.toLowerCase()` (or by code match). Show "Viewing: [name]" badge with clear button.

3. **Add Customer — NTN# and CNIC fields** — Add `custNTN` and `custCNIC` state strings. Add two input fields in the Add Customer form. Pass them to `actor.addCustomer(...)` — but since the backend Customer type doesn't have these fields, store them in `localStorage` keyed by customer backend ID as a fallback. Also display them in the customer list.

4. **NTN# and CNIC in invoice** — In `buildPrintHtml`, look up the NTN/CNIC from localStorage for the order's pharmacy (by matching pharmacy name/code). Display below pharmacy name in invoice header if present.

5. **Daily Sale Statement — delivered only + no returns** — In `DailySaleStatement`, change `filteredOrders` to only include `o.status === "delivered"`. When computing quantities per medicine, subtract returned quantities: for each order line item, check `o.returnItems` and subtract returned qty from the sale qty.

6. **Order color coding** — In `OfficeDashboard` Active Orders table, compute per-order `hasDiscount` and `hasBonus` from `order.items`. Apply left border color class to each `<tr>`: purple=`border-l-4 border-l-purple-500`, red=`border-l-4 border-l-red-500`, blue=`border-l-4 border-l-blue-500`, green=`border-l-4 border-l-green-500`. Add a small color dot badge in the Order ID cell.
