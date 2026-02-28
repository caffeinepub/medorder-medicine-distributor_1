import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Beaker,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Droplets,
  FlaskConical,
  History,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Minus,
  Package,
  Phone,
  PillIcon,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Stethoscope,
  Store,
  Syringe,
  Truck,
  User,
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
  | { name: "order-detail"; orderId: string };

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

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({
  screen,
  navigate,
}: {
  screen: Screen;
  navigate: (s: Screen) => void;
}) {
  const tabs = [
    {
      name: "dashboard" as const,
      label: "Dashboard",
      urdu: "ڈیش بورڈ",
      icon: <LayoutDashboard size={22} />,
    },
    {
      name: "pharmacies" as const,
      label: "Pharmacies",
      urdu: "فارمیسیاں",
      icon: <Store size={22} />,
    },
    {
      name: "order-history" as const,
      label: "History",
      urdu: "تاریخ",
      icon: <History size={22} />,
    },
  ];

  const activeName = screen.name;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border z-30">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = activeName === tab.name;
          return (
            <button
              type="button"
              key={tab.name}
              onClick={() => navigate({ name: tab.name })}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className="text-[10px] font-medium leading-tight">
                {tab.label}
              </span>
              <span className="text-[9px] opacity-70 leading-tight">
                {tab.urdu}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
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
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  pharmacies: Pharmacy[];
  isLoadingData: boolean;
  onRefreshOrders: () => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = state.orders.filter((o) => o.date === todayStr);
  const visitedCount = pharmacies.filter((p) => p.isVisited).length;
  const pendingCount = state.orders.filter(
    (o) => o.status === "pending",
  ).length;
  const recentOrders = state.orders.slice(0, 3);

  return (
    <div className="pb-20">
      {/* Header */}
      <div
        className="header-gradient px-4 pt-10 pb-6 text-white"
        style={{ boxShadow: "0 2px 16px oklch(0.38 0.19 255 / 0.25)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold font-heading">
              {state.currentStaff?.name}
            </h1>
            <p className="text-white/60 text-xs mt-0.5">
              ID: {state.currentStaff?.id}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: "LOGOUT" })}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 rounded-xl text-sm"
          >
            <LogOut size={15} />
            Logout
          </button>
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
    <div className="pb-20">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-5 text-white">
        <h1 className="text-xl font-bold font-heading">
          Pharmacies | فارمیسیاں
        </h1>
        <p className="text-white/70 text-sm mt-0.5">
          Select a pharmacy to take order
        </p>
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
                    {qty > 0 ? (
                      <>
                        <button
                          type="button"
                          className="qty-btn qty-btn-minus"
                          onClick={() =>
                            dispatch({
                              type: "UPDATE_QTY",
                              medicineId: med.id,
                              qty: qty - 1,
                            })
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-foreground">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className="qty-btn qty-btn-plus"
                          onClick={() =>
                            dispatch({
                              type: "UPDATE_QTY",
                              medicineId: med.id,
                              qty: qty + 1,
                            })
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="qty-btn qty-btn-plus"
                        onClick={() =>
                          dispatch({ type: "ADD_TO_CART", medicine: med })
                        }
                        aria-label="Add to cart"
                      >
                        <Plus size={14} />
                      </button>
                    )}
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
                      <button
                        type="button"
                        className="qty-btn qty-btn-minus"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_QTY",
                            medicineId: ci.medicine.id,
                            qty: ci.qty - 1,
                          })
                        }
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">
                        {ci.qty}
                      </span>
                      <button
                        type="button"
                        className="qty-btn qty-btn-plus"
                        onClick={() =>
                          dispatch({
                            type: "UPDATE_QTY",
                            medicineId: ci.medicine.id,
                            qty: ci.qty + 1,
                          })
                        }
                      >
                        <Plus size={12} />
                      </button>
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
    <div className="pb-20">
      {/* Header */}
      <div className="header-gradient px-4 pt-10 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div>
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
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 rounded-xl text-sm"
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

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(false);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

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
              actor.addMedicine(s.name, BigInt(s.price), ""),
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
              company: seed?.company ?? "Unknown",
              category: seed?.category ?? inferCategory(m.name),
              strength: seed?.strength ?? "",
              unit: seed?.unit ?? "unit",
              price: Number(m.price),
              packSize: seed?.packSize ?? "",
            };
          });
        } else {
          medicineList = backendMedicines.map((m) => {
            const seed = MEDICINE_SEEDS.find((s) => s.name === m.name);
            return {
              id: String(m.id),
              backendId: m.id,
              name: m.name,
              company: seed?.company ?? "Unknown",
              category: seed?.category ?? inferCategory(m.name),
              strength: seed?.strength ?? "",
              unit: seed?.unit ?? "unit",
              price: Number(m.price),
              packSize: seed?.packSize ?? "",
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

  const showBottomNav =
    state.screen.name === "dashboard" ||
    state.screen.name === "pharmacies" ||
    state.screen.name === "order-history";

  const isLoadingData =
    isLoadingPharmacies || isLoadingMedicines || isLoadingOrders;

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
      {showBottomNav && <BottomNav screen={state.screen} navigate={navigate} />}
      {/* Footer - only on dashboard */}
      {state.screen.name === "dashboard" && (
        <div className="text-center py-3 px-4 text-xs text-muted-foreground border-t border-border mb-20">
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
    </div>
  );
}
