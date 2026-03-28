# MedFlow App

## Current State
- Staff dashboard OrderHistoryScreen uses `state.orders.filter((o) => o.date !== todayStr)` to get past orders, then groups by date. The date is derived from `order.date` which is set during loadOrders from `new Date(Number(rec.timestamp / BigInt(1_000_000))).toISOString().split("T")[0]`. Issue: all staff history orders appear under 24 March only instead of their actual dates.
- Staff history date-level Print button uses a different print path. When user opens a specific date in history and clicks Print, it needs to print individual invoices per order (same as Print All).
- Office dashboard purchasing form has manual text fields for Product Name, Generic Name, Batch#, Price, Pack Size, Company, Strength, Type, Invoice#. No medicine search/autocomplete exists.

## Requested Changes (Diff)

### Add
- Purchasing form: medicine search field at the top that shows all medicines from `allMedicines`. When user selects a medicine, auto-fill: Product Name, Generic Name, Pack Size, Company Name, Strength, Type fields from the medicine's stored data.
- State variables for purchasing: `purchaseMedSearch` (string), `purchaseMedDropOpen` (boolean).

### Modify
- **Fix 1 - Staff history date grouping**: In `OrderHistoryScreen`, the `pastOrders` are filtered from `state.orders`. The grouping logic uses `order.date` for grouping. The issue is that `order.date` may be correct but orders from before distributorId was introduced may have slightly different date derivation. Need to ensure date grouping in staff history works the same as office history (`OfficeOrderHistoryHierarchy`). Specifically, ensure `order.date` is properly derived and grouped - the grouping logic itself looks correct so the issue is likely that staff `loadOrders` is only returning 24 March orders due to staff filter matching only 24 March orders. Fix: relax staff filter to also include orders with blank/undefined staffCode (older orders placed before staffCode was properly saved).
- **Fix 2 - Staff history date print**: In `OrderHistoryScreen`, the date level currently has no Print button. Need to add a Print button at the date level that calls `buildPrintHtml` with the orders for that date - same invoice format as Print All. Need to pass `buildPrintHtml`-compatible data. Since `OrderHistoryScreen` uses `Order[]` type (staff orders) not `OfficeOrderDetail[]`, need to build a staff-compatible print function OR convert to use the existing `buildInvoiceForOrder` pattern used in individual order detail.
- **Fix 3 - Purchasing medicine search**: Replace/augment the "Product Name" plain text input with a searchable dropdown showing all medicines from `allMedicines`. On selection, auto-fill: `setPurchaseProductName(med.name)`, `setPurchaseGenericName(med.genericName || "")`, `setPurchasePackSize(med.packSize || "")`, `setPurchaseCompanyName(med.company || "")`, `setPurchaseStrength(med.strength || "")`, `setPurchaseMedicineType(med.type || "Tablet")`.

### Remove
- Nothing removed.

## Implementation Plan
1. **Fix staff filter (Fix 1)**: In `loadOrders` callback (around line 15225), the staff filter is:
   ```
   session?.role === 'staff' ? orders.filter(o => o.staffId === staffId || o.staffName === staffName || o.staffId === session.username) : orders
   ```
   Add condition: `|| !o.staffId || o.staffId === ''` to include old orders with blank staffId.

2. **Add Print button to staff history date level (Fix 2)**: In `OrderHistoryScreen`, at the date row level (around line 3200 where dates are rendered), add a Print button next to the date label. On click, open a print window using a staff-order invoice builder. The staff Order type has: pharmacyName, items (medicineName, qty, unitPrice, total, bonusQty, distributionDiscount, companyDiscount), totalAmount, id, staffName, date, status. Build a print HTML similar to `buildPrintHtml` but accepting `Order[]` type.

3. **Purchasing medicine search (Fix 3)**: Add `purchaseMedSearch` and `purchaseMedDropOpen` state. Above the Product Name field (or replace it), add a search input with dropdown showing filtered `allMedicines`. On selection, auto-fill all related fields.
