# MedFlow

## Current State
EstimatedBillingScreen has two issues:
1. Manage > Customers tab and Customer Wise Sale filters show empty because existing data is in `pharmacies` table, not `customers` table
2. Estimated Billing has a 'Create Bill' button that only allows printing -- no way to save/add a real order

## Requested Changes (Diff)

### Add
- New "Add Order" tab in EstimatedBillingScreen alongside existing Products tab
- Add Order form: customer searchable dropdown, medicine rows (name, qty, bonus, dist%, co%, net rate), submit button
- On submit: call createOrderForDistributor with status Confirmed, subtract qty from estimated pool, show success toast
- EstimatedBillingScreen receives new props: actor, distributorId

### Modify
- `loadCustomers` in OfficeDashboard: after fetching from getCustomers/getCustomersByDistributor, also merge in pharmacies from allPharmacies state (already loaded), deduplicating by name
- ManageView customer list useEffect: merge `_pharmacies` prop (passed as pharmacies) with `customers` state for display -- convert pharmacies to Customer shape
- EstimatedBillingScreen rendering in App.tsx: pass `actor` and `distributorId` props

### Remove
- "Create Bill | بل بنائیں" button from Customers tab in EstimatedBillingScreen
- Bill dialog/modal entirely

## Implementation Plan
1. Fix `loadCustomers` in OfficeDashboard to merge allPharmacies into allCustomers
2. Fix ManageView useEffect to merge pharmacies prop into customers list
3. Update EstimatedBillingScreen props interface to accept actor and distributorId
4. Remove Create Bill button and dialog from EstimatedBillingScreen
5. Add "Add Order" tab with order form to EstimatedBillingScreen
6. Wire up submit: createOrderForDistributor with Confirmed status, pool qty subtraction
7. Pass actor and distributorId from OfficeDashboard to EstimatedBillingScreen
