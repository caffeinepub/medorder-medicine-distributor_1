# MedFlow

## Current State
MedFlow is a multi-tenant medicine distributor order management app. Three issues need fixing:
1. Estimated Billing pool does not subtract when an order is added via the 'Add Order' tab. The pool is derived from `allOrders` (filtering Co% items), but the subtract logic only writes to localStorage which is ignored when `allOrders` is present.
2. Company Discount (Co%) is hardcoded as `BigInt(0)` in the Add Order submit logic in `EstimatedBillingScreen.tsx` — the `co` field from `OrderRow` is not used, so Co% is never saved and the Co% tab doesn't show in the invoice.
3. Group Management (`GroupManagementPanel`) is currently embedded inside the Customer Wise Sale section in App.tsx. User wants it moved to Manage section, and removed from Customer Wise Sale.

## Requested Changes (Diff)

### Add
- In Manage view (inside `ManageScreen` or as a new tab alongside Customers/Medicines), add a **Groups** tab that renders `GroupManagementPanel`.
- In `EstimatedBillingScreen.tsx`: after successful order submit, track dispensed quantities using a separate localStorage key `estimatedBilling_dispensed` (array of `{medicineName, qty}`). When deriving pool from `allOrders`, subtract dispensed quantities so the pool reflects remaining stock.

### Modify
- `EstimatedBillingScreen.tsx` line ~297: Change `companyDiscount: BigInt(0)` to use the actual `co` field: `BigInt(Math.round((parseFloat(row.co) || 0) * 10))` — same pattern as `distributionDiscount`.
- `EstimatedBillingScreen.tsx` pool derivation: After building `derivedPool` from `allOrders`, apply dispensed subtractions from `estimatedBilling_dispensed` localStorage key.
- `EstimatedBillingScreen.tsx` submit success: Write dispensed items to `estimatedBilling_dispensed` localStorage key (accumulate, don't overwrite).
- `App.tsx` ManageScreen: Add a `groups` tab to the existing tab bar (alongside `pharmacies` and `medicines`). Render `GroupManagementPanel` when groups tab is active. Pass `allMedicineGroups`, `actor`, `distributorId` props.
- `App.tsx` Customer Wise Sale section: Remove the Group Management block (the `<div>` containing `GroupManagementPanel` at the bottom of the CWS view, around line 13896).

### Remove
- Group Management UI block from Customer Wise Sale section in App.tsx.

## Implementation Plan
1. Fix `companyDiscount` in EstimatedBillingScreen Add Order submit: use `row.co` instead of hardcoded 0.
2. Add `estimatedBilling_dispensed` localStorage tracking: on submit success, push `{medicineName, qty}` for each ordered row.
3. Modify pool derivation (`useEffect` on `allOrders`): after building `derivedPool`, load `estimatedBilling_dispensed` from localStorage and subtract dispensed quantities per medicine name. If a medicine qty reaches 0 or below, filter it out.
4. In ManageScreen component: add `groups` to the `activeTab` type union, add a Groups tab button in the tab bar, and render `GroupManagementPanel` when active. Add `distributorId` prop to ManageScreen and pass it through from the call sites.
5. Remove `GroupManagementPanel` block from Customer Wise Sale section.
