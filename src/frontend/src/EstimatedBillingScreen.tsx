import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PoolItem {
  medicineId: string;
  medicineName: string;
  qty: number;
  companyDiscount: number;
  distributionDiscount: number;
  netRate?: number;
  unitPrice: number;
  total: number;
  bonusQty?: number;
}

interface PoolEntry {
  id: string;
  orderId?: string;
  staffName: string;
  pharmacyId: string;
  pharmacyName: string;
  timestamp: number;
  items: PoolItem[];
}

interface MedicineInfo {
  id: string;
  name: string;
  backendId: bigint;
  [key: string]: unknown;
}

interface PharmacyInfo {
  id: bigint;
  name: string;
  location: string;
}

interface OrderRow {
  _key: string;
  medicineId: string;
  medicineName: string;
  medicineBackendId: bigint;
  qty: string;
  bonus: string;
  dist: string;
  co: string;
  netRate: string;
}

interface EstimatedBillingScreenProps {
  allMedicines: MedicineInfo[];
  allPharmacies: PharmacyInfo[];
  allOrders?: any[];
  actor?: any;
  distributorId?: bigint | null;
}

function getStock(backendId: bigint): number {
  const raw = localStorage.getItem(`medorder_stock_${backendId}`);
  return raw !== null ? Number.parseFloat(raw) : 0;
}

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_ROW = (): OrderRow => ({
  _key: Date.now().toString() + Math.random(),
  medicineId: "",
  medicineName: "",
  medicineBackendId: BigInt(0),
  qty: "",
  bonus: "",
  dist: "",
  co: "",
  netRate: "",
});

