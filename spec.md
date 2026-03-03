# MedOrder - Medicine Distributor

## Current State

Full-stack medicine distribution app with:
- Staff mobile app (login, order taking, order history, manage)
- Office Dashboard (/office) with: active orders, history, inventory, purchasing, add-order, payments, daily sale statement
- Delivery Dashboard (/delivery) with payment recording, return items
- Backend stores: staff, pharmacies, medicines, orders, purchases
- Medicine model: id, name, price, description, company, strength, packSize
- PurchaseRecord model: id, productName, genericName, batchNo, quantity, price, packSize, companyName, timestamp
- Payments view in Office sidebar shows monthly/daily payment history with "Clear Today's Payments" button
- Inventory view in Office shows medicines grouped by company

## Requested Changes (Diff)

### Add

1. **Customer backend type**: New `Customer` record with fields: id, name, customerType (#doctor | #medicalStore | #pharmacy), address, area, contactNo, groupName, code, timestamp
2. **Backend methods**: addCustomer, deleteCustomer, getCustomers
3. **Medicine backend fields**: Add `genericName: Text`, `batchNo: Text`, `medicineType: Text` (tablet/syrup/injection/capsule/drop/cream/sachet/other)
4. **PurchaseRecord backend field**: Add `medicineType: Text`
5. **Office sidebar item**: "Customer Wise Sales | کسٹمر وائز سیلز" - new view
6. **Customer Wise Sales view**: date range filter + filter tabs: All Over / Company Wise / Group Wise / Area Wise / Product Wise. Data linked to daily sale statement order records. Shows pharmacy/customer names, total units sold, total value.
7. **Office sidebar item**: "Add Customer | کسٹمر شامل کریں" - new view
8. **Add Customer view**: Form to add Doctors, Medical Stores, Pharmacies with fields: name, type (Doctor/Medical Store/Pharmacy), contact, address, area, group name, code. List of existing customers with delete.
9. **Auto-reset payments at midnight**: Delivery dashboard payment summary auto-resets at midnight (12am). Previous day payments move to historical record with their date. Current day payments start fresh.

### Modify

1. **Inventory (office)**: Add `Generic Name`, `Batch#`, `Type` columns to medicine list display
2. **Medicine add form (Manage screen, staff)**: Add `Generic Name`, `Batch#`, `Type` fields - stored in medicine `description` field encoded as JSON: `{"genericName":"...","batchNo":"...","type":"..."}`
3. **Purchasing tab (office)**: Add `Medicine Type` field to add purchase form and display in table
4. **Payments view (office)**: Remove "Clear Today's Payments" button. Auto-reset logic: at midnight, previous day payments freeze in history under previous date. Current day shows fresh. The midnight check is frontend-based using localStorage timestamp.
5. **Delivery dashboard**: Payment summary bars show only current day payments (since last midnight). Previous day data visible in historical record with date labels.

### Remove

1. "Clear Today's Payments" button from PaymentsView component

## Implementation Plan

### Backend (main.mo)
- Add `Customer` type with fields: id, name, customerType (variant), address, area, contactNo, groupName, code, timestamp
- Add `customers` map and `nextCustomerId` counter
- Add `addCustomer`, `deleteCustomer`, `getCustomers` methods
- Update `Medicine` type: add `genericName: Text`, `batchNo: Text`, `medicineType: Text`
- Update `addMedicine` to accept 3 new params
- Update `PurchaseRecord` type: add `medicineType: Text`
- Update `addPurchase` to accept `medicineType`

### Frontend
- Update `backend.d.ts` to match new backend types
- **Inventory (office)**: Show genericName, batchNo, medicineType in medicine cards (parse from description JSON for older medicines)
- **Manage > Add Medicine form**: Add genericName, batchNo, type (select) fields
- **Purchasing tab**: Add medicineType field in form and table column
- **PaymentsView**: Remove "Clear Today's Payments" button. Add midnight auto-reset: store last-cleared date in localStorage; on component mount and every minute, check if current date != last-cleared date, if so auto-reset
- **Delivery dashboard payment bars**: Only show payments from current calendar day (after midnight)
- **Office sidebar**: Add "Customer Wise Sales" and "Add Customer" items
- **Customer Wise Sales view**: Date range picker, filter tabs (All Over/Company Wise/Group Wise/Area Wise/Product Wise), table linked to orders data showing pharmacy/customer names with units + value totals
- **Add Customer view**: Form + list for managing Doctors, Medical Stores, Pharmacies as customers with type field
