# MedOrder - Medicine Distributor

## Current State

Full-stack medicine distributor app with 3 dashboards:
- **Staff App** (`/`): Mobile login, dashboard, pharmacy list, order-taking with manual quantity, cart sheet with bonus/discount, order history, manage (pharmacies/medicines)
- **Office Dashboard** (`/office`): PC-layout, tab bar (Active Orders, History, Inventory, Purchasing), order detail modal with invoice print, confirm all, print all
- **Delivery Dashboard** (`/delivery`): Confirmed orders, payment input, return items modal, mark delivered

Invoice print uses `buildPrintHtml()` with MIAN MEDICINE DISTRIBUTOR header, tax line, items table.

## Requested Changes (Diff)

### Add
- **Office Dashboard**: Left-side vertical menu bar (sidebar) showing all options — Active Orders, History, Inventory, Purchasing — replacing the current top tab bar. Orders section stays as main content area.
- **Office Dashboard**: "Add New Order" form/modal accessible from the sidebar menu, where office staff can select pharmacy, add medicines with qty/bonus/discount, and submit an order.
- **Staff Order-Taking**: Bonus Qty and Disc% input fields displayed directly on each medicine card (alongside the quantity field), so booker can set them without opening cart sheet.
- **Delivery Dashboard**: Remove the "Invoice # | انوائس" block/label from order cards (it was showing orderId as a separate labeled block). The orderId is already visible as small text.
- **Invoice print & modal**: In the items table, for each item that has discountPercent > 0, calculate discount amount = (unitPrice × qty × discountPercent / 100), show it as a separate column or deduct from total column. The "Total" for that item = unitPrice × qty − discount amount.

### Modify
- **Quantity fields** (both medicine card in order-taking AND cart sheet): Change `type="number"` inputs to accept decimals by removing `step` restriction and allowing float values. Store qty as float (not integer). In `handleSubmitOrder`, multiply qty by 1000 and pass as BigInt (or keep as is if backend supports float-like bigint). Display with up to 2 decimal places.
- **Invoice items table**: Modify "Total" column to show discounted total. Add "Disc Amt" or show deduction clearly.
- **Office Dashboard layout**: Replace horizontal tab pills with a vertical left sidebar navigation.

### Remove
- **Delivery Dashboard order cards**: Remove the separate `<span className="text-xs font-mono text-gray-400 ..."> {order.orderId}</span>` labeled "Invoice #" block from the card header area (top-right). The order reference is still visible in delivered section.

## Implementation Plan

1. **OrderTakingScreen** — Add bonus/discount inputs directly on medicine card (below qty field), same styling as cart sheet inputs. These update `bonusDiscountMap` state already present.

2. **Quantity decimal support** — Change quantity inputs (medicine card + cart sheet) to accept decimal values. Parse as `parseFloat` instead of `Number` for integer assumption. Submit to backend: multiply by 100 and pass as BigInt(Math.round(qty * 100)), OR keep qty as-is but display with toFixed(2). Since backend uses bigint for quantity, store as `Math.round(qty * 100)` and divide by 100 on display. Simplest: allow decimal input, Math.round on submit (acceptable for medicine quantities).

3. **Delivery Dashboard** — In the order card header, remove the `<span>` that shows `{order.orderId}` as the top-right label with font-mono styling.

4. **Invoice** — In `buildPrintHtml()` and `OrderDetailModal` items table:
   - For each item: `discountAmt = item.unitPrice * item.qty * item.discountPercent / 100`
   - `discountedTotal = item.total - discountAmt`
   - Show "Disc Amt" column if any item has discount, showing the deducted amount
   - "Total" column shows `discountedTotal`
   - Grand total sums `discountedTotal` values

5. **Office Dashboard sidebar** — Replace the horizontal tab pills `<div className="flex items-center gap-1 bg-white border ...">` with a two-column layout: left sidebar (fixed width ~220px) with vertical nav links (Active Orders, History, Inventory, Purchasing, Add Order), right content area shows the selected view.

6. **Office Dashboard Add Order** — New view in sidebar "Add Order | آرڈر شامل کریں". Form: pharmacy dropdown (from loaded pharmacies), medicine rows (select medicine + qty + bonus + discount), notes, submit button that calls `actor.createOrder()`.