export default function EstimatedBillingScreen({
  allMedicines,
  allPharmacies,
  allOrders,
  actor,
  distributorId,
}: EstimatedBillingScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // ── Dispensed version counter to force pool re-derive after order submit ──
  const [dispensedVersion, setDispensedVersion] = useState(0);

  // ── Pool ─────────────────────────────────────────────────────────────────────
  const [pool, setPool] = useState<PoolEntry[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispensedVersion is used as a cache-bust trigger
  useEffect(() => {
    if (allOrders && allOrders.length > 0) {
      const derivedPool: PoolEntry[] = allOrders
        .filter(
          (o: any) =>
            o.items?.some((i: any) => (i.companyDiscount ?? 0) > 0) &&
            (o.staffName ?? o.bookerName ?? "") !== "EstimatedBilling",
        )
        .map((o: any) => ({
          id: String(o.id),
          orderId: String(o.id),
          staffName: o.staffName ?? "",
          pharmacyId: String(o.pharmacyId ?? ""),
          pharmacyName: o.pharmacyName ?? "",
          timestamp:
            typeof o.timestamp === "bigint"
              ? Number(o.timestamp) / 1_000_000
              : (o.timestamp ?? Date.now()),
          items: (o.items ?? [])
            .filter((i: any) => (i.companyDiscount ?? 0) > 0)
            .map((i: any) => ({
              medicineId: String(i.medicineId ?? i.medicine?.id ?? ""),
              medicineName: i.medicineName ?? i.medicine?.name ?? "",
              qty: Number(i.qty ?? 0),
              companyDiscount: Number(i.companyDiscount ?? 0),
              distributionDiscount: Number(i.distributionDiscount ?? 0),
              netRate: i.manualNetRate ?? i.netRate,
              unitPrice: Number(i.unitPrice ?? i.medicine?.price ?? 0),
              total: Number(i.total ?? 0),
              bonusQty: Number(i.bonusQty ?? 0),
            })),
        }));

      // Apply dispensed subtractions
      try {
        const dispensedRaw = localStorage.getItem("estimatedBilling_dispensed");
        const dispensed: { medicineName: string; qty: number }[] = dispensedRaw
          ? JSON.parse(dispensedRaw)
          : [];
        for (const entry of derivedPool) {
          for (const item of entry.items) {
            const totalDispensed = dispensed
              .filter(
                (d) =>
                  d.medicineName.toLowerCase() ===
                  item.medicineName.toLowerCase(),
              )
              .reduce((sum, d) => sum + d.qty, 0);
            item.qty = Math.max(0, item.qty - totalDispensed);
          }
          entry.items = entry.items.filter((item) => item.qty > 0);
        }
      } catch {}

      const finalPool = derivedPool.filter((entry) => entry.items.length > 0);
      setPool(finalPool);
    } else {
      try {
        const raw = localStorage.getItem("estimatedOrders_pool");
        setPool(raw ? JSON.parse(raw) : []);
      } catch {
        setPool([]);
      }
    }
  }, [allOrders, dispensedVersion]);

  // ── Filtered & aggregated data ────────────────────────────────────────────────
  const coDiscountEntries = useMemo(
    () =>
      pool
        .map((entry) => ({
          ...entry,
          items: entry.items.filter((it) => it.companyDiscount > 0),
        }))
        .filter((entry) => entry.items.length > 0),
    [pool],
  );

  const productRows = useMemo(() => {
    const map: Record<
      string,
      {
        medicineName: string;
        bookedQty: number;
        entries: { entry: PoolEntry; item: PoolItem }[];
      }
    > = {};
    for (const entry of coDiscountEntries) {
      for (const item of entry.items) {
        const key = item.medicineName.toLowerCase();
        if (!map[key]) {
          map[key] = {
            medicineName: item.medicineName,
            bookedQty: 0,
            entries: [],
          };
        }
        map[key].bookedQty += item.qty;
        map[key].entries.push({ entry, item });
      }
    }
    return Object.values(map).map((row) => {
      const medicine = allMedicines.find(
        (m) => m.name.toLowerCase() === row.medicineName.toLowerCase(),
      );
      const realInventory = medicine ? getStock(medicine.backendId) : 0;
      const actualInventory = realInventory - row.bookedQty;
      return { ...row, realInventory, actualInventory };
    });
  }, [coDiscountEntries, allMedicines]);

  // Helper: booked qty remaining in pool for a medicine name
  function getAvailableQty(medicineName: string): number {
    let total = 0;
    for (const entry of pool) {
      for (const item of entry.items) {
        if (item.medicineName.toLowerCase() === medicineName.toLowerCase()) {
          total += item.qty;
        }
      }
    }
    return total;
  }

  // Selected product orders for dialog
  const productOrders = useMemo(() => {
    if (!selectedProduct) return [];
    return coDiscountEntries
      .map((entry) => ({
        ...entry,
        items: entry.items.filter(
          (it) =>
            it.medicineName.toLowerCase() === selectedProduct.toLowerCase(),
        ),
      }))
      .filter((e) => e.items.length > 0);
  }, [coDiscountEntries, selectedProduct]);

  // ── Add Order tab state ───────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: bigint;
    name: string;
  } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [orderRows, setOrderRows] = useState<OrderRow[]>([EMPTY_ROW()]);
  const [medSearches, setMedSearches] = useState<Record<string, string>>({});
  const [medDropdownOpen, setMedDropdownOpen] = useState<
    Record<string, boolean>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return allPharmacies.filter((p) => p.name.toLowerCase().includes(q));
  }, [allPharmacies, customerSearch]);

  function updateRow(
    key: string,
    field: keyof OrderRow,
    value: string | bigint,
  ) {
    setOrderRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)),
    );
  }

  function addRow() {
    setOrderRows((prev) => [...prev, EMPTY_ROW()]);
  }

  function removeRow(key: string) {
    setOrderRows((prev) => prev.filter((r) => r._key !== key));
  }

  async function handleSubmitOrder() {
    if (!actor || !selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    const validRows = orderRows.filter(
      (r) => r.medicineName && Number(r.qty) > 0,
    );
    if (validRows.length === 0) {
      toast.error("Please add at least one medicine with quantity");
      return;
    }
    setIsSubmitting(true);
    try {
      const orderLines = validRows.map((row) => ({
        medicineId: row.medicineBackendId,
        quantity: Number.parseFloat(String(row.qty)) || 0,
        bonusQty: BigInt(Math.round(Number.parseFloat(row.bonus) || 0)),
        discountPercent: BigInt(0),
        distributionDiscount: BigInt(
          Math.round((Number.parseFloat(row.dist) || 0) * 10),
        ),
        companyDiscount: BigInt(
          Math.round((Number.parseFloat(row.co) || 0) * 10),
        ),
        netRate: BigInt(
          Math.round((Number.parseFloat(row.netRate) || 0) * 100),
        ),
      }));

      if (distributorId) {
        await actor.createOrderForDistributor(
          distributorId,
          selectedCustomer.id,
          orderLines,
          "Admin",
          "EstimatedBilling",
          "",
        );
      } else {
        await actor.createOrder(
          selectedCustomer.id,
          orderLines,
          "Admin",
          "EstimatedBilling",
          "",
        );
      }

      // Track dispensed quantities so pool subtracts correctly
      try {
        const dispensedRaw = localStorage.getItem("estimatedBilling_dispensed");
        const dispensed: { medicineName: string; qty: number }[] = dispensedRaw
          ? JSON.parse(dispensedRaw)
          : [];
        for (const row of validRows) {
          dispensed.push({
            medicineName: row.medicineName,
            qty: Number(row.qty),
          });
        }
        localStorage.setItem(
          "estimatedBilling_dispensed",
          JSON.stringify(dispensed),
        );
      } catch {}

      // Also update legacy pool in localStorage
      try {
        const poolRaw = localStorage.getItem("estimatedOrders_pool");
        const localPool = poolRaw ? JSON.parse(poolRaw) : [];
        for (const row of validRows) {
          let remaining = Number(row.qty);
          for (const entry of localPool) {
            for (const item of entry.items) {
              if (item.medicineName === row.medicineName && remaining > 0) {
                const deduct = Math.min(item.qty, remaining);
                item.qty -= deduct;
                remaining -= deduct;
              }
            }
          }
        }
        localStorage.setItem("estimatedOrders_pool", JSON.stringify(localPool));
      } catch {}

      // Trigger pool re-derive
      setDispensedVersion((v) => v + 1);

      toast.success("Order added successfully!");
      setSelectedCustomer(null);
      setCustomerSearch("");
      setOrderRows([EMPTY_ROW()]);
      setMedSearches({});
    } catch (e) {
      toast.error(
        `Failed to add order: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Estimated Billing | اندازہ بلنگ
          </h1>
          <p className="text-sm text-gray-500">
            Company discount orders pool | کمپنی ڈسکاؤنٹ آرڈرز
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="w-full mb-4 bg-blue-50">
          <TabsTrigger
            value="products"
            className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            data-ocid="estimated.products.tab"
          >
            <Package size={14} className="mr-1.5" />
            Products | مصنوعات
          </TabsTrigger>
          <TabsTrigger
            value="add-order"
            className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            data-ocid="estimated.add_order.tab"
          >
            <ShoppingCart size={14} className="mr-1.5" />
            Add Order | آرڈر شامل کریں
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Products */}
        <TabsContent value="products">
          {productRows.length === 0 ? (
            <div
              className="text-center py-16 text-gray-400"
              data-ocid="estimated.products.empty_state"
            >
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No estimated orders yet | ابھی کوئی اندازہ آرڈر نہیں
              </p>
              <p className="text-xs mt-1">
                Orders with Co% will appear here | Co% والے آرڈر یہاں آئیں گے
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 overflow-hidden">
              <Table data-ocid="estimated.products.table">
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="font-semibold text-blue-800">
                      Product | مصنوعات
                    </TableHead>
                    <TableHead className="font-semibold text-blue-800 text-right">
                      Booked Qty | بک شدہ مقدار
                    </TableHead>
                    <TableHead className="font-semibold text-blue-800 text-right">
                      Real Stock | اصل اسٹاک
                    </TableHead>
                    <TableHead className="font-semibold text-blue-800 text-right">
                      Actual Stock | درست اسٹاک
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.map((row, idx) => (
                    <TableRow
                      key={row.medicineName}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                      onClick={() => setSelectedProduct(row.medicineName)}
                      data-ocid={`estimated.products.row.${idx + 1}`}
                    >
                      <TableCell className="font-medium text-gray-900">
                        {row.medicineName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700"
                        >
                          {row.bookedQty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {row.realInventory}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            row.actualInventory < 0
                              ? "text-red-600"
                              : row.actualInventory < 10
                                ? "text-amber-600"
                                : "text-green-600"
                          }`}
                        >
                          {row.actualInventory}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Add Order */}
        <TabsContent value="add-order">
          <div className="space-y-5">
            {/* Customer selector */}
            <div className="bg-white rounded-xl border border-blue-100 p-4">
              <p className="block text-sm font-semibold text-gray-700 mb-2">
                Customer | کسٹمر <span className="text-red-500">*</span>
              </p>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search customer | کسٹمر تلاش کریں"
                  value={
                    selectedCustomer ? selectedCustomer.name : customerSearch
                  }
                  onChange={(e) => {
                    setSelectedCustomer(null);
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-9 pr-4 py-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  data-ocid="estimated.add_order.search_input"
                />
                {selectedCustomer && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
                {showCustomerDropdown &&
                  !selectedCustomer &&
                  filteredCustomers.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map((p) => (
                        <button
                          key={String(p.id)}
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setSelectedCustomer({ id: p.id, name: p.name });
                            setCustomerSearch("");
                            setShowCustomerDropdown(false);
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              {selectedCustomer && (
                <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 text-sm font-medium">
                  {selectedCustomer.name}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Medicine rows */}
            <div className="space-y-3">
              {orderRows.map((row, idx) => {
                const availQty = row.medicineName
                  ? getAvailableQty(row.medicineName)
                  : 0;
                const medSearch = medSearches[row._key] ?? "";
                const filteredMeds = allMedicines.filter((m) =>
                  m.name
                    .toLowerCase()
                    .includes((row.medicineName || medSearch).toLowerCase()),
                );
                return (
                  <div
                    key={row._key}
                    className="bg-white rounded-xl border border-blue-100 p-4"
                    data-ocid={`estimated.add_order.item.${idx + 1}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-600">
                        Medicine {idx + 1}
                      </span>
                      {orderRows.length > 1 && (
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-600 p-1"
                          onClick={() => removeRow(row._key)}
                          data-ocid={`estimated.add_order.delete_button.${idx + 1}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Medicine search */}
                    <div className="relative mb-3">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Search medicine | دوائی تلاش کریں"
                        value={row.medicineName || medSearch}
                        onChange={(e) => {
                          updateRow(row._key, "medicineName", "");
                          updateRow(row._key, "medicineBackendId", BigInt(0));
                          setMedSearches((prev) => ({
                            ...prev,
                            [row._key]: e.target.value,
                          }));
                          setMedDropdownOpen((prev) => ({
                            ...prev,
                            [row._key]: true,
                          }));
                        }}
                        onFocus={() =>
                          setMedDropdownOpen((prev) => ({
                            ...prev,
                            [row._key]: true,
                          }))
                        }
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      {medDropdownOpen[row._key] && !row.medicineName && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {filteredMeds.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-400">
                              No medicines found
                            </div>
                          ) : (
                            filteredMeds.slice(0, 20).map((m) => {
                              const avail = getAvailableQty(m.name);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 flex justify-between"
                                  onClick={() => {
                                    updateRow(row._key, "medicineName", m.name);
                                    updateRow(
                                      row._key,
                                      "medicineBackendId",
                                      m.backendId,
                                    );
                                    setMedSearches((prev) => ({
                                      ...prev,
                                      [row._key]: "",
                                    }));
                                    setMedDropdownOpen((prev) => ({
                                      ...prev,
                                      [row._key]: false,
                                    }));
                                  }}
                                >
                                  <span>{m.name}</span>
                                  {avail > 0 && (
                                    <span className="text-xs text-blue-500 ml-2">
                                      ({avail} available)
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {row.medicineName && availQty > 0 && (
                      <p className="text-xs text-blue-600 mb-2">
                        Pool: {availQty} available | دستیاب: {availQty}
                      </p>
                    )}

                    {/* Fields grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Qty *</p>
                        <input
                          type="number"
                          min="1"
                          max={availQty > 0 ? availQty : undefined}
                          placeholder="0"
                          value={row.qty}
                          onChange={(e) =>
                            updateRow(row._key, "qty", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bonus</p>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.bonus}
                          onChange={(e) =>
                            updateRow(row._key, "bonus", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Dist%</p>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.dist}
                          onChange={(e) =>
                            updateRow(row._key, "dist", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Co%</p>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.co}
                          onChange={(e) =>
                            updateRow(row._key, "co", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Net Rate</p>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={row.netRate}
                          onChange={(e) =>
                            updateRow(row._key, "netRate", e.target.value)
                          }
                          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                onClick={addRow}
                data-ocid="estimated.add_order.button"
              >
                <Plus size={14} className="mr-1.5" />
                Add Medicine | دوائی شامل کریں
              </Button>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              onClick={handleSubmitOrder}
              disabled={isSubmitting || !selectedCustomer}
              data-ocid="estimated.add_order.submit_button"
            >
              {isSubmitting
                ? "Adding Order..."
                : "Submit Order | آرڈر جمع کریں"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Detail Dialog */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(o) => !o && setSelectedProduct(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-800">
              {selectedProduct} — Orders | آرڈرز
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {productOrders.map((entry, ei) =>
              entry.items.map((item, ii) => (
                <div
                  key={`${entry.id}-${ii}`}
                  className="rounded-lg border border-blue-100 bg-blue-50 p-3"
                  data-ocid={`estimated.product.detail.item.${ei + 1}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {entry.pharmacyName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Staff: {entry.staffName} | Order:{" "}
                    {entry.orderId ?? entry.id}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white rounded p-1.5">
                      <p className="text-gray-400">Qty</p>
                      <p className="font-semibold text-gray-900">{item.qty}</p>
                    </div>
                    <div className="bg-white rounded p-1.5">
                      <p className="text-gray-400">Co%</p>
                      <p className="font-semibold text-amber-700">
                        {(item.companyDiscount / 10).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white rounded p-1.5">
                      <p className="text-gray-400">Dist%</p>
                      <p className="font-semibold text-blue-700">
                        {(item.distributionDiscount / 10).toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-white rounded p-1.5">
                      <p className="text-gray-400">Amount</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  </div>
                  {item.netRate && (
                    <p className="text-xs text-purple-600 mt-1">
                      Net Rate: {formatCurrency(item.netRate)}
                    </p>
                  )}
                </div>
              )),
            )}
          </div>
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              onClick={() => setSelectedProduct(null)}
              data-ocid="estimated.product.detail.close_button"
            >
              <X size={14} className="mr-1.5" /> Close | بند کریں
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
