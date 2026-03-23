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
import { Calculator, Package, Printer, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

interface EstimatedBillingScreenProps {
  allMedicines: MedicineInfo[];
  allPharmacies: PharmacyInfo[];
  allOrders?: any[];
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

export default function EstimatedBillingScreen({
  allMedicines,
  allPharmacies,
  allOrders,
}: EstimatedBillingScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [billCustomer, setBillCustomer] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");

  // Fix: derive pool from backend orders (cross-device), fallback to localStorage
  const [pool, setPool] = useState<PoolEntry[]>([]);
  useEffect(() => {
    if (allOrders && allOrders.length > 0) {
      const derivedPool: PoolEntry[] = allOrders
        .filter((o: any) =>
          o.items?.some((i: any) => (i.companyDiscount ?? 0) > 0),
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
      setPool(derivedPool);
    } else {
      try {
        const raw = localStorage.getItem("estimatedOrders_pool");
        setPool(raw ? JSON.parse(raw) : []);
      } catch {
        setPool([]);
      }
    }
  }, [allOrders]);

  // Filter items where companyDiscount > 0
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

  // Aggregate by product name
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

  // ALL customers list for bill creation (all pharmacies)
  const allCustomerRows = useMemo(() => {
    const filtered = allPharmacies.filter((p) =>
      p.name.toLowerCase().includes(customerSearch.toLowerCase()),
    );
    return filtered.map((p) => {
      // Check if this customer has Co% orders in pool
      const poolEntries = coDiscountEntries.filter(
        (e) => e.pharmacyName === p.name,
      );
      const poolValue = poolEntries.reduce(
        (sum, e) =>
          sum + e.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
        0,
      );
      return {
        pharmacyName: p.name,
        hasPoolOrders: poolEntries.length > 0,
        poolOrderCount: poolEntries.length,
        poolValue,
      };
    });
  }, [allPharmacies, coDiscountEntries, customerSearch]);

  // Selected product orders
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

  // Bill customer orders
  const billOrders = useMemo(() => {
    if (!billCustomer) return [];
    return coDiscountEntries.filter((e) => e.pharmacyName === billCustomer);
  }, [coDiscountEntries, billCustomer]);

  const billTotal = useMemo(
    () =>
      billOrders.reduce(
        (sum, e) =>
          sum + e.items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
        0,
      ),
    [billOrders],
  );

  function handlePrint() {
    window.print();
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
            value="bill"
            className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            data-ocid="estimated.bill.tab"
          >
            <Users size={14} className="mr-1.5" />
            Create Bill | بل بنائیں
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

        {/* Tab 2: Bill - All Customers */}
        <TabsContent value="bill">
          {/* Search */}
          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search customer | کسٹمر تلاش کریں"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              data-ocid="estimated.bill.search_input"
            />
          </div>

          {allCustomerRows.length === 0 ? (
            <div
              className="text-center py-16 text-gray-400"
              data-ocid="estimated.bill.empty_state"
            >
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No customers found | کوئی کسٹمر نہیں ملا
              </p>
            </div>
          ) : (
            <div
              className="grid gap-3 sm:grid-cols-2"
              data-ocid="estimated.bill.list"
            >
              {allCustomerRows.map((cr, idx) => (
                <div
                  key={cr.pharmacyName}
                  className={`rounded-xl border bg-white p-4 flex flex-col gap-2 ${
                    cr.hasPoolOrders
                      ? "border-blue-200 shadow-sm"
                      : "border-gray-100"
                  }`}
                  data-ocid={`estimated.bill.item.${idx + 1}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {cr.pharmacyName}
                      </p>
                      {cr.hasPoolOrders ? (
                        <p className="text-xs text-blue-600 mt-0.5">
                          {cr.poolOrderCount} Co% order
                          {cr.poolOrderCount !== 1 ? "s" : ""} |{" "}
                          {formatCurrency(cr.poolValue)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">
                          No Co% orders | کوئی Co% آرڈر نہیں
                        </p>
                      )}
                    </div>
                    {cr.hasPoolOrders && (
                      <Badge className="bg-blue-100 text-blue-700 shrink-0">
                        {formatCurrency(cr.poolValue)}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className={`w-full mt-1 ${
                      cr.hasPoolOrders
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setBillCustomer(cr.pharmacyName)}
                    data-ocid={`estimated.bill.open_modal_button.${idx + 1}`}
                  >
                    Create Bill | بل بنائیں
                  </Button>
                </div>
              ))}
            </div>
          )}
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

      {/* Bill Dialog */}
      <Dialog
        open={!!billCustomer}
        onOpenChange={(o) => !o && setBillCustomer(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-800">
              Bill: {billCustomer} | بل
            </DialogTitle>
          </DialogHeader>

          {billOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No Co% orders for this customer</p>
              <p className="text-xs mt-1">کوئی Co% آرڈر نہیں ہے</p>
            </div>
          ) : (
            <>
              {/* Printable area */}
              <div id="bill-print-area" className="space-y-3 mt-2">
                <div className="text-center border-b border-blue-200 pb-3 mb-3">
                  <h2 className="text-lg font-bold text-blue-900">
                    Mian Medicine Distributors
                  </h2>
                  <p className="text-xs text-gray-500">
                    Estimated Bill | اندازہ بل
                  </p>
                  <p className="text-xs text-gray-500">
                    Customer: {billCustomer} | Date:{" "}
                    {new Date().toLocaleDateString("en-PK")}
                  </p>
                </div>

                {billOrders.map((entry, ei) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-gray-200 p-3"
                    data-ocid={`estimated.bill.detail.item.${ei + 1}`}
                  >
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Order: {entry.orderId ?? entry.id}</span>
                      <span>{formatDate(entry.timestamp)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Staff: {entry.staffName}
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left pb-1">Medicine</th>
                          <th className="text-right pb-1">Qty</th>
                          <th className="text-right pb-1">Rate</th>
                          <th className="text-right pb-1">Co%</th>
                          <th className="text-right pb-1">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.items.map((item) => (
                          <tr
                            key={item.medicineName}
                            className="border-b border-gray-100"
                          >
                            <td className="py-1 text-gray-900">
                              {item.medicineName}
                            </td>
                            <td className="py-1 text-right">{item.qty}</td>
                            <td className="py-1 text-right">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-1 text-right text-amber-700">
                              {(item.companyDiscount / 10).toFixed(1)}%
                            </td>
                            <td className="py-1 text-right font-medium">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                <div className="flex justify-between items-center bg-blue-50 rounded-lg px-4 py-3 mt-2">
                  <span className="font-semibold text-blue-900">
                    Total | کل رقم
                  </span>
                  <span className="font-bold text-lg text-blue-700">
                    {formatCurrency(billTotal)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setBillCustomer(null)}
                  data-ocid="estimated.bill.cancel_button"
                >
                  <X size={14} className="mr-1.5" /> Close
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handlePrint}
                  data-ocid="estimated.bill.print_button"
                >
                  <Printer size={14} className="mr-1.5" /> Print | پرنٹ
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
