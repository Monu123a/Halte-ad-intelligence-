"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LeadsClient({ initialLeads, currentTag }: { initialLeads: any[], currentTag: string }) {
  const [leads, setLeads] = useState(initialLeads);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  // Sync state when URL/props change
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

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
    const exportData = filteredLeads.map((l) => ({
      "Contact Ref": l.contactRef,
      "Message / Inquiry": l.messageText || "",
      "Tag": l.tag,
      "Brand": l.adSet?.campaign?.brand?.name || "Unassigned",
      "Ad Set": l.adSet?.name || "Direct / Web",
      "Date": new Date(l.createdAt).toLocaleDateString(),
      "Time": new Date(l.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [{ wch: 18 }, { wch: 55 }, { wch: 16 }, { wch: 16 }, { wch: 25 }, { wch: 14 }, { wch: 12 }];
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

  const filteredLeads = leads.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const contactMatch = l.contactRef?.toLowerCase().includes(q);
    const msgMatch = l.messageText?.toLowerCase().includes(q);
    const adMatch = l.adSet?.name?.toLowerCase().includes(q);
    return contactMatch || msgMatch || adMatch;
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-8 border-b border-stone pb-5">
        <div>
          <h1 className="font-serif text-[30px] m-0 mb-1 font-semibold">Lead Tagging</h1>
          <p className="m-0 text-[13.5px] text-ink-soft">WhatsApp inquiries & website leads — tag each against campaigns</p>
        </div>
        <div className="flex items-center gap-3">
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

      <div className="flex justify-between items-center mb-4 border-b border-stone pb-[1px]">
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
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-[12.5px] px-3 py-1.5 border border-stone rounded-sm bg-card w-[200px] outline-none focus:border-stone-dark transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[1px] bg-stone border border-stone rounded-md overflow-hidden">
        {filteredLeads.length === 0 && (
          <div className="bg-card py-6 px-5 text-ink-soft text-[13.5px]">
            No leads found for this filter/search.
          </div>
        )}
        {filteredLeads.map(lead => {
          const brandName = lead.adSet?.campaign?.brand?.name || "Unknown Brand";
          const adName = lead.adSet?.name || "Unknown Ad Set";
          const time = new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={lead.id} className="bg-card py-4 px-5 flex justify-between items-center gap-4 hover:bg-stone/5 transition-colors">
              <div>
                <div className="text-[13.5px]">
                  <span className="font-semibold mr-2">{lead.contactRef}</span>
                  {lead.messageText && <span className="text-ink-soft">"{lead.messageText}"</span>}
                  {currentTag === "ALL" && (
                    <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-stone text-stone-dark border border-stone-dark/30">
                      {lead.tag === "QUOTATION_SENT" ? "QUOTATION SENT" : lead.tag}
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-stone-dark mt-1" suppressHydrationWarning>
                  {brandName} &middot; {adName} &middot; {time}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
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
    </div>
  );
}
