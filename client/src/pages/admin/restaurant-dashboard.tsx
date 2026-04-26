import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import atdmLogo from "@assets/ATDM_NOBG_1777187399026.png";
import {
  LayoutDashboard,
  UtensilsCrossed,
  LayoutGrid,
  Sparkles,
  Images,
  Tag,
  Users,
  CalendarCheck,
  Share2,
  Monitor,
  Info,
  CreditCard,
  ImageIcon,
  Bell,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Leaf,
  Star,
  Download,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Phone,
  Mail,
  Globe,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  Upload,
  Link,
  TrendingUp,
  Activity,
  Zap,
  Award,
  List,
  AlertCircle,
  CheckCircle2,
  FileDown,
  FileUp,
  SkipForward,
  ArrowUpDown,
  Filter,
  Check,
  CheckCheck,
} from "lucide-react";

// ─── API base ─────────────────────────────────────────────────────────────────
const api = (restaurantId: string, path: string) =>
  `/api/restaurant-db/${restaurantId}/${path}`;

async function uploadImageToCloudinary(
  rid: string,
  file: File,
): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const token = localStorage.getItem("adminToken");
  const res = await fetch(`/api/restaurant-db/${rid}/upload-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.url as string;
}

function ImageUploadButton({
  rid,
  onUploaded,
  size = "default",
  testId = "button-upload-image",
}: {
  rid: string;
  onUploaded: (url: string) => void;
  size?: "sm" | "default";
  testId?: string;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Too large", description: "Image must be under 10MB", variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      const url = await uploadImageToCloudinary(rid, file);
      onUploaded(url);
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handle}
        data-testid={`file-${testId}`}
      />
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        className={size === "sm" ? "h-7 px-2 text-xs rounded-lg flex-shrink-0" : ""}
        onClick={() => ref.current?.click()}
        disabled={uploading}
        data-testid={testId}
      >
        {uploading ? "Uploading…" : "Upload"}
      </Button>
    </>
  );
}

// ─── Sidebar config with per-section accent colors ───────────────────────────
const SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    color: "#6366f1",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
  },
  {
    id: "menu-items",
    label: "Menu Items",
    icon: UtensilsCrossed,
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  {
    id: "categories",
    label: "Categories",
    icon: LayoutGrid,
    color: "#10b981",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  {
    id: "smart-picks",
    label: "Smart Picks",
    icon: Sparkles,
    color: "#8b5cf6",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
  },
  {
    id: "carousel",
    label: "Carousel",
    icon: Images,
    color: "#ec4899",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
  },
  {
    id: "coupons",
    label: "Coupons",
    icon: Tag,
    color: "#ef4444",
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    color: "#3b82f6",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  {
    id: "reservations",
    label: "Reservations",
    icon: CalendarCheck,
    color: "#06b6d4",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
  },
  {
    id: "social-links",
    label: "Social Links",
    icon: Share2,
    color: "#a855f7",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  {
    id: "welcome-screen",
    label: "Welcome Screen",
    icon: Monitor,
    color: "#14b8a6",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
  },
  {
    id: "payment",
    label: "Payment Settings",
    icon: CreditCard,
    color: "#22c55e",
    bg: "bg-green-500/10",
    text: "text-green-400",
  },
  {
    id: "logo",
    label: "Logo",
    icon: ImageIcon,
    color: "#f43f5e",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
  },
  {
    id: "call-waiter",
    label: "Call Waiter",
    icon: Bell,
    color: "#0ea5e9",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
] as const;

const SECTION_IMAGES: Record<string, string> = {
  overview: "/sidebar-logos/overview.png",
  "menu-items": "/sidebar-logos/menu-items.png",
  categories: "/sidebar-logos/categories.png",
  "smart-picks": "/sidebar-logos/smart-picks.png",
  carousel: "/sidebar-logos/carousel.png",
  coupons: "/sidebar-logos/coupons.png",
  customers: "/sidebar-logos/customers.png",
  reservations: "/sidebar-logos/reservations.png",
  "social-links": "/sidebar-logos/social-links.png",
  "welcome-screen": "/sidebar-logos/welcome-screen.png",
  payment: "/sidebar-logos/payment.png",
  logo: "/sidebar-logos/logo.png",
  "call-waiter": "/sidebar-logos/call-waiter.png",
  notifications: "/sidebar-logos/notifications.png",
};

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Shared helpers ───────────────────────────────────────────────────────────
function LoadRow() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          <Skeleton className="h-5 w-2/3 mb-2 bg-gray-100" />
          <Skeleton className="h-4 w-1/3 bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function SectionTitle({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mb-7">
      <h2 className="text-2xl font-bold text-gray-900">{children}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function VegBadge({ isVeg }: { isVeg: boolean }) {
  return isVeg ? (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">
      <Leaf className="w-3 h-3 mr-1" />
      Veg
    </Badge>
  ) : (
    <Badge className="bg-red-50 text-red-600 border-red-200 text-xs font-medium">
      Non-Veg
    </Badge>
  );
}

function formatCategory(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]).filter(
    (k) => k !== "_id" && !k.startsWith("_"),
  );
  const csv = [
    keys.join(","),
    ...data.map((row) =>
      keys.map((k) => JSON.stringify(row[k] ?? "")).join(","),
    ),
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  borderColor,
  isLoading,
}: {
  label: string;
  value: any;
  icon: any;
  gradient: string;
  borderColor: string;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`relative bg-white rounded-2xl p-5 shadow-sm border-l-4 ${borderColor} overflow-hidden group hover:shadow-md transition-all duration-300`}
    >
      <div
        className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`}
      />
      <div className="flex items-start justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-16 mb-2 bg-gray-100" />
          ) : (
            <p className="text-3xl font-black text-gray-900 tabular-nums">
              {value ?? "—"}
            </p>
          )}
          <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${gradient} opacity-90`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Section: Overview ────────────────────────────────────────────────────────
function OverviewSection({ rid }: { rid: string }) {
  const { data, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: [api(rid, "overview")],
    queryFn: () => apiRequest(api(rid, "overview")),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: [api(rid, "menu-items"), "overview"],
    queryFn: () => apiRequest(api(rid, "menu-items")),
  });

  const { data: reservations = [] } = useQuery<any[]>({
    queryKey: [api(rid, "reservations"), "overview"],
    queryFn: () => apiRequest(api(rid, "reservations")),
  });

  const { data: customersData } = useQuery<any>({
    queryKey: [api(rid, "customers"), "overview"],
    queryFn: () => apiRequest(`${api(rid, "customers")}?limit=100`),
  });

  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: [api(rid, "coupons"), "overview"],
    queryFn: () => apiRequest(api(rid, "coupons")),
  });

  const customers: any[] = customersData?.customers || [];

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  const stats = [
    {
      label: "Menu Items",
      value: data?.totalMenuItems ?? 0,
      icon: UtensilsCrossed,
      accent: "text-amber-600",
      bg: "bg-amber-50",
      bar: "bg-amber-500",
    },
    {
      label: "Categories",
      value: data?.menuCategories ?? 0,
      icon: LayoutGrid,
      accent: "text-violet-600",
      bg: "bg-violet-50",
      bar: "bg-violet-500",
    },
    {
      label: "Customers",
      value: data?.customers ?? 0,
      icon: Users,
      accent: "text-sky-600",
      bg: "bg-sky-50",
      bar: "bg-sky-500",
    },
    {
      label: "Reservations",
      value: data?.reservations ?? 0,
      icon: CalendarCheck,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
      bar: "bg-emerald-500",
    },
    {
      label: "Active Coupons",
      value: data?.activeCoupons ?? 0,
      icon: Tag,
      accent: "text-rose-600",
      bg: "bg-rose-50",
      bar: "bg-rose-500",
    },
    {
      label: "UI Sections",
      value: data?.topLevelCategories ?? 0,
      icon: LayoutDashboard,
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
      bar: "bg-indigo-500",
    },
  ];

  // ── Items per category (real) ──────────────────────────────────────────────
  const itemsPerCategoryAll = useMemo(() => {
    const map = new Map<string, number>();
    menuItems.forEach((item) => {
      const cat = item._collection || item.category || "Other";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, items]) => ({
        name: formatCategory(name),
        items,
      }))
      .sort((a, b) => b.items - a.items);
  }, [menuItems]);

  const itemsPerCategory = itemsPerCategoryAll;

  // ── Veg / Non-Veg distribution ─────────────────────────────────────────────
  const vegDistribution = useMemo(() => {
    let veg = 0;
    let nonVeg = 0;
    menuItems.forEach((item) => {
      if (item.isVeg) veg++;
      else nonVeg++;
    });
    return [
      { name: "Vegetarian", value: veg, color: "#10b981" },
      { name: "Non-Vegetarian", value: nonVeg, color: "#ef4444" },
    ];
  }, [menuItems]);

  // Parse first numeric token from a price field.
  // Handles plain numbers ("299"), strings with currency/whitespace ("₹299"),
  // and split prices like "45 | 76" or "299 / 599" by taking the FIRST value.
  const parsePrice = (raw: any): number | null => {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    const m = String(raw).match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? n : null;
  };

  // ── Price summary ──────────────────────────────────────────────────────────
  const priceStats = useMemo(() => {
    const prices = menuItems
      .map((i) => parsePrice(i.price))
      .filter((n): n is number => n !== null && n > 0);

    if (prices.length === 0)
      return { avg: 0, min: 0, max: 0, count: 0 };

    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round(sum / prices.length),
      min: Math.min(...prices),
      max: Math.max(...prices),
      count: prices.length,
    };
  }, [menuItems]);

  // ── Price ranges (bar) ─────────────────────────────────────────────────────
  const priceRanges = useMemo(() => {
    const buckets = [
      { name: "₹0–100", min: 0, max: 100, count: 0 },
      { name: "₹100–250", min: 100, max: 250, count: 0 },
      { name: "₹250–500", min: 250, max: 500, count: 0 },
      { name: "₹500–1000", min: 500, max: 1000, count: 0 },
      { name: "₹1000+", min: 1000, max: Infinity, count: 0 },
    ];
    menuItems.forEach((item) => {
      const raw = parsePrice(item.price);
      if (raw === null || raw <= 0) return;
      const b = buckets.find((bk) => raw >= bk.min && raw < bk.max);
      if (b) b.count++;
    });
    return buckets;
  }, [menuItems]);

  // ── Reservations over last 14 days ────────────────────────────────────────
  const reservationsTrend = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        count: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    reservations.forEach((r: any) => {
      const raw = r.date || r.createdAt;
      if (!raw) return;
      const key = new Date(raw).toISOString().slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) days[i].count++;
    });
    return days;
  }, [reservations]);

  // ── New customers per day (last 14 days) ──────────────────────────────────
  const customersTrend = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        count: 0,
      });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    customers.forEach((c: any) => {
      const raw = c.createdAt;
      if (!raw) return;
      const key = new Date(raw).toISOString().slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) days[i].count++;
    });
    return days;
  }, [customers]);

  // ── Recent reservations (sorted, full list) ────────────────────────────────
  const recentReservationsAll = useMemo(
    () =>
      [...reservations].sort((a: any, b: any) => {
        const ta = new Date(a.createdAt || a.date || 0).getTime();
        const tb = new Date(b.createdAt || b.date || 0).getTime();
        return tb - ta;
      }),
    [reservations],
  );

  // ── Active coupons (full list) ─────────────────────────────────────────────
  const activeCouponsAll = useMemo(
    () => (coupons || []).filter((c: any) => c.show !== false),
    [coupons],
  );

  // ── Show-all toggles ───────────────────────────────────────────────────────
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const [showAllReservations, setShowAllReservations] = useState(false);
  const [showAllPriceRanges, setShowAllPriceRanges] = useState(false);

  const CAT_PREVIEW = 8;
  const COUPON_PREVIEW = 5;
  const RESV_PREVIEW = 5;
  const PRICE_PREVIEW = 5;

  const itemsPerCategoryShown = showAllCategories
    ? itemsPerCategory
    : itemsPerCategory.slice(0, CAT_PREVIEW);
  const activeCoupons = showAllCoupons
    ? activeCouponsAll
    : activeCouponsAll.slice(0, COUPON_PREVIEW);
  const recentReservations = showAllReservations
    ? recentReservationsAll
    : recentReservationsAll.slice(0, RESV_PREVIEW);
  const priceRangesShown = showAllPriceRanges
    ? priceRanges
    : priceRanges.slice(0, PRICE_PREVIEW);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {today}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time insights into your restaurant operations.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh-overview"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <KpiCard key={s.label} {...s} isLoading={isLoading} />
        ))}
      </div>

      {/* Pricing summary strip */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-600" />
            Pricing Summary
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
          <PriceMetric
            label="Avg. Price"
            value={priceStats.avg ? `₹${priceStats.avg.toLocaleString()}` : "—"}
          />
          <PriceMetric
            label="Min. Price"
            value={priceStats.min ? `₹${priceStats.min.toLocaleString()}` : "—"}
          />
          <PriceMetric
            label="Max. Price"
            value={priceStats.max ? `₹${priceStats.max.toLocaleString()}` : "—"}
          />
          <PriceMetric
            label="Items with Price"
            value={priceStats.count.toLocaleString()}
          />
        </div>
      </div>

      {/* Diet Mix + Price Distribution as data rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Diet Mix breakdown (data, not chart) */}
        <DataCard
          title="Diet Mix"
          subtitle="Vegetarian vs Non-Vegetarian"
          icon={<Leaf className="w-4 h-4 text-emerald-600" />}
        >
          {menuItems.length === 0 ? (
            <EmptyState label="No menu items yet" />
          ) : (
            <div className="space-y-3">
              {vegDistribution.map((d) => {
                const total = vegDistribution.reduce(
                  (a, b) => a + b.value,
                  0,
                );
                const pct = total ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {d.name}
                        </span>
                      </div>
                      <div className="text-sm tabular-nums">
                        <span className="font-semibold text-gray-900">
                          {d.value.toLocaleString()}
                        </span>
                        <span className="text-gray-500 ml-2">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: d.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>

        {/* Price Distribution (data table) */}
        <DataCard
          title="Price Distribution"
          subtitle="Items grouped by price range"
          icon={<TrendingUp className="w-4 h-4 text-rose-600" />}
          action={
            <ShowAllToggle
              expanded={showAllPriceRanges}
              total={priceRanges.length}
              preview={PRICE_PREVIEW}
              onToggle={() => setShowAllPriceRanges((s) => !s)}
            />
          }
        >
          {priceStats.count === 0 ? (
            <EmptyState label="No priced items yet" />
          ) : (
            <div className="space-y-3">
              {priceRangesShown.map((r) => {
                const pct = priceStats.count
                  ? Math.round((r.count / priceStats.count) * 100)
                  : 0;
                return (
                  <div key={r.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">
                        {r.name}
                      </span>
                      <div className="text-sm tabular-nums">
                        <span className="font-semibold text-gray-900">
                          {r.count.toLocaleString()}
                        </span>
                        <span className="text-gray-500 ml-2">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>
      </div>

      {/* Items per Category as a TABLE */}
      <DataCard
        title="Items per Category"
        subtitle={`Showing ${itemsPerCategoryShown.length} of ${itemsPerCategoryAll.length} categories`}
        icon={<LayoutGrid className="w-4 h-4 text-amber-600" />}
        action={
          <ShowAllToggle
            expanded={showAllCategories}
            total={itemsPerCategoryAll.length}
            preview={CAT_PREVIEW}
            onToggle={() => setShowAllCategories((s) => !s)}
          />
        }
      >
        {itemsPerCategoryShown.length === 0 ? (
          <EmptyState label="No menu items yet" />
        ) : (
          <div
            className={`overflow-hidden rounded-lg border border-gray-100 ${showAllCategories ? "max-h-[500px] overflow-y-auto" : ""}`}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itemsPerCategoryShown.map((c, i) => {
                  const total = menuItems.length || 1;
                  const pct = Math.round((c.items / total) * 100);
                  return (
                    <tr
                      key={c.name}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-gray-500 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {c.name}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                        {c.items.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      {/* Active Coupons table */}
      <DataCard
        title="Active Coupons"
        subtitle={`Showing ${activeCoupons.length} of ${activeCouponsAll.length} active`}
        icon={<Tag className="w-4 h-4 text-rose-600" />}
        action={
          <ShowAllToggle
            expanded={showAllCoupons}
            total={activeCouponsAll.length}
            preview={COUPON_PREVIEW}
            onToggle={() => setShowAllCoupons((s) => !s)}
          />
        }
      >
        {activeCoupons.length === 0 ? (
          <EmptyState label="No active coupons" />
        ) : (
          <div
            className={`overflow-hidden rounded-lg border border-gray-100 ${showAllCoupons ? "max-h-[500px] overflow-y-auto" : ""}`}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeCoupons.map((c: any) => (
                  <tr
                    key={c._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono font-semibold text-gray-900">
                      {c.code || c.title || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {c.discount
                        ? `${c.discount}${c.discountType === "percent" ? "%" : "₹"}`
                        : c.description || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      {/* Recent Reservations table */}
      <DataCard
        title="Recent Reservations"
        subtitle={`Showing ${recentReservations.length} of ${recentReservationsAll.length} bookings`}
        icon={<CalendarCheck className="w-4 h-4 text-indigo-600" />}
        action={
          <ShowAllToggle
            expanded={showAllReservations}
            total={recentReservationsAll.length}
            preview={RESV_PREVIEW}
            onToggle={() => setShowAllReservations((s) => !s)}
          />
        }
      >
        {recentReservations.length === 0 ? (
          <EmptyState label="No reservations yet" />
        ) : (
          <div
            className={`overflow-x-auto rounded-lg border border-gray-100 ${showAllReservations ? "max-h-[500px] overflow-y-auto" : ""}`}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider">
                    Guests
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentReservations.map((r: any) => (
                  <tr
                    key={r._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {r.name || r.customerName || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {r.phone || r.contactNumber || r.email || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {r.date
                        ? new Date(r.date).toLocaleDateString()
                        : r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {r.time || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">
                      {r.guests || r.partySize || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </div>
  );
}

// ─── Overview helper components ───────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  bg,
  bar,
  isLoading,
}: {
  label: string;
  value: number;
  icon: any;
  accent: string;
  bg: string;
  bar?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="relative bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all overflow-hidden">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${bar || "bg-gray-300"}`}
      />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 leading-tight pr-2">
          {label}
        </p>
        <div className={`p-2 rounded-lg ${bg} shrink-0`}>
          <Icon className={`w-4 h-4 ${accent}`} />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-9 w-20" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">
          {Number(value).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function PriceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4 bg-white">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums tracking-tight">
        {value}
      </p>
    </div>
  );
}

