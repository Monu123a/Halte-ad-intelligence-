"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { extractLeadMetadata } from "@/lib/leadMatcher";

interface UserItem {
  id: string;
  email: string;
  role: "ADMIN" | "ANALYST" | "LEAD_TAGGER";
  createdAt: string | Date;
}

export default function LeadsClient({ 
  initialLeads, 
  currentTag, 
  availableAdSets = [],
  isAdmin = false,
  initialUsers = [],
  currentUserId
}: { 
  initialLeads: any[]; 
  currentTag: string; 
  availableAdSets?: any[]; 
  isAdmin?: boolean;
  initialUsers?: UserItem[];
  currentUserId?: string;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const toggleThread = (leadId: string) => {
    setExpandedThreads(prev => ({ ...prev, [leadId]: !prev[leadId] }));
  };

  // Team permission state for WhatsApp lead tagging
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"LEAD_TAGGER" | "ANALYST" | "ADMIN">("LEAD_TAGGER");
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [teamSuccess, setTeamSuccess] = useState("");

  // Sync state when URL/props change
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    if (initialUsers) setUsers(initialUsers);
  }, [initialUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamError("");
    setTeamSuccess("");
    setTeamLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUsers([data.user, ...users]);
      setNewEmail("");
      setNewPassword("");
      setNewRole("LEAD_TAGGER");
      setTeamSuccess(`Access granted to ${data.user.email} (${data.user.role === "LEAD_TAGGER" ? "Lead Tagger" : data.user.role})!`);
    } catch (err: any) {
      setTeamError(err.message || "Failed to create user");
    } finally {
      setTeamLoading(false);
    }
  };

  const handleDeleteUser = async (id: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to revoke lead tagging access for "${userEmail}"?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to revoke access");
      }
    } catch (err) {
      alert("Error revoking access");
    }
  };


  const handleTag = async (leadId: string, tag: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag })
      });
      if (res.status === 401) {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        if (currentTag !== "ALL") {
          setLeads(leads.filter(l => l.id !== leadId));
        } else {
          setLeads(leads.map(l => l.id === leadId ? { ...l, tag } : l));
        }
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAdSet = async (leadId: string, adSetId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adSetId })
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(leads.map(l => l.id === leadId ? { ...l, adSet: data.lead.adSet, adSetId } : l));
      }
    } catch (err) {
      console.error("Failed to assign ad set:", err);
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const sampleData = [
      {
        "Phone Number": "9914130130",
        "Customer Inquiry / Product": "Customer inquired about Gardena RollUp 30m Hose Reel pricing & warranty",
        "Ad Set / Campaign (Optional)": "Gardena_Search_AdSet_01"
      },
      {
        "Phone Number": "9876543210",
        "Customer Inquiry / Product": "Need quotation for BKR 52cc Brush Cutter with tiller attachment",
        "Ad Set / Campaign (Optional)": ""
      },
      {
        "Phone Number": "9812345678",
        "Customer Inquiry / Product": "Bulk inquiry for Gorilla Super Glue 15g pack of 10",
        "Ad Set / Campaign (Optional)": "Gorilla_Meta_AdSet_02"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    // Set column widths
    ws["!cols"] = [{ wch: 18 }, { wch: 65 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads_Template");
    XLSX.writeFile(wb, "halte_leads_template.xlsx");
  };

  const exportToExcel = async () => {
    if (leads.length === 0) {
      alert("No leads to export");
      return;
    }
    const XLSX = await import("xlsx");
    const exportData = filteredLeads.map((l) => {
      const meta = extractLeadMetadata(l.messageText, l.contactRef);
      const messages = l.messageText ? l.messageText.split("\n---\n") : [];
      return {
        "Contact / Name": l.contactRef,
        "Phone Number": l.phoneRaw || meta.phoneRaw || "",
        "Receiving Channel": l.instance || meta.phoneInstance || "WhatsApp",
        "Platform Source": l.platform || meta.platform || "",
        "Account / Handle": l.accountName || meta.accountName || "",
        "Messages Received": l.messagesCount || (messages.length > 0 ? messages.length : 1),
        "Latest Message": messages.length > 0 ? messages[messages.length - 1] : (l.messageText || ""),
        "Full Message History": l.messageText || "",
        "Tag Status": l.tag,
        "Brand": l.adSet?.campaign?.brand?.name || meta.brand || "Unassigned",
        "Ad Set": l.adSet?.name || "Direct / Web",
        "State / Region": meta.state || "",
        "Date": new Date(l.updatedAt || l.createdAt).toLocaleDateString(),
        "Time": new Date(l.updatedAt || l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 16 }, { wch: 20 },
      { wch: 10 }, { wch: 45 }, { wch: 60 }, { wch: 14 }, { wch: 16 },
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 10 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads_Export");
    XLSX.writeFile(wb, `halte_leads_${currentTag.toLowerCase()}_export.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (rows.length === 0) {
        alert("The uploaded file contains no data rows.");
        return;
      }

      // Detect column keys dynamically
      const payload = rows.map((row) => {
        let contactRef = "";
        let messageText = "";
        let adSetId = "";

        for (const [key, val] of Object.entries(row)) {
          const k = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          const v = String(val).trim();
          if (!v) continue;

          if (k.includes("phone") || k.includes("mobile") || k.includes("contact") || k.includes("customer") || k === "number") {
            contactRef = v;
          } else if (k.includes("message") || k.includes("inquiry") || k.includes("text") || k.includes("product") || k.includes("body")) {
            messageText = v;
          } else if (k.includes("adset") || k.includes("campaign") || k.includes("ad")) {
            adSetId = v;
          }
        }

        // Fallback for unlabeled/standard positional columns
        if (!contactRef && Object.values(row)[0]) {
          contactRef = String(Object.values(row)[0]).trim();
        }
        if (!messageText && Object.values(row)[1]) {
          messageText = String(Object.values(row)[1]).trim();
        }
        if (!adSetId && Object.values(row)[2]) {
          adSetId = String(Object.values(row)[2]).trim();
        }

        return {
          contactRef: contactRef || "Unknown",
          messageText: messageText || null,
          adSetId: adSetId || undefined
        };
      }).filter((l) => l.contactRef && l.contactRef !== "Phone Number");

      if (payload.length === 0) {
        alert("No valid lead contacts found in the file.");
        return;
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: payload })
      });

      if (res.ok) {
        const json = await res.json();
        alert(`Successfully imported ${json.count || payload.length} lead(s) into ADuniFY!`);
        window.location.reload();
      } else {
        alert("Import failed. Please verify your file structure.");
      }
    } catch (err) {
      console.error("Excel import error:", err);
      alert("Error parsing file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const getTabClass = (tabName: string) => {
    return currentTag === tabName
      ? "text-[12px] font-bold text-ink border-b-2 border-ink pb-1 px-1"
      : "text-[12px] font-semibold text-ink-soft hover:text-ink pb-1 px-1 transition-colors";
  };

  // Channel breakdown counts
  const channelCounts = {
    ALL: leads.length,
    PHONE_1: leads.filter(l => {
      const inst = l.instance || "";
      const text = l.messageText || "";
      return inst.includes("Phone 1") || /\[(phone_1|phone 1)\]/i.test(text);
    }).length,
    PHONE_2: leads.filter(l => {
      const inst = l.instance || "";
      const text = l.messageText || "";
      return inst.includes("Phone 2") || /\[(phone_2|phone 2)\]/i.test(text);
    }).length,
    INSTAGRAM: leads.filter(l => {
      const plat = l.platform || "";
      const text = (l.messageText || "").toLowerCase();
      const acc = l.accountName || "";
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      return plat === "Instagram Ad" || text.includes("instagram") || acc.startsWith("@") || camp.includes("instagram");
    }).length,
    INSTAGRAM_BKR: leads.filter(l => {
      const acc = l.accountName || "";
      const text = (l.messageText || "").toLowerCase();
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      return acc.includes("bkr") || text.includes("bkr") || camp.includes("bkr");
    }).length,
    INSTAGRAM_GARDENA: leads.filter(l => {
      const acc = l.accountName || "";
      const text = (l.messageText || "").toLowerCase();
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      return acc.includes("gardena") || text.includes("gardena") || camp.includes("gardena");
    }).length,
    FACEBOOK: leads.filter(l => {
      const plat = l.platform || "";
      const text = (l.messageText || "").toLowerCase();
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      return plat === "Facebook Ad" || text.includes("facebook") || camp.includes("facebook");
    }).length,
    WEBSITE: leads.filter(l => {
      const plat = l.platform || "";
      const text = (l.messageText || "").toLowerCase();
      return plat === "Halte.in Web" || text.includes("website") || text.includes("halte.in");
    }).length,
  };

  const filteredLeads = leads.filter(l => {
    // 1. Channel filter
    if (channelFilter === "PHONE_1") {
      const inst = l.instance || "";
      const text = l.messageText || "";
      if (!inst.includes("Phone 1") && !/\[(phone_1|phone 1)\]/i.test(text)) return false;
    } else if (channelFilter === "PHONE_2") {
      const inst = l.instance || "";
      const text = l.messageText || "";
      if (!inst.includes("Phone 2") && !/\[(phone_2|phone 2)\]/i.test(text)) return false;
    } else if (channelFilter === "INSTAGRAM") {
      const plat = l.platform || "";
      const text = (l.messageText || "").toLowerCase();
      const acc = l.accountName || "";
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      if (plat !== "Instagram Ad" && !text.includes("instagram") && !acc.startsWith("@") && !camp.includes("instagram")) return false;
    } else if (channelFilter === "INSTAGRAM_BKR") {
      const acc = l.accountName || "";
      const text = (l.messageText || "").toLowerCase();
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      if (!acc.includes("bkr") && !text.includes("bkr") && !camp.includes("bkr")) return false;
    } else if (channelFilter === "INSTAGRAM_GARDENA") {
      const acc = l.accountName || "";
      const text = (l.messageText || "").toLowerCase();
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      if (!acc.includes("gardena") && !text.includes("gardena") && !camp.includes("gardena")) return false;
    } else if (channelFilter === "FACEBOOK") {
      const plat = l.platform || "";
      const text = (l.messageText || "").toLowerCase();
      const camp = (l.adSet?.campaign?.name || "").toLowerCase();
      if (plat !== "Facebook Ad" && !text.includes("facebook") && !camp.includes("facebook")) return false;
    } else if (channelFilter === "WEBSITE") {
      const plat = l.platform || "";
      const text = (l.messageText || "").toLowerCase();
      if (plat !== "Halte.in Web" && !text.includes("website") && !text.includes("halte.in")) return false;
    }

    // 2. Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const contactMatch = l.contactRef?.toLowerCase().includes(q);
    const phoneMatch = l.phoneRaw?.toLowerCase().includes(q);
    const msgMatch = l.messageText?.toLowerCase().includes(q);
    const adMatch = l.adSet?.name?.toLowerCase().includes(q);
    const instMatch = l.instance?.toLowerCase().includes(q);
    const accMatch = l.accountName?.toLowerCase().includes(q);
    return contactMatch || phoneMatch || msgMatch || adMatch || instMatch || accMatch;
  });

  return (
    <div>
      {/* Tab Switcher between Inbound Leads and Abandoned Carts */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] font-bold px-3 py-1 rounded bg-slate text-white shadow-xs">
          WhatsApp &amp; CRM Inbound Leads
        </span>
        <Link
          href="/abandoned-carts"
          className="text-[12px] font-semibold px-3 py-1 rounded bg-stone-light/60 hover:bg-stone/30 text-slate transition-colors flex items-center gap-1.5 border border-stone/30"
        >
          <span>🛒</span>
          <span>Halte Abandoned Carts Recovery</span>
          <span className="text-[9.5px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
            New Tab
          </span>
        </Link>
      </div>

      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Lead Tagging</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">WhatsApp inquiries &amp; website leads — tag each against campaigns</p>
        </div>
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={() => setShowTeamModal(true)}
              className="text-[12px] font-semibold border border-stone px-3.5 py-1.5 text-ink hover:text-green hover:border-green/50 bg-card rounded-sm transition-colors flex items-center gap-1.5"
            >
              <span>👥</span>
              <span>Team Tagging Access</span>
              <span className="text-[10px] bg-green-tint text-green px-1.5 py-0.2 rounded font-bold">
                {users.filter(u => u.role === "LEAD_TAGGER").length} Taggers
              </span>
            </button>
          )}
          <button
            onClick={exportToExcel}
            className="text-[12px] font-semibold border border-stone px-3.5 py-1.5 text-ink-soft hover:text-ink hover:border-stone-dark bg-card rounded-sm transition-colors flex items-center gap-1.5"
          >
            <span>↓</span> Export to Excel
          </button>
          <div className="text-[12.5px] border border-stone px-4 py-1.5 text-ink-soft bg-card rounded-md font-mono">
            {leads.length} leads
          </div>
        </div>
      </div>


      <div className="card-base p-6 mb-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-amber-tint border-[#e3d3a8]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-bold">Excel &amp; CSV Bulk Lead Import</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-amber text-white">XLSX &bull; XLS &bull; CSV</span>
          </div>
          <p className="text-[12.5px] text-ink-soft">
            Upload WhatsApp inquiries directly from Excel. Columns: <strong>Phone Number</strong>, <strong>Customer Inquiry / Product</strong>, and optional <strong>Ad Set</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={downloadTemplate}
            className="text-[12px] font-semibold py-2 px-3.5 rounded-sm border border-stone bg-white text-ink hover:bg-stone/10 transition-colors"
          >
            Download Excel Template
          </button>
          <label className="text-[12px] font-semibold py-2 px-4 rounded-sm bg-amber text-white hover:bg-amber/90 cursor-pointer transition-colors shadow-sm inline-block">
            {importing ? "Importing..." : "Upload Excel / CSV"}
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden" 
            />
          </label>
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 border-b border-stone pb-[1px]">
        <div className="flex gap-4">
          <Link href="/leads?tag=UNTAGGED" className={getTabClass("UNTAGGED")}>Untagged</Link>
          <Link href="/leads?tag=GENUINE" className={getTabClass("GENUINE")}>Genuine</Link>
          <Link href="/leads?tag=QUOTATION_SENT" className={getTabClass("QUOTATION_SENT")}>Quotation Sent</Link>
          <Link href="/leads?tag=CONVERTED" className={getTabClass("CONVERTED")}>Converted</Link>
          <Link href="/leads?tag=INFO_ONLY" className={getTabClass("INFO_ONLY")}>Info-only</Link>
          <Link href="/leads?tag=SPAM" className={getTabClass("SPAM")}>Spam</Link>
          <Link href="/leads?tag=ALL" className={getTabClass("ALL")}>All</Link>
        </div>
        
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search phone, message, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-[12.5px] px-3 py-1.5 border border-stone rounded-sm bg-card w-[240px] outline-none focus:border-stone-dark transition-colors"
          />
        </div>
      </div>

      {/* Channel / Destination Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 bg-[#F9F8F5] border border-stone rounded-md">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mr-1 flex items-center gap-1">
          <span>📡</span> Receiving Channel / Account:
        </span>
        <button
          onClick={() => setChannelFilter("ALL")}
          className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all ${
            channelFilter === "ALL"
              ? "bg-ink text-white border-ink shadow-xs"
              : "bg-white text-ink-soft border-stone hover:text-ink hover:border-ink/40"
          }`}
        >
          All Channels ({channelCounts.ALL})
        </button>
        <button
          onClick={() => setChannelFilter("PHONE_1")}
          className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
            channelFilter === "PHONE_1"
              ? "bg-[#128C7E] text-white border-[#128C7E] shadow-xs"
              : "bg-white text-ink-soft border-stone hover:text-[#128C7E] hover:border-[#128C7E]/40"
          }`}
        >
          <span>📱</span> WhatsApp Phone 1 ({channelCounts.PHONE_1})
        </button>
        <button
          onClick={() => setChannelFilter("PHONE_2")}
          className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
            channelFilter === "PHONE_2"
              ? "bg-[#075E54] text-white border-[#075E54] shadow-xs"
              : "bg-white text-ink-soft border-stone hover:text-[#075E54] hover:border-[#075E54]/40"
          }`}
        >
          <span>📱</span> WhatsApp Phone 2 ({channelCounts.PHONE_2})
        </button>
        <button
          onClick={() => setChannelFilter("INSTAGRAM")}
          className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
            channelFilter === "INSTAGRAM"
              ? "bg-[#E1306C] text-white border-[#E1306C] shadow-xs"
              : "bg-white text-ink-soft border-stone hover:text-[#E1306C] hover:border-[#E1306C]/40"
          }`}
        >
          <span>📸</span> All Instagram ({channelCounts.INSTAGRAM})
        </button>
        {channelCounts.INSTAGRAM_BKR > 0 && (
          <button
            onClick={() => setChannelFilter("INSTAGRAM_BKR")}
            className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
              channelFilter === "INSTAGRAM_BKR"
                ? "bg-[#833ab4] text-white border-[#833ab4] shadow-xs"
                : "bg-white text-ink-soft border-stone hover:text-[#833ab4] hover:border-[#833ab4]/40"
            }`}
          >
            <span>📸</span> IG: @bkr.machine ({channelCounts.INSTAGRAM_BKR})
          </button>
        )}
        {channelCounts.INSTAGRAM_GARDENA > 0 && (
          <button
            onClick={() => setChannelFilter("INSTAGRAM_GARDENA")}
            className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
              channelFilter === "INSTAGRAM_GARDENA"
                ? "bg-[#C13584] text-white border-[#C13584] shadow-xs"
                : "bg-white text-ink-soft border-stone hover:text-[#C13584] hover:border-[#C13584]/40"
            }`}
          >
            <span>📸</span> IG: @gardena.india ({channelCounts.INSTAGRAM_GARDENA})
          </button>
        )}
        <button
          onClick={() => setChannelFilter("FACEBOOK")}
          className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
            channelFilter === "FACEBOOK"
              ? "bg-[#1877F2] text-white border-[#1877F2] shadow-xs"
              : "bg-white text-ink-soft border-stone hover:text-[#1877F2] hover:border-[#1877F2]/40"
          }`}
        >
          <span>🔵</span> Facebook ({channelCounts.FACEBOOK})
        </button>
        <button
          onClick={() => setChannelFilter("WEBSITE")}
          className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-sm border transition-all flex items-center gap-1.5 ${
            channelFilter === "WEBSITE"
              ? "bg-green text-white border-green shadow-xs"
              : "bg-white text-ink-soft border-stone hover:text-green hover:border-green/40"
          }`}
        >
          <span>🌐</span> Website ({channelCounts.WEBSITE})
        </button>
      </div>

      <div className="flex flex-col gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
        {filteredLeads.length === 0 && (
          <div className="bg-card py-6 px-5 text-ink-soft text-[13.5px]">
            No leads found for this channel and filter.
          </div>
        )}
        {filteredLeads.map(lead => {
          const meta = extractLeadMetadata(lead.messageText, lead.contactRef);
          const brandName = lead.adSet?.campaign?.brand?.name || meta.brand || "Halte All";
          const adName = lead.adSet?.name;
          const time = new Date(lead.updatedAt || lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = new Date(lead.updatedAt || lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

          const instanceName = lead.instance || meta.phoneInstance;
          const platformName = lead.platform || meta.platform;
          const accountName = lead.accountName || meta.accountName;

          // Split multi-message thread
          const messages = lead.messageText ? lead.messageText.split("\n---\n") : [];
          const hasMultipleMessages = messages.length > 1 || (lead.messagesCount && lead.messagesCount > 1);
          const latestMessage = messages.length > 0 ? messages[messages.length - 1] : (lead.messageText || "");
          const isExpanded = expandedThreads[lead.id];

          return (
            <div key={lead.id} className="bg-card py-4 px-5 flex justify-between items-start gap-4 hover:bg-stone/5 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] leading-relaxed">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {/* Primary Channel & Inbox Tag */}
                    {instanceName?.includes("Phone 1") && instanceName?.includes("Phone 2") && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#128C7E] text-white flex items-center gap-1 shadow-2xs">
                        <span>📱</span> WhatsApp (Phone 1 &amp; 2)
                      </span>
                    )}
                    {instanceName?.includes("Phone 1") && !instanceName?.includes("Phone 2") && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#128C7E] text-white flex items-center gap-1 shadow-2xs">
                        <span>📱</span> WhatsApp Phone 1
                      </span>
                    )}
                    {instanceName?.includes("Phone 2") && !instanceName?.includes("Phone 1") && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#075E54] text-white flex items-center gap-1 shadow-2xs">
                        <span>📱</span> WhatsApp Phone 2
                      </span>
                    )}

                    {/* Exact Instagram / Facebook / Web Account attribution */}
                    {platformName === "Instagram Ad" && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-gradient-to-r from-[#833ab4] to-[#fd1d1d] text-white flex items-center gap-1 shadow-2xs">
                        <span>📸</span> {accountName ? `IG: ${accountName}` : "Instagram Ad"}
                      </span>
                    )}
                    {platformName === "Facebook Ad" && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#1877F2] text-white flex items-center gap-1 shadow-2xs">
                        <span>🔵</span> {accountName ? `FB: ${accountName}` : "Facebook Ad"}
                      </span>
                    )}
                    {platformName === "Halte.in Web" && (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-green text-white flex items-center gap-1 shadow-2xs">
                        <span>🌐</span> Website (Halte.in)
                      </span>
                    )}

                    <span className="font-semibold text-ink text-[13.5px] ml-0.5">{lead.contactRef}</span>

                    {hasMultipleMessages && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone/25 text-stone-dark font-mono">
                        {messages.length || lead.messagesCount} msgs
                      </span>
                    )}
                    {currentTag === "ALL" && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-stone text-stone-dark border border-stone-dark/30">
                        {lead.tag === "QUOTATION_SENT" ? "QUOTATION SENT" : lead.tag}
                      </span>
                    )}
                  </div>

                  {/* Latest Message Preview */}
                  {!isExpanded && latestMessage && (() => {
                    const isTeam = /\[[^\]]*(team|staff|agent|you|reply|support)/i.test(latestMessage.split("]")[0] || "");
                    const cleanText = latestMessage.replace(/^\[[^\]]+\]\s*/, "");
                    return (
                      <div className="text-ink-soft mt-1 text-[13px] line-clamp-2">
                        {isTeam ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-800">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Team Replied
                            </span>
                            <span className="text-emerald-900 font-medium">"{cleanText}"</span>
                          </span>
                        ) : (
                          <span>"{cleanText}"</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Thread View Expand/Collapse Toggle */}
                  {hasMultipleMessages && (
                    <button
                      type="button"
                      onClick={() => toggleThread(lead.id)}
                      className="text-[11px] font-semibold text-green hover:underline mt-1.5 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "▲ Hide conversation thread" : `▼ View conversation thread (${messages.length} messages)`}</span>
                    </button>
                  )}

                  {/* Expanded Conversation Thread */}
                  {isExpanded && (
                    <div className="mt-2.5 space-y-2.5 bg-[#F6F5F0] border border-stone/70 p-3.5 rounded-md max-h-[360px] overflow-y-auto">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-soft flex justify-between items-center pb-1.5 border-b border-stone/40">
                        <span className="flex items-center gap-2">
                          <span>Conversation Thread ({messages.length} messages)</span>
                          <span className="text-[9px] font-normal text-stone-dark flex items-center gap-1 ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-dark"></span> Customer
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-1.5"></span> Team Reply
                          </span>
                        </span>
                        <span className="font-mono text-[9px]">Earliest: {new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {messages.map((msg: string, idx: number) => {
                          const rawTag = msg.startsWith("[") ? msg.slice(1, msg.indexOf("]")) : "";
                          const isTeam = /\[[^\]]*(team|staff|agent|you|reply|support)/i.test(msg.split("]")[0] || "");
                          const cleanTag = isTeam 
                            ? rawTag.replace(/^(team|staff|reply)\s*[:•-]?\s*/i, "").trim()
                            : rawTag.trim();
                          const cleanContent = msg.replace(/^\[[^\]]+\]\s*/, "");

                          if (isTeam) {
                            return (
                              <div key={idx} className="flex flex-col items-end pl-6">
                                <div className="max-w-[85%] bg-[#E7F8E8] border border-[#B3E7BC] text-emerald-950 p-2.5 rounded-lg rounded-tr-xs shadow-2xs">
                                  <div className="text-[10px] font-mono text-emerald-800 mb-1 font-semibold flex items-center justify-end gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    <span>Team Reply</span>
                                    {cleanTag && <span>• {cleanTag}</span>}
                                    <span>&bull;</span>
                                    <span>#{idx + 1}</span>
                                  </div>
                                  <div className="whitespace-pre-wrap leading-relaxed text-[12.5px] font-medium text-emerald-950">{cleanContent}</div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={idx} className="flex flex-col items-start pr-6">
                              <div className="max-w-[85%] bg-white border border-stone/60 text-ink p-2.5 rounded-lg rounded-tl-xs shadow-2xs">
                                <div className="text-[10px] font-mono text-stone-dark mb-1 font-semibold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-dark"></span>
                                  <span>Customer</span>
                                  {cleanTag && <span>• {cleanTag}</span>}
                                  <span>&bull;</span>
                                  <span>#{idx + 1}</span>
                                </div>
                                <div className="whitespace-pre-wrap leading-relaxed text-[12.5px] text-ink">{cleanContent}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lead Attribution & Details Row */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11.5px]" suppressHydrationWarning>
                  {/* Receiving WhatsApp Instance Badge */}
                  {instanceName?.includes("Phone 1") && instanceName?.includes("Phone 2") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#128C7E]/10 text-[#075E54] border border-[#128C7E]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#128C7E]"></span>
                      📱 WhatsApp (Phone 1 &amp; 2)
                    </span>
                  )}
                  {instanceName?.includes("Phone 1") && !instanceName?.includes("Phone 2") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]"></span>
                      📱 WhatsApp (Phone 1)
                    </span>
                  )}
                  {instanceName?.includes("Phone 2") && !instanceName?.includes("Phone 1") && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#075E54]/10 text-[#075E54] border border-[#075E54]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#075E54]"></span>
                      📱 WhatsApp (Phone 2)
                    </span>
                  )}

                  {/* Platform / Account Source Badge */}
                  {platformName === "Instagram Ad" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E1306C]/10 text-[#E1306C] border border-[#E1306C]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E1306C]"></span>
                      📸 Instagram {accountName ? `(${accountName})` : "Ad"}
                    </span>
                  )}
                  {platformName === "Facebook Ad" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]"></span>
                      🔵 Facebook {accountName ? `(${accountName})` : "Ad"}
                    </span>
                  )}
                  {platformName === "Halte.in Web" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-green/10 text-green border border-green/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-green"></span>
                      🌐 Website CTWA
                    </span>
                  )}
                  {platformName === "WhatsApp Direct" && !instanceName && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-stone/20 text-stone-dark border border-stone">
                      WhatsApp Direct
                    </span>
                  )}

                  {/* Regional Telecom State Badge */}
                  {meta.state && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span>📍</span> {meta.state}
                    </span>
                  )}

                  {/* Brand Badge */}
                  <span className="font-semibold text-ink px-1.5 py-0.5 rounded bg-card border border-stone text-[11px]">
                    {brandName}
                  </span>

                  {/* Detected Product */}
                  {meta.product && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone/15 text-ink-soft border border-stone">
                      {meta.product}
                    </span>
                  )}

                  <span className="text-stone">&bull;</span>

                  {/* Ad Set Selector or Display */}
                  {adName ? (
                    <span className="text-ink-soft font-medium flex items-center gap-1">
                      <span>Ad Set: <strong className="text-ink">{adName}</strong></span>
                      <select
                        value={lead.adSetId || ""}
                        onChange={(e) => handleAssignAdSet(lead.id, e.target.value)}
                        className="ml-1 text-[10.5px] text-stone-dark border border-stone/70 rounded bg-white px-1 py-0.5 cursor-pointer hover:border-ink hover:text-ink max-w-[200px] truncate"
                        title="Change Ad Set"
                      >
                        <option value={lead.adSetId || ""}>Change Ad Set...</option>
                        {availableAdSets.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.campaign?.brand?.name ? `[${a.campaign.brand.name}] ` : ""}{a.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-tint text-amber border border-[#e3d3a8] px-2 py-0.5 rounded">
                        Unassigned Ad Set
                      </span>
                      <select
                        value=""
                        onChange={(e) => handleAssignAdSet(lead.id, e.target.value)}
                        className="text-[11px] font-semibold text-ink border border-amber/50 rounded bg-amber-tint/40 px-2 py-0.5 cursor-pointer hover:border-amber max-w-[220px]"
                      >
                        <option value="" disabled>Link to Ad Set...</option>
                        {availableAdSets.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.campaign?.brand?.name ? `[${a.campaign.brand.name}] ` : ""}{a.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  )}

                  <span className="text-stone">&bull;</span>
                  <span className="text-stone-dark text-[11px]">{dateStr}, {time}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 pt-0.5">
                <button onClick={() => handleTag(lead.id, "SPAM")} className={`text-[11.5px] font-semibold py-1.5 px-3 border rounded-sm transition-colors ${lead.tag === "SPAM" ? "bg-rust text-white border-rust" : "border-stone bg-white text-ink-soft hover:border-rust hover:text-rust"}`}>Spam</button>
                <button onClick={() => handleTag(lead.id, "INFO_ONLY")} className={`text-[11.5px] font-semibold py-1.5 px-3 border rounded-sm transition-colors ${lead.tag === "INFO_ONLY" ? "bg-ink text-white border-ink" : "border-stone bg-white text-ink-soft hover:border-ink"}`}>Info-only</button>
                <button onClick={() => handleTag(lead.id, "GENUINE")} className={`text-[11.5px] font-semibold py-1.5 px-3 border rounded-sm transition-colors ${lead.tag === "GENUINE" ? "bg-green text-white border-green" : "border-stone bg-white text-ink-soft hover:border-green hover:text-green"}`}>Genuine</button>
                <button onClick={() => handleTag(lead.id, "QUOTATION_SENT")} className={`text-[11.5px] font-semibold py-1.5 px-3 border rounded-sm transition-colors ${lead.tag === "QUOTATION_SENT" ? "bg-amber text-white border-amber" : "border-stone bg-white text-ink-soft hover:border-amber hover:text-amber"}`}>Quotation Sent</button>
                <button onClick={() => handleTag(lead.id, "CONVERTED")} className={`text-[11.5px] font-semibold py-1.5 px-3 border rounded-sm transition-colors ${lead.tag === "CONVERTED" ? "bg-green text-white border-green" : "border-stone bg-white text-ink-soft hover:border-green hover:text-green"}`}>Converted</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Tagging Access Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-stone rounded-md max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-stone pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">👥</span>
                  <h3 className="font-serif text-[22px] font-semibold text-ink m-0">
                    Team Permissions for WhatsApp Lead Tagging
                  </h3>
                </div>
                <p className="text-[12.5px] text-ink-soft m-0">
                  Grant permission to team members to review and tag incoming WhatsApp leads. Users with the <b>Lead Tagger</b> role are restricted solely to this page — financial spend, ad accounts, and analytics are strictly locked.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  setTeamError("");
                  setTeamSuccess("");
                }}
                className="text-stone-dark hover:text-ink text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Add New Member Form */}
            <form onSubmit={handleCreateUser} className="bg-[#FAF9F6] border border-stone p-4 rounded-md space-y-3">
              <div className="text-[12px] font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                <span>+</span> Add Team Member with Tagging Access
              </div>

              {teamError && (
                <div className="p-2.5 bg-rust-tint text-rust border border-rust/20 rounded text-[12px]">
                  {teamError}
                </div>
              )}
              {teamSuccess && (
                <div className="p-2.5 bg-green-tint text-green border border-green/20 rounded text-[12px]">
                  {teamSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. tagger@halte.in"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-[12px] p-2 bg-card border border-stone rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-[12px] p-2 bg-card border border-stone rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Permission Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full text-[12px] p-2 bg-card border border-stone rounded outline-none font-medium"
                  >
                    <option value="LEAD_TAGGER">Lead Tagger (Leads &amp; Abandoned Carts)</option>
                    <option value="ANALYST">Analyst (View Reports &amp; Tag)</option>
                    <option value="ADMIN">Admin (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={teamLoading}
                  className="bg-ink text-white px-4 py-2 rounded text-[12px] font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
                >
                  {teamLoading ? "Granting Access..." : "Grant Tagging Access"}
                </button>
              </div>
            </form>

            {/* Active Team Members List */}
            <div>
              <div className="text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-2">
                Active Team Members ({users.length})
              </div>
              <div className="border border-stone rounded-md divide-y divide-stone bg-card overflow-hidden">
                {users.map((u) => (
                  <div key={u.id} className="p-3 flex justify-between items-center text-[12.5px]">
                    <div>
                      <span className="font-semibold text-ink">{u.email}</span>
                      {u.id === currentUserId && (
                        <span className="ml-1.5 text-[10px] text-stone-dark font-medium">(You)</span>
                      )}
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        Added on {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10.5px] font-bold uppercase px-2 py-0.5 rounded border ${
                        u.role === "LEAD_TAGGER"
                          ? "bg-amber-tint text-amber border-amber/30"
                          : u.role === "ADMIN"
                          ? "bg-green-tint text-green border-green/30"
                          : "bg-slate-tint text-slate border-slate/30"
                      }`}>
                        {u.role === "LEAD_TAGGER" ? "Lead Tagger" : u.role}
                      </span>

                      {u.id !== currentUserId && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-rust hover:underline text-[11.5px] font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

