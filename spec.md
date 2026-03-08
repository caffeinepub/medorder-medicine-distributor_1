# MedOrder - Medicine Distributor

## Current State
The app has a full Motoko backend with stable storage for orders, pharmacies, medicines, customers, purchases, and inventory. The frontend calls `getActiveOrders()` but the deployed canister (mfqup-7aaaa-aaaao-a5o7a-cai) does not have this method compiled, causing IC0536 errors. The backend.mo source code has the method defined, but the compiled wasm is out of sync.

## Requested Changes (Diff)

### Add
- Nothing new — just ensure backend compiles and deploys correctly with all existing methods

### Modify
- Rebuild backend so deployed canister matches main.mo source including `getActiveOrders`, `getHistoryOrders`, `getStaffOrders`, `updateOrderLines`, `getInventoryStock`, `setInventoryStock`, `adjustInventoryStock`

### Remove
- Nothing

## Implementation Plan
1. Regenerate Motoko backend with all existing methods to force a fresh compile and deployment
2. Ensure all stable variables are preserved across upgrades
3. Redeploy frontend unchanged
