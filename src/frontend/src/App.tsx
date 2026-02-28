import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Beaker,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Droplets,
  FlaskConical,
  History,
  Layers,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Package,
  Phone,
  PillIcon,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  Stethoscope,
  Store,
  Syringe,
  Trash2,
  Truck,
  User,
  Warehouse,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import type {
  OrderStatus as BackendOrderStatus,
  backendInterface,
} from "./backend";
import { OrderStatus as BackendOrderStatusEnum } from "./backend";
import { useActor } from "./hooks/useActor";

// ─── Types ────────────────────────────────────────────────────────────────────

type Staff = { id: string; name: string; area: string };

type Pharmacy = {
  id: string;
  backendId: bigint;
  name: string;
  address: string;
  area: string;
  contactNo: string;
  lastOrderDate: string | null;
  isVisited: boolean;
};

type Category =
  | "tablets"
  | "syrups"
  | "injections"
  | "capsules"
  | "drops"
  | "creams";

type Medicine = {
  id: string;
  backendId: bigint;
  name: string;
  company: string;
  category: Category;
  strength: string;
  unit: string;
  price: number;
  packSize: string;
};

type CartItem = { medicine: Medicine; qty: number };

type OrderItem = {
  medicineId: string;
  medicineName: string;
  company: string;
  strength: string;
  qty: number;
  unitPrice: number;
  total: number;
};

type OrderStatus = "pending" | "confirmed" | "delivered";

type Order = {
  id: string;
  backendId: bigint | null;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyArea: string;
  staffId: string;
  staffName: string;
  date: string;
  items: OrderItem[];
  notes: string;
  status: OrderStatus;
  totalAmount: number;
};

type Screen =
  | { name: "login" }
  | { name: "dashboard" }
  | { name: "pharmacies" }
  | { name: "order-taking"; pharmacyId: string }
  | { name: "order-history" }
  | { name: "order-detail"; orderId: string }
  | { name: "manage" };

type AppState = {
  currentStaff: Staff | null;
  screen: Screen;
  orders: Order[];
  cart: CartItem[];
  notification: string | null;
};

type Action =
  | { type: "LOGIN"; staff: Staff }
  | { type: "LOGOUT" }
  | { type: "NAVIGATE"; screen: Screen }
  | { type: "ADD_TO_CART"; medicine: Medicine }
  | { type: "REMOVE_FROM_CART"; medicineId: string }
  | { type: "UPDATE_QTY"; medicineId: string; qty: number }
  | { type: "CLEAR_CART" }
  | { type: "SUBMIT_ORDER"; order: Order }
  | { type: "SET_ORDERS"; orders: Order[] }
  | { type: "UPDATE_STATUS"; orderId: string; status: OrderStatus }
  | { type: "SET_PHARMACIES_VISITED"; pharmacyId: string };

// ─── Seed Data (used only for seeding backend when empty) ─────────────────────

const PHARMACY_SEEDS = [
  {
    name: "Al-Shifa Pharmacy",
    contact: "0300-1234567",
    location: "Main Boulevard, Gulberg III | Gulberg",
  },
  {
    name: "Medico Pharma",
    contact: "0311-9876543",
    location: "Main Market, Model Town | Model Town",
  },
  {
    name: "City Pharmacy",
    contact: "0321-5555555",
    location: "Phase 5 Market, DHA | DHA",
  },
  {
    name: "Noor Medical Store",
    contact: "0333-4444444",
    location: "Johar Town Block G2 | Johar Town",
  },
  {
    name: "Health Plus",
    contact: "0345-3333333",
    location: "Garden Town Market | Garden Town",
  },
  {
    name: "Shifaa Pharmacy",
    contact: "0300-2222222",
    location: "Wapda Town Block E | Wapda Town",
  },
  {
    name: "Medicare Pharmacy",
    contact: "0322-1111111",
    location: "Bahria Town Sector C | Bahria Town",
  },
  {
    name: "Apollo Drugs",
    contact: "0312-8888888",
    location: "Faisal Town Block A | Faisal Town",
  },
];

const MEDICINE_SEEDS = [
  // Tablets
  {
    name: "Panadol",
    price: 15,
    category: "tablets" as Category,
    company: "GlaxoSmithKline",
    strength: "500mg",
    unit: "tab",
    packSize: "Pack of 10",
  },
  {
    name: "Augmentin",
    price: 85,
    category: "tablets" as Category,
    company: "GlaxoSmithKline",
    strength: "625mg",
    unit: "tab",
    packSize: "Pack of 14",
  },
  {
    name: "Brufen",
    price: 12,
    category: "tablets" as Category,
    company: "Abbott",
    strength: "400mg",
    unit: "tab",
    packSize: "Pack of 10",
  },
  {
    name: "Flagyl",
    price: 10,
    category: "tablets" as Category,
    company: "Sanofi",
    strength: "400mg",
    unit: "tab",
    packSize: "Pack of 14",
  },
  {
    name: "Amoxil",
    price: 25,
    category: "tablets" as Category,
    company: "GlaxoSmithKline",
    strength: "500mg",
    unit: "tab",
    packSize: "Pack of 12",
  },
  {
    name: "Loprin",
    price: 8,
    category: "tablets" as Category,
    company: "Abbott",
    strength: "75mg",
    unit: "tab",
    packSize: "Pack of 14",
  },
  {
    name: "Norilet",
    price: 18,
    category: "tablets" as Category,
    company: "Searle",
    strength: "500mg",
    unit: "tab",
    packSize: "Pack of 10",
  },
  {
    name: "Klaricid",
    price: 120,
    category: "tablets" as Category,
    company: "Abbott",
    strength: "500mg",
    unit: "tab",
    packSize: "Pack of 14",
  },
  {
    name: "Nexium",
    price: 95,
    category: "tablets" as Category,
    company: "AstraZeneca",
    strength: "40mg",
    unit: "tab",
    packSize: "Pack of 14",
  },
  {
    name: "Lipitor",
    price: 75,
    category: "tablets" as Category,
    company: "Pfizer",
    strength: "20mg",
    unit: "tab",
    packSize: "Pack of 14",
  },
  // Capsules
  {
    name: "Amoxil Capsule",
    price: 28,
    category: "capsules" as Category,
    company: "GlaxoSmithKline",
    strength: "500mg",
    unit: "cap",
    packSize: "Pack of 12",
  },
  {
    name: "Omeprazole",
    price: 35,
    category: "capsules" as Category,
    company: "Sanofi",
    strength: "20mg",
    unit: "cap",
    packSize: "Pack of 14",
  },
  {
    name: "Rifampicin",
    price: 45,
    category: "capsules" as Category,
    company: "Ferozsons",
    strength: "600mg",
    unit: "cap",
    packSize: "Pack of 10",
  },
  // Syrups
  {
    name: "Calpol",
    price: 85,
    category: "syrups" as Category,
    company: "GlaxoSmithKline",
    strength: "120mg/5ml",
    unit: "bottle",
    packSize: "100ml",
  },
  {
    name: "Brufen Syrup",
    price: 65,
    category: "syrups" as Category,
    company: "Abbott",
    strength: "100mg/5ml",
    unit: "bottle",
    packSize: "100ml",
  },
  {
    name: "Amoxil Syrup",
    price: 75,
    category: "syrups" as Category,
    company: "GlaxoSmithKline",
    strength: "125mg/5ml",
    unit: "bottle",
    packSize: "60ml",
  },
  {
    name: "Augmentin Syrup",
    price: 120,
    category: "syrups" as Category,
    company: "GlaxoSmithKline",
    strength: "125mg/5ml",
    unit: "bottle",
    packSize: "70ml",
  },
  {
    name: "ORS Sachet",
    price: 15,
    category: "syrups" as Category,
    company: "Various",
    strength: "Standard",
    unit: "sachet",
    packSize: "Single",
  },
  {
    name: "Actifed Syrup",
    price: 95,
    category: "syrups" as Category,
    company: "GlaxoSmithKline",
    strength: "2.5mg/5ml",
    unit: "bottle",
    packSize: "100ml",
  },
  {
    name: "Benylin Syrup",
    price: 110,
    category: "syrups" as Category,
    company: "Pfizer",
    strength: "5mg/5ml",
    unit: "bottle",
    packSize: "100ml",
  },
  // Injections
  {
    name: "Amoxicillin Inj",
    price: 180,
    category: "injections" as Category,
    company: "Searle",
    strength: "500mg",
    unit: "vial",
    packSize: "Single vial",
  },
  {
    name: "Ceftriaxone",
    price: 350,
    category: "injections" as Category,
    company: "Roche",
    strength: "1g",
    unit: "vial",
    packSize: "Single vial",
  },
  {
    name: "Dextrose 5%",
    price: 120,
    category: "injections" as Category,
    company: "Otsuka",
    strength: "5%",
    unit: "bag",
    packSize: "500ml",
  },
  {
    name: "Normal Saline",
    price: 115,
    category: "injections" as Category,
    company: "Otsuka",
    strength: "0.9%",
    unit: "bag",
    packSize: "500ml",
  },
  {
    name: "Vitamin B12 Inj",
    price: 85,
    category: "injections" as Category,
    company: "Ferozsons",
    strength: "1000mcg",
    unit: "amp",
    packSize: "Single amp",
  },
  // Drops
  {
    name: "Otrivin Nasal",
    price: 65,
    category: "drops" as Category,
    company: "Novartis",
    strength: "0.1%",
    unit: "bottle",
    packSize: "10ml",
  },
  {
    name: "Cipro Eye Drops",
    price: 85,
    category: "drops" as Category,
    company: "Bayer",
    strength: "0.3%",
    unit: "bottle",
    packSize: "5ml",
  },
  {
    name: "Refresh Tears",
    price: 250,
    category: "drops" as Category,
    company: "Allergan",
    strength: "0.5%",
    unit: "bottle",
    packSize: "15ml",
  },
  // Creams
  {
    name: "Betnovate Cream",
    price: 95,
    category: "creams" as Category,
    company: "GlaxoSmithKline",
    strength: "0.1%",
    unit: "tube",
    packSize: "15g",
  },
  {
    name: "Fucidin Cream",
    price: 150,
    category: "creams" as Category,
    company: "Leo Pharma",
    strength: "2%",
    unit: "tube",
    packSize: "15g",
  },
  {
    name: "Canesten Cream",
    price: 120,
    category: "creams" as Category,
    company: "Bayer",
    strength: "1%",
    unit: "tube",
    packSize: "20g",
  },
];

// ─── Helpers: parse backend location string ────────────────────────────────────
// Location stored as "address | area" — parse both parts
function parseLocation(location: string): { address: string; area: string } {
  const parts = location.split(" | ");
  if (parts.length >= 2) {
    return { address: parts[0].trim(), area: parts[1].trim() };
  }
  return { address: location, area: location };
}

