import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Key,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Distributor } from "./backend";
import { useActor } from "./hooks/useActor";

const SESSION_KEY = "medorder_session";

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function SuperAdminDashboard() {
  const { actor, isFetching } = useActor();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
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
      // Check old password locally first
      const localStoredPass =
        localStorage.getItem("medorder_superadmin_pass") || "superadmin123";
      let ok = oldPwd === localStoredPass;
      if (ok) {
        // Save new password locally so login works even when canister is down
        localStorage.setItem("medorder_superadmin_pass", newPwd);
      }
      // Also try backend if available
      try {
        const backendOk = await actor.changeSuperAdminPassword(oldPwd, newPwd);
        ok = ok || backendOk;
      } catch {
        // backend unavailable, local change already done
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

  function handleLogout() {
    clearSession();
    window.location.href = "/";
  }

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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Distributors List */}
        <section
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          data-ocid="superadmin.section"
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: "oklch(0.97 0.01 255)" }}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              <h2 className="font-bold text-gray-800">
                Distributors | ڈسٹریبیوٹرز
              </h2>
            </div>
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

          {/* Add Distributor Form */}
          <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/40">
            <p className="text-xs font-semibold text-blue-700 mb-3">
              Add New Distributor | نیا ڈسٹریبیوٹر شامل کریں
            </p>
            <div className="grid grid-cols-1 gap-2">
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
                  data-ocid="superadmin.textarea"
                />
              </div>
              <Button
                onClick={handleAddDistributor}
                disabled={isAdding || !actor}
                className="h-9 text-sm font-semibold"
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
          </div>

          {/* List */}
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
              distributors.map((d, idx) => (
                <div
                  key={String(d.id)}
                  className="flex items-center justify-between px-5 py-3.5"
                  data-ocid={`superadmin.item.${idx + 1}`}
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {d.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Admin:{" "}
                      <span className="font-mono">{d.adminUsername}</span>
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
              ))
            )}
          </div>
        </section>

        {/* Change Super Admin Password */}
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
      </main>
    </div>
  );
}
