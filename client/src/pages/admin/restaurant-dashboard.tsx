import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  LayoutDashboard, UtensilsCrossed, LayoutGrid, Sparkles, Images, Tag, Users,
  CalendarCheck, Share2, Monitor, Info, CreditCard, ImageIcon, Bell,
  ArrowLeft, Menu, X, ChevronRight, ChevronDown, ChevronUp, Leaf, Star,
  Download, Search, Plus, Edit, Trash2, RefreshCw, Eye, EyeOff, Save,
  Phone, Mail, Globe, MapPin, Instagram, Facebook, Youtube, Upload, Link,
} from "lucide-react";

// ─── API base ─────────────────────────────────────────────────────────────────
const api = (restaurantId: string, path: string) =>
  `/api/restaurant-db/${restaurantId}/${path}`;

// ─── Sidebar config ───────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "menu-items", label: "Menu Items", icon: UtensilsCrossed },
  { id: "categories", label: "Categories", icon: LayoutGrid },
  { id: "smart-picks", label: "Smart Picks", icon: Sparkles },
  { id: "carousel", label: "Carousel", icon: Images },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "reservations", label: "Reservations", icon: CalendarCheck },
  { id: "social-links", label: "Social Links", icon: Share2 },
  { id: "welcome-screen", label: "Welcome Screen", icon: Monitor },
  { id: "restaurant-info", label: "Restaurant Info", icon: Info },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "logo", label: "Logo", icon: ImageIcon },
  { id: "call-waiter", label: "Call Waiter", icon: Bell },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Theme classes ────────────────────────────────────────────────────────────
const theme = {
  sidebar: "bg-slate-900",
  sidebarActive: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg",
  sidebarInactive: "text-slate-300 hover:bg-slate-800 hover:text-amber-400",
  header: "bg-slate-800 border-slate-700",
  accent: "text-amber-400",
  badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cardBorder: "border-slate-200",
  statCard: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
  primary: "bg-amber-500 hover:bg-amber-600 text-white",
  primaryOutline: "border-amber-500 text-amber-600 hover:bg-amber-50",
  danger: "border-red-400 text-red-600 hover:bg-red-50",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function LoadRow() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-slate-800 mb-5">{children}</h2>
  );
}