// ─── Helpers: infer medicine category from backend description ────────────────
function inferCategory(name: string): Category {
  const n = name.toLowerCase();
  if (n.includes("syrup") || n.includes("ors") || n.includes("sachet"))
    return "syrups";
  if (n.includes("inj") || n.includes("saline") || n.includes("dextrose"))
    return "injections";
  if (
    n.includes("capsule") ||
    n.includes("omeprazole") ||
    n.includes("rifampicin") ||
    n.includes("amoxil capsule")
  )
    return "capsules";
  if (
    n.includes("drop") ||
    n.includes("nasal") ||
    n.includes("otrivin") ||
    n.includes("tears")
  )
    return "drops";
  if (
    n.includes("cream") ||
    n.includes("betnovate") ||
    n.includes("fucidin") ||
    n.includes("canesten")
  )
    return "creams";
  return "tablets";
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const initialState: AppState = {
  currentStaff: null,
  screen: { name: "login" },
  orders: [],
  cart: [],
  notification: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        currentStaff: action.staff,
        screen: { name: "dashboard" },
      };
    case "LOGOUT":
      return {
        ...state,
        currentStaff: null,
        screen: { name: "login" },
        cart: [],
        orders: [],
      };
    case "NAVIGATE":
      return { ...state, screen: action.screen };
    case "ADD_TO_CART": {
      const existing = state.cart.find(
        (ci) => ci.medicine.id === action.medicine.id,
      );
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((ci) =>
            ci.medicine.id === action.medicine.id
              ? { ...ci, qty: ci.qty + 1 }
              : ci,
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { medicine: action.medicine, qty: 1 }],
      };
    }
    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((ci) => ci.medicine.id !== action.medicineId),
      };
    case "UPDATE_QTY":
      if (action.qty <= 0) {
        return {
          ...state,
          cart: state.cart.filter((ci) => ci.medicine.id !== action.medicineId),
        };
      }
      return {
        ...state,
        cart: state.cart.map((ci) =>
          ci.medicine.id === action.medicineId
            ? { ...ci, qty: action.qty }
            : ci,
        ),
      };
    case "CLEAR_CART":
      return { ...state, cart: [] };
    case "SUBMIT_ORDER":
      return {
        ...state,
        orders: [action.order, ...state.orders],
        cart: [],
      };
    case "SET_ORDERS":
      return { ...state, orders: action.orders };
    case "UPDATE_STATUS":
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.orderId ? { ...o, status: action.status } : o,
        ),
      };
    default:
      return state;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return `Rs ${amount.toLocaleString()}`;
}

function mapBackendStatus(status: BackendOrderStatus): OrderStatus {
  if (status === BackendOrderStatusEnum.pending) return "pending";
  if (status === BackendOrderStatusEnum.confirmed) return "confirmed";
  if (status === BackendOrderStatusEnum.delivered) return "delivered";
  return "pending";
}

