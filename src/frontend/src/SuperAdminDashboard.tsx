import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Key,
  Loader2,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Shield,
  ShoppingCart,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Distributor } from "./backend";
import { useActor } from "./hooks/useActor";

const SESSION_KEY = "medorder_session";

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

type DistributorStats = {
  orderCount: bigint;
  staffCount: bigint;
  medicineCount: bigint;
  pharmacyCount: bigint;
};

type StaffRecord = {
  id: bigint;
  distributorId: bigint;
  username: string;
  password: string;
  role: string;
  displayName: string;
};

type AllOrder = {
  id: bigint;
  pharmacyId: bigint;
  staffName: string;
  staffCode: string;
  status: string;
  timestamp: bigint;
};

export default function SuperAdminDashboard() {
  const { actor, isFetching } = useActor();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Stats per distributor
  const [statsMap, setStatsMap] = useState<Record<string, DistributorStats>>(
    {},
  );

  // All orders
  const [allOrders, setAllOrders] = useState<AllOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Staff management
  const [staffMap, setStaffMap] = useState<Record<string, StaffRecord[]>>({});
  const [expandedDistrib, setExpandedDistrib] = useState<string | null>(null);
  const [loadingStaffFor, setLoadingStaffFor] = useState<string | null>(null);
  const [addStaffFor, setAddStaffFor] = useState<string | null>(null);
  const [newStaffUsername, setNewStaffUsername] = useState("");
  const [newStaffDisplayName, setNewStaffDisplayName] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("staff");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<bigint | null>(null);

  // Add distributor form
  const [newName, setNewName] = useState("");
  const [newAdminUser, setNewAdminUser] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  // Change password form
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const loadDistributors = useCallback(async () => {
    if (!actor) return;
    setIsLoading(true);
    try {
      const list = await actor.getDistributors();
      setDistributors([...list]);
      // Load stats for each distributor in parallel
      if (list.length > 0) {
        const statsResults = await Promise.all(
          list.map(async (d) => {
            try {
              const stats = await (actor as any).getDistributorStats(d.id);
              return { id: String(d.id), stats };
            } catch {
              return { id: String(d.id), stats: null };
            }
          }),
        );
        const sm: Record<string, DistributorStats> = {};
        for (const r of statsResults) {
          if (r.stats) sm[r.id] = r.stats;
        }
        setStatsMap(sm);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [actor]);

  const loadAllOrders = useCallback(async () => {
    if (!actor) return;
    setIsLoadingOrders(true);
    try {
      const orders = await (actor as any).getAllOrdersForSuperAdmin();
      setAllOrders([...orders]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Orders load error: ${msg}`);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [actor]);

  useEffect(() => {
    if (actor && !isFetching) {
      loadDistributors();
    }
  }, [actor, isFetching, loadDistributors]);

  async function handleAddDistributor() {
    if (!actor) return;
    if (!newName.trim() || !newAdminUser.trim() || !newAdminPass.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setIsAdding(true);
    try {
      await actor.addDistributor(
        newName.trim(),
        newAdminUser.trim(),
        newAdminPass.trim(),
      );
      toast.success("Distributor added!");
      setNewName("");
      setNewAdminUser("");
      setNewAdminPass("");
      await loadDistributors();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!actor) return;
    setDeletingId(id);
    try {
      await actor.deleteDistributor(id);
      toast.success("Distributor deleted");
      await loadDistributors();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Error: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleChangePwd() {
    if (!actor) return;
    if (!oldPwd || !newPwd || !confirmPwd) {
      toast.error("Please fill all password fields");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("New passwords do not match");
      return;
    }
    setIsChangingPwd(true);
    try {
      const localStoredPass =
        localStorage.getItem("medorder_superadmin_pass") || "superadmin123";
      let ok = oldPwd === localStoredPass;
      if (ok) {
        localStorage.setItem("medorder_superadmin_pass", newPwd);
      }
      try {
        const backendOk = await actor.changeSuperAdminPassword(oldPwd, newPwd);
        ok = ok || backendOk;
      } catch {
        // backend unavailable
      }
      if (ok) {
        toast.success("Password changed successfully!");
        setOldPwd("");
        setNewPwd("");
        setConfirmPwd("");
      } else {
        toast.error("Old password is incorrect");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsChangingPwd(false);
    }
  }

  async function loadStaffForDistributor(distId: bigint) {
    if (!actor) return;
    const key = String(distId);
    setLoadingStaffFor(key);
    try {
      const staff = await (actor as any).getStaffByDistributor(distId);
      setStaffMap((prev) => ({ ...prev, [key]: [...staff] }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Staff load error: ${msg}`);
    } finally {
      setLoadingStaffFor(null);
    }
  }

  async function handleAddStaff(distId: bigint) {
    if (!actor) return;
    if (
      !newStaffUsername.trim() ||
      !newStaffPassword.trim() ||
      !newStaffDisplayName.trim()
    ) {
      toast.error("All staff fields required");
      return;
    }
    setIsAddingStaff(true);
    try {
      await (actor as any).addStaffForDistributor(
        distId,
        newStaffUsername.trim(),
        newStaffPassword.trim(),
        newStaffRole,
        newStaffDisplayName.trim(),
      );
      toast.success("Staff added!");
      setNewStaffUsername("");
      setNewStaffPassword("");
      setNewStaffDisplayName("");
      setNewStaffRole("staff");
      setAddStaffFor(null);
      await loadStaffForDistributor(distId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsAddingStaff(false);
    }
  }

  async function handleDeleteStaff(staffId: bigint, distId: bigint) {
    if (!actor) return;
    setDeletingStaffId(staffId);
    try {
      await (actor as any).deleteStaffRecord(staffId);
      toast.success("Staff deleted");
      await loadStaffForDistributor(distId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Error: ${msg}`);
    } finally {
      setDeletingStaffId(null);
    }
  }

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

  function toggleDistrib(id: string, distId: bigint) {
    if (expandedDistrib === id) {
      setExpandedDistrib(null);
    } else {
      setExpandedDistrib(id);
      if (!staffMap[id]) {
        loadStaffForDistributor(distId);
      }
    }
  }

  const statusColor = (status: string) => {
    if (status === "delivered") return "bg-green-100 text-green-700";
    if (status === "confirmed") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between shadow-md"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.25 0.16 260), oklch(0.18 0.1 250))",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.42 0.18 255)" }}
          >
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">
              Super Admin Panel
            </h1>
            <p className="text-white/60 text-xs">سپر ایڈمن پینل</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white/80 hover:text-white hover:bg-white/10"
          data-ocid="superadmin.button"
        >
          <LogOut size={15} className="mr-1" />
          Logout
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="distributors" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="distributors" data-ocid="superadmin.tab">
              <Building2 size={14} className="mr-1" />
              <span className="hidden sm:inline">Distributors</span>
              <span className="sm:hidden">Dist.</span>
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              onClick={() => {
                if (allOrders.length === 0) loadAllOrders();
              }}
              data-ocid="superadmin.tab"
            >
              <ShoppingCart size={14} className="mr-1" />
              <span className="hidden sm:inline">All Orders</span>
              <span className="sm:hidden">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="staff" data-ocid="superadmin.tab">
              <Users size={14} className="mr-1" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="settings" data-ocid="superadmin.tab">
              <Key size={14} className="mr-1" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Pwd</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Distributors ── */}
          <TabsContent value="distributors" className="space-y-4">
            {/* Add Distributor */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: "oklch(0.97 0.01 255)" }}
              >
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-blue-600" />
                  <h2 className="font-bold text-gray-800">
                    Add Distributor | نیا ڈسٹریبیوٹر
                  </h2>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <Input
                  placeholder="Distributor Name | نام"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="superadmin.input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Admin Username"
                    value={newAdminUser}
                    onChange={(e) => setNewAdminUser(e.target.value)}
                    className="h-9 text-sm"
                    data-ocid="superadmin.search_input"
                  />
                  <Input
                    type="password"
                    placeholder="Admin Password"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <Button
                  onClick={handleAddDistributor}
                  disabled={isAdding || !actor}
                  className="w-full h-9 text-sm font-semibold"
                  style={{ background: "oklch(0.42 0.18 255)" }}
                  data-ocid="superadmin.primary_button"
                >
                  {isAdding ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Plus size={14} className="mr-1.5" />
                  )}
                  Add Distributor | شامل کریں
                </Button>
              </div>
            </section>

            {/* Distributors list with stats */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: "oklch(0.97 0.01 255)" }}
              >
                <h2 className="font-bold text-gray-800">
                  Active Distributors | ڈسٹریبیوٹرز
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadDistributors}
                  disabled={isLoading}
                  className="text-gray-500"
                  data-ocid="superadmin.secondary_button"
                >
                  <RefreshCw
                    size={14}
                    className={isLoading ? "animate-spin" : ""}
                  />
                </Button>
              </div>

              <div className="divide-y divide-gray-100">
                {isLoading && distributors.length === 0 ? (
                  <div
                    className="flex items-center justify-center py-8 text-gray-400 text-sm"
                    data-ocid="superadmin.loading_state"
                  >
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Loading...
                  </div>
                ) : distributors.length === 0 ? (
                  <div
                    className="py-8 text-center text-gray-400 text-sm"
                    data-ocid="superadmin.empty_state"
                  >
                    <Building2 size={28} className="mx-auto mb-2 opacity-30" />
                    No distributors yet | ابھی کوئی ڈسٹریبیوٹر نہیں
                  </div>
                ) : (
                  distributors.map((d, idx) => {
                    const stats = statsMap[String(d.id)];
                    return (
                      <div
                        key={String(d.id)}
                        className="px-5 py-4"
                        data-ocid={`superadmin.item.${idx + 1}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {d.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Admin:{" "}
                              <span className="font-mono">
                                {d.adminUsername}
                              </span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(d.id)}
                            disabled={deletingId === d.id}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            data-ocid={`superadmin.delete_button.${idx + 1}`}
                          >
                            {deletingId === d.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        </div>
                        {stats && (
                          <div className="grid grid-cols-4 gap-2 mt-3">
                            {[
                              {
                                label: "Orders",
                                value: Number(stats.orderCount),
                                icon: <ShoppingCart size={12} />,
                              },
                              {
                                label: "Staff",
                                value: Number(stats.staffCount),
                                icon: <Users size={12} />,
                              },
                              {
                                label: "Medicines",
                                value: Number(stats.medicineCount),
                                icon: <Package size={12} />,
                              },
                              {
                                label: "Pharmacies",
                                value: Number(stats.pharmacyCount),
                                icon: <Building2 size={12} />,
                              },
                            ].map((s) => (
                              <div
                                key={s.label}
                                className="bg-blue-50 rounded-lg p-2 text-center"
                              >
                                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                                  {s.icon}
                                </div>
                                <p className="text-base font-bold text-gray-800">
                                  {s.value}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {s.label}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </TabsContent>

          {/* ── Tab 2: All Orders ── */}
          <TabsContent value="orders">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: "oklch(0.97 0.01 255)" }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-blue-600" />
                  <h2 className="font-bold text-gray-800">
                    All Orders | تمام آرڈرز
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadAllOrders}
                  disabled={isLoadingOrders}
                  className="text-gray-500"
                  data-ocid="superadmin.secondary_button"
                >
                  <RefreshCw
                    size={14}
                    className={isLoadingOrders ? "animate-spin" : ""}
                  />
                </Button>
              </div>

              {isLoadingOrders ? (
                <div
                  className="flex items-center justify-center py-12 text-gray-400 text-sm"
                  data-ocid="superadmin.loading_state"
                >
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Loading orders...
                </div>
              ) : allOrders.length === 0 ? (
                <div
                  className="py-12 text-center text-gray-400 text-sm"
                  data-ocid="superadmin.empty_state"
                >
                  <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                  No orders found | کوئی آرڈر نہیں
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    data-ocid="superadmin.table"
                  >
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                          Order ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                          Staff
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {allOrders.map((order, idx) => (
                        <tr
                          key={String(order.id)}
                          className="hover:bg-gray-50 transition-colors"
                          data-ocid={`superadmin.row.${idx + 1}`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            ORD-{String(order.id)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {(order as any).staffName || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(
                                String((order as any).status || ""),
                              )}`}
                            >
                              {String((order as any).status || "pending")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {
                              new Date(
                                Number(
                                  BigInt((order as any).timestamp || 0) /
                                    BigInt(1_000_000),
                                ),
                              )
                                .toISOString()
                                .split("T")[0]
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>

          {/* ── Tab 3: Staff Management ── */}
          <TabsContent value="staff" className="space-y-3">
            {distributors.length === 0 ? (
              <div
                className="bg-white rounded-2xl shadow-sm border border-gray-100 py-12 text-center text-gray-400 text-sm"
                data-ocid="superadmin.empty_state"
              >
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                No distributors yet. Add a distributor first.
              </div>
            ) : (
              distributors.map((d, idx) => {
                const key = String(d.id);
                const isExpanded = expandedDistrib === key;
                const staffList = staffMap[key] || [];
                const isLoadingThis = loadingStaffFor === key;

                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                    data-ocid={`superadmin.panel.${idx + 1}`}
                  >
                    <button
                      type="button"
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      onClick={() => toggleDistrib(key, d.id)}
                      data-ocid={`superadmin.toggle.${idx + 1}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: "oklch(0.42 0.18 255)" }}
                        >
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-800 text-sm">
                            {d.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {statsMap[key]
                              ? `${Number(statsMap[key].staffCount)} staff`
                              : "Click to expand"}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {/* Add Staff Form */}
                        {addStaffFor === key ? (
                          <div className="px-5 py-4 bg-blue-50/40 space-y-2">
                            <p className="text-xs font-semibold text-blue-700 mb-2">
                              Add Staff for {d.name}
                            </p>
                            <Input
                              placeholder="Display Name"
                              value={newStaffDisplayName}
                              onChange={(e) =>
                                setNewStaffDisplayName(e.target.value)
                              }
                              className="h-9 text-sm"
                              data-ocid="superadmin.staff.input"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Username"
                                value={newStaffUsername}
                                onChange={(e) =>
                                  setNewStaffUsername(e.target.value)
                                }
                                className="h-9 text-sm"
                              />
                              <Input
                                type="password"
                                placeholder="Password"
                                value={newStaffPassword}
                                onChange={(e) =>
                                  setNewStaffPassword(e.target.value)
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                            <select
                              value={newStaffRole}
                              onChange={(e) => setNewStaffRole(e.target.value)}
                              className="w-full h-9 text-sm border border-gray-200 rounded-md px-2 bg-white"
                              data-ocid="superadmin.staff.select"
                            >
                              <option value="staff">Staff / Booker</option>
                              <option value="delivery">Delivery</option>
                            </select>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAddStaff(d.id)}
                                disabled={isAddingStaff}
                                className="flex-1 h-9 text-sm"
                                style={{ background: "oklch(0.42 0.18 255)" }}
                                data-ocid="superadmin.staff.submit_button"
                              >
                                {isAddingStaff ? (
                                  <Loader2
                                    size={14}
                                    className="mr-1 animate-spin"
                                  />
                                ) : (
                                  <Plus size={14} className="mr-1" />
                                )}
                                Add Staff
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setAddStaffFor(null)}
                                className="h-9 text-sm px-3"
                                data-ocid="superadmin.staff.cancel_button"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAddStaffFor(key)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs h-7"
                              data-ocid={`superadmin.staff.open_modal_button.${idx + 1}`}
                            >
                              <Plus size={12} className="mr-1" />
                              Add Staff Member
                            </Button>
                          </div>
                        )}

                        {/* Staff list */}
                        {isLoadingThis ? (
                          <div
                            className="flex items-center justify-center py-6 text-gray-400 text-sm"
                            data-ocid="superadmin.staff.loading_state"
                          >
                            <Loader2 size={14} className="animate-spin mr-2" />
                            Loading staff...
                          </div>
                        ) : staffList.length === 0 ? (
                          <div
                            className="py-6 text-center text-gray-400 text-xs"
                            data-ocid="superadmin.staff.empty_state"
                          >
                            No staff members yet
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {staffList.map((s, sIdx) => (
                              <div
                                key={String(s.id)}
                                className="flex items-center justify-between px-5 py-3"
                                data-ocid={`superadmin.staff.item.${sIdx + 1}`}
                              >
                                <div>
                                  <p className="font-medium text-sm text-gray-800">
                                    {s.displayName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500 font-mono">
                                      {s.username}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className={`text-[10px] px-1.5 py-0 ${
                                        s.role === "delivery"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {s.role}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStaff(s.id, d.id)}
                                  disabled={deletingStaffId === s.id}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                  data-ocid={`superadmin.staff.delete_button.${sIdx + 1}`}
                                >
                                  {deletingStaffId === s.id ? (
                                    <Loader2
                                      size={13}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── Tab 4: Settings (Change Password) ── */}
          <TabsContent value="settings">
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div
                className="px-5 py-4 flex items-center gap-2"
                style={{ background: "oklch(0.97 0.01 255)" }}
              >
                <Key size={18} className="text-blue-600" />
                <h2 className="font-bold text-gray-800">
                  Change Super Admin Password | پاس ورڈ تبدیل کریں
                </h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <Input
                  type="password"
                  placeholder="Old Password | پرانا پاس ورڈ"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  className="h-9 text-sm"
                  data-ocid="superadmin.password.input"
                />
                <Input
                  type="password"
                  placeholder="New Password | نیا پاس ورڈ"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="h-9 text-sm"
                />
                <Input
                  type="password"
                  placeholder="Confirm New Password | تصدیق کریں"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="h-9 text-sm"
                />
                <Button
                  onClick={handleChangePwd}
                  disabled={isChangingPwd || !actor}
                  className="w-full h-9 text-sm font-semibold"
                  style={{ background: "oklch(0.42 0.18 255)" }}
                  data-ocid="superadmin.save_button"
                >
                  {isChangingPwd ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Key size={14} className="mr-1.5" />
                  )}
                  Change Password | تبدیل کریں
                </Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
