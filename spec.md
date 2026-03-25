# MedFlow

## Current State
Multi-tenant medicine distributor order management app. Office dashboard has sidebar with Add Customer option and Manage section (tabs: Pharmacies, Medicines). PaymentsView has no clear button. ManageScreen delete buttons have no password protection. Office order history print uses buildDatePrintHtml (table format). filteredHistory only uses historyOrders (misses untagged orders). Customer type has no pmdc field in backend.

## Requested Changes (Diff)

### Add
- Payments tab: password-protected "Clear All Payments" button
- Manage: password dialog before any delete (pharmacy or medicine)
- Manage Customers tab: full Add Customer form with all fields + new PMDC# field
- Backend Customer type: add `pmdc: Text` field
- Backend addCustomer / addCustomerForDistributor: add pmdc parameter

### Modify
- Office filteredHistory memo: merge historyOrders + orders (deduped by backendId) so untagged 24 March orders appear
- Office history Print button: use buildPrintHtml (invoice format) instead of buildDatePrintHtml (table format)
- ManageScreen tab "Pharmacies" label → "Customers"
- Manage Customers tab: replace simple pharmacy form with full customer add form (same fields as add-customer view + PMDC)
- Sidebar: remove "Add Customer" button

### Remove
- Sidebar "Add Customer | کسٹمر شامل کریں" button

## Implementation Plan
1. Backend (main.mo): add `pmdc: Text` to Customer type; add pmdc param to addCustomer and addCustomerForDistributor
2. Frontend App.tsx:
   a. filteredHistory memo: spread both historyOrders and orders, dedupe by String(backendId)
   b. handleDatePrint: replace buildDatePrintHtml with buildPrintHtml
   c. PaymentsView: add password-protected Clear All button with local state for password dialog
   d. ManageScreen: add password state; wrap deletePharmacy and deleteMedicine with password check dialog
   e. ManageScreen tab label: "Pharmacies" → "Customers"
   f. ManageScreen Customers tab: add full customer form (Name, Type, Contact, Address, Area, Group, Code, Dealer Code, NTN#, CNIC#, PMDC#) using same handleAddCustomer logic moved/shared, show customer list below
   g. Sidebar: remove Add Customer button
