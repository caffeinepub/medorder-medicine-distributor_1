import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart2,
  Beaker,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Download,
  Droplets,
  FlaskConical,
  History,
  Layers,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Pencil,
  Phone,
  PillIcon,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  SendHorizonal,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Store,
  Syringe,
  Trash2,
  Truck,
  User,
  Warehouse,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { toast } from "sonner";
import EstimatedBillingScreen from "./EstimatedBillingScreen";
import SuperAdminDashboard from "./SuperAdminDashboard";
import type {
  OrderStatus as BackendOrderStatus,
  backendInterface,
} from "./backend";
import { OrderStatus as BackendOrderStatusEnum, CustomerType } from "./backend";
import { useActor } from "./hooks/useActor";

// ─── Extended Customer Type (hospital now maps to real CustomerType.hospital) ──
type ExtendedCustomerType = CustomerType;
function toBackendCustomerType(t: ExtendedCustomerType): CustomerType {
  return t;
}

// ─── Auth Types & User Database ──────────────────────────────────────────────

type UserRole = "admin" | "staff" | "delivery" | "superadmin";

type AppUser = {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  backendStaffId?: number;
};

const USER_DB: AppUser[] = [
  // Admin
  {
    username: "admin",
    password: "Admin@123",
    role: "admin",
    displayName: "Office Admin",
  },
];

const SESSION_KEY = "medorder_session";
const CUSTOM_USERS_KEY = "medorder_custom_users";
const HIDDEN_BUILTIN_USERS_KEY = "medorder_hidden_builtin_users";

function getCustomUsers(): AppUser[] {
  try {
    const stored = localStorage.getItem(CUSTOM_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getAllUsers(): AppUser[] {
  return [...USER_DB, ...getCustomUsers()];
}

function lookupUser(username: string, password: string): AppUser | null {
  const all = getAllUsers();
  return (
    all.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password,
    ) ?? null
  );
}

type SessionData = {
  username: string;
  role: UserRole;
  displayName: string;
  distributorId?: number;
  staffId?: number;
};

function getSession(): SessionData | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setSession(data: SessionData) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

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
  code: string;
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
  genericName?: string;
  batchNo?: string;
  medicineType?: string;
  productCode?: string;
  groupId?: bigint;
};

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
  ntn?: string;
  cnic?: string;
  dealerCode?: string;
  pmdc?: string;
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
  bonusQty?: number;
  discountPercent?: number;
  distributionDiscount?: number;
  companyDiscount?: number;
  manualNetRate?: number;
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
  paymentReceived?: number;
  returnItems?: Array<{ medicineId: string; returnedQty: number }>;
  returnReason?: string;
  pharmacyCode?: string;
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
  currentRole: UserRole | null;
  screen: Screen;
  orders: Order[];
  cart: CartItem[];
  notification: string | null;
};

type Action =
  | { type: "LOGIN"; staff: Staff; role: UserRole }
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

function categoryToTypeLabel(cat: Category): string {
  switch (cat) {
    case "tablets":
      return "Tablet";
    case "syrups":
      return "Syrup";
    case "injections":
      return "Inj";
    case "capsules":
      return "Capsule";
    case "drops":
      return "Drop";
    case "creams":
      return "Cream";
    default:
      return "Other";
  }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const initialState: AppState = {
  currentStaff: null,
  currentRole: null,
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
        currentRole: action.role,
        screen: { name: "dashboard" },
      };
    case "LOGOUT":
      return {
        ...state,
        currentStaff: null,
        currentRole: null,
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
  if (Number.isNaN(amount) || !Number.isFinite(amount)) return "Rs 0.00";
  return `Rs ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            <span className="font-bold text-lg font-heading">MedFlow</span>
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
              clearSession();
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
  onRoleLogin,
}: {
  dispatch: React.Dispatch<Action>;
  onRoleLogin?: (
    role: UserRole,
    username: string,
    displayName: string,
    distributorId?: number,
  ) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuperAdminLogin, setShowSuperAdminLogin] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState("");
  const [isSuperAdminLoggingIn, setIsSuperAdminLoggingIn] = useState(false);

  const { actor: loginActor } = useActor();

  async function handleSuperAdminLogin() {
    if (!superAdminPassword.trim()) return;
    setIsSuperAdminLoggingIn(true);
    try {
      // Check locally stored password first (fallback when canister is unavailable)
      const localStoredPass =
        localStorage.getItem("medorder_superadmin_pass") || "superadmin123";
      // Accept hardcoded default OR locally stored password
      let ok =
        superAdminPassword === "superadmin123" ||
        superAdminPassword === localStoredPass;

      // Also try backend if actor available (non-blocking)
      if (!ok && loginActor) {
        try {
          ok = await (loginActor as any).verifySuperAdmin(superAdminPassword);
        } catch {
          // backend unavailable, rely on local check only
        }
      }

      if (ok) {
        const sessionData = {
          username: "superadmin",
          role: "superadmin" as UserRole,
          displayName: "Super Admin",
        };
        localStorage.setItem("medorder_session", JSON.stringify(sessionData));
        window.location.href = "/superadmin";
      } else {
        toast.error("Invalid Super Admin password | غلط پاس ورڈ");
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsSuperAdminLoggingIn(false);
    }
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError(
        "Please enter username and password | براہ کرم یوزر نیم اور پاس ورڈ درج کریں",
      );
      return;
    }
    setIsLoggingIn(true);
    try {
      // First: try local user lookup (hardcoded + custom users)
      const user = lookupUser(username.trim(), password.trim());
      if (user) {
        const sessionData: SessionData = {
          username: user.username,
          role: user.role,
          displayName: user.displayName,
        };
        setSession(sessionData);

        if (onRoleLogin) {
          onRoleLogin(user.role, user.username, user.displayName);
          return;
        }

        dispatch({
          type: "LOGIN",
          staff: { id: user.username, name: user.displayName, area: "" },
          role: user.role,
        });
        return;
      }

      // Second: try backend distributor login
      if (loginActor) {
        try {
          const distributorId = await loginActor.verifyDistributorLogin(
            username.trim(),
            password.trim(),
          );
          if (distributorId !== null) {
            const distId = Number(distributorId);
            // Fetch distributor name for displayName
            let displayName = username.trim();
            try {
              const dist = await loginActor.getDistributorById(BigInt(distId));
              if (dist) displayName = dist.name;
            } catch {
              // fallback to username if name fetch fails
            }
            const sessionData: SessionData = {
              username: username.trim(),
              role: "admin",
              displayName,
              distributorId: distId,
            };
            setSession(sessionData);

            if (onRoleLogin) {
              onRoleLogin("admin", username.trim(), displayName, distId);
              return;
            }

            dispatch({
              type: "LOGIN",
              staff: { id: username.trim(), name: displayName, area: "" },
              role: "admin",
            });
            return;
          }
        } catch {
          // Backend unavailable — fall through to error
        }

        // Third: try new staff/delivery login
        try {
          const staffResult = await (
            loginActor as any
          ).verifyStaffLoginForDistributor(username.trim(), password.trim());
          if (staffResult && staffResult.length > 0) {
            const sr = staffResult[0];
            const distId = Number(sr.distributorId);
            const staffId = Number(sr.staffId);
            const userRole = sr.role === "delivery" ? "delivery" : "staff";
            const sessionData: SessionData = {
              username: username.trim(),
              role: userRole as UserRole,
              displayName: sr.displayName || username.trim(),
              distributorId: distId,
              staffId,
            };
            setSession(sessionData);

            if (onRoleLogin) {
              onRoleLogin(
                userRole as UserRole,
                username.trim(),
                sr.displayName || username.trim(),
                distId,
              );
              return;
            }

            dispatch({
              type: "LOGIN",
              staff: {
                id: username.trim(),
                name: sr.displayName || username.trim(),
                area: "",
              },
              role: userRole as UserRole,
            });
            return;
          }
        } catch {
          // Staff login backend unavailable
        }
      }

      // No match found
      setError("Invalid username or password | غلط یوزر نیم یا پاس ورڈ");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      toast.error(`Login error: ${msg}`);
    } finally {
      setIsLoggingIn(false);
    }
  }

  const roleBadgeColors: Record<UserRole, string> = {
    admin: "bg-purple-100 text-purple-700",
    staff: "bg-blue-100 text-blue-700",
    delivery: "bg-emerald-100 text-emerald-700",
    superadmin: "bg-orange-100 text-orange-700",
  };
  const roleLabels: Record<UserRole, string> = {
    admin: "Admin",
    staff: "Staff / Booker",
    delivery: "Delivery",
    superadmin: "Super Admin",
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.22 0.14 260) 0%, oklch(0.15 0.08 250) 100%)",
      }}
    >
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: "oklch(0.65 0.2 255)" }}
        />
        <div
          className="absolute -bottom-10 -left-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: "oklch(0.6 0.18 200)" }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 pt-12 pb-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-2xl"
            style={{ background: "oklch(0.42 0.18 255)" }}
          >
            <Package size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white font-heading tracking-tight">
            MedFlow
          </h1>
          <p className="text-white/60 text-sm mt-1 text-center">
            Medicine Distributors
            <br />
            <span className="text-xs">میڈیسن ڈسٹریبیوٹر — مندی بہاؤالدین</span>
          </p>
        </div>

        {/* Login Card */}
        <div
          className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: "oklch(0.98 0 0)" }}
        >
          {/* Card header strip */}
          <div
            className="px-6 py-4"
            style={{ background: "oklch(0.42 0.18 255)" }}
          >
            <h2 className="text-lg font-bold text-white font-heading">
              Login | لاگ ان
            </h2>
            <p className="text-white/70 text-xs mt-0.5">
              Enter your credentials to access your dashboard
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="login-username"
                className="text-sm font-semibold text-gray-700 mb-1.5 block"
              >
                Username | یوزر نیم
              </label>
              <Input
                id="login-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter your username"
                className="h-11 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoggingIn}
                autoComplete="username"
                data-ocid="login.input"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="text-sm font-semibold text-gray-700 mb-1.5 block"
              >
                Password | پاس ورڈ
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  className="h-11 text-sm pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                  data-ocid="login.password.input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5"
                data-ocid="login.error_state"
              >
                <X size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              className="w-full h-11 text-sm font-bold tracking-wide"
              disabled={isLoggingIn}
              data-ocid="login.submit_button"
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

            {/* Role hint */}
            <div className="pt-1 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center mb-2">
                System will redirect based on your role | سسٹم آپ کے کردار کے
                مطابق ری ڈائریکٹ کرے گا
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {(["admin", "staff", "delivery"] as UserRole[]).map((r) => (
                  <span
                    key={r}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadgeColors[r]}`}
                  >
                    {roleLabels[r]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Login Toggle */}
      <div className="mt-3 w-full max-w-sm">
        <button
          type="button"
          onClick={() => setShowSuperAdminLogin((v) => !v)}
          className="w-full text-center text-white/30 text-xs hover:text-white/50 transition-colors py-1"
          data-ocid="superadmin.toggle"
        >
          {showSuperAdminLogin ? "Hide" : "Super Admin | سپر ایڈمن"}
        </button>
        {showSuperAdminLogin && (
          <div
            className="mt-2 rounded-2xl shadow-xl overflow-hidden"
            style={{ background: "oklch(0.98 0 0)" }}
          >
            <div
              className="px-5 py-3"
              style={{ background: "oklch(0.35 0.15 260)" }}
            >
              <h3 className="text-sm font-bold text-white">
                Super Admin Login | سپر ایڈمن لاگ ان
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Username
                </p>
                <Input
                  id="sa-username"
                  value="superadmin"
                  readOnly
                  className="h-9 text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Password | پاس ورڈ
                </p>
                <Input
                  id="sa-password"
                  type="password"
                  value={superAdminPassword}
                  onChange={(e) => setSuperAdminPassword(e.target.value)}
                  placeholder="Super Admin password"
                  className="h-9 text-sm"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSuperAdminLogin()
                  }
                  data-ocid="superadmin.input"
                />
              </div>
              <Button
                onClick={handleSuperAdminLogin}
                disabled={isSuperAdminLoggingIn}
                className="w-full h-9 text-sm font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.35 0.15 260), oklch(0.25 0.12 255))",
                }}
                data-ocid="superadmin.submit_button"
              >
                {isSuperAdminLoggingIn ? (
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
        )}
      </div>

      {/* Footer */}
      <div className="relative text-center py-4 text-white/30 text-xs pb-8">
        © {new Date().getFullYear()}. Built with ♥ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline text-white/50"
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
  actor,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  pharmacies: Pharmacy[];
  isLoadingData: boolean;
  onRefreshOrders: () => void;
  onOpenMenu: () => void;
  actor: backendInterface | null;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = state.orders.filter((o) => o.date === todayStr);
  const visitedCount = pharmacies.filter((p) => p.isVisited).length;
  const pendingCount = state.orders.filter(
    (o) => o.status === "pending",
  ).length;
  const recentOrders = state.orders.filter((o) => o.date === todayStr);
  const offlineOrders = state.orders.filter((o) => o.id.startsWith("OFFLINE-"));
  const [isConfirmingAllToday, setIsConfirmingAllToday] = useState(false);

  const todayPendingOrders = todayOrders.filter((o) => o.status === "pending");

  async function handleConfirmAllToday() {
    if (!actor) return;
    const toConfirm = todayPendingOrders.filter(
      (o) => o.backendId !== null && (o.returnItems ?? []).length === 0,
    );
    if (toConfirm.length === 0) {
      toast.info("No pending orders to confirm for today");
      return;
    }
    setIsConfirmingAllToday(true);
    try {
      await Promise.all(
        toConfirm.map((o) =>
          o.backendId !== null
            ? actor.updateOrderStatus(
                o.backendId,
                mapLocalStatusToBackend("confirmed"),
              )
            : Promise.resolve(),
        ),
      );
      for (const o of toConfirm) {
        dispatch({ type: "UPDATE_STATUS", orderId: o.id, status: "confirmed" });
      }
      toast.success(
        `${toConfirm.length} today's orders confirmed | ${toConfirm.length} آج کے آرڈر تصدیق ہو گئے`,
      );
      onRefreshOrders();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error confirming orders: ${msg}`);
    } finally {
      setIsConfirmingAllToday(false);
    }
  }

  const username = state.currentStaff?.id ?? "";
  const locationAskedKey = `medorder_location_asked_${username}`;
  const [locationAsked, setLocationAsked] = useState<string | null>(() => {
    try {
      return localStorage.getItem(locationAskedKey);
    } catch {
      return null;
    }
  });
  const locationEnabled = locationAsked === "yes";
  useLocationTracking(username, "staff", locationEnabled);

  function handleAllowLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(locationAskedKey, "yes");
          localStorage.setItem(
            `medorder_location_${username}`,
            JSON.stringify({
              username,
              role: "staff",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              updatedAt: new Date().toISOString(),
            }),
          );
        } catch {
          /* ignore */
        }
        setLocationAsked("yes");
      },
      () => {
        try {
          localStorage.setItem(locationAskedKey, "denied");
        } catch {
          /* ignore */
        }
        setLocationAsked("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

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

      {/* Location permission banner */}
      {!locationAsked && (
        <div
          className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2.5 text-sm"
          data-ocid="dashboard.location_banner"
        >
          <MapPin size={15} className="shrink-0 opacity-80" />
          <span className="flex-1 text-xs">
            Share your location for real-time tracking | اپنی جگہ شیئر کریں
          </span>
          <button
            type="button"
            data-ocid="dashboard.location_allow_button"
            onClick={handleAllowLocation}
            className="bg-white text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
          >
            Allow | اجازت
          </button>
          <button
            type="button"
            data-ocid="dashboard.location_later_button"
            onClick={() => {
              try {
                localStorage.setItem(locationAskedKey, "later");
              } catch {
                /* ignore */
              }
              setLocationAsked("later");
            }}
            className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
          >
            Later | بعد میں
          </button>
        </div>
      )}

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

        {/* Confirm All Today's Orders */}
        {todayPendingOrders.length > 0 && (
          <button
            type="button"
            data-ocid="dashboard.confirm_all_today_button"
            onClick={handleConfirmAllToday}
            disabled={isConfirmingAllToday}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-2xl p-3.5 font-semibold text-sm transition-colors"
          >
            {isConfirmingAllToday ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Confirm All Today's Orders | آج کے سب آرڈر تصدیق کریں
            <span className="bg-white/25 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {todayPendingOrders.length}
            </span>
          </button>
        )}

        {/* Today's Orders + Offline Orders Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-foreground font-heading">
                Today's Orders | آج کے آرڈر
              </h2>
              {offlineOrders.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {offlineOrders.length} offline
                </span>
              )}
            </div>
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
                History
              </button>
            </div>
          </div>
          {/* Offline Orders warning */}
          {offlineOrders.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-700">
                {offlineOrders.length} offline order(s) pending sync | آف لائن
                آرڈر
              </p>
              <p className="text-[10px] text-amber-600 mt-0.5">
                Internet aane par automatically sync ho jayenge
              </p>
              <div className="mt-2 space-y-2">
                {offlineOrders.map((order) => (
                  <button
                    type="button"
                    key={order.id}
                    onClick={() =>
                      dispatch({
                        type: "NAVIGATE",
                        screen: { name: "order-detail", orderId: order.id },
                      })
                    }
                    className="w-full bg-white rounded-lg p-2.5 border border-amber-200 text-left"
                    data-ocid="dashboard.offline_order.item"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-foreground">
                        {order.pharmacyName}
                      </p>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                        Offline
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {order.items.length} items ·{" "}
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : recentOrders.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground text-sm"
                data-ocid="dashboard.orders.empty_state"
              >
                Aaj ka koi order nahi | No orders today
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
                    {pharmacy.code && (
                      <div className="mt-1">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono font-semibold">
                          Code: {pharmacy.code}
                        </span>
                      </div>
                    )}
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

// ─── Stock helpers (localStorage-backed) ────────────────────────────────────

function getStock(backendId: bigint): number | null {
  try {
    const raw = localStorage.getItem(`medorder_stock_${backendId}`);
    return raw !== null && raw !== "" ? Number(raw) : null;
  } catch {
    return null;
  }
}

function setStock(backendId: bigint, qty: number) {
  try {
    localStorage.setItem(`medorder_stock_${backendId}`, String(qty));
  } catch {
    /* ignore */
  }
}

function deductStock(lines: Array<{ backendId: bigint; qty: number }>) {
  for (const line of lines) {
    const cur = getStock(line.backendId);
    if (cur !== null) setStock(line.backendId, Math.max(0, cur - line.qty));
  }
}

function restoreStock(lines: Array<{ backendId: bigint; qty: number }>) {
  for (const line of lines) {
    const cur = getStock(line.backendId);
    if (cur !== null) setStock(line.backendId, cur + line.qty);
  }
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
  isOfflineMode,
  onSaveOfflineOrder,
  stockMap,
}: {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  pharmacyId: string;
  pharmacies: Pharmacy[];
  medicines: Medicine[];
  onOrderSubmitted: () => void;
  actor: backendInterface | null;
  isOfflineMode?: boolean;
  onSaveOfflineOrder?: (order: Order) => void;
  stockMap?: Record<string, number>;
}) {
  const pharmacy = pharmacies.find((p) => p.id === pharmacyId);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bonusDiscountMap, setBonusDiscountMap] = useState<
    Record<
      string,
      {
        bonus: number;
        discount: number;
        distDisc: number;
        compDisc: number;
        netRate: number | null;
      }
    >
  >({});

  function getBonusDiscount(medicineId: string) {
    return (
      bonusDiscountMap[medicineId] ?? {
        bonus: 0,
        discount: 0,
        distDisc: 0,
        compDisc: 0,
        netRate: null,
      }
    );
  }

  function updateBonus(medicineId: string, bonus: number) {
    setBonusDiscountMap((prev) => ({
      ...prev,
      [medicineId]: { ...getBonusDiscount(medicineId), bonus },
    }));
  }

  function updateDistDisc(medicineId: string, distDisc: number) {
    setBonusDiscountMap((prev) => ({
      ...prev,
      [medicineId]: {
        ...getBonusDiscount(medicineId),
        distDisc,
        netRate: null,
      },
    }));
  }

  function updateCompDisc(medicineId: string, compDisc: number) {
    setBonusDiscountMap((prev) => ({
      ...prev,
      [medicineId]: {
        ...getBonusDiscount(medicineId),
        compDisc,
        netRate: null,
      },
    }));
  }

  function updateNetRate(medicineId: string, val: number | null) {
    setBonusDiscountMap((prev) => ({
      ...prev,
      [medicineId]: { ...getBonusDiscount(medicineId), netRate: val },
    }));
  }

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

    const items: OrderItem[] = state.cart.map((ci) => {
      const bd = getBonusDiscount(ci.medicine.id);
      const distDisc = bd.distDisc ?? 0;
      const compDisc = bd.compDisc ?? 0;
      const manualNetRate = bd.netRate;
      return {
        medicineId: ci.medicine.id,
        medicineName: ci.medicine.name,
        company: ci.medicine.company,
        strength: ci.medicine.strength,
        qty: ci.qty,
        unitPrice: ci.medicine.price,
        total: ci.medicine.price * ci.qty,
        bonusQty: bd.bonus ?? 0,
        discountPercent: 0,
        distributionDiscount: Math.round(distDisc * 10),
        companyDiscount: Math.round(compDisc * 10),
        manualNetRate: manualNetRate !== null ? manualNetRate : undefined,
      };
    });

    // Offline mode: save locally
    if (isOfflineMode) {
      const offlineOrder: Order = {
        id: `OFFLINE-${Date.now()}`,
        backendId: null,
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
      dispatch({ type: "SUBMIT_ORDER", order: offlineOrder });
      onSaveOfflineOrder?.(offlineOrder);
      setShowCart(false);
      toast.success(
        `Order saved offline for ${pharmacy.name}! Sync when online.`,
      );
      dispatch({ type: "NAVIGATE", screen: { name: "dashboard" } });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!actor) {
        toast.error("Backend not ready. Please try again.");
        return;
      }

      // Build order lines using backend IDs (with bonus/discount)
      // distributionDiscount/companyDiscount stored as integer * 10 to support decimals
      // netRate stored as * 100 (paise) to preserve decimals
      const orderLines = state.cart.map((ci) => {
        const bd = getBonusDiscount(ci.medicine.id);
        const distDisc = bd.distDisc ?? 0;
        const compDisc = bd.compDisc ?? 0;
        const autoNetRate =
          ci.medicine.price * (1 - (distDisc + compDisc) / 100);
        const manualNetRate = bd.netRate;
        return {
          medicineId: ci.medicine.backendId,
          quantity: Math.round(ci.qty),
          bonusQty: BigInt(Math.round(bd.bonus ?? 0)),
          discountPercent: BigInt(0),
          distributionDiscount: BigInt(Math.round(distDisc * 10)),
          companyDiscount: BigInt(Math.round(compDisc * 10)),
          netRate: BigInt(Math.round((manualNetRate ?? autoNetRate) * 100)),
        };
      });

      // Create order in backend
      const staffCreateSess = getSession();
      const staffDistId = staffCreateSess?.distributorId
        ? BigInt(staffCreateSess.distributorId)
        : null;
      const returnedId = staffDistId
        ? await (actor as any).createOrderForDistributor(
            staffDistId,
            pharmacy.backendId,
            orderLines,
            state.currentStaff?.name ?? "",
            state.currentStaff?.id ?? "",
            notes,
          )
        : await actor.createOrder(
            pharmacy.backendId,
            orderLines,
            state.currentStaff?.name ?? "",
            state.currentStaff?.id ?? "",
            notes,
          );

      const orderId = `ORD-${returnedId}`;

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

      // Deduct stock for ordered items (localStorage)
      deductStock(
        state.cart.map((ci) => ({
          backendId: ci.medicine.backendId,
          qty: Math.round(ci.qty),
        })),
      );
      // Sync inventory deduction to backend (fire-and-forget, don't block)
      Promise.all(
        state.cart.map((ci) =>
          actor
            .adjustInventoryStock(
              ci.medicine.backendId,
              BigInt(-Math.round(ci.qty)),
            )
            .catch(() => {}),
        ),
      );
      dispatch({ type: "SUBMIT_ORDER", order });

      // Save Co% items to estimated pool automatically
      const coItems = items.filter((it) => (it.companyDiscount ?? 0) > 0);
      if (coItems.length > 0) {
        try {
          const pool = JSON.parse(
            localStorage.getItem("estimatedOrders_pool") || "[]",
          );
          pool.push({
            id: String(Date.now()),
            orderId: orderId,
            staffName: state.currentStaff?.name ?? "",
            pharmacyId: pharmacy.id,
            pharmacyName: pharmacy.name,
            timestamp: Date.now(),
            items: coItems.map((it) => ({
              medicineId: it.medicineId,
              medicineName: it.medicineName,
              qty: it.qty,
              companyDiscount: it.companyDiscount ?? 0,
              distributionDiscount: it.distributionDiscount ?? 0,
              netRate: it.manualNetRate,
              unitPrice: it.unitPrice,
              total: it.total,
              bonusQty: it.bonusQty,
            })),
          });
          localStorage.setItem("estimatedOrders_pool", JSON.stringify(pool));
        } catch {
          /* ignore */
        }
      }

      setShowCart(false);
      toast.success(`Order submitted for ${pharmacy.name}!`);
      onOrderSubmitted();
      dispatch({ type: "NAVIGATE", screen: { name: "order-history" } });
    } catch {
      if (!navigator.onLine) {
        // Actually offline - save locally
        const offlineOrder: Order = {
          id: `OFFLINE-${Date.now()}`,
          backendId: null,
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
        dispatch({ type: "SUBMIT_ORDER", order: offlineOrder });
        onSaveOfflineOrder?.(offlineOrder);
        setShowCart(false);
        toast.success("Order saved offline! Will sync when online.");
        dispatch({ type: "NAVIGATE", screen: { name: "order-history" } });
      } else {
        // Online but backend failed
        toast.error("Failed to save order. Backend error — please try again.");
      }
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
            const stockMapVal = stockMap
              ? stockMap[String(med.backendId)]
              : undefined;
            const localStockVal = getStock(med.backendId);
            // If not in backend stockMap, use localStorage; if neither has data, show 0 (Out of Stock)
            const stockQty =
              stockMapVal !== undefined
                ? stockMapVal
                : localStockVal !== null
                  ? localStockVal
                  : 0;
            // Compute stock badge props
            const stockBadge = (() => {
              if (stockQty === 0)
                return { text: "Out of Stock", cls: "bg-red-100 text-red-700" };
              if (qty > 0 && qty > stockQty)
                return {
                  text: `Over stock! (has: ${stockQty})`,
                  cls: "bg-red-100 text-red-700",
                };
              if (qty > 0)
                return {
                  text: `After: ${stockQty - qty} left`,
                  cls: "bg-emerald-100 text-emerald-700",
                };
              return {
                text: `Stock: ${stockQty}`,
                cls:
                  stockQty > 10
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700",
              };
            })();
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
                      {stockBadge && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stockBadge.cls}`}
                        >
                          {stockBadge.text}
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
                  {/* Qty + Bonus + Discount controls */}
                  <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={qty === 0 ? "" : qty}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value) || 0;
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
                    {qty > 0 && (
                      <>
                        <label className="flex items-center gap-1">
                          <span className="text-[9px] text-emerald-600 font-medium">
                            Bonus
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={
                              getBonusDiscount(med.id).bonus === 0
                                ? ""
                                : getBonusDiscount(med.id).bonus
                            }
                            placeholder="0"
                            onChange={(e) => {
                              const val =
                                Number.parseFloat(e.target.value) || 0;
                              updateBonus(med.id, Number.isNaN(val) ? 0 : val);
                            }}
                            className="w-12 text-center text-xs font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Bonus quantity"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="text-[9px] text-amber-600 font-medium">
                            Dist%
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={
                              getBonusDiscount(med.id).distDisc === 0
                                ? ""
                                : getBonusDiscount(med.id).distDisc
                            }
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number.parseFloat(e.target.value) || 0,
                                ),
                              );
                              updateDistDisc(
                                med.id,
                                Number.isNaN(val) ? 0 : val,
                              );
                            }}
                            className="w-12 text-center text-xs font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Distribution discount percent"
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="text-[9px] text-blue-600 font-medium">
                            Co%
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={
                              getBonusDiscount(med.id).compDisc === 0
                                ? ""
                                : getBonusDiscount(med.id).compDisc
                            }
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number.parseFloat(e.target.value) || 0,
                                ),
                              );
                              updateCompDisc(
                                med.id,
                                Number.isNaN(val) ? 0 : val,
                              );
                            }}
                            className="w-12 text-center text-xs font-bold text-blue-700 border border-blue-300 bg-blue-50 rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Company discount percent"
                          />
                        </label>
                        {/* Net Rate — editable, with auto-reset */}
                        {(() => {
                          const bd = getBonusDiscount(med.id);
                          const isManual = bd.netRate !== null;
                          return (
                            <div className="flex items-center gap-0.5">
                              <span className="text-[9px] text-gray-500 font-medium">
                                Net
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={isManual ? bd.netRate! : ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = Number.parseFloat(e.target.value);
                                  if (!e.target.value || Number.isNaN(val)) {
                                    updateNetRate(med.id, null);
                                  } else {
                                    updateNetRate(med.id, val);
                                  }
                                }}
                                className={`w-14 text-center text-xs font-bold rounded px-1 py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  isManual
                                    ? "text-purple-700 border border-purple-400 bg-purple-50"
                                    : "text-gray-700 border border-gray-200 bg-gray-100"
                                }`}
                                aria-label="Net rate"
                              />
                              {isManual && (
                                <button
                                  type="button"
                                  onClick={() => updateNetRate(med.id, null)}
                                  className="text-[9px] text-gray-400 hover:text-gray-600 leading-none"
                                  title="Reset to auto"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </>
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
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {state.cart.map((ci) => {
                  const bd = getBonusDiscount(ci.medicine.id);
                  return (
                    <div
                      key={ci.medicine.id}
                      className="py-2.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {ci.medicine.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ci.medicine.strength} · {ci.medicine.company}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0">
                          <p className="text-sm font-bold text-primary text-right">
                            {formatCurrency(ci.medicine.price * ci.qty)}
                          </p>
                        </div>
                      </div>
                      {/* Qty + Bonus + Discount row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Qty | مقدار
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={ci.qty}
                            onChange={(e) => {
                              const val =
                                Number.parseFloat(e.target.value) || 0;
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
                            className="w-14 text-center text-sm font-bold text-foreground border border-input rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Quantity"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-emerald-600 font-medium">
                            Bonus | بونس
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={bd.bonus === 0 ? "" : bd.bonus}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateBonus(
                                ci.medicine.id,
                                Number.isNaN(val) ? 0 : val,
                              );
                            }}
                            className="w-14 text-center text-sm font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Bonus quantity"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-amber-600 font-medium">
                            Dist% | تقسیم
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={bd.distDisc === 0 ? "" : bd.distDisc}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number.parseFloat(e.target.value) || 0,
                                ),
                              );
                              updateDistDisc(
                                ci.medicine.id,
                                Number.isNaN(val) ? 0 : val,
                              );
                            }}
                            className="w-14 text-center text-sm font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Distribution discount percent"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-blue-600 font-medium">
                            Co% | کمپنی
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={bd.compDisc === 0 ? "" : bd.compDisc}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(
                                100,
                                Math.max(
                                  0,
                                  Number.parseFloat(e.target.value) || 0,
                                ),
                              );
                              updateCompDisc(
                                ci.medicine.id,
                                Number.isNaN(val) ? 0 : val,
                              );
                            }}
                            className="w-14 text-center text-sm font-bold text-blue-700 border border-blue-300 bg-blue-50 rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label="Company discount percent"
                          />
                        </label>
                        <label className="flex flex-col items-center gap-0.5">
                          <span
                            className={`text-[10px] font-medium ${bd.netRate !== null ? "text-purple-600" : "text-gray-500"}`}
                          >
                            Net | نیٹ
                          </span>
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={bd.netRate !== null ? bd.netRate : ""}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Number.parseFloat(e.target.value);
                                if (!e.target.value || Number.isNaN(val)) {
                                  updateNetRate(ci.medicine.id, null);
                                } else {
                                  updateNetRate(ci.medicine.id, val);
                                }
                              }}
                              className={`w-16 text-center text-sm font-bold rounded-md px-1 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                bd.netRate !== null
                                  ? "text-purple-700 border border-purple-400 bg-purple-50 focus:ring-purple-500"
                                  : "text-gray-700 border border-gray-300 bg-gray-50 focus:ring-gray-400"
                              } focus:outline-none focus:ring-1`}
                              aria-label="Net rate"
                            />
                            {bd.netRate !== null && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateNetRate(ci.medicine.id, null)
                                }
                                className="text-gray-400 hover:text-gray-600 text-xs leading-none"
                                title="Auto"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
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
                data-ocid="order.submit_button"
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

function buildStaffDatePrintHtml(orders: Order[]): string {
  const invoices = orders
    .map((order) => {
      const itemRows = order.items
        .map((item) => {
          const distDisc = (item.distributionDiscount ?? 0) / 10;
          const compDisc = (item.companyDiscount ?? 0) / 10;
          const netRate =
            item.manualNetRate ??
            item.unitPrice * (1 - (distDisc + compDisc) / 100);
          return `<tr>
        <td style="padding:4px 6px;border:1px solid #ddd">${item.medicineName}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${item.qty}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${item.bonusQty ?? 0}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:right">${distDisc > 0 ? `${distDisc.toFixed(1)}%` : "-"}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:right">Rs ${netRate.toFixed(2)}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:right">Rs ${(netRate * item.qty).toFixed(2)}</td>
      </tr>`;
        })
        .join("");
      return `<div style="page-break-after:always;padding:20px;font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
      <div style="text-align:center;margin-bottom:12px">
        <h2 style="margin:0;font-size:18px">MIAN MEDICINE DISTRIBUTORS</h2>
        <p style="margin:2px 0;font-size:12px;color:#555">Invoice | بل</p>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px">
        <div><strong>Invoice#:</strong> ${order.id}</div>
        <div><strong>Date:</strong> ${order.date}</div>
      </div>
      <div style="margin-bottom:12px;font-size:13px">
        <strong>Customer:</strong> ${order.pharmacyName}<br/>
        <strong>Booker:</strong> ${order.staffName}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
        <thead>
          <tr style="background:#f0f4ff">
            <th style="padding:6px;border:1px solid #ddd;text-align:left">Medicine</th>
            <th style="padding:6px;border:1px solid #ddd">Qty</th>
            <th style="padding:6px;border:1px solid #ddd">Bonus</th>
            <th style="padding:6px;border:1px solid #ddd">Disc%</th>
            <th style="padding:6px;border:1px solid #ddd">Net Rate</th>
            <th style="padding:6px;border:1px solid #ddd">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="text-align:right;font-size:14px;font-weight:bold">
        Total: Rs ${order.totalAmount.toFixed(2)}
      </div>
      <div style="text-align:center;margin-top:16px;font-size:11px;color:#888">
        Status: ${order.status.toUpperCase()}
      </div>
    </div>`;
    })
    .join("");
  return `<!DOCTYPE html><html><head><title>Invoices</title>
  <style>@media print{body{margin:0}}</style>
  </head><body>${invoices}</body></html>`;
}

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
  const todayStr = new Date().toISOString().split("T")[0];
  const pastOrders = state.orders.filter((o) => o.date !== todayStr);

  // Group by month then by date
  const grouped = useMemo(() => {
    const monthMap: Record<string, Record<string, Order[]>> = {};
    for (const order of pastOrders) {
      const dateObj = new Date(`${order.date}T00:00:00`);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[monthKey]) monthMap[monthKey] = {};
      if (!monthMap[monthKey][order.date]) monthMap[monthKey][order.date] = [];
      monthMap[monthKey][order.date].push(order);
    }
    // Sort months descending
    return Object.entries(monthMap).sort((a, b) => b[0].localeCompare(a[0]));
  }, [pastOrders]);

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  function formatMonthLabel(monthKey: string) {
    const [year, month] = monthKey.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  }

  function formatDateLabel(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("default", { day: "numeric", month: "long" });
  }

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
              {pastOrders.length} past orders
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

      <div className="px-4 pt-4 space-y-2">
        {isLoadingOrders ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : grouped.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground text-sm"
            data-ocid="order_history.empty_state"
          >
            Koi purane order nahi | No past orders
          </div>
        ) : (
          grouped.map(([monthKey, dateMap]) => {
            const monthOrderCount = Object.values(dateMap).reduce(
              (acc, orders) => acc + orders.length,
              0,
            );
            const isMonthOpen = expandedMonth === monthKey;
            const sortedDates = Object.entries(dateMap).sort((a, b) =>
              b[0].localeCompare(a[0]),
            );
            return (
              <div
                key={monthKey}
                className="bg-white rounded-xl border border-border shadow-xs overflow-hidden"
              >
                {/* Level 1: Month row */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedMonth(isMonthOpen ? null : monthKey);
                    setExpandedDate(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
                  data-ocid="order_history.month.button"
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    <span className="font-bold text-foreground font-heading">
                      {formatMonthLabel(monthKey)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                      {monthOrderCount} orders
                    </span>
                    {isMonthOpen ? (
                      <ChevronUp size={16} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                </button>

                {/* Level 2: Dates within month */}
                {isMonthOpen && (
                  <div className="border-t border-border">
                    {sortedDates.map(([dateStr, orders]) => {
                      const isDateOpen = expandedDate === dateStr;
                      return (
                        <div
                          key={dateStr}
                          className="border-b border-border last:border-0"
                        >
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedDate(isDateOpen ? null : dateStr)
                              }
                              className="flex-1 flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors"
                              data-ocid="order_history.date.button"
                            >
                              <div className="flex items-center gap-2 pl-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                <span className="font-semibold text-sm text-foreground">
                                  {formatDateLabel(dateStr)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {orders.length} orders
                                </span>
                                {isDateOpen ? (
                                  <ChevronUp
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const win = window.open("", "_blank");
                                if (!win) return;
                                win.document.write(
                                  buildStaffDatePrintHtml(orders),
                                );
                                win.document.close();
                                win.print();
                              }}
                              className="px-3 py-3 bg-muted/30 hover:bg-blue-50 transition-colors border-l border-border text-blue-600"
                              title="Print invoices for this date"
                              data-ocid="order_history.date.print_button"
                            >
                              <Printer size={14} />
                            </button>
                          </div>

                          {/* Level 3: Orders for this date */}
                          {isDateOpen && (
                            <div className="px-3 py-2 space-y-2 bg-white">
                              {orders.map((order) => (
                                <button
                                  type="button"
                                  key={order.id}
                                  onClick={() =>
                                    dispatch({
                                      type: "NAVIGATE",
                                      screen: {
                                        name: "order-detail",
                                        orderId: order.id,
                                      },
                                    })
                                  }
                                  className="w-full bg-secondary/50 rounded-xl p-3 border border-border text-left hover:bg-muted transition-colors"
                                  data-ocid="order_history.order.item"
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="font-semibold text-sm text-foreground">
                                        {order.pharmacyName}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {order.id}
                                      </p>
                                    </div>
                                    <StatusBadge status={order.status} />
                                  </div>
                                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{order.items.length} items</span>
                                    <span className="font-bold text-foreground">
                                      {formatCurrency(order.totalAmount)}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLines, setEditLines] = useState<
    Array<{
      _key: string;
      medicineId: string;
      medicineName: string;
      qty: string;
      bonus: string;
      distDisc: string;
      compDisc: string;
      netRate: string;
      unitPrice: number;
    }>
  >([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editMedSearch, setEditMedSearch] = useState<Record<string, string>>(
    {},
  );
  const [editMedDropOpen, setEditMedDropOpen] = useState<
    Record<string, boolean>
  >({});

  // medicines come from state.medicines (local) - fallback to order items for names
  const availableMedicines = (state as any).medicines as Medicine[] | undefined;

  function openEditModal() {
    if (!order) return;
    setEditLines(
      order.items.map((item) => ({
        _key: `edit-${item.medicineId}-${Date.now()}`,
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        qty: String(item.qty),
        bonus: String(item.bonusQty ?? 0),
        distDisc: String((item.distributionDiscount ?? 0) / 10),
        compDisc: String((item.companyDiscount ?? 0) / 10),
        netRate: String(item.manualNetRate ?? 0),
        unitPrice: item.unitPrice,
      })),
    );
    setShowEditModal(true);
  }

  async function handleSaveEdit() {
    if (!order || !actor || order.backendId === null) return;
    setIsSavingEdit(true);
    try {
      const orderLines = editLines.map((line) => {
        const distD = Number.parseFloat(line.distDisc) || 0;
        const compD = Number.parseFloat(line.compDisc) || 0;
        const manualNet = Number.parseFloat(line.netRate) || 0;
        const autoNet = line.unitPrice * (1 - (distD + compD) / 100);
        return {
          medicineId: BigInt(line.medicineId),
          quantity: Math.round(Number.parseFloat(line.qty) || 1),
          bonusQty: BigInt(Math.round(Number.parseFloat(line.bonus) || 0)),
          discountPercent: BigInt(0),
          distributionDiscount: BigInt(Math.round(distD * 10)),
          companyDiscount: BigInt(Math.round(compD * 10)),
          netRate: BigInt(
            Math.round((manualNet > 0 ? manualNet : autoNet) * 100),
          ),
        };
      });
      // Find pharmacyId (backendId) from state pharmacies
      const pharmacy = (state as any).pharmacies?.find(
        (p: Pharmacy) => p.id === order.pharmacyId,
      );
      const pharmacyBackendId = pharmacy?.backendId ?? BigInt(0);
      await actor.updateOrderLines(
        order.backendId,
        pharmacyBackendId,
        orderLines,
        order.notes ?? "",
      );
      toast.success("Order updated successfully | آرڈر اپ ڈیٹ ہو گیا");
      setShowEditModal(false);
      onStatusUpdated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error updating order: ${msg}`);
    } finally {
      setIsSavingEdit(false);
    }
  }

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
            <div className="flex items-center gap-2">
              {order.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditModal}
                  className="text-xs h-8 gap-1.5"
                  data-ocid="order_detail.edit_button"
                >
                  <Pencil size={12} />
                  Edit
                </Button>
              )}
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
        </div>

        {/* Edit Order Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-5 py-4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
                }}
              >
                <h2 className="font-bold font-heading text-base">
                  Edit Order | آرڈر ترمیم
                </h2>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1">
                  <div className="col-span-4">Medicine</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-1 text-center">Bonus</div>
                  <div className="col-span-2 text-center">Dist%</div>
                  <div className="col-span-2 text-center">Co%</div>
                  <div className="col-span-1 text-center">Net</div>
                  <div className="col-span-1" />
                </div>
                {editLines.map((line) => (
                  <div
                    key={line._key}
                    className="grid grid-cols-12 gap-1 items-center"
                  >
                    <div className="col-span-4 relative">
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            editMedDropOpen[line._key]
                              ? (editMedSearch[line._key] ?? "")
                              : line.medicineName
                          }
                          onChange={(e) => {
                            setEditMedSearch((prev) => ({
                              ...prev,
                              [line._key]: e.target.value,
                            }));
                            setEditMedDropOpen((prev) => ({
                              ...prev,
                              [line._key]: true,
                            }));
                          }}
                          onFocus={() => {
                            setEditMedSearch((prev) => ({
                              ...prev,
                              [line._key]: "",
                            }));
                            setEditMedDropOpen((prev) => ({
                              ...prev,
                              [line._key]: true,
                            }));
                          }}
                          onKeyDown={() => {
                            if (!editMedDropOpen[line._key]) {
                              setEditMedSearch((prev) => ({
                                ...prev,
                                [line._key]: "",
                              }));
                              setEditMedDropOpen((prev) => ({
                                ...prev,
                                [line._key]: true,
                              }));
                            }
                          }}
                          placeholder="Medicine..."
                          className="w-full h-8 text-xs border border-gray-300 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      {editMedDropOpen[line._key] && availableMedicines && (
                        <>
                          <div className="absolute z-20 top-full mt-0.5 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                            {(() => {
                              const q = (
                                editMedSearch[line._key] ?? ""
                              ).toLowerCase();
                              const filtered = availableMedicines.filter(
                                (m) => {
                                  if (!q) return true;
                                  return (
                                    m.name.toLowerCase().includes(q) ||
                                    m.company.toLowerCase().includes(q)
                                  );
                                },
                              );
                              return filtered.length === 0 ? (
                                <div className="px-2 py-1.5 text-xs text-gray-400">
                                  No medicines found
                                </div>
                              ) : (
                                filtered.map((m) => (
                                  <button
                                    type="button"
                                    key={String(m.backendId)}
                                    onClick={() => {
                                      setEditLines((prev) =>
                                        prev.map((l) =>
                                          l._key === line._key
                                            ? {
                                                ...l,
                                                medicineId: String(m.backendId),
                                                medicineName: m.name,
                                                unitPrice: m.price,
                                              }
                                            : l,
                                        ),
                                      );
                                      setEditMedDropOpen((prev) => ({
                                        ...prev,
                                        [line._key]: false,
                                      }));
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 transition-colors"
                                  >
                                    {m.name}
                                    {m.strength && (
                                      <span className="text-gray-400 ml-1">
                                        ({m.strength})
                                      </span>
                                    )}
                                  </button>
                                ))
                              );
                            })()}
                          </div>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() =>
                              setEditMedDropOpen((prev) => ({
                                ...prev,
                                [line._key]: false,
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === "Escape" &&
                              setEditMedDropOpen((prev) => ({
                                ...prev,
                                [line._key]: false,
                              }))
                            }
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.qty}
                        onChange={(e) =>
                          setEditLines((prev) =>
                            prev.map((l) =>
                              l._key === line._key
                                ? { ...l, qty: e.target.value }
                                : l,
                            ),
                          )
                        }
                        className="w-full h-8 border border-gray-300 rounded-lg px-1 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={line.bonus}
                        onChange={(e) =>
                          setEditLines((prev) =>
                            prev.map((l) =>
                              l._key === line._key
                                ? { ...l, bonus: e.target.value }
                                : l,
                            ),
                          )
                        }
                        className="w-full h-8 border border-emerald-300 bg-emerald-50 rounded-lg px-1 text-xs text-center text-emerald-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={line.distDisc}
                        onChange={(e) =>
                          setEditLines((prev) =>
                            prev.map((l) =>
                              l._key === line._key
                                ? { ...l, distDisc: e.target.value }
                                : l,
                            ),
                          )
                        }
                        className="w-full h-8 border border-amber-300 bg-amber-50 rounded-lg px-1 text-xs text-center text-amber-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={line.compDisc}
                        onChange={(e) =>
                          setEditLines((prev) =>
                            prev.map((l) =>
                              l._key === line._key
                                ? { ...l, compDisc: e.target.value }
                                : l,
                            ),
                          )
                        }
                        className="w-full h-8 border border-blue-300 bg-blue-50 rounded-lg px-1 text-xs text-center text-blue-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={line.netRate === "0" ? "" : line.netRate}
                        onChange={(e) =>
                          setEditLines((prev) =>
                            prev.map((l) =>
                              l._key === line._key
                                ? { ...l, netRate: e.target.value || "0" }
                                : l,
                            ),
                          )
                        }
                        className="w-full h-8 border border-purple-300 bg-purple-50 rounded-lg px-1 text-xs text-center text-purple-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setEditLines((prev) =>
                            prev.filter((l) => l._key !== line._key),
                          )
                        }
                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {availableMedicines && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditLines((prev) => [
                        ...prev,
                        {
                          _key: `edit-new-${Date.now()}`,
                          medicineId: String(
                            availableMedicines[0]?.backendId ?? BigInt(0),
                          ),
                          medicineName: availableMedicines[0]?.name ?? "",
                          qty: "1",
                          bonus: "0",
                          distDisc: "0",
                          compDisc: "0",
                          netRate: "0",
                          unitPrice: availableMedicines[0]?.price ?? 0,
                        },
                      ])
                    }
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    <Plus size={12} />
                    Add Item
                  </button>
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-ocid="order_detail.save_button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || editLines.length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
                >
                  {isSavingEdit ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Save Changes | محفوظ کریں
                </button>
              </div>
            </div>
          </div>
        )}

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
            {order.paymentReceived !== undefined &&
              order.paymentReceived > 0 && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Payment Received | موصول
                    </p>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(order.paymentReceived)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Balance | باقی
                    </p>
                    <p
                      className={`font-semibold ${(order.totalAmount - (order.paymentReceived ?? 0)) > 0 ? "text-red-500" : "text-emerald-600"}`}
                    >
                      {formatCurrency(
                        Math.abs(
                          order.totalAmount - (order.paymentReceived ?? 0),
                        ),
                      )}
                    </p>
                  </div>
                </>
              )}
            {order.pharmacyCode && (
              <div>
                <p className="text-muted-foreground text-xs">
                  Pharmacy Code | فارمیسی کوڈ
                </p>
                <p className="font-semibold font-mono">{order.pharmacyCode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-xl p-4 border border-border shadow-xs">
          <h2 className="font-bold text-foreground font-heading mb-3">
            Order Items | اشیاء
          </h2>

          {(() => {
            const hasBonus = order.items.some((i) => (i.bonusQty ?? 0) > 0);
            const hasDiscount = order.items.some(
              (i) => (i.discountPercent ?? 0) > 0,
            );
            const colCount = 4 + (hasBonus ? 1 : 0) + (hasDiscount ? 1 : 0);
            const medCols = colCount <= 4 ? 5 : colCount <= 5 ? 4 : 3;
            return (
              <>
                {/* Table header */}
                <div
                  className="grid gap-1 text-xs text-muted-foreground font-semibold pb-2 border-b border-border"
                  style={{
                    gridTemplateColumns: `${medCols}fr repeat(${colCount - 1}, 1fr)`,
                  }}
                >
                  <div>Medicine</div>
                  <div className="text-center">Qty</div>
                  {hasBonus && (
                    <div className="text-center text-emerald-600">Bonus</div>
                  )}
                  {hasDiscount && (
                    <div className="text-center text-amber-600">Disc%</div>
                  )}
                  <div className="text-right">Price</div>
                  <div className="text-right">Total</div>
                </div>
                {/* Table rows */}
                <div className="divide-y divide-border">
                  {order.items.map((item) => {
                    const hasOrderReturnItems =
                      (order.returnItems ?? []).length > 0;
                    const isItemReturned = (order.returnItems ?? []).some(
                      (r) => r.medicineId === item.medicineId,
                    );
                    return (
                      <div
                        key={item.medicineId}
                        className={`grid gap-1 py-2.5 text-sm items-start ${hasOrderReturnItems ? (isItemReturned ? "bg-red-50/50 border-l-2 border-l-red-400 pl-1" : "bg-emerald-50/30 border-l-2 border-l-emerald-400 pl-1") : ""}`}
                        style={{
                          gridTemplateColumns: `${medCols}fr repeat(${colCount - 1}, 1fr)`,
                        }}
                      >
                        <div>
                          <p className="font-semibold text-foreground text-xs leading-tight">
                            {item.medicineName}
                            {isItemReturned && (
                              <span className="ml-1 text-[9px] text-red-500">
                                (↩ Return)
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {item.strength}
                          </p>
                        </div>
                        <div className="text-center text-xs font-semibold">
                          {item.qty}
                        </div>
                        {hasBonus && (
                          <div className="text-center text-xs font-semibold text-emerald-600">
                            {item.bonusQty ?? 0}
                          </div>
                        )}
                        {hasDiscount && (
                          <div className="text-center text-xs font-semibold text-amber-600">
                            {(item.discountPercent ?? 0) / 10}%
                          </div>
                        )}
                        <div className="text-right text-xs">
                          {formatCurrency(item.unitPrice)}
                        </div>
                        <div className="text-right text-xs font-bold text-primary">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Return reason */}
          {order.returnReason && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-orange-700">
                Return Reason | واپسی کی وجہ:
              </p>
              <p className="text-sm text-orange-800 mt-1">
                {order.returnReason}
              </p>
            </div>
          )}

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

// ─── Group Management Panel ───────────────────────────────────────────────────

function GroupManagementPanel({
  allMedicineGroups,
  actor,
  distributorId,
  onGroupsChanged,
}: {
  allMedicineGroups: Array<{ id: bigint; name: string; distributorId: bigint }>;
  actor: backendInterface | null;
  distributorId: bigint;
  onGroupsChanged: (
    groups: Array<{ id: bigint; name: string; distributorId: bigint }>,
  ) => void;
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<bigint | null>(null);

  async function handleAddGroup() {
    if (!actor || !newGroupName.trim()) return;
    setIsAddingGroup(true);
    try {
      await actor.addMedicineGroup(newGroupName.trim(), distributorId);
      const updated = await actor.getMedicineGroups(distributorId);
      onGroupsChanged(
        updated.map((g) => ({
          id: g.id,
          name: g.name,
          distributorId: g.distributorId,
        })),
      );
      setNewGroupName("");
      toast.success(`Group "${newGroupName.trim()}" add ho gaya!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsAddingGroup(false);
    }
  }

  async function handleDeleteGroup(groupId: bigint, groupName: string) {
    if (!actor) return;
    setDeletingGroupId(groupId);
    try {
      await actor.deleteMedicineGroup(groupId, distributorId);
      const updated = await actor.getMedicineGroups(distributorId);
      onGroupsChanged(
        updated.map((g) => ({
          id: g.id,
          name: g.name,
          distributorId: g.distributorId,
        })),
      );
      toast.success(`Group "${groupName}" delete ho gaya!`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setDeletingGroupId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          data-ocid="group_mgmt.name_input"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddGroup();
          }}
          placeholder="Group name e.g. Blue, Indigo, Series-A"
          disabled={isAddingGroup}
          className="flex-1 h-10 text-sm border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <button
          type="button"
          data-ocid="group_mgmt.add_button"
          onClick={handleAddGroup}
          disabled={isAddingGroup || !newGroupName.trim()}
          className="h-10 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-4 rounded-lg transition-colors"
        >
          {isAddingGroup ? (
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="animate-spin"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          Add Group
        </button>
      </div>

      {allMedicineGroups.length === 0 ? (
        <div
          className="text-center py-8 text-gray-400"
          data-ocid="group_mgmt.empty_state"
        >
          <p className="text-sm">No groups created yet. Add a group above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {allMedicineGroups.map((grp, idx) => (
            <div
              key={String(grp.id)}
              data-ocid={`group_mgmt.item.${idx + 1}`}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5"
            >
              <span className="text-sm font-medium text-gray-900">
                {grp.name}
              </span>
              <button
                type="button"
                data-ocid={`group_mgmt.delete_button.${idx + 1}`}
                onClick={() => handleDeleteGroup(grp.id, grp.name)}
                disabled={deletingGroupId === grp.id}
                className="ml-2 text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                {deletingGroupId === grp.id ? (
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="animate-spin"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Manage Screen ────────────────────────────────────────────────────────────

// ─── Manage Customers Tab ─────────────────────────────────────────────────────

function ManageCustomersTab({
  actor,
  pharmacies: _pharmacies,
  onDataReloaded,
  medicines,
}: {
  actor: backendInterface | null;
  pharmacies: Pharmacy[];
  onDataReloaded: (newPharmacies: Pharmacy[], newMedicines: Medicine[]) => void;
  medicines: Medicine[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [custName, setCustName] = useState("");
  const [custType, setCustType] = useState<ExtendedCustomerType>(
    CustomerType.pharmacy,
  );
  const [custContact, setCustContact] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custArea, setCustArea] = useState("");
  const [custGroup, setCustGroup] = useState("");
  const [custCode, setCustCode] = useState("");
  const [custNTN, setCustNTN] = useState("");
  const [custCNIC, setCustCNIC] = useState("");
  const [custDealerCode, setCustDealerCode] = useState("");
  const [custPmdc, setCustPmdc] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deletingId, setDeletingId] = useState<bigint | null>(null);

  useEffect(() => {
    if (!actor) return;
    const sess = getSession();
    const distId = sess?.distributorId ? BigInt(sess.distributorId) : null;
    const fetchFn = distId
      ? (actor as any).getCustomersByDistributor(distId)
      : actor.getCustomers();
    fetchFn
      .then((raw: any[]) => {
        const rawMapped: Customer[] = raw.map((c) => ({
          id: String(c.id),
          backendId: c.id,
          name: c.name,
          customerType: c.customerType as CustomerType,
          contactNo: c.contactNo || c.contact || "",
          address: c.address || "",
          area: c.area || "",
          groupName: c.groupName || c.group || "",
          code: c.code || "",
          ntn: c.ntn || "",
          cnic: c.cnic || "",
          dealerCode: (c as any).dealerCode || "",
          pmdc: (c as any).pmdc || "",
        }));
        // Also merge pharmacies so list is populated
        const pharmConverted: Customer[] = _pharmacies.map((p) => ({
          id: `ph-${String(p.backendId)}`,
          backendId: p.backendId,
          name: p.name,
          customerType: CustomerType.pharmacy,
          contactNo: p.contactNo || "",
          address: p.address || "",
          area: p.area || "",
          groupName: "",
          code: p.code || "",
          ntn: "",
          cnic: "",
          dealerCode: "",
          pmdc: "",
        }));
        const names = new Set(rawMapped.map((c) => c.name.toLowerCase()));
        setCustomers([
          ...rawMapped,
          ...pharmConverted.filter((p) => !names.has(p.name.toLowerCase())),
        ]);
      })
      .catch(() => {});
  }, [actor, _pharmacies]);

  async function handleAdd() {
    if (!actor || !custName.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsAdding(true);
    try {
      const sess = getSession();
      const distId = sess?.distributorId ? BigInt(sess.distributorId) : null;
      const newId = distId
        ? await (actor as any).addCustomerForDistributor(
            distId,
            custName.trim(),
            toBackendCustomerType(custType),
            custAddress.trim(),
            custArea.trim(),
            custContact.trim(),
            custGroup.trim(),
            custCode.trim(),
            custNTN.trim(),
            custCNIC.trim(),
            custDealerCode.trim(),
          )
        : await (actor as any).addCustomer(
            custName.trim(),
            toBackendCustomerType(custType),
            custAddress.trim(),
            custArea.trim(),
            custContact.trim(),
            custGroup.trim(),
            custCode.trim(),
            custNTN.trim(),
            custCNIC.trim(),
            custDealerCode.trim(),
          );
      try {
        localStorage.setItem(
          `medorder_customer_name_${newId}`,
          custName.trim(),
        );
      } catch {}
      if (custPmdc?.trim()) {
        try {
          localStorage.setItem(
            `medorder_customer_pmdc_${newId}`,
            custPmdc.trim(),
          );
        } catch {}
      }
      if (
        custType === CustomerType.pharmacy ||
        custType === CustomerType.medicalStore
      ) {
        try {
          await actor.addPharmacy(
            custName.trim(),
            custContact.trim(),
            `${custAddress.trim()} | ${custArea.trim()}`,
            custCode.trim(),
            custNTN.trim(),
            custCNIC.trim(),
          );
        } catch {}
      }
      // reload pharmacies for sidebar sync
      const raw = await actor.getPharmacies();
      const newPharmacies = raw.map((p) => {
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
          code: p.code || "",
        };
      });
      onDataReloaded(newPharmacies, medicines);
      // reload customer list
      const sess2 = getSession();
      const distId2 = sess2?.distributorId ? BigInt(sess2.distributorId) : null;
      const fetchFn2 = distId2
        ? (actor as any).getCustomersByDistributor(distId2)
        : actor.getCustomers();
      const rawCust = await fetchFn2;
      setCustomers(
        rawCust.map((c: any) => ({
          id: String(c.id),
          backendId: c.id,
          name: c.name,
          customerType: c.customerType as CustomerType,
          contactNo: c.contact || "",
          address: c.address || "",
          area: c.area || "",
          group: c.group || "",
          code: c.code || "",
          ntn: c.ntn || "",
          cnic: c.cnic || "",
          dealerCode: (c as any).dealerCode || "",
          pmdc: (c as any).pmdc || "",
        })),
      );
      // reset form
      setCustName("");
      setCustType(CustomerType.pharmacy);
      setCustContact("");
      setCustAddress("");
      setCustArea("");
      setCustGroup("");
      setCustCode("");
      setCustNTN("");
      setCustCNIC("");
      setCustDealerCode("");
      setCustPmdc("");
      setShowForm(false);
      toast.success(`Customer "${custName.trim()}" add ho gaya!`);
    } catch (e: unknown) {
      toast.error(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(c: Customer) {
    if (!actor) return;
    setDeletingId(c.backendId);
    try {
      await actor.deleteCustomer(c.backendId);
      setCustomers((prev) => prev.filter((x) => x.backendId !== c.backendId));
      toast.success(`"${c.name}" delete ho gaya!`);
    } catch (e: unknown) {
      toast.error(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  }

  const typeLabel = (t: CustomerType) => {
    if (t === CustomerType.doctor) return "Doctor";
    if (t === CustomerType.hospital) return "Hospital";
    if (t === CustomerType.medicalStore) return "Medical Store";
    return "Pharmacy";
  };

  return (
    <div className="px-4 pt-4 space-y-3">
      {/* Add Customer toggle button */}
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="w-full flex items-center justify-between rounded-xl px-4 py-3 font-semibold text-sm shadow-sm text-white"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
        }}
        data-ocid="manage.customers.open_modal_button"
      >
        <div className="flex items-center gap-2">
          <Plus size={16} />
          <span>Add Customer | کسٹمر شامل کریں</span>
        </div>
        {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Add Customer Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-xs p-4 space-y-3">
          <h3 className="font-bold text-foreground font-heading text-sm">
            New Customer | نیا کسٹمر
          </h3>
          <div className="space-y-2.5">
            <div>
              <label
                htmlFor="mc-name"
                className="text-xs font-medium text-muted-foreground mb-1 block"
              >
                Name | نام *
              </label>
              <Input
                id="mc-name"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="Customer name"
                className="h-10 text-sm"
                disabled={isAdding}
                data-ocid="manage.customers.input"
              />
            </div>
            <div>
              <label
                htmlFor="mc-type"
                className="text-xs font-medium text-muted-foreground mb-1 block"
              >
                Type | قسم *
              </label>
              <select
                id="mc-type"
                value={custType}
                onChange={(e) =>
                  setCustType(e.target.value as ExtendedCustomerType)
                }
                className="w-full h-10 text-sm border border-input rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isAdding}
                data-ocid="manage.customers.select"
              >
                <option value={CustomerType.pharmacy}>
                  Pharmacy | فارمیسی
                </option>
                <option value={CustomerType.medicalStore}>
                  Medical Store | میڈیکل اسٹور
                </option>
                <option value={CustomerType.doctor}>Doctor | ڈاکٹر</option>
                <option value={CustomerType.hospital}>Hospital | ہسپتال</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="mc-contact"
                  className="text-xs font-medium text-muted-foreground mb-1 block"
                >
                  Contact | رابطہ
                </label>
                <Input
                  id="mc-contact"
                  value={custContact}
                  onChange={(e) => setCustContact(e.target.value)}
                  placeholder="0300-1234567"
                  className="h-10 text-sm"
                  disabled={isAdding}
                />
              </div>
              <div>
                <label
                  htmlFor="mc-area"
                  className="text-xs font-medium text-muted-foreground mb-1 block"
                >
                  Area | علاقہ
                </label>
                <Input
                  id="mc-area"
                  value={custArea}
                  onChange={(e) => setCustArea(e.target.value)}
                  placeholder="e.g. DHA"
                  className="h-10 text-sm"
                  disabled={isAdding}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="mc-address"
                className="text-xs font-medium text-muted-foreground mb-1 block"
              >
                Address | پتہ
              </label>
              <Input
                id="mc-address"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                placeholder="Full address"
                className="h-10 text-sm"
                disabled={isAdding}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="mc-group"
                  className="text-xs font-medium text-muted-foreground mb-1 block"
                >
                  Group | گروپ
                </label>
                <Input
                  id="mc-group"
                  value={custGroup}
                  onChange={(e) => setCustGroup(e.target.value)}
                  placeholder="Group name"
                  className="h-10 text-sm"
                  disabled={isAdding}
                />
              </div>
              <div>
                <label
                  htmlFor="mc-code"
                  className="text-xs font-medium text-muted-foreground mb-1 block"
                >
                  Code | کوڈ
                </label>
                <Input
                  id="mc-code"
                  value={custCode}
                  onChange={(e) => setCustCode(e.target.value)}
                  placeholder="e.g. C-001"
                  className="h-10 text-sm"
                  disabled={isAdding}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="mc-dealer"
                className="text-xs font-medium text-muted-foreground mb-1 block"
              >
                Dealer Code | ڈیلر کوڈ
              </label>
              <Input
                id="mc-dealer"
                value={custDealerCode}
                onChange={(e) => setCustDealerCode(e.target.value)}
                placeholder="e.g. 002-0043"
                className="h-10 text-sm"
                disabled={isAdding}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="mc-ntn"
                  className="text-xs font-medium text-muted-foreground mb-1 block"
                >
                  NTN#
                </label>
                <Input
                  id="mc-ntn"
                  value={custNTN}
                  onChange={(e) => setCustNTN(e.target.value)}
                  placeholder="1234567-8"
                  className="h-10 text-sm"
                  disabled={isAdding}
                />
              </div>
              <div>
                <label
                  htmlFor="mc-cnic"
                  className="text-xs font-medium text-muted-foreground mb-1 block"
                >
                  CNIC#
                </label>
                <Input
                  id="mc-cnic"
                  value={custCNIC}
                  onChange={(e) => setCustCNIC(e.target.value)}
                  placeholder="35202-1234567-1"
                  className="h-10 text-sm"
                  disabled={isAdding}
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="mc-pmdc"
                className="text-xs font-medium text-muted-foreground mb-1 block"
              >
                PMDC# (Doctors only)
              </label>
              <Input
                id="mc-pmdc"
                value={custPmdc}
                onChange={(e) => setCustPmdc(e.target.value)}
                placeholder="PMDC registration number"
                className="h-10 text-sm"
                disabled={isAdding}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleAdd}
              className="flex-1 h-10 text-sm font-semibold"
              disabled={isAdding}
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
              }}
              data-ocid="manage.customers.submit_button"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-1.5" />
                  Add Customer | شامل کریں
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="h-10 px-3 text-sm"
              disabled={isAdding}
              data-ocid="manage.customers.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Customer List */}
      <p className="text-xs text-muted-foreground">
        {customers.length} customers registered
      </p>
      <div className="space-y-2.5" data-ocid="manage.customers.list">
        {customers.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground text-sm"
            data-ocid="manage.customers.empty_state"
          >
            No customers added yet
          </div>
        ) : (
          customers.map((c, idx) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-border shadow-xs p-4"
              data-ocid={`manage.customers.item.${idx + 1}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {typeLabel(c.customerType)}
                    {c.area ? ` · ${c.area}` : ""}
                    {c.dealerCode ? ` · ${c.dealerCode}` : ""}
                  </p>
                  {c.contactNo && (
                    <p className="text-xs text-muted-foreground">
                      {c.contactNo}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.backendId}
                    className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded-lg transition-colors"
                    data-ocid={`manage.customers.delete_button.${idx + 1}`}
                  >
                    {deletingId === c.backendId ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Manage Screen ─────────────────────────────────────────────────────────────

function ManageScreen({
  pharmacies,
  medicines,
  actor,
  onDataReloaded,
  dispatch,
  showPharmacies = false,
  readOnly = false,
  allMedicineGroups: propsAllMedicineGroups = [],
}: {
  pharmacies: Pharmacy[];
  medicines: Medicine[];
  actor: backendInterface | null;
  onDataReloaded: (newPharmacies: Pharmacy[], newMedicines: Medicine[]) => void;
  dispatch: React.Dispatch<Action>;
  showPharmacies?: boolean;
  readOnly?: boolean;
  allMedicineGroups?: Array<{
    id: bigint;
    name: string;
    distributorId: bigint;
  }>;
}) {
  const [activeTab, setActiveTab] = useState<"pharmacies" | "medicines">(
    showPharmacies ? "pharmacies" : "medicines",
  );
  // ── Pharmacy form state ──
  const [_showPharmacyForm, setShowPharmacyForm] = useState(false);
  const [pharmName, setPharmName] = useState("");
  const [pharmContact, setPharmContact] = useState("");
  const [pharmAddress, setPharmAddress] = useState("");
  const [pharmArea, setPharmArea] = useState("");
  const [pharmCode, setPharmCode] = useState("");
  const [pharmNTN, setPharmNTN] = useState("");
  const [pharmCNIC, setPharmCNIC] = useState("");
  const [_isAddingPharm, setIsAddingPharm] = useState(false);
  const [_deletingPharmId, setDeletingPharmId] = useState<string | null>(null);
  const [_confirmDeletePharmId, setConfirmDeletePharmId] = useState<
    string | null
  >(null);
  const [deletePasswordDialog, setDeletePasswordDialog] = useState<{
    type: "pharmacy" | "medicine";
    id: string;
  } | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [isDeletingWithPassword, setIsDeletingWithPassword] = useState(false);

  // ── Medicine form state ──
  const [showMedForm, setShowMedForm] = useState(false);
  const [medName, setMedName] = useState("");
  const [medPrice, setMedPrice] = useState("");
  const [medCategory, setMedCategory] = useState<Category>("tablets");
  const [medCompany, setMedCompany] = useState("");
  const [medStrength, setMedStrength] = useState("");
  const [medPackSize, setMedPackSize] = useState("");
  const [medGenericName, setMedGenericName] = useState("");
  const [medBatchNo, setMedBatchNo] = useState("");
  const [medMedicineType, setMedMedicineType] = useState("Tablet");
  const [medProductCode, setMedProductCode] = useState("");
  const [medGroupId, setMedGroupId] = useState<bigint>(BigInt(0));
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
        code: p.code || "",
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
        genericName: m.genericName || "",
        batchNo: m.batchNo || "",
        medicineType: m.medicineType || "",
        productCode: (m as any).productCode || "",
        groupId: (m as any).groupId ?? BigInt(0),
      };
    });
  }

  // ── Add Pharmacy ──
  // biome-ignore lint/correctness/noUnusedVariables: kept for reference
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
      const offSess = getSession();
      const pharmDistId = offSess?.distributorId
        ? BigInt(offSess.distributorId)
        : null;
      const newId = pharmDistId
        ? await (actor as any).addPharmacyForDistributor(
            pharmDistId,
            pharmName.trim(),
            pharmContact.trim(),
            location,
            pharmCode.trim(),
            pharmNTN.trim(),
            pharmCNIC.trim(),
          )
        : await actor.addPharmacy(
            pharmName.trim(),
            pharmContact.trim(),
            location,
            pharmCode.trim(),
            pharmNTN.trim(),
            pharmCNIC.trim(),
          );
      // Store NTN/CNIC for invoice lookup
      if (pharmNTN.trim()) {
        try {
          localStorage.setItem(
            `medorder_customer_ntn_${newId}`,
            pharmNTN.trim(),
          );
          localStorage.setItem(
            `medorder_customer_name_${newId}`,
            pharmName.trim(),
          );
        } catch {
          /* ignore */
        }
      }
      if (pharmCNIC.trim()) {
        try {
          localStorage.setItem(
            `medorder_customer_cnic_${newId}`,
            pharmCNIC.trim(),
          );
          localStorage.setItem(
            `medorder_customer_name_${newId}`,
            pharmName.trim(),
          );
        } catch {
          /* ignore */
        }
      }
      const [newPharmacies, newMedicines] = await Promise.all([
        reloadPharmacies(),
        Promise.resolve(medicines),
      ]);
      onDataReloaded(newPharmacies, newMedicines);
      setPharmName("");
      setPharmContact("");
      setPharmAddress("");
      setPharmArea("");
      setPharmCode("");
      setPharmNTN("");
      setPharmCNIC("");
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
  // biome-ignore lint/correctness/noUnusedVariables: kept for reference
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
      const medSess = getSession();
      const medDistId = medSess?.distributorId
        ? BigInt(medSess.distributorId)
        : null;
      if (medDistId) {
        await (actor as any).addMedicineForDistributor(
          medDistId,
          medName.trim(),
          BigInt(Math.round(priceNum)),
          "",
          medCompany.trim(),
          medStrength.trim(),
          medPackSize.trim(),
          medGenericName.trim(),
          medBatchNo.trim(),
          medMedicineType,
          medProductCode.trim(),
          medGroupId,
        );
      } else {
        await actor.addMedicine(
          medName.trim(),
          BigInt(Math.round(priceNum)),
          "",
          medCompany.trim(),
          medStrength.trim(),
          medPackSize.trim(),
          medGenericName.trim(),
          medBatchNo.trim(),
          medMedicineType,
          medProductCode.trim(),
          medGroupId,
        );
      }
      const newMedicines = await reloadMedicines();
      onDataReloaded(pharmacies, newMedicines);
      setMedName("");
      setMedPrice("");
      setMedCategory("tablets");
      setMedCompany("");
      setMedStrength("");
      setMedPackSize("");
      setMedGenericName("");
      setMedBatchNo("");
      setMedMedicineType("Tablet");
      setMedProductCode("");
      setMedGroupId(BigInt(0));
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
        {showPharmacies && (
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
              <span>Customers | کسٹمر</span>
            </div>
            <div className="text-xs font-normal opacity-70 mt-0.5">
              {pharmacies.length} total
            </div>
          </button>
        )}
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

      {/* ── Customers Tab ── */}
      {showPharmacies && activeTab === "pharmacies" && (
        <ManageCustomersTab
          actor={actor}
          pharmacies={pharmacies}
          onDataReloaded={onDataReloaded}
          medicines={medicines}
        />
      )}

      {/* ── Medicines Tab ── */}
      {activeTab === "medicines" && (
        <div className="px-4 pt-4 space-y-3">
          {/* Add Medicine toggle button - only for office/admin */}
          {!readOnly && (
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
              {showMedForm ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
          )}

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
                <div>
                  <label
                    htmlFor="med-generic-name"
                    className="text-xs font-medium text-muted-foreground mb-1 block"
                  >
                    Generic Name | جنیرک نام
                  </label>
                  <Input
                    id="med-generic-name"
                    value={medGenericName}
                    onChange={(e) => setMedGenericName(e.target.value)}
                    placeholder="e.g. Paracetamol"
                    className="h-10 text-sm"
                    disabled={isAddingMed}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="med-batch-no"
                      className="text-xs font-medium text-muted-foreground mb-1 block"
                    >
                      Batch # | بیچ نمبر
                    </label>
                    <Input
                      id="med-batch-no"
                      value={medBatchNo}
                      onChange={(e) => setMedBatchNo(e.target.value)}
                      placeholder="e.g. BN-2024-001"
                      className="h-10 text-sm"
                      disabled={isAddingMed}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="med-medicine-type"
                      className="text-xs font-medium text-muted-foreground mb-1 block"
                    >
                      Medicine Type | قسم
                    </label>
                    <select
                      id="med-medicine-type"
                      value={medMedicineType}
                      onChange={(e) => setMedMedicineType(e.target.value)}
                      className="w-full h-10 text-sm border border-input rounded-md px-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isAddingMed}
                    >
                      <option value="Tablet">Tablet | گولی</option>
                      <option value="Syrup">Syrup | شربت</option>
                      <option value="Injection">Injection | انجکشن</option>
                      <option value="Capsule">Capsule | کیپسول</option>
                      <option value="Drop">Drop | قطرے</option>
                      <option value="Cream">Cream | کریم</option>
                      <option value="Sachet">Sachet | سیشے</option>
                      <option value="Other">Other | دیگر</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="med-product-code"
                      className="text-xs font-medium text-muted-foreground mb-1 block"
                    >
                      Product Code | کوڈ
                    </label>
                    <Input
                      id="med-product-code"
                      value={medProductCode}
                      onChange={(e) => setMedProductCode(e.target.value)}
                      placeholder="e.g. 012-367"
                      className="h-10 text-sm"
                      disabled={isAddingMed}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="med-group"
                      className="text-xs font-medium text-muted-foreground mb-1 block"
                    >
                      Group | گروپ
                    </label>
                    <select
                      id="med-group"
                      value={String(medGroupId)}
                      onChange={(e) =>
                        setMedGroupId(BigInt(e.target.value || "0"))
                      }
                      className="w-full h-10 text-sm border border-input rounded-md px-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isAddingMed}
                    >
                      <option value="0">-- No Group --</option>
                      {propsAllMedicineGroups.map(
                        (g: {
                          id: bigint;
                          name: string;
                          distributorId: bigint;
                        }) => (
                          <option key={String(g.id)} value={String(g.id)}>
                            {g.name}
                          </option>
                        ),
                      )}
                    </select>
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
                    setMedGenericName("");
                    setMedBatchNo("");
                    setMedMedicineType("Tablet");
                    setMedProductCode("");
                    setMedGroupId(BigInt(0));
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
                        {medicine.medicineType && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                            {medicine.medicineType}
                          </span>
                        )}
                        {!medicine.medicineType && (
                          <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full capitalize">
                            {medicine.category}
                          </span>
                        )}
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
                        {medicine.genericName && (
                          <span className="text-gray-500 italic">
                            ({medicine.genericName})
                          </span>
                        )}
                      </div>
                      {((medicine.company && medicine.company !== "Unknown") ||
                        medicine.packSize ||
                        medicine.batchNo) && (
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
                          {medicine.batchNo && (
                            <span className="font-mono text-gray-500">
                              #{medicine.batchNo}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!readOnly && confirmDeleteMedId === medicine.id ? (
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
                      ) : !readOnly ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletePasswordDialog({
                              type: "medicine",
                              id: medicine.id,
                            });
                            setDeletePasswordInput("");
                          }}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded-lg transition-colors"
                          disabled={deletingMedId === medicine.id}
                          aria-label={`Delete ${medicine.name}`}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {deletePasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Delete Confirmation | حذف کی تصدیق
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Apna password enter karein delete karne ke liye.
            </p>
            <input
              type="password"
              value={deletePasswordInput}
              onChange={(e) => setDeletePasswordInput(e.target.value)}
              placeholder="Password dalein | Enter password"
              className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              data-ocid="manage.delete.password.input"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeletePasswordDialog(null);
                  setDeletePasswordInput("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                data-ocid="manage.delete.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="manage.delete.confirm_button"
                disabled={isDeletingWithPassword || !deletePasswordInput.trim()}
                onClick={async () => {
                  const delSess = getSession();
                  if (!delSess) return;
                  const userRecord = lookupUser(
                    delSess.username,
                    deletePasswordInput,
                  );
                  if (!userRecord) {
                    toast.error("Wrong password | غلط پاس ورڈ");
                    return;
                  }
                  setIsDeletingWithPassword(true);
                  const target = deletePasswordDialog;
                  try {
                    if (target.type === "pharmacy") {
                      const pharm = pharmacies.find((p) => p.id === target.id);
                      if (pharm) {
                        setDeletingPharmId(pharm.id);
                        await actor!.deletePharmacy(pharm.backendId);
                        const newPharmacies = await reloadPharmacies();
                        onDataReloaded(newPharmacies, medicines);
                        toast.success(`"${pharm.name}" delete ho gaya!`);
                      }
                    } else {
                      const med = medicines.find((m) => m.id === target.id);
                      if (med) {
                        setDeletingMedId(med.id);
                        await actor!.deleteMedicine(med.backendId);
                        const newMeds = await reloadMedicines();
                        onDataReloaded(pharmacies, newMeds);
                        toast.success(`"${med.name}" delete ho gaya!`);
                      }
                    }
                    setDeletePasswordDialog(null);
                    setDeletePasswordInput("");
                  } catch (e: unknown) {
                    const msg =
                      e instanceof Error ? e.message : "Unknown error";
                    toast.error(`Error: ${msg}`);
                  } finally {
                    setIsDeletingWithPassword(false);
                    setDeletingPharmId(null);
                    setDeletingMedId(null);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isDeletingWithPassword ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Print Helper ─────────────────────────────────────────────────────────────

function buildPrintHtml(orders: OfficeOrderDetail[]): string {
  const invoicesHtml = orders
    .map((order) => {
      const hasBonus = order.items.some((i) => i.bonusQty > 0);
      const hasDistDisc = order.items.some((i) => i.distributionDiscount > 0);
      const hasCompDisc = order.items.some((i) => i.companyDiscount > 0);

      const itemRows = order.items
        .map((item, idx) => {
          const isReturned = (order.returnItems ?? []).some(
            (r) => r.medicineId === item.medicineId,
          );
          const rowBg =
            order.returnItems?.length > 0
              ? isReturned
                ? "#fee2e2"
                : "#f0fdf4"
              : idx % 2 === 0
                ? "#fff"
                : "#f9fafb";
          const distDiscPct = item.distributionDiscount / 10;
          const compDiscPct = item.companyDiscount / 10;
          const totalDiscPct = distDiscPct + compDiscPct;
          // Use manualNetRate (stored as netRate / 100) if set, else auto-calculate
          const manualNetRate = item.netRate > 0 ? item.netRate / 100 : null;
          const effectiveNetRate =
            manualNetRate ?? item.unitPrice * (1 - totalDiscPct / 100);
          const discountedTotal = effectiveNetRate * item.qty;
          const distDiscAmt = Math.round(
            (item.unitPrice * item.qty * distDiscPct) / 100,
          );
          const compDiscAmt = Math.round(
            (item.unitPrice * item.qty * compDiscPct) / 100,
          );
          return `
        <tr style="border-bottom:1px solid #f3f4f6;background:${rowBg};">
          <td style="padding:7px 10px;font-size:12px;color:#111827;font-weight:500;">${item.medicineName}${isReturned ? ' <span style="color:#dc2626;font-size:10px;">(Returned)</span>' : ""}</td>
          <td style="padding:7px 10px;font-size:12px;color:#6b7280;text-align:center;">${item.strength || "—"}</td>
          <td style="padding:7px 10px;font-size:12px;color:#7c3aed;text-align:center;font-weight:600;">${item.productType || "—"}</td>
          <td style="padding:7px 10px;font-size:12px;color:#6b7280;text-align:center;">${item.packSize || "—"}</td>
          <td style="padding:7px 10px;font-size:12px;color:#6b7280;text-align:center;">—</td>
          <td style="padding:7px 10px;text-align:center;font-size:12px;font-weight:600;color:#374151;">${item.qty}</td>
          ${hasBonus ? `<td style="padding:7px 10px;text-align:center;font-size:12px;font-weight:600;color:#059669;">${item.bonusQty > 0 ? item.bonusQty : "—"}</td>` : ""}
          ${hasDistDisc ? `<td style="padding:7px 10px;text-align:center;font-size:12px;font-weight:600;color:#d97706;">${distDiscPct > 0 ? `${distDiscPct}%` : "—"}</td>` : ""}
          ${hasDistDisc ? `<td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:600;color:#dc2626;">${distDiscAmt > 0 ? `-Rs ${distDiscAmt.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</td>` : ""}
          ${hasCompDisc ? `<td style="padding:7px 10px;text-align:center;font-size:12px;font-weight:600;color:#2563eb;">${compDiscPct > 0 ? `${compDiscPct}%` : "—"}</td>` : ""}
          ${hasCompDisc ? `<td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:600;color:#1d4ed8;">${compDiscAmt > 0 ? `-Rs ${compDiscAmt.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</td>` : ""}
          <td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:600;color:#7c3aed;">Rs ${effectiveNetRate.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;color:#374151;">Rs ${item.unitPrice.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding:7px 10px;text-align:right;font-size:12px;font-weight:bold;color:#1e40af;">Rs ${discountedTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
        })
        .join("");

      // base cols: Medicine Name, Strength, Type, Pack Size, Batch#, Qty, Unit Price, Total = 8
      const extraColCount =
        (hasBonus ? 1 : 0) + (hasDistDisc ? 2 : 0) + (hasCompDisc ? 2 : 0);
      const totalCols = 9 + extraColCount; // +1 for Net Rate column
      const subtotal = order.items.reduce((s, i) => {
        const distPct = i.distributionDiscount / 10;
        const compPct = i.companyDiscount / 10;
        const totalPct = distPct + compPct;
        const manualNet = i.netRate > 0 ? i.netRate / 100 : null;
        const effNet = manualNet ?? i.unitPrice * (1 - totalPct / 100);
        return s + effNet * i.qty;
      }, 0);
      const advancedTax = Math.round(subtotal * 0.005);
      const grandTotal = subtotal + advancedTax;

      return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:28px;margin-bottom:32px;page-break-after:always;font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin-left:auto;margin-right:auto;">
      <!-- Header -->
      <div style="text-align:center;border-bottom:3px solid #1e40af;padding-bottom:16px;margin-bottom:20px;">
        <h1 style="font-size:28px;font-weight:900;color:#1e3a8a;margin:0;letter-spacing:2px;text-transform:uppercase;">MIAN MEDICINE DISTRIBUTOR</h1>
        <p style="color:#6b7280;font-size:13px;margin:5px 0 0;">Medicine Distributor | دوائیوں کے تقسیم کار</p>
        <p style="color:#9ca3af;font-size:11px;margin:2px 0 0;">Tax Invoice | ٹیکس انوائس</p>
      </div>

      <!-- Invoice Meta -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
        <div>
           <p style="color:#6b7280;font-size:10px;margin:0 0 3px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Pharmacy | فارمیسی</p>
           <p style="font-weight:bold;font-size:14px;color:#111827;margin:0;">${order.pharmacyName}</p>
           ${order.pharmacyArea ? `<p style="color:#6b7280;font-size:11px;margin:2px 0 0;">${order.pharmacyArea}</p>` : ""}
           ${order.pharmacyMasterCode ? `<p style="color:#374151;font-size:11px;margin:2px 0 0;font-family:monospace;">Code: ${order.pharmacyMasterCode}</p>` : ""}
           ${(() => {
             const pharmNameLower = order.pharmacyName.toLowerCase();
             let ntnLine = "";
             let cnicLine = "";
             try {
               for (let i = 0; i < localStorage.length; i++) {
                 const key = localStorage.key(i);
                 if (!key) continue;
                 if (key.startsWith("medorder_customer_ntn_")) {
                   const backendId = key.replace("medorder_customer_ntn_", "");
                   const ntnVal = localStorage.getItem(key);
                   const storedName =
                     localStorage.getItem(
                       `medorder_customer_name_${backendId}`,
                     ) || "";
                   if (storedName.toLowerCase() === pharmNameLower && ntnVal) {
                     ntnLine = `<p style="color:#374151;font-size:11px;margin:2px 0 0;">NTN: <span style="font-family:monospace;">${ntnVal}</span></p>`;
                   }
                 }
                 if (key.startsWith("medorder_customer_cnic_")) {
                   const backendId = key.replace("medorder_customer_cnic_", "");
                   const cnicVal = localStorage.getItem(key);
                   const storedName =
                     localStorage.getItem(
                       `medorder_customer_name_${backendId}`,
                     ) || "";
                   if (storedName.toLowerCase() === pharmNameLower && cnicVal) {
                     cnicLine = `<p style="color:#374151;font-size:11px;margin:2px 0 0;">CNIC: <span style="font-family:monospace;">${cnicVal}</span></p>`;
                   }
                 }
               }
             } catch {
               /* ignore */
             }
             return ntnLine + cnicLine;
           })()}
        </div>
        <div>
          <p style="color:#6b7280;font-size:10px;margin:0 0 3px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Booker | بکر</p>
          <p style="font-weight:bold;font-size:14px;color:#111827;margin:0;">${order.staffName || "—"}</p>
          ${order.staffCode ? `<p style="color:#6b7280;font-size:11px;margin:2px 0 0;font-family:monospace;">${order.staffCode}</p>` : ""}
        </div>
        <div style="text-align:right;">
          <p style="color:#6b7280;font-size:10px;margin:0 0 3px;text-transform:uppercase;letter-spacing:.05em;font-weight:600;">Invoice # | انوائس</p>
          <p style="font-weight:bold;font-size:16px;color:#1e40af;margin:0;font-family:monospace;">${order.orderId}</p>
          <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">${formatDate(order.date)}</p>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
        <thead>
          <tr style="background:#1e40af;color:white;">
            <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Medicine Name | دوائی</th>
            <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;">Strength</th>
            <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;background:#6d28d9;">Type | قسم</th>
            <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;background:#5b21b6;">Pack Size | پیک</th>
            <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;">Batch #</th>
            <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;">Qty</th>
             ${hasBonus ? '<th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;background:#065f46;">Bonus</th>' : ""}
             ${hasDistDisc ? '<th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;background:#92400e;">Dist Disc%</th>' : ""}
             ${hasDistDisc ? '<th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;background:#7f1d1d;">Dist Amt</th>' : ""}
             ${hasCompDisc ? '<th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;background:#1e40af;">Co Disc%</th>' : ""}
             ${hasCompDisc ? '<th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;background:#1d4ed8;">Co Amt</th>' : ""}
            <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;background:#4c1d95;color:white;">Net Rate</th>
            <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;">Unit Price</th>
            <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr style="border-top:1px solid #d1d5db;background:#f9fafb;">
            <td colspan="${totalCols - 1}" style="padding:8px 10px;text-align:right;font-weight:600;font-size:13px;color:#374151;">Sub Total | ذیلی کل</td>
            <td style="padding:8px 10px;text-align:right;font-weight:bold;font-size:13px;color:#374151;">Rs ${subtotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:#fef3c7;border-top:1px solid #f59e0b;">
            <td colspan="${totalCols - 1}" style="padding:8px 10px;text-align:right;font-weight:600;font-size:12px;color:#92400e;">Advanced Tax U/S 236-H @ 0.50%</td>
            <td style="padding:8px 10px;text-align:right;font-weight:bold;font-size:12px;color:#92400e;">Rs ${advancedTax.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-top:2px solid #1e40af;background:#dbeafe;">
            <td colspan="${totalCols - 1}" style="padding:10px 10px;text-align:right;font-weight:bold;font-size:14px;color:#1e40af;">Grand Total | کل رقم</td>
            <td style="padding:10px 10px;text-align:right;font-weight:900;font-size:18px;color:#1e3a8a;">Rs ${grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          ${
            order.paymentReceived > 0
              ? `
          <tr style="background:#f0fdf4;border-top:1px solid #86efac;">
            <td colspan="${totalCols - 1}" style="padding:7px 10px;text-align:right;font-weight:600;font-size:12px;color:#065f46;">Payment Received | موصول</td>
            <td style="padding:7px 10px;text-align:right;font-weight:bold;font-size:12px;color:#065f46;">Rs ${order.paymentReceived.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="background:${grandTotal - order.paymentReceived > 0 ? "#fef2f2" : "#f0fdf4"};border-top:1px solid ${grandTotal - order.paymentReceived > 0 ? "#fca5a5" : "#86efac"};">
            <td colspan="${totalCols - 1}" style="padding:7px 10px;text-align:right;font-weight:600;font-size:12px;color:${grandTotal - order.paymentReceived > 0 ? "#dc2626" : "#065f46"};">Balance | باقی</td>
            <td style="padding:7px 10px;text-align:right;font-weight:bold;font-size:12px;color:${grandTotal - order.paymentReceived > 0 ? "#dc2626" : "#065f46"};">Rs ${Math.abs(grandTotal - order.paymentReceived).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          `
              : ""
          }
        </tfoot>
      </table>

      ${
        order.returnReason
          ? `
      <div style="margin-top:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px;">
        <p style="font-size:11px;font-weight:700;color:#c2410c;margin:0 0 4px;text-transform:uppercase;">Return Reason | واپسی کی وجہ</p>
        <p style="font-size:12px;color:#7c2d12;margin:0;">${order.returnReason}</p>
      </div>
      `
          : ""
      }

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
        <p style="font-size:10px;color:#9ca3af;margin:0;">Thank you for your business | آپ کے کاروبار کا شکریہ</p>
        <p style="font-size:10px;color:#9ca3af;margin:0;">Printed: ${new Date().toLocaleDateString("en-PK")}</p>
      </div>
    </div>
  `;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MIAN MEDICINE DISTRIBUTOR - Invoices</title><style>@media print { body { margin: 0; } .invoice-card { page-break-after: always; } }</style></head><body style="padding:20px;background:#f3f4f6;">${invoicesHtml}</body></html>`;
}

// ─── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  actor,
  allMedicines,
  allPharmacies,
  onOrderUpdated,
}: {
  order: OfficeOrderDetail;
  onClose: () => void;
  actor: backendInterface | null;
  allMedicines: Medicine[];
  allPharmacies: Array<{ id: bigint; name: string; location: string }>;
  onOrderUpdated?: () => void;
}) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLines, setEditLines] = useState<
    Array<{
      _key: string;
      medicineId: bigint;
      medicineName: string;
      qty: string;
      bonus: string;
      distDisc: string;
      compDisc: string;
      netRate: string;
      unitPrice: number;
    }>
  >([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editMedSearch, setEditMedSearch] = useState<Record<string, string>>(
    {},
  );
  const [editMedDropOpen, setEditMedDropOpen] = useState<
    Record<string, boolean>
  >({});

  function openEditModal() {
    setEditLines(
      order.items.map((item) => ({
        _key: `oedit-${item.medicineId}-${Date.now()}`,
        medicineId: BigInt(item.medicineId),
        medicineName: item.medicineName,
        qty: String(item.qty),
        bonus: String(item.bonusQty ?? 0),
        distDisc: String((item.distributionDiscount ?? 0) / 10),
        compDisc: String((item.companyDiscount ?? 0) / 10),
        netRate: String(item.netRate > 0 ? item.netRate / 100 : 0),
        unitPrice: item.unitPrice,
      })),
    );
    setShowEditModal(true);
  }

  async function handleSaveOfficeEdit() {
    if (!actor) return;
    setIsSavingEdit(true);
    try {
      const orderLines = editLines.map((line) => {
        const distD = Number.parseFloat(line.distDisc) || 0;
        const compD = Number.parseFloat(line.compDisc) || 0;
        const manualNet = Number.parseFloat(line.netRate) || 0;
        const autoNet = line.unitPrice * (1 - (distD + compD) / 100);
        return {
          medicineId: line.medicineId,
          quantity: Math.round(Number.parseFloat(line.qty) || 1),
          bonusQty: BigInt(Math.round(Number.parseFloat(line.bonus) || 0)),
          discountPercent: BigInt(0),
          distributionDiscount: BigInt(Math.round(distD * 10)),
          companyDiscount: BigInt(Math.round(compD * 10)),
          netRate: BigInt(
            Math.round((manualNet > 0 ? manualNet : autoNet) * 100),
          ),
        };
      });
      const pharm = allPharmacies.find((p) => p.name === order.pharmacyName);
      const pharmacyBackendId = pharm?.id ?? order.backendId;
      await actor.updateOrderLines(
        order.backendId,
        pharmacyBackendId,
        orderLines,
        "",
      );
      toast.success("Order updated | آرڈر اپ ڈیٹ ہو گیا");
      setShowEditModal(false);
      onOrderUpdated?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error updating order: ${msg}`);
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handlePrint() {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const html = buildPrintHtml([order]);
    printWin.document.write(html);
    printWin.document.close();
    printWin.print();
  }

  return (
    <dialog
      className="fixed inset-0 z-50 flex items-center justify-center p-4 w-full h-full max-w-none max-h-none m-0 bg-black/55 open:flex"
      open
      aria-labelledby="order-modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 text-white"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
          }}
        >
          <div>
            <h2
              id="order-modal-title"
              className="text-lg font-bold font-heading"
            >
              {order.orderId} — Invoice | انوائس
            </h2>
            <p className="text-white/70 text-sm">{order.pharmacyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Order meta */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Pharmacy
              </p>
              <p className="font-bold text-gray-900">{order.pharmacyName}</p>
              {order.pharmacyArea && (
                <p className="text-sm text-gray-500">{order.pharmacyArea}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Staff | بکر
              </p>
              <p className="font-bold text-gray-900">
                {order.staffName || "—"}
              </p>
              {order.staffCode && (
                <p className="text-sm text-gray-500 font-mono">
                  {order.staffCode}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Date | تاریخ
              </p>
              <p className="font-semibold text-gray-900">
                {formatDate(order.date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                Status | حیثیت
              </p>
              <StatusBadge status={order.status} />
            </div>
            {order.paymentReceived > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                  Payment Received | موصول
                </p>
                <p className="font-bold text-emerald-700">
                  {formatCurrency(order.paymentReceived)}
                </p>
              </div>
            )}
            {order.paymentReceived >= 0 && order.totalAmount > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                  Balance | باقی
                </p>
                <p
                  className={`font-bold ${(order.totalAmount - order.paymentReceived) > 0 ? "text-red-600" : "text-emerald-600"}`}
                >
                  {formatCurrency(
                    Math.abs(order.totalAmount - order.paymentReceived),
                  )}
                  {order.totalAmount - order.paymentReceived > 0
                    ? " (baqi)"
                    : " (paid)"}
                </p>
              </div>
            )}
            {(order.pharmacyMasterCode || order.pharmacyCode) && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
                  Pharmacy Code | فارمیسی کوڈ
                </p>
                <p className="font-bold text-gray-900 font-mono">
                  {order.pharmacyMasterCode || order.pharmacyCode}
                </p>
              </div>
            )}
          </div>

          {/* Items table */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">
              Order Items | اشیاء
            </h3>
            {(() => {
              const hasBonus = order.items.some((i) => i.bonusQty > 0);
              const hasDistDisc = order.items.some(
                (i) => i.distributionDiscount > 0,
              );
              const hasCompDisc = order.items.some(
                (i) => i.companyDiscount > 0,
              );
              const totalCols =
                7 +
                (hasBonus ? 1 : 0) +
                (hasDistDisc ? 2 : 0) +
                (hasCompDisc ? 2 : 0);
              const discountedSubtotal = order.items.reduce((s, i) => {
                const distPct = i.distributionDiscount / 10;
                const compPct = i.companyDiscount / 10;
                const totalPct = distPct + compPct;
                const manualNet = i.netRate > 0 ? i.netRate / 100 : null;
                const effNet = manualNet ?? i.unitPrice * (1 - totalPct / 100);
                return s + effNet * i.qty;
              }, 0);
              const advTax = Math.round(discountedSubtotal * 0.005);
              const grandTotal = discountedSubtotal + advTax;
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 border-b border-blue-200">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-blue-700 uppercase">
                        Medicine
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-blue-700 uppercase">
                        Strength
                      </th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-purple-700 uppercase">
                        Type | قسم
                      </th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-purple-700 uppercase">
                        Pack Size
                      </th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-blue-700 uppercase">
                        Qty
                      </th>
                      {hasBonus && (
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-700 uppercase">
                          Bonus | بونس
                        </th>
                      )}
                      {hasDistDisc && (
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-amber-700 uppercase">
                          Dist Disc%
                        </th>
                      )}
                      {hasDistDisc && (
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-red-700 uppercase">
                          Dist Amt
                        </th>
                      )}
                      {hasCompDisc && (
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-blue-600 uppercase">
                          Co Disc%
                        </th>
                      )}
                      {hasCompDisc && (
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-blue-800 uppercase">
                          Co Amt
                        </th>
                      )}
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-blue-700 uppercase">
                        Price
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold text-blue-700 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, i) => {
                      const hasReturnItems =
                        (order.returnItems ?? []).length > 0;
                      const isReturned = (order.returnItems ?? []).some(
                        (r) => r.medicineId === item.medicineId,
                      );
                      const rowClass = hasReturnItems
                        ? isReturned
                          ? "bg-red-50 border-l-2 border-l-red-400"
                          : "bg-emerald-50/40 border-l-2 border-l-emerald-400"
                        : i % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50/50";
                      const distDiscPct = item.distributionDiscount / 10;
                      const compDiscPct = item.companyDiscount / 10;
                      const distDiscAmt =
                        distDiscPct > 0
                          ? Math.round(
                              (item.unitPrice * item.qty * distDiscPct) / 100,
                            )
                          : 0;
                      const compDiscAmt =
                        compDiscPct > 0
                          ? Math.round(
                              (item.unitPrice * item.qty * compDiscPct) / 100,
                            )
                          : 0;
                      const manualNet =
                        item.netRate > 0 ? item.netRate / 100 : null;
                      const effNet =
                        manualNet ??
                        item.unitPrice *
                          (1 - (distDiscPct + compDiscPct) / 100);
                      const discountedTotal = effNet * item.qty;
                      return (
                        <tr
                          key={`${item.medicineName}-${i}`}
                          className={rowClass}
                        >
                          <td className="px-3 py-2.5 font-semibold text-gray-900">
                            {item.medicineName}
                            {isReturned && (
                              <span className="ml-1 text-xs text-red-500">
                                (Returned)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500">
                            {item.strength || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold text-purple-700">
                            {item.productType || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-gray-500">
                            {item.packSize || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-gray-700">
                            {item.qty}
                          </td>
                          {hasBonus && (
                            <td className="px-3 py-2.5 text-center font-bold text-emerald-600">
                              {item.bonusQty > 0 ? item.bonusQty : "—"}
                            </td>
                          )}
                          {hasDistDisc && (
                            <td className="px-3 py-2.5 text-center font-bold text-amber-600">
                              {distDiscPct > 0 ? `${distDiscPct}%` : "—"}
                            </td>
                          )}
                          {hasDistDisc && (
                            <td className="px-3 py-2.5 text-right font-bold text-red-600">
                              {distDiscAmt > 0
                                ? `-${formatCurrency(distDiscAmt)}`
                                : "—"}
                            </td>
                          )}
                          {hasCompDisc && (
                            <td className="px-3 py-2.5 text-center font-bold text-blue-600">
                              {compDiscPct > 0 ? `${compDiscPct}%` : "—"}
                            </td>
                          )}
                          {hasCompDisc && (
                            <td className="px-3 py-2.5 text-right font-bold text-blue-800">
                              {compDiscAmt > 0
                                ? `-${formatCurrency(compDiscAmt)}`
                                : "—"}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-right text-gray-600">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-blue-700">
                            {formatCurrency(discountedTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td
                        colSpan={totalCols - 1}
                        className="px-3 py-2 text-right font-semibold text-gray-600 text-sm"
                      >
                        Sub Total | ذیلی کل
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-700 text-sm">
                        {formatCurrency(discountedSubtotal)}
                      </td>
                    </tr>
                    <tr className="bg-yellow-50 border-t border-yellow-200">
                      <td
                        colSpan={totalCols - 1}
                        className="px-3 py-2 text-right font-semibold text-yellow-800 text-xs"
                      >
                        Advanced Tax U/S 236-H @ 0.50%
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-yellow-800 text-xs">
                        {formatCurrency(advTax)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-blue-300 bg-blue-50">
                      <td
                        colSpan={totalCols - 1}
                        className="px-3 py-3 text-right font-bold text-blue-800"
                      >
                        Grand Total | کل رقم
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-xl text-blue-800">
                        {formatCurrency(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
            {order.returnReason && (
              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-700">
                  Return Reason | واپسی کی وجہ:
                </p>
                <p className="text-sm text-orange-800 mt-1">
                  {order.returnReason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <div>
            {order.status === "pending" && (
              <button
                type="button"
                data-ocid="office_order_modal.edit_button"
                onClick={openEditModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-sm transition-colors"
              >
                <Pencil size={14} />
                Edit Order | ترمیم کریں
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Close | بند کریں
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              <Printer size={15} />
              Print Invoice | انوائس پرنٹ
            </button>
          </div>
        </div>
      </div>

      {/* Office Edit Order Overlay Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4 text-white"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
              }}
            >
              <h2 className="font-bold font-heading text-base">
                Edit Order {order.orderId} | ترمیم
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1">
                <div className="col-span-4">Medicine</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-1 text-center">Bonus</div>
                <div className="col-span-2 text-center">Dist%</div>
                <div className="col-span-2 text-center">Co%</div>
                <div className="col-span-1 text-center">Net</div>
                <div className="col-span-1" />
              </div>
              {editLines.map((line) => (
                <div
                  key={line._key}
                  className="grid grid-cols-12 gap-1 items-center"
                >
                  <div className="col-span-4 relative">
                    <input
                      type="text"
                      value={
                        editMedDropOpen[line._key]
                          ? (editMedSearch[line._key] ?? "")
                          : line.medicineName
                      }
                      onChange={(e) => {
                        setEditMedSearch((prev) => ({
                          ...prev,
                          [line._key]: e.target.value,
                        }));
                        setEditMedDropOpen((prev) => ({
                          ...prev,
                          [line._key]: true,
                        }));
                      }}
                      onFocus={() => {
                        setEditMedSearch((prev) => ({
                          ...prev,
                          [line._key]: "",
                        }));
                        setEditMedDropOpen((prev) => ({
                          ...prev,
                          [line._key]: true,
                        }));
                      }}
                      onKeyDown={() => {
                        if (!editMedDropOpen[line._key]) {
                          setEditMedSearch((prev) => ({
                            ...prev,
                            [line._key]: "",
                          }));
                          setEditMedDropOpen((prev) => ({
                            ...prev,
                            [line._key]: true,
                          }));
                        }
                      }}
                      placeholder="Medicine..."
                      className="w-full h-8 text-xs border border-gray-300 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {editMedDropOpen[line._key] && (
                      <>
                        <div className="absolute z-20 top-full mt-0.5 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                          {(() => {
                            const q = (
                              editMedSearch[line._key] ?? ""
                            ).toLowerCase();
                            const filtered = allMedicines.filter((m) => {
                              if (!q) return true;
                              return (
                                m.name.toLowerCase().includes(q) ||
                                m.company.toLowerCase().includes(q)
                              );
                            });
                            return filtered.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-gray-400">
                                No medicines found
                              </div>
                            ) : (
                              filtered.map((m) => (
                                <button
                                  type="button"
                                  key={String(m.backendId)}
                                  onClick={() => {
                                    setEditLines((prev) =>
                                      prev.map((l) =>
                                        l._key === line._key
                                          ? {
                                              ...l,
                                              medicineId: m.backendId,
                                              medicineName: m.name,
                                              unitPrice: m.price,
                                            }
                                          : l,
                                      ),
                                    );
                                    setEditMedDropOpen((prev) => ({
                                      ...prev,
                                      [line._key]: false,
                                    }));
                                  }}
                                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 transition-colors"
                                >
                                  {m.name}
                                  {m.strength && (
                                    <span className="text-gray-400 ml-1">
                                      ({m.strength})
                                    </span>
                                  )}
                                  {m.company && (
                                    <span className="text-gray-400 ml-1 text-[10px]">
                                      · {m.company}
                                    </span>
                                  )}
                                </button>
                              ))
                            );
                          })()}
                        </div>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() =>
                            setEditMedDropOpen((prev) => ({
                              ...prev,
                              [line._key]: false,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Escape" &&
                            setEditMedDropOpen((prev) => ({
                              ...prev,
                              [line._key]: false,
                            }))
                          }
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.qty}
                      onChange={(e) =>
                        setEditLines((prev) =>
                          prev.map((l) =>
                            l._key === line._key
                              ? { ...l, qty: e.target.value }
                              : l,
                          ),
                        )
                      }
                      className="w-full h-8 border border-gray-300 rounded-lg px-1 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.bonus}
                      onChange={(e) =>
                        setEditLines((prev) =>
                          prev.map((l) =>
                            l._key === line._key
                              ? { ...l, bonus: e.target.value }
                              : l,
                          ),
                        )
                      }
                      className="w-full h-8 border border-emerald-300 bg-emerald-50 rounded-lg px-1 text-xs text-center text-emerald-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={line.distDisc}
                      onChange={(e) =>
                        setEditLines((prev) =>
                          prev.map((l) =>
                            l._key === line._key
                              ? { ...l, distDisc: e.target.value }
                              : l,
                          ),
                        )
                      }
                      className="w-full h-8 border border-amber-300 bg-amber-50 rounded-lg px-1 text-xs text-center text-amber-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={line.compDisc}
                      onChange={(e) =>
                        setEditLines((prev) =>
                          prev.map((l) =>
                            l._key === line._key
                              ? { ...l, compDisc: e.target.value }
                              : l,
                          ),
                        )
                      }
                      className="w-full h-8 border border-blue-300 bg-blue-50 rounded-lg px-1 text-xs text-center text-blue-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={line.netRate === "0" ? "" : line.netRate}
                      onChange={(e) =>
                        setEditLines((prev) =>
                          prev.map((l) =>
                            l._key === line._key
                              ? { ...l, netRate: e.target.value || "0" }
                              : l,
                          ),
                        )
                      }
                      className="w-full h-8 border border-purple-300 bg-purple-50 rounded-lg px-1 text-xs text-center text-purple-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setEditLines((prev) =>
                          prev.filter((l) => l._key !== line._key),
                        )
                      }
                      className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setEditLines((prev) => [
                    ...prev,
                    {
                      _key: `oedit-new-${Date.now()}`,
                      medicineId: allMedicines[0]?.backendId ?? BigInt(0),
                      medicineName: allMedicines[0]?.name ?? "",
                      qty: "1",
                      bonus: "0",
                      distDisc: "0",
                      compDisc: "0",
                      netRate: "0",
                      unitPrice: allMedicines[0]?.price ?? 0,
                    },
                  ])
                }
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
              >
                <Plus size={12} />
                Add Item
              </button>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="office_order_modal.save_button"
                onClick={handleSaveOfficeEdit}
                disabled={isSavingEdit || editLines.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {isSavingEdit ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Save Changes | محفوظ کریں
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}

// ─── Office Order History Hierarchy Component ─────────────────────────────────

// biome-ignore lint/correctness/noUnusedVariables: kept for reference
function buildDatePrintHtml(
  orders: OfficeOrderDetail[],
  dateLabel: string,
): string {
  const rows = orders
    .map(
      (o) => `
    <tr>
      <td>${o.orderId}</td>
      <td>${o.pharmacyName}</td>
      <td>${o.staffName || "—"}</td>
      <td style="text-align:center">${o.itemCount}</td>
      <td style="text-align:right">Rs ${o.totalAmount.toFixed(2)}</td>
      <td style="text-align:center">${o.status}</td>
    </tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><title>Order History - ${dateLabel}</title>
  <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
  h2{margin:0 0 4px}p{margin:0 0 12px;color:#555}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
  th{background:#f3f4f6;font-weight:600}
  .booker-group{margin-top:14px;font-weight:700;font-size:12px;background:#e0f2fe;padding:4px 8px;border-radius:4px}
  </style></head><body>
  <h2>MIAN MEDICINE DISTRIBUTOR</h2>
  <p>Order History — ${dateLabel} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString("en-PK")}</p>
  <table><thead><tr><th>Invoice #</th><th>Pharmacy</th><th>Staff</th><th>Items</th><th>Amount</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
}

function OfficeOrderHistoryHierarchy({
  isLoading,
  filteredHistory,
  setSelectedOrder,
}: {
  isLoading: boolean;
  filteredHistory: OfficeOrderDetail[];
  setSelectedOrder: (o: OfficeOrderDetail) => void;
}) {
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(
    {},
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const pastOrders = filteredHistory.filter((o) => o.date !== todayStr);

  // Group by month (YYYY-MM) then by date (YYYY-MM-DD)
  const monthMap = pastOrders.reduce<
    Record<string, Record<string, OfficeOrderDetail[]>>
  >((acc, order) => {
    const monthKey = order.date ? order.date.substring(0, 7) : "unknown";
    const dateKey = order.date ?? "unknown";
    if (!acc[monthKey]) acc[monthKey] = {};
    if (!acc[monthKey][dateKey]) acc[monthKey][dateKey] = [];
    acc[monthKey][dateKey].push(order);
    return acc;
  }, {});
  const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));

  const toggleMonth = (m: string) =>
    setExpandedMonths((p) => ({ ...p, [m]: !p[m] }));
  const toggleDate = (d: string) =>
    setExpandedDates((p) => ({ ...p, [d]: !p[d] }));

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  };
  const formatDateLabel = (ymd: string) => {
    const d = new Date(`${ymd}T00:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  };

  const handleDatePrint = (orders: OfficeOrderDetail[], _dateLabel: string) => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(buildPrintHtml(orders));
    printWin.document.close();
    printWin.print();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (pastOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-center py-20 text-gray-400">
        <History size={40} className="mx-auto mb-3 opacity-50" />
        <p className="font-medium">No history orders | کوئی تاریخ نہیں</p>
        <p className="text-xs mt-1">
          Orders from previous dates will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedMonths.map((monthKey) => {
        const isMonthOpen = !!expandedMonths[monthKey];
        const datesInMonth = monthMap[monthKey];
        const sortedDates = Object.keys(datesInMonth).sort((a, b) =>
          b.localeCompare(a),
        );
        const totalInMonth = sortedDates.reduce(
          (s, d) => s + datesInMonth[d].length,
          0,
        );

        return (
          <div
            key={monthKey}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Month row */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50 transition-colors text-left"
              onClick={() => toggleMonth(monthKey)}
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  size={18}
                  className={`text-blue-500 transition-transform ${isMonthOpen ? "rotate-90" : ""}`}
                />
                <span className="font-bold text-gray-900 text-base">
                  {formatMonthLabel(monthKey)}
                </span>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">
                {totalInMonth} orders
              </span>
            </button>

            {isMonthOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {sortedDates.map((dateKey) => {
                  const isDateOpen = !!expandedDates[dateKey];
                  const ordersOnDate = datesInMonth[dateKey];
                  const dateLabel = formatDateLabel(dateKey);

                  // Group by booker (staffName)
                  const bookerMap = ordersOnDate.reduce<
                    Record<string, OfficeOrderDetail[]>
                  >((acc, o) => {
                    const booker = o.staffName || "Unknown";
                    if (!acc[booker]) acc[booker] = [];
                    acc[booker].push(o);
                    return acc;
                  }, {});
                  const sortedBookers = Object.keys(bookerMap).sort();

                  return (
                    <div key={dateKey}>
                      {/* Date row */}
                      <div className="w-full flex items-center justify-between px-8 py-3 bg-white border-b border-gray-100">
                        <button
                          type="button"
                          className="flex items-center gap-2 hover:text-blue-700 transition-colors text-left flex-1"
                          onClick={() => toggleDate(dateKey)}
                        >
                          <ChevronRight
                            size={15}
                            className={`text-gray-400 transition-transform ${isDateOpen ? "rotate-90" : ""}`}
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            {dateLabel}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {ordersOnDate.length}
                          </span>
                        </button>
                        {isDateOpen && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDatePrint(ordersOnDate, dateLabel);
                            }}
                            className="flex items-center gap-1.5 text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors ml-3"
                          >
                            <Printer size={12} />
                            Print
                          </button>
                        )}
                      </div>

                      {isDateOpen && (
                        <div className="bg-gray-50 pb-2">
                          {sortedBookers.map((booker) => (
                            <div key={booker} className="mb-3">
                              {/* Booker group header */}
                              <div className="flex items-center gap-2 px-8 py-2 bg-blue-50 border-y border-blue-100">
                                <User size={13} className="text-blue-500" />
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                                  {booker}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                  {bookerMap[booker].length} orders
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        Invoice #
                                      </th>
                                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        Pharmacy
                                      </th>
                                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        Items
                                      </th>
                                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        Amount
                                      </th>
                                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        Status
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {bookerMap[booker].map((order) => (
                                      <tr
                                        key={String(order.backendId)}
                                        className="cursor-pointer hover:bg-blue-50/60 transition-colors bg-white"
                                        onClick={() => setSelectedOrder(order)}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            setSelectedOrder(order);
                                        }}
                                      >
                                        <td className="px-4 py-3">
                                          <span className="text-sm font-mono font-bold text-blue-700">
                                            {order.orderId}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="text-sm font-semibold text-gray-900">
                                            {order.pharmacyName}
                                          </div>
                                          {order.pharmacyArea && (
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                              <MapPin size={10} />{" "}
                                              {order.pharmacyArea}
                                            </div>
                                          )}
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
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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
  staffName: string;
  staffCode: string;
  date: string;
  itemCount: number;
  totalAmount: number;
  status: OrderStatus;
};

type OfficeOrderDetail = OfficeOrder & {
  items: Array<{
    medicineId: string;
    medicineName: string;
    strength: string;
    packSize: string;
    productType: string;
    qty: number;
    unitPrice: number;
    total: number;
    bonusQty: number;
    discountPercent: number;
    distributionDiscount: number;
    companyDiscount: number;
    netRate: number;
  }>;
  paymentReceived: number;
  returnItems: Array<{ medicineId: string; returnedQty: number }>;
  returnReason: string;
  pharmacyCode: string;
  pharmacyMasterCode: string;
};

// Helper to map raw order records to OfficeOrderDetail (outside component for stable ref)
function mapRawOrdersToDetail(
  rawOrders: RawOrder[],
  pharmacyMap: Map<
    string,
    { id: bigint; name: string; location: string; contact: string }
  >,
  medicineMap: Map<
    string,
    {
      id: bigint;
      name: string;
      price: bigint;
      strength: string;
      description: string;
      company: string;
      packSize: string;
    }
  >,
): OfficeOrderDetail[] {
  return rawOrders.map((rec) => {
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
    const recWithStaff = rec as unknown as {
      staffName?: string;
      staffCode?: string;
    } & RawOrder;
    const staffName =
      recWithStaff.staffName ||
      staffIdStr.slice(0, 12) + (staffIdStr.length > 12 ? "…" : "");
    const staffCode = recWithStaff.staffCode || "";
    const items = rec.orderLines.map((line) => {
      const med = medicineMap.get(String(line.medicineId));
      const unitPrice = med ? Number(med.price) : 0;
      const qty = Number(line.quantity);
      const seed = MEDICINE_SEEDS.find((s) => s.name === med?.name);
      const medCategory = seed?.category ?? inferCategory(med?.name ?? "");
      const rawDistDisc = Number(
        (line as unknown as { distributionDiscount?: bigint })
          .distributionDiscount ?? 0,
      );
      const rawCompDisc = Number(
        (line as unknown as { companyDiscount?: bigint }).companyDiscount ?? 0,
      );
      const rawDiscPct = Number(
        (line as unknown as { discountPercent?: bigint }).discountPercent ?? 0,
      );
      // Backward compat: if no distributionDiscount but has discountPercent, treat as dist disc
      const effectiveDistDisc = rawDistDisc > 0 ? rawDistDisc : rawDiscPct;
      const rawNetRate = Number(
        (line as unknown as { netRate?: bigint }).netRate ?? 0,
      );
      return {
        medicineId: String(line.medicineId),
        medicineName: med?.name ?? `Medicine #${line.medicineId}`,
        strength: med?.strength || seed?.strength || "",
        packSize: med?.packSize || seed?.packSize || "",
        productType: categoryToTypeLabel(medCategory),
        qty,
        unitPrice,
        total: unitPrice * qty,
        bonusQty: Number(
          (line as unknown as { bonusQty?: bigint }).bonusQty ?? 0,
        ),
        discountPercent: rawDiscPct,
        distributionDiscount: effectiveDistDisc,
        companyDiscount: rawCompDisc,
        netRate: rawNetRate,
      };
    });
    const totalAmount = items.reduce((s, i) => s + i.total, 0);
    const itemCount = items.length;
    return {
      backendId: rec.id,
      orderId: `ORD-${rec.id}`,
      pharmacyName: pharm?.name ?? `Pharmacy #${rec.pharmacyId}`,
      pharmacyArea: area,
      staffId: staffIdStr.slice(0, 12) + (staffIdStr.length > 12 ? "…" : ""),
      staffName,
      staffCode,
      date,
      itemCount,
      totalAmount,
      status: mapBackendStatus(rec.status),
      items,
      paymentReceived: Number((rec as any).paymentReceived ?? 0),
      returnItems: ((rec as any).returnItems ?? []).map((ri: any) => ({
        medicineId: String(ri.medicineId),
        returnedQty: Number(ri.returnedQty),
      })),
      returnReason: (rec as any).returnReason ?? "",
      pharmacyCode: (rec as any).pharmacyCode ?? "",
      pharmacyMasterCode: (pharm as any)?.code ?? "",
    };
  });
}

// ─── Daily Sale Statement Component ──────────────────────────────────────────

type DailySaleStatementProps = {
  allOrders: OfficeOrderDetail[];
  allMedicines: Medicine[];
};

function DailySaleStatement({
  allOrders,
  allMedicines,
}: DailySaleStatementProps) {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [saleTab, setSaleTab] = useState<"all" | "deal" | "bonus">("all");

  // Email mock state
  type EmailModalState = { company: string; isSendAll: boolean } | null;
  const [emailModal, setEmailModal] = useState<EmailModalState>(null);
  const [emailAddresses, setEmailAddresses] = useState<Record<string, string>>(
    () => {
      try {
        const raw = localStorage.getItem("medorder_company_emails");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
  );
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentCompanies, setEmailSentCompanies] = useState<Set<string>>(
    new Set(),
  );

  function saveEmails(updated: Record<string, string>) {
    setEmailAddresses(updated);
    localStorage.setItem("medorder_company_emails", JSON.stringify(updated));
  }

  function handleMockSendEmail(companies: string[]) {
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      setEmailSentCompanies((prev) => {
        const next = new Set(prev);
        for (const c of companies) next.add(c);
        return next;
      });
      setEmailModal(null);
      toast.success(
        companies.length === 1
          ? `Email sent to ${companies[0]} representative (demo)`
          : `Emails sent to all ${companies.length} companies (demo)`,
        {
          description: "Upgrade to Plus/Pro plan to enable real email sending.",
        },
      );
    }, 1500);
  }

  // Get unique areas from orders
  const areas = useMemo(() => {
    const set = new Set<string>();
    for (const o of allOrders) {
      if (o.pharmacyArea?.trim()) set.add(o.pharmacyArea.trim());
    }
    return Array.from(set).sort();
  }, [allOrders]);

  // Filter orders by date range — only delivered orders, excluding returns
  const filteredOrders = useMemo(() => {
    return allOrders.filter(
      (o) => o.date >= dateFrom && o.date <= dateTo && o.status === "delivered",
    );
  }, [allOrders, dateFrom, dateTo]);

  // Group medicines by company
  const companiesMap = useMemo(() => {
    const map = new Map<string, Medicine[]>();
    for (const med of allMedicines) {
      const co = med.company || "Unknown";
      if (!map.has(co)) map.set(co, []);
      map.get(co)!.push(med);
    }
    return map;
  }, [allMedicines]);

  const companiesSorted = useMemo(
    () => Array.from(companiesMap.keys()).sort(),
    [companiesMap],
  );

  // Helper: get quarter for a date string
  function getQuarter(dateStr: string): 1 | 2 | 3 | 4 {
    const month = new Date(dateStr).getMonth(); // 0-indexed
    if (month <= 2) return 1;
    if (month <= 5) return 2;
    if (month <= 8) return 3;
    return 4;
  }

  // Helper: get last month date range
  function getLastMonthRange(): { from: string; to: string } {
    const now = new Date();
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: firstOfLastMonth.toISOString().split("T")[0],
      to: lastOfLastMonth.toISOString().split("T")[0],
    };
  }

  // Compute per-medicine stats
  type MedicineStat = {
    medicine: Medicine;
    areaUnits: Record<string, number>; // area -> units
    tradeRate: number;
    netSaleUnits: number;
    netSaleValue: number;
    saleBonus: number;
    dealCount: number;
    todaySale: number;
    todaySaleValue: number;
    lastMonthSale: number;
    lastMonthSaleValue: number;
    q1Sale: number;
    q1SaleValue: number;
    q2Sale: number;
    q2SaleValue: number;
    q3Sale: number;
    q3SaleValue: number;
    q4Sale: number;
    q4SaleValue: number;
    dealAreaUnits: Record<string, number>;
    bonusAreaUnits: Record<string, number>;
  };

  const lastMonthRange = getLastMonthRange();

  function computeStats(medicines: Medicine[]): MedicineStat[] {
    return medicines.map((med) => {
      const stat: MedicineStat = {
        medicine: med,
        areaUnits: {},
        tradeRate: med.price,
        netSaleUnits: 0,
        netSaleValue: 0,
        saleBonus: 0,
        dealCount: 0,
        todaySale: 0,
        todaySaleValue: 0,
        lastMonthSale: 0,
        lastMonthSaleValue: 0,
        q1Sale: 0,
        q1SaleValue: 0,
        q2Sale: 0,
        q2SaleValue: 0,
        q3Sale: 0,
        q3SaleValue: 0,
        q4Sale: 0,
        q4SaleValue: 0,
        dealAreaUnits: {},
        bonusAreaUnits: {},
      };

      for (const order of filteredOrders) {
        const area = order.pharmacyArea?.trim() || "";
        for (const item of order.items) {
          if (String(item.medicineId) !== String(med.backendId)) continue;

          // Subtract returned quantity
          const returnedQty =
            (order.returnItems || []).find(
              (ri) => ri.medicineId === item.medicineId,
            )?.returnedQty ?? 0;
          const effectiveQty = Math.max(0, item.qty - returnedQty);

          if (effectiveQty === 0) continue;

          const discPct = item.discountPercent / 10; // stored as percent * 10
          const discAmt = (discPct / 100) * item.unitPrice * effectiveQty;
          const netValue = item.unitPrice * effectiveQty - discAmt;

          // All sales area units
          stat.areaUnits[area] = (stat.areaUnits[area] || 0) + effectiveQty;
          stat.netSaleUnits += effectiveQty;
          stat.netSaleValue += netValue;
          stat.saleBonus += item.bonusQty || 0;

          if (item.discountPercent > 0) {
            stat.dealCount += 1;
            stat.dealAreaUnits[area] =
              (stat.dealAreaUnits[area] || 0) + effectiveQty;
          }

          if ((item.bonusQty || 0) > 0) {
            stat.bonusAreaUnits[area] =
              (stat.bonusAreaUnits[area] || 0) + (item.bonusQty || 0);
          }

          // Today sale
          if (order.date === today) {
            stat.todaySale += effectiveQty;
            stat.todaySaleValue += netValue;
          }

          // Last month sale
          if (
            order.date >= lastMonthRange.from &&
            order.date <= lastMonthRange.to
          ) {
            stat.lastMonthSale += effectiveQty;
            stat.lastMonthSaleValue += netValue;
          }

          // Quarterly
          const q = getQuarter(order.date);
          if (q === 1) {
            stat.q1Sale += effectiveQty;
            stat.q1SaleValue += netValue;
          } else if (q === 2) {
            stat.q2Sale += effectiveQty;
            stat.q2SaleValue += netValue;
          } else if (q === 3) {
            stat.q3Sale += effectiveQty;
            stat.q3SaleValue += netValue;
          } else {
            stat.q4Sale += effectiveQty;
            stat.q4SaleValue += netValue;
          }
        }
      }

      return stat;
    });
  }

  // Helper: build company block HTML (for print/PDF)
  function buildCompanyPrintHtml(
    companyName: string,
    stats: MedicineStat[],
  ): string {
    const areaHeaders = areas.map((a) => `<th>${a}</th>`).join("");

    const rows = stats
      .map((s) => {
        const areasCells = areas
          .map((a) => {
            const units =
              saleTab === "deal"
                ? s.dealAreaUnits[a] || 0
                : saleTab === "bonus"
                  ? s.bonusAreaUnits[a] || 0
                  : s.areaUnits[a] || 0;
            return `<td>${units || "-"}</td>`;
          })
          .join("");

        return `<tr>
          <td class="product-col">${s.medicine.name}${s.medicine.strength ? ` ${s.medicine.strength}` : ""}</td>
          ${areasCells}
          <td>${s.tradeRate.toFixed(2)}</td>
          <td>-</td><td>-</td><td>-</td>
          <td>${s.netSaleUnits || "-"}</td>
          <td>${s.saleBonus || "-"}</td>
          <td>${s.dealCount || "-"}</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td>${s.todaySale || "-"}</td>
          <td>${s.lastMonthSale || "-"}</td>
          <td>${s.q1Sale || "-"}</td>
          <td>${s.q2Sale || "-"}</td>
          <td>${s.q3Sale || "-"}</td>
          <td>${s.q4Sale || "-"}</td>
        </tr>`;
      })
      .join("");

    // Totals row — show Rs values for Today/LastMonth/Q1-Q4
    const totals = {
      areaUnits: areas.map((a) =>
        stats.reduce(
          (sum, s) =>
            sum +
            (saleTab === "deal"
              ? s.dealAreaUnits[a] || 0
              : saleTab === "bonus"
                ? s.bonusAreaUnits[a] || 0
                : s.areaUnits[a] || 0),
          0,
        ),
      ),
      netSaleUnits: stats.reduce((sum, s) => sum + s.netSaleUnits, 0),
      saleBonus: stats.reduce((sum, s) => sum + s.saleBonus, 0),
      dealCount: stats.reduce((sum, s) => sum + s.dealCount, 0),
      todaySaleValue: stats.reduce((sum, s) => sum + s.todaySaleValue, 0),
      lastMonthSaleValue: stats.reduce(
        (sum, s) => sum + s.lastMonthSaleValue,
        0,
      ),
      q1SaleValue: stats.reduce((sum, s) => sum + s.q1SaleValue, 0),
      q2SaleValue: stats.reduce((sum, s) => sum + s.q2SaleValue, 0),
      q3SaleValue: stats.reduce((sum, s) => sum + s.q3SaleValue, 0),
      q4SaleValue: stats.reduce((sum, s) => sum + s.q4SaleValue, 0),
    };

    const totalAreaCells = totals.areaUnits
      .map((u) => `<td><strong>${u || "-"}</strong></td>`)
      .join("");

    const fmtRs = (v: number) => (v > 0 ? `Rs. ${v.toFixed(0)}` : "-");

    const totalsRow = `<tr style="background:#e8f0e8;font-weight:bold;">
      <td class="product-col"><strong>TOTAL</strong></td>
      ${totalAreaCells}
      <td>-</td>
      <td>-</td><td>-</td><td>-</td>
      <td><strong>${totals.netSaleUnits || "-"}</strong></td>
      <td><strong>${totals.saleBonus || "-"}</strong></td>
      <td><strong>${totals.dealCount || "-"}</strong></td>
      <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
      <td><strong>${fmtRs(totals.todaySaleValue)}</strong></td>
      <td><strong>${fmtRs(totals.lastMonthSaleValue)}</strong></td>
      <td><strong>${fmtRs(totals.q1SaleValue)}</strong></td>
      <td><strong>${fmtRs(totals.q2SaleValue)}</strong></td>
      <td><strong>${fmtRs(totals.q3SaleValue)}</strong></td>
      <td><strong>${fmtRs(totals.q4SaleValue)}</strong></td>
    </tr>`;

    return `
    <div class="company-name">${companyName.toUpperCase()}</div>
    <table>
      <thead>
        <tr>
          <th class="product-col">Name of Product</th>
          ${areaHeaders}
          <th>Trade Rate</th>
          <th>Opening Bal.</th>
          <th>Recv Qty</th>
          <th>Bonus Recv</th>
          <th>Net Sale</th>
          <th>Sale Bonus</th>
          <th>Deal No.</th>
          <th>Stock Trans.</th>
          <th>Other Issues</th>
          <th>Claims</th>
          <th>Closing Tally</th>
          <th>Closing Bonus</th>
          <th>Today Sale (Rs)</th>
          <th>Last Mon. Sale (Rs)</th>
          <th>1st Qtr (Rs)</th>
          <th>2nd Qtr (Rs)</th>
          <th>3rd Qtr (Rs)</th>
          <th>4th Qtr (Rs)</th>
        </tr>
      </thead>
      <tbody>${rows}${totalsRow}</tbody>
    </table>
    `;
  }

  // Helper: wrap HTML body with full print document
  function wrapPrintHtml(body: string, title: string): string {
    return `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 9px; margin: 8px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
      th, td { border: 1px solid #333; padding: 2px 4px; text-align: center; white-space: nowrap; }
      th { background: #e8e8e8; font-weight: bold; }
      .product-col { text-align: left; min-width: 120px; }
      h2 { text-align: center; font-size: 16px; margin: 2px 0; font-weight: 900; letter-spacing: 1px; }
      h3 { text-align: center; font-size: 11px; margin: 2px 0; }
      h4 { text-align: center; font-size: 10px; margin: 2px 0; font-weight: normal; }
      .company-name { text-align: center; font-size: 13px; font-weight: bold; background: #1e3a6e; color: white; padding: 5px; margin: 6px 0; letter-spacing: 1px; page-break-before: auto; }
      .date-range { text-align: center; font-size: 9px; color: #444; margin: 2px 0; }
      @media print { body { margin: 0; } .page-break { page-break-before: always; } }
    </style></head><body>
    <h2>MIAN MEDICINE DISTRIBUTORS</h2>
    <h4>Opposite Quaid-e-Azam Ground, Old DHQ Road, Mandi Bahauddin</h4>
    <h3>Area Wise Sales Statement</h3>
    <div class="date-range">From: ${dateFrom} &nbsp;&nbsp; To: ${dateTo}</div>
    ${body}
    </body></html>`;
  }

  // Print a single company section
  function printCompanySection(companyName: string, stats: MedicineStat[]) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const body = buildCompanyPrintHtml(companyName, stats);
    printWindow.document.write(
      wrapPrintHtml(body, `Daily Sale Statement - ${companyName}`),
    );
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-heading">
              Daily Sale Statement | روزانہ فروخت بیان
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Mian Medicine Distributors — Area Wise Sales
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div className="font-semibold text-gray-600">
              MIAN MEDICINE DISTRIBUTORS
            </div>
            <div>
              Opposite Quaid-e-Azam Ground, Old DHQ Road, Mandi Bahauddin
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="dss-date-from"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              From
            </label>
            <input
              id="dss-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 border border-gray-300 rounded-lg px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="dss-date-to"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              To
            </label>
            <input
              id="dss-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 border border-gray-300 rounded-lg px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["all", "deal", "bonus"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSaleTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  saleTab === tab
                    ? "bg-white text-blue-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "all"
                  ? "All Sales"
                  : tab === "deal"
                    ? "Deal Sales"
                    : "Bonus Sales"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const printWin = window.open("", "_blank");
              if (!printWin) return;
              let allBody = "";
              for (const co of companiesSorted) {
                const meds = companiesMap.get(co) ?? [];
                const coStats = computeStats(meds);
                allBody += buildCompanyPrintHtml(co, coStats);
              }
              printWin.document.write(
                wrapPrintHtml(allBody, "Daily Sale Statement — All Companies"),
              );
              printWin.document.close();
              printWin.print();
            }}
            disabled={companiesSorted.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Download size={14} />
            Download All | سب ڈاؤنلوڈ
          </button>
          <button
            type="button"
            data-ocid="dss.send_all_email_button"
            onClick={() => setEmailModal({ company: "", isSendAll: true })}
            disabled={companiesSorted.length === 0}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <SendHorizonal size={14} />
            Send All | سب بھیجیں
          </button>
          <div className="ml-auto text-xs text-gray-400">
            {filteredOrders.length} orders in range • {allMedicines.length}{" "}
            medicines
          </div>
        </div>
      </div>

      {/* Company sections */}
      {companiesSorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            No medicines found. Add medicines via the Manage screen.
          </p>
        </div>
      ) : (
        companiesSorted.map((company) => {
          const meds = companiesMap.get(company) ?? [];
          const stats = computeStats(meds);

          // Compute totals for this company
          const totalNetUnits = stats.reduce((s, m) => s + m.netSaleUnits, 0);
          const totalNetValue = stats.reduce((s, m) => s + m.netSaleValue, 0);
          const totalBonus = stats.reduce((s, m) => s + m.saleBonus, 0);
          const _totalToday = stats.reduce((s, m) => s + m.todaySale, 0);
          const totalTodayValue = stats.reduce(
            (s, m) => s + m.todaySaleValue,
            0,
          );
          const _totalLastMonth = stats.reduce(
            (s, m) => s + m.lastMonthSale,
            0,
          );
          const totalLastMonthValue = stats.reduce(
            (s, m) => s + m.lastMonthSaleValue,
            0,
          );
          const _totalQ1 = stats.reduce((s, m) => s + m.q1Sale, 0);
          const totalQ1Value = stats.reduce((s, m) => s + m.q1SaleValue, 0);
          const _totalQ2 = stats.reduce((s, m) => s + m.q2Sale, 0);
          const totalQ2Value = stats.reduce((s, m) => s + m.q2SaleValue, 0);
          const _totalQ3 = stats.reduce((s, m) => s + m.q3Sale, 0);
          const totalQ3Value = stats.reduce((s, m) => s + m.q3SaleValue, 0);
          const _totalQ4 = stats.reduce((s, m) => s + m.q4Sale, 0);
          const totalQ4Value = stats.reduce((s, m) => s + m.q4SaleValue, 0);

          return (
            <div
              key={company}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Company header */}
              <div className="bg-[#1e3a6e] text-white px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-0.5">
                    Company
                  </div>
                  <h3 className="text-lg font-bold tracking-wide uppercase">
                    {company}
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div className="text-xs text-blue-200">
                    <div>{meds.length} products</div>
                    <div>Net: {totalNetUnits} units</div>
                    <div className="font-semibold text-white">
                      {formatCurrency(totalNetValue)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => printCompanySection(company, stats)}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Printer size={13} />
                    Print Page
                  </button>
                  <button
                    type="button"
                    onClick={() => printCompanySection(company, stats)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                    title="Save as PDF via browser print dialog"
                  >
                    <Download size={13} />
                    PDF ↓
                  </button>
                  <button
                    type="button"
                    data-ocid={`dss.company_email_button.${companiesSorted.indexOf(company) + 1}`}
                    onClick={() => setEmailModal({ company, isSendAll: false })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                      emailSentCompanies.has(company)
                        ? "bg-green-600 border-green-500 text-white"
                        : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                    }`}
                    title="Send sale statement by email"
                  >
                    <Mail size={13} />
                    {emailSentCompanies.has(company) ? "Sent ✓" : "Email"}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 min-w-[160px]">
                        Name of Product
                      </th>
                      {areas.map((area) => (
                        <th
                          key={area}
                          className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[50px] text-center"
                        >
                          {area}
                        </th>
                      ))}
                      {areas.length === 0 && (
                        <th className="px-2 py-2 text-gray-400 italic">
                          No Areas
                        </th>
                      )}
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[65px] text-center">
                        Trade Rate
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center bg-gray-100">
                        Open. Bal
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center">
                        Recv Qty
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center">
                        Bonus Recv
                      </th>
                      <th className="px-2 py-2 font-semibold text-blue-800 border-r border-gray-200 min-w-[55px] text-center bg-blue-50">
                        Net Sale
                      </th>
                      <th className="px-2 py-2 font-semibold text-emerald-700 border-r border-gray-200 min-w-[55px] text-center bg-emerald-50">
                        Sale Bonus
                      </th>
                      <th className="px-2 py-2 font-semibold text-amber-700 border-r border-gray-200 min-w-[50px] text-center bg-amber-50">
                        Deal No.
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center bg-gray-100">
                        Stock Trans.
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center bg-gray-100">
                        Other Issues
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center bg-gray-100">
                        Claims
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center bg-gray-100">
                        Closing Tally
                      </th>
                      <th className="px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[55px] text-center bg-gray-100">
                        Closing Bonus
                      </th>
                      <th className="px-2 py-2 font-semibold text-orange-700 border-r border-gray-200 min-w-[60px] text-center bg-orange-50">
                        Today Sale
                      </th>
                      <th className="px-2 py-2 font-semibold text-purple-700 border-r border-gray-200 min-w-[65px] text-center bg-purple-50">
                        Last Mon. Sale
                      </th>
                      <th className="px-2 py-2 font-semibold text-indigo-700 border-r border-gray-200 min-w-[50px] text-center bg-indigo-50">
                        1st Qtr
                      </th>
                      <th className="px-2 py-2 font-semibold text-indigo-700 border-r border-gray-200 min-w-[50px] text-center bg-indigo-50">
                        2nd Qtr
                      </th>
                      <th className="px-2 py-2 font-semibold text-indigo-700 border-r border-gray-200 min-w-[50px] text-center bg-indigo-50">
                        3rd Qtr
                      </th>
                      <th className="px-2 py-2 font-semibold text-indigo-700 border-r border-gray-200 min-w-[50px] text-center bg-indigo-50">
                        4th Qtr
                      </th>
                      <th className="px-2 py-2 font-semibold text-teal-700 border-r border-gray-200 min-w-[60px] text-center bg-teal-50">
                        Inventory | اسٹاک
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s, idx) => {
                      const getAreaVal = (area: string) =>
                        saleTab === "deal"
                          ? s.dealAreaUnits[area] || 0
                          : saleTab === "bonus"
                            ? s.bonusAreaUnits[area] || 0
                            : s.areaUnits[area] || 0;

                      return (
                        <tr
                          key={s.medicine.id}
                          className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                        >
                          <td className="px-3 py-1.5 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                            <div className="font-medium text-gray-900">
                              {s.medicine.name}
                            </div>
                            {s.medicine.strength && (
                              <div className="text-gray-400 text-[10px]">
                                {s.medicine.strength}
                              </div>
                            )}
                          </td>
                          {areas.map((area) => (
                            <td
                              key={area}
                              className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-700"
                            >
                              {getAreaVal(area) || (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          ))}
                          {areas.length === 0 && (
                            <td className="px-2 py-1.5 text-center text-gray-300">
                              -
                            </td>
                          )}
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-700">
                            {s.tradeRate.toFixed(2)}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-gray-50">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 font-semibold text-blue-700 bg-blue-50/50">
                            {s.netSaleUnits || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 font-semibold text-emerald-700 bg-emerald-50/50">
                            {s.saleBonus || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 font-semibold text-amber-700 bg-amber-50/50">
                            {s.dealCount || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-gray-50">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-gray-50">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-gray-50">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-gray-50">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-gray-50">
                            -
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 font-semibold text-orange-700 bg-orange-50/50">
                            {s.todaySale || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 font-semibold text-purple-700 bg-purple-50/50">
                            {s.lastMonthSale || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-indigo-700 bg-indigo-50/50">
                            {s.q1Sale || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-indigo-700 bg-indigo-50/50">
                            {s.q2Sale || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-indigo-700 bg-indigo-50/50">
                            {s.q3Sale || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-gray-100 text-indigo-700 bg-indigo-50/50">
                            {s.q4Sale || (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          {(() => {
                            const inv = getStock(s.medicine.backendId);
                            if (inv === null)
                              return (
                                <td className="px-2 py-1.5 text-center border-r border-gray-100 text-gray-300 bg-teal-50/30">
                                  --
                                </td>
                              );
                            const cls =
                              inv === 0
                                ? "text-red-700 bg-red-50"
                                : inv <= 10
                                  ? "text-amber-700 bg-amber-50"
                                  : "text-teal-700 bg-teal-50";
                            return (
                              <td
                                className={`px-2 py-1.5 text-center border-r border-gray-100 font-semibold ${cls}`}
                              >
                                {inv}
                              </td>
                            );
                          })()}
                        </tr>
                      );
                    })}

                    {/* Company Totals Row */}
                    <tr className="border-t-2 border-[#1e3a6e] bg-[#1e3a6e]/5 font-bold">
                      <td className="px-3 py-2 sticky left-0 bg-[#eef2f8] z-10 border-r border-gray-300 text-[#1e3a6e] uppercase tracking-wide">
                        TOTAL
                      </td>
                      {areas.map((area) => (
                        <td
                          key={area}
                          className="px-2 py-2 text-center border-r border-gray-200 text-[#1e3a6e]"
                        >
                          {stats.reduce(
                            (sum, s) =>
                              sum +
                              (saleTab === "deal"
                                ? s.dealAreaUnits[area] || 0
                                : saleTab === "bonus"
                                  ? s.bonusAreaUnits[area] || 0
                                  : s.areaUnits[area] || 0),
                            0,
                          ) || (
                            <span className="text-gray-300 font-normal">-</span>
                          )}
                        </td>
                      ))}
                      {areas.length === 0 && (
                        <td className="px-2 py-2 text-center text-gray-300">
                          -
                        </td>
                      )}
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-500">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300 bg-gray-50">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-blue-800 bg-blue-100">
                        {totalNetUnits || "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-emerald-800 bg-emerald-100">
                        {totalBonus || "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-amber-800 bg-amber-100">
                        {stats.reduce((sum, s) => sum + s.dealCount, 0) || "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300 bg-gray-50">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300 bg-gray-50">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300 bg-gray-50">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300 bg-gray-50">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-300 bg-gray-50">
                        -
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-orange-800 bg-orange-100 text-[10px]">
                        {totalTodayValue > 0
                          ? `Rs. ${totalTodayValue.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-purple-800 bg-purple-100 text-[10px]">
                        {totalLastMonthValue > 0
                          ? `Rs. ${totalLastMonthValue.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-indigo-800 bg-indigo-100 text-[10px]">
                        {totalQ1Value > 0
                          ? `Rs. ${totalQ1Value.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-indigo-800 bg-indigo-100 text-[10px]">
                        {totalQ2Value > 0
                          ? `Rs. ${totalQ2Value.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-indigo-800 bg-indigo-100 text-[10px]">
                        {totalQ3Value > 0
                          ? `Rs. ${totalQ3Value.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-indigo-800 bg-indigo-100 text-[10px]">
                        {totalQ4Value > 0
                          ? `Rs. ${totalQ4Value.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 text-teal-800 bg-teal-50 text-[10px]">
                        {stats.reduce((sum, s) => {
                          const inv = getStock(s.medicine.backendId);
                          return sum + (inv ?? 0);
                        }, 0) || "-"}
                      </td>
                    </tr>

                    {/* Net Value row */}
                    <tr className="bg-[#eef2f8] border-b border-gray-300">
                      <td className="px-3 py-1.5 sticky left-0 bg-[#eef2f8] z-10 border-r border-gray-300 text-[#1e3a6e] font-semibold text-[10px] uppercase">
                        Net Value
                      </td>
                      {areas.map((area) => (
                        <td
                          key={area}
                          className="px-2 py-1.5 text-center border-r border-gray-200 text-[10px] text-gray-400"
                        >
                          -
                        </td>
                      ))}
                      {areas.length === 0 && (
                        <td className="px-2 py-1.5 text-center text-gray-300">
                          -
                        </td>
                      )}
                      <td
                        className="px-2 py-1.5 text-center border-r border-gray-200 text-gray-400 text-[10px]"
                        colSpan={3}
                      >
                        -
                      </td>
                      <td
                        className="px-2 py-1.5 text-center border-r border-gray-200 font-bold text-blue-800 bg-blue-50"
                        colSpan={2}
                      >
                        {formatCurrency(totalNetValue)}
                      </td>
                      <td
                        className="px-2 py-1.5 text-center border-r border-gray-200 text-gray-400 text-[10px]"
                        colSpan={15}
                      >
                        -
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {/* Email Mock Modal */}
      {emailModal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-ocid="dss.email_modal"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-purple-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={18} />
                <h3 className="font-bold text-base">
                  {emailModal.isSendAll
                    ? "Send All Companies | سب کمپنیاں"
                    : `Email — ${emailModal.company}`}
                </h3>
              </div>
              <button
                type="button"
                data-ocid="dss.email_modal_close_button"
                onClick={() => setEmailModal(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Demo notice */}
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start gap-2">
              <span className="text-amber-600 text-lg leading-none mt-0.5">
                ⚠
              </span>
              <p className="text-xs text-amber-700 font-medium">
                Demo Mode — Emails will not actually be sent. Upgrade to
                Plus/Pro plan to enable real email sending.
                <br />
                <span className="text-amber-500">
                  ڈیمو موڈ — اصل ای میل نہیں بھیجی جائے گی۔ اپ گریڈ کریں۔
                </span>
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {emailModal.isSendAll ? (
                /* Send All: list all companies with email inputs */
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-600">
                    Enter recipient email for each company:
                  </p>
                  {companiesSorted.map((co, coIdx) => (
                    <div key={co} className="flex items-center gap-2">
                      <label
                        htmlFor={`dss-email-${coIdx}`}
                        className="text-xs font-semibold text-gray-700 w-32 shrink-0 truncate"
                      >
                        {co}
                      </label>
                      <input
                        id={`dss-email-${coIdx}`}
                        type="email"
                        data-ocid={`dss.email_input.${coIdx + 1}`}
                        placeholder="email@company.com"
                        value={emailAddresses[co] ?? ""}
                        onChange={(e) =>
                          saveEmails({
                            ...emailAddresses,
                            [co]: e.target.value,
                          })
                        }
                        className="flex-1 h-8 text-xs border border-gray-300 rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Single company */
                <div className="space-y-2">
                  <label
                    htmlFor="dss-single-email"
                    className="text-sm font-semibold text-gray-700 block"
                  >
                    Recipient Email | وصول کنندہ ای میل
                  </label>
                  <input
                    id="dss-single-email"
                    type="email"
                    data-ocid="dss.single_email_input"
                    placeholder="representative@company.com"
                    value={emailAddresses[emailModal.company] ?? ""}
                    onChange={(e) =>
                      saveEmails({
                        ...emailAddresses,
                        [emailModal.company]: e.target.value,
                      })
                    }
                    className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <p className="text-xs text-gray-400">
                    Sale statement for <strong>{emailModal.company}</strong> (
                    {dateFrom} to {dateTo}) will be attached as PDF.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  data-ocid="dss.email_modal_cancel_button"
                  onClick={() => setEmailModal(null)}
                  className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel | منسوخ
                </button>
                <button
                  type="button"
                  data-ocid="dss.email_modal_send_button"
                  disabled={emailSending}
                  onClick={() => {
                    const companies = emailModal.isSendAll
                      ? companiesSorted
                      : [emailModal.company];
                    handleMockSendEmail(companies);
                  }}
                  className="flex-1 h-10 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {emailSending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendHorizonal size={15} />
                      {emailModal.isSendAll
                        ? "Send All | سب بھیجیں"
                        : "Send | بھیجیں"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grand Total footer */}
      {companiesSorted.length > 0 && (
        <div className="bg-[#1e3a6e] text-white rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              Grand Total — All Companies
            </div>
            <div className="text-2xl font-bold mt-0.5">
              {allMedicines.length === 0
                ? "0 units"
                : (() => {
                    let total = 0;
                    for (const co of companiesSorted) {
                      const meds = companiesMap.get(co) ?? [];
                      for (const s of computeStats(meds)) {
                        total += s.netSaleUnits;
                      }
                    }
                    return `${total} units sold`;
                  })()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              Net Value
            </div>
            <div className="text-2xl font-bold mt-0.5">
              {(() => {
                let totalVal = 0;
                for (const co of companiesSorted) {
                  const meds = companiesMap.get(co) ?? [];
                  for (const s of computeStats(meds)) {
                    totalVal += s.netSaleValue;
                  }
                }
                return formatCurrency(totalVal);
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payments View ────────────────────────────────────────────────────────────

type PaymentDayRecord = { collected: number; credit: number };

function PaymentsView({
  orders,
  historyOrders,
  setPaymentsClearedAt,
}: {
  orders: OfficeOrderDetail[];
  historyOrders: OfficeOrderDetail[];
  paymentsClearedAt: string | null;
  setPaymentsClearedAt: (v: string | null) => void;
}) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showClearPayDialog, setShowClearPayDialog] = useState(false);
  const [clearPayPassword, setClearPayPassword] = useState("");
  const [isClearingPayments, setIsClearingPayments] = useState(false);

  // Auto midnight reset on mount and every 60 seconds
  useEffect(() => {
    function checkMidnightReset() {
      const todayDateStr = new Date().toISOString().split("T")[0];
      const lastPaymentDay = localStorage.getItem("medorder_last_payment_day");
      if (lastPaymentDay !== todayDateStr) {
        const midnight = new Date(`${todayDateStr}T00:00:00`).toISOString();
        localStorage.setItem("medorder_payments_cleared_at", midnight);
        localStorage.setItem("medorder_last_payment_day", todayDateStr);
        setPaymentsClearedAt(midnight);
      }
    }
    checkMidnightReset();
    const interval = setInterval(checkMidnightReset, 60_000);
    return () => clearInterval(interval);
  }, [setPaymentsClearedAt]);

  // Compute daily data from all orders and merge with persisted history
  const paymentHistory = useMemo<Record<string, PaymentDayRecord>>(() => {
    // Read existing stored data
    let stored: Record<string, PaymentDayRecord> = {};
    try {
      const raw = localStorage.getItem("medorder_payment_history");
      if (raw) stored = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    // Compute from current orders
    const computed: Record<string, PaymentDayRecord> = {};
    for (const o of [...orders, ...historyOrders]) {
      const day = o.date; // YYYY-MM-DD
      if (!computed[day]) computed[day] = { collected: 0, credit: 0 };
      computed[day].collected += o.paymentReceived;
      const balance = o.totalAmount - o.paymentReceived;
      computed[day].credit += balance > 0 ? balance : 0;
    }

    // Merge stored + computed (computed takes precedence for same days)
    const merged: Record<string, PaymentDayRecord> = { ...stored, ...computed };

    // Prune entries older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoff = oneYearAgo.toISOString().split("T")[0];
    for (const key of Object.keys(merged)) {
      if (key < cutoff) delete merged[key];
    }

    // Persist merged back
    try {
      localStorage.setItem("medorder_payment_history", JSON.stringify(merged));
    } catch {
      /* ignore */
    }

    return merged;
  }, [orders, historyOrders]);

  // Group by month (YYYY-MM)
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      {
        days: Array<{ date: string } & PaymentDayRecord>;
        totalCollected: number;
        totalCredit: number;
      }
    >();
    const sortedDays = Object.keys(paymentHistory).sort().reverse();
    for (const day of sortedDays) {
      const month = day.slice(0, 7); // YYYY-MM
      if (!map.has(month))
        map.set(month, { days: [], totalCollected: 0, totalCredit: 0 });
      const rec = paymentHistory[day];
      const entry = map.get(month)!;
      entry.days.push({ date: day, ...rec });
      entry.totalCollected += rec.collected;
      entry.totalCredit += rec.credit;
    }
    // Return sorted newest first, max 12 months
    return Array.from(map.entries()).slice(0, 12);
  }, [paymentHistory]);

  function monthLabel(ym: string): string {
    const [year, month] = ym.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  }

  const grandTotalCollected = monthlyData.reduce(
    (sum, [, m]) => sum + m.totalCollected,
    0,
  );
  const grandTotalCredit = monthlyData.reduce(
    (sum, [, m]) => sum + m.totalCredit,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-heading">
            Payments | ادائیگیاں
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Monthly &amp; daily payment collection history — 1 year data
          </p>
        </div>
      </div>

      {/* Clear All Payments button */}
      <div className="flex justify-end">
        <button
          type="button"
          data-ocid="payments.delete_button"
          onClick={() => setShowClearPayDialog(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Trash2 size={14} />
          Clear All Payments | سب ادائیگیاں صاف کریں
        </button>
      </div>

      {/* Clear All Payments Password Dialog */}
      {showClearPayDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Clear All Payments | تمام ادائیگیاں صاف کریں
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Apna password enter karein. Yeh action undo nahi ho sakti. Sab
              payment history permanently delete ho jayegi.
            </p>
            <input
              type="password"
              value={clearPayPassword}
              onChange={(e) => setClearPayPassword(e.target.value)}
              placeholder="Password dalein | Enter password"
              className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              data-ocid="payments.password.input"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowClearPayDialog(false);
                  setClearPayPassword("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                data-ocid="payments.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="payments.confirm_button"
                disabled={isClearingPayments || !clearPayPassword.trim()}
                onClick={async () => {
                  const paySess = getSession();
                  if (!paySess) return;
                  const userRecord = lookupUser(
                    paySess.username,
                    clearPayPassword,
                  );
                  if (!userRecord) {
                    toast.error("Wrong password | غلط پاس ورڈ");
                    return;
                  }
                  setIsClearingPayments(true);
                  try {
                    localStorage.removeItem("medorder_payment_history");
                    localStorage.removeItem("medorder_payments_cleared_at");
                    localStorage.removeItem("medorder_last_payment_day");
                    setPaymentsClearedAt(null);
                    setShowClearPayDialog(false);
                    setClearPayPassword("");
                    toast.success(
                      "Payment history clear ho gayi | Payment history cleared",
                    );
                  } catch (e: unknown) {
                    const msg =
                      e instanceof Error ? e.message : "Unknown error";
                    toast.error(`Error: ${msg}`);
                  } finally {
                    setIsClearingPayments(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isClearingPayments ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grand totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
            Grand Total Collected | کل وصول
          </p>
          <p className="text-2xl font-bold text-emerald-700 font-heading">
            {formatCurrency(grandTotalCollected)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
            Grand Total Credit | کل باقی
          </p>
          <p className="text-2xl font-bold text-red-700 font-heading">
            {formatCurrency(grandTotalCredit)}
          </p>
        </div>
      </div>

      {/* Monthly list */}
      {monthlyData.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payment data yet</p>
          <p className="text-xs mt-1">
            Deliver orders and record payments to see history here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {monthlyData.map(([month, data]) => (
            <div
              key={month}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Month header row */}
              <button
                type="button"
                onClick={() =>
                  setExpandedMonth(expandedMonth === month ? null : month)
                }
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${expandedMonth === month ? "bg-blue-500" : "bg-gray-300"}`}
                  />
                  <span className="font-bold text-gray-900 font-heading">
                    {monthLabel(month)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {data.days.length} day(s)
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-emerald-700 font-semibold">
                    ✓ {formatCurrency(data.totalCollected)}
                  </span>
                  <span className="text-red-600 font-semibold">
                    ✗ {formatCurrency(data.totalCredit)}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform ${expandedMonth === month ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {/* Day rows (expanded) */}
              {expandedMonth === month && (
                <div className="border-t border-gray-100">
                  <div className="grid grid-cols-4 gap-2 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                    <div>Date</div>
                    <div className="text-right">Collected | وصول</div>
                    <div className="text-right">Credit | باقی</div>
                    <div className="text-right">Balance</div>
                  </div>
                  {data.days.map((day) => {
                    const balance = day.collected - day.credit;
                    return (
                      <div
                        key={day.date}
                        className="grid grid-cols-4 gap-2 px-5 py-3 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                      >
                        <div className="font-medium text-gray-700">
                          {formatDate(day.date)}
                        </div>
                        <div className="text-right font-semibold text-emerald-700">
                          {formatCurrency(day.collected)}
                        </div>
                        <div className="text-right font-semibold text-red-600">
                          {formatCurrency(day.credit)}
                        </div>
                        <div
                          className={`text-right font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {formatCurrency(Math.abs(balance))}
                          <span className="text-[10px] ml-1 font-normal">
                            {balance >= 0 ? "(net)" : "(deficit)"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User Management Panel ────────────────────────────────────────────────────

function UserManagementPanel() {
  const { actor } = useActor();
  const sess = getSession();
  const [customUsers, setCustomUsers] = useState<AppUser[]>(() =>
    getCustomUsers(),
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("staff");
  const [addError, setAddError] = useState("");
  const [changePwdFor, setChangePwdFor] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editUserFor, setEditUserFor] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editUserError, setEditUserError] = useState("");

  const [hiddenBuiltins, setHiddenBuiltins] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HIDDEN_BUILTIN_USERS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  // Load staff from backend on mount and merge into customUsers
  useEffect(() => {
    if (!actor || !sess?.distributorId) return;
    (actor as any)
      .getStaffByDistributor(BigInt(sess.distributorId))
      .then((staffList: any[]) => {
        if (!staffList || staffList.length === 0) return;
        const current = getCustomUsers();
        const currentUsernames = new Set(
          current.map((u) => u.username.toLowerCase()),
        );
        const toAdd: AppUser[] = [];
        for (const s of staffList) {
          const uname = String(s.username ?? "");
          if (!uname) continue;
          if (!currentUsernames.has(uname.toLowerCase())) {
            toAdd.push({
              username: uname,
              password: String(s.password ?? ""),
              role: String(s.role ?? "staff") as UserRole,
              displayName: String(s.displayName ?? uname),
              backendStaffId: Number(s.id),
            });
          } else {
            // Update backendStaffId for existing user
            const idx = current.findIndex(
              (u) => u.username.toLowerCase() === uname.toLowerCase(),
            );
            if (idx >= 0 && !current[idx].backendStaffId) {
              current[idx] = { ...current[idx], backendStaffId: Number(s.id) };
            }
          }
        }
        if (toAdd.length > 0 || current.some((u) => !u.backendStaffId)) {
          const merged = [...current, ...toAdd];
          setCustomUsers(merged);
          try {
            localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, sess?.distributorId]);

  const allUsers = [...USER_DB, ...customUsers];
  const visibleUsers = allUsers.filter(
    (u) => !hiddenBuiltins.includes(u.username),
  );

  function saveCustomUsers(users: AppUser[]) {
    setCustomUsers(users);
    try {
      localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  }

  async function handleAddUser() {
    if (!newUsername.trim() || !newDisplayName.trim() || !newPassword.trim()) {
      setAddError("Sab fields zaruri hain | All fields required");
      return;
    }
    // Check for duplicate
    if (
      allUsers.some(
        (u) => u.username.toLowerCase() === newUsername.trim().toLowerCase(),
      )
    ) {
      setAddError("Username already exists | یوزر نیم پہلے سے موجود ہے");
      return;
    }
    const newUser: AppUser = {
      username: newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      displayName: newDisplayName.trim(),
    };
    const updated = [...customUsers, newUser];
    saveCustomUsers(updated);
    // Save to backend so any device can login
    if (actor && sess?.distributorId) {
      try {
        const staffId = await (actor as any).addStaffForDistributor(
          BigInt(sess.distributorId),
          newUsername.trim(),
          newPassword.trim(),
          newRole,
          newDisplayName.trim(),
        );
        const withId = updated.map((u) =>
          u.username === newUsername.trim()
            ? { ...u, backendStaffId: Number(staffId) }
            : u,
        );
        saveCustomUsers(withId);
      } catch {
        /* ignore if backend unavailable */
      }
    }
    setNewUsername("");
    setNewDisplayName("");
    setNewPassword("");
    setNewRole("staff");
    setAddError("");
    setShowAddForm(false);
    toast.success(`User "${newDisplayName.trim()}" add ho gaya`);
  }

  async function handleChangePassword(username: string) {
    if (!newPwd.trim()) {
      toast.error("New password enter karein");
      return;
    }
    let updatedUser: AppUser | undefined;
    const idx = customUsers.findIndex((u) => u.username === username);
    if (idx >= 0) {
      const updated = customUsers.map((u) =>
        u.username === username ? { ...u, password: newPwd.trim() } : u,
      );
      saveCustomUsers(updated);
      updatedUser = updated[idx];
    } else {
      // It's a built-in user — store override in customUsers
      const builtIn = USER_DB.find((u) => u.username === username);
      if (builtIn) {
        const newEntry = { ...builtIn, password: newPwd.trim() };
        const updated = [...customUsers, newEntry];
        saveCustomUsers(updated);
        updatedUser = newEntry;
      }
    }
    if (actor && updatedUser?.backendStaffId) {
      try {
        await (actor as any).updateStaffRecordPassword(
          BigInt(updatedUser.backendStaffId),
          newPwd.trim(),
        );
      } catch {
        /* ignore */
      }
    }
    setChangePwdFor(null);
    setNewPwd("");
    toast.success("Password update ho gaya");
  }

  async function handleDeleteUser(username: string) {
    const builtIn = USER_DB.find((u) => u.username === username);
    if (builtIn) {
      // Hide built-in user (only staff/delivery, not admin)
      const updated = [...hiddenBuiltins, username];
      setHiddenBuiltins(updated);
      try {
        localStorage.setItem(HIDDEN_BUILTIN_USERS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
    } else {
      const userToDelete = customUsers.find((u) => u.username === username);
      const updated = customUsers.filter((u) => u.username !== username);
      saveCustomUsers(updated);
      if (actor && userToDelete?.backendStaffId) {
        try {
          await (actor as any).deleteStaffRecord(
            BigInt(userToDelete.backendStaffId),
          );
        } catch {
          /* ignore */
        }
      }
    }
    setDeleteConfirm(null);
    toast.success("User delete ho gaya");
  }

  const roleBadge: Record<UserRole, { label: string; class: string }> = {
    admin: {
      label: "Admin",
      class: "bg-purple-100 text-purple-700 border-purple-200",
    },
    staff: {
      label: "Staff / Booker",
      class: "bg-blue-100 text-blue-700 border-blue-200",
    },
    delivery: {
      label: "Delivery",
      class: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    superadmin: {
      label: "Super Admin",
      class: "bg-orange-100 text-orange-700 border-orange-200",
    },
  };

  const isBuiltIn = (username: string) =>
    USER_DB.some((u) => u.username === username);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-heading">
            User Management | صارف انتظام
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Users ke liye login credentials aur roles manage karein
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          data-ocid="user_management.open_modal_button"
          size="sm"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
          }}
          className="text-white"
        >
          <Plus size={14} className="mr-1.5" />
          Add User
        </Button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div
          className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4"
          data-ocid="user_management.dialog"
        >
          <h3 className="font-bold text-blue-900 text-sm">
            New User | نیا صارف
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="um-username"
                className="text-xs font-semibold text-gray-600 block mb-1"
              >
                Username | یوزر نیم
              </label>
              <Input
                id="um-username"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  setAddError("");
                }}
                placeholder="e.g. booker6"
                className="h-9 text-sm"
                data-ocid="user_management.input"
              />
            </div>
            <div>
              <label
                htmlFor="um-displayname"
                className="text-xs font-semibold text-gray-600 block mb-1"
              >
                Display Name | نام
              </label>
              <Input
                id="um-displayname"
                value={newDisplayName}
                onChange={(e) => {
                  setNewDisplayName(e.target.value);
                  setAddError("");
                }}
                placeholder="e.g. Booker Six"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="um-password"
                className="text-xs font-semibold text-gray-600 block mb-1"
              >
                Password | پاس ورڈ
              </label>
              <Input
                id="um-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setAddError("");
                }}
                placeholder="Set a password"
                className="h-9 text-sm"
                data-ocid="user_management.password.input"
              />
            </div>
            <div>
              <label
                htmlFor="um-role"
                className="text-xs font-semibold text-gray-600 block mb-1"
              >
                Role | کردار
              </label>
              <select
                id="um-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full h-9 px-2 border border-input rounded-md text-sm bg-background"
                data-ocid="user_management.select"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff / Booker</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>
          {addError && <p className="text-red-600 text-xs">{addError}</p>}
          <div className="flex gap-2">
            <Button
              onClick={handleAddUser}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-ocid="user_management.submit_button"
            >
              Save User | محفوظ کریں
            </Button>
            <Button
              onClick={() => {
                setShowAddForm(false);
                setAddError("");
              }}
              variant="outline"
              size="sm"
              data-ocid="user_management.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm" data-ocid="user_management.table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Username
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Display Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Type
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user, idx) => (
              <tr
                key={user.username}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                data-ocid={`user_management.row.${idx + 1}`}
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                  {user.username}
                </td>
                <td className="px-4 py-3 font-medium text-gray-700">
                  {user.displayName}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleBadge[user.role].class}`}
                  >
                    {roleBadge[user.role].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {isBuiltIn(user.username) ? "Built-in" : "Custom"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {changePwdFor === user.username ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="password"
                          placeholder="New password"
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          className="h-7 w-28 text-xs"
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            handleChangePassword(user.username)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleChangePassword(user.username)}
                          className="text-xs text-green-600 font-semibold hover:text-green-700 px-1.5 py-0.5 rounded bg-green-50 border border-green-200"
                          data-ocid={`user_management.save_button.${idx + 1}`}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChangePwdFor(null);
                            setNewPwd("");
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 px-1 py-0.5 rounded bg-gray-100 border border-gray-200"
                          data-ocid={`user_management.cancel_button.${idx + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setChangePwdFor(user.username);
                          setNewPwd("");
                        }}
                        className="text-xs text-blue-600 font-medium hover:text-blue-700 px-2 py-1 rounded bg-blue-50 border border-blue-100 transition-colors"
                        data-ocid={`user_management.edit_button.${idx + 1}`}
                      >
                        Change Pwd
                      </button>
                    )}
                    {editUserFor === user.username ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="text"
                          placeholder="Username"
                          value={editUsername}
                          onChange={(e) => {
                            setEditUsername(e.target.value);
                            setEditUserError("");
                          }}
                          className="h-7 w-24 text-xs px-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Display Name"
                          value={editDisplayName}
                          onChange={(e) => {
                            setEditDisplayName(e.target.value);
                            setEditUserError("");
                          }}
                          className="h-7 w-28 text-xs px-2 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editUsername.trim()) {
                              setEditUserError("Username required");
                              return;
                            }
                            try {
                              if (actor && user.backendStaffId) {
                                const ok = await (actor as any).updateUserInfo(
                                  BigInt(user.backendStaffId),
                                  editUsername.trim(),
                                  editDisplayName.trim() || editUsername.trim(),
                                );
                                if (!ok) {
                                  setEditUserError("Username already taken");
                                  return;
                                }
                              }
                              const updated = getCustomUsers().map((u) =>
                                u.username === user.username
                                  ? {
                                      ...u,
                                      username: editUsername.trim(),
                                      displayName:
                                        editDisplayName.trim() ||
                                        editUsername.trim(),
                                    }
                                  : u,
                              );
                              localStorage.setItem(
                                CUSTOM_USERS_KEY,
                                JSON.stringify(updated),
                              );
                              setCustomUsers(updated);
                              setEditUserFor(null);
                              toast.success(
                                "User updated | صارف اپ ڈیٹ ہو گیا",
                              );
                            } catch {
                              setEditUserError("Update failed");
                            }
                          }}
                          className="text-xs text-green-600 font-semibold hover:text-green-700 px-1.5 py-0.5 rounded bg-green-50 border border-green-200"
                          data-ocid={`user_management.save_button.${idx + 1}`}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditUserFor(null);
                            setEditUserError("");
                          }}
                          className="text-xs text-gray-500 px-1 py-0.5 rounded bg-gray-100 border border-gray-200"
                        >
                          ✕
                        </button>
                        {editUserError && (
                          <span className="text-xs text-red-500">
                            {editUserError}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditUserFor(user.username);
                          setEditUsername(user.username);
                          setEditDisplayName(user.displayName);
                          setEditUserError("");
                        }}
                        className="text-xs text-purple-600 font-medium hover:text-purple-700 px-2 py-1 rounded bg-purple-50 border border-purple-100 transition-colors"
                        data-ocid={`user_management.edit_button.${idx + 1}`}
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {(!isBuiltIn(user.username) ||
                      (user.role !== "admin" && user.role !== "superadmin")) &&
                      (deleteConfirm === user.username ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.username)}
                            className="text-xs text-white font-semibold px-2 py-1 rounded bg-red-500 hover:bg-red-600 transition-colors"
                            data-ocid={`user_management.confirm_button.${idx + 1}`}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-gray-500 px-1.5 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                            data-ocid={`user_management.cancel_button.${idx + 1}`}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(user.username)}
                          className="text-xs text-red-500 font-medium hover:text-red-600 px-2 py-1 rounded bg-red-50 border border-red-100 transition-colors"
                          data-ocid={`user_management.delete_button.${idx + 1}`}
                        >
                          Delete
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Login credentials info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-800 mb-2">
          Login Credentials | لاگ ان تفصیلات
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-bold text-amber-700 mb-1">Admin</p>
            <p className="text-[11px] text-amber-600 font-mono">URL: /office</p>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-700 mb-1">
              Staff / Bookers
            </p>
            <p className="text-[11px] text-blue-600 font-mono">
              URL: / (Main App)
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-700 mb-1">Delivery</p>
            <p className="text-[11px] text-emerald-600 font-mono">
              URL: /delivery
            </p>
          </div>
        </div>
        <p className="text-[11px] text-amber-600 mt-2">
          Session stored on device — staff aur delivery boys ko baar baar login
          nahi karna parta | Session persists until manual logout
        </p>
      </div>
    </div>
  );
}

// ─── Location Tracking Hook ───────────────────────────────────────────────────

function useLocationTracking(username: string, role: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !username) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const data = {
            username,
            role,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            updatedAt: new Date().toISOString(),
          };
          try {
            localStorage.setItem(
              `medorder_location_${username}`,
              JSON.stringify(data),
            );
          } catch {
            /* ignore */
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
    };
    updateLocation();
    const interval = setInterval(updateLocation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [username, role, enabled]);
}

// ─── Staff Locations View (shown inside OfficeDashboard) ──────────────────────

function StaffLocationsView() {
  const [entries, setEntries] = useState<
    Array<{
      username: string;
      role: string;
      lat: number;
      lng: number;
      accuracy: number;
      updatedAt: string;
    }>
  >([]);

  function loadEntries() {
    const result: typeof entries = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith("medorder_location_")) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          result.push(JSON.parse(raw));
        } catch {
          /* ignore bad JSON */
        }
      }
    } catch {
      /* ignore */
    }
    result.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    setEntries(result);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadEntries is stable, run once on mount
  useEffect(() => {
    loadEntries();
  }, []);

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-heading">
            Staff Locations | عملے کی جگہ
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Last known location of staff and delivery members
          </p>
        </div>
        <button
          type="button"
          onClick={loadEntries}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          data-ocid="staff_locations.button"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        <strong>Note:</strong> Locations update every 5 minutes when the staff
        or delivery dashboard is open in browser. Background tracking requires a
        native app.
      </div>

      {entries.length === 0 ? (
        <div
          className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400"
          data-ocid="staff_locations.empty_state"
        >
          <MapPin size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No location data yet</p>
          <p className="text-xs mt-1">
            Staff must allow location access on their device
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Name | نام
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Role | کردار
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Coordinates | مقام
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">
                  Last Updated | آخری وقت
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry, idx) => (
                <tr
                  key={entry.username}
                  data-ocid={`staff_locations.item.${idx + 1}`}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  <td className="px-4 py-3 font-semibold text-sm text-gray-900">
                    {entry.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                        entry.role === "delivery"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {entry.role === "delivery" ? (
                        <Truck size={10} />
                      ) : (
                        <User size={10} />
                      )}
                      {entry.role === "delivery" ? "Delivery" : "Staff"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://maps.google.com/?q=${entry.lat},${entry.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-blue-600 hover:underline"
                      data-ocid={`staff_locations.map_marker.${idx + 1}`}
                    >
                      {entry.lat.toFixed(5)}, {entry.lng.toFixed(5)}
                    </a>
                    {entry.accuracy && (
                      <span className="ml-1.5 text-[10px] text-gray-400">
                        ±{Math.round(entry.accuracy)}m
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">
                    {relativeTime(entry.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Office Dashboard ─────────────────────────────────────────────────────────

function OfficeDashboard() {
  const { actor, isFetching: isActorFetching } = useActor();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paymentsClearedAt, setPaymentsClearedAt] = useState<string | null>(
    () => {
      return localStorage.getItem("medorder_payments_cleared_at");
    },
  );
  const [orders, setOrders] = useState<OfficeOrderDetail[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OfficeOrderDetail[]>([]);
  const [ordersWithLines, setOrdersWithLines] = useState<OfficeOrderDetail[]>(
    [],
  );
  const [historyOrdersWithLines, setHistoryOrdersWithLines] = useState<
    OfficeOrderDetail[]
  >([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<bigint | null>(null);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [clearHistoryPassword, setClearHistoryPassword] = useState("");
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [inventoryEditMode, setInventoryEditMode] = useState(false);
  const [showInventoryPasswordDialog, setShowInventoryPasswordDialog] =
    useState(false);
  const [inventoryPasswordInput, setInventoryPasswordInput] = useState("");
  const [activeView, setActiveView] = useState<
    | "orders"
    | "history"
    | "inventory"
    | "purchasing"
    | "add-order"
    | "payments"
    | "daily-sale-statement"
    | "customer-wise-sales"
    | "add-customer"
    | "manage"
    | "user-management"
    | "staff-locations"
    | "estimated-billing"
  >("orders");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allMedicineGroups, setAllMedicineGroups] = useState<
    Array<{ id: bigint; name: string; distributorId: bigint }>
  >([]);

  // Customer form state
  const [custName, setCustName] = useState("");
  const [custType, setCustType] = useState<ExtendedCustomerType>(
    CustomerType.pharmacy,
  );
  const [custContact, setCustContact] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custArea, setCustArea] = useState("");
  const [custGroup, setCustGroup] = useState("");
  const [custCode, setCustCode] = useState("");
  const [custNTN, setCustNTN] = useState("");
  const [custCNIC, setCustCNIC] = useState("");
  const [custDealerCode, setCustDealerCode] = useState("");
  const [custPmdc, setCustPmdc] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<bigint | null>(
    null,
  );
  const [confirmDeleteCustomerId, setConfirmDeleteCustomerId] = useState<
    bigint | null
  >(null);
  // Customer wise sales filter state
  const [_cwsTab, _setCwsTab] = useState<
    "allover" | "company" | "group" | "area" | "product"
  >("allover");
  const [_cwsSelectedCustomer, _setCwsSelectedCustomer] =
    useState<Customer | null>(null);
  // Also track a selected pharmacy (from allPharmacies) for CWS filter
  const [_cwsSelectedPharmacy, _setCwsSelectedPharmacy] = useState<{
    id: bigint;
    name: string;
    area: string;
    code: string;
  } | null>(null);
  const [_cwsCustomerSearch, _setCwsCustomerSearch] = useState("");
  const [_cwsCustomerDropdownOpen, _setCwsCustomerDropdownOpen] =
    useState(false);
  // Multi-select filter state for Customer Wise Sale
  const [cwsSelectedCustomers, setCwsSelectedCustomers] = useState<Customer[]>(
    [],
  );
  const [cwsCustomerSearch2, setCwsCustomerSearch2] = useState("");
  const [cwsCustomerDropdown2, setCwsCustomerDropdown2] = useState(false);
  const [cwsSelectedCompanies, setCwsSelectedCompanies] = useState<string[]>(
    [],
  );
  const [cwsCompanySearch, setCwsCompanySearch] = useState("");
  const [cwsCompanyDropdown, setCwsCompanyDropdown] = useState(false);
  const [cwsSelectedMedicines, setCwsSelectedMedicines] = useState<string[]>(
    [],
  );
  const [cwsMedicineSearch, setCwsMedicineSearch] = useState("");
  const [cwsMedicineDropdown, setCwsMedicineDropdown] = useState(false);
  const [cwsSelectedGroups, setCwsSelectedGroups] = useState<string[]>([]);
  const [cwsGroupSearch, setCwsGroupSearch] = useState("");
  const [cwsGroupDropdown, setCwsGroupDropdown] = useState(false);
  const [cwsDateFrom, setCwsDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [cwsDateTo, setCwsDateTo] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [allPharmacies, setAllPharmacies] = useState<
    Array<{ id: bigint; name: string; location: string }>
  >([]);
  const [newOrderPharmacyId, setNewOrderPharmacyId] = useState<bigint | null>(
    null,
  );
  const [newOrderLines, setNewOrderLines] = useState<
    Array<{
      _key: string;
      medicineId: bigint;
      medicineName: string;
      qty: string;
      bonus: string;
      discount: string;
      distDisc: string;
      compDisc: string;
      netRate: string;
    }>
  >([]);
  const [newOrderNotes, setNewOrderNotes] = useState("");
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState(false);
  const newOrderStaffName = "Admin";
  const newOrderStaffCode = "admin";
  const [_newOrderTab, _setNewOrderTab] = useState<
    "items" | "pharmacy" | "notes" | "submit"
  >("items");
  const [newOrderPharmacySearch, setNewOrderPharmacySearch] = useState("");
  const [newOrderPharmacyDropdownOpen, setNewOrderPharmacyDropdownOpen] =
    useState(false);
  const [showOfficeCart, setShowOfficeCart] = useState(false);
  const [officeOrderSearch, setOfficeOrderSearch] = useState("");
  const [officeOrderCategory, setOfficeOrderCategory] = useState<
    | "all"
    | "tablets"
    | "syrups"
    | "injections"
    | "capsules"
    | "drops"
    | "creams"
  >("all");
  const [_newOrderMedicineSearch, _setNewOrderMedicineSearch] = useState<
    Record<string, string>
  >({});
  const [_newOrderMedicineDropdownOpen, _setNewOrderMedicineDropdownOpen] =
    useState<Record<string, boolean>>({});
  const [purchases, setPurchases] = useState<
    Array<{
      id: bigint;
      productName: string;
      genericName: string;
      batchNo: string;
      quantity: bigint;
      price: bigint;
      packSize: string;
      companyName: string;
      timestamp: bigint;
      medicineType: string;
    }>
  >([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  // Purchasing form state
  const [purchaseMedSearch, setPurchaseMedSearch] = useState("");
  const [purchaseMedDropOpen, setPurchaseMedDropOpen] = useState(false);
  const [purchaseProductName, setPurchaseProductName] = useState("");
  const [purchaseGenericName, setPurchaseGenericName] = useState("");
  const [purchaseBatchNo, setPurchaseBatchNo] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchasePackSize, setPurchasePackSize] = useState("");
  const [purchaseCompanyName, setPurchaseCompanyName] = useState("");
  const [purchaseMedicineType, setPurchaseMedicineType] = useState("Tablet");
  const [purchaseStrength, setPurchaseStrength] = useState("");
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState("");
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<bigint | null>(
    null,
  );
  const [confirmDeletePurchaseId, setConfirmDeletePurchaseId] = useState<
    bigint | null
  >(null);
  const [selectedOrder, setSelectedOrder] = useState<OfficeOrderDetail | null>(
    null,
  );
  const [bookerFilter, setBookerFilter] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [printedOrderIds, setPrintedOrderIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("medorder_printed_orders");
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [selectedForReprint, setSelectedForReprint] = useState<Set<string>>(
    new Set(),
  );

  const loadAllData = useCallback(async () => {
    if (!actor || isActorFetching) return;
    setIsLoading(true);
    const officeSession = getSession();
    const distId = officeSession?.distributorId
      ? BigInt(officeSession.distributorId)
      : null;
    try {
      const [
        rawActiveOrders,
        rawHistoryOrders,
        rawPharmacies,
        rawMedicines,
        rawMedicineGroups,
      ] = await Promise.all([
        distId
          ? (actor as any)
              .getActiveOrdersByDistributor(distId)
              .catch(() => actor.getActiveOrders().catch(() => [] as any[]))
          : actor.getActiveOrders().catch(async () => {
              const all = await actor
                .getAllStaffOrders()
                .catch(() => [] as any[]);
              const now = Date.now();
              const hrs48 = 48 * 60 * 60 * 1000;
              return all.filter((o: any) => {
                if (o.status !== "delivered") return true;
                const ts = Number(o.timestamp / BigInt(1_000_000));
                return now - ts < hrs48;
              });
            }),
        distId
          ? (actor as any)
              .getHistoryOrdersByDistributor(distId)
              .catch(() => actor.getHistoryOrders().catch(() => [] as any[]))
          : actor.getHistoryOrders().catch(async () => {
              const all = await actor
                .getAllStaffOrders()
                .catch(() => [] as any[]);
              const now = Date.now();
              const hrs48 = 48 * 60 * 60 * 1000;
              const yr1 = 365 * 24 * 60 * 60 * 1000;
              return all.filter((o: any) => {
                if (o.status !== "delivered") return false;
                const ts = Number(o.timestamp / BigInt(1_000_000));
                const age = now - ts;
                return age >= hrs48 && age < yr1;
              });
            }),
        distId
          ? (actor as any)
              .getPharmaciesByDistributor(distId)
              .catch(() => actor.getPharmacies().catch(() => [] as any[]))
          : actor.getPharmacies().catch(() => [] as any[]),
        distId
          ? (actor as any)
              .getMedicinesByDistributor(distId)
              .catch(() => actor.getMedicines().catch(() => [] as any[]))
          : actor.getMedicines().catch(() => [] as any[]),
        distId
          ? (actor as any).getMedicineGroups(distId).catch(() => [] as any[])
          : actor.getMedicineGroups(BigInt(0)).catch(() => [] as any[]),
      ]);

      const pharmacyMap = new Map(
        (rawPharmacies as any[]).map((p) => [String(p.id), p]),
      );
      const medicineMap = new Map(
        (rawMedicines as any[]).map((m) => [String(m.id), m]),
      );

      // Store pharmacies for add-order form
      setAllPharmacies(
        rawPharmacies.map((p) => ({
          id: p.id,
          name: p.name,
          location: p.location,
        })),
      );

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
          genericName: m.genericName || "",
          batchNo: m.batchNo || "",
          medicineType: m.medicineType || "",
          productCode: m.productCode || "",
          groupId: m.groupId ?? BigInt(0),
        };
      });
      setAllMedicines(mappedMedicines);

      // Load medicine groups
      setAllMedicineGroups(
        (rawMedicineGroups as any[]).map((g) => ({
          id: g.id,
          name: g.name,
          distributorId: g.distributorId,
        })),
      );

      // Map active orders
      const activeWithLines = mapRawOrdersToDetail(
        rawActiveOrders as unknown as RawOrder[],
        pharmacyMap,
        medicineMap,
      );
      activeWithLines.sort((a, b) => b.orderId.localeCompare(a.orderId));
      setOrdersWithLines(activeWithLines);
      setOrders(activeWithLines);

      // Map history orders
      const historyWithLines = mapRawOrdersToDetail(
        rawHistoryOrders as unknown as RawOrder[],
        pharmacyMap,
        medicineMap,
      );
      historyWithLines.sort((a, b) => b.orderId.localeCompare(a.orderId));
      setHistoryOrdersWithLines(historyWithLines);
      setHistoryOrders(historyWithLines);

      setBackendError(null);
      // Cache for offline use
      try {
        localStorage.setItem(
          "medorder_cached_pharmacies",
          JSON.stringify(rawPharmacies),
        );
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(
          "medorder_cached_medicines",
          JSON.stringify(rawMedicines),
        );
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(
          "medorder_cached_orders_active",
          JSON.stringify(activeWithLines),
        );
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(
          "medorder_cached_orders_history",
          JSON.stringify(historyWithLines),
        );
      } catch {
        /* ignore */
      }

      // Sync inventory stock from backend to localStorage
      // Only overwrite localStorage if backend returns a positive value (prevents canister-stop from wiping stock)
      actor
        .getInventoryStock()
        .then((stockArr) => {
          for (const [medId, qty] of stockArr) {
            const numQty = Number(qty);
            if (numQty > 0) {
              setStock(medId, numQty);
            }
            // If backend says 0, keep whatever localStorage has (may be more accurate)
          }
        })
        .catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setBackendError(msg);
      toast.error(`Backend error: ${msg}`);
      // Load cached data for offline use
      try {
        const cachedPharma = localStorage.getItem("medorder_cached_pharmacies");
        const cachedMeds = localStorage.getItem("medorder_cached_medicines");
        const cachedActive = localStorage.getItem(
          "medorder_cached_orders_active",
        );
        const cachedHistory = localStorage.getItem(
          "medorder_cached_orders_history",
        );
        if (cachedPharma) setAllPharmacies(JSON.parse(cachedPharma));
        if (cachedMeds) setAllMedicines(JSON.parse(cachedMeds));
        if (cachedActive) {
          setOrdersWithLines(JSON.parse(cachedActive));
          setOrders(JSON.parse(cachedActive));
        }
        if (cachedHistory) {
          setHistoryOrdersWithLines(JSON.parse(cachedHistory));
          setHistoryOrders(JSON.parse(cachedHistory));
        }
      } catch {
        /* ignore */
      }
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

  // Ctrl+N global shortcut: open Add Order
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        setActiveView("add-order");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
    // Skip orders already confirmed OR with return items (need manual review)
    const ordersToConfirm = orders.filter(
      (o) => o.status === "pending" && (o.returnItems ?? []).length === 0,
    );
    if (ordersToConfirm.length === 0) {
      toast.info(
        "No pending orders to confirm (returned orders need manual confirmation)",
      );
      return;
    }
    setIsConfirmingAll(true);
    try {
      await Promise.all(
        ordersToConfirm.map((o) =>
          actor.updateOrderStatus(
            o.backendId,
            mapLocalStatusToBackend("confirmed"),
          ),
        ),
      );
      toast.success(
        `${ordersToConfirm.length} orders confirmed | ${ordersToConfirm.length} آرڈر تصدیق ہو گئے`,
      );
      await loadAllData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error confirming orders: ${msg}`);
    } finally {
      setIsConfirmingAll(false);
    }
  }

  const loadPurchases = useCallback(async () => {
    if (!actor) return;
    setIsLoadingPurchases(true);
    try {
      const raw = await actor.getPurchases();
      setPurchases(
        raw.map((p) => ({ ...p, medicineType: p.medicineType || "" })),
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error loading purchases: ${msg}`);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, [actor]);

  useEffect(() => {
    if (activeView === "purchasing" && actor) {
      loadPurchases();
    }
  }, [activeView, actor, loadPurchases]);

  const loadCustomers = useCallback(async () => {
    if (!actor) return;
    try {
      const custSess = getSession();
      const custDistId = custSess?.distributorId
        ? BigInt(custSess.distributorId)
        : null;
      const raw = custDistId
        ? await (actor as any)
            .getCustomersByDistributor(custDistId)
            .catch(() => actor.getCustomers())
        : await actor.getCustomers();
      const mapped: Customer[] = raw.map((c) => ({
        id: String(c.id),
        backendId: c.id,
        name: c.name,
        customerType: c.customerType,
        address: c.address,
        area: c.area,
        contactNo: c.contactNo,
        groupName: c.groupName,
        code: c.code,
        dealerCode: (c as any).dealerCode || "",
      }));
      // Also merge allPharmacies so existing pharmacy data shows in filters
      const pharmMapped: Customer[] = allPharmacies.map((p) => ({
        id: `ph-${String(p.id)}`,
        backendId: p.id as unknown as bigint,
        name: p.name,
        customerType: CustomerType.pharmacy,
        address: p.location || "",
        area: "",
        contactNo: "",
        groupName: "",
        code: "",
        dealerCode: "",
      }));
      const existingNames = new Set(mapped.map((c) => c.name.toLowerCase()));
      const merged = [
        ...mapped,
        ...pharmMapped.filter((p) => !existingNames.has(p.name.toLowerCase())),
      ];
      setAllCustomers(merged);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error loading customers: ${msg}`);
    }
  }, [actor, allPharmacies]);

  useEffect(() => {
    if (
      (activeView === "add-customer" || activeView === "customer-wise-sales") &&
      actor
    ) {
      loadCustomers();
    }
  }, [activeView, actor, loadCustomers]);

  async function handleAddCustomer() {
    if (!actor) return;
    if (!custName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    setIsAddingCustomer(true);
    try {
      const addCustSess = getSession();
      const addCustDistId = addCustSess?.distributorId
        ? BigInt(addCustSess.distributorId)
        : null;
      const newBackendId = addCustDistId
        ? await (actor as any).addCustomerForDistributor(
            addCustDistId,
            custName.trim(),
            toBackendCustomerType(custType),
            custAddress.trim(),
            custArea.trim(),
            custContact.trim(),
            custGroup.trim(),
            custCode.trim(),
            custNTN.trim(),
            custCNIC.trim(),
            custDealerCode.trim(),
          )
        : await (actor as any).addCustomer(
            custName.trim(),
            toBackendCustomerType(custType),
            custAddress.trim(),
            custArea.trim(),
            custContact.trim(),
            custGroup.trim(),
            custCode.trim(),
            custNTN.trim(),
            custCNIC.trim(),
            custDealerCode.trim(),
          );
      // Store NTN/CNIC/name in localStorage for invoice lookup
      try {
        localStorage.setItem(
          `medorder_customer_name_${newBackendId}`,
          custName.trim(),
        );
      } catch {
        /* ignore */
      }
      if (custNTN.trim()) {
        try {
          localStorage.setItem(
            `medorder_customer_ntn_${newBackendId}`,
            custNTN.trim(),
          );
        } catch {
          /* ignore */
        }
      }
      if (custCNIC.trim()) {
        try {
          localStorage.setItem(
            `medorder_customer_cnic_${newBackendId}`,
            custCNIC.trim(),
          );
        } catch {
          /* ignore */
        }
      }
      if (custPmdc?.trim()) {
        try {
          localStorage.setItem(
            `medorder_customer_pmdc_${newBackendId}`,
            custPmdc.trim(),
          );
        } catch {
          /* ignore */
        }
      }
      toast.success(`Customer "${custName.trim()}" add ho gaya!`);
      // Also add as pharmacy if type is medicalStore or pharmacy
      if (
        actor &&
        (custType === CustomerType.pharmacy ||
          custType === CustomerType.medicalStore)
      ) {
        try {
          await actor.addPharmacy(
            custName.trim(),
            custContact.trim(),
            `${custAddress.trim()} | ${custArea.trim()}`,
            custCode.trim(),
            custNTN.trim(),
            custCNIC.trim(),
          );
        } catch {
          // non-critical — customer was added, pharmacy sync failed silently
        }
      }
      setCustName("");
      setCustType(CustomerType.pharmacy);
      setCustContact("");
      setCustAddress("");
      setCustArea("");
      setCustGroup("");
      setCustCode("");
      setCustNTN("");
      setCustCNIC("");
      setCustDealerCode("");
      setCustPmdc("");
      await Promise.all([loadCustomers(), loadAllData()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error adding customer: ${msg}`);
    } finally {
      setIsAddingCustomer(false);
    }
  }

  async function handleDeleteCustomer(id: bigint) {
    if (!actor) return;
    setDeletingCustomerId(id);
    try {
      await actor.deleteCustomer(id);
      toast.success("Customer delete ho gaya!");
      setConfirmDeleteCustomerId(null);
      await loadCustomers();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error deleting customer: ${msg}`);
    } finally {
      setDeletingCustomerId(null);
    }
  }

  async function handleAddPurchase() {
    if (!actor) return;
    if (
      !purchaseProductName.trim() ||
      !purchaseBatchNo.trim() ||
      !purchaseQuantity.trim() ||
      !purchasePrice.trim() ||
      !purchaseCompanyName.trim()
    ) {
      toast.error(
        "Please fill required fields (Product Name, Batch#, Qty, Price, Company)",
      );
      return;
    }
    const qty = Number(purchaseQuantity);
    const price = Number(purchasePrice);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    setIsAddingPurchase(true);
    try {
      await actor.addPurchase(
        purchaseProductName.trim(),
        purchaseGenericName.trim(),
        purchaseBatchNo.trim(),
        BigInt(Math.round(qty)),
        BigInt(Math.round(price * 100)),
        purchasePackSize.trim(),
        purchaseCompanyName.trim(),
        purchaseMedicineType,
        purchaseInvoiceNumber.trim() || null,
      );

      // Auto-update inventory: find matching medicine by name and increase stock
      const matchedMed = allMedicines.find(
        (m) =>
          m.name.toLowerCase().trim() ===
          purchaseProductName.toLowerCase().trim(),
      );
      if (matchedMed && actor) {
        const currentStock = getStock(matchedMed.backendId) ?? 0;
        setStock(matchedMed.backendId, currentStock + qty);
        actor
          .adjustInventoryStock(matchedMed.backendId, BigInt(Math.round(qty)))
          .catch(() => {});
      }

      toast.success(
        `Purchase record added for "${purchaseProductName.trim()}"!${matchedMed ? ` Inventory +${qty} updated.` : " (Add medicine to inventory to auto-sync stock.)"}`,
      );
      setPurchaseMedSearch("");
      setPurchaseProductName("");
      setPurchaseGenericName("");
      setPurchaseBatchNo("");
      setPurchaseQuantity("");
      setPurchasePrice("");
      setPurchasePackSize("");
      setPurchaseCompanyName("");
      setPurchaseMedicineType("Tablet");
      setPurchaseStrength("");
      setPurchaseInvoiceNumber("");
      await loadPurchases();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error adding purchase: ${msg}`);
    } finally {
      setIsAddingPurchase(false);
    }
  }

  async function handleDeletePurchase(id: bigint) {
    if (!actor) return;
    setDeletingPurchaseId(id);
    try {
      await actor.deletePurchase(id);
      toast.success("Purchase record deleted");
      setConfirmDeletePurchaseId(null);
      await loadPurchases();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error deleting purchase: ${msg}`);
    } finally {
      setDeletingPurchaseId(null);
    }
  }

  async function handleSubmitNewOrder() {
    if (!actor || !newOrderPharmacyId || newOrderLines.length === 0) return;
    setIsSubmittingNewOrder(true);
    try {
      const orderLines = newOrderLines.map((line) => {
        const distD = Number.parseFloat(line.distDisc || line.discount) || 0;
        const compD = Number.parseFloat(line.compDisc) || 0;
        const med = allMedicines.find((m) => m.backendId === line.medicineId);
        const price = med?.price ?? 0;
        const manualNet = Number.parseFloat(line.netRate) || 0;
        const autoNet = price * (1 - (distD + compD) / 100);
        return {
          medicineId: line.medicineId,
          quantity: Math.round(Number.parseFloat(line.qty) || 1),
          bonusQty: BigInt(Math.round(Number.parseFloat(line.bonus) || 0)),
          discountPercent: BigInt(0),
          distributionDiscount: BigInt(Math.round(distD * 10)),
          companyDiscount: BigInt(Math.round(compD * 10)),
          netRate: BigInt(
            Math.round((manualNet > 0 ? manualNet : autoNet) * 100),
          ),
        };
      });
      const createOrderSess = getSession();
      const createOrderDistId = createOrderSess?.distributorId
        ? BigInt(createOrderSess.distributorId)
        : null;
      if (createOrderDistId) {
        await (actor as any).createOrderForDistributor(
          createOrderDistId,
          newOrderPharmacyId,
          orderLines,
          newOrderStaffName.trim() || "Office Admin",
          newOrderStaffCode.trim() || "admin",
          newOrderNotes.trim(),
        );
      } else {
        await actor.createOrder(
          newOrderPharmacyId,
          orderLines,
          newOrderStaffName.trim() || "Office Admin",
          newOrderStaffCode.trim() || "admin",
          newOrderNotes.trim(),
        );
      }
      // Deduct stock for ordered items (localStorage)
      deductStock(
        newOrderLines.map((line) => ({
          backendId: line.medicineId,
          qty: Math.round(Number.parseFloat(line.qty) || 1),
        })),
      );
      // Sync inventory deduction to backend (fire-and-forget)
      Promise.all(
        newOrderLines.map((line) =>
          actor
            .adjustInventoryStock(
              line.medicineId,
              BigInt(-Math.round(Number.parseFloat(line.qty) || 1)),
            )
            .catch(() => {}),
        ),
      );
      toast.success("Order submit ho gaya! | Order submitted!");
      setNewOrderPharmacyId(null);
      setNewOrderLines([]);
      setNewOrderNotes("");
      _setNewOrderTab("items");
      setShowOfficeCart(false);
      setOfficeOrderSearch("");
      setOfficeOrderCategory("all");
      setActiveView("orders");
      await loadAllData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSubmittingNewOrder(false);
    }
  }

  const officeTodayStr = new Date().toISOString().split("T")[0];

  const filtered = useMemo((): OfficeOrderDetail[] => {
    let result =
      statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter);
    if (bookerFilter)
      result = result.filter((o) => o.staffName === bookerFilter);
    // Show only today's orders by default
    result = result.filter((o) => o.date === officeTodayStr);
    return result;
  }, [orders, statusFilter, bookerFilter, officeTodayStr]);

  const filteredWithLines = useMemo((): OfficeOrderDetail[] => {
    let result =
      statusFilter === "all"
        ? ordersWithLines
        : ordersWithLines.filter((o) => o.status === statusFilter);
    if (bookerFilter)
      result = result.filter((o) => o.staffName === bookerFilter);
    // Show only today's orders by default
    result = result.filter((o) => o.date === officeTodayStr);
    return result;
  }, [ordersWithLines, statusFilter, bookerFilter, officeTodayStr]);

  // Unique booker names derived from orders
  const uniqueBookers = useMemo(() => {
    const names = new Set<string>();
    for (const o of orders) {
      if (o.staffName) names.add(o.staffName);
    }
    return Array.from(names).sort();
  }, [orders]);

  const filteredHistory = useMemo((): OfficeOrderDetail[] => {
    const seen = new Set<string>();
    const combined = [...historyOrders, ...orders];
    return combined.filter((o) => {
      const key = String(o.backendId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [historyOrders, orders]);

  const todayOrders = useMemo(
    () => orders.filter((o) => o.date === officeTodayStr),
    [orders, officeTodayStr],
  );

  const stats = useMemo(
    () => ({
      total: todayOrders.length,
      pending: todayOrders.filter((o) => o.status === "pending").length,
      confirmed: todayOrders.filter((o) => o.status === "confirmed").length,
      delivered: todayOrders.filter((o) => o.status === "delivered").length,
    }),
    [todayOrders],
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
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <Toaster richColors position="top-center" />

      {/* Backend error banner */}
      {backendError && (
        <div className="flex items-center justify-between gap-3 bg-red-600 text-white px-6 py-2.5 text-sm">
          <span className="flex-1 min-w-0 truncate">
            Backend error — click Retry to reload
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBackendError(null);
                loadAllData();
              }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold"
            >
              <RefreshCw size={12} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setBackendError(null)}
              className="w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors rounded-full"
              aria-label="Dismiss error"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="text-white px-6 py-4 shadow-lg shrink-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.42 0.18 255), oklch(0.32 0.22 270))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading">MedFlow Office</h1>
              <p className="text-white/70 text-xs flex items-center gap-1.5">
                Office Dashboard | آفس ڈیش بورڈ
                <span className="bg-purple-400/40 text-purple-100 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/delivery?from=office"
              data-ocid="office.delivery_view_link"
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? "w-56" : "w-14"} bg-white border-r border-gray-200 flex flex-col py-4 shrink-0 overflow-y-auto transition-all duration-200`}
        >
          <nav className="space-y-1 px-2">
            {sidebarOpen && (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                Orders | آرڈر
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveView("orders");
                setSidebarOpen(false);
              }}
              title="Active Orders"
              className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${activeView === "orders" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
            >
              <Package size={16} className="shrink-0" />
              {sidebarOpen && <span>Active Orders</span>}
              {sidebarOpen && stats.total > 0 && (
                <span
                  className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeView === "orders" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {stats.total}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView("history");
                setSidebarOpen(false);
              }}
              title="History"
              className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "history" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
            >
              <History size={16} className="shrink-0" />
              {sidebarOpen && <span>History | تاریخ</span>}
            </button>
            <div className="pt-3 border-t border-gray-100 mt-3">
              {sidebarOpen && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                  Management | انتظام
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveView("inventory");
                  setSidebarOpen(false);
                }}
                title="Inventory"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "inventory" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <Warehouse size={16} className="shrink-0" />
                {sidebarOpen && <span>Inventory | انوینٹری</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("purchasing");
                  setSidebarOpen(false);
                }}
                title="Purchasing"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "purchasing" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <ShoppingBag size={16} className="shrink-0" />
                {sidebarOpen && <span>Purchasing | خریداری</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("add-order");
                  setSidebarOpen(false);
                }}
                title="Add Order"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "add-order" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <Plus size={16} className="shrink-0" />
                {sidebarOpen && <span>Add Order | آرڈر شامل</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("payments");
                  setSidebarOpen(false);
                }}
                title="Payments"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "payments" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <CreditCard size={16} className="shrink-0" />
                {sidebarOpen && <span>Payments | ادائیگیاں</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("daily-sale-statement");
                  setSidebarOpen(false);
                }}
                title="Daily Sale Statement"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "daily-sale-statement" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <BarChart2 size={16} className="shrink-0" />
                {sidebarOpen && (
                  <span>Daily Sale Statement | روزانہ فروخت</span>
                )}
              </button>
              <div className="pt-3 border-t border-gray-100 mt-3">
                {sidebarOpen && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                    Customers | کسٹمرز
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("customer-wise-sales");
                    setSidebarOpen(false);
                  }}
                  title="Customer Wise Sales"
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "customer-wise-sales" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
                >
                  <User size={16} className="shrink-0" />
                  {sidebarOpen && <span>Customer Wise Sales | کسٹمر سیلز</span>}
                </button>
              </div>
              {/* Estimated Billing */}
              <button
                type="button"
                onClick={() => {
                  setActiveView("estimated-billing");
                  setSidebarOpen(false);
                }}
                title="Estimated Billing"
                data-ocid="office.estimated_billing_tab"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "estimated-billing" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <Calculator size={16} className="shrink-0" />
                {sidebarOpen && <span>Estimated Billing | اندازہ بلنگ</span>}
              </button>

              {/* Manage Section */}
              <div className="pt-3 border-t border-gray-100 mt-3">
                {sidebarOpen && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
                    Settings | سیٹنگز
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("manage");
                    setSidebarOpen(false);
                  }}
                  title="Manage"
                  data-ocid="office.manage_tab"
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "manage" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
                >
                  <Settings2 size={16} className="shrink-0" />
                  {sidebarOpen && <span>Manage | منظم</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("user-management");
                    setSidebarOpen(false);
                  }}
                  title="User Management"
                  data-ocid="office.user_management_tab"
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "user-management" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
                >
                  <User size={16} className="shrink-0" />
                  {sidebarOpen && <span>User Management | صارف انتظام</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("staff-locations");
                    setSidebarOpen(false);
                  }}
                  title="Staff Locations"
                  data-ocid="office.staff_locations_tab"
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === "staff-locations" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"} ${!sidebarOpen ? "justify-center" : ""}`}
                >
                  <MapPin size={16} className="shrink-0" />
                  {sidebarOpen && <span>Staff Locations | عملے کی جگہ</span>}
                </button>
                {/* Logout */}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearSession();
                      window.location.href = "/office";
                    }}
                    title="Logout"
                    data-ocid="office.logout_button"
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-500 hover:bg-red-50 ${!sidebarOpen ? "justify-center" : ""}`}
                  >
                    <LogOut size={16} className="shrink-0" />
                    {sidebarOpen && <span>Logout | لاگ آؤٹ</span>}
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
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
                      disabled={
                        isConfirmingAll || isLoading || stats.pending === 0
                      }
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

                    {/* Print Selected */}
                    {selectedForReprint.size > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const toPrint = filteredWithLines.filter((o) =>
                            selectedForReprint.has(o.orderId),
                          );
                          if (toPrint.length === 0) return;
                          const printWin = window.open("", "_blank");
                          if (!printWin) return;
                          const html = buildPrintHtml(toPrint);
                          printWin.document.write(html);
                          printWin.document.close();
                          printWin.print();
                          setSelectedForReprint(new Set());
                        }}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Printer size={14} />
                        Print Selected ({selectedForReprint.size}) | منتخب
                      </button>
                    )}
                    {/* Print New — only confirmed orders */}
                    {(() => {
                      const newOrders = filteredWithLines.filter(
                        (o) =>
                          !printedOrderIds.has(o.orderId) &&
                          o.status === "confirmed",
                      );
                      const pendingUnprinted = filteredWithLines.filter(
                        (o) =>
                          !printedOrderIds.has(o.orderId) &&
                          o.status === "pending",
                      );
                      return (
                        <>
                          <button
                            type="button"
                            data-ocid="office.print_new_button"
                            onClick={() => {
                              if (newOrders.length === 0) {
                                if (pendingUnprinted.length > 0) {
                                  toast.warning(
                                    `${pendingUnprinted.length} pending order(s) must be confirmed before printing.`,
                                  );
                                } else {
                                  toast.info(
                                    "No confirmed orders to print. Select specific orders to re-print.",
                                  );
                                }
                                return;
                              }
                              const printWin = window.open("", "_blank");
                              if (!printWin) return;
                              const html = buildPrintHtml(newOrders);
                              printWin.document.write(html);
                              printWin.document.close();
                              printWin.print();
                              const newPrinted = new Set(printedOrderIds);
                              for (const o of newOrders) {
                                newPrinted.add(o.orderId);
                              }
                              setPrintedOrderIds(newPrinted);
                              try {
                                localStorage.setItem(
                                  "medorder_printed_orders",
                                  JSON.stringify(Array.from(newPrinted)),
                                );
                              } catch {
                                // ignore
                              }
                            }}
                            disabled={newOrders.length === 0}
                            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                          >
                            <Printer size={14} />
                            Print All | سب پرنٹ
                            {newOrders.length > 0 && (
                              <span className="bg-white/25 text-white text-xs px-1.5 py-0.5 rounded-full">
                                {newOrders.length}
                              </span>
                            )}
                          </button>
                          {pendingUnprinted.length > 0 && (
                            <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                              ⚠ {pendingUnprinted.length} pending — confirm
                              first
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Booker filter chips */}
                {uniqueBookers.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Booker:
                    </span>
                    <button
                      type="button"
                      onClick={() => setBookerFilter(null)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${bookerFilter === null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      All
                    </button>
                    {uniqueBookers.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() =>
                          setBookerFilter(bookerFilter === name ? null : name)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${bookerFilter === name ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Color Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-1">
                  <span className="font-semibold text-gray-600">
                    Order Colors:
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded-full bg-purple-600 shadow-sm" />
                    Discount + Bonus
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded-full bg-red-600 shadow-sm" />
                    Discount only
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded-full bg-blue-600 shadow-sm" />
                    Bonus only
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-4 rounded-full bg-green-600 shadow-sm" />
                    No discount/bonus
                  </span>
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={32}
                      />
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
                          <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                            ✓
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Order ID
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Pharmacy | فارمیسی
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Staff Name | نام
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
                        {filtered.map((order, idx) => {
                          const isPrinted = printedOrderIds.has(order.orderId);
                          const isSelectedForReprint = selectedForReprint.has(
                            order.orderId,
                          );
                          const hasAnyDiscount = order.items.some(
                            (i) =>
                              (i.discountPercent ?? 0) > 0 ||
                              (i.distributionDiscount ?? 0) > 0 ||
                              (i.companyDiscount ?? 0) > 0,
                          );
                          const hasAnyBonus = order.items.some(
                            (i) => (i.bonusQty ?? 0) > 0,
                          );
                          let orderColorClass = "";
                          let orderDotColor = "";
                          if (hasAnyDiscount && hasAnyBonus) {
                            orderColorClass = "border-l-4 border-l-purple-600";
                            orderDotColor = "bg-purple-600";
                          } else if (hasAnyDiscount && !hasAnyBonus) {
                            orderColorClass = "border-l-4 border-l-red-600";
                            orderDotColor = "bg-red-600";
                          } else if (!hasAnyDiscount && hasAnyBonus) {
                            orderColorClass = "border-l-4 border-l-blue-600";
                            orderDotColor = "bg-blue-600";
                          } else {
                            orderColorClass = "border-l-4 border-l-green-600";
                            orderDotColor = "bg-green-600";
                          }
                          return (
                            <tr
                              key={String(order.backendId)}
                              className={`cursor-pointer hover:bg-blue-50/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"} ${isPrinted ? "opacity-80" : ""} ${orderColorClass}`}
                              onClick={() => setSelectedOrder(order)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") setSelectedOrder(order);
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLElement
                                  )?.focus();
                                }
                                if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  (
                                    e.currentTarget
                                      .previousElementSibling as HTMLElement
                                  )?.focus();
                                }
                              }}
                              tabIndex={0}
                            >
                              <td
                                className="px-3 py-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                {isPrinted && (
                                  <input
                                    type="checkbox"
                                    checked={isSelectedForReprint}
                                    onChange={(e) => {
                                      setSelectedForReprint((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) {
                                          next.add(order.orderId);
                                        } else {
                                          next.delete(order.orderId);
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                                    title="Select for reprint"
                                    aria-label={`Select ${order.orderId} for reprint`}
                                  />
                                )}
                                {isPrinted && !isSelectedForReprint && (
                                  <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
                                    ✓ printed
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">
                                <span
                                  className={`inline-block w-4 h-4 rounded-full mr-1.5 shadow-sm align-middle ${orderDotColor}`}
                                />
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
                              <td className="px-4 py-3">
                                <div className="text-sm font-semibold text-gray-900">
                                  {order.staffName || "—"}
                                </div>
                                {order.staffCode && (
                                  <div className="text-xs text-gray-400 font-mono">
                                    {order.staffCode}
                                  </div>
                                )}
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
                                {(order.returnItems ?? []).length > 0 && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                                      ↩ {order.returnItems!.length} returns
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td
                                className="px-4 py-3"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
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
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
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
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
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
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {activeView === "history" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 font-heading">
                      History | تاریخ
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      All orders history | آرڈر تاریخ
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                      {historyOrders.length} orders
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const printWin = window.open("", "_blank");
                        if (!printWin) return;
                        const html = buildPrintHtml(filteredHistory);
                        printWin.document.write(html);
                        printWin.document.close();
                        printWin.print();
                      }}
                      disabled={filteredHistory.length === 0}
                      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Printer size={14} />
                      Print History | تاریخ پرنٹ
                    </button>
                    <button
                      type="button"
                      data-ocid="office.history.delete_button"
                      onClick={() => setShowClearHistoryDialog(true)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Trash2 size={14} />
                      Clear History | تاریخ صاف کریں
                    </button>
                  </div>
                </div>

                <OfficeOrderHistoryHierarchy
                  isLoading={isLoading}
                  filteredHistory={filteredHistory}
                  setSelectedOrder={setSelectedOrder}
                />

                {/* Clear History Password Dialog */}
                {showClearHistoryDialog && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Clear History | تاریخ صاف کریں
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Apna password enter karein. Yeh action undo nahi ho
                        sakti. Saari history permanently delete ho jayegi.
                      </p>
                      <input
                        type="password"
                        value={clearHistoryPassword}
                        onChange={(e) =>
                          setClearHistoryPassword(e.target.value)
                        }
                        placeholder="Password dalein | Enter password"
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                        data-ocid="office.history.password.input"
                      />
                      <div className="flex gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowClearHistoryDialog(false);
                            setClearHistoryPassword("");
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                          data-ocid="office.history.cancel_button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          data-ocid="office.history.confirm_button"
                          disabled={
                            isClearingHistory || !clearHistoryPassword.trim()
                          }
                          onClick={async () => {
                            const clearSess = getSession();
                            if (!clearSess?.distributorId) return;
                            // Verify password against known users
                            const userRecord = lookupUser(
                              clearSess.username,
                              clearHistoryPassword,
                            );
                            if (!userRecord) {
                              toast.error("Wrong password | غلط پاس ورڈ");
                              return;
                            }
                            if (!actor) return;
                            setIsClearingHistory(true);
                            try {
                              await (actor as any).clearOrdersForDistributor(
                                BigInt(clearSess.distributorId),
                              );
                              setShowClearHistoryDialog(false);
                              setClearHistoryPassword("");
                              toast.success(
                                "History clear ho gayi | History cleared",
                              );
                              await loadAllData();
                            } catch (e: unknown) {
                              const msg =
                                e instanceof Error
                                  ? e.message
                                  : "Unknown error";
                              toast.error(`Error: ${msg}`);
                            } finally {
                              setIsClearingHistory(false);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {isClearingHistory ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                      {allMedicines.length} medicines ·{" "}
                      {medicinesByCompany.length} companies
                    </span>
                    {inventoryEditMode ? (
                      <button
                        type="button"
                        onClick={() => setInventoryEditMode(false)}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        data-ocid="inventory.toggle"
                      >
                        🔒 Lock | بند کریں
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setInventoryPasswordInput("");
                          setShowInventoryPasswordDialog(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        data-ocid="inventory.edit_button"
                      >
                        🔒 Edit Inventory | ترمیم
                      </button>
                    )}
                  </div>
                </div>

                {/* Inventory Password Dialog */}
                {showInventoryPasswordDialog && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Inventory Edit | انوینٹری ترمیم
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Apna password enter karein stock edit karne ke liye |
                        Enter password to edit stock quantities
                      </p>
                      <input
                        type="password"
                        value={inventoryPasswordInput}
                        onChange={(e) =>
                          setInventoryPasswordInput(e.target.value)
                        }
                        placeholder="Password | پاس ورڈ"
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        data-ocid="inventory.password.input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const invSess = getSession();
                            if (!invSess) return;
                            const invUser = lookupUser(
                              invSess.username,
                              inventoryPasswordInput,
                            );
                            if (invUser) {
                              setInventoryEditMode(true);
                              setShowInventoryPasswordDialog(false);
                              setInventoryPasswordInput("");
                            } else {
                              toast.error("Wrong password | غلط پاس ورڈ");
                            }
                          }
                        }}
                      />
                      <div className="flex gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowInventoryPasswordDialog(false);
                            setInventoryPasswordInput("");
                          }}
                          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                          data-ocid="inventory.cancel_button"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          data-ocid="inventory.confirm_button"
                          onClick={() => {
                            const invSess = getSession();
                            if (!invSess) return;
                            const invUser = lookupUser(
                              invSess.username,
                              inventoryPasswordInput,
                            );
                            if (invUser) {
                              setInventoryEditMode(true);
                              setShowInventoryPasswordDialog(false);
                              setInventoryPasswordInput("");
                            } else {
                              toast.error("Wrong password | غلط پاس ورڈ");
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                          Unlock | کھولیں
                        </button>
                      </div>
                    </div>
                  </div>
                )}

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
                              Generic Name | جنیرک
                            </th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Batch # | بیچ
                            </th>
                            <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Type | قسم
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
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 italic">
                                  {med.genericName || "—"}
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-700">
                                  {med.batchNo || "—"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {med.medicineType ? (
                                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                      {med.medicineType}
                                    </span>
                                  ) : (
                                    <span className="text-xs capitalize text-gray-400">
                                      {med.category}
                                    </span>
                                  )}
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
                                    disabled={!inventoryEditMode}
                                    onChange={(e) => {
                                      // Save to localStorage immediately on every change
                                      localStorage.setItem(
                                        stockKey,
                                        e.target.value,
                                      );
                                    }}
                                    onBlur={(e) => {
                                      if (!inventoryEditMode) return;
                                      // Save to backend only on blur (single call, not every keystroke)
                                      const val = e.target.value;
                                      localStorage.setItem(stockKey, val);
                                      const numVal = Number(val);
                                      if (!Number.isNaN(numVal) && actor) {
                                        actor
                                          .setInventoryStock(
                                            med.backendId,
                                            BigInt(Math.round(numVal)),
                                          )
                                          .then(() => {
                                            // Force staff stockMap update in office localStorage too
                                          })
                                          .catch(() => {});
                                      }
                                    }}
                                    className={`w-20 text-center text-sm font-bold border rounded-lg px-2 py-1.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${inventoryEditMode ? "text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" : "text-gray-500 border-gray-200 bg-gray-50 cursor-not-allowed"}`}
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

            {activeView === "purchasing" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 font-heading">
                      Purchasing | خریداری
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      New product purchase records · نئی خریداری ریکارڈ
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                    {purchases.length} records
                  </span>
                </div>

                {/* Add Purchase Form */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 font-heading mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-blue-600" />
                    Add New Purchase Record | نئی خریداری شامل کریں
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Medicine Search */}
                    <div className="col-span-2 md:col-span-3 relative">
                      <label
                        htmlFor="pur-med-search"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Search Medicine | دوائی تلاش کریں
                      </label>
                      <input
                        id="pur-med-search"
                        type="text"
                        value={purchaseMedSearch}
                        onChange={(e) => {
                          setPurchaseMedSearch(e.target.value);
                          setPurchaseMedDropOpen(true);
                        }}
                        onFocus={() => setPurchaseMedDropOpen(true)}
                        onBlur={() =>
                          setTimeout(() => setPurchaseMedDropOpen(false), 200)
                        }
                        placeholder="Type medicine name to search and auto-fill fields..."
                        className="w-full h-10 text-sm border border-blue-300 rounded-lg px-3 bg-blue-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {purchaseMedDropOpen &&
                        purchaseMedSearch.trim().length > 0 && (
                          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                            {allMedicines
                              .filter((m) =>
                                m.name
                                  .toLowerCase()
                                  .includes(purchaseMedSearch.toLowerCase()),
                              )
                              .slice(0, 20)
                              .map((med) => (
                                <button
                                  key={String(med.backendId)}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                                  onClick={() => {
                                    setPurchaseProductName(med.name);
                                    setPurchaseGenericName(
                                      med.genericName ?? "",
                                    );
                                    setPurchasePackSize(med.packSize ?? "");
                                    setPurchaseCompanyName(med.company ?? "");
                                    setPurchaseStrength(med.strength ?? "");
                                    if (med.medicineType)
                                      setPurchaseMedicineType(med.medicineType);
                                    setPurchaseMedSearch(med.name);
                                    setPurchaseMedDropOpen(false);
                                  }}
                                >
                                  <span className="font-semibold text-gray-900">
                                    {med.name}
                                  </span>
                                  {med.strength && (
                                    <span className="text-gray-500 ml-2 text-xs">
                                      {med.strength}
                                    </span>
                                  )}
                                  {med.company && (
                                    <span className="text-gray-400 ml-2 text-xs">
                                      · {med.company}
                                    </span>
                                  )}
                                </button>
                              ))}
                            {allMedicines.filter((m) =>
                              m.name
                                .toLowerCase()
                                .includes(purchaseMedSearch.toLowerCase()),
                            ).length === 0 && (
                              <p className="px-4 py-3 text-sm text-gray-400">
                                No medicines found
                              </p>
                            )}
                          </div>
                        )}
                    </div>
                    <div>
                      <label
                        htmlFor="pur-product-name"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Product Name | پروڈکٹ نام *
                      </label>
                      <input
                        id="pur-product-name"
                        type="text"
                        value={purchaseProductName}
                        onChange={(e) => setPurchaseProductName(e.target.value)}
                        placeholder="e.g. Panadol"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-generic-name"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Generic Name | عام نام
                      </label>
                      <input
                        id="pur-generic-name"
                        type="text"
                        value={purchaseGenericName}
                        onChange={(e) => setPurchaseGenericName(e.target.value)}
                        placeholder="e.g. Paracetamol"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-batch-no"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Batch # | بیچ نمبر *
                      </label>
                      <input
                        id="pur-batch-no"
                        type="text"
                        value={purchaseBatchNo}
                        onChange={(e) => setPurchaseBatchNo(e.target.value)}
                        placeholder="e.g. BN-2024-001"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-quantity"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Quantity | مقدار *
                      </label>
                      <input
                        id="pur-quantity"
                        type="number"
                        min="1"
                        value={purchaseQuantity}
                        onChange={(e) => setPurchaseQuantity(e.target.value)}
                        placeholder="e.g. 500"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-price"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Price (Rs) | قیمت *
                      </label>
                      <input
                        id="pur-price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        placeholder="e.g. 450.50"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-pack-size"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Pack Size | پیک سائز
                      </label>
                      <input
                        id="pur-pack-size"
                        type="text"
                        value={purchasePackSize}
                        onChange={(e) => setPurchasePackSize(e.target.value)}
                        placeholder="e.g. Pack of 10"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-company-name"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Company Name | کمپنی نام *
                      </label>
                      <input
                        id="pur-company-name"
                        type="text"
                        value={purchaseCompanyName}
                        onChange={(e) => setPurchaseCompanyName(e.target.value)}
                        placeholder="e.g. GlaxoSmithKline"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-strength"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Product Strength | طاقت
                      </label>
                      <input
                        id="pur-strength"
                        type="text"
                        value={purchaseStrength}
                        onChange={(e) => setPurchaseStrength(e.target.value)}
                        placeholder="e.g. 500mg"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                        data-ocid="purchasing.strength.input"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pur-medicine-type"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Medicine Type | قسم
                      </label>
                      <select
                        id="pur-medicine-type"
                        value={purchaseMedicineType}
                        onChange={(e) =>
                          setPurchaseMedicineType(e.target.value)
                        }
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                      >
                        <option value="Tablet">Tablet | گولی</option>
                        <option value="Syrup">Syrup | شربت</option>
                        <option value="Injection">Injection | انجکشن</option>
                        <option value="Capsule">Capsule | کیپسول</option>
                        <option value="Drop">Drop | قطرے</option>
                        <option value="Cream">Cream | کریم</option>
                        <option value="Sachet">Sachet | سیشے</option>
                        <option value="Other">Other | دیگر</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="pur-invoice-number"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Invoice Number | انوائس نمبر
                      </label>
                      <input
                        id="pur-invoice-number"
                        type="text"
                        value={purchaseInvoiceNumber}
                        onChange={(e) =>
                          setPurchaseInvoiceNumber(e.target.value)
                        }
                        placeholder="e.g. INV-2024-001"
                        disabled={isAddingPurchase}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                        data-ocid="purchasing.invoice_number.input"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddPurchase}
                        disabled={isAddingPurchase}
                        className="w-full h-10 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
                      >
                        {isAddingPurchase ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        {isAddingPurchase
                          ? "Adding..."
                          : "Add Record | شامل کریں"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Purchases Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {isLoadingPurchases ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2
                        className="animate-spin text-blue-500"
                        size={32}
                      />
                    </div>
                  ) : purchases.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <ShoppingBag
                        size={40}
                        className="mx-auto mb-3 opacity-50"
                      />
                      <p className="font-medium">
                        No purchase records yet | کوئی خریداری ریکارڈ نہیں
                      </p>
                      <p className="text-xs mt-1">
                        Use the form above to add your first purchase record
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Product Name | پروڈکٹ
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Generic Name | عام نام
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Batch # | بیچ
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Type | قسم
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Company | کمپنی
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Qty | مقدار
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Price (Rs) | قیمت
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Pack Size | پیک
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Invoice # | انوائس
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Date | تاریخ
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchases.map((purchase, idx) => {
                          const date = new Date(
                            Number(purchase.timestamp / BigInt(1_000_000)),
                          )
                            .toISOString()
                            .split("T")[0];
                          return (
                            <tr
                              key={String(purchase.id)}
                              className={
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                              }
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-sm text-gray-900">
                                  {purchase.productName}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {purchase.genericName || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-gray-700">
                                {purchase.batchNo}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {purchase.medicineType ? (
                                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                    {purchase.medicineType}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {purchase.companyName}
                              </td>
                              <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                                {String(purchase.quantity)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-blue-700">
                                {formatCurrency(Number(purchase.price) / 100)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {purchase.packSize || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                {(purchase as any).invoiceNumber || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {formatDate(date)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {confirmDeletePurchaseId === purchase.id ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeletePurchase(purchase.id)
                                      }
                                      disabled={
                                        deletingPurchaseId === purchase.id
                                      }
                                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                    >
                                      {deletingPurchaseId === purchase.id ? (
                                        <Loader2
                                          size={10}
                                          className="animate-spin"
                                        />
                                      ) : null}
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setConfirmDeletePurchaseId(null)
                                      }
                                      className="text-xs px-2 py-1 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50 transition-colors"
                                      disabled={
                                        deletingPurchaseId === purchase.id
                                      }
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeletePurchaseId(purchase.id)
                                    }
                                    className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded-lg transition-colors mx-auto"
                                    disabled={
                                      deletingPurchaseId === purchase.id
                                    }
                                    aria-label={`Delete purchase ${purchase.productName}`}
                                  >
                                    <Trash2 size={12} />
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeView === "add-order" && (
              <div className="flex flex-col gap-3 h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Add Order | آرڈر شامل کریں
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      آفس آرڈر | Admin
                    </p>
                  </div>
                  {newOrderLines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOfficeCart(true)}
                      data-ocid="add_order.cart_button"
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow"
                    >
                      <ShoppingCart size={16} />
                      Cart (
                      {newOrderLines.reduce(
                        (s, l) => s + (Number(l.qty) || 1),
                        0,
                      )}{" "}
                      items)
                    </button>
                  )}
                </div>

                {/* Pharmacy selector */}
                <div className="relative max-w-sm">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      value={
                        newOrderPharmacyId && !newOrderPharmacyDropdownOpen
                          ? (allPharmacies.find(
                              (p) => p.id === newOrderPharmacyId,
                            )?.name ?? newOrderPharmacySearch)
                          : newOrderPharmacySearch
                      }
                      onChange={(e) => {
                        setNewOrderPharmacySearch(e.target.value);
                        setNewOrderPharmacyDropdownOpen(true);
                        if (!e.target.value) setNewOrderPharmacyId(null);
                      }}
                      onFocus={() => {
                        setNewOrderPharmacySearch("");
                        setNewOrderPharmacyDropdownOpen(true);
                      }}
                      placeholder="فارمیسی منتخب کریں | Select Pharmacy..."
                      data-ocid="add_order.pharmacy_input"
                      className="w-full h-10 text-sm border border-gray-300 rounded-xl pl-8 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="off"
                    />
                    {newOrderPharmacyId && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewOrderPharmacyId(null);
                          setNewOrderPharmacySearch("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {newOrderPharmacyDropdownOpen && (
                    <>
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {allPharmacies
                          .filter(
                            (p) =>
                              !newOrderPharmacySearch ||
                              p.name
                                .toLowerCase()
                                .includes(newOrderPharmacySearch.toLowerCase()),
                          )
                          .map((p) => (
                            <button
                              type="button"
                              key={String(p.id)}
                              onClick={() => {
                                setNewOrderPharmacyId(p.id);
                                setNewOrderPharmacySearch("");
                                setNewOrderPharmacyDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${newOrderPharmacyId === p.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-900"}`}
                            >
                              {p.name}
                            </button>
                          ))}
                        {allPharmacies.filter(
                          (p) =>
                            !newOrderPharmacySearch ||
                            p.name
                              .toLowerCase()
                              .includes(newOrderPharmacySearch.toLowerCase()),
                        ).length === 0 && (
                          <div className="px-3 py-3 text-sm text-gray-400 text-center">
                            No pharmacies found
                          </div>
                        )}
                      </div>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setNewOrderPharmacyDropdownOpen(false)}
                        onKeyDown={() => setNewOrderPharmacyDropdownOpen(false)}
                        role="button"
                        tabIndex={-1}
                        aria-label="Close dropdown"
                      />
                    </>
                  )}
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(
                    [
                      "all",
                      "tablets",
                      "syrups",
                      "injections",
                      "capsules",
                      "drops",
                      "creams",
                    ] as const
                  ).map((cat) => {
                    const labels: Record<string, string> = {
                      all: "All",
                      tablets: "Tablets",
                      syrups: "Syrups",
                      injections: "Inj",
                      capsules: "Capsules",
                      drops: "Drops",
                      creams: "Creams",
                    };
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setOfficeOrderCategory(cat)}
                        data-ocid={`add_order.${cat}_tab`}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${officeOrderCategory === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {labels[cat]}
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={officeOrderSearch}
                    onChange={(e) => setOfficeOrderSearch(e.target.value)}
                    placeholder="دوائی تلاش کریں | Search medicines..."
                    data-ocid="add_order.search_input"
                    className="w-full h-9 text-sm border border-gray-200 rounded-xl pl-9 pr-8 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {officeOrderSearch && (
                    <button
                      type="button"
                      onClick={() => setOfficeOrderSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Medicine grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-4">
                  {allMedicines
                    .filter((m) => {
                      const matchCat =
                        officeOrderCategory === "all" ||
                        m.category === officeOrderCategory;
                      const q = officeOrderSearch.toLowerCase();
                      const matchQ =
                        !q ||
                        m.name.toLowerCase().includes(q) ||
                        m.company.toLowerCase().includes(q) ||
                        m.strength.toLowerCase().includes(q);
                      return matchCat && matchQ;
                    })
                    .map((m) => {
                      const existingLine = newOrderLines.find(
                        (l) => l.medicineId === m.backendId,
                      );
                      const qty = existingLine ? Number(existingLine.qty) : 0;
                      const stockQty = getStock(m.backendId);
                      const stockBadge =
                        stockQty === null
                          ? null
                          : stockQty === 0
                            ? {
                                text: "Out of Stock",
                                cls: "bg-red-100 text-red-600",
                              }
                            : stockQty <= 10
                              ? {
                                  text: `Stock: ${stockQty}`,
                                  cls: "bg-amber-100 text-amber-700",
                                }
                              : {
                                  text: `Stock: ${stockQty}`,
                                  cls: "bg-emerald-100 text-emerald-700",
                                };
                      return (
                        <div
                          key={String(m.backendId)}
                          className={`bg-white rounded-xl border p-3 flex items-start gap-2 ${qty > 0 ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-200"}`}
                        >
                          {/* Left: info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">
                              {m.name}
                            </p>
                            {m.strength && (
                              <p className="text-xs text-gray-400">
                                {m.strength}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">{m.company}</p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-sm font-bold text-blue-700">
                                Rs {m.price.toFixed(2)}
                              </span>
                              {stockBadge && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${stockBadge.cls}`}
                                >
                                  {stockBadge.text}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Right: controls */}
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                qty === 0 ? "" : String(existingLine?.qty ?? "")
                              }
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                const numVal = Number.parseFloat(val) || 0;
                                if (!val || numVal === 0) {
                                  setNewOrderLines((prev) =>
                                    prev.filter(
                                      (l) => l.medicineId !== m.backendId,
                                    ),
                                  );
                                } else if (qty === 0) {
                                  setNewOrderLines((prev) => [
                                    ...prev,
                                    {
                                      _key: `line-${Date.now()}-${Math.random()}`,
                                      medicineId: m.backendId,
                                      medicineName: m.name,
                                      qty: val,
                                      bonus: "0",
                                      discount: "0",
                                      distDisc: "0",
                                      compDisc: "0",
                                      netRate: "0",
                                    },
                                  ]);
                                } else {
                                  setNewOrderLines((prev) =>
                                    prev.map((l) =>
                                      l.medicineId === m.backendId
                                        ? { ...l, qty: val }
                                        : l,
                                    ),
                                  );
                                }
                              }}
                              className="w-14 text-center text-sm font-bold text-foreground border border-input rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              aria-label="Quantity"
                              data-ocid="add_order.qty_input"
                            />
                            {qty > 0 && (
                              <>
                                <label className="flex items-center gap-1">
                                  <span className="text-[9px] text-emerald-600 font-medium">
                                    Bonus
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={
                                      existingLine?.bonus === "0" ||
                                      !existingLine?.bonus
                                        ? ""
                                        : existingLine.bonus
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      setNewOrderLines((prev) =>
                                        prev.map((l) =>
                                          l.medicineId === m.backendId
                                            ? {
                                                ...l,
                                                bonus: e.target.value || "0",
                                              }
                                            : l,
                                        ),
                                      )
                                    }
                                    className="w-12 text-center text-xs font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    aria-label="Bonus"
                                  />
                                </label>
                                <label className="flex items-center gap-1">
                                  <span className="text-[9px] text-amber-600 font-medium">
                                    Dist%
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={
                                      existingLine?.distDisc === "0" ||
                                      !existingLine?.distDisc
                                        ? ""
                                        : existingLine.distDisc
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      setNewOrderLines((prev) =>
                                        prev.map((l) =>
                                          l.medicineId === m.backendId
                                            ? {
                                                ...l,
                                                distDisc: e.target.value || "0",
                                              }
                                            : l,
                                        ),
                                      )
                                    }
                                    className="w-12 text-center text-xs font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    aria-label="Dist%"
                                  />
                                </label>
                                <label className="flex items-center gap-1">
                                  <span className="text-[9px] text-blue-600 font-medium">
                                    Co%
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={
                                      existingLine?.compDisc === "0" ||
                                      !existingLine?.compDisc
                                        ? ""
                                        : existingLine.compDisc
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      setNewOrderLines((prev) =>
                                        prev.map((l) =>
                                          l.medicineId === m.backendId
                                            ? {
                                                ...l,
                                                compDisc: e.target.value || "0",
                                              }
                                            : l,
                                        ),
                                      )
                                    }
                                    className="w-12 text-center text-xs font-bold text-blue-700 border border-blue-300 bg-blue-50 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    aria-label="Co%"
                                  />
                                </label>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-[9px] text-gray-500 font-medium">
                                    Net
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={
                                      existingLine?.netRate === "0" ||
                                      !existingLine?.netRate
                                        ? ""
                                        : existingLine.netRate
                                    }
                                    placeholder="0"
                                    onChange={(e) =>
                                      setNewOrderLines((prev) =>
                                        prev.map((l) =>
                                          l.medicineId === m.backendId
                                            ? {
                                                ...l,
                                                netRate: e.target.value || "0",
                                              }
                                            : l,
                                        ),
                                      )
                                    }
                                    className={`w-14 text-center text-xs font-bold rounded px-1 py-0.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                      existingLine?.netRate &&
                                      existingLine.netRate !== "0"
                                        ? "text-purple-700 border border-purple-400 bg-purple-50"
                                        : "text-gray-700 border border-gray-200 bg-gray-100"
                                    }`}
                                    aria-label="Net rate"
                                  />
                                  {existingLine?.netRate &&
                                    existingLine.netRate !== "0" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setNewOrderLines((prev) =>
                                            prev.map((l) =>
                                              l.medicineId === m.backendId
                                                ? { ...l, netRate: "0" }
                                                : l,
                                            ),
                                          )
                                        }
                                        className="text-[9px] text-gray-400 hover:text-gray-600 leading-none"
                                        title="Reset to auto"
                                      >
                                        ×
                                      </button>
                                    )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {allMedicines.filter((m) => {
                    const matchCat =
                      officeOrderCategory === "all" ||
                      m.category === officeOrderCategory;
                    const q = officeOrderSearch.toLowerCase();
                    return (
                      matchCat &&
                      (!q ||
                        m.name.toLowerCase().includes(q) ||
                        m.company.toLowerCase().includes(q) ||
                        m.strength.toLowerCase().includes(q))
                    );
                  }).length === 0 && (
                    <div
                      className="col-span-3 text-center py-12 text-gray-400 text-sm"
                      data-ocid="add_order.items_empty_state"
                    >
                      No medicines found | کوئی دوائی نہیں ملی
                    </div>
                  )}
                </div>

                {/* Cart sheet */}
                {showOfficeCart && (
                  <div className="fixed inset-0 z-50 flex">
                    <div
                      className="fixed inset-0 bg-black/40"
                      onClick={() => setShowOfficeCart(false)}
                      onKeyDown={() => setShowOfficeCart(false)}
                      role="button"
                      tabIndex={-1}
                      aria-label="Close cart"
                    />
                    <div className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
                      <div className="flex items-center justify-between px-5 py-4 border-b">
                        <h3 className="font-bold text-gray-900">Cart | کارٹ</h3>
                        <button
                          type="button"
                          onClick={() => setShowOfficeCart(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {newOrderLines.length === 0 ? (
                          <div
                            className="text-center py-12 text-gray-400 text-sm"
                            data-ocid="add_order.cart_empty_state"
                          >
                            Cart is empty | کارٹ خالی ہے
                          </div>
                        ) : (
                          newOrderLines.map((line) => {
                            const med = allMedicines.find(
                              (m) => m.backendId === line.medicineId,
                            );
                            return (
                              <div
                                key={line._key}
                                className="bg-gray-50 rounded-xl p-3 space-y-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {line.medicineName}
                                    </p>
                                    {med && (
                                      <p className="text-xs text-gray-400">
                                        Rs {med.price.toFixed(2)} each
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setNewOrderLines((prev) =>
                                        prev.filter(
                                          (l) => l._key !== line._key,
                                        ),
                                      )
                                    }
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  <div>
                                    <span className="text-[10px] text-gray-500 font-medium block">
                                      Qty
                                    </span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={line.qty}
                                      onChange={(e) =>
                                        setNewOrderLines((prev) =>
                                          prev.map((l) =>
                                            l._key === line._key
                                              ? { ...l, qty: e.target.value }
                                              : l,
                                          ),
                                        )
                                      }
                                      className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 text-center"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-500 font-medium block">
                                      Bonus
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={line.bonus}
                                      onChange={(e) =>
                                        setNewOrderLines((prev) =>
                                          prev.map((l) =>
                                            l._key === line._key
                                              ? { ...l, bonus: e.target.value }
                                              : l,
                                          ),
                                        )
                                      }
                                      className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 text-center"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-500 font-medium block">
                                      Dist%
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={line.distDisc}
                                      onChange={(e) =>
                                        setNewOrderLines((prev) =>
                                          prev.map((l) =>
                                            l._key === line._key
                                              ? {
                                                  ...l,
                                                  distDisc: e.target.value,
                                                }
                                              : l,
                                          ),
                                        )
                                      }
                                      className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 text-center"
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-gray-500 font-medium block">
                                      Comp%
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={line.compDisc}
                                      onChange={(e) =>
                                        setNewOrderLines((prev) =>
                                          prev.map((l) =>
                                            l._key === line._key
                                              ? {
                                                  ...l,
                                                  compDisc: e.target.value,
                                                }
                                              : l,
                                          ),
                                        )
                                      }
                                      className="w-full h-8 text-xs border border-gray-200 rounded-lg px-2 text-center"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        {newOrderLines.length > 0 && (
                          <div>
                            <span className="text-xs font-semibold text-gray-600 mb-1 block">
                              Notes | نوٹس
                            </span>
                            <textarea
                              value={newOrderNotes}
                              onChange={(e) => setNewOrderNotes(e.target.value)}
                              rows={2}
                              className="w-full text-sm border border-gray-200 rounded-xl p-2 resize-none"
                              placeholder="Optional notes..."
                            />
                          </div>
                        )}
                      </div>
                      {newOrderLines.length > 0 && (
                        <div className="p-4 border-t space-y-3">
                          {!newOrderPharmacyId && (
                            <p className="text-xs text-red-500 font-medium">
                              ⚠ پہلے فارمیسی منتخب کریں | Select pharmacy first
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleSubmitNewOrder();
                              setShowOfficeCart(false);
                            }}
                            disabled={
                              !newOrderPharmacyId || isSubmittingNewOrder
                            }
                            data-ocid="add_order.submit_button"
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                          >
                            {isSubmittingNewOrder
                              ? "Submitting... | جمع ہو رہا ہے..."
                              : "Submit Order | آرڈر جمع کریں"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payments View */}
            {activeView === "payments" && (
              <PaymentsView
                orders={orders}
                historyOrders={historyOrders}
                paymentsClearedAt={paymentsClearedAt}
                setPaymentsClearedAt={(v) => {
                  setPaymentsClearedAt(v);
                  if (v)
                    localStorage.setItem("medorder_payments_cleared_at", v);
                  else localStorage.removeItem("medorder_payments_cleared_at");
                }}
              />
            )}

            {/* Daily Sale Statement */}
            {activeView === "daily-sale-statement" && (
              <DailySaleStatement
                allOrders={[...ordersWithLines, ...historyOrders]}
                allMedicines={allMedicines}
              />
            )}

            {/* Customer Wise Sales */}
            {activeView === "customer-wise-sales" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-heading">
                    Customer Wise Sale | کسٹمر وائز سیل
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Detailed sales reports grouped by customer, company,
                    product, month, or group
                  </p>
                </div>

                {/* Date Range + Filters */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                  {/* Date Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="cws-date-from"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        From Date | شروع تاریخ
                      </label>
                      <input
                        id="cws-date-from"
                        type="date"
                        data-ocid="cws.date_from_input"
                        value={cwsDateFrom}
                        onChange={(e) => setCwsDateFrom(e.target.value)}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cws-date-to"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        To Date | آخری تاریخ
                      </label>
                      <input
                        id="cws-date-to"
                        type="date"
                        data-ocid="cws.date_to_input"
                        value={cwsDateTo}
                        onChange={(e) => setCwsDateTo(e.target.value)}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Multi-select Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Customer multi-select */}
                    {(() => {
                      const filteredCusts = allCustomers.filter(
                        (c) =>
                          c.name
                            .toLowerCase()
                            .includes(cwsCustomerSearch2.toLowerCase()) &&
                          !cwsSelectedCustomers.some(
                            (s) => String(s.id) === String(c.id),
                          ),
                      );
                      return (
                        <div className="relative">
                          <span className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">
                            Customer | کسٹمر
                          </span>
                          <div
                            className="min-h-[40px] border border-gray-300 rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
                            onClick={() => setCwsCustomerDropdown2(true)}
                            onKeyDown={() => setCwsCustomerDropdown2(true)}
                          >
                            <div className="flex flex-wrap gap-1 mb-1">
                              {cwsSelectedCustomers.map((c) => (
                                <span
                                  key={String(c.id)}
                                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full"
                                >
                                  {c.name}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCwsSelectedCustomers((prev) =>
                                        prev.filter(
                                          (x) => String(x.id) !== String(c.id),
                                        ),
                                      );
                                    }}
                                    className="hover:text-blue-600"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              data-ocid="cws.customer_search_input"
                              type="text"
                              value={cwsCustomerSearch2}
                              onChange={(e) => {
                                setCwsCustomerSearch2(e.target.value);
                                setCwsCustomerDropdown2(true);
                              }}
                              onFocus={() => setCwsCustomerDropdown2(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setCwsCustomerDropdown2(false),
                                  200,
                                )
                              }
                              placeholder={
                                cwsSelectedCustomers.length === 0
                                  ? "Search customers..."
                                  : ""
                              }
                              className="text-sm outline-none border-none p-0 w-full bg-transparent"
                            />
                          </div>
                          {cwsCustomerDropdown2 && (
                            <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredCusts.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">
                                  No customers found
                                </div>
                              ) : (
                                filteredCusts.map((c) => (
                                  <button
                                    key={String(c.id)}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setCwsSelectedCustomers((prev) => [
                                        ...prev,
                                        c,
                                      ]);
                                      setCwsCustomerSearch2("");
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
                                  >
                                    <span className="w-3 h-3 border border-gray-400 rounded-sm flex-shrink-0" />
                                    <span className="font-medium">
                                      {c.name}
                                    </span>
                                    {c.dealerCode && (
                                      <span className="text-xs text-gray-400">
                                        · {c.dealerCode}
                                      </span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Company multi-select */}
                    {(() => {
                      const allCompanies = [
                        ...new Set(
                          allMedicines.map((m) => m.company).filter(Boolean),
                        ),
                      ] as string[];
                      const filteredComps = allCompanies.filter(
                        (c) =>
                          c
                            .toLowerCase()
                            .includes(cwsCompanySearch.toLowerCase()) &&
                          !cwsSelectedCompanies.includes(c),
                      );
                      return (
                        <div className="relative">
                          <span className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">
                            Company | کمپنی
                          </span>
                          <div
                            className="min-h-[40px] border border-gray-300 rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
                            onClick={() => setCwsCompanyDropdown(true)}
                            onKeyDown={() => setCwsCompanyDropdown(true)}
                          >
                            <div className="flex flex-wrap gap-1 mb-1">
                              {cwsSelectedCompanies.map((c) => (
                                <span
                                  key={c}
                                  className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full"
                                >
                                  {c}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCwsSelectedCompanies((prev) =>
                                        prev.filter((x) => x !== c),
                                      );
                                    }}
                                    className="hover:text-green-600"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              data-ocid="cws.company_search_input"
                              type="text"
                              value={cwsCompanySearch}
                              onChange={(e) => {
                                setCwsCompanySearch(e.target.value);
                                setCwsCompanyDropdown(true);
                              }}
                              onFocus={() => setCwsCompanyDropdown(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setCwsCompanyDropdown(false),
                                  200,
                                )
                              }
                              placeholder={
                                cwsSelectedCompanies.length === 0
                                  ? "Search companies..."
                                  : ""
                              }
                              className="text-sm outline-none border-none p-0 w-full bg-transparent"
                            />
                          </div>
                          {cwsCompanyDropdown && (
                            <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredComps.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">
                                  No companies found
                                </div>
                              ) : (
                                filteredComps.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setCwsSelectedCompanies((prev) => [
                                        ...prev,
                                        c,
                                      ]);
                                      setCwsCompanySearch("");
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2"
                                  >
                                    <span className="w-3 h-3 border border-gray-400 rounded-sm flex-shrink-0" />
                                    <span className="font-medium">{c}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Medicine multi-select */}
                    {(() => {
                      const filteredMeds = allMedicines.filter(
                        (m) =>
                          m.name
                            .toLowerCase()
                            .includes(cwsMedicineSearch.toLowerCase()) &&
                          !cwsSelectedMedicines.includes(m.name),
                      );
                      return (
                        <div className="relative">
                          <span className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">
                            Medicine | دوائی
                          </span>
                          <div
                            className="min-h-[40px] border border-gray-300 rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
                            onClick={() => setCwsMedicineDropdown(true)}
                            onKeyDown={() => setCwsMedicineDropdown(true)}
                          >
                            <div className="flex flex-wrap gap-1 mb-1">
                              {cwsSelectedMedicines.map((m) => (
                                <span
                                  key={m}
                                  className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full"
                                >
                                  {m}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCwsSelectedMedicines((prev) =>
                                        prev.filter((x) => x !== m),
                                      );
                                    }}
                                    className="hover:text-purple-600"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              data-ocid="cws.medicine_search_input"
                              type="text"
                              value={cwsMedicineSearch}
                              onChange={(e) => {
                                setCwsMedicineSearch(e.target.value);
                                setCwsMedicineDropdown(true);
                              }}
                              onFocus={() => setCwsMedicineDropdown(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setCwsMedicineDropdown(false),
                                  200,
                                )
                              }
                              placeholder={
                                cwsSelectedMedicines.length === 0
                                  ? "Search medicines..."
                                  : ""
                              }
                              className="text-sm outline-none border-none p-0 w-full bg-transparent"
                            />
                          </div>
                          {cwsMedicineDropdown && (
                            <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredMeds.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">
                                  No medicines found
                                </div>
                              ) : (
                                filteredMeds.map((m) => (
                                  <button
                                    key={String(m.backendId)}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setCwsSelectedMedicines((prev) => [
                                        ...prev,
                                        m.name,
                                      ]);
                                      setCwsMedicineSearch("");
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 flex items-center gap-2"
                                  >
                                    <span className="w-3 h-3 border border-gray-400 rounded-sm flex-shrink-0" />
                                    <span className="font-medium">
                                      {m.name}
                                    </span>
                                    {m.company && (
                                      <span className="text-xs text-gray-400">
                                        · {m.company}
                                      </span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Group multi-select */}
                    {(() => {
                      const filteredGrps = allMedicineGroups.filter(
                        (g) =>
                          g.name
                            .toLowerCase()
                            .includes(cwsGroupSearch.toLowerCase()) &&
                          !cwsSelectedGroups.includes(g.name),
                      );
                      return (
                        <div className="relative">
                          <span className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">
                            Group | گروپ
                          </span>
                          <div
                            className="min-h-[40px] border border-gray-300 rounded-lg px-2 py-1 bg-white focus-within:ring-2 focus-within:ring-blue-500 cursor-text"
                            onClick={() => setCwsGroupDropdown(true)}
                            onKeyDown={() => setCwsGroupDropdown(true)}
                          >
                            <div className="flex flex-wrap gap-1 mb-1">
                              {cwsSelectedGroups.map((g) => (
                                <span
                                  key={g}
                                  className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full"
                                >
                                  {g}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCwsSelectedGroups((prev) =>
                                        prev.filter((x) => x !== g),
                                      );
                                    }}
                                    className="hover:text-orange-600"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <input
                              data-ocid="cws.group_search_input"
                              type="text"
                              value={cwsGroupSearch}
                              onChange={(e) => {
                                setCwsGroupSearch(e.target.value);
                                setCwsGroupDropdown(true);
                              }}
                              onFocus={() => setCwsGroupDropdown(true)}
                              onBlur={() =>
                                setTimeout(
                                  () => setCwsGroupDropdown(false),
                                  200,
                                )
                              }
                              placeholder={
                                cwsSelectedGroups.length === 0
                                  ? "Search groups..."
                                  : ""
                              }
                              className="text-sm outline-none border-none p-0 w-full bg-transparent"
                            />
                          </div>
                          {cwsGroupDropdown && (
                            <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filteredGrps.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">
                                  No groups found
                                </div>
                              ) : (
                                filteredGrps.map((g) => (
                                  <button
                                    key={String(g.id)}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setCwsSelectedGroups((prev) => [
                                        ...prev,
                                        g.name,
                                      ]);
                                      setCwsGroupSearch("");
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 flex items-center gap-2"
                                  >
                                    <span className="w-3 h-3 border border-gray-400 rounded-sm flex-shrink-0" />
                                    <span className="font-medium">
                                      {g.name}
                                    </span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Active Filters Summary + Clear All */}
                  {(cwsSelectedCustomers.length > 0 ||
                    cwsSelectedCompanies.length > 0 ||
                    cwsSelectedMedicines.length > 0 ||
                    cwsSelectedGroups.length > 0) && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Filters active:{" "}
                        {[
                          cwsSelectedCustomers.length > 0 &&
                            `${cwsSelectedCustomers.length} customer(s)`,
                          cwsSelectedCompanies.length > 0 &&
                            `${cwsSelectedCompanies.length} company/ies`,
                          cwsSelectedMedicines.length > 0 &&
                            `${cwsSelectedMedicines.length} medicine(s)`,
                          cwsSelectedGroups.length > 0 &&
                            `${cwsSelectedGroups.length} group(s)`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                      <button
                        type="button"
                        data-ocid="cws.clear_filters_button"
                        onClick={() => {
                          setCwsSelectedCustomers([]);
                          setCwsSelectedCompanies([]);
                          setCwsSelectedMedicines([]);
                          setCwsSelectedGroups([]);
                          setCwsCustomerSearch2("");
                          setCwsCompanySearch("");
                          setCwsMedicineSearch("");
                          setCwsGroupSearch("");
                        }}
                        className="text-xs text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-300 px-2 py-1 rounded-md transition-colors"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Report Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5">
                    {(() => {
                      // Prepare data
                      const allOrdersForReport = [
                        ...ordersWithLines,
                        ...historyOrdersWithLines,
                      ].filter((o) => {
                        if (o.status !== "delivered") return false;
                        if (o.date < cwsDateFrom || o.date > cwsDateTo)
                          return false;
                        // Customer filter (multi-select)
                        if (cwsSelectedCustomers.length > 0) {
                          const match = cwsSelectedCustomers.some(
                            (c) =>
                              o.pharmacyName.toLowerCase() ===
                                c.name.toLowerCase() ||
                              (c.code && o.pharmacyCode === c.code),
                          );
                          if (!match) return false;
                        }
                        // Company filter
                        if (cwsSelectedCompanies.length > 0) {
                          const hasCompany = o.items.some((item: any) => {
                            const med = allMedicines.find(
                              (m) => String(m.backendId) === item.medicineId,
                            );
                            return (
                              med?.company &&
                              cwsSelectedCompanies.includes(med.company)
                            );
                          });
                          if (!hasCompany) return false;
                        }
                        // Medicine filter
                        if (cwsSelectedMedicines.length > 0) {
                          const hasMed = o.items.some((item: any) =>
                            cwsSelectedMedicines.includes(item.medicineName),
                          );
                          if (!hasMed) return false;
                        }
                        // Group filter
                        if (cwsSelectedGroups.length > 0) {
                          const hasGroup = o.items.some((item: any) => {
                            const med = allMedicines.find(
                              (m) => String(m.backendId) === item.medicineId,
                            );
                            const grp = allMedicineGroups.find(
                              (g) =>
                                med?.groupId &&
                                String(g.id) === String(med.groupId),
                            );
                            return grp && cwsSelectedGroups.includes(grp.name);
                          });
                          if (!hasGroup) return false;
                        }
                        return true;
                      });

                      // Build report rows from order lines
                      type ReportRow = {
                        groupKey: string;
                        groupHeader: string;
                        dealerCode?: string;
                        productCode: string;
                        productName: string;
                        packing: string;
                        itemRate: number;
                        grossSale: number;
                        salesReturn: number;
                        netSaleQty: number;
                        bonus: number;
                        amount: number;
                      };

                      const rows: ReportRow[] = [];
                      for (const order of allOrdersForReport) {
                        const returnMap = new Map<string, number>();
                        for (const ri of order.returnItems || []) {
                          returnMap.set(
                            String(ri.medicineId),
                            (returnMap.get(String(ri.medicineId)) || 0) +
                              Number(ri.returnedQty),
                          );
                        }
                        for (const item of order.items) {
                          // Item-level filter: skip items not matching selected medicines
                          if (
                            cwsSelectedMedicines.length > 0 &&
                            !cwsSelectedMedicines.includes(item.medicineName)
                          ) {
                            continue;
                          }
                          const med = allMedicines.find(
                            (m) => String(m.backendId) === item.medicineId,
                          );
                          // Item-level filter: skip items not matching selected companies
                          if (cwsSelectedCompanies.length > 0) {
                            if (
                              !med?.company ||
                              !cwsSelectedCompanies.includes(med.company)
                            )
                              continue;
                          }
                          // Item-level filter: skip items not matching selected groups
                          if (cwsSelectedGroups.length > 0) {
                            const grpCheck = allMedicineGroups.find(
                              (g) =>
                                med?.groupId &&
                                String(g.id) === String(med.groupId),
                            );
                            if (
                              !grpCheck ||
                              !cwsSelectedGroups.includes(grpCheck.name)
                            )
                              continue;
                          }
                          const itemRate =
                            (item as any).netRate > 0
                              ? (item as any).netRate
                              : item.unitPrice || 0;
                          const grossSale = item.qty || 0;
                          const salesReturn =
                            returnMap.get(item.medicineId) || 0;
                          const netSaleQty = Math.max(
                            0,
                            grossSale - salesReturn,
                          );
                          const bonus = item.bonusQty || 0;
                          const amount = netSaleQty * itemRate;

                          let groupKey = "";
                          let groupHeader = "";
                          let dealerCode = "";

                          {
                            const cust = allCustomers.find(
                              (c) =>
                                c.name.toLowerCase() ===
                                  order.pharmacyName.toLowerCase() ||
                                c.code === order.pharmacyCode,
                            );
                            groupKey = order.pharmacyName;
                            groupHeader = order.pharmacyName;
                            dealerCode = cust?.dealerCode || "";
                          }

                          rows.push({
                            groupKey,
                            groupHeader,
                            dealerCode,
                            productCode: med?.productCode || "-",
                            productName: item.medicineName,
                            packing: med?.packSize || "1",
                            itemRate,
                            grossSale,
                            salesReturn,
                            netSaleQty,
                            bonus,
                            amount,
                          });
                        }
                      }

                      // Group rows
                      const grouped = new Map<
                        string,
                        {
                          header: string;
                          dealerCode: string;
                          rows: ReportRow[];
                        }
                      >();
                      for (const row of rows) {
                        if (!grouped.has(row.groupKey)) {
                          grouped.set(row.groupKey, {
                            header: row.groupHeader,
                            dealerCode: row.dealerCode || "",
                            rows: [],
                          });
                        }
                        grouped.get(row.groupKey)!.rows.push(row);
                      }

                      const grandTotal = rows.reduce((s, r) => s + r.amount, 0);
                      const reportTitle = "Customer Wise Sale Report";

                      const fmtAmt = (n: number) =>
                        n.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });

                      function handlePrintCWSReport() {
                        const today = new Date().toLocaleDateString("en-PK", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                        let html = `
                          <html><head><style>
                            body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
                            h2 { text-align: center; font-size: 14px; margin: 0; }
                            h3 { text-align: center; font-size: 11px; margin: 4px 0; }
                            .subheader { text-align: center; font-size: 9px; margin-bottom: 8px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                            th { background: #eee; font-weight: bold; border: 1px solid #ccc; padding: 4px 6px; text-align: center; font-size: 9px; }
                            td { border: 1px solid #ddd; padding: 3px 6px; font-size: 9px; }
                            .group-header td { background: #d0e4f7; font-weight: bold; font-size: 10px; }
                            .total-row td { background: #f0f0f0; font-weight: bold; }
                            .grand-total td { background: #cce0ff; font-weight: bold; font-size: 11px; }
                            @media print { body { margin: 10px; } }
                          </style></head><body>
                          <h2>MIAN MEDICINE DISTRIBUTOR</h2>
                          <h3>${reportTitle}</h3>
                          <div class="subheader">From: ${cwsDateFrom} &nbsp;&nbsp; To: ${cwsDateTo} &nbsp;&nbsp; Print Date: ${today}</div>
                          <table>
                            <thead><tr>
                              <th>Product Code</th><th>Name of Product</th><th>Packing</th><th>Item Rate</th>
                              <th>Gross Sale</th><th>Sales Retru</th><th>Net Sale Qty</th><th>Bonus</th><th>Amount</th>
                            </tr></thead>
                            <tbody>`;

                        for (const [, grpData] of grouped) {
                          html += `<tr class="group-header"><td colspan="9">${grpData.dealerCode ? `Dealer Code # ${grpData.dealerCode} &nbsp; ` : ""}${grpData.header}</td></tr>`;
                          let grpTotal = 0;
                          for (const r of grpData.rows) {
                            grpTotal += r.amount;
                            html += `<tr>
                              <td>${r.productCode}</td>
                              <td>${r.productName}</td>
                              <td style="text-align:center">${r.packing}</td>
                              <td style="text-align:right">${r.itemRate.toFixed(2)}</td>
                              <td style="text-align:center">${r.grossSale}</td>
                              <td style="text-align:center">${r.salesReturn}</td>
                              <td style="text-align:center">${r.netSaleQty}</td>
                              <td style="text-align:center">${r.bonus}</td>
                              <td style="text-align:right">${fmtAmt(r.amount)}</td>
                            </tr>`;
                          }
                          html += `<tr class="total-row"><td colspan="8" style="text-align:right">Total of ${grpData.header}:</td><td style="text-align:right">${fmtAmt(grpTotal)}</td></tr>`;
                        }

                        html += `<tr class="grand-total"><td colspan="8" style="text-align:right">Grand Total:</td><td style="text-align:right">${fmtAmt(grandTotal)}</td></tr>`;
                        html += "</tbody></table></body></html>";

                        const w = window.open("", "_blank");
                        if (w) {
                          w.document.write(html);
                          w.document.close();
                          w.onload = () => w.print();
                        }
                      }

                      if (rows.length === 0) {
                        return (
                          <div
                            className="text-center py-16 text-gray-400"
                            data-ocid="cws.report_empty_state"
                          >
                            <svg
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              width="40"
                              height="40"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              className="mx-auto mb-3 opacity-30"
                            >
                              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                              <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
                              <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                            <p className="font-medium text-gray-500">
                              No delivered orders found in selected date range
                            </p>
                            <p className="text-xs mt-1">
                              Try adjusting the date range or customer filter
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {reportTitle}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {cwsDateFrom} to {cwsDateTo} · {rows.length}{" "}
                                line items · {grouped.size} groups
                              </p>
                            </div>
                            <button
                              type="button"
                              data-ocid="cws.download_pdf_button"
                              onClick={handlePrintCWSReport}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                            >
                              <svg
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect x="6" y="14" width="12" height="8" />
                              </svg>
                              Download PDF
                            </button>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm min-w-[900px]">
                              <thead>
                                <tr className="bg-gray-100 border-b border-gray-200">
                                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Product Code
                                  </th>
                                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Name of Product
                                  </th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Packing
                                  </th>
                                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Item Rate
                                  </th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Gross Sale
                                  </th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Sales Retru
                                  </th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Net Sale Qty
                                  </th>
                                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Bonus
                                  </th>
                                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from(grouped.entries()).map(
                                  ([gKey, grpData], gIdx) => {
                                    const grpTotal = grpData.rows.reduce(
                                      (s, r) => s + r.amount,
                                      0,
                                    );
                                    return (
                                      <React.Fragment key={gKey}>
                                        <tr
                                          className="bg-blue-50 border-y border-blue-200"
                                          data-ocid={`cws.group_header.${gIdx + 1}`}
                                        >
                                          <td
                                            colSpan={9}
                                            className="px-3 py-2 font-bold text-blue-900 text-xs"
                                          >
                                            {grpData.dealerCode && (
                                              <span className="mr-3 text-blue-600">
                                                Dealer Code #{" "}
                                                {grpData.dealerCode}
                                              </span>
                                            )}
                                            {grpData.header}
                                          </td>
                                        </tr>
                                        {grpData.rows.map((r, rIdx) => (
                                          <tr
                                            key={`${r.productName}-${r.productCode}-${rIdx}`}
                                            data-ocid={`cws.row.${gIdx + 1}.${rIdx + 1}`}
                                            className={
                                              rIdx % 2 === 0
                                                ? "bg-white"
                                                : "bg-gray-50/50"
                                            }
                                          >
                                            <td className="px-3 py-2 text-xs font-mono text-gray-500">
                                              {r.productCode}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-gray-900">
                                              {r.productName}
                                            </td>
                                            <td className="px-3 py-2 text-center text-gray-600">
                                              {r.packing}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-700">
                                              {r.itemRate.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-center text-gray-700">
                                              {r.grossSale}
                                            </td>
                                            <td className="px-3 py-2 text-center text-red-600">
                                              {r.salesReturn}
                                            </td>
                                            <td className="px-3 py-2 text-center font-semibold text-gray-800">
                                              {r.netSaleQty}
                                            </td>
                                            <td className="px-3 py-2 text-center text-emerald-600">
                                              {r.bonus}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-blue-700">
                                              {fmtAmt(r.amount)}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr className="bg-gray-100 border-y border-gray-300">
                                          <td
                                            colSpan={8}
                                            className="px-3 py-2 text-xs font-bold text-gray-700 text-right"
                                          >
                                            Total of {grpData.header}:
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-gray-900">
                                            {fmtAmt(grpTotal)}
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    );
                                  },
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="bg-blue-100 border-t-2 border-blue-300">
                                  <td
                                    colSpan={8}
                                    className="px-3 py-3 text-sm font-bold text-blue-900 text-right"
                                  >
                                    Grand Total:
                                  </td>
                                  <td className="px-3 py-3 text-right font-bold text-blue-900 text-base">
                                    {fmtAmt(grandTotal)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Group Management */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Medicine Groups | دوائی گروپس
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Create groups to organize medicines (e.g. Blue, Indigo,
                        Green)
                      </p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Add Group Form */}
                    <GroupManagementPanel
                      allMedicineGroups={allMedicineGroups}
                      actor={actor}
                      distributorId={(() => {
                        const s = getSession();
                        return s?.distributorId
                          ? BigInt(s.distributorId)
                          : BigInt(0);
                      })()}
                      onGroupsChanged={(groups) => setAllMedicineGroups(groups)}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Add Customer */}
            {activeView === "add-customer" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-heading">
                    Add Customer | کسٹمر شامل کریں
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Doctors, medical stores, and pharmacies manage karein
                  </p>
                </div>

                {/* Add Customer Form */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 font-heading mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-blue-600" />
                    New Customer | نیا کسٹمر
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label
                        htmlFor="cust-name"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Name | نام *
                      </label>
                      <input
                        id="cust-name"
                        type="text"
                        data-ocid="add_customer.name_input"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="e.g. Dr. Ahmed Ali / Al-Shifa Medical"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-type"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Type | قسم *
                      </label>
                      <select
                        id="cust-type"
                        data-ocid="add_customer.type_select"
                        value={custType}
                        onChange={(e) =>
                          setCustType(e.target.value as ExtendedCustomerType)
                        }
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      >
                        <option value={CustomerType.doctor}>
                          Doctor | ڈاکٹر
                        </option>
                        <option value={CustomerType.hospital}>
                          Hospital | ہسپتال
                        </option>
                        <option value={CustomerType.medicalStore}>
                          Medical Store | میڈیکل اسٹور
                        </option>
                        <option value={CustomerType.pharmacy}>
                          Pharmacy | فارمیسی
                        </option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="cust-contact"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Contact | رابطہ
                      </label>
                      <input
                        id="cust-contact"
                        type="text"
                        data-ocid="add_customer.contact_input"
                        value={custContact}
                        onChange={(e) => setCustContact(e.target.value)}
                        placeholder="e.g. 0300-1234567"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-area"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Area | علاقہ
                      </label>
                      <input
                        id="cust-area"
                        type="text"
                        data-ocid="add_customer.area_input"
                        value={custArea}
                        onChange={(e) => setCustArea(e.target.value)}
                        placeholder="e.g. MBD, Phalia"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-group"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Group | گروپ
                      </label>
                      <input
                        id="cust-group"
                        type="text"
                        data-ocid="add_customer.group_input"
                        value={custGroup}
                        onChange={(e) => setCustGroup(e.target.value)}
                        placeholder="e.g. Retail, Wholesale"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-code"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Code | کوڈ
                      </label>
                      <input
                        id="cust-code"
                        type="text"
                        data-ocid="add_customer.code_input"
                        value={custCode}
                        onChange={(e) => setCustCode(e.target.value)}
                        placeholder="e.g. CU-001"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-dealer-code"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Dealer Code | ڈیلر کوڈ
                      </label>
                      <input
                        id="cust-dealer-code"
                        type="text"
                        data-ocid="add_customer.dealer_code_input"
                        value={custDealerCode}
                        onChange={(e) => setCustDealerCode(e.target.value)}
                        placeholder="e.g. 002-0043"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label
                        htmlFor="cust-address"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        Address | پتہ
                      </label>
                      <input
                        id="cust-address"
                        type="text"
                        data-ocid="add_customer.address_input"
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        placeholder="e.g. Shop 5, Main Bazar"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-ntn"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        NTN#
                      </label>
                      <input
                        id="cust-ntn"
                        type="text"
                        data-ocid="add_customer.ntn_input"
                        value={custNTN}
                        onChange={(e) => setCustNTN(e.target.value)}
                        placeholder="e.g. 1234567-8"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-cnic"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        CNIC#
                      </label>
                      <input
                        id="cust-cnic"
                        type="text"
                        data-ocid="add_customer.cnic_input"
                        value={custCNIC}
                        onChange={(e) => setCustCNIC(e.target.value)}
                        placeholder="e.g. 12345-1234567-1"
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cust-pmdc"
                        className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide"
                      >
                        PMDC# (Doctors)
                      </label>
                      <input
                        id="cust-pmdc"
                        type="text"
                        data-ocid="add_customer.pmdc_input"
                        value={custPmdc}
                        onChange={(e) => setCustPmdc(e.target.value)}
                        placeholder="PMDC registration no."
                        disabled={isAddingCustomer}
                        className="w-full h-10 text-sm border border-gray-300 rounded-lg px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        data-ocid="add_customer.submit_button"
                        onClick={handleAddCustomer}
                        disabled={isAddingCustomer}
                        className="w-full h-10 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
                      >
                        {isAddingCustomer ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        {isAddingCustomer
                          ? "Adding..."
                          : "Add Customer | شامل کریں"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customers List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-900">
                      Customers List | کسٹمر لسٹ ({allCustomers.length})
                    </h3>
                  </div>
                  {allCustomers.length === 0 ? (
                    <div
                      className="text-center py-16 text-gray-400"
                      data-ocid="add_customer.empty_state"
                    >
                      <User size={36} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No customers yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {allCustomers.map((cust, idx) => (
                        <div
                          key={String(cust.id)}
                          data-ocid={`add_customer.item.${idx + 1}`}
                          className="px-5 py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900">
                              {cust.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {cust.area && <span>{cust.area}</span>}
                              {cust.code && (
                                <span className="ml-2">· {cust.code}</span>
                              )}
                              {cust.dealerCode && (
                                <span className="ml-2 text-blue-500">
                                  · DC: {cust.dealerCode}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {confirmDeleteCustomerId === cust.backendId ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-red-600 font-medium">
                                  Sure?
                                </span>
                                <button
                                  type="button"
                                  data-ocid={`add_customer.confirm_button.${idx + 1}`}
                                  onClick={() =>
                                    handleDeleteCustomer(cust.backendId)
                                  }
                                  disabled={
                                    deletingCustomerId === cust.backendId
                                  }
                                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50"
                                >
                                  {deletingCustomerId === cust.backendId ? (
                                    <Loader2
                                      size={10}
                                      className="animate-spin"
                                    />
                                  ) : null}
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  data-ocid={`add_customer.cancel_button.${idx + 1}`}
                                  onClick={() =>
                                    setConfirmDeleteCustomerId(null)
                                  }
                                  className="text-xs px-2 py-1 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50 transition-colors"
                                  disabled={
                                    deletingCustomerId === cust.backendId
                                  }
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                data-ocid={`add_customer.delete_button.${idx + 1}`}
                                onClick={() =>
                                  setConfirmDeleteCustomerId(cust.backendId)
                                }
                                className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded-lg transition-colors"
                                disabled={deletingCustomerId === cust.backendId}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Manage — same as staff ManageScreen */}
            {activeView === "manage" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-heading">
                    Manage | منظم
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Pharmacies aur medicines manage karein
                  </p>
                </div>
                <ManageScreen
                  pharmacies={allPharmacies.map((p) => {
                    const { address, area } = parseLocation(p.location);
                    return {
                      id: String(p.id),
                      backendId: p.id,
                      name: p.name,
                      address,
                      area,
                      contactNo: "",
                      lastOrderDate: null,
                      isVisited: false,
                      code: (p as any).code ?? "",
                    };
                  })}
                  medicines={allMedicines}
                  actor={actor}
                  allMedicineGroups={allMedicineGroups}
                  showPharmacies={true}
                  onDataReloaded={(newPharms, newMeds) => {
                    setAllPharmacies(
                      newPharms.map((p) => ({
                        id: p.backendId,
                        name: p.name,
                        location: `${p.address} | ${p.area}`,
                        code: p.code ?? "",
                      })),
                    );
                    setAllMedicines(newMeds);
                    // Also reload full data so pharmacy list is fresh everywhere
                    loadAllData();
                  }}
                  dispatch={() => {}}
                />
              </div>
            )}

            {/* User Management */}
            {activeView === "user-management" && <UserManagementPanel />}

            {/* Staff Locations */}
            {activeView === "staff-locations" && <StaffLocationsView />}

            {/* Estimated Billing */}
            {activeView === "estimated-billing" && (
              <EstimatedBillingScreen
                allMedicines={allMedicines}
                allPharmacies={allPharmacies}
                allOrders={orders}
                actor={actor}
                distributorId={(() => {
                  const s = getSession();
                  return s?.distributorId ? BigInt(s.distributorId) : null;
                })()}
              />
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
        </main>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          actor={actor}
          allMedicines={allMedicines}
          allPharmacies={allPharmacies}
          onOrderUpdated={() => {
            setSelectedOrder(null);
            loadAllData();
          }}
        />
      )}
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
  date: string;
  itemCount: number;
  totalAmount: number;
  status: OrderStatus;
  items: Array<{
    medicineId: string;
    medicineName: string;
    strength: string;
    qty: number;
    unitPrice: number;
    total: number;
    bonusQty: number;
    discountPercent: number;
    distributionDiscount: number;
    companyDiscount: number;
    netRate: number;
  }>;
  paymentReceived: number;
  returnItems: Array<{ medicineId: string; returnedQty: number }>;
  returnReason: string;
  pharmacyCode: string;
};

function DeliveryDashboard() {
  const fromOffice =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("from") === "office";
  const { actor, isFetching: isActorFetching } = useActor();
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [allOrders, setAllOrders] = useState<DeliveryOrder[]>([]);
  const [deliveredThisSession, setDeliveredThisSession] = useState<
    DeliveryOrder[]
  >([]);
  const [paymentsClearedAt, setPaymentsClearedAt] = useState<string | null>(
    () => {
      return localStorage.getItem("medorder_payments_cleared_at");
    },
  );
  const [isLoading, setIsLoading] = useState(true);
  const [markingId, setMarkingId] = useState<bigint | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [returnModalOrder, setReturnModalOrder] =
    useState<DeliveryOrder | null>(null);
  const [_returnToggles, setReturnToggles] = useState<Record<string, boolean>>(
    {},
  );
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<Record<string, string>>(
    {},
  );
  const [isSavingReturn, setIsSavingReturn] = useState(false);
  // Offline mode for delivery
  const [isDeliveryOffline, setIsDeliveryOffline] = useState(() => {
    try {
      return localStorage.getItem("medorder_delivery_offline") === "true";
    } catch {
      return false;
    }
  });
  // Offline deliveries queued
  const [offlineDeliveries, setOfflineDeliveries] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem("medorder_offline_deliveries");
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });
  // Pharmacy search for delivery
  const [pharmacySearch, setPharmacySearch] = useState("");

  // Location tracking for delivery
  const deliveryUsername = (() => {
    try {
      return getSession()?.username ?? "";
    } catch {
      return "";
    }
  })();
  const deliveryLocationKey = `medorder_location_asked_${deliveryUsername}`;
  const [locationAsked, setLocationAsked] = useState<string | null>(() => {
    try {
      return localStorage.getItem(deliveryLocationKey);
    } catch {
      return null;
    }
  });
  useLocationTracking(deliveryUsername, "delivery", locationAsked === "yes");

  function handleAllowDeliveryLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(deliveryLocationKey, "yes");
          localStorage.setItem(
            `medorder_location_${deliveryUsername}`,
            JSON.stringify({
              username: deliveryUsername,
              role: "delivery",
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              updatedAt: new Date().toISOString(),
            }),
          );
        } catch {
          /* ignore */
        }
        setLocationAsked("yes");
      },
      () => {
        try {
          localStorage.setItem(deliveryLocationKey, "denied");
        } catch {
          /* ignore */
        }
        setLocationAsked("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleToggleDeliveryOffline() {
    const next = !isDeliveryOffline;
    setIsDeliveryOffline(next);
    try {
      localStorage.setItem("medorder_delivery_offline", String(next));
    } catch {
      /* ignore */
    }
    if (!next && offlineDeliveries.length > 0) {
      toast.info(`${offlineDeliveries.length} deliveries pending sync`);
    }
  }

  const loadData = useCallback(async () => {
    if (!actor || isActorFetching) return;
    setIsLoading(true);
    const delivSess = getSession();
    const delivDistId = delivSess?.distributorId
      ? BigInt(delivSess.distributorId)
      : null;
    try {
      const [rawOrders, rawPharmacies, rawMedicines] = await Promise.all([
        delivDistId
          ? (actor as any)
              .getActiveOrdersByDistributor(delivDistId)
              .catch(() => actor.getActiveOrders().catch(() => [] as any[]))
          : actor.getActiveOrders().catch(async () => {
              const all = await actor
                .getAllStaffOrders()
                .catch(() => [] as any[]);
              const now = Date.now();
              const hrs48 = 48 * 60 * 60 * 1000;
              return all.filter((o: any) => {
                if (o.status !== "delivered") return true;
                const ts = Number(o.timestamp / BigInt(1_000_000));
                return now - ts < hrs48;
              });
            }),
        delivDistId
          ? (actor as any)
              .getPharmaciesByDistributor(delivDistId)
              .catch(() => actor.getPharmacies().catch(() => [] as any[]))
          : actor.getPharmacies().catch(() => [] as any[]),
        delivDistId
          ? (actor as any)
              .getMedicinesByDistributor(delivDistId)
              .catch(() => actor.getMedicines().catch(() => [] as any[]))
          : actor.getMedicines().catch(() => [] as any[]),
      ]);

      const pharmacyMap = new Map(
        (rawPharmacies as any[]).map((p) => [String(p.id), p]),
      );
      const medicineMap = new Map(
        (rawMedicines as any[]).map((m) => [String(m.id), m]),
      );

      const mapped: DeliveryOrder[] = (rawOrders as unknown as RawOrder[]).map(
        (rec) => {
          const pharm = pharmacyMap.get(String(rec.pharmacyId));
          const { address, area } = parseLocation(pharm?.location ?? "");
          const date = new Date(Number(rec.timestamp / BigInt(1_000_000)))
            .toISOString()
            .split("T")[0];
          const items = rec.orderLines.map((line: any) => {
            const med = medicineMap.get(String(line.medicineId));
            const unitPrice = med ? Number(med.price) : 0;
            const qty = Number(line.quantity);
            const rawDistDisc = Number(line.distributionDiscount ?? 0);
            const rawCompDisc = Number(line.companyDiscount ?? 0);
            const rawDiscPct = Number(line.discountPercent ?? 0);
            const effectiveDistDisc =
              rawDistDisc > 0 ? rawDistDisc : rawDiscPct;
            return {
              medicineId: String(line.medicineId),
              medicineName: med?.name ?? `Medicine #${line.medicineId}`,
              strength: (med as any)?.strength || "",
              qty,
              unitPrice,
              total: unitPrice * qty,
              bonusQty: Number(line.bonusQty ?? 0),
              discountPercent: rawDiscPct,
              distributionDiscount: effectiveDistDisc,
              companyDiscount: rawCompDisc,
              netRate: Number(line.netRate ?? 0),
            };
          });
          const itemCount = items.length;
          const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

          return {
            backendId: rec.id,
            orderId: `ORD-${rec.id}`,
            pharmacyName: pharm?.name ?? `Pharmacy #${rec.pharmacyId}`,
            pharmacyAddress: address,
            pharmacyArea: area,
            date,
            itemCount,
            totalAmount,
            status: mapBackendStatus(rec.status),
            items,
            paymentReceived: Number((rec as any).paymentReceived ?? 0),
            returnItems: ((rec as any).returnItems ?? []).map((ri: any) => ({
              medicineId: String(ri.medicineId),
              returnedQty: Number(ri.returnedQty),
            })),
            returnReason: (rec as any).returnReason ?? "",
            pharmacyCode: (rec as any).pharmacyCode ?? "",
          };
        },
      );

      setAllOrders(mapped); // all orders regardless of status
      // Cache for offline use
      try {
        localStorage.setItem(
          "medorder_cached_pharmacies",
          JSON.stringify(rawPharmacies),
        );
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(
          "medorder_cached_orders_active",
          JSON.stringify(mapped),
        );
      } catch {
        /* ignore */
      }
      const confirmed = mapped.filter((o) => o.status === "confirmed");
      confirmed.sort((a, b) => b.orderId.localeCompare(a.orderId));
      setPendingOrders(confirmed);

      // Auto midnight reset: if today's date differs from stored date, update clearedAt to midnight today
      const todayDateStr = new Date().toISOString().split("T")[0];
      const lastPaymentDay = localStorage.getItem("medorder_last_payment_day");
      if (lastPaymentDay !== todayDateStr) {
        // New day — auto reset: set paymentsClearedAt to midnight of today
        const midnight = new Date(`${todayDateStr}T00:00:00`).toISOString();
        localStorage.setItem("medorder_payments_cleared_at", midnight);
        localStorage.setItem("medorder_last_payment_day", todayDateStr);
        setPaymentsClearedAt(midnight);
      } else {
        // Re-sync cleared timestamp from localStorage in case office cleared it
        const latestCleared = localStorage.getItem(
          "medorder_payments_cleared_at",
        );
        setPaymentsClearedAt(latestCleared);
      }
      setBackendError(null);

      // Sync inventory stock to localStorage (protect against canister reset)
      actor
        .getInventoryStock()
        .then((stockArr) => {
          for (const [medId, qty] of stockArr) {
            const numQty = Number(qty);
            if (numQty > 0) {
              setStock(medId, numQty);
            }
            // If backend says 0 but localStorage has value, keep localStorage
          }
        })
        .catch(() => {});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setBackendError(msg);
      toast.error(`Backend error: ${msg}`);
      // Load cached data for offline use
      try {
        const cachedOrders = localStorage.getItem(
          "medorder_cached_orders_active",
        );
        if (cachedOrders) {
          const parsed = JSON.parse(cachedOrders) as DeliveryOrder[];
          setAllOrders(parsed);
          const confirmed = parsed.filter((o) => o.status === "confirmed");
          confirmed.sort((a, b) => b.orderId.localeCompare(a.orderId));
          setPendingOrders(confirmed);
        }
      } catch {
        /* ignore */
      }
    } finally {
      setIsLoading(false);
    }
  }, [actor, isActorFetching]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMarkDelivered(order: DeliveryOrder) {
    if (isDeliveryOffline) {
      // Save to offline queue
      const updated = [...offlineDeliveries, order.orderId];
      setOfflineDeliveries(updated);
      try {
        localStorage.setItem(
          "medorder_offline_deliveries",
          JSON.stringify(updated),
        );
      } catch {
        /* ignore */
      }
      setDeliveredThisSession((prev) => [
        { ...order, status: "delivered" as OrderStatus },
        ...prev,
      ]);
      setPendingOrders((prev) =>
        prev.filter((o) => o.backendId !== order.backendId),
      );
      toast.success(`${order.pharmacyName} — saved offline. Sync when online.`);
      return;
    }
    if (!actor) return;
    setMarkingId(order.backendId);
    try {
      // Save payment if entered before marking delivered
      const payment = Number(
        paymentAmount[order.orderId] ?? order.paymentReceived ?? 0,
      );
      if (payment > 0) {
        await (actor as any).updateOrderPaymentAndReturn(
          order.backendId,
          BigInt(Math.round(payment)),
          order.returnItems.map((ri) => ({
            medicineId: BigInt(ri.medicineId),
            returnedQty: BigInt(ri.returnedQty),
          })),
          order.returnReason,
          "",
        );
      }
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

  async function handleSaveReturn() {
    if (!actor || !returnModalOrder) return;
    const hasReturn = returnModalOrder.items.some(
      (item) => (returnQtys[item.medicineId] ?? 0) > 0,
    );
    if (!hasReturn) {
      toast.error("Kam az kam ek item return karein");
      return;
    }
    setIsSavingReturn(true);
    try {
      const returnedItems = returnModalOrder.items.filter(
        (item) => (returnQtys[item.medicineId] ?? 0) > 0,
      );
      const returnItems = returnedItems.map((item) => ({
        medicineId: BigInt(item.medicineId),
        returnedQty: BigInt(Math.round(returnQtys[item.medicineId] ?? 0)),
      }));
      const payment = Number(paymentAmount[returnModalOrder.orderId] ?? 0);
      await (actor as any).updateOrderPaymentAndReturn(
        returnModalOrder.backendId,
        BigInt(Math.round(payment)),
        returnItems,
        returnReason,
        "",
      );
      // Restore stock for returned items (localStorage)
      restoreStock(
        returnedItems.map((item) => ({
          backendId: BigInt(item.medicineId),
          qty: returnQtys[item.medicineId] ?? 0,
        })),
      );
      // Sync inventory restoration to backend (fire-and-forget)
      Promise.all(
        returnedItems.map((item) =>
          actor
            .adjustInventoryStock(
              BigInt(item.medicineId),
              BigInt(Math.round(returnQtys[item.medicineId] ?? 0)),
            )
            .catch(() => {}),
        ),
      );
      toast.success("Return aur payment save ho gaya!");
      setReturnModalOrder(null);
      setReturnToggles({});
      setReturnQtys({});
      setReturnReason("");
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSavingReturn(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <Toaster richColors position="top-center" />

      {/* Backend error banner */}
      {backendError && (
        <div className="flex items-center justify-between gap-3 bg-red-600 text-white px-4 py-2.5 text-sm">
          <span className="flex-1 min-w-0 truncate">
            Backend error — tap Retry to reload
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBackendError(null);
                loadData();
              }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold"
            >
              <RefreshCw size={12} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setBackendError(null)}
              className="w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors rounded-full"
              aria-label="Dismiss error"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

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
            {fromOffice && (
              <a
                href="/office"
                data-ocid="delivery.back_button"
                className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors rounded-lg mr-0.5"
                aria-label="Back to Office"
                title="Back to Office Dashboard"
              >
                <ChevronLeft size={18} />
              </a>
            )}
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Truck size={18} />
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading">
                {(() => {
                  const s = getSession();
                  return s?.displayName ?? "Delivery | ڈیلیوری";
                })()}
              </h1>
              <p className="text-white/70 text-xs">Delivery Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="delivery.offline_toggle"
              onClick={handleToggleDeliveryOffline}
              title={isDeliveryOffline ? "Switch online" : "Go offline"}
              className={`w-8 h-8 flex items-center justify-center transition-colors rounded-lg ${isDeliveryOffline ? "bg-amber-400 text-white" : "bg-white/15 hover:bg-white/25"}`}
            >
              {isDeliveryOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
            </button>
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
            <button
              type="button"
              onClick={() => {
                clearSession();
                window.location.href = "/delivery";
              }}
              className="w-8 h-8 flex items-center justify-center bg-red-400/80 hover:bg-red-400 transition-colors rounded-lg"
              aria-label="Logout"
              title="Logout"
              data-ocid="delivery.logout_button"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Location permission banner */}
      {!locationAsked && (
        <div
          className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2.5 text-sm"
          data-ocid="delivery.location_banner"
        >
          <MapPin size={15} className="shrink-0 opacity-80" />
          <span className="flex-1 text-xs">
            Share your location for tracking | اپنی جگہ شیئر کریں
          </span>
          <button
            type="button"
            data-ocid="delivery.location_allow_button"
            onClick={handleAllowDeliveryLocation}
            className="bg-white text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
          >
            Allow | اجازت
          </button>
          <button
            type="button"
            data-ocid="delivery.location_later_button"
            onClick={() => {
              try {
                localStorage.setItem(deliveryLocationKey, "later");
              } catch {
                /* ignore */
              }
              setLocationAsked("later");
            }}
            className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
          >
            Later | بعد میں
          </button>
        </div>
      )}

      <div className="max-w-sm mx-auto px-4 py-5 space-y-5">
        {/* Summary Stats Bar — always shown, persists until office clears */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const clearedAt = paymentsClearedAt
                ? new Date(paymentsClearedAt)
                : null;
              const ordersForSummary = allOrders.filter((o) => {
                if (!clearedAt) return true;
                return new Date(o.date) >= clearedAt;
              });
              const totalCollected = ordersForSummary.reduce((sum, order) => {
                const received = Number(
                  paymentAmount[order.orderId] ?? order.paymentReceived ?? 0,
                );
                return sum + received;
              }, 0);
              const totalReturnsValue = ordersForSummary.reduce(
                (sum, order) => {
                  if (!order.returnItems || order.returnItems.length === 0)
                    return sum;
                  const returnedValue = order.returnItems.reduce(
                    (
                      s: number,
                      ri: { medicineId: string; returnedQty: number },
                    ) => {
                      const it = order.items.find(
                        (i: {
                          medicineId: string;
                          qty: number;
                          total: number;
                        }) => i.medicineId === ri.medicineId,
                      );
                      if (!it || it.qty === 0) return s;
                      return s + (it.total / it.qty) * ri.returnedQty;
                    },
                    0,
                  );
                  return sum + returnedValue;
                },
                0,
              );
              const totalCredit = ordersForSummary.reduce((sum, order) => {
                const received = Number(
                  paymentAmount[order.orderId] ?? order.paymentReceived ?? 0,
                );
                const returnedValue =
                  order.returnItems && order.returnItems.length > 0
                    ? order.returnItems.reduce(
                        (
                          s: number,
                          ri: { medicineId: string; returnedQty: number },
                        ) => {
                          const it = order.items.find(
                            (i: {
                              medicineId: string;
                              qty: number;
                              total: number;
                            }) => i.medicineId === ri.medicineId,
                          );
                          if (!it || it.qty === 0) return s;
                          return s + (it.total / it.qty) * ri.returnedQty;
                        },
                        0,
                      )
                    : 0;
                const netPayable = order.totalAmount - returnedValue;
                const balance = netPayable - received;
                return sum + (balance > 0 ? balance : 0);
              }, 0);
              return (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mb-1">
                      Total Collected | کل وصول
                    </p>
                    <p className="text-lg font-bold text-emerald-700 font-heading">
                      {formatCurrency(totalCollected)}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">
                      Total Credit | کل باقی
                    </p>
                    <p className="text-lg font-bold text-red-700 font-heading">
                      {formatCurrency(totalCredit)}
                    </p>
                  </div>
                  {totalReturnsValue > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5">
                      <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide mb-1">
                        Total Returns | کل واپسی
                      </p>
                      <p className="text-lg font-bold text-orange-700 font-heading">
                        {formatCurrency(totalReturnsValue)}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Pharmacy Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            value={pharmacySearch}
            onChange={(e) => setPharmacySearch(e.target.value)}
            placeholder="Search pharmacy... | فارمیسی تلاش کریں"
            className="w-full pl-9 pr-9 h-10 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
            data-ocid="delivery.pharmacy_search_input"
          />
          {pharmacySearch && (
            <button
              type="button"
              onClick={() => setPharmacySearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Pending Deliveries */}
        <div>
          <h2 className="font-bold text-gray-800 font-heading mb-3 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Pending Deliveries | زیر التواء ڈیلیوری
            {!isLoading && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                {pharmacySearch.trim()
                  ? `${pendingOrders.filter((o) => o.pharmacyName.toLowerCase().includes(pharmacySearch.toLowerCase())).length}/${pendingOrders.length}`
                  : pendingOrders.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={28} />
            </div>
          ) : (
            (() => {
              const filteredPendingOrders = pharmacySearch.trim()
                ? pendingOrders.filter((o) =>
                    o.pharmacyName
                      .toLowerCase()
                      .includes(pharmacySearch.toLowerCase()),
                  )
                : pendingOrders;
              return filteredPendingOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  <Truck size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">
                    {pharmacySearch.trim()
                      ? "No matching pharmacies"
                      : "No pending deliveries"}
                  </p>
                  <p className="text-xs mt-1">
                    {pharmacySearch.trim()
                      ? "تلاش کا نتیجہ نہیں ملا"
                      : "تمام ڈیلیوریاں مکمل ہو گئی ہیں"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPendingOrders.map((order) => (
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
                      </div>
                      <div className="flex items-center justify-between text-sm mt-3">
                        <div className="text-gray-500">
                          <span className="font-medium text-gray-700">
                            {order.itemCount}
                          </span>{" "}
                          items ·{" "}
                          <span
                            className={`font-bold ${order.returnItems && order.returnItems.length > 0 ? "line-through text-gray-400" : "text-gray-900"}`}
                          >
                            {formatCurrency(order.totalAmount)}
                          </span>
                          {order.returnItems &&
                            order.returnItems.length > 0 &&
                            (() => {
                              const returnedValue = order.returnItems.reduce(
                                (
                                  s: number,
                                  ri: {
                                    medicineId: string;
                                    returnedQty: number;
                                  },
                                ) => {
                                  const it = order.items.find(
                                    (i) => i.medicineId === ri.medicineId,
                                  );
                                  if (!it || it.qty === 0) return s;
                                  return (
                                    s + (it.total / it.qty) * ri.returnedQty
                                  );
                                },
                                0,
                              );
                              const netAmount =
                                order.totalAmount - returnedValue;
                              return (
                                <span className="ml-1.5 font-bold text-orange-700">
                                  → {formatCurrency(netAmount)}{" "}
                                  <span className="text-xs font-normal">
                                    (returns minus)
                                  </span>
                                </span>
                              );
                            })()}
                        </div>
                      </div>

                      {/* Payment & Return Section */}
                      <div className="mt-3 space-y-2">
                        <div>
                          <label
                            htmlFor={`payment-${order.orderId}`}
                            className="text-xs text-gray-500 font-medium block mb-1"
                          >
                            Received | موصول (Rs)
                          </label>
                          <input
                            id={`payment-${order.orderId}`}
                            type="number"
                            min="0"
                            value={
                              paymentAmount[order.orderId] ??
                              (order.paymentReceived > 0
                                ? String(order.paymentReceived)
                                : "")
                            }
                            onChange={(e) =>
                              setPaymentAmount((prev) => ({
                                ...prev,
                                [order.orderId]: e.target.value,
                              }))
                            }
                            placeholder="0"
                            className="w-full h-9 text-sm border border-gray-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        {/* Balance display */}
                        {(() => {
                          const received = Number(
                            paymentAmount[order.orderId] ??
                              order.paymentReceived ??
                              0,
                          );
                          const returnedValue =
                            order.returnItems && order.returnItems.length > 0
                              ? order.returnItems.reduce(
                                  (
                                    s: number,
                                    ri: {
                                      medicineId: string;
                                      returnedQty: number;
                                    },
                                  ) => {
                                    const it = order.items.find(
                                      (i) => i.medicineId === ri.medicineId,
                                    );
                                    if (!it || it.qty === 0) return s;
                                    return (
                                      s + (it.total / it.qty) * ri.returnedQty
                                    );
                                  },
                                  0,
                                )
                              : 0;
                          const netPayable = order.totalAmount - returnedValue;
                          const balance = netPayable - received;
                          if (received === 0) return null;
                          return (
                            <div
                              className={`flex items-center justify-between text-sm px-3 py-1.5 rounded-lg ${balance > 0 ? "bg-red-50 text-red-700" : balance < 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600"}`}
                            >
                              <span className="font-medium">
                                Balance | باقی:
                              </span>
                              <span className="font-bold">
                                {formatCurrency(Math.abs(balance))}{" "}
                                {balance > 0
                                  ? "(baqi)"
                                  : balance < 0
                                    ? "(extra)"
                                    : "(full paid)"}
                              </span>
                            </div>
                          );
                        })()}
                        {/* Return items display if any */}
                        {order.returnItems && order.returnItems.length > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                            <p className="text-xs font-semibold text-orange-700 mb-1">
                              Returned Items | واپس کی گئی:
                            </p>
                            {order.items.map((item) => {
                              const isReturned = order.returnItems.some(
                                (r) => r.medicineId === item.medicineId,
                              );
                              return (
                                <div
                                  key={item.medicineId}
                                  className={`text-xs py-0.5 font-medium ${isReturned ? "text-red-600" : "text-emerald-600"}`}
                                >
                                  {isReturned ? "↩ " : "✓ "}
                                  {item.medicineName} x{(() => {
                                    const ri = order.returnItems.find(
                                      (r: {
                                        medicineId: string;
                                        returnedQty: number;
                                      }) => r.medicineId === item.medicineId,
                                    );
                                    return ri ? ri.returnedQty : item.qty;
                                  })()}
                                </div>
                              );
                            })}
                            {order.returnReason && (
                              <p className="text-xs text-orange-600 mt-1 italic">
                                Reason: {order.returnReason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Return button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReturnModalOrder(order);
                          const toggles: Record<string, boolean> = {};
                          for (const item of order.items) {
                            const isReturned = order.returnItems?.some(
                              (r) => r.medicineId === item.medicineId,
                            );
                            if (isReturned) toggles[item.medicineId] = true;
                          }
                          setReturnToggles(toggles);
                          setReturnReason(order.returnReason ?? "");
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-2 border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                      >
                        <X size={15} />
                        Return Items | واپسی
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReturnModalOrder(order);
                          const qtys: Record<string, number> = {};
                          for (const item of order.items) {
                            qtys[item.medicineId] = item.qty;
                          }
                          setReturnQtys(qtys);
                          setReturnReason("");
                        }}
                        className="mt-1 w-full flex items-center justify-center gap-2 border-2 border-red-400 text-red-600 hover:bg-red-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                      >
                        <X size={15} />
                        Return All Items | سب واپس کریں
                      </button>

                      {(() => {
                        const paymentEntered =
                          Number(
                            paymentAmount[order.orderId] ??
                              order.paymentReceived ??
                              0,
                          ) > 0;
                        return (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => handleMarkDelivered(order)}
                              disabled={
                                markingId === order.backendId || !paymentEntered
                              }
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {markingId === order.backendId ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              Mark Delivered | تحویل کریں
                            </button>
                            {!paymentEntered && (
                              <p className="text-xs text-amber-600 text-center mt-1 font-medium">
                                ⚠ Pehle payment enter karein | Please enter
                                payment first
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              );
            })()
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

      {/* Return Modal */}
      {returnModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setReturnModalOrder(null)}
          onKeyDown={(e) => e.key === "Escape" && setReturnModalOrder(null)}
          aria-label="Close modal backdrop"
        >
          <div
            className="bg-white w-full max-w-sm rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-gray-900">
                  Return Items | واپسی
                </h3>
                <p className="text-xs text-gray-500">
                  {returnModalOrder.pharmacyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs text-gray-500">
                Har item ke liye return quantity likhein | Enter return qty for
                each item:
              </p>
              {returnModalOrder.items.map((item) => {
                const returnQty = returnQtys[item.medicineId] ?? 0;
                const keptQty = item.qty - returnQty;
                const hasReturn = returnQty > 0;
                return (
                  <div
                    key={item.medicineId}
                    className={`p-3 rounded-xl border-2 transition-colors ${hasReturn ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p
                        className={`font-semibold text-sm ${hasReturn ? "text-red-700" : "text-gray-700"}`}
                      >
                        {item.medicineName}
                      </p>
                      <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border">
                        Order Qty: {item.qty}
                      </span>
                    </div>
                    {item.strength && (
                      <p className="text-xs text-gray-400 mb-2">
                        {item.strength}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label
                          htmlFor={`return-qty-${item.medicineId}`}
                          className="text-xs text-gray-500 mb-1 block"
                        >
                          Return Qty | واپسی
                        </label>
                        <input
                          id={`return-qty-${item.medicineId}`}
                          type="number"
                          min={0}
                          max={item.qty}
                          value={returnQty}
                          onChange={(e) => {
                            const val = Math.min(
                              Math.max(0, Number(e.target.value) || 0),
                              item.qty,
                            );
                            setReturnQtys((prev) => ({
                              ...prev,
                              [item.medicineId]: val,
                            }));
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setReturnQtys((prev) => ({
                              ...prev,
                              [item.medicineId]: item.qty,
                            }))
                          }
                          className="mt-1 w-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 py-1.5 transition-colors"
                        >
                          Return All | سب واپس
                        </button>
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 mb-1 block">
                          Kept Qty | رکھی گئی
                        </span>
                        <div
                          className={`w-full rounded-lg px-3 py-2 text-sm font-semibold ${keptQty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {keptQty}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div>
                <label
                  htmlFor="return-reason-textarea"
                  className="text-xs font-medium text-gray-600 block mb-1"
                >
                  Return Reason | واپسی کی وجہ
                </label>
                <textarea
                  id="return-reason-textarea"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Wajah likhein... (e.g. Expiry, Damaged, Wrong item)"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveReturn}
                disabled={isSavingReturn}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
              >
                {isSavingReturn ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Save Return | محفوظ کریں
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [backendError, setBackendError] = useState<string | null>(null);
  // Offline mode - reactive to network status
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  const [pendingOfflineOrders, setPendingOfflineOrders] = useState<Order[]>(
    () => {
      try {
        const stored = localStorage.getItem("medorder_offline_orders");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },
  );
  const [stockMap, setStockMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("medorder_stock_")) {
          const id = key.replace("medorder_stock_", "");
          const val = localStorage.getItem(key);
          if (val !== null && val !== "") map[id] = Number(val);
        }
      }
    } catch {
      /* ignore */
    }
    return map;
  });

  const { actor, isFetching: isActorFetching } = useActor();

  // Sync offline orders when coming back online
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - only re-run on online/actor change
  useEffect(() => {
    if (isOfflineMode || pendingOfflineOrders.length === 0 || !actor) return;
    const pending = [...pendingOfflineOrders];
    const syncOrders = async () => {
      const remaining: Order[] = [];
      for (const order of pending) {
        try {
          const sess = getSession();
          const distributorId = sess?.distributorId
            ? BigInt(sess.distributorId)
            : BigInt(0);
          const backendItems = order.items.map((it) => ({
            medicineId: it.medicineId,
            medicineName: it.medicineName,
            quantity: it.qty,
            bonusQty: it.bonusQty ?? 0,
            distDiscount: it.distributionDiscount ?? 0,
            coDiscount: it.companyDiscount ?? 0,
            netRate: it.manualNetRate ?? 0,
            amount: it.total,
          }));
          await (actor as any).createOrder(
            distributorId,
            order.pharmacyId,
            order.pharmacyName,
            order.pharmacyArea ?? "",
            order.staffId,
            order.staffName,
            backendItems,
            order.notes ?? "",
            order.totalAmount,
          );
          // success — don't add to remaining
        } catch {
          remaining.push(order); // keep for next retry
        }
      }
      setPendingOfflineOrders(remaining);
      try {
        localStorage.setItem(
          "medorder_offline_orders",
          JSON.stringify(remaining),
        );
      } catch {
        /* ignore */
      }
      if (remaining.length < pending.length) {
        const synced = pending.length - remaining.length;
        toast.success(`${synced} offline order(s) synced successfully!`);
      }
    };
    syncOrders();
  }, [isOfflineMode, actor]);

  // ── Session persistence: restore login on page load ───────────────────
  useEffect(() => {
    const session = getSession();
    if (!session) return;
    // Only restore staff sessions (admin/delivery have their own pages)
    if (session.role === "staff") {
      dispatch({
        type: "LOGIN",
        staff: { id: session.username, name: session.displayName, area: "" },
        role: session.role,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // Load both active (48hr) and history (1yr) orders in parallel
        const staffSess = getSession();
        const staffLoadDistId = staffSess?.distributorId
          ? BigInt(staffSess.distributorId)
          : null;
        const [activeRecords, historyRecords] = await Promise.all([
          staffLoadDistId
            ? (actorInstance as any)
                .getActiveOrdersByDistributor(staffLoadDistId)
                .catch(() =>
                  actorInstance.getActiveOrders().catch(() => [] as any[]),
                )
            : actorInstance.getActiveOrders().catch(async () => {
                const all = await actorInstance
                  .getAllStaffOrders()
                  .catch(() => [] as any[]);
                const now = Date.now();
                const hrs48 = 48 * 60 * 60 * 1000;
                return all.filter((o: any) => {
                  if (o.status !== "delivered") return true;
                  const ts = Number(o.timestamp / BigInt(1_000_000));
                  return now - ts < hrs48;
                });
              }),
          staffLoadDistId
            ? (actorInstance as any)
                .getHistoryOrdersByDistributor(staffLoadDistId)
                .catch(() =>
                  actorInstance.getHistoryOrders().catch(() => [] as any[]),
                )
            : actorInstance.getHistoryOrders().catch(async () => {
                const all = await actorInstance
                  .getAllStaffOrders()
                  .catch(() => [] as any[]);
                const now = Date.now();
                const hrs48 = 48 * 60 * 60 * 1000;
                const yr1 = 365 * 24 * 60 * 60 * 1000;
                return all.filter((o: any) => {
                  if (o.status !== "delivered") return false;
                  const ts = Number(o.timestamp / BigInt(1_000_000));
                  const age = now - ts;
                  return age >= hrs48 && age < yr1;
                });
              }),
        ]);
        const allRecords = [...activeRecords, ...historyRecords];

        const orders: Order[] = allRecords.map((rec) => {
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
            const rawDistDisc = Number(
              (line as unknown as { distributionDiscount?: bigint })
                .distributionDiscount ?? 0,
            );
            const rawCompDisc = Number(
              (line as unknown as { companyDiscount?: bigint })
                .companyDiscount ?? 0,
            );
            const rawDiscPct = Number(
              (line as unknown as { discountPercent?: bigint })
                .discountPercent ?? 0,
            );
            return {
              medicineId: String(line.medicineId),
              medicineName: med?.name ?? `Medicine #${line.medicineId}`,
              company: med?.company ?? "",
              strength: med?.strength ?? "",
              qty,
              unitPrice,
              total: unitPrice * qty,
              bonusQty: Number(
                (line as unknown as { bonusQty?: bigint }).bonusQty ?? 0,
              ),
              discountPercent: rawDiscPct,
              distributionDiscount: rawDistDisc > 0 ? rawDistDisc : rawDiscPct,
              companyDiscount: rawCompDisc,
              manualNetRate: undefined,
            };
          });

          const totalAmount = items.reduce((s, i) => s + i.total, 0);
          // Use staffName/staffCode from backend record if available
          const recExt = rec as unknown as {
            staffName?: string;
            staffCode?: string;
          } & typeof rec;

          return {
            id: `ORD-${rec.id}`,
            backendId: rec.id,
            pharmacyId: pharmacy?.id ?? String(rec.pharmacyId),
            pharmacyName: pharmacy?.name ?? `Pharmacy #${rec.pharmacyId}`,
            pharmacyArea: pharmacy?.area ?? "",
            staffId: recExt.staffCode || staffId,
            staffName: recExt.staffName || staffName,
            date,
            items,
            notes: "",
            status: mapBackendStatus(rec.status),
            totalAmount,
            paymentReceived: Number((rec as any).paymentReceived ?? 0),
            returnItems: ((rec as any).returnItems ?? []).map((ri: any) => ({
              medicineId: String(ri.medicineId),
              returnedQty: Number(ri.returnedQty),
            })),
            returnReason: (rec as any).returnReason ?? "",
            pharmacyCode: (rec as any).pharmacyCode ?? "",
          };
        });

        // Filter orders for staff role: bookers only see their own orders
        const session = getSession();
        const filteredOrders =
          session?.role === "staff"
            ? orders.filter(
                (o) =>
                  o.staffId === staffId ||
                  o.staffName === staffName ||
                  o.staffId === session.username ||
                  !o.staffId ||
                  o.staffId === "",
              )
            : orders;

        // Sort newest first
        filteredOrders.sort((a, b) => b.id.localeCompare(a.id));
        dispatch({ type: "SET_ORDERS", orders: filteredOrders });
        // Cache orders for offline use
        try {
          localStorage.setItem(
            "medorder_cached_orders_active",
            JSON.stringify(filteredOrders),
          );
        } catch {
          /* ignore */
        }
        setBackendError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setBackendError(msg);
        toast.error(`Backend error: ${msg}`);
        // Load cached orders for offline use
        try {
          const cachedOrders = localStorage.getItem(
            "medorder_cached_orders_active",
          );
          if (cachedOrders)
            dispatch({ type: "SET_ORDERS", orders: JSON.parse(cachedOrders) });
        } catch {
          /* ignore */
        }
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
        const staffInitSess = getSession();
        const staffInitDistId = staffInitSess?.distributorId
          ? BigInt(staffInitSess.distributorId)
          : null;
        const [backendPharmacies, backendMedicines] = await Promise.all([
          staffInitDistId
            ? (actor as any)
                .getPharmaciesByDistributor(staffInitDistId)
                .catch(() => actor.getPharmacies().catch(() => [] as any[]))
            : actor.getPharmacies().catch(() => [] as any[]),
          staffInitDistId
            ? (actor as any)
                .getMedicinesByDistributor(staffInitDistId)
                .catch(() => actor.getMedicines().catch(() => [] as any[]))
            : actor.getMedicines().catch(() => [] as any[]),
        ]);

        let pharmacyList: Pharmacy[];
        let medicineList: Medicine[];

        // ── Pharmacies ──
        if (backendPharmacies.length === 0) {
          // Seed backend (ignore errors -- canister may not support addPharmacy yet)
          await Promise.all(
            PHARMACY_SEEDS.map((s) =>
              actor
                .addPharmacy(s.name, s.contact, s.location, "", "", "")
                .catch(() => null),
            ),
          ).catch(() => {});
          // Reload after seeding
          const reloaded = await actor.getPharmacies().catch(() => [] as any[]);
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
              code: p.code || "",
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
              code: p.code || "",
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
                "",
                "",
                categoryToTypeLabel(s.category),
                "",
                BigInt(0),
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
              genericName: m.genericName || "",
              batchNo: m.batchNo || "",
              medicineType: m.medicineType || "",
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
              genericName: m.genericName || "",
              batchNo: m.batchNo || "",
              medicineType: m.medicineType || "",
            };
          });
        }

        setPharmacies(pharmacyList);
        setMedicines(medicineList);
        // Cache for offline use
        try {
          localStorage.setItem(
            "medorder_cached_pharmacies",
            JSON.stringify(pharmacyList),
          );
        } catch {
          /* ignore */
        }
        try {
          localStorage.setItem(
            "medorder_cached_medicines",
            JSON.stringify(medicineList),
          );
        } catch {
          /* ignore */
        }
        setBackendError(null);

        // Sync inventory stock from backend
        // If backend returns data, merge with localStorage (don't wipe localStorage if backend is empty/zero)
        actor
          .getInventoryStock()
          .then((stockArr) => {
            // Build localStorage map first as fallback
            const localMap: Record<string, number> = {};
            try {
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("medorder_stock_")) {
                  const id = key.replace("medorder_stock_", "");
                  const val = localStorage.getItem(key);
                  if (val !== null && val !== "") localMap[id] = Number(val);
                }
              }
            } catch {
              /* ignore */
            }

            const backendMap: Record<string, number> = {};
            for (const [medId, qty] of stockArr) {
              backendMap[String(medId)] = Number(qty);
            }

            // Merge: backend value wins IF it is > 0; otherwise keep localStorage value
            // This prevents canister-stop/reset from wiping all stock display
            const mergedMap: Record<string, number> = { ...localMap };
            for (const [id, qty] of Object.entries(backendMap)) {
              if (qty > 0) {
                mergedMap[id] = qty;
              } else if (!(id in localMap)) {
                mergedMap[id] = qty; // backend says 0 and no local fallback
              }
              // if backend says 0 but local has > 0, keep local (canister may be stale)
            }

            // Update localStorage with merged values
            try {
              for (const [id, qty] of Object.entries(mergedMap)) {
                localStorage.setItem(`medorder_stock_${id}`, String(qty));
              }
            } catch {
              /* ignore */
            }

            setStockMap({ ...mergedMap });
          })
          .catch(() => {
            // Backend failed -- use localStorage as fallback
            const localMap: Record<string, number> = {};
            try {
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith("medorder_stock_")) {
                  const id = key.replace("medorder_stock_", "");
                  const val = localStorage.getItem(key);
                  if (val !== null && val !== "") localMap[id] = Number(val);
                }
              }
            } catch {
              /* ignore */
            }
            if (Object.keys(localMap).length > 0) setStockMap({ ...localMap });
          });

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
        setBackendError(msg);
        toast.error(`Failed to load data: ${msg}`);
        // Load cached data for offline use
        try {
          const cachedPharma = localStorage.getItem(
            "medorder_cached_pharmacies",
          );
          const cachedMeds = localStorage.getItem("medorder_cached_medicines");
          const cachedOrders = localStorage.getItem(
            "medorder_cached_orders_active",
          );
          if (cachedPharma) setPharmacies(JSON.parse(cachedPharma));
          if (cachedMeds) setMedicines(JSON.parse(cachedMeds));
          if (cachedOrders)
            dispatch({
              type: "SET_ORDERS",
              orders: JSON.parse(cachedOrders),
            });
        } catch {
          /* ignore */
        }
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
    const todayStr = new Date().toISOString().split("T")[0];
    const visitedIds = new Set(
      state.orders.filter((o) => o.date === todayStr).map((o) => o.pharmacyId),
    );
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
        return (
          <LoginScreen
            dispatch={dispatch}
            onRoleLogin={(role, username, displayName, distributorId) => {
              if (role === "admin") {
                setSession({ username, role, displayName, distributorId });
                window.location.href = "/office";
                return;
              }
              if (role === "delivery") {
                setSession({ username, role, displayName });
                window.location.href = "/delivery";
                return;
              }
              dispatch({
                type: "LOGIN",
                staff: { id: username, name: displayName, area: "" },
                role,
              });
            }}
          />
        );
      case "dashboard":
        return (
          <DashboardScreen
            state={state}
            dispatch={dispatch}
            pharmacies={pharmacies}
            isLoadingData={isLoadingData}
            onRefreshOrders={handleRefreshOrders}
            onOpenMenu={() => setSideMenuOpen(true)}
            actor={actor}
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
            isOfflineMode={isOfflineMode}
            stockMap={stockMap}
            onSaveOfflineOrder={(order) => {
              const updated = [...pendingOfflineOrders, order];
              setPendingOfflineOrders(updated);
              try {
                localStorage.setItem(
                  "medorder_offline_orders",
                  JSON.stringify(updated),
                );
              } catch {
                /* ignore */
              }
            }}
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
            showPharmacies={false}
            readOnly={true}
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
      {/* Backend error banner */}
      {backendError && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-red-600 text-white px-4 py-2.5 text-sm shadow-lg">
          <span className="flex-1 min-w-0 truncate">
            Backend error — tap Retry to reload
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBackendError(null);
                handleRefreshOrders();
              }}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold"
            >
              <RefreshCw size={12} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setBackendError(null)}
              className="w-6 h-6 flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors rounded-full"
              aria-label="Dismiss error"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
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
                MedFlow — Test View
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

// ─── Auth Guard: wraps OfficeDashboard with login requirement ────────────────

function OfficeAuthGuard() {
  const session = getSession();
  const [authed, setAuthed] = useState<boolean>(
    () => session?.role === "admin",
  );

  if (!authed) {
    return (
      <LoginScreen
        dispatch={() => {}}
        onRoleLogin={(role, _username, _displayName) => {
          if (role === "admin") {
            setAuthed(true);
          } else if (role === "staff") {
            window.location.href = "/";
          } else if (role === "delivery") {
            window.location.href = "/delivery";
          }
        }}
      />
    );
  }

  return <OfficeDashboard />;
}

// ─── Auth Guard: wraps DeliveryDashboard with login requirement ──────────────

function DeliveryAuthGuard() {
  const session = getSession();
  const [authed, setAuthed] = useState<boolean>(
    () => session?.role === "delivery",
  );

  if (!authed) {
    return (
      <LoginScreen
        dispatch={() => {}}
        onRoleLogin={(role, _username, _displayName) => {
          if (role === "delivery") {
            setAuthed(true);
          } else if (role === "staff") {
            window.location.href = "/";
          } else if (role === "admin") {
            window.location.href = "/office";
          }
        }}
      />
    );
  }

  return <DeliveryDashboard />;
}

// ─── Auth Guard: wraps SuperAdminDashboard ───────────────────────────────────

function SuperAdminAuthGuard() {
  const session = (() => {
    try {
      const s = localStorage.getItem("medorder_session");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();
  const [authed, setAuthed] = useState<boolean>(
    () => session?.role === "superadmin",
  );

  if (!authed) {
    return (
      <LoginScreen
        dispatch={() => {}}
        onRoleLogin={(role) => {
          if (role === "superadmin") setAuthed(true);
          else if (role === "admin") window.location.href = "/office";
          else if (role === "delivery") window.location.href = "/delivery";
          else window.location.href = "/";
        }}
      />
    );
  }
  return <SuperAdminDashboard />;
}

// ─── App Root (URL Router) ────────────────────────────────────────────────────

export default function App() {
  const pathname = window.location.pathname;
  if (pathname === "/office")
    return (
      <>
        <Toaster richColors position="top-center" />
        <OfficeAuthGuard />
      </>
    );
  if (pathname === "/delivery")
    return (
      <>
        <Toaster richColors position="top-center" />
        <DeliveryAuthGuard />
      </>
    );
  if (pathname === "/superadmin")
    return (
      <>
        <Toaster richColors position="top-center" />
        <SuperAdminAuthGuard />
      </>
    );
  if (pathname === "/test") return <TestView />;
  return <MobileApp />;
}
