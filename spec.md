# MedFlow — Change Requests

## Current State
- App name is "Medi ProMax" / "MedOrder" in various places
- Login screen shows "Mian Medicine Distributors"
- Invoices show "Mian Medicine Distributors"
- Delivery dashboard has per-item return qty input but no quick "Return All" button per item, and no "Return All Order" button
- User Management: custom users can be deleted, built-in staff/delivery users cannot be deleted
- Built-in USER_DB has booker1-5 and delivery1-3 as default users

## Requested Changes (Diff)

### Add
- In delivery return modal: add a "Return" button next to each item's quantity input that instantly sets returnQty = full item qty (one-click full item return, without typing)
- In delivery dashboard order card: add back "Return All Order" button that opens return modal with all items pre-filled to full quantity
- In User Management: allow deletion of built-in staff/delivery users (not admin) by storing hidden usernames in localStorage. Also confirm custom user create with custom User ID (username) and Display Name already works.

### Modify
- Change app name from "Medi ProMax"/"MedOrder" to "MedFlow" everywhere: `index.html` title/meta, login screen heading, SuperAdminDashboard
- Login screen: change "Mian Medicine Distributors" → "Medicine Distributors" (remove Mian)
- Invoices (print view): keep "Mian Medicine Distributors" unchanged
- EstimatedBillingScreen: keep "Mian Medicine Distributors" in print view unchanged
- App icon: use new `/assets/generated/medflow-icon.dim_512x512.png`, update apple-touch-icon in index.html
- manifest.json: already updated to MedFlow + new icon
- Built-in USER_DB: remove default dummy staff/delivery users (booker1-5, delivery1-3) — admin stays. These were placeholders.

### Remove
- Nothing permanent removed

## Implementation Plan
1. `index.html`: Update title to "MedFlow", apple-mobile-web-app-title, description, apple-touch-icon path
2. `App.tsx` login screen (~line 1254): Change heading from "MedOrder"/"Medi ProMax" to "MedFlow", change "Mian Medicine Distributors" → "Medicine Distributors"
3. `App.tsx` invoices print view: keep "Mian Medicine Distributors" (do NOT change)
4. `App.tsx` USER_DB: Remove booker1-5 and delivery1-3. Keep only admin. Add a `HIDDEN_BUILTIN_USERS_KEY` in localStorage.
5. `App.tsx` UserManagementPanel: Allow deletion of built-in staff/delivery users by storing their username in a hidden list. Filter them out from allUsers display.
6. `App.tsx` delivery return modal: Add a "Return" button (red, small) next to each item's qty input that sets returnQtys[item.medicineId] = item.qty
7. `App.tsx` delivery order card: Add "Return All Order" button that opens return modal with all items pre-set to full qty
8. `SuperAdminDashboard.tsx`: Update any "Medi ProMax" references to "MedFlow"
