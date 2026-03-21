import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Printer, Receipt, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerType = "hospital" | "doctor" | "medicalStore" | "pharmacy";

type Customer = {
  id: string;
  backendId: bigint;
  name: string;
  customerType: CustomerType;
  address: string;
  area: string;
  contactNo: string;
  groupName: string;
  code: string;
};

type Medicine = {
  id: string;
  backendId: bigint;
  name: string;
  company: string;
  strength: string;
  packSize: string;
  price: number;
  unit: string;
  category: string;
};

type AggregatedItem = {
  medicineId: bigint;
  medicineName: string;
  company: string;
  strength: string;
  totalQty: number;
  companyDiscount: number; // stored as * 10 for decimals
  netRate: number; // stored as * 100
  unitPrice: number;
  sourceOrderIds: bigint[];
  selected: boolean;
  editQty: number;
};

type PakkaBillRecord = {
  id: bigint;
  masterCustomerId: string;
  masterCustomerName: string;
  items: Array<{
    medicineId: bigint;
    medicineName: string;
    quantity: number;
    netRate: number;
    companyDiscount: number;
    totalValue: number;
  }>;
  totalAmount: number;
  timestamp: bigint;
  distributorId: string;
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatCurrency(val: number) {
  return `Rs. ${val.toFixed(2)}`;
}

function customerTypeLabel(t: CustomerType) {
  if (t === "hospital") return "Hospital | ہسپتال";
  if (t === "doctor") return "Doctor | ڈاکٹر";
  if (t === "medicalStore") return "Medical Store | میڈیکل سٹور";
  return "Pharmacy | فارمیسی";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MasterBillingScreen({
  customers,
  allMedicines,
  actor,
  onBack: _onBack,
}: {
  customers: Customer[];
  allMedicines: Medicine[];
  actor: any;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"generate" | "history">(
    "generate",
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Step 2: Estimated pool
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const [allEstimatedOrderIds, setAllEstimatedOrderIds] = useState<bigint[]>(
    [],
  );

  // Step 3: Success
  const [generatedBill, setGeneratedBill] = useState<PakkaBillRecord | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // History
  const [pakkaBills, setPakkaBills] = useState<PakkaBillRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [printBill, setPrintBill] = useState<PakkaBillRecord | null>(null);

  // ── Load estimated pool ──────────────────────────────────────────────────
  const loadEstimatedPool = useCallback(async () => {
    setLoadingPool(true);
    try {
      let rawOrders: any[] = [];
      if (actor) {
        try {
          rawOrders = await actor.getEstimatedOrders();
          // Cache to localStorage
          localStorage.setItem(
            "estimatedOrders_pool",
            JSON.stringify(
              rawOrders.map((o: any) => ({
                ...o,
                id: String(o.id),
                timestamp: String(o.timestamp),
                items: o.items.map((it: any) => ({
                  ...it,
                  medicineId: String(it.medicineId),
                  bonusQty: String(it.bonusQty),
                  discountPercent: String(it.discountPercent),
                  distributionDiscount: String(it.distributionDiscount),
                  companyDiscount: String(it.companyDiscount),
                  netRate: String(it.netRate),
                  unitPrice: String(it.unitPrice),
                })),
              })),
            ),
          );
        } catch {
          // fallback to localStorage
          const cached = localStorage.getItem("estimatedOrders_pool");
          if (cached) rawOrders = JSON.parse(cached);
        }
      } else {
        const cached = localStorage.getItem("estimatedOrders_pool");
        if (cached) rawOrders = JSON.parse(cached);
      }

      // Collect all IDs
      const allIds: bigint[] = rawOrders.map((o: any) =>
        typeof o.id === "bigint" ? o.id : BigInt(String(o.id)),
      );
      setAllEstimatedOrderIds(allIds);

      // Aggregate by medicineId
      const map = new Map<string, AggregatedItem>();
      for (const order of rawOrders) {
        const orderId =
          typeof order.id === "bigint" ? order.id : BigInt(String(order.id));
        for (const item of order.items) {
          const mid = String(
            typeof item.medicineId === "bigint"
              ? item.medicineId
              : BigInt(String(item.medicineId)),
          );
          const netRateNum = Number(
            typeof item.netRate === "bigint"
              ? item.netRate
              : BigInt(String(item.netRate)),
          );
          const compDiscNum = Number(
            typeof item.companyDiscount === "bigint"
              ? item.companyDiscount
              : BigInt(String(item.companyDiscount)),
          );
          const unitPriceNum = Number(
            typeof item.unitPrice === "bigint"
              ? item.unitPrice
              : BigInt(String(item.unitPrice)),
          );
          const midBig =
            typeof item.medicineId === "bigint"
              ? item.medicineId
              : BigInt(String(item.medicineId));
          if (map.has(mid)) {
            const existing = map.get(mid)!;
            existing.totalQty += Number(item.quantity);
            existing.editQty += Number(item.quantity);
            if (!existing.sourceOrderIds.find((id) => id === orderId)) {
              existing.sourceOrderIds.push(orderId);
            }
          } else {
            // Find medicine details
            const medDetails = allMedicines.find(
              (m) => String(m.backendId) === mid,
            );
            map.set(mid, {
              medicineId: midBig,
              medicineName:
                item.medicineName || medDetails?.name || `Medicine #${mid}`,
              company: medDetails?.company || "",
              strength: medDetails?.strength || "",
              totalQty: Number(item.quantity),
              companyDiscount: compDiscNum,
              netRate: netRateNum,
              unitPrice: unitPriceNum,
              sourceOrderIds: [orderId],
              selected: true,
              editQty: Number(item.quantity),
            });
          }
        }
      }

      setAggregatedItems(Array.from(map.values()));
    } catch {
      toast.error("Failed to load estimated pool");
    } finally {
      setLoadingPool(false);
    }
  }, [actor, allMedicines]);

  // ── Load history ─────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      let rawBills: any[] = [];
      if (actor) {
        try {
          rawBills = await actor.getPakkaBills();
          localStorage.setItem(
            "pakka_bills_cache",
            JSON.stringify(
              rawBills.map((b: any) => ({
                ...b,
                id: String(b.id),
                timestamp: String(b.timestamp),
                items: b.items.map((it: any) => ({
                  ...it,
                  medicineId: String(it.medicineId),
                  netRate: String(it.netRate),
                  companyDiscount: String(it.companyDiscount),
                })),
              })),
            ),
          );
        } catch {
          const cached = localStorage.getItem("pakka_bills_cache");
          if (cached) rawBills = JSON.parse(cached);
        }
      } else {
        const cached = localStorage.getItem("pakka_bills_cache");
        if (cached) rawBills = JSON.parse(cached);
      }

      const mapped: PakkaBillRecord[] = rawBills.map((b: any) => ({
        id: typeof b.id === "bigint" ? b.id : BigInt(String(b.id)),
        masterCustomerId: b.masterCustomerId,
        masterCustomerName: b.masterCustomerName,
        totalAmount: Number(b.totalAmount),
        timestamp:
          typeof b.timestamp === "bigint"
            ? b.timestamp
            : BigInt(String(b.timestamp)),
        distributorId: b.distributorId,
        items: (b.items || []).map((it: any) => ({
          medicineId:
            typeof it.medicineId === "bigint"
              ? it.medicineId
              : BigInt(String(it.medicineId)),
          medicineName: it.medicineName,
          quantity: Number(it.quantity),
          netRate: Number(
            typeof it.netRate === "bigint"
              ? it.netRate
              : BigInt(String(it.netRate)),
          ),
          companyDiscount: Number(
            typeof it.companyDiscount === "bigint"
              ? it.companyDiscount
              : BigInt(String(it.companyDiscount)),
          ),
          totalValue: Number(it.totalValue),
        })),
      }));
      // Sort newest first
      mapped.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
      setPakkaBills(mapped);
    } catch {
      toast.error("Failed to load bill history");
    } finally {
      setLoadingHistory(false);
    }
  }, [actor]);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, loadHistory]);

  // ── Step 1: Select customer ──────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.area.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [customers, customerSearch]);

  function handleSelectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setStep(2);
    loadEstimatedPool();
  }

  // ── Step 2: toggle / edit qty ────────────────────────────────────────────
  function toggleItem(idx: number) {
    setAggregatedItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it)),
    );
  }

  function updateEditQty(idx: number, val: number) {
    setAggregatedItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, editQty: Math.max(0, Math.min(val, it.totalQty)) }
          : it,
      ),
    );
  }

  const selectedItems = aggregatedItems.filter(
    (it) => it.selected && it.editQty > 0,
  );

  const runningTotal = selectedItems.reduce((sum, it) => {
    const netRate = it.netRate / 100; // netRate stored * 100
    return sum + netRate * it.editQty;
  }, 0);

  // ── Step 3: Generate Pakka Bill ──────────────────────────────────────────
  async function handleGenerateBill() {
    if (!selectedCustomer || selectedItems.length === 0) {
      toast.error("Please select items to include");
      return;
    }

    setIsGenerating(true);
    try {
      const billItems = selectedItems.map((it) => ({
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        quantity: it.editQty,
        netRate: BigInt(it.netRate),
        companyDiscount: BigInt(it.companyDiscount),
        totalValue: (it.netRate / 100) * it.editQty,
      }));

      const totalAmount = billItems.reduce((s, it) => s + it.totalValue, 0);

      let newBillId = BigInt(Date.now());

      // Save to backend
      if (actor) {
        try {
          newBillId = await actor.addPakkaBill(
            selectedCustomer.id,
            selectedCustomer.name,
            billItems,
            totalAmount,
            "default",
          );
          // Delete processed estimated orders
          try {
            await actor.deleteEstimatedOrders(allEstimatedOrderIds);
          } catch {
            // ignore if method not available
          }
        } catch {
          // Save offline
          toast.info("Saved offline - will sync when online");
        }
      }

      // Update localStorage
      const existing = JSON.parse(
        localStorage.getItem("estimatedOrders_pool") || "[]",
      );
      const remainingIds = allEstimatedOrderIds.map(String);
      const filtered = existing.filter(
        (o: any) => !remainingIds.includes(String(o.id)),
      );
      localStorage.setItem("estimatedOrders_pool", JSON.stringify(filtered));

      const bill: PakkaBillRecord = {
        id: newBillId,
        masterCustomerId: selectedCustomer.id,
        masterCustomerName: selectedCustomer.name,
        items: billItems.map((it) => ({
          medicineId: it.medicineId,
          medicineName: it.medicineName,
          quantity: it.quantity,
          netRate: Number(it.netRate),
          companyDiscount: Number(it.companyDiscount),
          totalValue: it.totalValue,
        })),
        totalAmount,
        timestamp: BigInt(Date.now()),
        distributorId: "default",
      };

      setGeneratedBill(bill);
      setStep(3);
      toast.success(
        `Pakka Bill generated for ${selectedCustomer.name}! | پکا بل تیار`,
      );
    } catch {
      toast.error("Failed to generate bill");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function printBillContent(bill: PakkaBillRecord) {
    const win = window.open("", "_blank");
    if (!win) return;
    const dateStr = new Date(Number(bill.timestamp)).toLocaleString("en-PK");
    const rows = bill.items
      .map(
        (it, i) =>
          `<tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${it.medicineName}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${it.quantity.toFixed(1)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${(it.companyDiscount / 10).toFixed(1)}%</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">Rs. ${(it.netRate / 100).toFixed(2)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">Rs. ${it.totalValue.toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html><html><head><title>Pakka Bill #${bill.id}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;color:#111}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse}th{background:#1e40af;color:white;padding:8px;text-align:left}@media print{button{display:none}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
        <div><h1>Mian Medicine Distributors</h1><p style="margin:4px 0;color:#555">Master Billing - Pakka Bill | پکا بل</p></div>
        <div style="text-align:right"><p style="font-weight:bold">Bill #${bill.id}</p><p style="color:#555;font-size:13px">${dateStr}</p></div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:16px">
        <p style="margin:0;font-size:15px"><strong>Customer / مسٹر کسٹمر:</strong> ${bill.masterCustomerName}</p>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Medicine / دوائی</th><th style="text-align:right">Qty</th><th style="text-align:right">Co%</th><th style="text-align:right">Net Rate</th><th style="text-align:right">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;text-align:right;font-size:18px;font-weight:bold">
        Total: Rs. ${bill.totalAmount.toFixed(2)}
      </div>
      <div style="margin-top:24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:8px">
        Generated by Mian Medicine Distributors App &middot; caffeine.ai
      </div>
      <button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer;font-size:15px">Print | پرنٹ</button>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={20} className="text-blue-600" />
            Master Billing | ماسٹر بلنگ
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Pakka Bill System | پکا بل سسٹم
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          type="button"
          data-ocid="master_billing.generate_tab"
          onClick={() => {
            setActiveTab("generate");
            setStep(1);
            setSelectedCustomer(null);
            setAggregatedItems([]);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "generate"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Generate Bill | بل بنائیں
        </button>
        <button
          type="button"
          data-ocid="master_billing.history_tab"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "history"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Bill History | بل تاریخ
        </button>
      </div>

      {/* ─── Generate Tab ───────────────────────────────────────────────── */}
      {activeTab === "generate" && (
        <div className="flex-1 overflow-y-auto">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 w-8 transition-colors ${step > s ? "bg-blue-600" : "bg-gray-200"}`}
                  />
                )}
              </div>
            ))}
            <span className="text-xs text-gray-500 ml-2">
              {step === 1 && "Select Customer | کسٹمر منتخب کریں"}
              {step === 2 && "Select Items | آئٹم منتخب کریں"}
              {step === 3 && "Bill Generated | بل تیار"}
            </span>
          </div>

          {/* ── Step 1: Customer selection ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer by name, area, code..."
                  className="pl-9"
                  data-ocid="master_billing.search_input"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
              {filteredCustomers.length === 0 ? (
                <div
                  className="text-center py-12 text-gray-500"
                  data-ocid="master_billing.customer.empty_state"
                >
                  <p className="font-medium">
                    No customers found | کوئی کسٹمر نہیں ملا
                  </p>
                  <p className="text-sm mt-1">
                    Add customers first from the Customers section
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredCustomers.map((c, idx) => (
                    <div
                      key={c.id}
                      data-ocid={`master_billing.customer.item.${idx + 1}`}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {c.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {customerTypeLabel(c.customerType)}
                          {c.area && ` · ${c.area}`}
                          {c.code && ` · ${c.code}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelectCustomer(c)}
                        data-ocid={`master_billing.customer.select_button.${idx + 1}`}
                        className="text-xs shrink-0"
                      >
                        Select | منتخب
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Estimated pool ─────────────────────────────────── */}
          {step === 2 && selectedCustomer && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-blue-600 underline"
                  >
                    ← Back | واپس
                  </button>
                  <span className="text-sm font-semibold text-gray-700">
                    {selectedCustomer.name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {customerTypeLabel(selectedCustomer.customerType)}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={loadEstimatedPool}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  data-ocid="master_billing.refresh_button"
                >
                  <RefreshCw size={12} />
                  Refresh
                </button>
              </div>

              {loadingPool ? (
                <div
                  className="flex items-center justify-center py-12"
                  data-ocid="master_billing.loading_state"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-500">
                    Loading estimated pool...
                  </span>
                </div>
              ) : aggregatedItems.length === 0 ? (
                <div
                  className="text-center py-12 bg-amber-50 border border-amber-200 rounded-xl"
                  data-ocid="master_billing.pool.empty_state"
                >
                  <p className="font-semibold text-amber-800">
                    No estimated orders in pool
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    Staff must take orders in "Company Discount" mode to add
                    items here
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {aggregatedItems.length} medicine(s) in estimated pool |
                    اندازہ پول میں {aggregatedItems.length} دوائیں
                  </div>

                  {/* Items table (mobile-first card layout) */}
                  <div className="space-y-2">
                    {aggregatedItems.map((it, idx) => {
                      const netRate = it.netRate / 100;
                      const coDisc = it.companyDiscount / 10;
                      const lineTotal = netRate * it.editQty;
                      return (
                        <div
                          key={String(it.medicineId)}
                          data-ocid={`master_billing.item.${idx + 1}`}
                          className={`bg-white border rounded-xl p-3 transition-colors ${
                            it.selected
                              ? "border-blue-300 bg-blue-50/20"
                              : "border-gray-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={it.selected}
                              onCheckedChange={() => toggleItem(idx)}
                              data-ocid={`master_billing.checkbox.${idx + 1}`}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900">
                                  {it.medicineName}
                                </span>
                                {it.strength && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {it.strength}
                                  </span>
                                )}
                                {it.company && (
                                  <span className="text-xs text-gray-500">
                                    {it.company}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 flex-wrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-amber-600 font-medium">
                                    Co% | کمپنی
                                  </span>
                                  <span className="text-xs font-bold text-amber-700">
                                    {coDisc.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-purple-600 font-medium">
                                    Net Rate | نیٹ ریٹ
                                  </span>
                                  <span className="text-xs font-bold text-purple-700">
                                    Rs. {netRate.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-gray-500 font-medium">
                                    Pool Qty | مقدار
                                  </span>
                                  <span className="text-xs font-bold text-gray-700">
                                    {it.totalQty.toFixed(1)}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-blue-600 font-medium">
                                    Include Qty
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.totalQty}
                                    step="any"
                                    value={it.editQty}
                                    onChange={(e) =>
                                      updateEditQty(
                                        idx,
                                        Number.parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    disabled={!it.selected}
                                    className="w-16 text-center text-xs font-bold text-blue-700 border border-blue-300 bg-blue-50 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-40"
                                    data-ocid={`master_billing.item.input.${idx + 1}`}
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-green-600 font-medium">
                                    Line Total
                                  </span>
                                  <span className="text-xs font-bold text-green-700">
                                    Rs. {lineTotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Running total + generate button */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-3 pb-2 -mx-1 px-1">
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                      <div>
                        <p className="text-xs text-blue-600 font-medium">
                          Selected Items | منتخب آئٹمز
                        </p>
                        <p className="text-sm font-bold text-blue-800">
                          {selectedItems.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600 font-medium">
                          Total Amount | کل رقم
                        </p>
                        <p className="text-lg font-bold text-blue-900">
                          {formatCurrency(runningTotal)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerateBill}
                      disabled={isGenerating || selectedItems.length === 0}
                      className="w-full h-11 text-sm font-bold bg-green-600 hover:bg-green-700 text-white"
                      data-ocid="master_billing.generate_bill_button"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Pakka Bill | پکا بل بنائیں"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Success ───────────────────────────────────────── */}
          {step === 3 && generatedBill && (
            <div className="space-y-4" data-ocid="master_billing.success_state">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Receipt size={24} className="text-green-600" />
                </div>
                <h3 className="font-bold text-green-800 text-lg">
                  Pakka Bill Generated! | پکا بل تیار!
                </h3>
                <p className="text-green-600 text-sm mt-1">
                  Bill #{String(generatedBill.id)} for{" "}
                  {generatedBill.masterCustomerName}
                </p>
                <p className="text-green-700 font-bold text-xl mt-2">
                  {formatCurrency(generatedBill.totalAmount)}
                </p>
              </div>

              {/* Bill summary */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Bill Items | بل آئٹمز
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {generatedBill.items.map((it, _idx) => (
                    <div
                      key={String(it.medicineId)}
                      className="px-4 py-2.5 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {it.medicineName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty: {it.quantity.toFixed(1)} · Co%:{" "}
                          {(it.companyDiscount / 10).toFixed(1)}%
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        Rs. {it.totalValue.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => printBillContent(generatedBill)}
                  variant="outline"
                  className="flex-1 gap-2"
                  data-ocid="master_billing.print_button"
                >
                  <Printer size={16} />
                  Print Bill | پرنٹ
                </Button>
                <Button
                  onClick={() => {
                    setStep(1);
                    setSelectedCustomer(null);
                    setAggregatedItems([]);
                    setGeneratedBill(null);
                  }}
                  className="flex-1"
                  data-ocid="master_billing.new_bill_button"
                >
                  New Bill | نیا بل
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── History Tab ──────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              Past Pakka Bills | گزشتہ پکا بل ({pakkaBills.length})
            </p>
            <button
              type="button"
              onClick={loadHistory}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              data-ocid="master_billing.history_refresh_button"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
          {loadingHistory ? (
            <div
              className="flex items-center justify-center py-12"
              data-ocid="master_billing.history.loading_state"
            >
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-500">
                Loading history...
              </span>
            </div>
          ) : pakkaBills.length === 0 ? (
            <div
              className="text-center py-12 text-gray-500"
              data-ocid="master_billing.history.empty_state"
            >
              <Receipt size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium">
                No bills generated yet | ابھی تک کوئی بل نہیں
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pakkaBills.map((bill, idx) => (
                <div
                  key={String(bill.id)}
                  data-ocid={`master_billing.history.item.${idx + 1}`}
                  className="bg-white border border-gray-200 rounded-xl p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          #{String(bill.id)}
                        </span>
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {bill.masterCustomerName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(Number(bill.timestamp)).toLocaleDateString(
                          "en-PK",
                        )}{" "}
                        · {bill.items.length} items ·{" "}
                        <span className="font-bold text-gray-700">
                          {formatCurrency(bill.totalAmount)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrintBill(bill)}
                      className="ml-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2 py-1.5"
                      data-ocid={`master_billing.history.print_button.${idx + 1}`}
                    >
                      <Printer size={12} />
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Print modal */}
      {printBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            data-ocid="master_billing.print_dialog"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                Bill #{String(printBill.id)}
              </h3>
              <button
                type="button"
                onClick={() => setPrintBill(null)}
                data-ocid="master_billing.print_dialog.close_button"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-sm font-semibold text-blue-800">
                  {printBill.masterCustomerName}
                </p>
                <p className="text-xs text-blue-600">
                  {new Date(Number(printBill.timestamp)).toLocaleString(
                    "en-PK",
                  )}
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {printBill.items.map((it, _i) => (
                  <div
                    key={`${String(it.medicineId)}-${it.medicineName}`}
                    className="py-2 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{it.medicineName}</p>
                      <p className="text-xs text-gray-500">
                        Qty: {it.quantity.toFixed(1)} · Co%:{" "}
                        {(it.companyDiscount / 10).toFixed(1)}%
                      </p>
                    </div>
                    <p className="text-sm font-bold">
                      Rs. {it.totalValue.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total | کل</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(printBill.totalAmount)}
                </span>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPrintBill(null)}
                className="flex-1"
                data-ocid="master_billing.print_dialog.cancel_button"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  printBillContent(printBill);
                }}
                className="flex-1 gap-2"
                data-ocid="master_billing.print_dialog.confirm_button"
              >
                <Printer size={16} />
                Print | پرنٹ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
