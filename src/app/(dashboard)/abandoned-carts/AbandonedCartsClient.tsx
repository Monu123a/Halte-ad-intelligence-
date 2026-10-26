/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ShoppingCart,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Download,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  User,
  Package,
  Calendar,
  Save,
  Tag,
  ArrowRight
} from "lucide-react";

interface CartItem {
  sku: string;
  title: string;
  main_image?: string;
  shown_price: number;
  quantity: number;
  slug?: string;
  brand?: string;
  category?: string;
}

interface CartRemark {
  id: number | string;
  remark: string;
  added_by?: string;
  created_at: string;
}

interface CartRecord {
  id: string;
  cartRef: string;
  customerId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  phoneRaw?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  fullAddress?: string | null;
  cartValue: number;
  itemCount: number;
  items: CartItem[];
  cartUpdatedAt: string | Date;
  status: "ABANDONED" | "CONTACTED" | "RECOVERED" | "LOST";
  remarks?: CartRemark[];
  recoveryNotes?: string | null;
  lastContactedAt?: string | Date | null;
  contactedBy?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface SummaryStats {
  totalCount: number;
  filteredCount: number;
  totalCartValue: number;
  contactedCount: number;
  recoveredCount: number;
  recoveredValue: number;
  recoveryRate: number;
}

interface Props {
  initialCarts: CartRecord[];
  summary: SummaryStats;
  currentStatus: string;
  searchQuery: string;
  currentRange: string;
  userRole: string;
  userEmail: string;
}

export default function AbandonedCartsClient({
  initialCarts,
  summary,
  currentStatus,
  searchQuery,
  currentRange,
  userEmail,
}: Props) {
  const router = useRouter();

  const [carts, setCarts] = useState<CartRecord[]>(initialCarts);
  const [selectedCart, setSelectedCart] = useState<CartRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState(currentStatus);
  const [rangeFilter, setRangeFilter] = useState(currentRange);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Note and status update state for the active drawer
  const [activeNote, setActiveNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);

  // Sync with Halte.in API
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncToast("Syncing abandoned carts from Halte website...");
    try {
      const res = await fetch("/api/sync/abandoned-carts", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncToast(`Sync completed: ${data.syncedCount || 0} carts synced from Halte.`);
        router.refresh();
      } else {
        setSyncToast(`Sync error: ${data.error || "Unable to sync"}`);
      }
    } catch (err: any) {
      setSyncToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 6000);
    }
  };

  // Filter client-side
  const filteredCarts = carts.filter((c) => {
    // Status filter
    if (statusFilter === "HIGH_VALUE") {
      if (c.cartValue < 5000) return false;
    } else if (statusFilter !== "ALL" && c.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = c.customerName?.toLowerCase().includes(q);
      const matchEmail = c.customerEmail?.toLowerCase().includes(q);
      const matchPhone = c.customerPhone?.toLowerCase().includes(q) || c.phoneRaw?.includes(q);
      const matchCity = c.city?.toLowerCase().includes(q);
      const matchState = c.state?.toLowerCase().includes(q);
      const matchSku = c.items?.some((i) => i.sku?.toLowerCase().includes(q) || i.title?.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchPhone && !matchCity && !matchState && !matchSku) {
        return false;
      }
    }

    return true;
  });

  // Open detail drawer
  const openCartDetails = (cart: CartRecord) => {
    setSelectedCart(cart);
    setActiveNote(cart.recoveryNotes || "");
    setUpdateSuccessMsg(null);
  };

  // Update Status / Notes
  const handleUpdateCart = async (newStatus?: CartRecord["status"]) => {
    if (!selectedCart) return;
    setIsUpdating(true);
    setUpdateSuccessMsg(null);

    const targetStatus = newStatus || selectedCart.status;

    try {
      const res = await fetch(`/api/abandoned-carts/${selectedCart.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          recoveryNotes: activeNote,
          remark: activeNote.trim() && activeNote !== selectedCart.recoveryNotes ? `Note: ${activeNote.trim()}` : undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.cart) {
        const updated = json.cart;
        setCarts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        setSelectedCart((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        setUpdateSuccessMsg("Status & notes updated successfully!");
        setTimeout(() => setUpdateSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      alert("Failed to update cart: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredCarts.map((c) => {
      const itemTitles = c.items.map((i) => `${i.title} (${i.sku}) x${i.quantity}`).join("; ");
      return {
        "Customer ID": c.customerId || "N/A",
        "Customer Name": c.customerName || "Customer",
        "Phone": c.customerPhone || "N/A",
        "Clean Phone": c.phoneRaw || "N/A",
        "Email": c.customerEmail || "N/A",
        "Address": c.fullAddress || `${c.city || ""}, ${c.state || ""}`,
        "City": c.city || "N/A",
        "State": c.state || "N/A",
        "Pincode": c.zipCode || "N/A",
        "Cart Value (INR)": c.cartValue,
        "Items Count": c.itemCount,
        "Items In Cart": itemTitles,
        "Status": c.status,
        "Abandoned At": new Date(c.cartUpdatedAt).toLocaleString("en-IN"),
        "Recovery Notes": c.recoveryNotes || "",
        "Last Contacted By": c.contactedBy || "N/A",
        "Last Contacted At": c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleString("en-IN") : "N/A",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
      { wch: 14 },
      { wch: 25 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
      { wch: 45 },
      { wch: 14 },
      { wch: 22 },
      { wch: 30 },
      { wch: 20 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Abandoned_Carts");
    XLSX.writeFile(wb, `halte_abandoned_carts_${rangeFilter}_export.xlsx`);
  };

  // Format currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Format relative time
  const formatTimeAgo = (dateStr: string | Date) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {syncToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate text-white px-5 py-3 rounded-md shadow-2xl border border-stone-dark/30 flex items-center gap-3 text-[13px] animate-in fade-in slide-in-from-top-4">
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{syncToast}</span>
          <button onClick={() => setSyncToast(null)} className="ml-2 text-stone hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher between CRM Leads and Abandoned Carts */}
      <div className="flex items-center gap-2">
        <Link
          href="/leads"
          className="text-[12px] font-semibold px-3 py-1 rounded bg-stone-light/60 hover:bg-stone/30 text-slate transition-colors flex items-center gap-1.5 border border-stone/30"
        >
          <span>💬</span>
          <span>WhatsApp &amp; CRM Inbound Leads</span>
        </Link>
        <span className="text-[12px] font-bold px-3 py-1 rounded bg-slate text-white shadow-xs flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
          <span>Halte Abandoned Carts Hub</span>
          <span className="text-[9.5px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
            Active
          </span>
        </span>
      </div>

      {/* Header with Title & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone/30 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[12px] uppercase font-bold tracking-widest text-emerald-700">
            <ShoppingCart className="w-4 h-4" /> Halte.in E-Commerce Telemetry
          </div>
          <h1 className="font-serif text-2xl font-bold text-slate mt-1">
            Abandoned Cart Recovery Hub
          </h1>
          <p className="text-[13px] text-ink-soft mt-0.5">
            Real-time customer contact information, addresses, and cart contents to connect and recover orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Date Range Selector */}
          <select
            value={rangeFilter}
            onChange={(e) => {
              setRangeFilter(e.target.value);
              router.push(`/abandoned-carts?status=${statusFilter}&range=${e.target.value}&q=${encodeURIComponent(searchTerm)}`);
            }}
            className="text-[12.5px] border border-stone-dark/30 rounded px-2.5 py-1.5 bg-white text-slate font-medium hover:border-slate/40 focus:outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Sync Button */}
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1.5 text-[12.5px] font-medium bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing Halte..." : "Sync Halte Carts"}
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-[12.5px] font-medium border border-stone-dark/30 hover:border-slate/40 bg-white text-slate px-3.5 py-1.5 rounded shadow-sm transition-all"
            title="Download full customer details in Excel"
          >
            <Download className="w-3.5 h-3.5 text-stone-dark" />
            Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Abandoned */}
        <div className="bg-white border border-stone/30 rounded-md p-4 shadow-sm hover:border-slate/30 transition-all">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-soft flex items-center justify-between">
            <span>Abandoned Carts</span>
            <ShoppingCart className="w-4 h-4 text-stone-dark" />
          </div>
          <div className="font-serif text-2xl font-bold text-slate mt-1.5">
            {summary.totalCount}
          </div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            From Halte website shoppers
          </div>
        </div>

        {/* Potential Value */}
        <div className="bg-white border border-stone/30 rounded-md p-4 shadow-sm hover:border-slate/30 transition-all">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
            <span>Recoverable Value</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-amber-700 mt-1.5">
            {formatINR(summary.totalCartValue)}
          </div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            Total active cart balances
          </div>
        </div>

        {/* Contacted */}
        <div className="bg-white border border-stone/30 rounded-md p-4 shadow-sm hover:border-slate/30 transition-all">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
            <span>Customers Contacted</span>
            <MessageCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-blue-800 mt-1.5">
            {summary.contactedCount}
          </div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            Reached via WhatsApp / Call
          </div>
        </div>

        {/* Recovered & Rate */}
        <div className="bg-white border border-stone/30 rounded-md p-4 shadow-sm hover:border-slate/30 transition-all">
          <div className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Recovered Revenue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-800 mt-1.5 flex items-baseline gap-2">
            <span>{formatINR(summary.recoveredValue)}</span>
            <span className="text-[12px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary.recoveryRate}% rate
            </span>
          </div>
          <div className="text-[12px] text-ink-soft mt-0.5">
            {summary.recoveredCount} converted orders
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-light/40 p-2.5 rounded-md border border-stone/30">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "All Carts", count: carts.length },
            { id: "ABANDONED", label: "Uncontacted", count: carts.filter((c) => c.status === "ABANDONED").length },
            { id: "CONTACTED", label: "Contacted", count: carts.filter((c) => c.status === "CONTACTED").length },
            { id: "RECOVERED", label: "Recovered", count: carts.filter((c) => c.status === "RECOVERED").length },
            { id: "HIGH_VALUE", label: "High Value (>₹5k)", count: carts.filter((c) => c.cartValue >= 5000).length },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-[12.5px] px-3 py-1.5 rounded transition-all font-medium flex items-center gap-1.5 ${
                  active
                    ? "bg-slate text-white shadow-sm font-semibold"
                    : "bg-white text-slate hover:bg-stone/20 border border-stone/30"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                    active ? "bg-white/20 text-white" : "bg-stone/20 text-stone-dark"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-stone-dark absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, email, SKU, city..."
            className="w-full pl-9 pr-3 py-1.5 text-[12.5px] bg-white border border-stone-dark/30 rounded focus:border-slate focus:outline-none placeholder:text-stone-dark/60"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2.5 text-stone-dark hover:text-slate"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Grid of Customer Abandoned Carts */}
      <div className="bg-white border border-stone/30 rounded-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-light/60 border-b border-stone/30 text-[11.5px] font-bold uppercase tracking-wider text-stone-dark">
                <th className="py-3 px-4">Customer Contact Info</th>
                <th className="py-3 px-4">Location / Address</th>
                <th className="py-3 px-4">Items In Cart</th>
                <th className="py-3 px-4 text-right">Cart Total</th>
                <th className="py-3 px-4">Abandoned At</th>
                <th className="py-3 px-4">Recovery Status</th>
                <th className="py-3 px-4 text-center">Quick Connect</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/20 text-[13px]">
              {filteredCarts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-soft">
                    <ShoppingCart className="w-8 h-8 mx-auto text-stone-dark mb-2 opacity-50" />
                    <p className="font-medium text-slate">No abandoned carts found matching your filter.</p>
                    <p className="text-[12px] text-stone-dark mt-1">
                      Try switching filter tabs or click &quot;Sync Halte Carts&quot; to fetch the latest records.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCarts.map((cart) => {
                  const cleanPhone = cart.phoneRaw || cart.customerPhone?.replace(/\D/g, "").slice(-10) || "";
                  const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const firstItem = cart.items[0];
                  const itemTitle = firstItem?.title || "your items";
                  const waMessage = encodeURIComponent(
                    `Hi ${cart.customerName || "Customer"}, we noticed you left ${itemTitle} in your cart on Halte.in! Do you have any questions or need help completing your order? We can also share a special discount code for you!`
                  );

                  return (
                    <tr
                      key={cart.id}
                      className={`hover:bg-stone-light/30 transition-colors ${
                        selectedCart?.id === cart.id ? "bg-stone-light/50" : ""
                      }`}
                    >
                      {/* Customer Contact Info */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate flex items-center gap-1.5">
                          <span>{cart.customerName || "Guest / Customer"}</span>
                          {cart.customerId && (
                            <span className="text-[10px] text-stone-dark bg-stone/20 px-1.5 py-0.2 rounded font-mono">
                              #{cart.customerId}
                            </span>
                          )}
                        </div>

                        {/* Phone Number */}
                        {cart.customerPhone ? (
                          <div className="flex items-center gap-1.5 text-[12px] text-slate/90 mt-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-stone-dark shrink-0" />
                            <span>{cart.customerPhone}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-dark italic">No phone captured</span>
                        )}

                        {/* Email */}
                        {cart.customerEmail && (
                          <div className="flex items-center gap-1.5 text-[12px] text-ink-soft mt-0.5 truncate max-w-[210px]" title={cart.customerEmail}>
                            <Mail className="w-3.5 h-3.5 text-stone-dark shrink-0" />
                            <span className="truncate">{cart.customerEmail}</span>
                          </div>
                        )}
                      </td>

                      {/* Location / Address */}
                      <td className="py-3.5 px-4 align-top text-[12.5px] max-w-[190px]">
                        {cart.city || cart.state ? (
                          <div>
                            <div className="font-medium text-slate flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{cart.city ? `${cart.city}, ${cart.state || ""}` : cart.state}</span>
                            </div>
                            {cart.zipCode && (
                              <div className="text-[11px] text-stone-dark ml-4.5 font-mono">
                                PIN: {cart.zipCode}
                              </div>
                            )}
                            {cart.addressLine1 && (
                              <div className="text-[11px] text-ink-soft mt-0.5 ml-4.5 line-clamp-1" title={cart.fullAddress || ""}>
                                {cart.addressLine1}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-dark italic flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-dark/50" /> Location not provided
                          </span>
                        )}
                      </td>

                      {/* Items In Cart */}
                      <td className="py-3.5 px-4 align-top max-w-[260px]">
                        <div className="flex flex-col gap-1.5">
                          {cart.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {item.main_image ? (
                                <img
                                  src={item.main_image}
                                  alt={item.title}
                                  className="w-8 h-8 object-cover rounded border border-stone/30 shrink-0 bg-stone-light"
                                  onError={(e: any) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-stone/20 flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-stone-dark" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium text-[12px] text-slate truncate" title={item.title}>
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-stone-dark flex items-center gap-2">
                                  <span className="font-mono bg-stone/15 px-1 rounded">{item.sku}</span>
                                  <span>Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {cart.items.length > 2 && (
                            <div className="text-[11px] font-medium text-emerald-700">
                              +{cart.items.length - 2} more item{cart.items.length - 2 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cart Total */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="font-serif font-bold text-[14.5px] text-slate">
                          {formatINR(cart.cartValue)}
                        </div>
                        <div className="text-[11px] text-stone-dark">
                          {cart.itemCount} item{cart.itemCount > 1 ? "s" : ""}
                        </div>
                      </td>

                      {/* Abandoned At */}
                      <td className="py-3.5 px-4 align-top text-[12px]">
                        <div className="font-medium text-slate">
                          {formatTimeAgo(cart.cartUpdatedAt)}
                        </div>
                        <div className="text-[11px] text-stone-dark mt-0.5">
                          {new Date(cart.cartUpdatedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Recovery Status */}
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${
                            cart.status === "RECOVERED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : cart.status === "CONTACTED"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : cart.status === "LOST"
                              ? "bg-stone-light text-stone-dark border border-stone/30"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {cart.status === "RECOVERED" && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                          {cart.status === "CONTACTED" && <Clock className="w-3 h-3 text-blue-700" />}
                          {cart.status === "ABANDONED" && <AlertCircle className="w-3 h-3 text-amber-700" />}
                          {cart.status}
                        </span>
                        {cart.lastContactedAt && (
                          <div className="text-[10.5px] text-stone-dark mt-1">
                            Contacted {formatTimeAgo(cart.lastContactedAt)}
                          </div>
                        )}
                      </td>

                      {/* Quick Connect Actions */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Button */}
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${waNumber}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-sm"
                              title="Chat with Customer on WhatsApp"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="p-1.5 rounded-full bg-stone/20 text-stone-dark/40 cursor-not-allowed">
                              <MessageCircle className="w-4 h-4" />
                            </span>
                          )}

                          {/* Direct Call */}
                          {cleanPhone ? (
                            <a
                              href={`tel:+91${cleanPhone}`}
                              className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm"
                              title="Call Customer Directly"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="p-1.5 rounded-full bg-stone/20 text-stone-dark/40 cursor-not-allowed">
                              <Phone className="w-4 h-4" />
                            </span>
                          )}

                          {/* Email */}
                          {cart.customerEmail ? (
                            <a
                              href={`mailto:${cart.customerEmail}?subject=Regarding%20your%20Halte.in%20Cart&body=Hi%20${encodeURIComponent(
                                cart.customerName || "Customer"
                              )},%0D%0A%0D%0AWe%20noticed%20you%20were%20interested%20in%20completing%20your%20order%20on%20Halte.in.`}
                              className="p-1.5 rounded-full bg-stone hover:bg-slate text-white transition-all shadow-sm"
                              title="Send Email to Customer"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="p-1.5 rounded-full bg-stone/20 text-stone-dark/40 cursor-not-allowed">
                              <Mail className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* View Drawer Button */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <button
                          onClick={() => openCartDetails(cart)}
                          className="text-[12.5px] font-semibold text-slate hover:text-emerald-700 transition-colors flex items-center gap-0.5 ml-auto"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Customer Cart Detail Drawer */}
      {selectedCart && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div>
              <div className="p-5 border-b border-stone/30 bg-stone-light/40 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Customer Cart Profile
                  </div>
                  <h2 className="font-serif text-xl font-bold text-slate mt-0.5">
                    {selectedCart.customerName || "Customer"}
                  </h2>
                  <div className="text-[12px] text-ink-soft">
                    {selectedCart.customerId ? `Halte Customer #${selectedCart.customerId}` : "Guest Checkout User"} • Abandoned {formatTimeAgo(selectedCart.cartUpdatedAt)}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCart(null)}
                  className="p-1.5 rounded-md hover:bg-stone/20 text-stone-dark hover:text-slate transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Update Banner */}
              {updateSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 text-[12.5px] px-5 py-2.5 border-b border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{updateSuccessMsg}</span>
                </div>
              )}

              {/* Drawer Content */}
              <div className="p-6 space-y-6">
                {/* 1. Customer Contact & Quick Connect Banner */}
                <div className="bg-stone-light/40 border border-stone/30 rounded-md p-4 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-dark">
                    Contact &amp; Recovery Channels
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                    {/* Phone */}
                    <div className="bg-white p-3 rounded border border-stone/20">
                      <div className="text-[11px] text-stone-dark flex items-center gap-1 font-semibold uppercase">
                        <Phone className="w-3.5 h-3.5" /> Phone Number
                      </div>
                      <div className="font-mono font-bold text-[14px] text-slate mt-1">
                        {selectedCart.customerPhone || "Not provided"}
                      </div>
                      {selectedCart.phoneRaw && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <a
                            href={`https://wa.me/91${selectedCart.phoneRaw}?text=${encodeURIComponent(
                              `Hi ${selectedCart.customerName || "Customer"}, we noticed you left ${selectedCart.items[0]?.title || "items"} in your cart on Halte.in! Can we assist with delivery or offer you an exclusive discount?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11.5px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                          <a
                            href={`tel:+91${selectedCart.phoneRaw}`}
                            className="flex items-center gap-1 text-[11.5px] font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="bg-white p-3 rounded border border-stone/20">
                      <div className="text-[11px] text-stone-dark flex items-center gap-1 font-semibold uppercase">
                        <Mail className="w-3.5 h-3.5" /> Email Address
                      </div>
                      <div className="text-[13px] text-slate mt-1 truncate font-medium" title={selectedCart.customerEmail || ""}>
                        {selectedCart.customerEmail || "Not provided"}
                      </div>
                      {selectedCart.customerEmail && (
                        <div className="mt-2.5">
                          <a
                            href={`mailto:${selectedCart.customerEmail}?subject=Exclusive%20Offer%20for%20your%20Halte.in%20Cart&body=Hi%20${encodeURIComponent(
                              selectedCart.customerName || "Customer"
                            )},%0D%0A%0D%0AWe%20saw%20you%20were%20interested%20in%20${encodeURIComponent(
                              selectedCart.items[0]?.title || "Halte products"
                            )}.%0D%0AUse%20code%20HALTEFIRST%20for%20an%20instant%20discount!`}
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold bg-slate hover:bg-stone text-white px-2.5 py-1 rounded transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" /> Send Recovery Email
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="bg-white p-3 rounded border border-stone/20">
                    <div className="text-[11px] text-stone-dark flex items-center gap-1 font-semibold uppercase">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" /> Delivery Address &amp; Region
                    </div>
                    {selectedCart.fullAddress || selectedCart.city ? (
                      <div className="mt-1.5 text-[13px] text-slate">
                        <p className="font-medium">
                          {[selectedCart.addressLine1, selectedCart.addressLine2].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-ink-soft">
                          {[selectedCart.city, selectedCart.state, selectedCart.zipCode ? `PIN: ${selectedCart.zipCode}` : ""]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[12.5px] text-stone-dark italic mt-1">
                        No shipping address entered yet. Customer dropped off before checkout step.
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Items In Cart Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-dark flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" /> Items in Cart ({selectedCart.itemCount})
                    </div>
                    <div className="font-serif font-bold text-slate text-[15px]">
                      Total: {formatINR(selectedCart.cartValue)}
                    </div>
                  </div>

                  <div className="divide-y divide-stone/20 border border-stone/30 rounded-md overflow-hidden bg-white">
                    {selectedCart.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-start gap-3 hover:bg-stone-light/20 transition-colors">
                        {item.main_image ? (
                          <img
                            src={item.main_image}
                            alt={item.title}
                            className="w-12 h-12 object-cover rounded border border-stone/30 shrink-0 bg-stone-light"
                            onError={(e: any) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-stone/20 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-stone-dark" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13px] text-slate line-clamp-2">
                            {item.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11.5px] text-stone-dark">
                            <span className="font-mono bg-stone/15 px-1.5 py-0.2 rounded font-semibold text-slate">
                              SKU: {item.sku}
                            </span>
                            {item.brand && (
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                                {item.brand}
                              </span>
                            )}
                            <span>Qty: <b>{item.quantity}</b></span>
                            <span>Price: <b>{formatINR(item.shown_price)}</b></span>
                          </div>
                        </div>

                        {item.slug && (
                          <a
                            href={`https://halte.in/product/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-dark hover:text-emerald-700 transition-colors"
                            title="View product on Halte.in"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Recovery Status & Staff Notes */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-dark">
                    Recovery Workflow Status
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(["ABANDONED", "CONTACTED", "RECOVERED", "LOST"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateCart(st)}
                        disabled={isUpdating}
                        className={`text-[11.5px] py-2 px-1 rounded font-bold uppercase tracking-wider transition-all border ${
                          selectedCart.status === st
                            ? st === "RECOVERED"
                              ? "bg-emerald-700 text-white border-emerald-800 shadow-sm"
                              : st === "CONTACTED"
                              ? "bg-blue-700 text-white border-blue-800 shadow-sm"
                              : st === "LOST"
                              ? "bg-stone-dark text-white border-stone-dark shadow-sm"
                              : "bg-amber-700 text-white border-amber-800 shadow-sm"
                            : "bg-white text-slate border-stone/30 hover:border-slate/40"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className="text-[12px] font-bold uppercase tracking-wider text-stone-dark block mb-1">
                      Staff Recovery Notes
                    </label>
                    <textarea
                      rows={3}
                      value={activeNote}
                      onChange={(e) => setActiveNote(e.target.value)}
                      placeholder="Add follow-up notes, customer objections, promised discount codes, or callback times..."
                      className="w-full p-2.5 text-[12.5px] border border-stone-dark/30 rounded focus:border-slate focus:outline-none placeholder:text-stone-dark/60 font-sans"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[11px] text-stone-dark">
                        {selectedCart.contactedBy ? `Last updated by ${selectedCart.contactedBy}` : `Logged by ${userEmail}`}
                      </span>
                      <button
                        onClick={() => handleUpdateCart()}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 text-[12px] font-medium bg-slate hover:bg-stone text-white px-3 py-1.5 rounded transition-all disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isUpdating ? "Saving..." : "Save Note"}
                      </button>
                    </div>
                  </div>

                  {/* Previous Remarks History */}
                  {selectedCart.remarks && selectedCart.remarks.length > 0 && (
                    <div className="mt-4 border-t border-stone/20 pt-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-stone-dark mb-2">
                        Activity &amp; Remarks Timeline
                      </div>
                      <div className="space-y-2">
                        {selectedCart.remarks.map((r, i) => (
                          <div key={i} className="text-[12px] bg-stone-light/40 p-2.5 rounded border border-stone/20">
                            <p className="text-slate font-medium">{r.remark}</p>
                            <div className="text-[10.5px] text-stone-dark mt-1 flex items-center justify-between">
                              <span>By: {r.added_by || "Staff"}</span>
                              <span>{new Date(r.created_at).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-stone/30 bg-stone-light/40 flex items-center justify-between">
              <span className="text-[11.5px] text-stone-dark font-mono">
                Cart Ref: {selectedCart.cartRef}
              </span>
              <button
                onClick={() => setSelectedCart(null)}
                className="text-[12.5px] font-medium px-4 py-1.5 border border-stone-dark/30 hover:border-slate rounded bg-white text-slate transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