function DataCard({
  title,
  subtitle,
  icon,
  className,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className || ""}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className="p-1.5 bg-white border border-gray-100 rounded-lg shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build a compact page-number list with ellipsis
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (currentPage > 4) push("…");
    const from = Math.max(2, currentPage - 1);
    const to = Math.min(totalPages - 1, currentPage + 1);
    for (let i = from; i <= to; i++) push(i);
    if (currentPage < totalPages - 3) push("…");
    push(totalPages);
  }

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-600 tabular-nums">
        Showing <span className="font-semibold text-gray-900">{start.toLocaleString()}</span>
        –<span className="font-semibold text-gray-900">{end.toLocaleString()}</span>
        {" "}of{" "}
        <span className="font-semibold text-gray-900">{totalItems.toLocaleString()}</span>
        {" "}items
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="button-page-prev"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`e-${i}`}
              className="px-2 text-gray-400 text-sm select-none"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[34px] px-2.5 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                p === currentPage
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
              data-testid={`button-page-${p}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="button-page-next"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ShowAllToggle({
  expanded,
  total,
  preview,
  onToggle,
}: {
  expanded: boolean;
  total: number;
  preview: number;
  onToggle: () => void;
}) {
  if (total <= preview) return null;
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
      data-testid="button-show-all"
    >
      {expanded ? (
        <>Show less</>
      ) : (
        <>Show all ({total.toLocaleString()})</>
      )}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-10 flex items-center justify-center text-sm text-gray-400">
      {label}
    </div>
  );
}

// ─── Cascading Category Dropdown ─────────────────────────────────────────────

// Recursively collect every leaf id from a subcategory node array
function collectAllIds(items: any[]): string[] {
  return items.flatMap((item: any) => [
    item.id,
    ...(item.subcategories?.length ? collectAllIds(item.subcategories) : []),
  ]);
}

// Recursively find the display title for an id
function findTitleInTree(items: any[], id: string): string | undefined {
  for (const item of items) {
    if (item.id === id) return item.title;
    if (item.subcategories?.length) {
      const found = findTitleInTree(item.subcategories, id);
      if (found) return found;
    }
  }
  return undefined;
}

function CascadingCategoryDropdown({
  value,
  onChange,
  categories,
  collections,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: any[];
  collections: string[];
}) {
  const [open, setOpen] = useState(false);
  // L1 → L2: which top-level category is hovered (by _id string)
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);
  // L2 → L3: which subcategory within the active L2 panel is hovered (by id string)
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  // "Other" flyout
  const [otherHovered, setOtherHovered] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHoveredParent(null);
        setHoveredSub(null);
        setOtherHovered(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // All ids that appear anywhere in the category tree
  const treeIds = new Set(
    categories.flatMap((c: any) => collectAllIds(c.subcategories || [])),
  );
  const orphanCollections = collections.filter((col) => !treeIds.has(col));

  // Derive the label shown in the trigger button
  const selectedLabel =
    value === "all"
      ? "All Categories"
      : (categories.reduce((acc: string | undefined, c: any) => {
          return acc ?? findTitleInTree(c.subcategories || [], value);
        }, undefined) ??
        (orphanCollections.includes(value)
          ? formatCategory(value)
          : formatCategory(value)));

  const close = () => {
    setOpen(false);
    setHoveredParent(null);
    setHoveredSub(null);
    setOtherHovered(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ── */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          setHoveredParent(null);
          setHoveredSub(null);
          setOtherHovered(false);
        }}
        className="flex items-center gap-2 h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors min-w-[160px] justify-between"
        data-testid="button-category-dropdown"
      >
        <span className="truncate max-w-[120px]">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── L1 Dropdown panel ── */}
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] py-1.5 min-w-[210px]">
          {/* All Categories */}
          <button
            onClick={() => {
              onChange("all");
              close();
            }}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
              value === "all"
                ? "bg-amber-50 text-amber-700 font-semibold"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 opacity-60" />
            All Categories
          </button>

          {categories.length > 0 && (
            <div className="mx-3 my-1 border-t border-gray-100" />
          )}

          {/* ── L1 items → L2 flyout ── */}
          {categories.map((cat: any) => {
            const subs: any[] = cat.subcategories || [];
            const isL1Hovered = hoveredParent === String(cat._id);

            // L2 panel — no overflow so L3 absolute children aren't clipped
            const L2Panel =
              isL1Hovered && subs.length > 0 ? (
                <div
                  className="absolute left-full top-0 ml-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[210] p-4 min-w-[720px] max-w-[820px]"
                  onMouseEnter={() => setHoveredParent(String(cat._id))}
                >
                  <p className="px-1 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {cat.title}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {subs.map((sub: any) => {
                      const subSubs: any[] = sub.subcategories || [];
                      const isL2Hovered = hoveredSub === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className="relative"
                          onMouseEnter={() => setHoveredSub(sub.id)}
                          onMouseLeave={() => setHoveredSub(null)}
                        >
                          <button
                            onClick={() => {
                              if (subSubs.length === 0) {
                                onChange(sub.id);
                                close();
                              }
                            }}
                            className={`w-full flex items-start gap-1.5 px-2.5 py-2 text-sm rounded-xl transition-colors text-left ${
                              isL2Hovered || value === sub.id
                                ? "bg-amber-50 text-amber-700 font-semibold"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${sub.visible !== false ? "bg-emerald-400" : "bg-gray-300"}`}
                            />
                            <span className="leading-tight flex-1 min-w-0 break-words">
                              {sub.title}
                            </span>
                            {subSubs.length > 0 && (
                              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                          </button>

                          {/* ── L3 flyout — rendered here but not clipped (no overflow on L2) ── */}
                          {isL2Hovered && subSubs.length > 0 && (
                            <div
                              className="absolute left-full top-0 ml-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[220] p-4 min-w-[520px] max-w-[640px]"
                              onMouseEnter={() => setHoveredSub(sub.id)}
                            >
                              <p className="px-1 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {sub.title}
                              </p>
                              <div className="grid grid-cols-3 gap-1">
                                {subSubs.map((ss: any) => (
                                  <button
                                    key={ss.id}
                                    onClick={() => {
                                      onChange(ss.id);
                                      close();
                                    }}
                                    className={`flex items-start gap-1.5 px-2.5 py-2 text-sm rounded-xl transition-colors text-left ${
                                      value === ss.id
                                        ? "bg-amber-50 text-amber-700 font-semibold"
                                        : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${ss.visible !== false ? "bg-emerald-400" : "bg-gray-300"}`}
                                    />
                                    <span className="leading-tight break-words">
                                      {ss.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;

            return (
              <div
                key={String(cat._id)}
                className="relative"
                onMouseEnter={() => {
                  setHoveredParent(String(cat._id));
                  setHoveredSub(null);
                  setOtherHovered(false);
                }}
                onMouseLeave={() => setHoveredParent(null)}
              >
                <button
                  onClick={() => {
                    if (subs.length === 0) {
                      onChange(
                        cat.id || cat.title.toLowerCase().replace(/\s+/g, "-"),
                      );
                      close();
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                    isL1Hovered
                      ? "bg-amber-50 text-amber-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cat.image && (
                      <img
                        src={cat.image}
                        alt=""
                        className="w-4 h-4 rounded object-cover opacity-70"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    )}
                    <span className="font-semibold tracking-wide">
                      {cat.title}
                    </span>
                    {subs.length > 0 && (
                      <span className="text-xs text-gray-400 font-normal">
                        ({subs.length})
                      </span>
                    )}
                  </div>
                  {subs.length > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {L2Panel}
              </div>
            );
          })}

          {/* ── "Other" flyout — also 3-column grid ── */}
          {orphanCollections.length > 0 && (
            <>
              <div className="mx-3 my-1 border-t border-gray-100" />
              <div
                className="relative"
                onMouseEnter={() => {
                  setOtherHovered(true);
                  setHoveredParent(null);
                }}
                onMouseLeave={() => setOtherHovered(false)}
              >
                <button
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                    otherHovered
                      ? "bg-amber-50 text-amber-700"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 opacity-60" />
                    <span className="font-semibold tracking-wide">Other</span>
                    <span className="text-xs text-gray-400 font-normal">
                      ({orphanCollections.length})
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </button>

                {otherHovered && (
                  <div
                    className="absolute left-full top-0 ml-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[210] p-3 min-w-[480px]"
                    onMouseEnter={() => setOtherHovered(true)}
                  >
                    <p className="px-1 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Other
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {orphanCollections.map((col) => (
                        <button
                          key={col}
                          onClick={() => {
                            onChange(col);
                            close();
                          }}
                          className={`flex items-start gap-1.5 px-2.5 py-2 text-sm rounded-xl transition-colors text-left ${
                            value === col
                              ? "bg-amber-50 text-amber-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                          <span className="leading-tight break-words">
                            {formatCategory(col)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Menu Items
// ─── Menu filter / sort config ─────────────────────────────────────────────────
type FilterMode =
  | "all"
  | "veg"
  | "nonveg"
  | "available"
  | "unavailable"
  | "veg-available"
  | "nonveg-available";
type SortBy =
  | "recent"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "category-asc"
  | "category-desc";

const FILTER_MODES: {
  value: FilterMode;
  label: string;
  vegParam: string | null;
  availParam: string | null;
}[] = [
  { value: "all", label: "All Items", vegParam: null, availParam: null },
  { value: "veg", label: "Vegetarian", vegParam: "true", availParam: null },
  {
    value: "nonveg",
    label: "Non-Vegetarian",
    vegParam: "false",
    availParam: null,
  },
  {
    value: "available",
    label: "Available Items",
    vegParam: null,
    availParam: "true",
  },
  {
    value: "unavailable",
    label: "Unavailable Items",
    vegParam: null,
    availParam: "false",
  },
  {
    value: "veg-available",
    label: "Vegetarian & Available",
    vegParam: "true",
    availParam: "true",
  },
  {
    value: "nonveg-available",
    label: "Non-Veg & Available",
    vegParam: "false",
    availParam: "true",
  },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent", label: "Recent First" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "price-asc", label: "Price (Low-High)" },
  { value: "price-desc", label: "Price (High-Low)" },
  { value: "category-asc", label: "Category (A-Z)" },
  { value: "category-desc", label: "Category (Z-A)" },
];

// ═══════════════════════════════════════════════════════════════════════════════
function MenuItemsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [editItem, setEditItem] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;
  const emptyForm = {
    name: "",
    description: "",
    price: "",
    category: "",
    isVeg: true,
    image: "",
    isAvailable: true,
    todaysSpecial: false,
    chefSpecial: false,
    preparationTime: "",
    allergens: "",
    ingredients: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: collections = [] } = useQuery<string[]>({
    queryKey: [api(rid, "menu-collections")],
    queryFn: () => apiRequest(api(rid, "menu-collections")),
  });

  const { data: categoryTree = [] } = useQuery<any[]>({
    queryKey: [api(rid, "categories")],
    queryFn: () => apiRequest(api(rid, "categories")),
  });

  const filterDef = FILTER_MODES.find((f) => f.value === filterMode)!;
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category !== "all") params.set("category", category);
  if (filterDef.vegParam) params.set("isVeg", filterDef.vegParam);
  if (filterDef.availParam) params.set("isAvailable", filterDef.availParam);

  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: [api(rid, "menu-items"), search, category, filterMode],
    queryFn: () => apiRequest(`${api(rid, "menu-items")}?${params}`),
  });

  const sortedItems = useMemo(() => {
    const arr = [...items];
    switch (sortBy) {
      case "name-asc":
        return arr.sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? "")),
        );
      case "name-desc":
        return arr.sort((a, b) =>
          String(b.name ?? "").localeCompare(String(a.name ?? "")),
        );
      case "price-asc":
        return arr.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
      case "price-desc":
        return arr.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
      case "category-asc":
        return arr.sort((a, b) =>
          String(a.category ?? "").localeCompare(String(b.category ?? "")),
        );
      case "category-desc":
        return arr.sort((a, b) =>
          String(b.category ?? "").localeCompare(String(a.category ?? "")),
        );
      default:
        return arr;
    }
  }, [items, sortBy]);

  // Paginate ONLY when "All Categories" is selected (since that list is huge).
  // For specific categories, show everything (usually small list).
  const paginate = category === "all";
  const totalPages = paginate
    ? Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
    : 1;
  const safePage = Math.min(currentPage, totalPages);
  const visibleItems = paginate
    ? sortedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : sortedItems;

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, filterMode, sortBy]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, col, patch }: { id: string; col: string; patch: any }) =>
      apiRequest(`${api(rid, "menu-items")}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ category: col, ...patch }),
      }),
    onSuccess: () => refetch(),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, col }: { id: string; col: string }) =>
      apiRequest(`${api(rid, "menu-items")}/${id}?category=${col}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({ title: "Deleted" });
      setDeleteConfirm(null);
      refetch();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const body = {
        ...data,
        price: isNaN(Number(data.price)) ? data.price : Number(data.price),
        allergens:
          typeof data.allergens === "string"
            ? data.allergens
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : data.allergens,
        ingredients:
          typeof data.ingredients === "string"
            ? data.ingredients
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : data.ingredients,
      };
      if (data._id)
        return apiRequest(`${api(rid, "menu-items")}/${data._id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      return apiRequest(api(rid, "menu-items"), {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      setEditItem(null);
      setAddOpen(false);
      setForm(emptyForm);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openEdit(item: any) {
    setEditItem(item);
    setForm({
      ...item,
      allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : "",
      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.join(", ")
        : "",
    });
  }

  const [imgUploading, setImgUploading] = useState(false);
  const menuImageInputRef = useRef<HTMLInputElement>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<{
    imported: string[];
    skipped: string[];
    failed: { name: string; reason: string }[];
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    if (!sortedItems.length) {
      const hasFilters = category !== "all" || filterMode !== "all" || search;
      toast({
        title: "Nothing to export",
        description: hasFilters
          ? "No items match your current filters. Try adjusting or clearing the filters."
          : "There are no menu items to export.",
        variant: "destructive",
      });
      return;
    }
    try {
      const rows = sortedItems.map((item: any) => ({
        name: item.name ?? "",
        description: item.description ?? "",
        price: item.price ?? "",
        category: item.category ?? "",
        isVeg: item.isVeg ? "true" : "false",
        isAvailable: item.isAvailable ? "true" : "false",
        todaysSpecial: item.todaysSpecial ? "true" : "false",
        chefSpecial: item.chefSpecial ? "true" : "false",
        preparationTime: item.preparationTime ?? "",
        allergens: Array.isArray(item.allergens)
          ? item.allergens.join(", ")
          : (item.allergens ?? ""),
        ingredients: Array.isArray(item.ingredients)
          ? item.ingredients.join(", ")
          : (item.ingredients ?? ""),
        image: item.image ?? "",
      }));

      const filterParts: string[] = [];
      if (category !== "all") filterParts.push(category);
      if (filterMode !== "all") filterParts.push(filterMode);
      if (search) filterParts.push(search.replace(/\s+/g, "-").toLowerCase());
      const fileSuffix = filterParts.length ? `-${filterParts.join("-")}` : "";

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Menu Items");
      XLSX.writeFile(wb, `menu-export${fileSuffix}-${Date.now()}.xlsx`);

      const hasFilters = category !== "all" || filterMode !== "all" || search;
      toast({
        title: "Exported successfully",
        description: hasFilters
          ? `${rows.length} filtered item${rows.length !== 1 ? "s" : ""} exported to Excel.`
          : `All ${rows.length} item${rows.length !== 1 ? "s" : ""} exported to Excel.`,
      });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e.message || "Could not export menu items.",
        variant: "destructive",
      });
    }
  }

  async function handleImportFile(file: File) {
    setImportLoading(true);
    const importedNames: string[] = [];
    const skippedNames: string[] = [];
    const failedItems: { name: string; reason: string }[] = [];

    try {
      let rows: any[] = [];

      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [];
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws);
      } else {
        toast({
          title: "Unsupported file",
          description: "Please upload a .xlsx, .xls, or .json file.",
          variant: "destructive",
        });
        setImportLoading(false);
        return;
      }

      if (!rows.length) {
        toast({
          title: "Empty file",
          description: "The file contains no data to import.",
          variant: "destructive",
        });
        setImportLoading(false);
        return;
      }

      const existingSet = new Set(
        items.map(
          (item: any) =>
            `${String(item.name ?? "")
              .toLowerCase()
              .trim()}|${String(item.category ?? "")
              .toLowerCase()
              .trim()}`,
        ),
      );

      for (const row of rows) {
        const name = String(row.name ?? "").trim();
        const category = String(row.category ?? "").trim();

        if (!name) {
          failedItems.push({
            name: row.name ?? "(unnamed)",
            reason: "Missing item name.",
          });
          continue;
        }

        const key = `${name.toLowerCase()}|${category.toLowerCase()}`;
        if (existingSet.has(key)) {
          skippedNames.push(name);
          continue;
        }

        try {
          const body = {
            name,
            description: String(row.description ?? ""),
            price: isNaN(Number(row.price))
              ? String(row.price ?? "")
              : Number(row.price),
            category,
            isVeg: String(row.isVeg ?? "false").toLowerCase() === "true",
            isAvailable:
              String(row.isAvailable ?? "true").toLowerCase() !== "false",
            todaysSpecial:
              String(row.todaysSpecial ?? "false").toLowerCase() === "true",
            chefSpecial:
              String(row.chefSpecial ?? "false").toLowerCase() === "true",
            preparationTime: String(row.preparationTime ?? ""),
            allergens:
              typeof row.allergens === "string"
                ? row.allergens
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : [],
            ingredients:
              typeof row.ingredients === "string"
                ? row.ingredients
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : [],
            image: String(row.image ?? ""),
          };
          await apiRequest(api(rid, "menu-items"), {
            method: "POST",
            body: JSON.stringify(body),
          });
          importedNames.push(name);
          existingSet.add(key);
        } catch (e: any) {
          failedItems.push({
            name,
            reason: e.message || "Server error while saving item.",
          });
        }
      }

      await refetch();
      setImportResults({
        imported: importedNames,
        skipped: skippedNames,
        failed: failedItems,
      });
    } catch (e: any) {
      toast({
        title: "Import failed",
        description:
          e.message || "Could not read the file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function handleImageFileUpload(file: File) {
    setImgUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`/api/restaurant-db/${rid}/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setForm((p) => ({ ...p, image: data.url }));
      toast({ title: "Image uploaded successfully" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setImgUploading(false);
    }
  }

  const itemFormJsx = (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Category *</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c} value={c}>
                  {formatCategory(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            rows={2}
          />
        </div>
        <div>
          <Label>Price</Label>
          <Input
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            placeholder="e.g. 250"
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Image</Label>
          <div className="flex gap-2 items-center">
            <Input
              value={form.image}
              onChange={(e) =>
                setForm((p) => ({ ...p, image: e.target.value }))
              }
              placeholder="https://..."
              className="flex-1"
            />
            <input
              ref={menuImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageFileUpload(f);
                if (menuImageInputRef.current) menuImageInputRef.current.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={imgUploading}
              onClick={() => menuImageInputRef.current?.click()}
              data-testid="button-upload-menu-image"
            >
              {imgUploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>
          {form.image && (
            <img
              src={form.image}
              alt="preview"
              className="h-24 rounded-lg object-cover border"
              onError={(e) => {
                (e.target as any).style.display = "none";
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.isVeg}
            onCheckedChange={(v) => setForm((p) => ({ ...p, isVeg: v }))}
          />
          <Label>Vegetarian</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.isAvailable}
            onCheckedChange={(v) => setForm((p) => ({ ...p, isAvailable: v }))}
          />
          <Label>Available</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.todaysSpecial}
            onCheckedChange={(v) =>
              setForm((p) => ({ ...p, todaysSpecial: v }))
            }
          />
          <Label>Today's Special</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.chefSpecial}
            onCheckedChange={(v) => setForm((p) => ({ ...p, chefSpecial: v }))}
          />
          <Label>Chef's Special</Label>
        </div>
        <div>
          <Label>Prep Time</Label>
          <Input
            value={form.preparationTime}
            onChange={(e) =>
              setForm((p) => ({ ...p, preparationTime: e.target.value }))
            }
            placeholder="e.g. 15 min"
          />
        </div>
        <div>
          <Label>Allergens (comma-sep)</Label>
          <Input
            value={form.allergens}
            onChange={(e) =>
              setForm((p) => ({ ...p, allergens: e.target.value }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label>Ingredients (comma-sep)</Label>
          <Input
            value={form.ingredients}
            onChange={(e) =>
              setForm((p) => ({ ...p, ingredients: e.target.value }))
            }
          />
        </div>
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle={`${sortedItems.length} items found`}>
          Menu Items
        </SectionTitle>
        <div className="flex items-center gap-3">
          {/* Grid / List toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "list"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-700"
              }`}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-700"
              }`}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
            }}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            className="rounded-xl border-gray-200 shadow-sm hover:bg-gray-50"
            onClick={() => importInputRef.current?.click()}
            disabled={importLoading}
            data-testid="button-import-menu"
          >
            {importLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileUp className="w-4 h-4 mr-2" />
            )}
            Import
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-gray-200 shadow-sm hover:bg-gray-50"
            onClick={handleExport}
            data-testid="button-export-menu"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setAddOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm"
            data-testid="button-add-menu-item"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <CascadingCategoryDropdown
          value={category}
          onChange={setCategory}
          categories={categoryTree}
          collections={collections}
        />
        {/* Combined Filter dropdown */}
        <Select
          value={filterMode}
          onValueChange={(v) => setFilterMode(v as FilterMode)}
        >
          <SelectTrigger
            className="w-52 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="select-filter-mode"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {FILTER_MODES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger
            className="w-48 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="select-sort-by"
          >
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 bg-gray-50 border-gray-200 rounded-xl"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-menu"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadRow />
      ) : (
        <>
          {sortedItems.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">No menu items found</p>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {viewMode === "list" && (
            <div className="space-y-3">
              {visibleItems.map((item: any) => (
                <div
                  key={String(item._id)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-4"
                  data-testid={`row-menu-item-${item._id}`}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                      onError={(e) => {
                        (e.target as any).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <VegBadge isVeg={item.isVeg} />
                      {item.todaysSpecial && (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                          Today's Special
                        </Badge>
                      )}
                      {item.chefSpecial && (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Chef's
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-amber-600">
                        {item.price ? `₹${item.price}` : "—"}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs text-gray-500"
                      >
                        {formatCategory(item.category || "")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={item.isAvailable}
                      onCheckedChange={(v) =>
                        toggleMutation.mutate({
                          id: String(item._id),
                          col: item.category,
                          patch: { isAvailable: v },
                        })
                      }
                      data-testid={`switch-available-${item._id}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600 rounded-lg"
                      onClick={() => openEdit(item)}
                      data-testid={`button-edit-menu-${item._id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500 rounded-lg"
                      onClick={() => setDeleteConfirm(item)}
                      data-testid={`button-delete-menu-${item._id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── GRID VIEW ── */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleItems.map((item: any) => (
                <div
                  key={String(item._id)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
                  data-testid={`card-menu-item-${item._id}`}
                >
                  {/* Image */}
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-10 h-10 text-gray-200" />
                      </div>
                    )}
                    {/* Availability toggle overlay */}
                    <div className="absolute top-2 right-2">
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={(v) =>
                          toggleMutation.mutate({
                            id: String(item._id),
                            col: item.category,
                            patch: { isAvailable: v },
                          })
                        }
                        data-testid={`switch-available-grid-${item._id}`}
                      />
                    </div>
                    {/* Badges overlay */}
                    <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                      <VegBadge isVeg={item.isVeg} />
                      {item.todaysSpecial && (
                        <Badge className="bg-amber-500 text-white border-0 text-xs shadow-sm">
                          Special
                        </Badge>
                      )}
                      {item.chefSpecial && (
                        <Badge className="bg-purple-500 text-white border-0 text-xs shadow-sm">
                          <Star className="w-2.5 h-2.5 mr-0.5" />
                          Chef's
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <p className="font-bold text-gray-900 text-sm truncate leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {item.description || "—"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-black text-amber-600">
                        {item.price ? `₹${item.price}` : "—"}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs text-gray-400 max-w-[80px] truncate"
                      >
                        {formatCategory(item.category || "")}
                      </Badge>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-50">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-7 text-xs rounded-lg hover:bg-amber-50 hover:text-amber-600"
                        onClick={() => openEdit(item)}
                        data-testid={`button-edit-grid-${item._id}`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
                        onClick={() => setDeleteConfirm(item)}
                        data-testid={`button-delete-grid-${item._id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination — only when "All Categories" is selected */}
          {paginate && sortedItems.length > PAGE_SIZE && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={sortedItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          {itemFormJsx}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {itemFormJsx}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => saveMutation.mutate({ ...editItem, ...form })}
              disabled={saveMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteMutation.mutate({
                  id: String(deleteConfirm._id),
                  col: deleteConfirm.category,
                })
              }
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog
        open={!!importResults}
        onOpenChange={(v) => !v && setImportResults(null)}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileUp className="w-5 h-5 text-amber-500" />
              Import Results
            </DialogTitle>
            <DialogDescription>
              Here's a summary of what happened during the import.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Imported */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-emerald-800 text-sm">
                  {importResults?.imported.length ?? 0} item
                  {(importResults?.imported.length ?? 0) !== 1 ? "s" : ""}{" "}
                  imported successfully
                </span>
              </div>
              {(importResults?.imported.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {importResults!.imported.map((name, i) => (
                    <span
                      key={i}
                      className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Skipped */}
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-800 text-sm">
                  {importResults?.skipped.length ?? 0} item
                  {(importResults?.skipped.length ?? 0) !== 1 ? "s" : ""}{" "}
                  skipped (already exist)
                </span>
              </div>
              {(importResults?.skipped.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {importResults!.skipped.map((name, i) => (
                    <span
                      key={i}
                      className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Failed */}
            {(importResults?.failed.length ?? 0) > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="font-semibold text-red-800 text-sm">
                    {importResults!.failed.length} item
                    {importResults!.failed.length !== 1 ? "s" : ""} failed to
                    import
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  {importResults!.failed.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs bg-red-100 text-red-700 rounded-lg px-3 py-2"
                    >
                      <span className="font-semibold flex-shrink-0">
                        {f.name}:
                      </span>
                      <span className="text-red-600">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
              onClick={() => setImportResults(null)}
              data-testid="button-close-import-results"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Categories
// ═══════════════════════════════════════════════════════════════════════════════
// ── Category helpers ──────────────────────────────────────────────────────────
type CatSortBy =
  | "order-asc"
  | "order-desc"
  | "name-asc"
  | "name-desc"
  | "subcats-asc"
  | "subcats-desc";
type CatFilter = "all" | "visible" | "hidden";

const CAT_SORT_OPTIONS: { value: CatSortBy; label: string }[] = [
  { value: "order-asc", label: "Order (Asc)" },
  { value: "order-desc", label: "Order (Desc)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "subcats-asc", label: "Subcategories ↑" },
  { value: "subcats-desc", label: "Subcategories ↓" },
];

const CAT_EMPTY = { title: "", image: "", order: 1, visible: true };

function genId() {
  return Math.random().toString(36).substring(2, 9);
}

function editInSubcats(subcats: any[], id: string, update: any): any[] {
  return subcats.map((s) => {
    if (s.id === id) return { ...s, ...update };
    if (s.subcategories?.length)
      return {
        ...s,
        subcategories: editInSubcats(s.subcategories, id, update),
      };
    return s;
  });
}

function deleteFromSubcats(subcats: any[], id: string): any[] {
  return subcats
    .filter((s) => s.id !== id)
    .map((s) =>
      s.subcategories?.length
        ? { ...s, subcategories: deleteFromSubcats(s.subcategories, id) }
        : s,
    );
}

function addToSubcats(
  subcats: any[],
  parentId: string | null,
  item: any,
): any[] {
  if (parentId === null) return [...subcats, item];
  return subcats.map((s) => {
    if (s.id === parentId)
      return { ...s, subcategories: [...(s.subcategories || []), item] };
    if (s.subcategories?.length)
      return {
        ...s,
        subcategories: addToSubcats(s.subcategories, parentId, item),
      };
    return s;
  });
}

// ── Recursive subcategory tree ────────────────────────────────────────────────
function SubcatTree({
  subcats,
  depth = 0,
  onUpdate,
  rid,
}: {
  subcats: any[];
  depth?: number;
  onUpdate: (newSubcats: any[]) => void;
  rid: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addParent, setAddParent] = useState<string | null | false>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", visible: true, image: "" });

  const indent = depth * 16;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function handleAdd() {
    const newItem = {
      id: genId(),
      title: form.title,
      visible: form.visible,
      image: form.image,
      subcategories: [],
    };
    onUpdate(
      addToSubcats(
        subcats,
        addParent === null ? null : (addParent as string),
        newItem,
      ),
    );
    setAddParent(false);
    setForm({ title: "", visible: true, image: "" });
  }

  function handleEdit() {
    onUpdate(editInSubcats(subcats, editId!, form));
    setEditId(null);
    setForm({ title: "", visible: true, image: "" });
  }

  function handleDelete() {
    onUpdate(deleteFromSubcats(subcats, delId!));
    setDelId(null);
  }

  function handleToggle(id: string, visible: boolean) {
    onUpdate(editInSubcats(subcats, id, { visible }));
  }

  const bgColors = ["bg-gray-50", "bg-blue-50/40", "bg-violet-50/40"];
  const borderColors = [
    "border-gray-100",
    "border-blue-100",
    "border-violet-100",
  ];
  const badgeColors = [
    "text-gray-500 bg-gray-100",
    "text-blue-500 bg-blue-100",
    "text-violet-500 bg-violet-100",
  ];

  return (
    <div className="space-y-1.5" style={{ marginLeft: `${indent}px` }}>
      {subcats.map((sub: any) => (
        <div key={sub.id}>
          <div
            className={`flex items-center gap-2 p-2 rounded-xl border ${bgColors[Math.min(depth, 2)]} ${borderColors[Math.min(depth, 2)]}`}
          >
            <span
              className={`text-[10px] font-bold rounded px-1 py-0.5 leading-none flex-shrink-0 ${badgeColors[Math.min(depth, 2)]}`}
            >
              {depth === 0 ? "SUB" : depth === 1 ? "SUB2" : "SUB3"}
            </span>
            {sub.image ? (
              <img
                src={sub.image}
                alt={sub.title}
                className="h-7 w-7 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
            ) : null}
            <span className="text-sm text-gray-700 flex-1 font-medium truncate">
              {sub.title}
            </span>
            <Switch
              checked={sub.visible}
              onCheckedChange={(v) => handleToggle(sub.id, v)}
              data-testid={`switch-subcat-${sub.id}`}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 rounded-lg text-blue-500 hover:bg-blue-50"
              onClick={() => {
                setAddParent(sub.id);
                setForm({ title: "", visible: true, image: "" });
              }}
              title="Add sub-subcategory"
              data-testid={`button-addsub-${sub.id}`}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 rounded-lg"
              onClick={() => {
                setEditId(sub.id);
                setForm({
                  title: sub.title,
                  visible: sub.visible,
                  image: sub.image || "",
                });
              }}
              data-testid={`button-editsubcat-${sub.id}`}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 rounded-lg text-red-400 hover:bg-red-50"
              onClick={() => setDelId(sub.id)}
              data-testid={`button-deletesubcat-${sub.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            {sub.subcategories?.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 rounded-lg"
                onClick={() => toggleExpand(sub.id)}
                data-testid={`button-expandsubcat-${sub.id}`}
              >
                {expanded.has(sub.id) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
          {expanded.has(sub.id) && sub.subcategories?.length > 0 && (
            <SubcatTree
              subcats={sub.subcategories}
              depth={depth + 1}
              rid={rid}
              onUpdate={(newChildren) =>
                onUpdate(
                  editInSubcats(subcats, sub.id, {
                    subcategories: newChildren,
                  }),
                )
              }
            />
          )}
        </div>
      ))}

      {/* Add sub-subcategory inline form */}
      {addParent !== false && (
        <div
          className={`flex flex-col gap-2 p-2 rounded-xl border border-dashed ${borderColors[Math.min(depth + 1, 2)]} bg-white`}
          style={{ marginLeft: addParent !== null ? "16px" : "0" }}
        >
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Subcategory name…"
              className="h-7 text-sm flex-1"
              data-testid="input-subcat-name"
            />
            <Switch
              checked={form.visible}
              onCheckedChange={(v) => setForm((p) => ({ ...p, visible: v }))}
            />
            <Button
              size="sm"
              className="h-7 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs"
              onClick={handleAdd}
              disabled={!form.title.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={() => {
                setAddParent(false);
                setForm({ title: "", visible: true, image: "" });
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={form.image}
              onChange={(e) =>
                setForm((p) => ({ ...p, image: e.target.value }))
              }
              placeholder="Image URL or upload…"
              className="h-7 text-sm flex-1"
              data-testid="input-subcat-image"
            />
            <ImageUploadButton
              rid={rid}
              size="sm"
              testId="button-upload-subcat-image"
              onUploaded={(url) => setForm((p) => ({ ...p, image: url }))}
            />
            {form.image && (
              <img
                src={form.image}
                alt="preview"
                className="h-7 w-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(v) => !v && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                data-testid="input-editsubcat-name"
              />
            </div>
            <div>
              <Label>Image</Label>
              <div className="flex gap-2">
                <Input
                  value={form.image}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, image: e.target.value }))
                  }
                  placeholder="https://… or upload"
                  data-testid="input-editsubcat-image"
                />
                <ImageUploadButton
                  rid={rid}
                  testId="button-upload-editsubcat-image"
                  onUploaded={(url) => setForm((p) => ({ ...p, image: url }))}
                />
              </div>
            </div>
            {form.image && (
              <img
                src={form.image}
                alt="preview"
                className="h-24 w-full object-cover rounded-xl border"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
            )}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.visible}
                onCheckedChange={(v) => setForm((p) => ({ ...p, visible: v }))}
              />
              <Label>Visible</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleEdit}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subcategory</DialogTitle>
            <DialogDescription>
              This will also remove all nested sub-subcategories. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main CategoriesSection ─────────────────────────────────────────────────────
function CategoriesSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CatSortBy>("order-asc");
  const [filter, setFilter] = useState<CatFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editCat, setEditCat] = useState<any>(null);
  const [deleteCat, setDeleteCat] = useState<any>(null);
  const [catForm, setCatForm] = useState<any>(CAT_EMPTY);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [gridDrillCat, setGridDrillCat] = useState<any | null>(null);
  const [gridDrillPath, setGridDrillPath] = useState<string[]>([]);
  const [drillEditSub, setDrillEditSub] = useState<any | null>(null);
  const [drillEditForm, setDrillEditForm] = useState({
    title: "",
    image: "",
    visible: true,
  });
  const [drillDelSub, setDrillDelSub] = useState<any | null>(null);

  const {
    data: categories = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: [api(rid, "categories")],
    queryFn: () => apiRequest(api(rid, "categories")),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(api(rid, "categories"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Category created" });
      setAddOpen(false);
      setCatForm(CAT_EMPTY);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`${api(rid, "categories")}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Updated" });
      setEditCat(null);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${api(rid, "categories")}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Deleted" });
      setDeleteCat(null);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function handleSubcatUpdate(cat: any, newSubcats: any[]) {
    updateMutation.mutate({
      id: String(cat._id),
      data: { subcategories: newSubcats },
    });
  }

  const displayed = useMemo(() => {
    let r = [...categories];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((c) => (c.title || "").toLowerCase().includes(q));
    }
    if (filter === "visible") r = r.filter((c) => c.visible);
    if (filter === "hidden") r = r.filter((c) => !c.visible);
    r.sort((a, b) => {
      if (sortBy === "order-asc") return (a.order ?? 0) - (b.order ?? 0);
      if (sortBy === "order-desc") return (b.order ?? 0) - (a.order ?? 0);
      if (sortBy === "name-asc")
        return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "name-desc")
        return (b.title || "").localeCompare(a.title || "");
      if (sortBy === "subcats-asc")
        return (a.subcategories?.length || 0) - (b.subcategories?.length || 0);
      if (sortBy === "subcats-desc")
        return (b.subcategories?.length || 0) - (a.subcategories?.length || 0);
      return 0;
    });
    return r;
  }, [categories, search, sortBy, filter]);

  function CategoryForm({
    value,
    onChange,
  }: {
    value: any;
    onChange: (v: any) => void;
  }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Too large", description: "Image must be under 10MB", variant: "destructive" });
        return;
      }
      try {
        setUploading(true);
        const url = await uploadImageToCloudinary(rid, file);
        onChange({ ...value, image: url });
        toast({ title: "Image uploaded" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    return (
      <div className="space-y-3">
        <div>
          <Label>Title *</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder="e.g. Cocktails"
            data-testid="input-cat-title"
          />
        </div>
        <div>
          <Label>Image</Label>
          <div className="flex gap-2">
            <Input
              value={value.image}
              onChange={(e) => onChange({ ...value, image: e.target.value })}
              placeholder="https://… or upload"
              data-testid="input-cat-image"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
              data-testid="file-cat-image"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload-cat-image"
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Upload from device — saved to this restaurant's Cloudinary.
          </p>
        </div>
        {value.image && (
          <img
            src={value.image}
            alt="preview"
            className="h-24 w-full object-cover rounded-xl border"
            onError={(e) => {
              (e.target as any).style.display = "none";
            }}
          />
        )}
        <div>
          <Label>Order</Label>
          <Input
            type="number"
            value={value.order}
            onChange={(e) =>
              onChange({ ...value, order: parseInt(e.target.value) || 1 })
            }
            data-testid="input-cat-order"
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={value.visible}
            onCheckedChange={(v) => onChange({ ...value, visible: v })}
          />
          <Label>Visible</Label>
        </div>
      </div>
    );
  }

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Categories</SectionTitle>
        <Button
          onClick={() => {
            setCatForm(CAT_EMPTY);
            setAddOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
          data-testid="button-add-category"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
            data-testid="input-category-search"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as CatSortBy)}>
          <SelectTrigger
            className="w-44 rounded-xl"
            data-testid="select-category-sort"
          >
            <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {CAT_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(v) => setFilter(v as CatFilter)}>
          <SelectTrigger
            className="w-36 rounded-xl"
            data-testid="select-category-filter"
          >
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "list" ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "grid" ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {displayed.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">
            {categories.length === 0
              ? "No categories yet"
              : "No categories match your search"}
          </p>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {displayed.map((cat: any, idx: number) => (
            <div
              key={String(cat._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              data-testid={`card-category-${cat._id}`}
            >
              <div className="p-4 flex items-center gap-3">
                {/* Position badge + image */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span
                    className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5 leading-none"
                    data-testid={`text-position-cat-${cat._id}`}
                  >
                    #{idx + 1}
                  </span>
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.title}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                      onError={(e) => {
                        (e.target as any).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{cat.title}</p>
                  <p className="text-xs text-gray-400">
                    Order: {cat.order} · {cat.subcategories?.length || 0}{" "}
                    subcategories
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={cat.visible}
                    onCheckedChange={(v) =>
                      updateMutation.mutate({
                        id: String(cat._id),
                        data: { visible: v },
                      })
                    }
                    data-testid={`switch-cat-visible-${cat._id}`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 rounded-md text-[10px] font-medium gap-0.5 leading-none"
                      onClick={() =>
                        updateMutation.mutate({
                          id: String(cat._id),
                          data: { order: Math.max(1, cat.order - 1) },
                        })
                      }
                      disabled={idx === 0}
                      data-testid={`button-moveup-cat-${cat._id}`}
                    >
                      <ChevronUp className="w-3 h-3" />
                      Up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 rounded-md text-[10px] font-medium gap-0.5 leading-none"
                      onClick={() =>
                        updateMutation.mutate({
                          id: String(cat._id),
                          data: { order: cat.order + 1 },
                        })
                      }
                      disabled={idx === displayed.length - 1}
                      data-testid={`button-movedown-cat-${cat._id}`}
                    >
                      <ChevronDown className="w-3 h-3" />
                      Down
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    title="Add subcategory"
                    onClick={() => {
                      setExpanded((prev) => {
                        const s = new Set(prev);
                        s.add(String(cat._id));
                        return s;
                      });
                    }}
                    data-testid={`button-addsub-cat-${cat._id}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 rounded-lg"
                    onClick={() => {
                      setEditCat(cat);
                      setCatForm({
                        title: cat.title,
                        image: cat.image || "",
                        order: cat.order,
                        visible: cat.visible,
                      });
                    }}
                    data-testid={`button-edit-cat-${cat._id}`}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteCat(cat)}
                    data-testid={`button-delete-cat-${cat._id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 rounded-lg"
                    onClick={() => toggleExpand(String(cat._id))}
                    data-testid={`button-expand-cat-${cat._id}`}
                  >
                    {expanded.has(String(cat._id)) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expanded.has(String(cat._id)) && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
                  <SubcatTree
                    subcats={cat.subcategories || []}
                    depth={0}
                    rid={rid}
                    onUpdate={(newSubcats) =>
                      handleSubcatUpdate(cat, newSubcats)
                    }
                  />
                  <AddSubcatInline
                    onAdd={(item) =>
                      handleSubcatUpdate(cat, [
                        ...(cat.subcategories || []),
                        item,
                      ])
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── GRID VIEW — Categories ─────────────────────────────────────────── */}
      {viewMode === "grid" && !gridDrillCat && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayed.map((cat: any, idx: number) => (
            <div
              key={String(cat._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              data-testid={`card-category-grid-${cat._id}`}
            >
              {/* Image area */}
              <div className="relative">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-28 object-cover"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-28 bg-emerald-50 flex items-center justify-center">
                    <LayoutGrid className="w-8 h-8 text-emerald-300" />
                  </div>
                )}
                <span className="absolute top-2 left-2 text-[10px] font-bold text-emerald-700 bg-white/90 border border-emerald-100 rounded-md px-1.5 py-0.5 leading-none shadow-sm">
                  #{idx + 1}
                </span>
                <span
                  className={`absolute top-2 right-2 text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${cat.visible ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  {cat.visible ? "ON" : "OFF"}
                </span>
              </div>
              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-1">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {cat.title}
                </p>
                <p className="text-xs text-gray-400">
                  {cat.subcategories?.length || 0} subcategories
                </p>
              </div>
              {/* Actions */}
              <div className="px-3 pb-3 flex items-center justify-between gap-1">
                <Switch
                  checked={cat.visible}
                  onCheckedChange={(v) =>
                    updateMutation.mutate({
                      id: String(cat._id),
                      data: { visible: v },
                    })
                  }
                  data-testid={`switch-cat-visible-grid-${cat._id}`}
                />
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    title="Manage subcategories"
                    onClick={() => setGridDrillCat(cat)}
                    data-testid={`button-addsub-cat-grid-${cat._id}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 rounded-lg"
                    onClick={() => {
                      setEditCat(cat);
                      setCatForm({
                        title: cat.title,
                        image: cat.image || "",
                        order: cat.order,
                        visible: cat.visible,
                      });
                    }}
                    data-testid={`button-edit-cat-grid-${cat._id}`}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteCat(cat)}
                    data-testid={`button-delete-cat-grid-${cat._id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GRID VIEW — Subcategories drilldown (infinite depth) ────────── */}
      {viewMode === "grid" &&
        gridDrillCat &&
        (() => {
          const freshCat =
            categories.find(
              (c: any) => String(c._id) === String(gridDrillCat._id),
            ) ?? gridDrillCat;

          // ── path helpers ──────────────────────────────────────────────────
          function getAtPath(root: any[], path: string[]): any[] {
            if (path.length === 0) return root;
            const node = root.find((s: any) => s.id === path[0]);
            return node
              ? getAtPath(node.subcategories || [], path.slice(1))
              : [];
          }
          function updateAtPath(
            root: any[],
            path: string[],
            next: any[],
          ): any[] {
            if (path.length === 0) return next;
            return root.map((s: any) =>
              s.id === path[0]
                ? {
                    ...s,
                    subcategories: updateAtPath(
                      s.subcategories || [],
                      path.slice(1),
                      next,
                    ),
                  }
                : s,
            );
          }
          function getBreadcrumb(
            root: any[],
            path: string[],
          ): { id: string; title: string; image?: string }[] {
            const out: { id: string; title: string; image?: string }[] = [];
            let cur = root;
            for (const id of path) {
              const n = cur.find((s: any) => s.id === id);
              if (!n) break;
              out.push({ id: n.id, title: n.title, image: n.image });
              cur = n.subcategories || [];
            }
            return out;
          }

          const rootSubcats = freshCat.subcategories || [];
          const subcats = getAtPath(rootSubcats, gridDrillPath);
          const crumbs = getBreadcrumb(rootSubcats, gridDrillPath);

          function saveSubcats(next: any[]) {
            handleSubcatUpdate(
              freshCat,
              updateAtPath(rootSubcats, gridDrillPath, next),
            );
          }
          function updateSub(id: string, patch: any) {
            saveSubcats(
              subcats.map((s: any) => (s.id === id ? { ...s, ...patch } : s)),
            );
          }
          function deleteSub(id: string) {
            saveSubcats(subcats.filter((s: any) => s.id !== id));
          }
          function goBack() {
            if (gridDrillPath.length === 0) {
              setGridDrillCat(null);
            } else {
              setGridDrillPath((p) => p.slice(0, -1));
            }
          }

          return (
            <div className="space-y-4">
              {/* Breadcrumb / back */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl"
                  onClick={goBack}
                  data-testid="button-drilldown-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex items-center gap-1.5 text-sm flex-wrap">
                  <button
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setGridDrillCat(null);
                      setGridDrillPath([]);
                    }}
                  >
                    Categories
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  <button
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    onClick={() => setGridDrillPath([])}
                  >
                    {freshCat.image && (
                      <img
                        src={freshCat.image}
                        alt={freshCat.title}
                        className="h-4 w-4 rounded object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    )}
                    {freshCat.title}
                  </button>
                  {crumbs.map((crumb, ci) => (
                    <span key={crumb.id} className="flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <button
                        className={`flex items-center gap-1 ${ci === crumbs.length - 1 ? "font-semibold text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                        onClick={() =>
                          setGridDrillPath(gridDrillPath.slice(0, ci + 1))
                        }
                      >
                        {crumb.image && (
                          <img
                            src={crumb.image}
                            alt={crumb.title}
                            className="h-4 w-4 rounded object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = "none";
                            }}
                          />
                        )}
                        {crumb.title}
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {subcats.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                  <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-gray-400 text-sm">
                    No items here yet. Add one below.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {subcats.map((sub: any, sidx: number) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                    data-testid={`card-subcat-grid-${sub.id}`}
                  >
                    <div className="relative">
                      {sub.image ? (
                        <img
                          src={sub.image}
                          alt={sub.title}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            (e.target as any).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-24 bg-blue-50 flex items-center justify-center">
                          <LayoutGrid className="w-7 h-7 text-blue-200" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold text-blue-600 bg-white/90 border border-blue-100 rounded-md px-1.5 py-0.5 leading-none shadow-sm">
                        #{sidx + 1}
                      </span>
                      <span
                        className={`absolute top-2 right-2 text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none ${sub.visible ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}
                      >
                        {sub.visible ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="p-3 flex-1">
                      <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                        {sub.title}
                      </p>
                      {sub.subcategories?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sub.subcategories.length} sub-items
                        </p>
                      )}
                    </div>
                    <div className="px-3 pb-3 flex items-center justify-between gap-1">
                      <Switch
                        checked={sub.visible}
                        onCheckedChange={(v) =>
                          updateSub(sub.id, { visible: v })
                        }
                        data-testid={`switch-subcat-grid-${sub.id}`}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          title="Drill into sub-items"
                          onClick={() =>
                            setGridDrillPath([...gridDrillPath, sub.id])
                          }
                          data-testid={`button-drill-subcat-grid-${sub.id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 rounded-lg"
                          onClick={() => {
                            setDrillEditSub(sub);
                            setDrillEditForm({
                              title: sub.title,
                              image: sub.image || "",
                              visible: sub.visible,
                            });
                          }}
                          data-testid={`button-edit-subcat-grid-${sub.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                          onClick={() => setDrillDelSub(sub)}
                          data-testid={`button-delete-subcat-grid-${sub.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <AddSubcatInline
                onAdd={(item) => saveSubcats([...subcats, item])}
              />

              {/* Edit subcat dialog */}
              <Dialog
                open={!!drillEditSub}
                onOpenChange={(v) => !v && setDrillEditSub(null)}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Subcategory</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={drillEditForm.title}
                        onChange={(e) =>
                          setDrillEditForm((p) => ({
                            ...p,
                            title: e.target.value,
                          }))
                        }
                        data-testid="input-drill-edit-title"
                      />
                    </div>
                    <div>
                      <Label>Image</Label>
                      <div className="flex gap-2">
                        <Input
                          value={drillEditForm.image}
                          onChange={(e) =>
                            setDrillEditForm((p) => ({
                              ...p,
                              image: e.target.value,
                            }))
                          }
                          placeholder="https://… or upload"
                          data-testid="input-drill-edit-image"
                        />
                        <ImageUploadButton
                          rid={rid}
                          testId="button-upload-drill-edit-image"
                          onUploaded={(url) =>
                            setDrillEditForm((p) => ({ ...p, image: url }))
                          }
                        />
                      </div>
                    </div>
                    {drillEditForm.image && (
                      <img
                        src={drillEditForm.image}
                        alt="preview"
                        className="h-24 w-full object-cover rounded-xl border"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={drillEditForm.visible}
                        onCheckedChange={(v) =>
                          setDrillEditForm((p) => ({ ...p, visible: v }))
                        }
                      />
                      <Label>Visible</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDrillEditSub(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => {
                        updateSub(drillEditSub.id, drillEditForm);
                        setDrillEditSub(null);
                      }}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete subcat dialog */}
              <Dialog
                open={!!drillDelSub}
                onOpenChange={(v) => !v && setDrillDelSub(null)}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Subcategory</DialogTitle>
                    <DialogDescription>
                      Delete "{drillDelSub?.title}"? This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDrillDelSub(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        deleteSub(drillDelSub.id);
                        setDrillDelSub(null);
                      }}
                    >
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          );
        })()}

      {/* Add category dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <CategoryForm value={catForm} onChange={setCatForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => createMutation.mutate(catForm)}
              disabled={createMutation.isPending || !catForm.title.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit category dialog */}
      <Dialog open={!!editCat} onOpenChange={(v) => !v && setEditCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <CategoryForm value={catForm} onChange={setCatForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() =>
                updateMutation.mutate({
                  id: String(editCat._id),
                  data: catForm,
                })
              }
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category dialog */}
      <Dialog open={!!deleteCat} onOpenChange={(v) => !v && setDeleteCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete "{deleteCat?.title}" and all its subcategories? This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCat(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(String(deleteCat._id))}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddSubcatInline({ onAdd }: { onAdd: (item: any) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [visible, setVisible] = useState(true);
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium py-1"
        data-testid="button-add-subcategory"
      >
        <Plus className="w-3.5 h-3.5" />
        Add subcategory
      </button>
    );
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-dashed border-emerald-200 bg-white">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Subcategory name…"
        className="h-7 text-sm flex-1"
        data-testid="input-add-subcat-name"
      />
      <Switch checked={visible} onCheckedChange={setVisible} />
      <Button
        size="sm"
        className="h-7 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs"
        onClick={() => {
          if (title.trim()) {
            onAdd({
              id: genId(),
              title: title.trim(),
              visible,
              subcategories: [],
            });
            setTitle("");
            setOpen(false);
          }
        }}
        disabled={!title.trim()}
      >
        Add
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 rounded-lg"
        onClick={() => {
          setTitle("");
          setOpen(false);
        }}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Smart Picks
// ═══════════════════════════════════════════════════════════════════════════════
const SMART_PICK_EMOJIS = [
  "⭐",
  "🍽️",
  "👨‍🍳",
  "🔥",
  "💫",
  "🌟",
  "🥇",
  "🎯",
  "🍕",
  "🍔",
  "🍣",
  "🍜",
  "🍛",
  "🥗",
  "🍰",
  "🧁",
  "🍩",
  "🥩",
  "🍗",
  "🦞",
  "🍤",
  "🥞",
  "🧆",
  "🌮",
  "🥙",
  "🍱",
  "🫕",
  "🍲",
  "🥘",
  "🫔",
  "🌯",
  "🥪",
  "🍟",
  "🍿",
  "🧀",
  "🥓",
  "🍖",
  "🫓",
  "🧇",
  "🥐",
  "🥨",
  "🍞",
  "🫐",
  "🍓",
  "🍑",
  "🥭",
  "🍋",
  "🍊",
  "🍇",
  "🍒",
  "🥑",
  "🌽",
  "🥕",
  "🧄",
  "🧅",
  "🥦",
  "🫚",
  "🧈",
  "🍯",
  "🧂",
  "🫙",
  "🥫",
  "🍵",
  "☕",
  "🧃",
  "🥤",
  "🍹",
  "🍸",
  "🥂",
  "🍾",
];

type SPSortBy = "order-asc" | "order-desc" | "name-asc" | "name-desc";
type SPFilter = "all" | "visible" | "hidden";

const SP_SORT_OPTIONS: { value: SPSortBy; label: string }[] = [
  { value: "order-asc", label: "Order (Asc)" },
  { value: "order-desc", label: "Order (Desc)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

const SP_EMPTY = {
  icon: "⭐",
  label: "",
  tagline: "",
  key: "",
  order: 1,
  isVisible: true,
};

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Emoji (logo)</Label>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-2xl border border-violet-100 flex-shrink-0">
          {value || "⭐"}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type or paste an emoji…"
          className="flex-1"
          data-testid="input-smartpick-emoji"
        />
      </div>
      <div className="grid grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1 border rounded-xl bg-gray-50">
        {SMART_PICK_EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onChange(em)}
            className={`text-xl h-8 w-8 rounded-lg flex items-center justify-center hover:bg-violet-100 transition-colors ${value === em ? "bg-violet-200 ring-1 ring-violet-400" : ""}`}
            data-testid={`button-emoji-${em}`}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

function PickForm({
  value,
  onChange,
}: {
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div className="space-y-3">
      <EmojiPicker
        value={value.icon}
        onChange={(em) => onChange({ ...value, icon: em })}
      />
      <div>
        <Label>Label *</Label>
        <Input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="e.g. Today's Special"
          data-testid="input-smartpick-label"
        />
      </div>
      <div>
        <Label>Tagline</Label>
        <Input
          value={value.tagline}
          onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          placeholder="e.g. Tried and loved picks for today"
          data-testid="input-smartpick-tagline"
        />
      </div>
      <div>
        <Label>Key (slug)</Label>
        <Input
          value={value.key}
          onChange={(e) => onChange({ ...value, key: e.target.value })}
          placeholder="e.g. todaysSpecial"
          data-testid="input-smartpick-key"
        />
      </div>
      <div>
        <Label>Order</Label>
        <Input
          type="number"
          value={value.order}
          onChange={(e) =>
            onChange({ ...value, order: parseInt(e.target.value) || 1 })
          }
          data-testid="input-smartpick-order"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={value.isVisible}
          onCheckedChange={(v) => onChange({ ...value, isVisible: v })}
        />
        <Label>Visible</Label>
      </div>
    </div>
  );
}

function SmartPicksSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDelete] = useState<any>(null);
  const [form, setForm] = useState<any>(SP_EMPTY);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SPSortBy>("order-asc");
  const [filter, setFilter] = useState<SPFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const {
    data: picks = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: [api(rid, "smart-picks")],
    queryFn: () => apiRequest(api(rid, "smart-picks")),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(api(rid, "smart-picks"), {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Created" });
      setAddOpen(false);
      setForm(SP_EMPTY);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`${api(rid, "smart-picks")}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Updated" });
      setEditItem(null);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${api(rid, "smart-picks")}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Deleted" });
      setDelete(null);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const displayed = useMemo(() => {
    let r = [...picks];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (p) =>
          (p.label || "").toLowerCase().includes(q) ||
          (p.key || "").toLowerCase().includes(q),
      );
    }
    if (filter === "visible") r = r.filter((p) => p.isVisible);
    if (filter === "hidden") r = r.filter((p) => !p.isVisible);
    r.sort((a, b) => {
      if (sortBy === "order-asc") return (a.order ?? 0) - (b.order ?? 0);
      if (sortBy === "order-desc") return (b.order ?? 0) - (a.order ?? 0);
      if (sortBy === "name-asc")
        return (a.label || "").localeCompare(b.label || "");
      if (sortBy === "name-desc")
        return (b.label || "").localeCompare(a.label || "");
      return 0;
    });
    return r;
  }, [picks, search, sortBy, filter]);

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle subtitle="AI-powered curated picks for your customers">
          Smart Picks
        </SectionTitle>
        <Button
          onClick={() => {
            setForm(SP_EMPTY);
            setAddOpen(true);
          }}
          className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl"
          data-testid="button-add-smartpick"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Pick
        </Button>
      </div>

      {/* Search / Sort / Filter toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or key…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
            data-testid="input-smartpick-search"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SPSortBy)}>
          <SelectTrigger
            className="w-40 rounded-xl"
            data-testid="select-smartpick-sort"
          >
            <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SP_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={(v) => setFilter(v as SPFilter)}>
          <SelectTrigger
            className="w-36 rounded-xl"
            data-testid="select-smartpick-filter"
          >
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "list" ? "bg-violet-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-smartpick-view-list"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "grid" ? "bg-violet-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-smartpick-view-grid"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {displayed.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">
            {picks.length === 0
              ? "No smart picks found"
              : "No picks match your search"}
          </p>
        </div>
      )}

      <div
        className={
          viewMode === "list"
            ? "space-y-3"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        }
      >
        {displayed.map((pick: any, idx: number) => (
          <div
            key={String(pick._id)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
            data-testid={`card-smartpick-${pick._id}`}
          >
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span
                className="text-[10px] font-bold text-violet-500 bg-violet-50 border border-violet-100 rounded-md px-1.5 py-0.5 leading-none"
                data-testid={`text-position-smartpick-${pick._id}`}
              >
                #{idx + 1}
              </span>
              <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center text-2xl border border-violet-100">
                {pick.icon || "⭐"}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{pick.label}</p>
              <p className="text-sm text-gray-500">{pick.tagline}</p>
              <Badge variant="outline" className="text-xs mt-1 text-gray-400">
                {pick.key}
              </Badge>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Switch
                checked={pick.isVisible}
                onCheckedChange={(v) =>
                  updateMutation.mutate({
                    id: String(pick._id),
                    data: { isVisible: v },
                  })
                }
                data-testid={`switch-smartpick-${pick._id}`}
              />
              <div className="flex flex-col gap-0.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 rounded-md text-[10px] font-medium gap-0.5 leading-none"
                  onClick={() =>
                    updateMutation.mutate({
                      id: String(pick._id),
                      data: { order: Math.max(1, (pick.order ?? 1) - 1) },
                    })
                  }
                  disabled={idx === 0}
                  data-testid={`button-moveup-smartpick-${pick._id}`}
                >
                  <ChevronUp className="w-3 h-3" />
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 rounded-md text-[10px] font-medium gap-0.5 leading-none"
                  onClick={() =>
                    updateMutation.mutate({
                      id: String(pick._id),
                      data: { order: (pick.order ?? 1) + 1 },
                    })
                  }
                  disabled={idx === displayed.length - 1}
                  data-testid={`button-movedown-smartpick-${pick._id}`}
                >
                  <ChevronDown className="w-3 h-3" />
                  Down
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 rounded-lg text-xs"
                onClick={() => {
                  setEditItem(pick);
                  setForm({
                    icon: pick.icon || "⭐",
                    label: pick.label,
                    tagline: pick.tagline,
                    key: pick.key,
                    order: pick.order,
                    isVisible: pick.isVisible,
                  });
                }}
                data-testid={`button-edit-smartpick-${pick._id}`}
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                onClick={() => setDelete(pick)}
                data-testid={`button-delete-smartpick-${pick._id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Smart Pick</DialogTitle>
          </DialogHeader>
          <PickForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-violet-500 hover:bg-violet-600 text-white"
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Smart Pick</DialogTitle>
          </DialogHeader>
          <PickForm value={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              className="bg-violet-500 hover:bg-violet-600 text-white"
              onClick={() =>
                updateMutation.mutate({ id: String(editItem._id), data: form })
              }
              disabled={updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Smart Pick</DialogTitle>
            <DialogDescription>
              Delete "{deleteConfirm?.label}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(String(deleteConfirm._id))}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Carousel
// ═══════════════════════════════════════════════════════════════════════════════
type CarouselSortBy = "order-asc" | "order-desc" | "name-asc" | "name-desc";
type CarouselVisibility = "all" | "visible" | "hidden";

const CAROUSEL_SORT_OPTIONS: { value: CarouselSortBy; label: string }[] = [
  { value: "order-asc", label: "Order (Asc)" },
  { value: "order-desc", label: "Order (Desc)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

function CarouselForm({
  rid,
  form,
  setForm,
  uploading,
  setUploading,
}: {
  rid: string;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { toast } = useToast();
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const token = localStorage.getItem("adminToken");
      const res = await fetch(
        `/api/restaurant-db/${rid}/upload-image`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Upload failed");
      setForm((p: any) => ({ ...p, url: data.url }));
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Image *</Label>
        <div className="mt-1 flex flex-col gap-2">
          <label
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm text-gray-600"
            data-testid="label-carousel-upload"
          >
            <ImageIcon className="w-4 h-4 text-gray-400" />
            <span>{uploading ? "Uploading..." : "Upload from device"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
              data-testid="input-carousel-file"
            />
          </label>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <Input
            value={form.url}
            onChange={(e) => setForm((p: any) => ({ ...p, url: e.target.value }))}
            placeholder="Paste image URL"
            data-testid="input-carousel-url"
          />
        </div>
      </div>
      {form.url && (
        <img
          src={form.url}
          alt="preview"
          className="h-32 w-full object-cover rounded-xl border"
          onError={(e) => {
            (e.target as any).style.display = "none";
          }}
        />
      )}
      <div>
        <Label>Alt text</Label>
        <Input
          value={form.alt}
          onChange={(e) => setForm((p: any) => ({ ...p, alt: e.target.value }))}
        />
      </div>
      <div>
        <Label>Order</Label>
        <Input
          type="number"
          value={form.order}
          onChange={(e) =>
            setForm((p: any) => ({ ...p, order: parseInt(e.target.value) }))
          }
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={form.visible}
          onCheckedChange={(v) => setForm((p: any) => ({ ...p, visible: v }))}
        />
        <Label>Visible</Label>
      </div>
    </div>
  );
}

function CarouselSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { url: "", alt: "", order: 1, visible: true };
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CarouselSortBy>("order-asc");
  const [visibilityFilter, setVisibilityFilter] =
    useState<CarouselVisibility>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: [api(rid, "carousel")],
    queryFn: () => apiRequest(api(rid, "carousel")),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const { _id, ...rest } = data;
      return _id
        ? apiRequest(`${api(rid, "carousel")}/${_id}`, {
            method: "PATCH",
            body: JSON.stringify(rest),
          })
        : apiRequest(api(rid, "carousel"), {
            method: "POST",
            body: JSON.stringify(rest),
          });
    },
    onSuccess: () => {
      toast({ title: "Saved" });
      setAddOpen(false);
      setEditItem(null);
      setForm(emptyForm);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${api(rid, "carousel")}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Deleted" });
      setDeleteConfirm(null);
      refetch();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      apiRequest(`${api(rid, "carousel")}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ visible }),
      }),
    onSuccess: () => refetch(),
  });

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => (i.alt || "").toLowerCase().includes(q));
    }
    if (visibilityFilter === "visible")
      result = result.filter((i) => i.visible);
    if (visibilityFilter === "hidden")
      result = result.filter((i) => !i.visible);
    result.sort((a, b) => {
      if (sortBy === "order-asc") return (a.order ?? 0) - (b.order ?? 0);
      if (sortBy === "order-desc") return (b.order ?? 0) - (a.order ?? 0);
      if (sortBy === "name-asc")
        return (a.alt || "").localeCompare(b.alt || "");
      if (sortBy === "name-desc")
        return (b.alt || "").localeCompare(a.alt || "");
      return 0;
    });
    return result;
  }, [items, search, sortBy, visibilityFilter]);

  const [uploading, setUploading] = useState(false);

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Carousel</SectionTitle>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setAddOpen(true);
          }}
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-xl"
          data-testid="button-add-carousel"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Image
        </Button>
      </div>

      {/* Search / Sort / Filter toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
            data-testid="input-carousel-search"
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as CarouselSortBy)}
        >
          <SelectTrigger
            className="w-40 rounded-xl"
            data-testid="select-carousel-sort"
          >
            <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {CAROUSEL_SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={visibilityFilter}
          onValueChange={(v) => setVisibilityFilter(v as CarouselVisibility)}
        >
          <SelectTrigger
            className="w-36 rounded-xl"
            data-testid="select-carousel-filter"
          >
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "list" ? "bg-pink-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-carousel-view-list"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "grid" ? "bg-pink-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-carousel-view-grid"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Images className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">
            {items.length === 0
              ? "No carousel images yet"
              : "No images match your search"}
          </p>
        </div>
      )}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredItems.map((item: any) => (
            <div
              key={String(item._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all"
              data-testid={`card-carousel-${item._id}`}
            >
              <div className="relative">
                <img
                  src={item.url}
                  alt={item.alt}
                  className="w-full h-36 object-cover"
                  onError={(e) => {
                    (e.target as any).src =
                      "https://via.placeholder.com/300x150?text=Image";
                  }}
                />
                <div className="absolute top-2 right-2">
                  <Switch
                    checked={item.visible}
                    onCheckedChange={(v) =>
                      toggleMutation.mutate({ id: String(item._id), visible: v })
                    }
                    data-testid={`switch-carousel-${item._id}`}
                  />
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-600 truncate font-medium">
                  {item.alt || "No alt"}
                </p>
                <p className="text-xs text-gray-400">Order: {item.order}</p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 rounded-lg text-xs"
                    onClick={() => {
                      setEditItem(item);
                      setForm({
                        url: item.url,
                        alt: item.alt,
                        order: item.order,
                        visible: item.visible,
                      });
                    }}
                    data-testid={`button-edit-carousel-${item._id}`}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(item)}
                    data-testid={`button-delete-carousel-${item._id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item: any) => (
            <div
              key={String(item._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-4 hover:shadow-md transition-all"
              data-testid={`card-carousel-${item._id}`}
            >
              <img
                src={item.url}
                alt={item.alt}
                className="w-20 h-16 object-cover rounded-xl border flex-shrink-0"
                onError={(e) => {
                  (e.target as any).src =
                    "https://via.placeholder.com/120x80?text=Image";
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {item.alt || "No alt"}
                </p>
                <p className="text-xs text-gray-400">Order: {item.order}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={item.visible}
                  onCheckedChange={(v) =>
                    toggleMutation.mutate({ id: String(item._id), visible: v })
                  }
                  data-testid={`switch-carousel-${item._id}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 rounded-lg text-xs"
                  onClick={() => {
                    setEditItem(item);
                    setForm({
                      url: item.url,
                      alt: item.alt,
                      order: item.order,
                      visible: item.visible,
                    });
                  }}
                  data-testid={`button-edit-carousel-${item._id}`}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                  onClick={() => setDeleteConfirm(item)}
                  data-testid={`button-delete-carousel-${item._id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Carousel Image</DialogTitle>
          </DialogHeader>
          <CarouselForm
            rid={rid}
            form={form}
            setForm={setForm}
            uploading={uploading}
            setUploading={setUploading}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-pink-500 hover:bg-pink-600 text-white"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Carousel Image</DialogTitle>
          </DialogHeader>
          <CarouselForm
            rid={rid}
            form={form}
            setForm={setForm}
            uploading={uploading}
            setUploading={setUploading}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              className="bg-pink-500 hover:bg-pink-600 text-white"
              onClick={() => saveMutation.mutate({ ...editItem, ...form })}
              disabled={saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>Delete this carousel image?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(String(deleteConfirm._id))}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Coupons
// ═══════════════════════════════════════════════════════════════════════════════
type CouponSortBy =
  | "code-asc"
  | "code-desc"
  | "title-asc"
  | "title-desc"
  | "tag-asc"
  | "tag-desc";

const COUPON_SORT_OPTIONS: { value: CouponSortBy; label: string }[] = [
  { value: "code-asc", label: "Code (A-Z)" },
  { value: "code-desc", label: "Code (Z-A)" },
  { value: "title-asc", label: "Title (A-Z)" },
  { value: "title-desc", label: "Title (Z-A)" },
  { value: "tag-asc", label: "Tag (A-Z)" },
  { value: "tag-desc", label: "Tag (Z-A)" },
];

function CouponForm({
  form,
  setForm,
}: {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>Code *</Label>
        <Input
          value={form.code}
          onChange={(e) => setForm((p: any) => ({ ...p, code: e.target.value }))}
        />
      </div>
      <div>
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm((p: any) => ({ ...p, title: e.target.value }))}
        />
      </div>
      <div>
        <Label>Subtitle</Label>
        <Input
          value={form.subtitle}
          onChange={(e) =>
            setForm((p: any) => ({ ...p, subtitle: e.target.value }))
          }
        />
      </div>
      <div>
        <Label>Tag</Label>
        <Input
          value={form.tag}
          onChange={(e) => setForm((p: any) => ({ ...p, tag: e.target.value }))}
        />
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) =>
            setForm((p: any) => ({ ...p, description: e.target.value }))
          }
          rows={2}
        />
      </div>
      <div>
        <Label>Validity</Label>
        <Input
          value={form.validity}
          onChange={(e) =>
            setForm((p: any) => ({ ...p, validity: e.target.value }))
          }
        />
      </div>
      <div className="flex items-center gap-3 self-end">
        <Switch
          checked={form.show}
          onCheckedChange={(v) => setForm((p: any) => ({ ...p, show: v }))}
        />
        <Label>Show</Label>
      </div>
    </div>
  );
}

function CouponsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = {
    code: "",
    title: "",
    subtitle: "",
    description: "",
    validity: "",
    tag: "",
    show: true,
  };
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterTag, setFilterTag] = useState("all");
  const [sortBy, setSortBy] = useState<CouponSortBy>("code-asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  const {
    data: coupons = [],
    isLoading,
    refetch,
  } = useQuery<any[]>({
    queryKey: [api(rid, "coupons")],
    queryFn: () => apiRequest(api(rid, "coupons")),
  });

  const tags = useMemo(() => {
    const set = new Set<string>();
    coupons.forEach((c: any) => {
      if (c.tag) set.add(c.tag);
    });
    return Array.from(set).sort();
  }, [coupons]);

  const filtered = useMemo(() => {
    let arr = [...coupons];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (c: any) =>
          String(c.code ?? "")
            .toLowerCase()
            .includes(q) ||
          String(c.title ?? "")
            .toLowerCase()
            .includes(q) ||
          String(c.subtitle ?? "")
            .toLowerCase()
            .includes(q) ||
          String(c.tag ?? "")
            .toLowerCase()
            .includes(q) ||
          String(c.description ?? "")
            .toLowerCase()
            .includes(q),
      );
    }
    if (filterStatus === "active") arr = arr.filter((c: any) => c.show);
    if (filterStatus === "inactive") arr = arr.filter((c: any) => !c.show);
    if (filterTag !== "all") arr = arr.filter((c: any) => c.tag === filterTag);

    switch (sortBy) {
      case "code-asc":
        arr.sort((a, b) =>
          String(a.code ?? "").localeCompare(String(b.code ?? "")),
        );
        break;
      case "code-desc":
        arr.sort((a, b) =>
          String(b.code ?? "").localeCompare(String(a.code ?? "")),
        );
        break;
      case "title-asc":
        arr.sort((a, b) =>
          String(a.title ?? "").localeCompare(String(b.title ?? "")),
        );
        break;
      case "title-desc":
        arr.sort((a, b) =>
          String(b.title ?? "").localeCompare(String(a.title ?? "")),
        );
        break;
      case "tag-asc":
        arr.sort((a, b) =>
          String(a.tag ?? "").localeCompare(String(b.tag ?? "")),
        );
        break;
      case "tag-desc":
        arr.sort((a, b) =>
          String(b.tag ?? "").localeCompare(String(a.tag ?? "")),
        );
        break;
    }
    return arr;
  }, [coupons, search, filterStatus, filterTag, sortBy]);

  const hasFilters = search || filterStatus !== "all" || filterTag !== "all";

  function clearFilters() {
    setSearch("");
    setFilterStatus("all");
    setFilterTag("all");
  }

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      data._id
        ? apiRequest(`${api(rid, "coupons")}/${data._id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          })
        : apiRequest(api(rid, "coupons"), {
            method: "POST",
            body: JSON.stringify(data),
          }),
    onSuccess: () => {
      toast({ title: "Saved" });
      setAddOpen(false);
      setEditItem(null);
      setForm(emptyForm);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${api(rid, "coupons")}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Deleted" });
      setDeleteConfirm(null);
      refetch();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, show }: { id: string; show: boolean }) =>
      apiRequest(`${api(rid, "coupons")}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ show }),
      }),
    onSuccess: () => refetch(),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle
          subtitle={
            hasFilters
              ? `${filtered.length} of ${coupons.length} coupons`
              : `${coupons.length} coupons`
          }
        >
          Coupons
        </SectionTitle>
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as CouponSortBy)}
          >
            <SelectTrigger
              className="w-44 bg-white border-gray-200 rounded-xl shadow-sm"
              data-testid="select-coupon-sort"
            >
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {COUPON_SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setAddOpen(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            data-testid="button-add-coupon"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Coupon
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 bg-gray-50 border-gray-200 rounded-xl"
            placeholder="Search code, title, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-coupons"
          />
        </div>
        {/* Status filter */}
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as any)}
        >
          <SelectTrigger
            className="w-40 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="select-coupon-status"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coupons</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
        {/* Tag filter */}
        {tags.length > 0 && (
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger
              className="w-40 bg-gray-50 border-gray-200 rounded-xl"
              data-testid="select-coupon-tag"
            >
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 rounded-xl px-3"
            onClick={clearFilters}
            data-testid="button-clear-coupon-filters"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
        {/* View mode toggle */}
        <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "list" ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-coupon-view-list"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "grid" ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}
            data-testid="button-coupon-view-grid"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">
            {hasFilters ? "No coupons match your filters" : "No coupons found"}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-sm text-red-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((coupon: any) => (
            <div
              key={String(coupon._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all"
              data-testid={`card-coupon-${coupon._id}`}
            >
              <div
                className={`h-1 bg-gradient-to-r ${coupon.show ? "from-red-400 to-orange-400" : "from-gray-300 to-gray-300"}`}
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs">
                        {coupon.code}
                      </Badge>
                      {coupon.tag && (
                        <Badge variant="outline" className="text-xs">
                          {coupon.tag}
                        </Badge>
                      )}
                      {!coupon.show && (
                        <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 mt-2">{coupon.title}</p>
                    <p className="text-sm text-gray-500">{coupon.subtitle}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {coupon.validity}
                    </p>
                  </div>
                  <Switch
                    checked={coupon.show}
                    onCheckedChange={(v) =>
                      toggleMutation.mutate({ id: String(coupon._id), show: v })
                    }
                    data-testid={`switch-coupon-${coupon._id}`}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 rounded-lg text-xs"
                    onClick={() => {
                      setEditItem(coupon);
                      setForm({
                        code: coupon.code,
                        title: coupon.title,
                        subtitle: coupon.subtitle,
                        description: coupon.description,
                        validity: coupon.validity,
                        tag: coupon.tag,
                        show: coupon.show,
                      });
                    }}
                    data-testid={`button-edit-coupon-${coupon._id}`}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(coupon)}
                    data-testid={`button-delete-coupon-${coupon._id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((coupon: any) => (
            <div
              key={String(coupon._id)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all"
              data-testid={`card-coupon-${coupon._id}`}
            >
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs flex-shrink-0">
                {coupon.code}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 truncate">
                    {coupon.title}
                  </p>
                  {coupon.tag && (
                    <Badge variant="outline" className="text-xs">
                      {coupon.tag}
                    </Badge>
                  )}
                  {!coupon.show && (
                    <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {coupon.subtitle}
                </p>
                <p className="text-xs text-gray-400">{coupon.validity}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch
                  checked={coupon.show}
                  onCheckedChange={(v) =>
                    toggleMutation.mutate({ id: String(coupon._id), show: v })
                  }
                  data-testid={`switch-coupon-${coupon._id}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 rounded-lg text-xs"
                  onClick={() => {
                    setEditItem(coupon);
                    setForm({
                      code: coupon.code,
                      title: coupon.title,
                      subtitle: coupon.subtitle,
                      description: coupon.description,
                      validity: coupon.validity,
                      tag: coupon.tag,
                      show: coupon.show,
                    });
                  }}
                  data-testid={`button-edit-coupon-${coupon._id}`}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                  onClick={() => setDeleteConfirm(coupon)}
                  data-testid={`button-delete-coupon-${coupon._id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Coupon</DialogTitle>
          </DialogHeader>
          <CouponForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
          </DialogHeader>
          <CouponForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => saveMutation.mutate({ ...editItem, ...form })}
              disabled={saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Delete coupon <strong>{deleteConfirm?.code}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(String(deleteConfirm._id))}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Customers
// ═══════════════════════════════════════════════════════════════════════════════
function CustomersSection({ rid }: { rid: string }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; contactNumber: string; email: string; visitCount: string }>({ name: "", contactNumber: "", email: "", visitCount: "0" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const LIMIT = 20;

  const params = new URLSearchParams({
    sort,
    order,
    page: String(page),
    limit: String(LIMIT),
  });
  if (search) params.set("search", search);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, isLoading, refetch, isFetching } = useQuery<{ customers: any[]; total: number }>({
    queryKey: [api(rid, "customers"), search, from, to, sort, order, page],
    queryFn: () => apiRequest(`${api(rid, "customers")}?${params}`),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const customers = data?.customers || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) =>
      apiRequest(`${api(rid, "customers")}/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload.data),
      }),
    onSuccess: () => {
      toast({ title: "Saved", description: "Customer updated." });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: [api(rid, "customers")] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message || "Update failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${api(rid, "customers")}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Deleted", description: "Customer removed." });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: [api(rid, "customers")] });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message || "Delete failed", variant: "destructive" }),
  });

  const openEdit = (c: any) => {
    setEditing(c);
    setEditForm({
      name: c.name || "",
      contactNumber: c.contactNumber || "",
      email: c.email || "",
      visitCount: String(c.visitCount ?? 0),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle={`${total} total customers`}>
          Customers
        </SectionTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
            data-testid="button-refresh-customers"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => exportCSV(customers, "customers.csv")}
            data-testid="button-export-customers"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 bg-gray-50 border-gray-200 rounded-xl"
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            data-testid="input-search-customers"
          />
        </div>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-36 bg-gray-50 border-gray-200 rounded-xl"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-36 bg-gray-50 border-gray-200 rounded-xl"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-36 bg-gray-50 border-gray-200 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date Joined</SelectItem>
            <SelectItem value="visitCount">Visit Count</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="lastVisitDate">Last Visit</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          className="w-10 px-2 rounded-xl"
        >
          {order === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <LoadRow />
      ) : (
        <>
          {customers.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">No customers found</p>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Name", "Contact", "Visits", "Last Visit", "Joined", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any, i: number) => (
                  <tr
                    key={String(c._id)}
                    className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                    data-testid={`row-customer-${c._id}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.contactNumber}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        {c.visitCount}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.lastVisitDate
                        ? new Date(c.lastVisitDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                          onClick={() => openEdit(c)}
                          title="Edit"
                          data-testid={`button-edit-customer-${c._id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(String(c._id))}
                          title="Delete"
                          data-testid={`button-delete-customer-${c._id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update the customer's details and save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Name</Label>
              <Input
                id="cust-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-edit-customer-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Contact Number</Label>
              <Input
                id="cust-phone"
                value={editForm.contactNumber}
                onChange={(e) => setEditForm((f) => ({ ...f, contactNumber: e.target.value }))}
                data-testid="input-edit-customer-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                data-testid="input-edit-customer-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-visits">Visit Count</Label>
              <Input
                id="cust-visits"
                type="number"
                min={0}
                value={editForm.visitCount}
                onChange={(e) => setEditForm((f) => ({ ...f, visitCount: e.target.value }))}
                data-testid="input-edit-customer-visits"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} data-testid="button-cancel-edit-customer">
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={updateMutation.isPending || !editing}
              onClick={() =>
                editing &&
                updateMutation.mutate({
                  id: String(editing._id),
                  data: {
                    name: editForm.name.trim(),
                    contactNumber: editForm.contactNumber.trim(),
                    email: editForm.email.trim(),
                    visitCount: Number(editForm.visitCount) || 0,
                  },
                })
              }
              data-testid="button-save-customer"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Customer?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The customer record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete-customer">
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-customer"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Reservations
// ═══════════════════════════════════════════════════════════════════════════════
type ResSortBy =
  | "date-desc"
  | "date-asc"
  | "name-asc"
  | "name-desc"
  | "guests-desc"
  | "guests-asc"
  | "booked-desc"
  | "booked-asc";

const RES_SORT_OPTIONS: { value: ResSortBy; label: string }[] = [
  { value: "date-desc", label: "Reservation Date (Newest)" },
  { value: "date-asc", label: "Reservation Date (Oldest)" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "guests-desc", label: "Guests (High-Low)" },
  { value: "guests-asc", label: "Guests (Low-High)" },
  { value: "booked-desc", label: "Booked At (Newest)" },
  { value: "booked-asc", label: "Booked At (Oldest)" },
];

function ReservationsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOccasion, setFilterOccasion] = useState("all");
  const [filterGuests, setFilterGuests] = useState("all");
  const [sortBy, setSortBy] = useState<ResSortBy>("date-desc");
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);

  const { data: reservations = [], isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: [api(rid, "reservations")],
    queryFn: () => apiRequest(api(rid, "reservations")),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`${api(rid, "reservations")}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api(rid, "reservations")] });
      toast({ title: "Reservation updated" });
      setEditing(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`${api(rid, "reservations")}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api(rid, "reservations")] });
      toast({ title: "Reservation deleted" });
      setDeleting(null);
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const occasions = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r: any) => {
      if (r.occasion) set.add(r.occasion);
    });
    return Array.from(set).sort();
  }, [reservations]);

  const filtered = useMemo(() => {
    let arr = [...reservations];

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (r: any) =>
          String(r.name ?? "")
            .toLowerCase()
            .includes(q) ||
          String(r.phone ?? "")
            .toLowerCase()
            .includes(q) ||
          String(r.occasion ?? "")
            .toLowerCase()
            .includes(q) ||
          String(r.email ?? "")
            .toLowerCase()
            .includes(q),
      );
    }
    if (fromDate) arr = arr.filter((r: any) => r.date >= fromDate);
    if (toDate) arr = arr.filter((r: any) => r.date <= toDate);
    if (filterOccasion !== "all")
      arr = arr.filter((r: any) => r.occasion === filterOccasion);
    if (filterGuests === "1-2")
      arr = arr.filter((r: any) => Number(r.guests) <= 2);
    if (filterGuests === "3-5")
      arr = arr.filter(
        (r: any) => Number(r.guests) >= 3 && Number(r.guests) <= 5,
      );
    if (filterGuests === "6-10")
      arr = arr.filter(
        (r: any) => Number(r.guests) >= 6 && Number(r.guests) <= 10,
      );
    if (filterGuests === "10+")
      arr = arr.filter((r: any) => Number(r.guests) > 10);

    switch (sortBy) {
      case "date-asc":
        arr.sort((a, b) =>
          String(a.date ?? "").localeCompare(String(b.date ?? "")),
        );
        break;
      case "date-desc":
        arr.sort((a, b) =>
          String(b.date ?? "").localeCompare(String(a.date ?? "")),
        );
        break;
      case "name-asc":
        arr.sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? "")),
        );
        break;
      case "name-desc":
        arr.sort((a, b) =>
          String(b.name ?? "").localeCompare(String(a.name ?? "")),
        );
        break;
      case "guests-asc":
        arr.sort((a, b) => Number(a.guests ?? 0) - Number(b.guests ?? 0));
        break;
      case "guests-desc":
        arr.sort((a, b) => Number(b.guests ?? 0) - Number(a.guests ?? 0));
        break;
      case "booked-asc":
        arr.sort(
          (a, b) =>
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime(),
        );
        break;
      case "booked-desc":
        arr.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        );
        break;
    }
    return arr;
  }, [
    reservations,
    search,
    fromDate,
    toDate,
    filterOccasion,
    filterGuests,
    sortBy,
  ]);

  const hasFilters =
    search ||
    fromDate ||
    toDate ||
    filterOccasion !== "all" ||
    filterGuests !== "all";

  function clearFilters() {
    setSearch("");
    setFromDate("");
    setToDate("");
    setFilterOccasion("all");
    setFilterGuests("all");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle
          subtitle={
            hasFilters
              ? `${filtered.length} of ${reservations.length} reservations`
              : `${reservations.length} reservations`
          }
        >
          Reservations
        </SectionTitle>
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as ResSortBy)}
          >
            <SelectTrigger
              className="w-56 bg-white border-gray-200 rounded-xl shadow-sm"
              data-testid="select-res-sort"
            >
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {RES_SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
            data-testid="button-refresh-reservations"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-cyan-200 text-cyan-600 hover:bg-cyan-50"
            onClick={() => exportCSV(filtered, "reservations.csv")}
            data-testid="button-export-reservations"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 bg-gray-50 border-gray-200 rounded-xl"
            placeholder="Search name, phone, occasion…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-reservations"
          />
        </div>
        {/* From Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            From
          </span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-44 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="input-from-date"
          />
        </div>
        {/* To Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            To
          </span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-44 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="input-to-date"
          />
        </div>
        {/* Occasion filter */}
        <Select value={filterOccasion} onValueChange={setFilterOccasion}>
          <SelectTrigger
            className="w-44 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="select-res-occasion"
          >
            <SelectValue placeholder="All Occasions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Occasions</SelectItem>
            {occasions.map((occ) => (
              <SelectItem key={occ} value={occ}>
                {occ.charAt(0).toUpperCase() + occ.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Guests filter */}
        <Select value={filterGuests} onValueChange={setFilterGuests}>
          <SelectTrigger
            className="w-36 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="select-res-guests"
          >
            <SelectValue placeholder="All Guests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Guests</SelectItem>
            <SelectItem value="1-2">1–2 Guests</SelectItem>
            <SelectItem value="3-5">3–5 Guests</SelectItem>
            <SelectItem value="6-10">6–10 Guests</SelectItem>
            <SelectItem value="10+">10+ Guests</SelectItem>
          </SelectContent>
        </Select>
        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 rounded-xl px-3"
            onClick={clearFilters}
            data-testid="button-clear-res-filters"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadRow />
      ) : (
        <>
          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">
                {hasFilters
                  ? "No reservations match your filters"
                  : "No reservations found"}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-cyan-500 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {[
                      "Name",
                      "Phone",
                      "Date",
                      "Time",
                      "Guests",
                      "Occasion",
                      "Booked At",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => (
                    <tr
                      key={String(r._id)}
                      className="border-b border-gray-50 hover:bg-cyan-50/30 transition-colors"
                      data-testid={`row-reservation-${r._id}`}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {r.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.timeSlot}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200">
                          {r.guests}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.occasion ? (
                          <Badge
                            variant="outline"
                            className="text-gray-600 capitalize"
                          >
                            {r.occasion}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-cyan-600 hover:bg-cyan-50"
                            onClick={() => setEditing(r)}
                            data-testid={`button-edit-reservation-${r._id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                            onClick={() => setDeleting(r)}
                            data-testid={`button-delete-reservation-${r._id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Edit Reservation Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
            <DialogDescription>
              Update the reservation details below.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Name</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  data-testid="input-edit-res-name"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Phone</Label>
                <Input
                  value={editing.phone ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                  data-testid="input-edit-res-phone"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Email</Label>
                <Input
                  value={editing.email ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                  data-testid="input-edit-res-email"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Date</Label>
                <Input
                  type="date"
                  value={editing.date ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, date: e.target.value })
                  }
                  data-testid="input-edit-res-date"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Time Slot</Label>
                <Input
                  value={editing.timeSlot ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, timeSlot: e.target.value })
                  }
                  placeholder="e.g. 02:00 PM – 03:30 PM"
                  data-testid="input-edit-res-time"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.guests ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      guests: Number(e.target.value),
                    })
                  }
                  data-testid="input-edit-res-guests"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Occasion</Label>
                <Input
                  value={editing.occasion ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, occasion: e.target.value })
                  }
                  data-testid="input-edit-res-occasion"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editing &&
                updateMutation.mutate({
                  id: String(editing._id),
                  data: {
                    name: editing.name,
                    phone: editing.phone,
                    email: editing.email,
                    date: editing.date,
                    timeSlot: editing.timeSlot,
                    guests: editing.guests,
                    occasion: editing.occasion,
                  },
                })
              }
              disabled={updateMutation.isPending}
              data-testid="button-save-reservation"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Reservation Confirmation */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the reservation for{" "}
              <span className="font-semibold">{deleting?.name}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleting && deleteMutation.mutate(String(deleting._id))
              }
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-reservation"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Social Links
// ═══════════════════════════════════════════════════════════════════════════════
function SocialLinksSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    instagram: "",
    facebook: "",
    youtube: "",
    whatsapp: "",
  });

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "social-links")],
    queryFn: () => apiRequest(api(rid, "social-links")),
  });

  if (data && !form.instagram && !isLoading)
    setForm({
      instagram: data.instagram || "",
      facebook: data.facebook || "",
      youtube: data.youtube || "",
      whatsapp: data.whatsapp || "",
    });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "social-links"), {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast({ title: "Saved" });
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  const socials = [
    {
      key: "instagram",
      label: "Instagram",
      icon: Instagram,
      color: "text-pink-500",
      bg: "bg-pink-50",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: Youtube,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: Phone,
      color: "text-green-500",
      bg: "bg-green-50",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle>Social Links</SectionTitle>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl"
          data-testid="button-save-social"
        >
          <Save className="w-4 h-4 mr-2" />
          Save All
        </Button>
      </div>
      <div className="space-y-4 max-w-lg">
        {socials.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${bg} rounded-xl`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <Label className="font-semibold text-gray-800">{label}</Label>
            </div>
            <Input
              value={(form as any)[key]}
              onChange={(e) =>
                setForm((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={`${label} URL or handle`}
              className="bg-gray-50 border-gray-200 rounded-xl"
              data-testid={`input-social-${key}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Welcome Screen + Restaurant Info + Contact details
// ═══════════════════════════════════════════════════════════════════════════════
const CONTACT_FIELDS: { key: string; label: string; placeholder: string; icon: any }[] = [
  { key: "googleReview", label: "Google Review Link", placeholder: "https://g.page/r/...", icon: Star },
  { key: "email", label: "Email", placeholder: "mailto:hello@example.com", icon: Mail },
  { key: "website", label: "Website", placeholder: "https://...", icon: Globe },
  { key: "locate", label: "Google Maps Link", placeholder: "https://maps.app.goo.gl/...", icon: MapPin },
  { key: "call", label: "Call (tel:)", placeholder: "tel:+91...", icon: Phone },
];

function WelcomeScreenSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ logoUrl: "", buttonText: "" });
  const [infoForm, setInfoForm] = useState<any>({});
  const [contactForm, setContactForm] = useState<any>({});
  const [welcomeUploading, setWelcomeUploading] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "welcome-screen")],
    queryFn: () => apiRequest(api(rid, "welcome-screen")),
  });
  const { data: infoData, isLoading: infoLoading, refetch: refetchInfo } = useQuery<any>({
    queryKey: [api(rid, "restaurant-info")],
    queryFn: () => apiRequest(api(rid, "restaurant-info")),
  });
  const { data: contactData, isLoading: contactLoading, refetch: refetchContact } = useQuery<any>({
    queryKey: [api(rid, "social-links")],
    queryFn: () => apiRequest(api(rid, "social-links")),
  });

  if (data && !form.buttonText && !isLoading) {
    setForm({ logoUrl: data.logoUrl || "", buttonText: data.buttonText || "" });
  }
  if (infoData && Object.keys(infoForm).length === 0 && !infoLoading) setInfoForm(infoData);
  if (contactData && Object.keys(contactForm).length === 0 && !contactLoading) setContactForm(contactData);

  const saveWelcomeMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "welcome-screen"), {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast({ title: "Welcome screen saved" });
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveInfoMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "restaurant-info"), {
        method: "PATCH",
        body: JSON.stringify(infoForm),
      }),
    onSuccess: () => {
      toast({ title: "Restaurant info saved" });
      refetchInfo();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveContactMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "social-links"), {
        method: "PATCH",
        body: JSON.stringify(contactForm),
      }),
    onSuccess: () => {
      toast({ title: "Contact details saved" });
      refetchContact();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const infoKeys = [
    "location",
    "contact",
    "hours",
    "instagram",
    "facebook",
    "youtube",
    "whatsapp",
  ];

  const saveAll = () => {
    saveWelcomeMutation.mutate();
    saveInfoMutation.mutate();
    saveContactMutation.mutate();
  };

  if (isLoading || infoLoading || contactLoading) return <LoadRow />;

  const savingAll =
    saveWelcomeMutation.isPending ||
    saveInfoMutation.isPending ||
    saveContactMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle="Welcome screen, restaurant info & contact details">
          Welcome Screen
        </SectionTitle>
        <Button
          onClick={saveAll}
          disabled={savingAll}
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl"
          data-testid="button-save-welcome-all"
        >
          <Save className="w-4 h-4 mr-2" />
          Save All
        </Button>
      </div>

      {/* Welcome Screen Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 rounded-xl">
            <Monitor className="w-4 h-4 text-teal-500" />
          </div>
          <h3 className="font-bold text-gray-800">Welcome Screen</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="font-semibold text-gray-700">Logo</Label>
            <div className="mt-1 space-y-2">
              <label
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm text-gray-600"
                data-testid="label-welcome-logo-upload"
              >
                <ImageIcon className="w-4 h-4 text-gray-400" />
                <span>
                  {welcomeUploading ? "Uploading…" : "Upload from device"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={welcomeUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      toast({
                        title: "Invalid file",
                        description: "Please select an image file.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setWelcomeUploading(true);
                    try {
                      const uploaded = await uploadImageToCloudinary(rid, file);
                      setForm((p) => ({ ...p, logoUrl: uploaded }));
                      toast({ title: "Image uploaded" });
                    } catch (err: any) {
                      toast({
                        title: "Upload failed",
                        description: err.message,
                        variant: "destructive",
                      });
                    } finally {
                      setWelcomeUploading(false);
                    }
                  }}
                  data-testid="input-welcome-logo-file"
                />
              </label>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span>OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <Input
                value={form.logoUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, logoUrl: e.target.value }))
                }
                placeholder="Paste image URL"
                className="bg-gray-50 border-gray-200 rounded-xl"
                data-testid="input-welcome-logo"
              />
            </div>
            {form.logoUrl && (
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="mt-3 h-20 object-contain rounded-xl border bg-gray-50 p-2"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
            )}
          </div>
          <div>
            <Label className="font-semibold text-gray-700">Button Text</Label>
            <Input
              value={form.buttonText}
              onChange={(e) =>
                setForm((p) => ({ ...p, buttonText: e.target.value }))
              }
              placeholder="e.g. EXPLORE MENU"
              className="mt-1 bg-gray-50 border-gray-200 rounded-xl"
              data-testid="input-welcome-button"
            />
          </div>
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-orange-50 rounded-xl">
            <Info className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-bold text-gray-800">Restaurant Info</h3>
        </div>
        <div className="space-y-4">
          {infoKeys.map((key) => {
            const entry = infoForm[key] || {};
            return (
              <div
                key={key}
                className="rounded-xl border border-gray-100 p-4 bg-gray-50/50"
              >
                <p className="font-semibold text-gray-700 capitalize mb-3">
                  {key}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Name</Label>
                    <Input
                      value={entry.name || ""}
                      onChange={(e) =>
                        setInfoForm((p: any) => ({
                          ...p,
                          [key]: { ...entry, name: e.target.value },
                        }))
                      }
                      className="mt-1 bg-white rounded-xl border-gray-200"
                      data-testid={`input-info-${key}-name`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Subtext</Label>
                    <Input
                      value={entry.subtext || ""}
                      onChange={(e) =>
                        setInfoForm((p: any) => ({
                          ...p,
                          [key]: { ...entry, subtext: e.target.value },
                        }))
                      }
                      className="mt-1 bg-white rounded-xl border-gray-200"
                      data-testid={`input-info-${key}-subtext`}
                    />
                  </div>
                  {entry.linkKey !== undefined && (
                    <div>
                      <Label className="text-xs text-gray-500">Link Key</Label>
                      <Input
                        value={entry.linkKey || ""}
                        onChange={(e) =>
                          setInfoForm((p: any) => ({
                            ...p,
                            [key]: { ...entry, linkKey: e.target.value },
                          }))
                        }
                        className="mt-1 bg-white rounded-xl border-gray-200"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <Switch
                      checked={entry.show ?? true}
                      onCheckedChange={(v) =>
                        setInfoForm((p: any) => ({
                          ...p,
                          [key]: { ...entry, show: v },
                        }))
                      }
                      data-testid={`switch-info-${key}-show`}
                    />
                    <Label>Show</Label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact details: googleReview, email, website, etc. */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-cyan-50 rounded-xl">
            <Link className="w-4 h-4 text-cyan-500" />
          </div>
          <h3 className="font-bold text-gray-800">Contact & Links</h3>
          <span className="text-xs text-gray-400">
            Shown on the customer-facing menu
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTACT_FIELDS.map(({ key, label, placeholder, icon: Icon }) => (
            <div key={key}>
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                {label}
              </Label>
              <Input
                value={contactForm[key] || ""}
                onChange={(e) =>
                  setContactForm((p: any) => ({
                    ...p,
                    [key]: e.target.value,
                  }))
                }
                placeholder={placeholder}
                className="mt-1 bg-gray-50 border-gray-200 rounded-xl"
                data-testid={`input-contact-${key}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Payment Settings
// ═══════════════════════════════════════════════════════════════════════════════
function PaymentSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [upiId, setUpiId] = useState("");

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "payment-details")],
    queryFn: () => apiRequest(api(rid, "payment-details")),
  });

  if (data && !upiId && !isLoading) setUpiId(data.upiId || "");

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "payment-details"), {
        method: "PATCH",
        body: JSON.stringify({ upiId }),
      }),
    onSuccess: () => {
      toast({ title: "Saved", description: "UPI ID updated." });
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle subtitle="Manage your payment settings">
        Payment Settings
      </SectionTitle>
      <div className="max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <Label className="font-semibold text-gray-700">UPI ID</Label>
          <Input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            className="mt-1 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="input-upi-id"
          />
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-green-500 hover:bg-green-600 text-white rounded-xl w-full"
          data-testid="button-save-upi"
        >
          <Save className="w-4 h-4 mr-2" />
          Save UPI ID
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Logo
// ═══════════════════════════════════════════════════════════════════════════════
function LogoSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "logo")],
    queryFn: () => apiRequest(api(rid, "logo")),
  });

  if (data && !url && !isLoading) setUrl(data.url || "");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(rid, file);
      setUrl(uploaded);
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "logo"), {
        method: "PATCH",
        body: JSON.stringify({ url }),
      }),
    onSuccess: () => {
      toast({ title: "Saved", description: "Logo URL updated." });
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle>Logo</SectionTitle>
      <div className="max-w-sm space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center min-h-[120px]">
          {url ? (
            <img
              src={url}
              alt="Current logo"
              className="max-h-32 object-contain"
              onError={(e) => {
                (e.target as any).src =
                  "https://via.placeholder.com/200x100?text=Logo";
              }}
            />
          ) : (
            <div className="flex flex-col items-center text-gray-300">
              <ImageIcon className="w-12 h-12 opacity-30 mb-2" />
              <p className="text-sm">No logo set</p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <Label className="font-semibold text-gray-700">Logo</Label>
          <label
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm text-gray-600"
            data-testid="label-logo-upload"
          >
            <ImageIcon className="w-4 h-4 text-gray-400" />
            <span>{uploading ? "Uploading…" : "Upload from device"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0])}
              data-testid="input-logo-file"
            />
          </label>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste image URL"
            className="bg-gray-50 border-gray-200 rounded-xl"
            data-testid="input-logo-url"
          />
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || uploading}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl w-full"
            data-testid="button-save-logo"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Logo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Call Waiter
// ═══════════════════════════════════════════════════════════════════════════════
function CallWaiterSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [resetConfirm, setResetConfirm] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: [api(rid, "call-waiter")],
    queryFn: () => apiRequest(api(rid, "call-waiter")),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "call-waiter"), {
        method: "PATCH",
        body: JSON.stringify({ called: false }),
      }),
    onSuccess: () => {
      toast({ title: "Reset", description: "Call waiter status reset." });
      setResetConfirm(false);
      refetch();
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionTitle subtitle="Monitor and manage customer call requests">
          Call Waiter
        </SectionTitle>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh"
          data-testid="button-refresh-call-waiter"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="max-w-sm">
        <div
          className={`bg-white rounded-2xl border-2 shadow-sm p-8 text-center transition-all ${data?.called ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}
        >
          <div
            className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${data?.called ? "bg-red-100" : "bg-gray-100"}`}
          >
            <Bell
              className={`w-10 h-10 ${data?.called ? "text-red-500 animate-bounce" : "text-gray-300"}`}
            />
          </div>
          <p className="text-lg font-bold text-gray-800 mb-3">Status</p>
          {data?.called ? (
            <>
              <Badge className="bg-red-100 text-red-700 border-red-300 text-sm px-4 py-1.5 mb-4">
                Customer Called Waiter
              </Badge>
              <div className="mt-4">
                <Button
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                  onClick={() => setResetConfirm(true)}
                  data-testid="button-reset-waiter"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Status
                </Button>
              </div>
            </>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-sm px-4 py-1.5">
              No Active Request
            </Badge>
          )}
        </div>
      </div>

      <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Call Waiter</DialogTitle>
            <DialogDescription>
              Mark the waiter call as resolved?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<any[]>({
    queryKey: [api(rid, "notifications")],
    queryFn: () => apiRequest(api(rid, "notifications")),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(api(rid, `notifications/${id}/read`), {
        method: "PATCH",
        body: "{}",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [api(rid, "notifications")] }),
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "notifications/read-all"), {
        method: "PATCH",
        body: "{}",
      }),
    onSuccess: () => {
      refetch();
      toast({ title: "All marked as read" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(api(rid, `notifications/${id}`), { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [api(rid, "notifications")] }),
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clearAllMutation = useMutation({
    mutationFn: () =>
      apiRequest(api(rid, "notifications"), { method: "DELETE" }),
    onSuccess: () => {
      refetch();
      toast({ title: "All notifications cleared" });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unread = notifications.filter((n: any) => !n.read).length;

  const typeIcon: Record<string, { icon: any; color: string; bg: string }> = {
    call_waiter: { icon: Bell, color: "text-sky-600", bg: "bg-sky-100" },
    reservation: {
      icon: CalendarCheck,
      color: "text-cyan-600",
      bg: "bg-cyan-100",
    },
    customer: { icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    system: { icon: Info, color: "text-gray-500", bg: "bg-gray-100" },
  };

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionTitle
          subtitle={`${unread} unread notification${unread !== 1 ? "s" : ""}`}
        >
          Notifications
        </SectionTitle>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="rounded-xl text-xs gap-1.5"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              className="rounded-xl text-xs gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
              data-testid="button-clear-all-notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 h-9 w-9"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
            data-testid="button-refresh-notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-2">
            <Bell className="w-8 h-8 text-amber-300" />
          </div>
          <p className="font-semibold text-gray-700">No notifications yet</p>
          <p className="text-sm text-gray-400">
            Activity from call waiter, reservations, and more will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const meta = typeIcon[n.type] || typeIcon["system"];
            const IconComp = meta.icon;
            return (
              <div
                key={String(n._id)}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-4 transition-all ${n.read ? "border-gray-100 opacity-70" : "border-amber-200"}`}
                data-testid={`notification-item-${String(n._id)}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}
                >
                  <IconComp className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p
                      className={`font-semibold text-sm ${n.read ? "text-gray-500" : "text-gray-800"}`}
                    >
                      {n.title}
                    </p>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-snug">
                    {n.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markReadMutation.mutate(String(n._id))}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Mark as read"
                      data-testid={`button-mark-read-${String(n._id)}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(String(n._id))}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete notification"
                    data-testid={`button-delete-notification-${String(n._id)}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function RestaurantDashboard() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: restaurant } = useQuery<any>({
    queryKey: ["/api/admin/restaurants", restaurantId],
    queryFn: () => apiRequest(`/api/admin/restaurants/${restaurantId}`),
    enabled: !!restaurantId,
  });

  const navigate = useCallback((section: SectionId) => {
    setActiveSection(section);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const activeSecDef = SECTIONS.find((s) => s.id === activeSection)!;

  const { data: notifData = [] } = useQuery<any[]>({
    queryKey: [restaurantId ? api(restaurantId, "notifications") : "noop"],
    queryFn: () => apiRequest(api(restaurantId!, "notifications")),
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });
  const unreadCount = notifData.filter((n: any) => !n.read).length;

  function renderSection() {
    if (!restaurantId) return null;
    switch (activeSection) {
      case "overview":
        return <OverviewSection rid={restaurantId} />;
      case "menu-items":
        return <MenuItemsSection rid={restaurantId} />;
      case "categories":
        return <CategoriesSection rid={restaurantId} />;
      case "smart-picks":
        return <SmartPicksSection rid={restaurantId} />;
      case "carousel":
        return <CarouselSection rid={restaurantId} />;
      case "coupons":
        return <CouponsSection rid={restaurantId} />;
      case "customers":
        return <CustomersSection rid={restaurantId} />;
      case "reservations":
        return <ReservationsSection rid={restaurantId} />;
      case "social-links":
        return <SocialLinksSection rid={restaurantId} />;
      case "welcome-screen":
      case "restaurant-info":
        return <WelcomeScreenSection rid={restaurantId} />;
      case "payment":
        return <PaymentSection rid={restaurantId} />;
      case "logo":
        return <LogoSection rid={restaurantId} />;
      case "call-waiter":
        return <CallWaiterSection rid={restaurantId} />;
      case "notifications":
        return <NotificationsSection rid={restaurantId} />;
      default:
        return null;
    }
  }

  const initials = restaurant?.name
    ? restaurant.name
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "R";

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300 ease-in-out
          bg-[#E0C350] border-r border-black/10
          ${sidebarOpen ? "w-64" : "w-0 md:w-[72px]"} overflow-hidden`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-center border-b border-white/5 flex-shrink-0 bg-white overflow-hidden">
          {sidebarOpen ? (
            <img
              src={atdmLogo}
              alt="AT Digital Menu"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-full h-auto object-contain block"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <img
              src={atdmLogo}
              alt="AT Digital Menu"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-full h-auto object-contain block"
              data-testid="img-sidebar-logo-collapsed"
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 no-scrollbar">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.id as SectionId)}
                className={`w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 text-left group relative ${
                  sidebarOpen ? "px-3" : "px-0 justify-center"
                } ${
                  isActive
                    ? `${section.bg} text-white`
                    : "text-gray-900 hover:text-gray-900 hover:bg-black/10"
                }`}
                data-testid={`nav-${section.id}`}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: section.color }}
                  />
                )}
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive ? "" : "group-hover:scale-110"
                  } ${!sidebarOpen ? "mx-auto" : ""}`}
                  style={isActive ? { background: section.color + "33" } : {}}
                >
                  {SECTION_IMAGES[section.id] ? (
                    <img
                      src={SECTION_IMAGES[section.id]}
                      alt={section.label}
                      className="w-12 h-12 flex-shrink-0 object-contain"
                    />
                  ) : (
                    <section.icon
                      className="w-9 h-9 flex-shrink-0"
                      style={isActive ? { color: section.color } : {}}
                    />
                  )}
                </div>
                {sidebarOpen && (
                  <span
                    className={`text-sm font-medium truncate ${isActive ? "text-white" : ""}`}
                  >
                    {section.label}
                  </span>
                )}
                {sidebarOpen &&
                  section.id === "notifications" &&
                  unreadCount > 0 &&
                  !isActive && (
                    <div className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    </div>
                  )}
                {isActive && sidebarOpen && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: section.color }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        {sidebarOpen && (
          <div className="p-3 border-t border-white/5 flex-shrink-0">
            <button
              onClick={() => setLocation("/admin/dashboard")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-900 hover:text-gray-900 hover:bg-black/10 transition-all text-sm"
              data-testid="button-back-sidebar"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span>Back to Admin</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "md:ml-64" : "md:ml-[72px]"}`}
      >
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center gap-4">
          {/* Toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: activeSecDef.color + "22" }}
              >
                <activeSecDef.icon
                  className="w-3 h-3"
                  style={{ color: activeSecDef.color }}
                />
              </div>
              <span className="font-semibold text-gray-800">
                {activeSecDef.label}
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              onClick={() => navigate("notifications")}
              data-testid="button-notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </div>
              )}
            </button>
            <Button
              size="sm"
              onClick={() => setLocation("/admin/dashboard")}
              className="bg-gray-900 hover:bg-gray-700 text-white rounded-xl hidden sm:flex items-center gap-2"
              data-testid="button-back-to-admin"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">{renderSection()}</div>
        </main>
      </div>
    </div>
  );
}
