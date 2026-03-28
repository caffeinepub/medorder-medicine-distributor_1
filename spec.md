# MedFlow

## Current State
Customer Wise Sale section has:
- Single customer search (single select, basic text search)
- Date range filter (from/to)
- 5 report tabs (Customer Wise, Company Wise, Product Wise, Month Wise, Group Wise)
- Filter only applies customer filter to `allOrdersForReport`
- State vars: `cwsSelectedCustomer`, `cwsSelectedPharmacy`, `cwsCustomerSearch`, `cwsCustomerDropdownOpen`, `cwsDateFrom`, `cwsDateTo`

## Requested Changes (Diff)

### Add
- Multi-select searchable **Customer** filter: shows all customers from `allCustomers` array, user can select 0+ customers
- Multi-select searchable **Company** filter: auto-extracts unique companies from `allMedicines`, user can select 0+
- Multi-select searchable **Medicine/Product** filter: all medicines from `allMedicines`, user can select 0+
- Multi-select searchable **Group** filter: all groups from `allMedicineGroups`, user can select 0+
- "Clear All Filters" button to reset all 4 filters
- New state vars for multi-select: `cwsSelectedCustomers: Customer[]`, `cwsSelectedCompanies: string[]`, `cwsSelectedMedicines: string[]`, `cwsSelectedGroups: string[]`
- Dropdown open state for each: `cwsCompanyDropdownOpen`, `cwsMedicineDropdownOpen`, `cwsGroupDropdownOpen`
- Search text state for each: `cwsCompanySearch`, `cwsMedicineSearch`, `cwsGroupSearch`

### Modify
- Filter logic in `allOrdersForReport` to apply ALL 4 filters with AND logic:
  - If `cwsSelectedCustomers.length > 0`: order.pharmacyName must match one of selected customers
  - If `cwsSelectedCompanies.length > 0`: order must have at least one item whose medicine company matches
  - If `cwsSelectedMedicines.length > 0`: order must have at least one item whose medicineName matches
  - If `cwsSelectedGroups.length > 0`: order must have at least one item whose medicine group matches
- When company/medicine/group filters active, also filter individual `items` within each order (not just order-level)
- The filter UI section: replace single customer search with 4 multi-select fields in a 2x2 or responsive grid
- Remove old single-select state (`cwsSelectedCustomer`, `cwsSelectedPharmacy`, `cwsCustomerSearch`, `cwsCustomerDropdownOpen`) and replace with multi-select equivalents

### Remove
- Old single-select customer search/dropdown UI
- Old `cwsSelectedCustomer`, `cwsSelectedPharmacy`, `cwsCustomerSearch`, `cwsCustomerDropdownOpen` state usage

## Implementation Plan
1. Add 4 new multi-select state arrays + search text + dropdown open states (near line 9608)
2. Replace filter UI section (around line 12880-12980) with new 2x2 grid of 4 multi-select searchable fields + Clear Filters button
3. Each multi-select field shows selected chips, input for search, dropdown list with checkboxes
4. Update `allOrdersForReport` filter logic (around line 13020) to apply all 4 filters with AND
5. When company/medicine/group filters are active, filter items per order too (so rows only show matching items)
6. Remove old single-select state and references
