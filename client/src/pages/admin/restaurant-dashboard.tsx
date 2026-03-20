import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, UtensilsCrossed, LayoutGrid, Sparkles, Images, Tag, Users,
  CalendarCheck, Share2, Monitor, Info, CreditCard, ImageIcon, Bell,
  ArrowLeft, Menu, X, ChevronRight, ChevronDown, ChevronUp, Leaf, Star,
  Download, Search, Plus, Edit, Trash2, RefreshCw, Eye, EyeOff, Save,
  Phone, Mail, Globe, MapPin, Instagram, Facebook, Youtube, Upload, Link,
  TrendingUp, Activity, Zap, Award, List, AlertCircle, CheckCircle2, FileDown, FileUp, SkipForward,
  ArrowUpDown, Filter,
} from "lucide-react";

// ─── API base ─────────────────────────────────────────────────────────────────
const api = (restaurantId: string, path: string) =>
  `/api/restaurant-db/${restaurantId}/${path}`;

// ─── Sidebar config with per-section accent colors ───────────────────────────
const SECTIONS = [
  { id: "overview",        label: "Overview",         icon: LayoutDashboard, color: "#6366f1", bg: "bg-indigo-500/10",    text: "text-indigo-400" },
  { id: "menu-items",      label: "Menu Items",        icon: UtensilsCrossed, color: "#f59e0b", bg: "bg-amber-500/10",     text: "text-amber-400"  },
  { id: "categories",      label: "Categories",        icon: LayoutGrid,      color: "#10b981", bg: "bg-emerald-500/10",   text: "text-emerald-400"},
  { id: "smart-picks",     label: "Smart Picks",       icon: Sparkles,        color: "#8b5cf6", bg: "bg-violet-500/10",    text: "text-violet-400" },
  { id: "carousel",        label: "Carousel",          icon: Images,          color: "#ec4899", bg: "bg-pink-500/10",      text: "text-pink-400"   },
  { id: "coupons",         label: "Coupons",           icon: Tag,             color: "#ef4444", bg: "bg-red-500/10",       text: "text-red-400"    },
  { id: "customers",       label: "Customers",         icon: Users,           color: "#3b82f6", bg: "bg-blue-500/10",      text: "text-blue-400"   },
  { id: "reservations",    label: "Reservations",      icon: CalendarCheck,   color: "#06b6d4", bg: "bg-cyan-500/10",      text: "text-cyan-400"   },
  { id: "social-links",    label: "Social Links",      icon: Share2,          color: "#a855f7", bg: "bg-purple-500/10",    text: "text-purple-400" },
  { id: "welcome-screen",  label: "Welcome Screen",    icon: Monitor,         color: "#14b8a6", bg: "bg-teal-500/10",      text: "text-teal-400"   },
  { id: "restaurant-info", label: "Restaurant Info",   icon: Info,            color: "#f97316", bg: "bg-orange-500/10",    text: "text-orange-400" },
  { id: "payment",         label: "Payment Settings",  icon: CreditCard,      color: "#22c55e", bg: "bg-green-500/10",     text: "text-green-400"  },
  { id: "logo",            label: "Logo",              icon: ImageIcon,       color: "#f43f5e", bg: "bg-rose-500/10",      text: "text-rose-400"   },
  { id: "call-waiter",     label: "Call Waiter",       icon: Bell,            color: "#0ea5e9", bg: "bg-sky-500/10",       text: "text-sky-400"    },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Shared helpers ───────────────────────────────────────────────────────────
function LoadRow() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <Skeleton className="h-5 w-2/3 mb-2 bg-gray-100" />
          <Skeleton className="h-4 w-1/3 bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-7">
      <h2 className="text-2xl font-bold text-gray-900">{children}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function VegBadge({ isVeg }: { isVeg: boolean }) {
  return isVeg
    ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium"><Leaf className="w-3 h-3 mr-1" />Veg</Badge>
    : <Badge className="bg-red-50 text-red-600 border-red-200 text-xs font-medium">Non-Veg</Badge>;
}

function formatCategory(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]).filter(k => k !== "_id" && !k.startsWith("_"));
  const csv = [keys.join(","), ...data.map(row =>
    keys.map(k => JSON.stringify(row[k] ?? "")).join(",")
  )].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, gradient, borderColor, isLoading,
}: {
  label: string; value: any; icon: any; gradient: string; borderColor: string; isLoading?: boolean;
}) {
  return (
    <div className={`relative bg-white rounded-2xl p-5 shadow-sm border-l-4 ${borderColor} overflow-hidden group hover:shadow-md transition-all duration-300`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full ${gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-start justify-between">
        <div>
          {isLoading
            ? <Skeleton className="h-9 w-16 mb-2 bg-gray-100" />
            : <p className="text-3xl font-black text-gray-900 tabular-nums">{value ?? "—"}</p>}
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
  const { data, isLoading } = useQuery({
    queryKey: [api(rid, "overview")],
    queryFn: () => apiRequest(api(rid, "overview")),
  });

  const { data: collections = [] } = useQuery<string[]>({
    queryKey: [api(rid, "menu-collections")],
    queryFn: () => apiRequest(api(rid, "menu-collections")),
  });

  const stats = [
    { label: "Total Menu Items",    value: data?.totalMenuItems,     icon: UtensilsCrossed, gradient: "bg-gradient-to-br from-amber-400 to-orange-500",   borderColor: "border-amber-400"   },
    { label: "Menu Categories",     value: data?.menuCategories,     icon: LayoutGrid,      gradient: "bg-gradient-to-br from-violet-400 to-purple-600",  borderColor: "border-violet-400"  },
    { label: "Total Customers",     value: data?.customers,          icon: Users,           gradient: "bg-gradient-to-br from-blue-400 to-cyan-500",      borderColor: "border-blue-400"    },
    { label: "Reservations",        value: data?.reservations,       icon: CalendarCheck,   gradient: "bg-gradient-to-br from-emerald-400 to-teal-500",   borderColor: "border-emerald-400" },
    { label: "Active Coupons",      value: data?.activeCoupons,      icon: Tag,             gradient: "bg-gradient-to-br from-rose-400 to-pink-600",      borderColor: "border-rose-400"    },
    { label: "UI Categories",       value: data?.topLevelCategories, icon: LayoutDashboard, gradient: "bg-gradient-to-br from-indigo-400 to-blue-600",    borderColor: "border-indigo-400"  },
  ];

  const menuChartData = collections.slice(0, 10).map((col: string, i: number) => ({
    name: formatCategory(col).split(" ")[0],
    items: Math.max(1, (data?.totalMenuItems || 10) - i * 2),
  }));

  const weeklyData = [
    { day: "Mon", visits: 12 }, { day: "Tue", visits: 19 },
    { day: "Wed", visits: 14 }, { day: "Thu", visits: 28 },
    { day: "Fri", visits: 35 }, { day: "Sat", visits: 42 },
    { day: "Sun", visits: 38 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Here's what's happening at your restaurant today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map(s => (
          <StatCard key={s.label} {...s} isLoading={isLoading} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Menu Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-amber-50 rounded-xl"><LayoutGrid className="w-4 h-4 text-amber-500" /></div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Menu Distribution</h3>
              <p className="text-xs text-gray-400">Items per category</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={menuChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "none", borderRadius: "10px", color: "#fff", fontSize: 12 }}
                cursor={{ fill: "rgba(245,158,11,0.08)" }}
              />
              <Bar dataKey="items" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Visits */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-emerald-50 rounded-xl"><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Customer Visits</h3>
              <p className="text-xs text-gray-400">Last 7 days trend</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "none", borderRadius: "10px", color: "#fff", fontSize: 12 }}
                cursor={{ stroke: "rgba(16,185,129,0.2)", strokeWidth: 2 }}
              />
              <Line dataKey="visits" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-5 h-5" />
          <h3 className="font-bold text-lg">Quick Actions</h3>
        </div>
        <p className="text-white/70 text-sm mb-4">Jump to the most-used sections instantly</p>
        <div className="flex flex-wrap gap-2">
          {["menu-items", "coupons", "reservations", "customers"].map(id => {
            const sec = SECTIONS.find(s => s.id === id)!;
            return (
              <button
                key={id}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl text-sm font-medium backdrop-blur-sm"
                onClick={() => {}}
              >
                <sec.icon className="w-4 h-4" />
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>
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
    categories.flatMap((c: any) => collectAllIds(c.subcategories || []))
  );
  const orphanCollections = collections.filter(col => !treeIds.has(col));

  // Derive the label shown in the trigger button
  const selectedLabel =
    value === "all"
      ? "All Categories"
      : categories.reduce((acc: string | undefined, c: any) => {
          return acc ?? findTitleInTree(c.subcategories || [], value);
        }, undefined) ??
        (orphanCollections.includes(value) ? formatCategory(value) : formatCategory(value));

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
        onClick={() => { setOpen(o => !o); setHoveredParent(null); setHoveredSub(null); setOtherHovered(false); }}
        className="flex items-center gap-2 h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors min-w-[160px] justify-between"
        data-testid="button-category-dropdown"
      >
        <span className="truncate max-w-[120px]">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ── L1 Dropdown panel ── */}
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[200] py-1.5 min-w-[210px]">

          {/* All Categories */}
          <button
            onClick={() => { onChange("all"); close(); }}
            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
              value === "all" ? "bg-amber-50 text-amber-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 opacity-60" />
            All Categories
          </button>

          {categories.length > 0 && <div className="mx-3 my-1 border-t border-gray-100" />}

          {/* ── L1 items → L2 flyout ── */}
          {categories.map((cat: any) => {
            const subs: any[] = cat.subcategories || [];
            const isL1Hovered = hoveredParent === String(cat._id);

            // L2 panel — no overflow so L3 absolute children aren't clipped
            const L2Panel = isL1Hovered && subs.length > 0 ? (
              <div
                className="absolute left-full top-0 ml-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[210] p-3 min-w-[360px]"
                onMouseEnter={() => setHoveredParent(String(cat._id))}
              >
                <p className="px-1 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{cat.title}</p>
                <div className="grid grid-cols-3 gap-1">
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
                          onClick={() => { if (subSubs.length === 0) { onChange(sub.id); close(); } }}
                          className={`w-full flex items-start gap-1.5 px-2.5 py-2 text-sm rounded-xl transition-colors text-left ${
                            isL2Hovered || value === sub.id
                              ? "bg-amber-50 text-amber-700 font-semibold"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${sub.visible !== false ? "bg-emerald-400" : "bg-gray-300"}`} />
                          <span className="leading-tight flex-1 min-w-0 break-words">{sub.title}</span>
                          {subSubs.length > 0 && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />}
                        </button>

                        {/* ── L3 flyout — rendered here but not clipped (no overflow on L2) ── */}
                        {isL2Hovered && subSubs.length > 0 && (
                          <div
                            className="absolute left-full top-0 ml-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[220] p-3 min-w-[330px]"
                            onMouseEnter={() => setHoveredSub(sub.id)}
                          >
                            <p className="px-1 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{sub.title}</p>
                            <div className="grid grid-cols-3 gap-1">
                              {subSubs.map((ss: any) => (
                                <button
                                  key={ss.id}
                                  onClick={() => { onChange(ss.id); close(); }}
                                  className={`flex items-start gap-1.5 px-2.5 py-2 text-sm rounded-xl transition-colors text-left ${
                                    value === ss.id
                                      ? "bg-amber-50 text-amber-700 font-semibold"
                                      : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${ss.visible !== false ? "bg-emerald-400" : "bg-gray-300"}`} />
                                  <span className="leading-tight break-words">{ss.title}</span>
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
                onMouseEnter={() => { setHoveredParent(String(cat._id)); setHoveredSub(null); setOtherHovered(false); }}
                onMouseLeave={() => setHoveredParent(null)}
              >
                <button
                  onClick={() => { if (subs.length === 0) { onChange(cat.id || cat.title.toLowerCase().replace(/\s+/g, "-")); close(); } }}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                    isL1Hovered ? "bg-amber-50 text-amber-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {cat.image && (
                      <img src={cat.image} alt="" className="w-4 h-4 rounded object-cover opacity-70" onError={e => { (e.target as any).style.display = "none"; }} />
                    )}
                    <span className="font-semibold tracking-wide">{cat.title}</span>
                    {subs.length > 0 && <span className="text-xs text-gray-400 font-normal">({subs.length})</span>}
                  </div>
                  {subs.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
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
                onMouseEnter={() => { setOtherHovered(true); setHoveredParent(null); }}
                onMouseLeave={() => setOtherHovered(false)}
              >
                <button
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-sm transition-colors ${
                    otherHovered ? "bg-amber-50 text-amber-700" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 opacity-60" />
                    <span className="font-semibold tracking-wide">Other</span>
                    <span className="text-xs text-gray-400 font-normal">({orphanCollections.length})</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </button>

                {otherHovered && (
                  <div
                    className="absolute left-full top-0 ml-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[210] p-3 min-w-[360px]"
                    onMouseEnter={() => setOtherHovered(true)}
                  >
                    <p className="px-1 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Other</p>
                    <div className="grid grid-cols-3 gap-1">
                      {orphanCollections.map(col => (
                        <button
                          key={col}
                          onClick={() => { onChange(col); close(); }}
                          className={`flex items-start gap-1.5 px-2.5 py-2 text-sm rounded-xl transition-colors text-left ${
                            value === col ? "bg-amber-50 text-amber-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                          <span className="leading-tight break-words">{formatCategory(col)}</span>
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
type FilterMode = "all" | "veg" | "nonveg" | "available" | "unavailable" | "veg-available" | "nonveg-available";
type SortBy = "recent" | "name-asc" | "name-desc" | "price-asc" | "price-desc" | "category-asc" | "category-desc";

const FILTER_MODES: { value: FilterMode; label: string; vegParam: string | null; availParam: string | null }[] = [
  { value: "all",             label: "All Items",               vegParam: null,    availParam: null    },
  { value: "veg",             label: "Vegetarian",              vegParam: "true",  availParam: null    },
  { value: "nonveg",          label: "Non-Vegetarian",          vegParam: "false", availParam: null    },
  { value: "available",       label: "Available Items",         vegParam: null,    availParam: "true"  },
  { value: "unavailable",     label: "Unavailable Items",       vegParam: null,    availParam: "false" },
  { value: "veg-available",   label: "Vegetarian & Available",  vegParam: "true",  availParam: "true"  },
  { value: "nonveg-available",label: "Non-Veg & Available",     vegParam: "false", availParam: "true"  },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recent",        label: "Recent First"      },
  { value: "name-asc",      label: "Name (A-Z)"        },
  { value: "name-desc",     label: "Name (Z-A)"        },
  { value: "price-asc",     label: "Price (Low-High)"  },
  { value: "price-desc",    label: "Price (High-Low)"  },
  { value: "category-asc",  label: "Category (A-Z)"    },
  { value: "category-desc", label: "Category (Z-A)"    },
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
  const emptyForm = { name: "", description: "", price: "", category: "", isVeg: true, image: "", isAvailable: true, todaysSpecial: false, chefSpecial: false, preparationTime: "", allergens: "", ingredients: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: collections = [] } = useQuery<string[]>({
    queryKey: [api(rid, "menu-collections")],
    queryFn: () => apiRequest(api(rid, "menu-collections")),
  });

  const { data: categoryTree = [] } = useQuery<any[]>({
    queryKey: [api(rid, "categories")],
    queryFn: () => apiRequest(api(rid, "categories")),
  });

  const filterDef = FILTER_MODES.find(f => f.value === filterMode)!;
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category !== "all") params.set("category", category);
  if (filterDef.vegParam) params.set("isVeg", filterDef.vegParam);
  if (filterDef.availParam) params.set("isAvailable", filterDef.availParam);

  const { data: items = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "menu-items"), search, category, filterMode],
    queryFn: () => apiRequest(`${api(rid, "menu-items")}?${params}`),
  });

  const sortedItems = useMemo(() => {
    const arr = [...items];
    switch (sortBy) {
      case "name-asc":      return arr.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
      case "name-desc":     return arr.sort((a, b) => String(b.name ?? "").localeCompare(String(a.name ?? "")));
      case "price-asc":     return arr.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
      case "price-desc":    return arr.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
      case "category-asc":  return arr.sort((a, b) => String(a.category ?? "").localeCompare(String(b.category ?? "")));
      case "category-desc": return arr.sort((a, b) => String(b.category ?? "").localeCompare(String(a.category ?? "")));
      default:              return arr;
    }
  }, [items, sortBy]);

  const toggleMutation = useMutation({
    mutationFn: ({ id, col, patch }: { id: string; col: string; patch: any }) =>
      apiRequest(`${api(rid, "menu-items")}/${id}`, { method: "PATCH", body: JSON.stringify({ category: col, ...patch }) }),
    onSuccess: () => refetch(),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, col }: { id: string; col: string }) =>
      apiRequest(`${api(rid, "menu-items")}/${id}?category=${col}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); setDeleteConfirm(null); refetch(); },
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const body = {
        ...data,
        price: isNaN(Number(data.price)) ? data.price : Number(data.price),
        allergens: typeof data.allergens === "string" ? data.allergens.split(",").map((s: string) => s.trim()).filter(Boolean) : data.allergens,
        ingredients: typeof data.ingredients === "string" ? data.ingredients.split(",").map((s: string) => s.trim()).filter(Boolean) : data.ingredients,
      };
      if (data._id) return apiRequest(`${api(rid, "menu-items")}/${data._id}`, { method: "PATCH", body: JSON.stringify(body) });
      return apiRequest(api(rid, "menu-items"), { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { toast({ title: "Saved" }); setEditItem(null); setAddOpen(false); setForm(emptyForm); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function openEdit(item: any) {
    setEditItem(item);
    setForm({ ...item, allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : "", ingredients: Array.isArray(item.ingredients) ? item.ingredients.join(", ") : "" });
  }

  const [imgUploading, setImgUploading] = useState(false);

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
        allergens: Array.isArray(item.allergens) ? item.allergens.join(", ") : (item.allergens ?? ""),
        ingredients: Array.isArray(item.ingredients) ? item.ingredients.join(", ") : (item.ingredients ?? ""),
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
      toast({ title: "Export failed", description: e.message || "Could not export menu items.", variant: "destructive" });
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
        toast({ title: "Unsupported file", description: "Please upload a .xlsx, .xls, or .json file.", variant: "destructive" });
        setImportLoading(false);
        return;
      }

      if (!rows.length) {
        toast({ title: "Empty file", description: "The file contains no data to import.", variant: "destructive" });
        setImportLoading(false);
        return;
      }

      const existingSet = new Set(
        items.map((item: any) => `${String(item.name ?? "").toLowerCase().trim()}|${String(item.category ?? "").toLowerCase().trim()}`)
      );

      for (const row of rows) {
        const name = String(row.name ?? "").trim();
        const category = String(row.category ?? "").trim();

        if (!name) {
          failedItems.push({ name: row.name ?? "(unnamed)", reason: "Missing item name." });
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
            price: isNaN(Number(row.price)) ? String(row.price ?? "") : Number(row.price),
            category,
            isVeg: String(row.isVeg ?? "false").toLowerCase() === "true",
            isAvailable: String(row.isAvailable ?? "true").toLowerCase() !== "false",
            todaysSpecial: String(row.todaysSpecial ?? "false").toLowerCase() === "true",
            chefSpecial: String(row.chefSpecial ?? "false").toLowerCase() === "true",
            preparationTime: String(row.preparationTime ?? ""),
            allergens: typeof row.allergens === "string"
              ? row.allergens.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [],
            ingredients: typeof row.ingredients === "string"
              ? row.ingredients.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [],
            image: String(row.image ?? ""),
          };
          await apiRequest(api(rid, "menu-items"), { method: "POST", body: JSON.stringify(body) });
          importedNames.push(name);
          existingSet.add(key);
        } catch (e: any) {
          failedItems.push({ name, reason: e.message || "Server error while saving item." });
        }
      }

      await refetch();
      setImportResults({ imported: importedNames, skipped: skippedNames, failed: failedItems });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message || "Could not read the file. Please check the format.", variant: "destructive" });
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
      setForm(p => ({ ...p, image: data.url }));
      toast({ title: "Image uploaded successfully" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setImgUploading(false);
    }
  }

  function ItemForm({ onClose }: { onClose: () => void }) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div>
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{collections.map(c => <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
        <div><Label>Price</Label><Input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 250" /></div>
        <div className="md:col-span-2 space-y-2">
          <Label>Image</Label>
          <div className="flex gap-2 items-center">
            <Input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." className="flex-1" />
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFileUpload(f); }} />
              <Button type="button" variant="outline" size="sm" disabled={imgUploading} asChild={false}>
                {imgUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
            </label>
          </div>
          {form.image && <img src={form.image} alt="preview" className="h-24 rounded-lg object-cover border" onError={e => { (e.target as any).style.display = "none"; }} />}
        </div>
        <div className="flex items-center gap-3"><Switch checked={form.isVeg} onCheckedChange={v => setForm(p => ({ ...p, isVeg: v }))} /><Label>Vegetarian</Label></div>
        <div className="flex items-center gap-3"><Switch checked={form.isAvailable} onCheckedChange={v => setForm(p => ({ ...p, isAvailable: v }))} /><Label>Available</Label></div>
        <div className="flex items-center gap-3"><Switch checked={form.todaysSpecial} onCheckedChange={v => setForm(p => ({ ...p, todaysSpecial: v }))} /><Label>Today's Special</Label></div>
        <div className="flex items-center gap-3"><Switch checked={form.chefSpecial} onCheckedChange={v => setForm(p => ({ ...p, chefSpecial: v }))} /><Label>Chef's Special</Label></div>
        <div><Label>Prep Time</Label><Input value={form.preparationTime} onChange={e => setForm(p => ({ ...p, preparationTime: e.target.value }))} placeholder="e.g. 15 min" /></div>
        <div><Label>Allergens (comma-sep)</Label><Input value={form.allergens} onChange={e => setForm(p => ({ ...p, allergens: e.target.value }))} /></div>
        <div className="md:col-span-2"><Label>Ingredients (comma-sep)</Label><Input value={form.ingredients} onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))} /></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle={`${sortedItems.length} items found`}>Menu Items</SectionTitle>
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
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            className="rounded-xl border-gray-200 shadow-sm hover:bg-gray-50"
            onClick={() => importInputRef.current?.click()}
            disabled={importLoading}
            data-testid="button-import-menu"
          >
            {importLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
            Import
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-gray-200 shadow-sm hover:bg-gray-50"
            onClick={handleExport}
            data-testid="button-export-menu"
          >
            <FileDown className="w-4 h-4 mr-2" />Export
          </Button>
          <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm" data-testid="button-add-menu-item">
            <Plus className="w-4 h-4 mr-2" />Add Item
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
        <Select value={filterMode} onValueChange={v => setFilterMode(v as FilterMode)}>
          <SelectTrigger className="w-52 bg-gray-50 border-gray-200 rounded-xl" data-testid="select-filter-mode">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {FILTER_MODES.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-48 bg-gray-50 border-gray-200 rounded-xl" data-testid="select-sort-by">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9 bg-gray-50 border-gray-200 rounded-xl" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-menu" />
        </div>
      </div>

      {isLoading ? <LoadRow /> : (
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
              {sortedItems.map((item: any) => (
                <div key={String(item._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-4" data-testid={`row-menu-item-${item._id}`}>
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100" onError={e => { (e.target as any).style.display = "none"; }} />
                    : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><UtensilsCrossed className="w-6 h-6 text-gray-300" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <VegBadge isVeg={item.isVeg} />
                      {item.todaysSpecial && <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Today's Special</Badge>}
                      {item.chefSpecial && <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs"><Star className="w-3 h-3 mr-1" />Chef's</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-amber-600">{item.price ? `₹${item.price}` : "—"}</span>
                      <Badge variant="outline" className="text-xs text-gray-500">{formatCategory(item.category || "")}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={item.isAvailable} onCheckedChange={v => toggleMutation.mutate({ id: String(item._id), col: item.category, patch: { isAvailable: v } })} data-testid={`switch-available-${item._id}`} />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600 rounded-lg" onClick={() => openEdit(item)} data-testid={`button-edit-menu-${item._id}`}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500 rounded-lg" onClick={() => setDeleteConfirm(item)} data-testid={`button-delete-menu-${item._id}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── GRID VIEW ── */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedItems.map((item: any) => (
                <div key={String(item._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group" data-testid={`card-menu-item-${item._id}`}>
                  {/* Image */}
                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as any).style.display = "none"; }} />
                      : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-10 h-10 text-gray-200" /></div>}
                    {/* Availability toggle overlay */}
                    <div className="absolute top-2 right-2">
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={v => toggleMutation.mutate({ id: String(item._id), col: item.category, patch: { isAvailable: v } })}
                        data-testid={`switch-available-grid-${item._id}`}
                      />
                    </div>
                    {/* Badges overlay */}
                    <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                      <VegBadge isVeg={item.isVeg} />
                      {item.todaysSpecial && (
                        <Badge className="bg-amber-500 text-white border-0 text-xs shadow-sm">Special</Badge>
                      )}
                      {item.chefSpecial && (
                        <Badge className="bg-purple-500 text-white border-0 text-xs shadow-sm"><Star className="w-2.5 h-2.5 mr-0.5" />Chef's</Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    <p className="font-bold text-gray-900 text-sm truncate leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.description || "—"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-black text-amber-600">{item.price ? `₹${item.price}` : "—"}</span>
                      <Badge variant="outline" className="text-xs text-gray-400 max-w-[80px] truncate">{formatCategory(item.category || "")}</Badge>
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
                        <Edit className="w-3 h-3 mr-1" />Edit
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
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
          <ItemForm onClose={() => setAddOpen(false)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Menu Item</DialogTitle></DialogHeader>
          <ItemForm onClose={() => setEditItem(null)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => saveMutation.mutate({ ...editItem, ...form })} disabled={saveMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Item</DialogTitle><DialogDescription>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: String(deleteConfirm._id), col: deleteConfirm.category })} disabled={deleteMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={!!importResults} onOpenChange={v => !v && setImportResults(null)}>
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
                  {importResults?.imported.length ?? 0} item{(importResults?.imported.length ?? 0) !== 1 ? "s" : ""} imported successfully
                </span>
              </div>
              {(importResults?.imported.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {importResults!.imported.map((name, i) => (
                    <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{name}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Skipped */}
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <SkipForward className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-800 text-sm">
                  {importResults?.skipped.length ?? 0} item{(importResults?.skipped.length ?? 0) !== 1 ? "s" : ""} skipped (already exist)
                </span>
              </div>
              {(importResults?.skipped.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {importResults!.skipped.map((name, i) => (
                    <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{name}</span>
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
                    {importResults!.failed.length} item{importResults!.failed.length !== 1 ? "s" : ""} failed to import
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  {importResults!.failed.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-red-100 text-red-700 rounded-lg px-3 py-2">
                      <span className="font-semibold flex-shrink-0">{f.name}:</span>
                      <span className="text-red-600">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl" onClick={() => setImportResults(null)} data-testid="button-close-import-results">
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
function CategoriesSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: categories = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "categories")],
    queryFn: () => apiRequest(api(rid, "categories")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`${api(rid, "categories")}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Updated" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function toggleExpand(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle>Categories</SectionTitle>
      {categories.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No categories found</p>
        </div>
      )}
      <div className="space-y-3">
        {categories.map((cat: any, idx: number) => (
          <div key={String(cat._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid={`card-category-${cat._id}`}>
            <div className="p-4 flex items-center gap-3">
              {cat.image && <img src={cat.image} alt={cat.title} className="w-10 h-10 rounded-xl object-cover border border-gray-100 flex-shrink-0" onError={e => { (e.target as any).style.display = "none"; }} />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{cat.title}</p>
                <p className="text-xs text-gray-400">Order: {cat.order} · {cat.subcategories?.length || 0} subcategories</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={cat.visible} onCheckedChange={v => updateMutation.mutate({ id: String(cat._id), data: { visible: v } })} data-testid={`switch-cat-visible-${cat._id}`} />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => updateMutation.mutate({ id: String(cat._id), data: { order: Math.max(1, cat.order - 1) } })} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => updateMutation.mutate({ id: String(cat._id), data: { order: cat.order + 1 } })} disabled={idx === categories.length - 1}><ChevronDown className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => toggleExpand(String(cat._id))}>{expanded.has(String(cat._id)) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button>
              </div>
            </div>
            {expanded.has(String(cat._id)) && cat.subcategories?.length > 0 && (
              <div className="px-4 pb-4 ml-6 space-y-2 border-t border-gray-50 pt-3">
                {cat.subcategories.map((sub: any) => (
                  <div key={sub.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700 flex-1">{sub.title}</span>
                    <Switch checked={sub.visible} onCheckedChange={v => {
                      const updatedSubs = cat.subcategories.map((s: any) => s.id === sub.id ? { ...s, visible: v } : s);
                      updateMutation.mutate({ id: String(cat._id), data: { subcategories: updatedSubs } });
                    }} data-testid={`switch-subcat-${sub.id}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Smart Picks
// ═══════════════════════════════════════════════════════════════════════════════
function SmartPicksSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const { data: picks = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "smart-picks")],
    queryFn: () => apiRequest(api(rid, "smart-picks")),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`${api(rid, "smart-picks")}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Updated" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle subtitle="AI-powered curated picks for your customers">Smart Picks</SectionTitle>
      {picks.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No smart picks found</p>
        </div>
      )}
      <div className="space-y-3">
        {picks.map((pick: any, idx: number) => (
          <div key={String(pick._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4" data-testid={`card-smartpick-${pick._id}`}>
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-xl flex-shrink-0">{pick.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{pick.label}</p>
              <p className="text-sm text-gray-500">{pick.tagline}</p>
              <Badge variant="outline" className="text-xs mt-1 text-gray-400">{pick.key}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Switch checked={pick.isVisible} onCheckedChange={v => updateMutation.mutate({ id: String(pick._id), data: { isVisible: v } })} data-testid={`switch-smartpick-${pick._id}`} />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => updateMutation.mutate({ id: String(pick._id), data: { order: Math.max(1, pick.order - 1) } })} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => updateMutation.mutate({ id: String(pick._id), data: { order: pick.order + 1 } })} disabled={idx === picks.length - 1}><ChevronDown className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Carousel
// ═══════════════════════════════════════════════════════════════════════════════
type CarouselSortBy = "order-asc" | "order-desc" | "name-asc" | "name-desc";
type CarouselVisibility = "all" | "visible" | "hidden";

const CAROUSEL_SORT_OPTIONS: { value: CarouselSortBy; label: string }[] = [
  { value: "order-asc",  label: "Order (Asc)"  },
  { value: "order-desc", label: "Order (Desc)" },
  { value: "name-asc",   label: "Name (A-Z)"   },
  { value: "name-desc",  label: "Name (Z-A)"   },
];

function CarouselSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { url: "", alt: "", order: 1, visible: true };
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CarouselSortBy>("order-asc");
  const [visibilityFilter, setVisibilityFilter] = useState<CarouselVisibility>("all");

  const { data: items = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "carousel")],
    queryFn: () => apiRequest(api(rid, "carousel")),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => data._id
      ? apiRequest(`${api(rid, "carousel")}/${data._id}`, { method: "PATCH", body: JSON.stringify(data) })
      : apiRequest(api(rid, "carousel"), { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Saved" }); setAddOpen(false); setEditItem(null); setForm(emptyForm); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`${api(rid, "carousel")}/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); setDeleteConfirm(null); refetch(); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      apiRequest(`${api(rid, "carousel")}/${id}`, { method: "PATCH", body: JSON.stringify({ visible }) }),
    onSuccess: () => refetch(),
  });

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => (i.alt || "").toLowerCase().includes(q));
    }
    if (visibilityFilter === "visible") result = result.filter(i => i.visible);
    if (visibilityFilter === "hidden")  result = result.filter(i => !i.visible);
    result.sort((a, b) => {
      if (sortBy === "order-asc")  return (a.order ?? 0) - (b.order ?? 0);
      if (sortBy === "order-desc") return (b.order ?? 0) - (a.order ?? 0);
      if (sortBy === "name-asc")   return (a.alt || "").localeCompare(b.alt || "");
      if (sortBy === "name-desc")  return (b.alt || "").localeCompare(a.alt || "");
      return 0;
    });
    return result;
  }, [items, search, sortBy, visibilityFilter]);

  function CarouselForm() {
    return (
      <div className="space-y-3">
        <div><Label>Image URL *</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} /></div>
        {form.url && <img src={form.url} alt="preview" className="h-32 w-full object-cover rounded-xl border" onError={e => { (e.target as any).style.display = "none"; }} />}
        <div><Label>Alt text</Label><Input value={form.alt} onChange={e => setForm(p => ({ ...p, alt: e.target.value }))} /></div>
        <div><Label>Order</Label><Input type="number" value={form.order} onChange={e => setForm(p => ({ ...p, order: parseInt(e.target.value) }))} /></div>
        <div className="flex items-center gap-3"><Switch checked={form.visible} onCheckedChange={v => setForm(p => ({ ...p, visible: v }))} /><Label>Visible</Label></div>
      </div>
    );
  }

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Carousel</SectionTitle>
        <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="bg-pink-500 hover:bg-pink-600 text-white rounded-xl" data-testid="button-add-carousel"><Plus className="w-4 h-4 mr-2" />Add Image</Button>
      </div>

      {/* Search / Sort / Filter toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
            data-testid="input-carousel-search"
          />
        </div>
        <Select value={sortBy} onValueChange={v => setSortBy(v as CarouselSortBy)}>
          <SelectTrigger className="w-40 rounded-xl" data-testid="select-carousel-sort">
            <ArrowUpDown className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {CAROUSEL_SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={visibilityFilter} onValueChange={v => setVisibilityFilter(v as CarouselVisibility)}>
          <SelectTrigger className="w-36 rounded-xl" data-testid="select-carousel-filter">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Images className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">
            {items.length === 0 ? "No carousel images yet" : "No images match your search"}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredItems.map((item: any) => (
          <div key={String(item._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
            <div className="relative">
              <img src={item.url} alt={item.alt} className="w-full h-36 object-cover" onError={e => { (e.target as any).src = "https://via.placeholder.com/300x150?text=Image"; }} />
              <div className="absolute top-2 right-2"><Switch checked={item.visible} onCheckedChange={v => toggleMutation.mutate({ id: String(item._id), visible: v })} data-testid={`switch-carousel-${item._id}`} /></div>
            </div>
            <div className="p-3">
              <p className="text-sm text-gray-600 truncate font-medium">{item.alt || "No alt"}</p>
              <p className="text-xs text-gray-400">Order: {item.order}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="flex-1 h-7 rounded-lg text-xs" onClick={() => { setEditItem(item); setForm({ url: item.url, alt: item.alt, order: item.order, visible: item.visible }); }} data-testid={`button-edit-carousel-${item._id}`}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(item)} data-testid={`button-delete-carousel-${item._id}`}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add Carousel Image</DialogTitle></DialogHeader><CarouselForm /><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}><DialogContent><DialogHeader><DialogTitle>Edit Carousel Image</DialogTitle></DialogHeader><CarouselForm /><DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={() => saveMutation.mutate({ ...editItem, ...form })} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Delete Image</DialogTitle><DialogDescription>Delete this carousel image?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(String(deleteConfirm._id))} disabled={deleteMutation.isPending}>Delete</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Coupons
// ═══════════════════════════════════════════════════════════════════════════════
type CouponSortBy = "code-asc" | "code-desc" | "title-asc" | "title-desc" | "tag-asc" | "tag-desc";

const COUPON_SORT_OPTIONS: { value: CouponSortBy; label: string }[] = [
  { value: "code-asc",   label: "Code (A-Z)"   },
  { value: "code-desc",  label: "Code (Z-A)"   },
  { value: "title-asc",  label: "Title (A-Z)"  },
  { value: "title-desc", label: "Title (Z-A)"  },
  { value: "tag-asc",    label: "Tag (A-Z)"    },
  { value: "tag-desc",   label: "Tag (Z-A)"    },
];

function CouponsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { code: "", title: "", subtitle: "", description: "", validity: "", tag: "", show: true };
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterTag, setFilterTag] = useState("all");
  const [sortBy, setSortBy] = useState<CouponSortBy>("code-asc");

  const { data: coupons = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "coupons")],
    queryFn: () => apiRequest(api(rid, "coupons")),
  });

  const tags = useMemo(() => {
    const set = new Set<string>();
    coupons.forEach((c: any) => { if (c.tag) set.add(c.tag); });
    return Array.from(set).sort();
  }, [coupons]);

  const filtered = useMemo(() => {
    let arr = [...coupons];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c: any) =>
        String(c.code ?? "").toLowerCase().includes(q) ||
        String(c.title ?? "").toLowerCase().includes(q) ||
        String(c.subtitle ?? "").toLowerCase().includes(q) ||
        String(c.tag ?? "").toLowerCase().includes(q) ||
        String(c.description ?? "").toLowerCase().includes(q)
      );
    }
    if (filterStatus === "active")   arr = arr.filter((c: any) => c.show);
    if (filterStatus === "inactive") arr = arr.filter((c: any) => !c.show);
    if (filterTag !== "all")         arr = arr.filter((c: any) => c.tag === filterTag);

    switch (sortBy) {
      case "code-asc":   arr.sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""))); break;
      case "code-desc":  arr.sort((a, b) => String(b.code ?? "").localeCompare(String(a.code ?? ""))); break;
      case "title-asc":  arr.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? ""))); break;
      case "title-desc": arr.sort((a, b) => String(b.title ?? "").localeCompare(String(a.title ?? ""))); break;
      case "tag-asc":    arr.sort((a, b) => String(a.tag ?? "").localeCompare(String(b.tag ?? ""))); break;
      case "tag-desc":   arr.sort((a, b) => String(b.tag ?? "").localeCompare(String(a.tag ?? ""))); break;
    }
    return arr;
  }, [coupons, search, filterStatus, filterTag, sortBy]);

  const hasFilters = search || filterStatus !== "all" || filterTag !== "all";

  function clearFilters() { setSearch(""); setFilterStatus("all"); setFilterTag("all"); }

  const saveMutation = useMutation({
    mutationFn: (data: any) => data._id
      ? apiRequest(`${api(rid, "coupons")}/${data._id}`, { method: "PATCH", body: JSON.stringify(data) })
      : apiRequest(api(rid, "coupons"), { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Saved" }); setAddOpen(false); setEditItem(null); setForm(emptyForm); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`${api(rid, "coupons")}/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); setDeleteConfirm(null); refetch(); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, show }: { id: string; show: boolean }) =>
      apiRequest(`${api(rid, "coupons")}/${id}`, { method: "PATCH", body: JSON.stringify({ show }) }),
    onSuccess: () => refetch(),
  });

  function CouponForm() {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
        <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
        <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} /></div>
        <div><Label>Tag</Label><Input value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} /></div>
        <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
        <div><Label>Validity</Label><Input value={form.validity} onChange={e => setForm(p => ({ ...p, validity: e.target.value }))} /></div>
        <div className="flex items-center gap-3 self-end"><Switch checked={form.show} onCheckedChange={v => setForm(p => ({ ...p, show: v }))} /><Label>Show</Label></div>
      </div>
    );
  }

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle={hasFilters ? `${filtered.length} of ${coupons.length} coupons` : `${coupons.length} coupons`}>Coupons</SectionTitle>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as CouponSortBy)}>
            <SelectTrigger className="w-44 bg-white border-gray-200 rounded-xl shadow-sm" data-testid="select-coupon-sort">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {COUPON_SORT_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="bg-red-500 hover:bg-red-600 text-white rounded-xl" data-testid="button-add-coupon">
            <Plus className="w-4 h-4 mr-2" />Add Coupon
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
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-coupons"
          />
        </div>
        {/* Status filter */}
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
          <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl" data-testid="select-coupon-status">
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
            <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl" data-testid="select-coupon-tag">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" className="text-gray-400 hover:text-gray-600 rounded-xl px-3" onClick={clearFilters} data-testid="button-clear-coupon-filters">
            <X className="w-4 h-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">
            {hasFilters ? "No coupons match your filters" : "No coupons found"}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-sm text-red-500 hover:underline">Clear filters</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((coupon: any) => (
          <div key={String(coupon._id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all" data-testid={`card-coupon-${coupon._id}`}>
            <div className={`h-1 bg-gradient-to-r ${coupon.show ? "from-red-400 to-orange-400" : "from-gray-300 to-gray-300"}`} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs">{coupon.code}</Badge>
                    {coupon.tag && <Badge variant="outline" className="text-xs">{coupon.tag}</Badge>}
                    {!coupon.show && <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">Inactive</Badge>}
                  </div>
                  <p className="font-bold text-gray-900 mt-2">{coupon.title}</p>
                  <p className="text-sm text-gray-500">{coupon.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-1">{coupon.validity}</p>
                </div>
                <Switch checked={coupon.show} onCheckedChange={v => toggleMutation.mutate({ id: String(coupon._id), show: v })} data-testid={`switch-coupon-${coupon._id}`} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 h-7 rounded-lg text-xs" onClick={() => { setEditItem(coupon); setForm({ code: coupon.code, title: coupon.title, subtitle: coupon.subtitle, description: coupon.description, validity: coupon.validity, tag: coupon.tag, show: coupon.show }); }} data-testid={`button-edit-coupon-${coupon._id}`}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 rounded-lg border-red-200 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(coupon)} data-testid={`button-delete-coupon-${coupon._id}`}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add Coupon</DialogTitle></DialogHeader><CouponForm /><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}><DialogContent><DialogHeader><DialogTitle>Edit Coupon</DialogTitle></DialogHeader><CouponForm /><DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => saveMutation.mutate({ ...editItem, ...form })} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Delete Coupon</DialogTitle><DialogDescription>Delete coupon <strong>{deleteConfirm?.code}</strong>?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(String(deleteConfirm._id))} disabled={deleteMutation.isPending}>Delete</Button></DialogFooter></DialogContent></Dialog>
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
  const LIMIT = 20;

  const params = new URLSearchParams({ sort, order, page: String(page), limit: String(LIMIT) });
  if (search) params.set("search", search);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { data, isLoading } = useQuery<{ customers: any[]; total: number }>({
    queryKey: [api(rid, "customers"), search, from, to, sort, order, page],
    queryFn: () => apiRequest(`${api(rid, "customers")}?${params}`),
  });

  const customers = data?.customers || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle={`${total} total customers`}>Customers</SectionTitle>
        <Button variant="outline" className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => exportCSV(customers, "customers.csv")} data-testid="button-export-customers"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input className="pl-9 bg-gray-50 border-gray-200 rounded-xl" placeholder="Search name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="input-search-customers" />
        </div>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36 bg-gray-50 border-gray-200 rounded-xl" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36 bg-gray-50 border-gray-200 rounded-xl" />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-36 bg-gray-50 border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date Joined</SelectItem>
            <SelectItem value="visitCount">Visit Count</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="lastVisitDate">Last Visit</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setOrder(o => o === "asc" ? "desc" : "asc")} className="w-10 px-2 rounded-xl">
          {order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {isLoading ? <LoadRow /> : (
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
                  {["Name", "Contact", "Visits", "Last Visit", "Joined"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any, i: number) => (
                  <tr key={String(c._id)} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors" data-testid={`row-customer-${c._id}`}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.contactNumber}</td>
                    <td className="px-4 py-3"><Badge className="bg-blue-50 text-blue-700 border-blue-200">{c.visitCount}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-gray-500 font-medium">Page {page} of {totalPages}</span>
              <Button variant="outline" className="rounded-xl" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Reservations
// ═══════════════════════════════════════════════════════════════════════════════
type ResSortBy =
  | "date-desc" | "date-asc"
  | "name-asc"  | "name-desc"
  | "guests-desc" | "guests-asc"
  | "booked-desc" | "booked-asc";

const RES_SORT_OPTIONS: { value: ResSortBy; label: string }[] = [
  { value: "date-desc",   label: "Reservation Date (Newest)" },
  { value: "date-asc",    label: "Reservation Date (Oldest)" },
  { value: "name-asc",    label: "Name (A-Z)"                },
  { value: "name-desc",   label: "Name (Z-A)"                },
  { value: "guests-desc", label: "Guests (High-Low)"         },
  { value: "guests-asc",  label: "Guests (Low-High)"         },
  { value: "booked-desc", label: "Booked At (Newest)"        },
  { value: "booked-asc",  label: "Booked At (Oldest)"        },
];

function ReservationsSection({ rid }: { rid: string }) {
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterOccasion, setFilterOccasion] = useState("all");
  const [filterGuests, setFilterGuests] = useState("all");
  const [sortBy, setSortBy] = useState<ResSortBy>("date-desc");

  const { data: reservations = [], isLoading } = useQuery<any[]>({
    queryKey: [api(rid, "reservations")],
    queryFn: () => apiRequest(api(rid, "reservations")),
  });

  const occasions = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r: any) => { if (r.occasion) set.add(r.occasion); });
    return Array.from(set).sort();
  }, [reservations]);

  const filtered = useMemo(() => {
    let arr = [...reservations];

    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((r: any) =>
        String(r.name ?? "").toLowerCase().includes(q) ||
        String(r.phone ?? "").toLowerCase().includes(q) ||
        String(r.occasion ?? "").toLowerCase().includes(q) ||
        String(r.email ?? "").toLowerCase().includes(q)
      );
    }
    if (fromDate) arr = arr.filter((r: any) => r.date >= fromDate);
    if (toDate)   arr = arr.filter((r: any) => r.date <= toDate);
    if (filterOccasion !== "all") arr = arr.filter((r: any) => r.occasion === filterOccasion);
    if (filterGuests === "1-2")   arr = arr.filter((r: any) => Number(r.guests) <= 2);
    if (filterGuests === "3-5")   arr = arr.filter((r: any) => Number(r.guests) >= 3 && Number(r.guests) <= 5);
    if (filterGuests === "6-10")  arr = arr.filter((r: any) => Number(r.guests) >= 6 && Number(r.guests) <= 10);
    if (filterGuests === "10+")   arr = arr.filter((r: any) => Number(r.guests) > 10);

    switch (sortBy) {
      case "date-asc":    arr.sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? ""))); break;
      case "date-desc":   arr.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))); break;
      case "name-asc":    arr.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""))); break;
      case "name-desc":   arr.sort((a, b) => String(b.name ?? "").localeCompare(String(a.name ?? ""))); break;
      case "guests-asc":  arr.sort((a, b) => Number(a.guests ?? 0) - Number(b.guests ?? 0)); break;
      case "guests-desc": arr.sort((a, b) => Number(b.guests ?? 0) - Number(a.guests ?? 0)); break;
      case "booked-asc":  arr.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()); break;
      case "booked-desc": arr.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()); break;
    }
    return arr;
  }, [reservations, search, fromDate, toDate, filterOccasion, filterGuests, sortBy]);

  const hasFilters = search || fromDate || toDate || filterOccasion !== "all" || filterGuests !== "all";

  function clearFilters() {
    setSearch(""); setFromDate(""); setToDate("");
    setFilterOccasion("all"); setFilterGuests("all");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle subtitle={
          hasFilters
            ? `${filtered.length} of ${reservations.length} reservations`
            : `${reservations.length} reservations`
        }>Reservations</SectionTitle>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as ResSortBy)}>
            <SelectTrigger className="w-56 bg-white border-gray-200 rounded-xl shadow-sm" data-testid="select-res-sort">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {RES_SORT_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl border-cyan-200 text-cyan-600 hover:bg-cyan-50" onClick={() => exportCSV(filtered, "reservations.csv")} data-testid="button-export-reservations">
            <Download className="w-4 h-4 mr-2" />Export CSV
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
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-reservations"
          />
        </div>
        {/* From Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">From</span>
          <Input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="w-44 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="input-from-date"
          />
        </div>
        {/* To Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">To</span>
          <Input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="w-44 bg-gray-50 border-gray-200 rounded-xl"
            data-testid="input-to-date"
          />
        </div>
        {/* Occasion filter */}
        <Select value={filterOccasion} onValueChange={setFilterOccasion}>
          <SelectTrigger className="w-44 bg-gray-50 border-gray-200 rounded-xl" data-testid="select-res-occasion">
            <SelectValue placeholder="All Occasions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Occasions</SelectItem>
            {occasions.map(occ => (
              <SelectItem key={occ} value={occ}>{occ.charAt(0).toUpperCase() + occ.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Guests filter */}
        <Select value={filterGuests} onValueChange={setFilterGuests}>
          <SelectTrigger className="w-36 bg-gray-50 border-gray-200 rounded-xl" data-testid="select-res-guests">
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
          <Button variant="ghost" className="text-gray-400 hover:text-gray-600 rounded-xl px-3" onClick={clearFilters} data-testid="button-clear-res-filters">
            <X className="w-4 h-4 mr-1" />Clear
          </Button>
        )}
      </div>

      {isLoading ? <LoadRow /> : (
        <>
          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 font-medium">
                {hasFilters ? "No reservations match your filters" : "No reservations found"}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="mt-2 text-sm text-cyan-500 hover:underline">Clear filters</button>
              )}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Name", "Phone", "Date", "Time", "Guests", "Occasion", "Booked At"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => (
                    <tr key={String(r._id)} className="border-b border-gray-50 hover:bg-cyan-50/30 transition-colors" data-testid={`row-reservation-${r._id}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{r.name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.phone}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.timeSlot}</td>
                      <td className="px-4 py-3"><Badge className="bg-cyan-50 text-cyan-700 border-cyan-200">{r.guests}</Badge></td>
                      <td className="px-4 py-3">
                        {r.occasion
                          ? <Badge variant="outline" className="text-gray-600 capitalize">{r.occasion}</Badge>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Social Links
// ═══════════════════════════════════════════════════════════════════════════════
function SocialLinksSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ instagram: "", facebook: "", youtube: "", whatsapp: "" });

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "social-links")],
    queryFn: () => apiRequest(api(rid, "social-links")),
  });

  if (data && !form.instagram && !isLoading) setForm({ instagram: data.instagram || "", facebook: data.facebook || "", youtube: data.youtube || "", whatsapp: data.whatsapp || "" });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(api(rid, "social-links"), { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Saved" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  const socials = [
    { key: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500", bg: "bg-pink-50" },
    { key: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500", bg: "bg-red-50" },
    { key: "whatsapp", label: "WhatsApp", icon: Phone, color: "text-green-500", bg: "bg-green-50" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle>Social Links</SectionTitle>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl" data-testid="button-save-social"><Save className="w-4 h-4 mr-2" />Save All</Button>
      </div>
      <div className="space-y-4 max-w-lg">
        {socials.map(({ key, label, icon: Icon, color, bg }) => (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${bg} rounded-xl`}><Icon className={`w-4 h-4 ${color}`} /></div>
              <Label className="font-semibold text-gray-800">{label}</Label>
            </div>
            <Input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={`${label} URL or handle`} className="bg-gray-50 border-gray-200 rounded-xl" data-testid={`input-social-${key}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Welcome Screen
// ═══════════════════════════════════════════════════════════════════════════════
function WelcomeScreenSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ logoUrl: "", buttonText: "" });

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "welcome-screen")],
    queryFn: () => apiRequest(api(rid, "welcome-screen")),
  });

  if (data && !form.buttonText && !isLoading) {
    setForm({ logoUrl: data.logoUrl || "", buttonText: data.buttonText || "" });
  }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(api(rid, "welcome-screen"), { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Saved" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle>Welcome Screen</SectionTitle>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl" data-testid="button-save-welcome"><Save className="w-4 h-4 mr-2" />Save</Button>
      </div>
      <div className="max-w-md space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <Label className="font-semibold text-gray-700">Logo URL</Label>
            <Input value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." className="mt-1 bg-gray-50 border-gray-200 rounded-xl" data-testid="input-welcome-logo" />
          </div>
          {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="h-24 object-contain rounded-xl border bg-gray-50 p-2" onError={e => { (e.target as any).style.display = "none"; }} />}
          <div>
            <Label className="font-semibold text-gray-700">Button Text</Label>
            <Input value={form.buttonText} onChange={e => setForm(p => ({ ...p, buttonText: e.target.value }))} placeholder="e.g. EXPLORE MENU" className="mt-1 bg-gray-50 border-gray-200 rounded-xl" data-testid="input-welcome-button" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Restaurant Info
// ═══════════════════════════════════════════════════════════════════════════════
function RestaurantInfoSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "restaurant-info")],
    queryFn: () => apiRequest(api(rid, "restaurant-info")),
  });

  if (data && Object.keys(form).length === 0 && !isLoading) setForm(data);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(api(rid, "restaurant-info"), { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Saved" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const infoKeys = ["location", "contact", "hours", "instagram", "facebook", "youtube", "whatsapp"];

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <SectionTitle>Restaurant Info</SectionTitle>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl" data-testid="button-save-info"><Save className="w-4 h-4 mr-2" />Save All</Button>
      </div>
      <div className="space-y-4">
        {infoKeys.map(key => {
          const entry = form[key] || {};
          return (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-bold text-gray-800 capitalize mb-4">{key}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={entry.name || ""} onChange={e => setForm((p: any) => ({ ...p, [key]: { ...entry, name: e.target.value } }))} className="mt-1 bg-gray-50 rounded-xl border-gray-200" data-testid={`input-info-${key}-name`} /></div>
                <div><Label>Subtext</Label><Input value={entry.subtext || ""} onChange={e => setForm((p: any) => ({ ...p, [key]: { ...entry, subtext: e.target.value } }))} className="mt-1 bg-gray-50 rounded-xl border-gray-200" data-testid={`input-info-${key}-subtext`} /></div>
                {entry.linkKey !== undefined && <div><Label>Link Key</Label><Input value={entry.linkKey || ""} onChange={e => setForm((p: any) => ({ ...p, [key]: { ...entry, linkKey: e.target.value } }))} className="mt-1 bg-gray-50 rounded-xl border-gray-200" /></div>}
                <div className="flex items-center gap-3 mt-2"><Switch checked={entry.show ?? true} onCheckedChange={v => setForm((p: any) => ({ ...p, [key]: { ...entry, show: v } }))} data-testid={`switch-info-${key}-show`} /><Label>Show</Label></div>
              </div>
            </div>
          );
        })}
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
    mutationFn: () => apiRequest(api(rid, "payment-details"), { method: "PATCH", body: JSON.stringify({ upiId }) }),
    onSuccess: () => { toast({ title: "Saved", description: "UPI ID updated." }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle subtitle="Manage your payment settings">Payment Settings</SectionTitle>
      <div className="max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <Label className="font-semibold text-gray-700">UPI ID</Label>
          <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="mt-1 bg-gray-50 border-gray-200 rounded-xl" data-testid="input-upi-id" />
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-green-500 hover:bg-green-600 text-white rounded-xl w-full" data-testid="button-save-upi"><Save className="w-4 h-4 mr-2" />Save UPI ID</Button>
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

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "logo")],
    queryFn: () => apiRequest(api(rid, "logo")),
  });

  if (data && !url && !isLoading) setUrl(data.url || "");

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(api(rid, "logo"), { method: "PATCH", body: JSON.stringify({ url }) }),
    onSuccess: () => { toast({ title: "Saved", description: "Logo URL updated." }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle>Logo</SectionTitle>
      <div className="max-w-sm space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center min-h-[120px]">
          {url
            ? <img src={url} alt="Current logo" className="max-h-32 object-contain" onError={e => { (e.target as any).src = "https://via.placeholder.com/200x100?text=Logo"; }} />
            : <div className="flex flex-col items-center text-gray-300"><ImageIcon className="w-12 h-12 opacity-30 mb-2" /><p className="text-sm">No logo set</p></div>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <Label className="font-semibold text-gray-700">Logo URL</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="bg-gray-50 border-gray-200 rounded-xl" data-testid="input-logo-url" />
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl w-full" data-testid="button-save-logo"><Save className="w-4 h-4 mr-2" />Save Logo</Button>
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

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "call-waiter")],
    queryFn: () => apiRequest(api(rid, "call-waiter")),
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest(api(rid, "call-waiter"), { method: "PATCH", body: JSON.stringify({ called: false }) }),
    onSuccess: () => { toast({ title: "Reset", description: "Call waiter status reset." }); setResetConfirm(false); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle subtitle="Monitor and manage customer call requests">Call Waiter</SectionTitle>
      <div className="max-w-sm">
        <div className={`bg-white rounded-2xl border-2 shadow-sm p-8 text-center transition-all ${data?.called ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}>
          <div className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${data?.called ? "bg-red-100" : "bg-gray-100"}`}>
            <Bell className={`w-10 h-10 ${data?.called ? "text-red-500 animate-bounce" : "text-gray-300"}`} />
          </div>
          <p className="text-lg font-bold text-gray-800 mb-3">Status</p>
          {data?.called
            ? (
              <>
                <Badge className="bg-red-100 text-red-700 border-red-300 text-sm px-4 py-1.5 mb-4">Customer Called Waiter</Badge>
                <div className="mt-4">
                  <Button className="bg-red-500 hover:bg-red-600 text-white rounded-xl" onClick={() => setResetConfirm(true)} data-testid="button-reset-waiter"><RefreshCw className="w-4 h-4 mr-2" />Reset Status</Button>
                </div>
              </>
            )
            : <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-sm px-4 py-1.5">No Active Request</Badge>}
        </div>
      </div>

      <Dialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Call Waiter</DialogTitle><DialogDescription>Mark the waiter call as resolved?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const activeSecDef = SECTIONS.find(s => s.id === activeSection)!;

  function renderSection() {
    if (!restaurantId) return null;
    switch (activeSection) {
      case "overview":        return <OverviewSection rid={restaurantId} />;
      case "menu-items":      return <MenuItemsSection rid={restaurantId} />;
      case "categories":      return <CategoriesSection rid={restaurantId} />;
      case "smart-picks":     return <SmartPicksSection rid={restaurantId} />;
      case "carousel":        return <CarouselSection rid={restaurantId} />;
      case "coupons":         return <CouponsSection rid={restaurantId} />;
      case "customers":       return <CustomersSection rid={restaurantId} />;
      case "reservations":    return <ReservationsSection rid={restaurantId} />;
      case "social-links":    return <SocialLinksSection rid={restaurantId} />;
      case "welcome-screen":  return <WelcomeScreenSection rid={restaurantId} />;
      case "restaurant-info": return <RestaurantInfoSection rid={restaurantId} />;
      case "payment":         return <PaymentSection rid={restaurantId} />;
      case "logo":            return <LogoSection rid={restaurantId} />;
      case "call-waiter":     return <CallWaiterSection rid={restaurantId} />;
      default: return null;
    }
  }

  const initials = restaurant?.name
    ? restaurant.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : "R";

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300 ease-in-out
          bg-[#0f172a] border-r border-white/5
          ${sidebarOpen ? "w-64" : "w-0 md:w-[72px]"} overflow-hidden`}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {restaurant?.image
              ? <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
              : <span className="text-white">{initials}</span>}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm truncate leading-tight">{restaurant?.name || "Restaurant"}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-emerald-400 text-xs font-medium">Dashboard Live</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-thin">
          {SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.id as SectionId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group relative ${
                  isActive
                    ? `${section.bg} text-white`
                    : "text-slate-400 hover:text-white hover:bg-white/5"
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
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive ? "" : "group-hover:scale-110"
                  } ${!sidebarOpen ? "mx-auto" : ""}`}
                  style={isActive ? { background: section.color + "33" } : {}}
                >
                  <section.icon
                    className="w-4 h-4 flex-shrink-0"
                    style={isActive ? { color: section.color } : {}}
                  />
                </div>
                {sidebarOpen && (
                  <span className={`text-sm font-medium truncate ${isActive ? "text-white" : ""}`}>
                    {section.label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: section.color }} />
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
              data-testid="button-back-sidebar"
            >
              <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              <span>Back to Admin</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "md:ml-64" : "md:ml-[72px]"}`}>

        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3.5 flex items-center gap-4">
          {/* Toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
            <span className="text-gray-400 hidden sm:block font-medium">{restaurant?.name || "Restaurant"}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: activeSecDef.color + "22" }}
              >
                <activeSecDef.icon className="w-3 h-3" style={{ color: activeSecDef.color }} />
              </div>
              <span className="font-semibold text-gray-800">{activeSecDef.label}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
              <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <Button
              size="sm"
              onClick={() => setLocation("/admin/dashboard")}
              className="bg-gray-900 hover:bg-gray-700 text-white rounded-xl hidden sm:flex items-center gap-2"
              data-testid="button-back-to-admin"
            >
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </Button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Section content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
