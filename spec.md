# MedFlow

## Current State
App has delivery dashboard with partial return functionality and staff dashboard with visited counter and pharmacy green tick features. All stored in localStorage without date tracking.

## Requested Changes (Diff)

### Add
- Date-based storage for visited pharmacies in localStorage
- Date-based storage for visited counter in localStorage

### Modify
- Delivery dashboard: return save logic to use user-entered qty instead of original item qty
- Staff dashboard: visited counter to show only today's count, reset to 0 after midnight
- Staff dashboard: pharmacy green tick to reset daily at midnight

### Remove
- Nothing removed

## Implementation Plan
1. Fix 1 (App.tsx - Delivery Dashboard): Find return submission logic where `returnedQuantity` is set -- replace `item.quantity` with the user-entered return qty from state (e.g. `returnQtyInput[item.id]` or similar)
2. Fix 2 & 3 (App.tsx - Staff Dashboard): Update localStorage read/write for visitedPharmacies to include date field `{date: 'YYYY-MM-DD', ids: [...]}`. On load, if stored date !== today, reset to empty. Visited counter also date-gated same way.
