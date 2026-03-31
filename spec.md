# MedFlow

## Current State
- Estimated Billing screen has an 'Add Order' tab that creates confirmed orders via `createOrderForDistributor`. The pool is derived from `allOrders` by filtering Co% items. When a new order with `companyDiscount > 0` is created via Add Order, `allOrders` updates and pool re-derives to INCLUDE the new order, doubling the pool instead of subtracting.
- Customer Wise Sale section has 5 report tabs below the filter area: Customer Wise, Company Wise, Product Wise, Month Wise, Group Wise.
- CWS product filter works at order level -- if an order has Panadol + Amoxil and user filters for Panadol only, both show up.

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
1. **EstimatedBillingScreen.tsx -- Pool double fix**: When submitting order from Add Order tab, set `companyDiscount: BigInt(0)` on all order lines sent to backend. This prevents the new order from being picked up by the pool derivation (which filters `companyDiscount > 0`). The localStorage subtract still runs correctly. Pool will correctly decrease instead of doubling.
2. **App.tsx -- CWS tabs removal**: Remove the 5-tab row (Customer Wise, Company Wise, Product Wise, Month Wise, Group Wise) from Customer Wise Sale section. Remove the `cwsActiveReportTab` state and its usage. Keep only the single unified report table.
3. **App.tsx -- CWS product filter fix**: Change the filter logic from order-level to item-level. When `cwsSelectedMedicines` is active, the rows array should only include items that match the selected medicines -- not all items from matching orders. Currently whole orders pass the filter if ANY item matches; fix so only the MATCHING items are included in the rows output.

### Remove
- `cwsActiveReportTab` state and related tab UI
- Tab-based report switching logic (groupKey/groupHeader was switching based on active tab)
- Report title map that depended on active tab

## Implementation Plan
1. In `EstimatedBillingScreen.tsx` `handleSubmitOrder`: change `companyDiscount` field in `orderLines` map to always be `BigInt(0)` (the Co% was already in pool from original order; this fulfillment order should not re-add to pool)
2. In `App.tsx` Customer Wise Sale section: remove the tab buttons UI block (lines ~13430-13465), remove `cwsActiveReportTab` state, keep only 'customer' grouping logic (or make groupKey always be pharmacyName/customer)
3. In `App.tsx` CWS filter + rows generation: after filtering orders that pass all filters, when building rows loop over `order.items`, add a check -- if `cwsSelectedMedicines.length > 0`, skip items where `item.medicineName` is not in `cwsSelectedMedicines`
