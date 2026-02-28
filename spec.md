# MedOrder - Medicine Distributor

## Current State
Full-stack app with:
- Staff/Booker mobile app (login, pharmacies, order taking with bonus/discount, order history, manage)
- Office Dashboard (/office) - PC-optimized with active orders, history, inventory, purchasing tabs
- Delivery Dashboard (/delivery) - Mobile-optimized with confirmed orders and mark-delivered
- Test view (/test) showing all 3 dashboards side by side
- Backend: OrderRecord has id, staffId, staffName, staffCode, pharmacyId, status, orderLines (with bonusQty/discountPercent), notes, timestamp
- Invoice print via buildPrintHtml() - basic format with MedOrder title
- MedicineItem has medicineId, quantity, bonusQty, discountPercent

## Requested Changes (Diff)

### Add
1. **Delivery Dashboard - Payment tracking**:
   - Payment received field: "Received Amount | موصول رقم" (input)
   - Remaining/Balance display: "Balance | باقی" = total - received
   - These show per order on delivery dashboard

2. **Delivery Dashboard - Return option**:
   - "Return Items | واپسی" button per order
   - When tapped: show list of order items, each with a "Return this item?" toggle
   - Return reason textarea
   - On save: some items kept (green), some returned (red)
   - This status visible on ALL 3 dashboards (staff, office, delivery)

3. **Backend - Extended OrderRecord**:
   - Add `paymentReceived: Nat` field
   - Add `returnItems: [ReturnItem]` field (ReturnItem = { medicineId: Nat; returnedQty: Nat })
   - Add `returnReason: Text` field
   - New function: `updateOrderPaymentAndReturn(orderId, paymentReceived, returnItems, returnReason)`

4. **Invoice - Updated format**:
   - Title: "MIAN MEDICINE DISTRIBUTOR" in large bold block letters (uppercase)
   - New columns: Batch#, Discount%, Bonus
   - New field: Pharmacy Code
   - Tax line: "Advanced Tax U/S 236-H @ 0.50%" = subtotal * 0.005, shown before grand total
   - Grand Total = subtotal + tax

### Modify
1. **OfficeOrderDetail type** - add paymentReceived, returnItems, returnReason
2. **OrderDetailModal** - show return reason and return status per item (green/red), payment info
3. **Office Dashboard orders table** - show partial return badge if any items returned
4. **Staff Dashboard order history/detail** - show return status (green retained, red returned) and return reason
5. **buildPrintHtml** - complete invoice redesign per requirements above

### Remove
- Nothing removed

## Implementation Plan
1. Update main.mo: add ReturnItem type, update OrderRecord with paymentReceived/returnItems/returnReason, add updateOrderPaymentAndReturn function
2. Update backend.d.ts with new types and function signatures
3. Update DeliveryDashboard: load order items detail, add payment input, add return modal with item toggles + reason field
4. Update all order detail views (staff OrderDetailScreen, office OrderDetailModal): show green/red items, return reason, payment info
5. Update office orders table: show return badge
6. Update buildPrintHtml: new invoice design with Mian Medicine Distributor, batch/discount/bonus cols, pharmacy code, advanced tax