function mapLocalStatusToBackend(status: OrderStatus): BackendOrderStatus {
  if (status === "confirmed") return BackendOrderStatusEnum.confirmed;
  if (status === "delivered") return BackendOrderStatusEnum.delivered;
  return BackendOrderStatusEnum.pending;
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const configs: Record<
    OrderStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending | زیر التواء",
      className: "badge-pending",
      icon: <Clock size={12} />,
    },
    confirmed: {
      label: "Confirmed | تصدیق شدہ",
      className: "badge-confirmed",
      icon: <CheckCircle2 size={12} />,
    },
    delivered: {
      label: "Delivered | تحویل شدہ",
      className: "badge-delivered",
      icon: <Truck size={12} />,
    },
  };
  const cfg = configs[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Category Icon ────────────────────────────────────────────────────────────

function CategoryIcon({
  cat,
  size = 16,
}: { cat: Category | "all"; size?: number }) {
  const icons: Record<Category | "all", React.ReactNode> = {
    all: <Layers size={size} />,
    tablets: <PillIcon size={size} />,
    syrups: <FlaskConical size={size} />,
    injections: <Syringe size={size} />,
    capsules: <Beaker size={size} />,
    drops: <Droplets size={size} />,
    creams: <Stethoscope size={size} />,
  };
  return <>{icons[cat]}</>;
}

// ─── Side Drawer ──────────────────────────────────────────────────────────────

function SideDrawer({
  open,
  onClose,
  navigate,
  dispatch,
}: {
  open: boolean;
  onClose: () => void;
  navigate: (s: Screen) => void;
  dispatch: React.Dispatch<Action>;
}) {
  const navItems = [
    {
      icon: <Store size={18} />,
      label: "Pharmacies",
      urdu: "فارمیسیاں",
      screen: { name: "pharmacies" } as Screen,
    },
    {
      icon: <History size={18} />,
      label: "Order History",
      urdu: "آرڈر تاریخ",
      screen: { name: "order-history" } as Screen,
    },
    {
      icon: <Settings2 size={18} />,
      label: "Manage",
      urdu: "منظم",
      screen: { name: "manage" } as Screen,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close menu"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 h-full z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "75%", maxWidth: "300px" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 pt-10 pb-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
          }}
        >
          <div className="flex items-center gap-2.5">
            <Package size={22} />
            <span className="font-bold text-lg font-heading">MedOrder</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-3 overflow-y-auto">
          <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Navigation
          </p>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              onClick={() => {
                navigate(item.screen);
                onClose();
              }}
              className="w-full flex items-center gap-3 py-3 px-4 hover:bg-muted transition-colors text-foreground text-left"
            >
              <span className="text-muted-foreground">{item.icon}</span>
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {item.urdu}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Logout at bottom */}
        <div className="border-t border-border p-4 pb-8">
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "LOGOUT" });
              onClose();
            }}
            className="w-full flex items-center gap-3 py-3 px-4 hover:bg-red-50 transition-colors text-red-500 rounded-xl"
          >
            <LogOut size={18} />
            <div>
              <div className="text-sm font-medium">Logout</div>
              <div className="text-[11px] text-red-400">لاگ آؤٹ</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({
  dispatch,
  actor,
}: {
  dispatch: React.Dispatch<Action>;
  actor: backendInterface | null;
}) {
  const [name, setName] = useState("Ahmed Ali");
  const [id, setId] = useState("SA-001");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin() {
    if (!name.trim() || !id.trim()) {
      setError("Please enter both name and Staff ID");
      return;
    }
    setIsLoggingIn(true);
    try {
      // Register staff in background — swallow "already exists" errors
      if (actor) {
        try {
          await actor.registerStaff(name.trim(), "staff123");
        } catch {
          // Already registered — ignore
        }
      }
      dispatch({
        type: "LOGIN",
        staff: { id: id.trim(), name: name.trim(), area: "Lahore" },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      toast.error(`Login error: ${msg}`);
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-[oklch(0.38_0.19_255)] to-[oklch(0.28_0.22_270)]">
      {/* Top decorative area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Package size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white font-heading tracking-tight">
            MedOrder
          </h1>
          <p className="text-white/75 text-sm mt-1">
            Medicine Distributor App | میڈیسن ڈسٹریبیوٹر
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-1 font-heading">
            Staff Login | لاگ ان
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            Enter your credentials to continue
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="staff-name"
                className="text-sm font-medium text-foreground mb-1.5 block"
              >
                Staff Name | نام
              </label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Ahmed Ali"
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoggingIn}
              />
            </div>
            <div>
              <label
                htmlFor="staff-id"
                className="text-sm font-medium text-foreground mb-1.5 block"
              >
                Staff ID | آئی ڈی
              </label>
              <Input
                id="staff-id"
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setError("");
                }}
                placeholder="e.g. SA-001"
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoggingIn}
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              onClick={handleLogin}
              className="w-full h-11 text-base font-semibold"
              disabled={isLoggingIn}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
              }}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login | لاگ ان"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-white/50 text-xs pb-8">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline text-white/70"
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen({
  state,
  dispatch,
  pharmacies,
  isLoadingData,
  onRefreshOrders,
  onOpenMenu,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  pharmacies: Pharmacy[];
  isLoadingData: boolean;
  onRefreshOrders: () => void;
  onOpenMenu: () => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = state.orders.filter((o) => o.date === todayStr);
  const visitedCount = pharmacies.filter((p) => p.isVisited).length;
  const pendingCount = state.orders.filter(
    (o) => o.status === "pending",
  ).length;
  const recentOrders = state.orders.slice(0, 3);

  return (
    <div className="pb-6">
      {/* Header */}
      <div
        className="header-gradient px-4 pt-10 pb-6 text-white"
        style={{ boxShadow: "0 2px 16px oklch(0.38 0.19 255 / 0.25)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center shrink-0"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold font-heading truncate">
              {state.currentStaff?.name}
            </h1>
            <p className="text-white/60 text-xs mt-0.5">
              ID: {state.currentStaff?.id}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-primary font-heading">
              {isLoadingData ? (
                <Loader2 size={20} className="animate-spin mx-auto" />
              ) : (
                todayOrders.length
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-tight">
              Today's Orders
              <br />
              <span className="text-[10px]">آج کے آرڈر</span>
            </div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-primary font-heading">
              {visitedCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-tight">
              Visited
              <br />
              <span className="text-[10px]">دورہ کیا</span>
            </div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-amber-600 font-heading">
              {isLoadingData ? (
                <Loader2 size={20} className="animate-spin mx-auto" />
              ) : (
                pendingCount
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-tight">
              Pending
              <br />
              <span className="text-[10px]">زیر التواء</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "NAVIGATE", screen: { name: "pharmacies" } })
            }
            className="bg-gradient-to-br from-[oklch(0.42_0.18_255)] to-[oklch(0.32_0.22_270)] text-white rounded-2xl p-4 text-left shadow-card"
          >
            <Store size={24} className="mb-2 opacity-90" />
            <div className="font-semibold text-sm font-heading">New Order</div>
            <div className="text-white/70 text-xs">نیا آرڈر</div>
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "NAVIGATE", screen: { name: "order-history" } })
            }
            className="bg-gradient-to-br from-[oklch(0.48_0.15_200)] to-[oklch(0.38_0.18_220)] text-white rounded-2xl p-4 text-left shadow-card"
          >
            <History size={24} className="mb-2 opacity-90" />
            <div className="font-semibold text-sm font-heading">
              Order History
            </div>
            <div className="text-white/70 text-xs">آرڈر تاریخ</div>
          </button>
        </div>

        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground font-heading">
              Recent Orders | حالیہ آرڈر
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefreshOrders}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Refresh orders"
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "NAVIGATE",
                    screen: { name: "order-history" },
                  })
                }
                className="text-primary text-sm font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No orders yet
              </div>
            ) : (
              recentOrders.map((order) => (
                <button
                  type="button"
                  key={order.id}
                  onClick={() =>
                    dispatch({
                      type: "NAVIGATE",
                      screen: { name: "order-detail", orderId: order.id },
                    })
                  }
                  className="w-full bg-white rounded-xl p-4 shadow-xs border border-border text-left hover:shadow-card transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {order.pharmacyName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.id} · {formatDate(order.date)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.items.length} items</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pharmacy List Screen ─────────────────────────────────────────────────────

function PharmacyListScreen({
  dispatch,
  pharmacies,
  isLoadingPharmacies,
}: {
  dispatch: React.Dispatch<Action>;
  pharmacies: Pharmacy[];
  isLoadingPharmacies: boolean;
}) {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");

  const areas = ["All", ...Array.from(new Set(pharmacies.map((p) => p.area)))];

  const filtered = useMemo(() => {
    return pharmacies.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.area.toLowerCase().includes(search.toLowerCase());
      const matchArea = areaFilter === "All" || p.area === areaFilter;
      return matchSearch && matchArea;
    });
  }, [pharmacies, search, areaFilter]);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-5 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "NAVIGATE", screen: { name: "dashboard" } })
            }
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0"
            aria-label="Back to dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold font-heading">
              Pharmacies | فارمیسیاں
            </h1>
            <p className="text-white/70 text-sm mt-0.5">
              Select a pharmacy to take order
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pharmacy... | فارمیسی تلاش کریں"
            className="pl-9 h-11"
          />
        </div>

        {/* Area filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {areas.map((area) => (
            <button
              type="button"
              key={area}
              onClick={() => setAreaFilter(area)}
              className={`cat-tab shrink-0 ${
                areaFilter === area ? "cat-tab-active" : "cat-tab-inactive"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Pharmacy count */}
        <p className="text-xs text-muted-foreground">
          {isLoadingPharmacies
            ? "Loading pharmacies..."
            : `${filtered.length} pharmacies found`}
        </p>

        {/* Loading state */}
        {isLoadingPharmacies ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          /* Pharmacy cards */
          <div className="space-y-3">
            {filtered.map((pharmacy) => (
              <div
                key={pharmacy.id}
                className="bg-white rounded-xl p-4 shadow-xs border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground font-heading">
                        {pharmacy.name}
                      </h3>
                      {pharmacy.isVisited && (
                        <CheckCircle2
                          size={14}
                          className="text-emerald-500 shrink-0"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin size={11} />
                      <span>{pharmacy.address}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Phone size={11} />
                      <span>{pharmacy.contactNo}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {pharmacy.area}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={11} />
                    <span>
                      Last order:{" "}
                      {pharmacy.lastOrderDate
                        ? formatDate(pharmacy.lastOrderDate)
                        : "No orders yet"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      dispatch({
                        type: "NAVIGATE",
                        screen: {
                          name: "order-taking",
                          pharmacyId: pharmacy.id,
                        },
                      })
                    }
                    className="h-8 text-xs font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
                    }}
                  >
                    Order | آرڈر لیں
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Taking Screen ──────────────────────────────────────────────────────

function OrderTakingScreen({
  state,
  dispatch,
  pharmacyId,
  pharmacies,
  medicines,
  onOrderSubmitted,
  actor,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  pharmacyId: string;
  pharmacies: Pharmacy[];
  medicines: Medicine[];
  onOrderSubmitted: () => void;
  actor: backendInterface | null;
}) {
  const pharmacy = pharmacies.find((p) => p.id === pharmacyId);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: Array<{
    key: Category | "all";
    label: string;
    urdu: string;
  }> = [
    { key: "all", label: "All", urdu: "سب" },
    { key: "tablets", label: "Tablets", urdu: "گولیاں" },
    { key: "syrups", label: "Syrups", urdu: "شربت" },
    { key: "injections", label: "Injections", urdu: "انجکشن" },
    { key: "capsules", label: "Capsules", urdu: "کیپسول" },
    { key: "drops", label: "Drops", urdu: "قطرے" },
    { key: "creams", label: "Creams", urdu: "کریم" },
  ];

  const filteredMeds = useMemo(() => {
    return medicines.filter((m) => {
      const matchCat =
        activeCategory === "all" || m.category === activeCategory;
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.company.toLowerCase().includes(search.toLowerCase()) ||
        m.strength.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [medicines, search, activeCategory]);

  const cartTotal = state.cart.reduce(
    (sum, ci) => sum + ci.medicine.price * ci.qty,
    0,
  );

  const cartItemCount = state.cart.reduce((sum, ci) => sum + ci.qty, 0);

  function getQty(medicineId: string) {
    return state.cart.find((ci) => ci.medicine.id === medicineId)?.qty ?? 0;
  }

  async function handleSubmitOrder() {
    if (state.cart.length === 0) {
      toast.error("Please add at least one medicine to the order");
      return;
    }
    if (!pharmacy) return;

    setIsSubmitting(true);
    try {
      if (!actor) {
        toast.error("Backend not ready. Please try again.");
        return;
      }

      // Build order lines using backend IDs
      const orderLines = state.cart.map((ci) => ({
        medicineId: ci.medicine.backendId,
        quantity: BigInt(ci.qty),
      }));

      // Create order in backend
      const returnedId = await actor.createOrder(
        pharmacy.backendId,
        orderLines,
      );

      const orderId = `ORD-${returnedId}`;

      const items: OrderItem[] = state.cart.map((ci) => ({
        medicineId: ci.medicine.id,
        medicineName: ci.medicine.name,
        company: ci.medicine.company,
        strength: ci.medicine.strength,
        qty: ci.qty,
        unitPrice: ci.medicine.price,
        total: ci.medicine.price * ci.qty,
      }));

      const order: Order = {
        id: orderId,
        backendId: returnedId,
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        pharmacyArea: pharmacy.area,
        staffId: state.currentStaff?.id ?? "",
        staffName: state.currentStaff?.name ?? "",
        date: new Date().toISOString().split("T")[0],
        items,
        notes,
        status: "pending",
        totalAmount: cartTotal,
      };

      dispatch({ type: "SUBMIT_ORDER", order });
      setShowCart(false);
      toast.success(`Order submitted for ${pharmacy.name}!`);
      onOrderSubmitted();
      dispatch({ type: "NAVIGATE", screen: { name: "order-history" } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Backend error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pharmacy) return null;

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-4 text-white sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "NAVIGATE", screen: { name: "pharmacies" } })
            }
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold font-heading text-base leading-tight truncate">
              {pharmacy.name}
            </h1>
            <p className="text-white/70 text-xs">{pharmacy.area}</p>
          </div>
          {cartItemCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCart(true)}
              className="cart-fab relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-semibold"
            >
              <ShoppingCart size={16} />
              <span>{cartItemCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-border sticky top-[calc(3.5rem+2.5rem)] z-10">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`cat-tab shrink-0 flex items-center gap-1.5 ${
              activeCategory === cat.key ? "cat-tab-active" : "cat-tab-inactive"
            }`}
          >
            <CategoryIcon cat={cat.key} size={13} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-background">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines... | دوائی تلاش کریں"
            className="pl-9 h-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Medicine list */}
      <div className="px-4 pb-24 space-y-2.5">
        {filteredMeds.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No medicines found
          </div>
        ) : (
          filteredMeds.map((med) => {
            const qty = getQty(med.id);
            const stockRaw = localStorage.getItem(
              `medorder_stock_${med.backendId}`,
            );
            const stockQty =
              stockRaw !== null && stockRaw !== "" ? Number(stockRaw) : null;
            return (
              <div
                key={med.id}
                className="bg-white rounded-xl p-4 border border-border shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground font-heading text-sm">
                        {med.name}
                      </span>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {med.strength}
                      </span>
                      {stockQty !== null && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            stockQty > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          Stock: {stockQty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {med.company}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(med.price)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        per {med.unit} · {med.packSize}
                      </span>
                    </div>
                  </div>
                  {/* Qty controls */}
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <input
                      type="number"
                      min="0"
                      value={qty === 0 ? "" : qty}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!e.target.value || val === 0) {
                          if (qty > 0)
                            dispatch({
                              type: "REMOVE_FROM_CART",
                              medicineId: med.id,
                            });
                        } else if (qty === 0) {
                          dispatch({ type: "ADD_TO_CART", medicine: med });
                          dispatch({
                            type: "UPDATE_QTY",
                            medicineId: med.id,
                            qty: val,
                          });
                        } else {
                          dispatch({
                            type: "UPDATE_QTY",
                            medicineId: med.id,
                            qty: val,
                          });
                        }
                      }}
                      className="w-14 text-center text-sm font-bold text-foreground border border-input rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="Quantity"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating cart button */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[390px] z-20">
          <button
            type="button"
            onClick={() => setShowCart(true)}
            className="cart-fab w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-between px-5"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} />
              <span>Order Summary | آرڈر خلاصہ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {cartItemCount} items
              </span>
              <span className="font-bold">{formatCurrency(cartTotal)}</span>
            </div>
          </button>
        </div>
      )}

      {/* Cart bottom sheet */}
      {showCart && (
        <>
          <div
            className="sheet-overlay"
            onClick={() => setShowCart(false)}
            onKeyDown={(e) => e.key === "Escape" && setShowCart(false)}
            role="button"
            tabIndex={0}
            aria-label="Close cart"
          />
          <div className="sheet-content">
            <div className="px-4 pt-5 pb-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-lg font-heading text-foreground">
                    Order Summary | آرڈر خلاصہ
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {pharmacy.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Cart items */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {state.cart.map((ci) => (
                  <div
                    key={ci.medicine.id}
                    className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {ci.medicine.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ci.medicine.strength} · {ci.medicine.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={ci.qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!e.target.value || val === 0) {
                            dispatch({
                              type: "REMOVE_FROM_CART",
                              medicineId: ci.medicine.id,
                            });
                          } else {
                            dispatch({
                              type: "UPDATE_QTY",
                              medicineId: ci.medicine.id,
                              qty: val,
                            });
                          }
                        }}
                        className="w-14 text-center text-sm font-bold text-foreground border border-input rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Quantity"
                      />
                      <div className="text-right min-w-[60px]">
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(ci.medicine.price * ci.qty)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              {/* Notes */}
              <div className="mb-3">
                <label
                  htmlFor="order-notes"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  Notes | نوٹس
                </label>
                <Textarea
                  id="order-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or remarks..."
                  className="resize-none h-16 text-sm"
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-3 bg-secondary rounded-xl px-4 mb-4">
                <span className="font-semibold text-foreground">
                  Total Amount | کل رقم
                </span>
                <span className="font-bold text-xl text-primary font-heading">
                  {formatCurrency(cartTotal)}
                </span>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitOrder}
                className="w-full h-12 text-base font-bold mb-4"
                disabled={isSubmitting}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Order...
                  </>
                ) : (
                  "Submit Order | آرڈر جمع کریں"
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Order History Screen ─────────────────────────────────────────────────────

function OrderHistoryScreen({
  state,
  dispatch,
  isLoadingOrders,
  onRefresh,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  isLoadingOrders: boolean;
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return state.orders;
    return state.orders.filter((o) => o.status === statusFilter);
  }, [state.orders, statusFilter]);

  const tabs: Array<{ key: OrderStatus | "all"; label: string; urdu: string }> =
    [
      { key: "all", label: "All", urdu: "سب" },
      { key: "pending", label: "Pending", urdu: "زیر التواء" },
      { key: "confirmed", label: "Confirmed", urdu: "تصدیق شدہ" },
      { key: "delivered", label: "Delivered", urdu: "تحویل شدہ" },
    ];

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-5 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "NAVIGATE", screen: { name: "dashboard" } })
            }
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0"
            aria-label="Back to dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-heading">
              Order History | آرڈر تاریخ
            </h1>
            <p className="text-white/70 text-sm mt-0.5">
              {state.orders.length} total orders
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 rounded-xl text-sm shrink-0"
            aria-label="Refresh orders"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-border">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`cat-tab shrink-0 ${
              statusFilter === tab.key ? "cat-tab-active" : "cat-tab-inactive"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No orders found
          </div>
        ) : (
          filtered.map((order) => (
            <button
              type="button"
              key={order.id}
              onClick={() =>
                dispatch({
                  type: "NAVIGATE",
                  screen: { name: "order-detail", orderId: order.id },
                })
              }
              className="w-full bg-white rounded-xl p-4 shadow-xs border border-border text-left hover:shadow-card transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground font-heading">
                    {order.pharmacyName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.id}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>{formatDate(order.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>{order.items.length} items</span>
                  <span className="font-bold text-foreground text-sm">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Order Detail Screen ──────────────────────────────────────────────────────

function OrderDetailScreen({
  state,
  dispatch,
  orderId,
  onStatusUpdated,
  actor,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  orderId: string;
  onStatusUpdated: () => void;
  actor: backendInterface | null;
}) {
  const order = state.orders.find((o) => o.id === orderId);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  async function cycleStatus() {
    if (!order) return;
    const next: Record<OrderStatus, OrderStatus> = {
      pending: "confirmed",
      confirmed: "delivered",
      delivered: "pending",
    };
    const newStatus = next[order.status];

    setIsUpdatingStatus(true);
    try {
      // Update on backend if this order has a backend ID
      if (order.backendId !== null && actor) {
        await actor.updateOrderStatus(
          order.backendId,
          mapLocalStatusToBackend(newStatus),
        );
      }
      dispatch({
        type: "UPDATE_STATUS",
        orderId: order.id,
        status: newStatus,
      });
      toast.success(`Status updated to ${newStatus}`);
      onStatusUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Backend error: ${msg}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function goBack() {
    dispatch({ type: "NAVIGATE", screen: { name: "order-history" } });
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-5 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold font-heading text-lg">
              Order Detail | آرڈر تفصیل
            </h1>
            <p className="text-white/70 text-xs">{order.id}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Status */}
        <div className="bg-white rounded-xl p-4 border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Order Status</p>
              <StatusBadge status={order.status} />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={cycleStatus}
              disabled={isUpdatingStatus}
              className="text-xs h-8"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              Update Status
            </Button>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-xl p-4 border border-border shadow-xs space-y-3">
          <h2 className="font-bold text-foreground font-heading">
            Order Information
          </h2>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Pharmacy</p>
              <p className="font-semibold">{order.pharmacyName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Area</p>
              <p className="font-semibold">{order.pharmacyArea}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Staff Name</p>
              <p className="font-semibold">{order.staffName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Staff ID</p>
              <p className="font-semibold">{order.staffId}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Date</p>
              <p className="font-semibold">{formatDate(order.date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Order ID</p>
              <p className="font-semibold">{order.id}</p>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-xl p-4 border border-border shadow-xs">
          <h2 className="font-bold text-foreground font-heading mb-3">
            Order Items | اشیاء
          </h2>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground font-semibold pb-2 border-b border-border">
            <div className="col-span-5">Medicine</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-3 text-right">Total</div>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-border">
            {order.items.map((item) => (
              <div
                key={item.medicineId}
                className="grid grid-cols-12 gap-1 py-2.5 text-sm items-start"
              >
                <div className="col-span-5">
                  <p className="font-semibold text-foreground text-xs leading-tight">
                    {item.medicineName}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {item.strength}
                  </p>
                </div>
                <div className="col-span-2 text-center text-xs font-semibold">
                  {item.qty}
                </div>
                <div className="col-span-2 text-right text-xs">
                  {formatCurrency(item.unitPrice)}
                </div>
                <div className="col-span-3 text-right text-xs font-bold text-primary">
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>

          {/* Grand total */}
          <Separator className="my-2" />
          <div className="flex items-center justify-between py-2">
            <span className="font-bold text-foreground">
              Grand Total | کل رقم
            </span>
            <span className="font-bold text-xl text-primary font-heading">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-white rounded-xl p-4 border border-border shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-muted-foreground" />
              <h2 className="font-bold text-foreground font-heading text-sm">
                Notes | نوٹس
              </h2>
            </div>
            <p className="text-sm text-foreground bg-muted rounded-lg p-3">
              {order.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manage Screen ────────────────────────────────────────────────────────────

function ManageScreen({
  pharmacies,
  medicines,
  actor,
  onDataReloaded,
  dispatch,
}: {
  pharmacies: Pharmacy[];
  medicines: Medicine[];
  actor: backendInterface | null;
  onDataReloaded: (newPharmacies: Pharmacy[], newMedicines: Medicine[]) => void;
  dispatch: React.Dispatch<Action>;
}) {
  const [activeTab, setActiveTab] = useState<"pharmacies" | "medicines">(
    "pharmacies",
  );

  // ── Pharmacy form state ──
  const [showPharmacyForm, setShowPharmacyForm] = useState(false);
  const [pharmName, setPharmName] = useState("");
  const [pharmContact, setPharmContact] = useState("");
  const [pharmAddress, setPharmAddress] = useState("");
  const [pharmArea, setPharmArea] = useState("");
  const [isAddingPharm, setIsAddingPharm] = useState(false);
  const [deletingPharmId, setDeletingPharmId] = useState<string | null>(null);
  const [confirmDeletePharmId, setConfirmDeletePharmId] = useState<
    string | null
  >(null);

  // ── Medicine form state ──
  const [showMedForm, setShowMedForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [medPrice, setMedPrice] = useState("");
  const [medCategory, setMedCategory] = useState<Category>("tablets");
  const [medCompany, setMedCompany] = useState("");
  const [medStrength, setMedStrength] = useState("");
  const [medPackSize, setMedPackSize] = useState("");
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [deletingMedId, setDeletingMedId] = useState<string | null>(null);
  const [confirmDeleteMedId, setConfirmDeleteMedId] = useState<string | null>(
    null,
  );

  // ── Helpers: reload pharmacies from backend ──
  async function reloadPharmacies(): Promise<Pharmacy[]> {
    if (!actor) return pharmacies;
    const raw = await actor.getPharmacies();
    return raw.map((p) => {
      const { address, area } = parseLocation(p.location);
      return {
        id: String(p.id),
        backendId: p.id,
        name: p.name,
        address,
        area,
        contactNo: p.contact,
        lastOrderDate: null,
        isVisited: false,
      };
    });
  }

  // ── Helpers: reload medicines from backend ──
  async function reloadMedicines(): Promise<Medicine[]> {
    if (!actor) return medicines;
    const raw = await actor.getMedicines();
    return raw.map((m) => {
      const seed = MEDICINE_SEEDS.find((s) => s.name === m.name);
      return {
        id: String(m.id),
        backendId: m.id,
        name: m.name,
        company: m.company || seed?.company || "Unknown",
        category: seed?.category ?? inferCategory(m.name),
        strength: m.strength || seed?.strength || "",
        unit: seed?.unit ?? "unit",
        price: Number(m.price),
        packSize: m.packSize || seed?.packSize || "",
      };
    });
  }

  // ── Add Pharmacy ──
  async function handleAddPharmacy() {
    if (!actor) return;
    if (
      !pharmName.trim() ||
      !pharmContact.trim() ||
      !pharmAddress.trim() ||
      !pharmArea.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setIsAddingPharm(true);
    try {
      const location = `${pharmAddress.trim()} | ${pharmArea.trim()}`;
      await actor.addPharmacy(pharmName.trim(), pharmContact.trim(), location);
      const [newPharmacies, newMedicines] = await Promise.all([
        reloadPharmacies(),
        Promise.resolve(medicines),
      ]);
      onDataReloaded(newPharmacies, newMedicines);
      setPharmName("");
      setPharmContact("");
      setPharmAddress("");
      setPharmArea("");
      setShowPharmacyForm(false);
      toast.success(`Pharmacy "${pharmName.trim()}" add ho gayi!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsAddingPharm(false);
    }
  }

  // ── Delete Pharmacy ──
  async function handleDeletePharmacy(pharmacy: Pharmacy) {
    if (!actor) return;
    setDeletingPharmId(pharmacy.id);
    try {
      await actor.deletePharmacy(pharmacy.backendId);
      const newPharmacies = await reloadPharmacies();
      onDataReloaded(newPharmacies, medicines);
      setConfirmDeletePharmId(null);
      toast.success(`Pharmacy "${pharmacy.name}" delete ho gayi!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setDeletingPharmId(null);
    }
  }

  // ── Add Medicine ──
  async function handleAddMedicine() {
    if (!actor) return;
    if (!medName.trim() || !medPrice.trim()) {
      toast.error("Please enter name and price");
      return;
    }
    const priceNum = Number(medPrice);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    setIsAddingMed(true);
    try {
      await actor.addMedicine(
        medName.trim(),
        BigInt(Math.round(priceNum)),
        "",
        medCompany.trim(),
        medStrength.trim(),
        medPackSize.trim(),
      );
      const newMedicines = await reloadMedicines();
      onDataReloaded(pharmacies, newMedicines);
      setMedName("");
      setMedPrice("");
      setMedCategory("tablets");
      setMedCompany("");
      setMedStrength("");
      setMedPackSize("");
      setShowMedForm(false);
      toast.success(`Medicine "${medName.trim()}" add ho gayi!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsAddingMed(false);
    }
  }

  // ── Delete Medicine ──
  async function handleDeleteMedicine(medicine: Medicine) {
    if (!actor) return;
    setDeletingMedId(medicine.id);
    try {
      await actor.deleteMedicine(medicine.backendId);
      const newMedicines = await reloadMedicines();
      onDataReloaded(pharmacies, newMedicines);
      setConfirmDeleteMedId(null);
      toast.success(`Medicine "${medicine.name}" delete ho gayi!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setDeletingMedId(null);
    }
  }

  const categoryOptions: Array<{
    value: Category;
    label: string;
    urdu: string;
  }> = [
    { value: "tablets", label: "Tablets", urdu: "گولیاں" },
    { value: "syrups", label: "Syrups", urdu: "شربت" },
    { value: "injections", label: "Injections", urdu: "انجکشن" },
    { value: "capsules", label: "Capsules", urdu: "کیپسول" },
    { value: "drops", label: "Drops", urdu: "قطرے" },
    { value: "creams", label: "Creams", urdu: "کریم" },
  ];

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-5 text-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "NAVIGATE", screen: { name: "dashboard" } })
            }
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0"
            aria-label="Back to dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold font-heading">Manage | منظم</h1>
            <p className="text-white/70 text-sm mt-0.5">
              Pharmacies aur medicines manage karein
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("pharmacies")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === "pharmacies"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Store size={15} />
            <span>Pharmacies | فارمیسیاں</span>
          </div>
          <div className="text-xs font-normal opacity-70 mt-0.5">
            {pharmacies.length} total
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("medicines")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === "medicines"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <PillIcon size={15} />
            <span>Medicines | دوائیں</span>
          </div>
          <div className="text-xs font-normal opacity-70 mt-0.5">
            {medicines.length} total
          </div>
        </button>
      </div>

      {/* ── Pharmacies Tab ── */}
      {activeTab === "pharmacies" && (
        <div className="px-4 pt-4 space-y-3">
          {/* Add Pharmacy toggle button */}
          <button
            type="button"
            onClick={() => setShowPharmacyForm((v) => !v)}
            className="w-full flex items-center justify-between bg-primary text-primary-foreground rounded-xl px-4 py-3 font-semibold text-sm shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
            }}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <span>Add Pharmacy | فارمیسی شامل کریں</span>
            </div>
            {showPharmacyForm ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {/* Add Pharmacy Form */}
          {showPharmacyForm && (
            <div className="bg-white rounded-xl border border-border shadow-xs p-4 space-y-3">
              <h3 className="font-bold text-foreground font-heading text-sm">
                New Pharmacy | نئی فارمیسی
              </h3>
              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="pharm-name"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Pharmacy Name | نام *
                  </label>
                  <Input
                    id="pharm-name"
                    value={pharmName}
                    onChange={(e) => setPharmName(e.target.value)}
                    placeholder="e.g. Al-Shifa Pharmacy"
                    className="h-10 text-sm"
                    disabled={isAddingPharm}
                  />
                </div>
                <div>
                  <label
                    htmlFor="pharm-contact"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Contact Number | رابطہ *
                  </label>
                  <Input
                    id="pharm-contact"
                    value={pharmContact}
                    onChange={(e) => setPharmContact(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="h-10 text-sm"
                    disabled={isAddingPharm}
                  />
                </div>
                <div>
                  <label
                    htmlFor="pharm-address"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Address | پتہ *
                  </label>
                  <Input
                    id="pharm-address"
                    value={pharmAddress}
                    onChange={(e) => setPharmAddress(e.target.value)}
                    placeholder="e.g. Main Boulevard, Block 5"
                    className="h-10 text-sm"
                    disabled={isAddingPharm}
                  />
                </div>
                <div>
                  <label
                    htmlFor="pharm-area"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Area | علاقہ *
                  </label>
                  <Input
                    id="pharm-area"
                    value={pharmArea}
                    onChange={(e) => setPharmArea(e.target.value)}
                    placeholder="e.g. Gulberg, DHA, Johar Town"
                    className="h-10 text-sm"
                    disabled={isAddingPharm}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleAddPharmacy}
                  className="flex-1 h-10 text-sm font-semibold"
                  disabled={isAddingPharm}
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
                  }}
                >
                  {isAddingPharm ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={14} className="mr-1.5" />
                      Add Pharmacy | شامل کریں
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPharmacyForm(false);
                    setPharmName("");
                    setPharmContact("");
                    setPharmAddress("");
                    setPharmArea("");
                  }}
                  className="h-10 px-3 text-sm"
                  disabled={isAddingPharm}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Pharmacy List */}
          <p className="text-xs text-muted-foreground">
            {pharmacies.length} pharmacies registered
          </p>
          <div className="space-y-2.5">
            {pharmacies.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No pharmacies added yet
              </div>
            ) : (
              pharmacies.map((pharmacy) => (
                <div
                  key={pharmacy.id}
                  className="bg-white rounded-xl border border-border shadow-xs p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground font-heading truncate">
                        {pharmacy.name}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin size={10} />
                        <span className="truncate">{pharmacy.address}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <Phone size={10} />
                        <span>{pharmacy.contactNo}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {pharmacy.area}
                      </span>
                      {confirmDeletePharmId === pharmacy.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleDeletePharmacy(pharmacy)}
                            disabled={deletingPharmId === pharmacy.id}
                            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                          >
                            {deletingPharmId === pharmacy.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : null}
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeletePharmId(null)}
                            className="text-xs px-2 py-1 rounded-lg border border-border font-semibold hover:bg-muted transition-colors"
                            disabled={deletingPharmId === pharmacy.id}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePharmId(pharmacy.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded-lg transition-colors mt-1"
                          disabled={deletingPharmId === pharmacy.id}
                          aria-label={`Delete ${pharmacy.name}`}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      )}
                      {confirmDeletePharmId === pharmacy.id && (
                        <span className="text-[10px] text-red-500 font-medium">
                          Confirm delete?
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Medicines Tab ── */}
      {activeTab === "medicines" && (
        <div className="px-4 pt-4 space-y-3">
          {/* Add Medicine toggle button */}
          <button
            type="button"
            onClick={() => setShowMedForm((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 font-semibold text-sm shadow-sm text-white"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
            }}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <span>Add Medicine | دوائی شامل کریں</span>
            </div>
            {showMedForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Add Medicine Form */}
          {showMedForm && (
            <div className="bg-white rounded-xl border border-border shadow-xs p-4 space-y-3">
              <h3 className="font-bold text-foreground font-heading text-sm">
                New Medicine | نئی دوائی
              </h3>
              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="med-name"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Medicine Name | نام *
                  </label>
                  <Input
                    id="med-name"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g. Panadol, Augmentin"
                    className="h-10 text-sm"
                    disabled={isAddingMed}
                  />
                </div>
                <div>
                  <label
                    htmlFor="med-price"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Price (Rs) | قیمت *
                  </label>
                  <Input
                    id="med-price"
                    value={medPrice}
                    onChange={(e) => setMedPrice(e.target.value)}
                    placeholder="e.g. 50"
                    type="number"
                    min="1"
                    className="h-10 text-sm"
                    disabled={isAddingMed}
                  />
                </div>
                <div>
                  <label
                    htmlFor="med-category"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Category | قسم
                  </label>
                  <select
                    id="med-category"
                    value={medCategory}
                    onChange={(e) => setMedCategory(e.target.value as Category)}
                    className="w-full h-10 text-sm border border-input rounded-md px-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={isAddingMed}
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} | {opt.urdu}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="med-company"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Company Name | کمپنی کا نام
                  </label>
                  <Input
                    id="med-company"
                    value={medCompany}
                    onChange={(e) => setMedCompany(e.target.value)}
                    placeholder="e.g. GlaxoSmithKline, Abbott"
                    className="h-10 text-sm"
                    disabled={isAddingMed}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="med-strength"
                      className="text-xs font-medium text-muted-foreground mb-1 block"
                    >
                      Strength | طاقت
                    </label>
                    <Input
                      id="med-strength"
                      value={medStrength}
                      onChange={(e) => setMedStrength(e.target.value)}
                      placeholder="e.g. 500mg"
                      className="h-10 text-sm"
                      disabled={isAddingMed}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="med-packsize"
                      className="text-xs font-medium text-muted-foreground mb-1 block"
                    >
                      Pack Size | پیک سائز
                    </label>
                    <Input
                      id="med-packsize"
                      value={medPackSize}
                      onChange={(e) => setMedPackSize(e.target.value)}
                      placeholder="e.g. Pack of 10"
                      className="h-10 text-sm"
                      disabled={isAddingMed}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleAddMedicine}
                  className="flex-1 h-10 text-sm font-semibold"
                  disabled={isAddingMed}
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
                  }}
                >
                  {isAddingMed ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={14} className="mr-1.5" />
                      Add Medicine | شامل کریں
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMedForm(false);
                    setMedName("");
                    setMedPrice("");
                    setMedCategory("tablets");
                    setMedCompany("");
                    setMedStrength("");
                    setMedPackSize("");
                  }}
                  className="h-10 px-3 text-sm"
                  disabled={isAddingMed}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Medicine List */}
          <p className="text-xs text-muted-foreground">
            {medicines.length} medicines registered
          </p>
          <div className="space-y-2.5">
            {medicines.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No medicines added yet
              </div>
            ) : (
              medicines.map((medicine) => (
                <div
                  key={medicine.id}
                  className="bg-white rounded-xl border border-border shadow-xs p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground font-heading">
                          {medicine.name}
                        </p>
                        <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full capitalize">
                          {medicine.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">
                          Rs {medicine.price}
                        </span>
                        {medicine.strength && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            {medicine.strength}
                          </span>
                        )}
                      </div>
                      {((medicine.company && medicine.company !== "Unknown") ||
                        medicine.packSize) && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {medicine.company &&
                            medicine.company !== "Unknown" && (
                              <span className="flex items-center gap-1">
                                <Layers size={9} />
                                {medicine.company}
                              </span>
                            )}
                          {medicine.packSize && (
                            <span className="flex items-center gap-1">
                              <Package size={9} />
                              {medicine.packSize}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {confirmDeleteMedId === medicine.id ? (
                        <>
                          <span className="text-[10px] text-red-500 font-medium">
                            Confirm delete?
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteMedicine(medicine)}
                              disabled={deletingMedId === medicine.id}
                              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                              {deletingMedId === medicine.id ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : null}
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMedId(null)}
                              className="text-xs px-2 py-1 rounded-lg border border-border font-semibold hover:bg-muted transition-colors"
                              disabled={deletingMedId === medicine.id}
                            >
                              No
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMedId(medicine.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded-lg transition-colors"
                          disabled={deletingMedId === medicine.id}
                          aria-label={`Delete ${medicine.name}`}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Office Dashboard ─────────────────────────────────────────────────────────

type RawOrder = {
  id: bigint;
  status: BackendOrderStatus;
  staffId: { __principal__: string } | string;
  timestamp: bigint;
  orderLines: Array<{ medicineId: bigint; quantity: bigint }>;
  pharmacyId: bigint;
};

type OfficeOrder = {
  backendId: bigint;
  orderId: string;
  pharmacyName: string;
  pharmacyArea: string;
  staffId: string;
  date: string;
  itemCount: number;
  totalAmount: number;
  status: OrderStatus;
};

type OfficeOrderDetail = OfficeOrder & {
  items: Array<{
    medicineName: string;
    strength: string;
    qty: number;
    unitPrice: number;
    total: number;
  }>;
};

function OfficeDashboard() {
  const { actor, isFetching: isActorFetching } = useActor();
  const [orders, setOrders] = useState<OfficeOrder[]>([]);
  const [ordersWithLines, setOrdersWithLines] = useState<OfficeOrderDetail[]>(
    [],
  );
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<bigint | null>(null);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  const [activeView, setActiveView] = useState<"orders" | "inventory">(
    "orders",
  );

  const loadAllData = useCallback(async () => {
    if (!actor || isActorFetching) return;
    setIsLoading(true);
    try {
      const [rawOrders, rawPharmacies, rawMedicines] = await Promise.all([
        actor.getAllStaffOrders(),
        actor.getPharmacies(),
        actor.getMedicines(),
      ]);

      const pharmacyMap = new Map(rawPharmacies.map((p) => [String(p.id), p]));
      const medicineMap = new Map(rawMedicines.map((m) => [String(m.id), m]));

      // Map medicines for inventory view
      const mappedMedicines: Medicine[] = rawMedicines.map((m) => {
        const seed = MEDICINE_SEEDS.find((s) => s.name === m.name);
        return {
          id: String(m.id),
          backendId: m.id,
          name: m.name,
          company: m.company || seed?.company || "Unknown",
          category: seed?.category ?? inferCategory(m.name),
          strength: m.strength || seed?.strength || "",
          unit: seed?.unit ?? "unit",
          price: Number(m.price),
          packSize: m.packSize || seed?.packSize || "",
        };
      });
      setAllMedicines(mappedMedicines);

      const mapped: OfficeOrder[] = (rawOrders as unknown as RawOrder[]).map(
        (rec) => {
          const pharm = pharmacyMap.get(String(rec.pharmacyId));
          const { area } = parseLocation(pharm?.location ?? "");
          const date = new Date(Number(rec.timestamp / BigInt(1_000_000)))
            .toISOString()
            .split("T")[0];
          const itemCount = rec.orderLines.length;
          const totalAmount = rec.orderLines.reduce((sum, line) => {
            const med = medicineMap.get(String(line.medicineId));
            return sum + (med ? Number(med.price) * Number(line.quantity) : 0);
          }, 0);
          const staffIdStr =
            typeof rec.staffId === "object" && rec.staffId !== null
              ? String(
                  (rec.staffId as { __principal__: string }).__principal__ ??
                    rec.staffId,
                )
              : String(rec.staffId);

          return {
            backendId: rec.id,
            orderId: `ORD-${rec.id}`,
            pharmacyName: pharm?.name ?? `Pharmacy #${rec.pharmacyId}`,
            pharmacyArea: area,
            staffId:
              staffIdStr.slice(0, 12) + (staffIdStr.length > 12 ? "…" : ""),
            date,
            itemCount,
            totalAmount,
            status: mapBackendStatus(rec.status),
          };
        },
      );

      mapped.sort((a, b) => b.orderId.localeCompare(a.orderId));
      setOrders(mapped);

      // Compute ordersWithLines for printing
      const withLines: OfficeOrderDetail[] = (
        rawOrders as unknown as RawOrder[]
      ).map((rec) => {
        const pharm = pharmacyMap.get(String(rec.pharmacyId));
        const { area } = parseLocation(pharm?.location ?? "");
        const date = new Date(Number(rec.timestamp / BigInt(1_000_000)))
          .toISOString()
          .split("T")[0];
        const staffIdStr =
          typeof rec.staffId === "object" && rec.staffId !== null
            ? String(
                (rec.staffId as { __principal__: string }).__principal__ ??
                  rec.staffId,
              )
            : String(rec.staffId);
        const items = rec.orderLines.map((line) => {
          const med = medicineMap.get(String(line.medicineId));
          const unitPrice = med ? Number(med.price) : 0;
          const qty = Number(line.quantity);
          const seed = MEDICINE_SEEDS.find((s) => s.name === med?.name);
          return {
            medicineName: med?.name ?? `Medicine #${line.medicineId}`,
            strength: med?.strength || seed?.strength || "",
            qty,
            unitPrice,
            total: unitPrice * qty,
          };
        });
        const totalAmount = items.reduce((s, i) => s + i.total, 0);
        const itemCount = items.length;
        return {
          backendId: rec.id,
          orderId: `ORD-${rec.id}`,
          pharmacyName: pharm?.name ?? `Pharmacy #${rec.pharmacyId}`,
          pharmacyArea: area,
          staffId:
            staffIdStr.slice(0, 12) + (staffIdStr.length > 12 ? "…" : ""),
          date,
          itemCount,
          totalAmount,
          status: mapBackendStatus(rec.status),
          items,
        };
      });
      withLines.sort((a, b) => b.orderId.localeCompare(a.orderId));
      setOrdersWithLines(withLines);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Backend error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [actor, isActorFetching]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  async function handleUpdateStatus(
    order: OfficeOrder,
    newStatus: OrderStatus,
  ) {
    if (!actor) return;
    setUpdatingId(order.backendId);
    try {
      await actor.updateOrderStatus(
        order.backendId,
        mapLocalStatusToBackend(newStatus),
      );
      toast.success(`Status updated to ${newStatus}`);
      await loadAllData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConfirmAll() {
    if (!actor) return;
    const pendingOrders = orders.filter((o) => o.status === "pending");
    if (pendingOrders.length === 0) {
      toast.info("No pending orders to confirm");
      return;
    }
    setIsConfirmingAll(true);
    try {
      await Promise.all(
        pendingOrders.map((o) =>
          actor.updateOrderStatus(
            o.backendId,
            mapLocalStatusToBackend("confirmed"),
          ),
        ),
      );
      toast.success(
        `${pendingOrders.length} orders confirmed | ${pendingOrders.length} آرڈر تصدیق ہو گئے`,
      );
      await loadAllData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error confirming orders: ${msg}`);
    } finally {
      setIsConfirmingAll(false);
    }
  }

  const filtered = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const filteredWithLines = useMemo(() => {
    if (statusFilter === "all") return ordersWithLines;
    return ordersWithLines.filter((o) => o.status === statusFilter);
  }, [ordersWithLines, statusFilter]);

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    }),
    [orders],
  );

  // Inventory: group medicines by company
  const medicinesByCompany = useMemo(() => {
    const map = new Map<string, Medicine[]>();
    for (const med of allMedicines) {
      const company = med.company || "Unknown";
      if (!map.has(company)) map.set(company, []);
      map.get(company)!.push(med);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allMedicines]);

  const filterTabs: Array<{
    key: OrderStatus | "all";
    label: string;
    urdu: string;
  }> = [
    { key: "all", label: "All", urdu: "سب" },
    { key: "pending", label: "Pending", urdu: "زیر التواء" },
    { key: "confirmed", label: "Confirmed", urdu: "تصدیق شدہ" },
    { key: "delivered", label: "Delivered", urdu: "تحویل شدہ" },
  ];

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .invoice-card { page-break-after: always; }
          .invoice-card:last-child { page-break-after: avoid; }
        }
      `}</style>

      <Toaster richColors position="top-center" />

      {/* Header */}
      <header
        className="text-white px-6 py-4 shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">
                MedOrder Office
              </h1>
              <p className="text-white/70 text-xs">
                Office Dashboard | آفس ڈیش بورڈ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/delivery"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 rounded-xl text-sm font-medium"
            >
              <Truck size={15} />
              Delivery View
            </a>
            <button
              type="button"
              onClick={loadAllData}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* View Tabs: Orders / Inventory */}
      <div className="max-w-7xl mx-auto px-6 pt-5">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            type="button"
            onClick={() => setActiveView("orders")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeView === "orders"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Package size={15} />
            Orders | آرڈر
          </button>
          <button
            type="button"
            onClick={() => setActiveView("inventory")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeView === "inventory"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Warehouse size={15} />
            Inventory | انوینٹری
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-5 space-y-6">
        {activeView === "orders" && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  label: "Total Orders",
                  urdu: "کل آرڈر",
                  value: stats.total,
                  color: "text-blue-700",
                  bg: "bg-blue-50 border-blue-200",
                },
                {
                  label: "Pending",
                  urdu: "زیر التواء",
                  value: stats.pending,
                  color: "text-amber-700",
                  bg: "bg-amber-50 border-amber-200",
                },
                {
                  label: "Confirmed",
                  urdu: "تصدیق شدہ",
                  value: stats.confirmed,
                  color: "text-indigo-700",
                  bg: "bg-indigo-50 border-indigo-200",
                },
                {
                  label: "Delivered",
                  urdu: "تحویل شدہ",
                  value: stats.delivered,
                  color: "text-emerald-700",
                  bg: "bg-emerald-50 border-emerald-200",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-xl border p-5 ${stat.bg}`}
                >
                  <div
                    className={`text-3xl font-bold font-heading ${stat.color}`}
                  >
                    {isLoading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-700 mt-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-gray-500">{stat.urdu}</div>
                </div>
              ))}
            </div>

            {/* Toolbar: filter tabs + action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {filterTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === tab.key
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label} | {tab.urdu}
                    {tab.key !== "all" && (
                      <span
                        className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                          statusFilter === tab.key
                            ? "bg-white/25 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {tab.key === "pending"
                          ? stats.pending
                          : tab.key === "confirmed"
                            ? stats.confirmed
                            : stats.delivered}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Confirm All */}
                <button
                  type="button"
                  onClick={handleConfirmAll}
                  disabled={isConfirmingAll || isLoading || stats.pending === 0}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {isConfirmingAll ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Confirm All | سب تصدیق
                  {stats.pending > 0 && (
                    <span className="bg-white/25 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </button>

                {/* Print All */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={filtered.length === 0}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Printer size={14} />
                  Print All | سب پرنٹ
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Package size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">
                    No orders found | کوئی آرڈر نہیں ملا
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Pharmacy | فارمیسی
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Staff ID
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date | تاریخ
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Amount | رقم
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status | حیثیت
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions | اقدامات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((order, idx) => (
                      <tr
                        key={String(order.backendId)}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                      >
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">
                          {order.orderId}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {order.pharmacyName}
                          </div>
                          {order.pharmacyArea && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />
                              {order.pharmacyArea}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {order.staffId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(order.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700 font-medium">
                          {order.itemCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {order.status === "pending" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(order, "confirmed")
                                }
                                disabled={updatingId === order.backendId}
                                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                              >
                                {updatingId === order.backendId ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={11} />
                                )}
                                Confirm
                              </button>
                            )}
                            {order.status === "confirmed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateStatus(order, "delivered")
                                }
                                disabled={updatingId === order.backendId}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                              >
                                {updatingId === order.backendId ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Truck size={11} />
                                )}
                                Mark Delivered
                              </button>
                            )}
                            {order.status === "delivered" && (
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                Delivered
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeView === "inventory" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">
                  Inventory | انوینٹری
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Medicines grouped by company · stock qty editable
                </p>
              </div>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                {allMedicines.length} medicines · {medicinesByCompany.length}{" "}
                companies
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : medicinesByCompany.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <PillIcon size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">
                  No medicines found | کوئی دوائی نہیں ملی
                </p>
              </div>
            ) : (
              medicinesByCompany.map(([company, meds]) => (
                <div
                  key={company}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Company header block */}
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 font-heading">
                        {company}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {meds.length} medicine{meds.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {/* Medicines table */}
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Medicine Name
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Strength
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Pack Size
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Stock Qty | اسٹاک
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {meds.map((med) => {
                        const stockKey = `medorder_stock_${med.backendId}`;
                        const storedVal = localStorage.getItem(stockKey);
                        const stockVal =
                          storedVal !== null && storedVal !== ""
                            ? Number(storedVal)
                            : 0;
                        return (
                          <tr key={med.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              <span className="font-semibold text-sm text-gray-900">
                                {med.name}
                              </span>
                              <span className="ml-2 text-xs capitalize text-gray-400">
                                {med.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {med.strength || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {med.packSize || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                              {formatCurrency(med.price)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                min="0"
                                defaultValue={stockVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  localStorage.setItem(stockKey, val);
                                }}
                                className="w-20 text-center text-sm font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label={`Stock quantity for ${med.name}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-3 text-xs text-gray-400">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </div>
      </div>

      {/* ── Print Area (hidden on screen, visible when printing) ── */}
      <div id="print-area" style={{ display: "none" }}>
        <div style={{ padding: "20px" }}>
          {filteredWithLines.map((order) => (
            <div
              key={String(order.backendId)}
              className="invoice-card"
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "24px",
                marginBottom: "24px",
                fontFamily: "sans-serif",
              }}
            >
              {/* Invoice Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "20px",
                  borderBottom: "2px solid #2563eb",
                  paddingBottom: "16px",
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: "22px",
                      fontWeight: "bold",
                      color: "#1e40af",
                      margin: 0,
                    }}
                  >
                    MedOrder Invoice
                  </h1>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "13px",
                      margin: "4px 0 0",
                    }}
                  >
                    Medicine Distributor Order
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      color: "#1e40af",
                      margin: 0,
                    }}
                  >
                    {order.orderId}
                  </p>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "13px",
                      margin: "4px 0 0",
                    }}
                  >
                    {formatDate(order.date)}
                  </p>
                </div>
              </div>

              {/* Order Info */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "20px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "11px",
                      margin: "0 0 2px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Pharmacy
                  </p>
                  <p
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {order.pharmacyName}
                  </p>
                  {order.pharmacyArea && (
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: "12px",
                        margin: "2px 0 0",
                      }}
                    >
                      {order.pharmacyArea}
                    </p>
                  )}
                </div>
                <div>
                  <p
                    style={{
                      color: "#6b7280",
                      fontSize: "11px",
                      margin: "0 0 2px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Staff ID
                  </p>
                  <p
                    style={{
                      fontWeight: "bold",
                      fontSize: "14px",
                      color: "#111827",
                      margin: 0,
                    }}
                  >
                    {order.staffId}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#eff6ff",
                      borderBottom: "1px solid #bfdbfe",
                    }}
                  >
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        color: "#1e40af",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Medicine Name
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        color: "#1e40af",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Strength
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "center",
                        fontSize: "12px",
                        color: "#1e40af",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontSize: "12px",
                        color: "#1e40af",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Unit Price
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontSize: "12px",
                        color: "#1e40af",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr
                      key={`${order.orderId}-item-${i}`}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          color: "#111827",
                          fontWeight: "500",
                        }}
                      >
                        {item.medicineName}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          color: "#6b7280",
                        }}
                      >
                        {item.strength || "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {item.qty}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "13px",
                          color: "#374151",
                        }}
                      >
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontSize: "13px",
                          fontWeight: "bold",
                          color: "#1e40af",
                        }}
                      >
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      borderTop: "2px solid #2563eb",
                      backgroundColor: "#eff6ff",
                    }}
                  >
                    <td
                      colSpan={4}
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: "#1e40af",
                      }}
                    >
                      Grand Total | کل رقم
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "16px",
                        color: "#1e40af",
                      }}
                    >
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Delivery Dashboard ───────────────────────────────────────────────────────

type DeliveryOrder = {
  backendId: bigint;
  orderId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyArea: string;
  itemCount: number;
  totalAmount: number;
  status: OrderStatus;
};

function DeliveryDashboard() {
  const { actor, isFetching: isActorFetching } = useActor();
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [deliveredThisSession, setDeliveredThisSession] = useState<
    DeliveryOrder[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState<bigint | null>(null);

  const loadData = useCallback(async () => {
    if (!actor || isActorFetching) return;
    setIsLoading(true);
    try {
      const [rawOrders, rawPharmacies, rawMedicines] = await Promise.all([
        actor.getAllStaffOrders(),
        actor.getPharmacies(),
        actor.getMedicines(),
      ]);

      const pharmacyMap = new Map(rawPharmacies.map((p) => [String(p.id), p]));
      const medicineMap = new Map(rawMedicines.map((m) => [String(m.id), m]));

      const mapped: DeliveryOrder[] = (rawOrders as unknown as RawOrder[]).map(
        (rec) => {
          const pharm = pharmacyMap.get(String(rec.pharmacyId));
          const { address, area } = parseLocation(pharm?.location ?? "");
          const itemCount = rec.orderLines.length;
          const totalAmount = rec.orderLines.reduce((sum, line) => {
            const med = medicineMap.get(String(line.medicineId));
            return sum + (med ? Number(med.price) * Number(line.quantity) : 0);
          }, 0);

          return {
            backendId: rec.id,
            orderId: `ORD-${rec.id}`,
            pharmacyName: pharm?.name ?? `Pharmacy #${rec.pharmacyId}`,
            pharmacyAddress: address,
            pharmacyArea: area,
            itemCount,
            totalAmount,
            status: mapBackendStatus(rec.status),
          };
        },
      );

      const confirmed = mapped.filter((o) => o.status === "confirmed");
      confirmed.sort((a, b) => b.orderId.localeCompare(a.orderId));
      setPendingOrders(confirmed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Backend error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [actor, isActorFetching]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMarkDelivered(order: DeliveryOrder) {
    if (!actor) return;
    setMarkingId(order.backendId);
    try {
      await actor.updateOrderStatus(
        order.backendId,
        mapLocalStatusToBackend("delivered"),
      );
      toast.success(`${order.pharmacyName} — delivered!`);
      setDeliveredThisSession((prev) => [
        { ...order, status: "delivered" as OrderStatus },
        ...prev,
      ]);
      setPendingOrders((prev) =>
        prev.filter((o) => o.backendId !== order.backendId),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header
        className="text-white px-4 py-4 shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
        }}
      >
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Truck size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading">
                Delivery | ڈیلیوری
              </h1>
              <p className="text-white/70 text-xs">Delivery Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/office"
              className="flex items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors px-2.5 py-1.5 rounded-lg text-xs font-medium"
            >
              <Package size={12} />
              Office View
            </a>
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="w-8 h-8 flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors rounded-lg disabled:opacity-60"
              aria-label="Refresh"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-5">
        {/* Pending Deliveries */}
        <div>
          <h2 className="font-bold text-gray-800 font-heading mb-3 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Pending Deliveries | زیر التواء ڈیلیوری
            {!isLoading && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                {pendingOrders.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <Truck size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No pending deliveries</p>
              <p className="text-xs mt-1">تمام ڈیلیوریاں مکمل ہو گئی ہیں</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={String(order.backendId)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 font-heading">
                        {order.pharmacyName}
                      </h3>
                      {order.pharmacyAddress && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <MapPin size={10} />
                          <span>{order.pharmacyAddress}</span>
                        </div>
                      )}
                      {order.pharmacyArea && (
                        <span className="inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full mt-1">
                          {order.pharmacyArea}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-400 shrink-0 ml-2">
                      {order.orderId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <div className="text-gray-500">
                      <span className="font-medium text-gray-700">
                        {order.itemCount}
                      </span>{" "}
                      items ·{" "}
                      <span className="font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkDelivered(order)}
                    disabled={markingId === order.backendId}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm"
                  >
                    {markingId === order.backendId ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Mark Delivered | تحویل کریں
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delivered This Session */}
        {deliveredThisSession.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-800 font-heading mb-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Delivered Today | آج کی ڈیلیوری
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                {deliveredThisSession.length}
              </span>
            </h2>
            <div className="space-y-2.5">
              {deliveredThisSession.map((order) => (
                <div
                  key={String(order.backendId)}
                  className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-emerald-900 text-sm">
                        {order.pharmacyName}
                      </h3>
                      {order.pharmacyArea && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          {order.pharmacyArea}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full font-semibold">
                        <CheckCircle2 size={11} />
                        Delivered
                      </span>
                      <p className="text-xs text-emerald-600 mt-1 font-mono">
                        {order.orderId}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-3 text-xs text-gray-400">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile App Root ──────────────────────────────────────────────────────────

function MobileApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(false);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const { actor, isFetching: isActorFetching } = useActor();

  // ── Load orders from backend ───────────────────────────────────────────
  const loadOrders = useCallback(
    async (
      actorInstance: backendInterface,
      pharmacyList: Pharmacy[],
      medicineList: Medicine[],
      staffName: string,
      staffId: string,
    ) => {
      setIsLoadingOrders(true);
      try {
        const records = await actorInstance.getAllStaffOrders();
        const orders: Order[] = records.map((rec) => {
          const pharmacy = pharmacyList.find(
            (p) => p.backendId === rec.pharmacyId,
          );
          const date = new Date(Number(rec.timestamp / BigInt(1_000_000)))
            .toISOString()
            .split("T")[0];

          const items: OrderItem[] = rec.orderLines.map((line) => {
            const med = medicineList.find(
              (m) => m.backendId === line.medicineId,
            );
            const unitPrice = med?.price ?? 0;
            const qty = Number(line.quantity);
            return {
              medicineId: String(line.medicineId),
              medicineName: med?.name ?? `Medicine #${line.medicineId}`,
              company: med?.company ?? "",
              strength: med?.strength ?? "",
              qty,
              unitPrice,
              total: unitPrice * qty,
            };
          });

          const totalAmount = items.reduce((s, i) => s + i.total, 0);

          return {
            id: `ORD-${rec.id}`,
            backendId: rec.id,
            pharmacyId: pharmacy?.id ?? String(rec.pharmacyId),
            pharmacyName: pharmacy?.name ?? `Pharmacy #${rec.pharmacyId}`,
            pharmacyArea: pharmacy?.area ?? "",
            staffId,
            staffName,
            date,
            items,
            notes: "",
            status: mapBackendStatus(rec.status),
            totalAmount,
          };
        });

        // Sort newest first
        orders.sort((a, b) => b.id.localeCompare(a.id));
        dispatch({ type: "SET_ORDERS", orders });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        toast.error(`Backend error: ${msg}`);
      } finally {
        setIsLoadingOrders(false);
      }
    },
    [],
  );

  // ── Load pharmacies + medicines + orders after login ──────────────────
  useEffect(() => {
    if (!state.currentStaff || !actor || isActorFetching) return;

    async function loadData() {
      if (!state.currentStaff || !actor) return;
      setIsLoadingPharmacies(true);
      setIsLoadingMedicines(true);

      try {
        // Load pharmacies and medicines in parallel
        const [backendPharmacies, backendMedicines] = await Promise.all([
          actor.getPharmacies(),
          actor.getMedicines(),
        ]);

        let pharmacyList: Pharmacy[];
        let medicineList: Medicine[];

        // ── Pharmacies ──
        if (backendPharmacies.length === 0) {
          // Seed backend
          await Promise.all(
            PHARMACY_SEEDS.map((s) =>
              actor.addPharmacy(s.name, s.contact, s.location),
            ),
          );
          // Reload after seeding
          const reloaded = await actor.getPharmacies();
          pharmacyList = reloaded.map((p) => {
            const { address, area } = parseLocation(p.location);
            return {
              id: String(p.id),
              backendId: p.id,
              name: p.name,
              address,
              area,
              contactNo: p.contact,
              lastOrderDate: null,
              isVisited: false,
            };
          });
        } else {
          pharmacyList = backendPharmacies.map((p) => {
            const { address, area } = parseLocation(p.location);
            return {
              id: String(p.id),
              backendId: p.id,
              name: p.name,
              address,
              area,
              contactNo: p.contact,
              lastOrderDate: null,
              isVisited: false,
            };
          });
        }

        // ── Medicines ──
        if (backendMedicines.length === 0) {
          // Seed backend
          await Promise.all(
            MEDICINE_SEEDS.map((s) =>
              actor.addMedicine(
                s.name,
                BigInt(s.price),
                "",
                s.company,
                s.strength,
                s.packSize,
              ),
            ),
          );
          // Reload after seeding
          const reloaded = await actor.getMedicines();
          medicineList = reloaded.map((m) => {
            const seed = MEDICINE_SEEDS.find((s) => s.name === m.name);
            return {
              id: String(m.id),
              backendId: m.id,
              name: m.name,
              company: m.company || seed?.company || "Unknown",
              category: seed?.category ?? inferCategory(m.name),
              strength: m.strength || seed?.strength || "",
              unit: seed?.unit ?? "unit",
              price: Number(m.price),
              packSize: m.packSize || seed?.packSize || "",
            };
          });
        } else {
          medicineList = backendMedicines.map((m) => {
            const seed = MEDICINE_SEEDS.find((s) => s.name === m.name);
            return {
              id: String(m.id),
              backendId: m.id,
              name: m.name,
              company: m.company || seed?.company || "Unknown",
              category: seed?.category ?? inferCategory(m.name),
              strength: m.strength || seed?.strength || "",
              unit: seed?.unit ?? "unit",
              price: Number(m.price),
              packSize: m.packSize || seed?.packSize || "",
            };
          });
        }

        setPharmacies(pharmacyList);
        setMedicines(medicineList);

        // Load orders
        await loadOrders(
          actor,
          pharmacyList,
          medicineList,
          state.currentStaff.name,
          state.currentStaff.id,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        toast.error(`Failed to load data: ${msg}`);
      } finally {
        setIsLoadingPharmacies(false);
        setIsLoadingMedicines(false);
      }
    }

    loadData();
  }, [state.currentStaff, actor, isActorFetching, loadOrders]);

  // ── Mark pharmacies as visited based on orders ────────────────────────
  useEffect(() => {
    if (pharmacies.length === 0) return;
    const visitedIds = new Set(state.orders.map((o) => o.pharmacyId));
    setPharmacies((prev) =>
      prev.map((p) => ({ ...p, isVisited: visitedIds.has(p.id) })),
    );
  }, [state.orders, pharmacies.length]);

  const navigate = (screen: Screen) => dispatch({ type: "NAVIGATE", screen });

  const handleRefreshOrders = useCallback(() => {
    if (!state.currentStaff || !actor) return;
    loadOrders(
      actor,
      pharmacies,
      medicines,
      state.currentStaff.name,
      state.currentStaff.id,
    );
  }, [state.currentStaff, actor, pharmacies, medicines, loadOrders]);

  const isLoadingData =
    isLoadingPharmacies || isLoadingMedicines || isLoadingOrders;

  // ── Called by ManageScreen after add/delete to sync state ────────────
  const handleManageDataReloaded = useCallback(
    (newPharmacies: Pharmacy[], newMedicines: Medicine[]) => {
      setPharmacies(newPharmacies);
      setMedicines(newMedicines);
    },
    [],
  );

  function renderScreen() {
    const { screen } = state;
    switch (screen.name) {
      case "login":
        return <LoginScreen dispatch={dispatch} actor={actor} />;
      case "dashboard":
        return (
          <DashboardScreen
            state={state}
            dispatch={dispatch}
            pharmacies={pharmacies}
            isLoadingData={isLoadingData}
            onRefreshOrders={handleRefreshOrders}
            onOpenMenu={() => setSideMenuOpen(true)}
          />
        );
      case "pharmacies":
        return (
          <PharmacyListScreen
            dispatch={dispatch}
            pharmacies={pharmacies}
            isLoadingPharmacies={isLoadingPharmacies}
          />
        );
      case "order-taking":
        return (
          <OrderTakingScreen
            state={state}
            dispatch={dispatch}
            pharmacyId={screen.pharmacyId}
            pharmacies={pharmacies}
            medicines={medicines}
            onOrderSubmitted={handleRefreshOrders}
            actor={actor}
          />
        );
      case "order-history":
        return (
          <OrderHistoryScreen
            state={state}
            dispatch={dispatch}
            isLoadingOrders={isLoadingOrders}
            onRefresh={handleRefreshOrders}
          />
        );
      case "order-detail":
        return (
          <OrderDetailScreen
            state={state}
            dispatch={dispatch}
            orderId={screen.orderId}
            onStatusUpdated={handleRefreshOrders}
            actor={actor}
          />
        );
      case "manage":
        return (
          <ManageScreen
            pharmacies={pharmacies}
            medicines={medicines}
            actor={actor}
            onDataReloaded={handleManageDataReloaded}
            dispatch={dispatch}
          />
        );
    }
  }

  if (state.screen.name === "login") {
    return (
      <div className="app-container">
        <Toaster richColors position="top-center" />
        {renderScreen()}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster richColors position="top-center" />
      <main className="screen-enter">{renderScreen()}</main>
      {/* Footer - only on dashboard */}
      {state.screen.name === "dashboard" && (
        <div className="text-center py-3 px-4 text-xs text-muted-foreground border-t border-border">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-primary underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </div>
      )}
      {/* Side drawer - available on all authenticated screens */}
      <SideDrawer
        open={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        navigate={navigate}
        dispatch={dispatch}
      />
    </div>
  );
}

// ─── Test View: All 3 Dashboards Side by Side ────────────────────────────────

function TestView() {
  const base = window.location.origin;

  const panels = [
    {
      label: "Staff App",
      urdu: "اسٹاف ایپ",
      url: `${base}/`,
      width: 390,
      color: "from-blue-600 to-blue-800",
    },
    {
      label: "Office Dashboard",
      urdu: "آفس ڈیش بورڈ",
      url: `${base}/office`,
      width: 900,
      color: "from-indigo-600 to-indigo-800",
    },
    {
      label: "Delivery Dashboard",
      urdu: "ڈیلیوری ڈیش بورڈ",
      url: `${base}/delivery`,
      width: 390,
      color: "from-emerald-600 to-emerald-800",
    },
  ];

  return (
    <div className="min-h-dvh bg-gray-100 flex flex-col">
      {/* Header */}
      <header
        className="text-white px-6 py-4 shadow-lg shrink-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
        }}
      >
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">
                MedOrder — Test View
              </h1>
              <p className="text-white/70 text-xs">
                Three dashboards side by side | تینوں ڈیش بورڈ ایک ساتھ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {panels.map((p) => (
              <a
                key={p.url}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-lg font-medium"
              >
                {p.label} ↗
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Panels */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto items-start">
        {panels.map((panel) => (
          <div key={panel.label} className="flex flex-col shrink-0">
            {/* Panel label */}
            <div
              className={`bg-gradient-to-r ${panel.color} text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between`}
            >
              <div>
                <div className="font-bold text-sm">{panel.label}</div>
                <div className="text-white/70 text-xs">{panel.urdu}</div>
              </div>
              <a
                href={panel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 hover:bg-white/30 transition-colors px-2 py-1 rounded-lg text-xs font-medium"
              >
                Open ↗
              </a>
            </div>

            {/* iframe container */}
            <div
              className="bg-white rounded-b-xl shadow-lg border border-t-0 border-gray-200 overflow-hidden"
              style={{ width: `${panel.width}px`, height: "85vh" }}
            >
              <iframe
                src={panel.url}
                title={panel.label}
                width={panel.width}
                height="100%"
                style={{ border: "none", display: "block" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App Root (URL Router) ────────────────────────────────────────────────────

export default function App() {
  const pathname = window.location.pathname;
  if (pathname === "/office") return <OfficeDashboard />;
  if (pathname === "/delivery") return <DeliveryDashboard />;
  if (pathname === "/test") return <TestView />;
  return <MobileApp />;
}