function VegBadge({ isVeg }: { isVeg: boolean }) {
  return isVeg
    ? <Badge className="bg-green-100 text-green-700 border-green-300 text-xs"><Leaf className="w-3 h-3 mr-1" />Veg</Badge>
    : <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Non-Veg</Badge>;
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

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Overview
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewSection({ rid }: { rid: string }) {
  const { data, isLoading } = useQuery({
    queryKey: [api(rid, "overview")],
    queryFn: () => apiRequest(api(rid, "overview")),
  });

  const stats = [
    { label: "Menu Items", value: data?.totalMenuItems, color: "from-emerald-500 to-teal-600", icon: UtensilsCrossed },
    { label: "Menu Categories", value: data?.menuCategories, color: "from-violet-500 to-purple-600", icon: LayoutGrid },
    { label: "Customers", value: data?.customers, color: "from-blue-500 to-cyan-600", icon: Users },
    { label: "Reservations", value: data?.reservations, color: "from-orange-500 to-amber-600", icon: CalendarCheck },
    { label: "Active Coupons", value: data?.activeCoupons, color: "from-rose-500 to-pink-600", icon: Tag },
    { label: "Categories (UI)", value: data?.topLevelCategories, color: "from-indigo-500 to-blue-600", icon: LayoutDashboard },
  ];

  return (
    <div>
      <SectionTitle>Overview</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className="overflow-hidden border-0 shadow-md">
            <div className={`h-1.5 bg-gradient-to-r ${stat.color}`} />
            <CardContent className="p-4">
              {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
                <p className="text-2xl font-bold text-slate-800">{stat.value ?? "—"}</p>
              )}
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                <stat.icon className="w-3.5 h-3.5" />{stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Menu Items
// ═══════════════════════════════════════════════════════════════════════════════
function MenuItemsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [filterVeg, setFilterVeg] = useState<"all" | "veg" | "nonveg">("all");
  const [showAvailable, setShowAvailable] = useState<"all" | "true" | "false">("all");
  const [editItem, setEditItem] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { name: "", description: "", price: "", category: "", isVeg: true, image: "", isAvailable: true, todaysSpecial: false, chefSpecial: false, preparationTime: "", allergens: "", ingredients: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: collections = [] } = useQuery<string[]>({
    queryKey: [api(rid, "menu-collections")],
    queryFn: () => apiRequest(api(rid, "menu-collections")),
  });

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category !== "all") params.set("category", category);
  if (filterVeg === "veg") params.set("isVeg", "true");
  if (filterVeg === "nonveg") params.set("isVeg", "false");
  if (showAvailable !== "all") params.set("isAvailable", showAvailable);

  const { data: items = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "menu-items"), search, category, filterVeg, showAvailable],
    queryFn: () => apiRequest(`${api(rid, "menu-items")}?${params}`),
  });

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
        <div><Label>Price</Label><Input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. 250 or 30ml: ₹200 / NIP: ₹400" /></div>

        {/* Image field: file upload + URL input */}
        <div className="md:col-span-2 space-y-2">
          <Label>Image</Label>
          <div className="flex gap-2 items-center">
            <Input
              value={form.image}
              onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
              placeholder="Paste image URL or upload a file →"
              className="flex-1"
              data-testid="input-menu-item-image-url"
            />
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="input-menu-item-image-file"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFileUpload(f); e.target.value = ""; }}
              />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-slate-300 border-slate-600 hover:bg-slate-700" disabled={imgUploading} asChild>
                <span>{imgUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{imgUploading ? "Uploading…" : "Upload"}</span>
              </Button>
            </label>
          </div>
          {form.image && (
            <div className="flex items-center gap-2 mt-1">
              <img src={form.image} alt="Preview" className="h-12 w-12 object-cover rounded border border-slate-600" onError={e => (e.currentTarget.style.display = "none")} />
              <span className="text-xs text-slate-400 truncate max-w-xs">{form.image}</span>
            </div>
          )}
        </div>

        <div><Label>Preparation Time</Label><Input value={form.preparationTime} onChange={e => setForm(p => ({ ...p, preparationTime: e.target.value }))} placeholder="e.g. 15 mins" /></div>
        <div><Label>Allergens (comma-separated)</Label><Input value={form.allergens} onChange={e => setForm(p => ({ ...p, allergens: e.target.value }))} /></div>
        <div className="md:col-span-2"><Label>Ingredients (comma-separated)</Label><Input value={form.ingredients} onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))} /></div>
        <div className="flex items-center gap-3"><Switch checked={form.isVeg} onCheckedChange={v => setForm(p => ({ ...p, isVeg: v }))} /><Label>Vegetarian</Label></div>
        <div className="flex items-center gap-3"><Switch checked={form.isAvailable} onCheckedChange={v => setForm(p => ({ ...p, isAvailable: v }))} /><Label>Available</Label></div>
        <div className="flex items-center gap-3"><Switch checked={form.todaysSpecial} onCheckedChange={v => setForm(p => ({ ...p, todaysSpecial: v }))} /><Label>Today's Special</Label></div>
        <div className="flex items-center gap-3"><Switch checked={form.chefSpecial} onCheckedChange={v => setForm(p => ({ ...p, chefSpecial: v }))} /><Label>Chef's Special</Label></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Menu Items</SectionTitle>
        <Button className={theme.primary} onClick={() => { setForm(emptyForm); setAddOpen(true); }} data-testid="button-add-menu-item"><Plus className="w-4 h-4 mr-1" />Add Item</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" /><Input className="pl-9" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-menu" /></div>
        <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{collections.map(c => <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>)}</SelectContent></Select>
        <Select value={filterVeg} onValueChange={v => setFilterVeg(v as any)}><SelectTrigger className="w-36"><SelectValue placeholder="Veg filter" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="veg">Veg only</SelectItem><SelectItem value="nonveg">Non-Veg only</SelectItem></SelectContent></Select>
        <Select value={showAvailable} onValueChange={v => setShowAvailable(v as any)}><SelectTrigger className="w-36"><SelectValue placeholder="Availability" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="true">Available</SelectItem><SelectItem value="false">Unavailable</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? <LoadRow /> : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500 mb-2">{items.length} items</p>
          {items.length === 0 && <div className="text-center py-12 text-slate-400"><UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No items found</p></div>}
          {items.map((item: any) => (
            <Card key={String(item._id)} className="border border-slate-200 shadow-sm">
              <CardContent className="p-3 flex gap-3 items-start">
                {item.image && <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border" onError={e => { (e.target as any).style.display = "none"; }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <VegBadge isVeg={item.isVeg} />
                    <Badge variant="outline" className="text-xs">{formatCategory(item.category || item._collection || "")}</Badge>
                    {item.todaysSpecial && <Badge className="bg-amber-100 text-amber-700 text-xs"><Star className="w-3 h-3 mr-1" />Today's Special</Badge>}
                    {item.chefSpecial && <Badge className="bg-purple-100 text-purple-700 text-xs">Chef's Special</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{item.description}</p>
                  <p className="text-sm font-medium text-emerald-700 mt-0.5">{typeof item.price === "number" ? `₹${item.price}` : item.price}</p>
                </div>
                <div className="flex flex-col gap-2 items-end flex-shrink-0">
                  <div className="flex gap-1">
                    <Switch checked={item.isAvailable} onCheckedChange={v => toggleMutation.mutate({ id: String(item._id), col: item.category || item._collection, patch: { isAvailable: v } })} data-testid={`switch-available-${item._id}`} />
                    <span className="text-xs text-slate-400 self-center">Avail.</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)} className="h-7 px-2" data-testid={`button-edit-item-${item._id}`}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(item)} className="h-7 px-2 border-red-300 text-red-500 hover:bg-red-50" data-testid={`button-delete-item-${item._id}`}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
          <ItemForm onClose={() => setAddOpen(false)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className={theme.primary} onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Menu Item</DialogTitle></DialogHeader>
          <ItemForm onClose={() => setEditItem(null)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button className={theme.primary} onClick={() => saveMutation.mutate({ ...editItem, ...form })} disabled={saveMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Item</DialogTitle><DialogDescription>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: String(deleteConfirm._id), col: deleteConfirm.category || deleteConfirm._collection })} disabled={deleteMutation.isPending}>Delete</Button>
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

  const toggleExpand = (id: string) => setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`${api(rid, "categories")}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Updated" }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <SectionTitle>Categories</SectionTitle>
      {categories.length === 0 && <div className="text-center py-12 text-slate-400"><LayoutGrid className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No categories found</p></div>}
      <div className="space-y-3">
        {categories.map((cat: any, idx: number) => (
          <Card key={String(cat._id)} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {cat.image && <img src={cat.image} alt={cat.title} className="w-10 h-10 rounded-lg object-cover border flex-shrink-0" onError={e => { (e.target as any).style.display = "none"; }} />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{cat.title}</p>
                  <p className="text-xs text-slate-400">Order: {cat.order} · {cat.subcategories?.length || 0} subcategories</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={cat.visible} onCheckedChange={v => updateMutation.mutate({ id: String(cat._id), data: { visible: v } })} data-testid={`switch-cat-visible-${cat._id}`} />
                  <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: String(cat._id), data: { order: Math.max(1, cat.order - 1) } })} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: String(cat._id), data: { order: cat.order + 1 } })} disabled={idx === categories.length - 1}><ChevronDown className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleExpand(String(cat._id))}>{expanded.has(String(cat._id)) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button>
                </div>
              </div>

              {expanded.has(String(cat._id)) && cat.subcategories?.length > 0 && (
                <div className="mt-3 ml-6 space-y-2 border-l-2 border-amber-200 pl-4">
                  {cat.subcategories.map((sub: any) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <span className="text-sm text-slate-700 flex-1">{sub.title}</span>
                      <Switch checked={sub.visible} onCheckedChange={v => {
                        const updatedSubs = cat.subcategories.map((s: any) => s.id === sub.id ? { ...s, visible: v } : s);
                        updateMutation.mutate({ id: String(cat._id), data: { subcategories: updatedSubs } });
                      }} data-testid={`switch-subcat-${sub.id}`} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
      <SectionTitle>Smart Picks</SectionTitle>
      {picks.length === 0 && <div className="text-center py-12 text-slate-400"><Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No smart picks found</p></div>}
      <div className="space-y-3">
        {picks.map((pick: any, idx: number) => (
          <Card key={String(pick._id)} className="border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">{pick.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{pick.label}</p>
                <p className="text-sm text-slate-500">{pick.tagline}</p>
                <Badge variant="outline" className="text-xs mt-1">{pick.key}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Switch checked={pick.isVisible} onCheckedChange={v => updateMutation.mutate({ id: String(pick._id), data: { isVisible: v } })} data-testid={`switch-smartpick-${pick._id}`} />
                <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: String(pick._id), data: { order: Math.max(1, pick.order - 1) } })} disabled={idx === 0}><ChevronUp className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: String(pick._id), data: { order: pick.order + 1 } })} disabled={idx === picks.length - 1}><ChevronDown className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Carousel
// ═══════════════════════════════════════════════════════════════════════════════
function CarouselSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { url: "", alt: "", order: 1, visible: true };
  const [form, setForm] = useState(emptyForm);

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

  function CarouselForm() {
    return (
      <div className="space-y-3">
        <div><Label>Image URL *</Label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} /></div>
        {form.url && <img src={form.url} alt="preview" className="h-32 w-full object-cover rounded-lg border" onError={e => { (e.target as any).style.display = "none"; }} />}
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
        <Button className={theme.primary} onClick={() => { setForm(emptyForm); setAddOpen(true); }} data-testid="button-add-carousel"><Plus className="w-4 h-4 mr-1" />Add Image</Button>
      </div>
      {items.length === 0 && <div className="text-center py-12 text-slate-400"><Images className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No carousel images</p></div>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item: any) => (
          <Card key={String(item._id)} className="overflow-hidden border-slate-200 shadow-sm">
            <div className="relative">
              <img src={item.url} alt={item.alt} className="w-full h-36 object-cover" onError={e => { (e.target as any).src = "https://via.placeholder.com/300x150?text=Image"; }} />
              <div className="absolute top-2 right-2">
                <Switch checked={item.visible} onCheckedChange={v => toggleMutation.mutate({ id: String(item._id), visible: v })} data-testid={`switch-carousel-${item._id}`} />
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm text-slate-600 truncate">{item.alt || "No alt"}</p>
              <p className="text-xs text-slate-400">Order: {item.order}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => { setEditItem(item); setForm({ url: item.url, alt: item.alt, order: item.order, visible: item.visible }); }} data-testid={`button-edit-carousel-${item._id}`}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 border-red-300 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(item)} data-testid={`button-delete-carousel-${item._id}`}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add Carousel Image</DialogTitle></DialogHeader><CarouselForm /><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className={theme.primary} onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}><DialogContent><DialogHeader><DialogTitle>Edit Carousel Image</DialogTitle></DialogHeader><CarouselForm /><DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button className={theme.primary} onClick={() => saveMutation.mutate({ ...editItem, ...form })} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Delete Image</DialogTitle><DialogDescription>Delete this carousel image?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(String(deleteConfirm._id))} disabled={deleteMutation.isPending}>Delete</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section: Coupons
// ═══════════════════════════════════════════════════════════════════════════════
function CouponsSection({ rid }: { rid: string }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { code: "", title: "", subtitle: "", description: "", validity: "", tag: "", show: true };
  const [form, setForm] = useState(emptyForm);

  const { data: coupons = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: [api(rid, "coupons")],
    queryFn: () => apiRequest(api(rid, "coupons")),
  });

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
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Coupons</SectionTitle>
        <Button className={theme.primary} onClick={() => { setForm(emptyForm); setAddOpen(true); }} data-testid="button-add-coupon"><Plus className="w-4 h-4 mr-1" />Add Coupon</Button>
      </div>
      {coupons.length === 0 && <div className="text-center py-12 text-slate-400"><Tag className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No coupons found</p></div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coupons.map((coupon: any) => (
          <Card key={String(coupon._id)} className="border-slate-200 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-100 text-amber-800 font-mono">{coupon.code}</Badge>
                    {coupon.tag && <Badge variant="outline" className="text-xs">{coupon.tag}</Badge>}
                  </div>
                  <p className="font-bold text-slate-800 mt-1">{coupon.title}</p>
                  <p className="text-sm text-slate-500">{coupon.subtitle}</p>
                  <p className="text-xs text-slate-400 mt-1">{coupon.validity}</p>
                </div>
                <Switch checked={coupon.show} onCheckedChange={v => toggleMutation.mutate({ id: String(coupon._id), show: v })} data-testid={`switch-coupon-${coupon._id}`} />
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 h-7" onClick={() => { setEditItem(coupon); setForm({ code: coupon.code, title: coupon.title, subtitle: coupon.subtitle, description: coupon.description, validity: coupon.validity, tag: coupon.tag, show: coupon.show }); }} data-testid={`button-edit-coupon-${coupon._id}`}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 px-2 border-red-300 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(coupon)} data-testid={`button-delete-coupon-${coupon._id}`}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent><DialogHeader><DialogTitle>Add Coupon</DialogTitle></DialogHeader><CouponForm /><DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className={theme.primary} onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}><DialogContent><DialogHeader><DialogTitle>Edit Coupon</DialogTitle></DialogHeader><CouponForm /><DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button className={theme.primary} onClick={() => saveMutation.mutate({ ...editItem, ...form })} disabled={saveMutation.isPending}>Save</Button></DialogFooter></DialogContent></Dialog>
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
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Customers</SectionTitle>
        <Button variant="outline" className={theme.primaryOutline} onClick={() => exportCSV(customers, "customers.csv")} data-testid="button-export-customers"><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" /><Input className="pl-9" placeholder="Search name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="input-search-customers" /></div>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" placeholder="From" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" placeholder="To" />
        </div>
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="createdAt">Date Joined</SelectItem><SelectItem value="visitCount">Visit Count</SelectItem><SelectItem value="name">Name</SelectItem><SelectItem value="lastVisitDate">Last Visit</SelectItem></SelectContent></Select>
        <Button variant="outline" onClick={() => setOrder(o => o === "asc" ? "desc" : "asc")} className="w-10 px-2">{order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</Button>
      </div>

      {isLoading ? <LoadRow /> : (
        <>
          <p className="text-sm text-slate-500 mb-2">{total} customers</p>
          {customers.length === 0 && <div className="text-center py-12 text-slate-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No customers found</p></div>}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{["Name", "Contact", "Visits", "Last Visit", "Joined"].map(h => <th key={h} className="px-4 py-3 text-left text-slate-600 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {customers.map((c: any, i: number) => (
                  <tr key={String(c._id)} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"} data-testid={`row-customer-${c._id}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.contactNumber}</td>
                    <td className="px-4 py-2.5"><Badge className="bg-emerald-100 text-emerald-800">{c.visitCount}</Badge></td>
                    <td className="px-4 py-2.5 text-slate-500">{c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
              <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
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
function ReservationsSection({ rid }: { rid: string }) {
  const [date, setDate] = useState("");

  const params = new URLSearchParams();
  if (date) params.set("date", date);

  const { data: reservations = [], isLoading } = useQuery<any[]>({
    queryKey: [api(rid, "reservations"), date],
    queryFn: () => apiRequest(`${api(rid, "reservations")}?${params}`),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Reservations</SectionTitle>
        <Button variant="outline" className={theme.primaryOutline} onClick={() => exportCSV(reservations, "reservations.csv")} data-testid="button-export-reservations"><Download className="w-4 h-4 mr-1" />Export CSV</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
        {date && <Button variant="ghost" onClick={() => setDate("")} className="text-slate-400">Clear</Button>}
      </div>

      {isLoading ? <LoadRow /> : (
        <>
          <p className="text-sm text-slate-500 mb-2">{reservations.length} reservations</p>
          {reservations.length === 0 && <div className="text-center py-12 text-slate-400"><CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" /><p>No reservations found</p></div>}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{["Name", "Phone", "Date", "Time", "Guests", "Occasion", "Booked At"].map(h => <th key={h} className="px-4 py-3 text-left text-slate-600 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {reservations.map((r: any, i: number) => (
                  <tr key={String(r._id)} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"} data-testid={`row-reservation-${r._id}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.date}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.timeSlot}</td>
                    <td className="px-4 py-2.5"><Badge className="bg-blue-100 text-blue-800">{r.guests}</Badge></td>
                    <td className="px-4 py-2.5 text-slate-500">{r.occasion || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const [form, setForm] = useState<any>({});

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [api(rid, "social-links")],
    queryFn: () => apiRequest(api(rid, "social-links")),
  });

  if (data && Object.keys(form).length === 0 && !isLoading) {
    setForm(data);
  }

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(api(rid, "social-links"), { method: "PATCH", body: JSON.stringify(form) }),
    onSuccess: () => { toast({ title: "Saved", description: "Social links updated." }); refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fields = [
    { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/..." },
    { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/..." },
    { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/..." },
    { key: "googleReview", label: "Google Review", icon: Star, placeholder: "https://g.page/..." },
    { key: "locate", label: "Google Maps", icon: MapPin, placeholder: "https://maps.google.com/..." },
    { key: "call", label: "Phone", icon: Phone, placeholder: "tel:+91..." },
    { key: "whatsapp", label: "WhatsApp", icon: Phone, placeholder: "https://wa.me/91..." },
    { key: "email", label: "Email", icon: Mail, placeholder: "mailto:..." },
    { key: "website", label: "Website", icon: Globe, placeholder: "https://..." },
  ];

  if (isLoading) return <LoadRow />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Social Links</SectionTitle>
        <Button className={theme.primary} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-social"><Save className="w-4 h-4 mr-1" />Save</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key}>
            <Label className="flex items-center gap-1.5 mb-1"><f.icon className="w-3.5 h-3.5" />{f.label}</Label>
            <Input value={form[f.key] || ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} data-testid={`input-social-${f.key}`} />
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
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Welcome Screen</SectionTitle>
        <Button className={theme.primary} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-welcome"><Save className="w-4 h-4 mr-1" />Save</Button>
      </div>
      <div className="max-w-md space-y-4">
        <div>
          <Label>Logo URL</Label>
          <Input value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." data-testid="input-welcome-logo" />
        </div>
        {form.logoUrl && <img src={form.logoUrl} alt="Logo preview" className="h-24 object-contain rounded-lg border bg-slate-50 p-2" onError={e => { (e.target as any).style.display = "none"; }} />}
        <div>
          <Label>Button Text</Label>
          <Input value={form.buttonText} onChange={e => setForm(p => ({ ...p, buttonText: e.target.value }))} placeholder="e.g. EXPLORE MENU" data-testid="input-welcome-button" />
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
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Restaurant Info</SectionTitle>
        <Button className={theme.primary} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-info"><Save className="w-4 h-4 mr-1" />Save All</Button>
      </div>
      <div className="space-y-4">
        {infoKeys.map(key => {
          const entry = form[key] || {};
          return (
            <Card key={key} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="font-semibold text-slate-700 capitalize mb-3">{key}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input value={entry.name || ""} onChange={e => setForm((p: any) => ({ ...p, [key]: { ...entry, name: e.target.value } }))} data-testid={`input-info-${key}-name`} /></div>
                  <div><Label>Subtext</Label><Input value={entry.subtext || ""} onChange={e => setForm((p: any) => ({ ...p, [key]: { ...entry, subtext: e.target.value } }))} data-testid={`input-info-${key}-subtext`} /></div>
                  {entry.linkKey !== undefined && <div><Label>Link Key</Label><Input value={entry.linkKey || ""} onChange={e => setForm((p: any) => ({ ...p, [key]: { ...entry, linkKey: e.target.value } }))} /></div>}
                  <div className="flex items-center gap-3"><Switch checked={entry.show ?? true} onCheckedChange={v => setForm((p: any) => ({ ...p, [key]: { ...entry, show: v } }))} data-testid={`switch-info-${key}-show`} /><Label>Show</Label></div>
                </div>
              </CardContent>
            </Card>
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
      <SectionTitle>Payment Settings</SectionTitle>
      <div className="max-w-sm space-y-4">
        <div>
          <Label>UPI ID</Label>
          <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" data-testid="input-upi-id" />
        </div>
        <Button className={theme.primary} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-upi"><Save className="w-4 h-4 mr-1" />Save</Button>
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
        {url && <div className="rounded-xl border bg-slate-50 p-4 flex items-center justify-center"><img src={url} alt="Current logo" className="max-h-32 object-contain" onError={e => { (e.target as any).src = "https://via.placeholder.com/200x100?text=Logo"; }} /></div>}
        {!url && <div className="rounded-xl border bg-slate-50 p-8 flex items-center justify-center text-slate-400"><ImageIcon className="w-12 h-12 opacity-30" /></div>}
        <div><Label>Logo URL</Label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." data-testid="input-logo-url" /></div>
        <Button className={theme.primary} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-logo"><Save className="w-4 h-4 mr-1" />Save</Button>
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
      <SectionTitle>Call Waiter</SectionTitle>
      <Card className="max-w-sm border-slate-200 shadow-sm">
        <CardContent className="p-6 text-center">
          <Bell className={`w-16 h-16 mx-auto mb-4 ${data?.called ? "text-red-500 animate-bounce" : "text-slate-300"}`} />
          <p className="text-lg font-semibold text-slate-700 mb-2">Status</p>
          {data?.called
            ? <Badge className="bg-red-100 text-red-700 border-red-300 text-sm px-4 py-1.5">🔔 Customer Called Waiter</Badge>
            : <Badge className="bg-green-100 text-green-700 border-green-300 text-sm px-4 py-1.5">✓ No Active Request</Badge>}
          {data?.called && (
            <div className="mt-4">
              <Button variant="outline" className={theme.danger} onClick={() => setResetConfirm(true)} data-testid="button-reset-waiter"><RefreshCw className="w-4 h-4 mr-1" />Reset Status</Button>
            </div>
          )}
        </CardContent>
      </Card>

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
    setSidebarOpen(window.innerWidth >= 768);
  }, []);

  function renderSection() {
    if (!restaurantId) return null;
    switch (activeSection) {
      case "overview": return <OverviewSection rid={restaurantId} />;
      case "menu-items": return <MenuItemsSection rid={restaurantId} />;
      case "categories": return <CategoriesSection rid={restaurantId} />;
      case "smart-picks": return <SmartPicksSection rid={restaurantId} />;
      case "carousel": return <CarouselSection rid={restaurantId} />;
      case "coupons": return <CouponsSection rid={restaurantId} />;
      case "customers": return <CustomersSection rid={restaurantId} />;
      case "reservations": return <ReservationsSection rid={restaurantId} />;
      case "social-links": return <SocialLinksSection rid={restaurantId} />;
      case "welcome-screen": return <WelcomeScreenSection rid={restaurantId} />;
      case "restaurant-info": return <RestaurantInfoSection rid={restaurantId} />;
      case "payment": return <PaymentSection rid={restaurantId} />;
      case "logo": return <LogoSection rid={restaurantId} />;
      case "call-waiter": return <CallWaiterSection rid={restaurantId} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300 ${theme.sidebar} ${sidebarOpen ? "w-64" : "w-0 md:w-16"} overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700 flex-shrink-0">
          {restaurant?.image && sidebarOpen && (
            <img src={restaurant.image} alt={restaurant.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-slate-600" />
          )}
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-amber-400 font-bold text-sm truncate">{restaurant?.name || "Restaurant"}</p>
              <p className="text-slate-400 text-xs">Dashboard</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.id as SectionId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-left ${isActive ? theme.sidebarActive : theme.sidebarInactive}`}
                data-testid={`nav-${section.id}`}
              >
                <section.icon className={`w-4 h-4 flex-shrink-0 ${!sidebarOpen ? "mx-auto" : ""}`} />
                {sidebarOpen && <span className="text-sm font-medium truncate">{section.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "md:ml-16"}`}>
        {/* Top header */}
        <header className={`sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3 ${theme.header}`}>
          <button onClick={() => setSidebarOpen(o => !o)} className="text-slate-300 hover:text-amber-400 transition-colors p-1 rounded" data-testid="button-toggle-sidebar">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            {restaurant?.image && (
              <img src={restaurant.image} alt={restaurant.name} className="w-7 h-7 rounded-md object-cover border border-slate-600 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm sm:text-base truncate">{restaurant?.name || "Loading…"}</h1>
              <p className="text-slate-400 text-xs truncate hidden sm:block">{SECTIONS.find(s => s.id === activeSection)?.label}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/dashboard")}
            className="text-slate-300 hover:text-amber-400 hover:bg-slate-700 flex-shrink-0"
            data-testid="button-back-to-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Back</span>
          </Button>
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
