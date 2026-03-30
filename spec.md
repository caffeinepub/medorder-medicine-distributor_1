# MedFlow -- Three Frontend Decimal & Missing Field Fixes

## Current State
- Estimated Billing Add Order tab submits orders via `createOrderForDistributor` but does not always include `netRate` field in order items, causing backend rejection.
- Order forms in App.tsx and EstimatedBillingScreen.tsx pass decimal values (e.g. 3.5) directly to BigInt conversion, causing runtime error.
- Medicine add/edit form saves price/rate as integer (rounds decimals) because it converts float directly to BigInt without ×100 scaling.

## Requested Changes (Diff)

### Add
- ×100/÷100 scaling logic for all nat fields that accept decimals: `distributionDiscount`, `companyDiscount`, `netRate`, `discountPercent`, `bonusQty` in both App.tsx order form and EstimatedBillingScreen.tsx Add Order form
- ×100/÷100 scaling for medicine price/rate fields in App.tsx medicine add/edit form
- Default `netRate: BigInt(0)` when field is empty in EstimatedBillingScreen Add Order submission

### Modify
- `EstimatedBillingScreen.tsx`: order item builder -- always include `netRate`, apply `Math.round(value * 100)` before BigInt for all discount/rate/bonus fields; display ÷100
- `App.tsx` order form: same ×100 on save, ÷100 on display for all discount/rate/bonus fields
- `App.tsx` medicine form: price/rate fields use `Math.round(value * 100)` on save, `storedValue / 100` on display and prefill

### Remove
- Nothing removed

## Implementation Plan
1. In `EstimatedBillingScreen.tsx` Add Order submit handler: wrap each nat field with `BigInt(Math.round((parseFloat(val) || 0) * 100))`, ensure `netRate` is always present defaulting to `BigInt(0)`
2. In `EstimatedBillingScreen.tsx` display of order item values: divide stored values by 100 where shown to user
3. In `App.tsx` order form submission: apply same `Math.round(val * 100)` → BigInt for `distributionDiscount`, `companyDiscount`, `netRate`, `discountPercent`, `bonusQty`
4. In `App.tsx` order form display/prefill: divide stored values by 100
5. In `App.tsx` medicine add form submit: apply `Math.round(price * 100)` → BigInt for price/rate fields
6. In `App.tsx` medicine edit prefill: divide stored price by 100 to restore decimal
7. Anywhere medicine price is displayed in lists/tables: divide by 100
