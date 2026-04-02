# MedFlow

## Current State

- App is a multi-tenant Medicine Distributor Order Management App
- Manage > Groups tab exists but only has a simple text field for group name -- no Company or Medicines fields
- Group type in backend is `{ id: bigint; name: string; distributorId: bigint }` -- no company/medicines stored in group
- DailySaleStatement component exists at ~line 7240 in App.tsx with date range filter and company/area/quarter/deal/bonus tabs -- but NO filter bar for Customer, Company, Product, Group, or Area
- CustomerWiseSale section exists with multi-select filters for Customer, Company, Product, Group, Date Range -- AND logic, item-level filtering
- PWA icons are in `/assets/generated/` nested paths -- ICP does not reliably serve nested paths for PWA manifest, causing grey "C" icon and no Install button
- Service Worker cache name is `medflow-v5`
- manifest.json icons point to `/assets/generated/medflow-icon-192.dim_192x192.png` etc.
- Icon files have been physically copied to public root as `icon-192.png` and `icon-512.png`

## Requested Changes (Diff)

### Add

1. **PWA Icon Fix**: Update manifest.json to point icons to root paths `/icon-192.png` and `/icon-512.png`. Bump SW cache to `medflow-v6` to force browser to fetch fresh files.

2. **Manage > Groups -- Enhanced Form**: Add Company (searchable dropdown from allMedicines companies) and Medicines (searchable multi-select filtered by selected company) fields to the group form. Group save must store `company: string` and `medicines: string[]` alongside the name. Since backend Group type only has `{ id, name, distributorId }`, store company+medicines in localStorage key `medflow_group_details_{distributorId}` keyed by group id. On load, merge backend groups with localStorage details.

3. **DSS Filter Bar**: Add filter bar to DailySaleStatement component above the existing date controls with these multi-select searchable filters: Customer, Company, Product, Group, Area -- same UI pattern as CWS filters. Filters use AND logic at item level. Default = no filters = show all.

4. **DSS Area Wise Filter**: Area dropdown auto-populated from customers/pharmacies area fields in allOrders. When area(s) selected, only orders from customers in those areas show. Works in combination with other filters.

5. **DSS Group Wise Tab**: Add "Group" tab alongside existing company/area/quarter/deal/bonus tabs. Shows each group's total sale: group name, medicines in group, total qty sold, total value. Expandable to show per-medicine breakdown.

6. **DSS Filtered PDF Download**: "Download PDF" button generates PDF of currently filtered+tabbed data only (not all data). Reuses existing print HTML logic but applies active filters before building HTML.

### Modify

- `src/frontend/public/manifest.json` -- update icon src paths to `/icon-192.png` and `/icon-512.png` (root)
- `src/frontend/public/sw.js` -- bump CACHE_NAME from `medflow-v5` to `medflow-v6`
- `GroupManagementPanel` in `App.tsx` -- add Company + Medicines fields, store extended data in localStorage, edit mode for existing groups
- `DailySaleStatement` in `App.tsx` -- add filter bar (Customer, Company, Product, Group, Area) + Group tab + filtered PDF
- `DailySaleStatementProps` -- add `allCustomers`, `allMedicineGroups`, `allPharmacies` props so DSS can build filter dropdowns
- Where `DailySaleStatement` is rendered (~line 12944) -- pass the new props

### Remove

- Nothing removed

## Implementation Plan

1. **manifest.json**: Change all icon `src` values to `/icon-192.png` (192x192) and `/icon-512.png` (512x512) for both `any` and `maskable` purpose entries. Also update shortcuts icons.

2. **sw.js**: Change `const CACHE_NAME = 'medflow-v5'` to `'medflow-v6'`.

3. **GroupManagementPanel**:
   - Add props: `allMedicines: Medicine[]`
   - Add state: `newGroupCompany`, `newGroupMedicines[]`, company search, medicine search, dropdown open states
   - Company dropdown: unique companies from allMedicines, searchable
   - Medicines multi-select: filtered by selected company, searchable, chips display
   - On save: call `actor.addMedicineGroup(name, distributorId)` then save `{ company, medicines }` to localStorage under `medflow_group_details_{distributorId}[groupId]`
   - Edit mode: clicking edit on existing group loads all fields including company+medicines from localStorage
   - On delete: also remove from localStorage details
   - Display existing groups with company + medicines count info
   - Pass `allMedicines` from parent where GroupManagementPanel is rendered

4. **DailySaleStatement**:
   - Add props: `allCustomers: Customer[]`, `allMedicineGroups: Array<{id,name,distributorId}>`, `allPharmacies: Array<{id,name,location,area?}>`
   - Add filter state: `dssSelectedCustomers[]`, `dssSelectedCompanies[]`, `dssSelectedProducts[]`, `dssSelectedGroups[]`, `dssSelectedAreas[]` -- all multi-select
   - Add filter bar UI: same pattern as CWS filters (searchable multi-select chips)
   - Customer filter: from allCustomers + allPharmacies merged
   - Area filter: unique areas from allOrders pharmacyArea field
   - Apply filters to `filteredOrders` useMemo -- AND logic at item level
   - Add "group" tab to saleTab state: `"all" | "deal" | "bonus" | "group"`
   - Group tab UI: list groups, for each group show medicines in that group, sum qty and value from filtered orders
   - Group details from localStorage `medflow_group_details_{distributorId}` -- need distributorId prop OR read from localStorage session
   - PDF button: uses existing `wrapPrintHtml`/`buildCompanyPrintHtml` but only with filtered data

5. **DailySaleStatement render site**: Pass `allCustomers`, `allMedicineGroups`, `allPharmacies` props.

6. **Testing**: Ensure no TypeScript errors, all existing tabs still work, filters default to "show all" when nothing selected.
