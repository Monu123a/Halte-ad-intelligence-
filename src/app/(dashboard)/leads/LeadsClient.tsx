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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n").filter(l => l.trim().length > 0);
      
      const payload = lines.map(line => {
        const parts = line.split(",");
        const contactRef = parts[0]?.trim();
        const adSetId = parts.length > 2 ? parts[parts.length - 1].trim() : undefined;
        const msgParts = parts.length > 2 ? parts.slice(1, parts.length - 1) : parts.slice(1);
        const messageText = msgParts.join(",").replace(/^"|"$/g, "").trim();
        
        return { 
          contactRef, 
          messageText,
          adSetId: adSetId && adSetId.length > 0 ? adSetId : undefined
        };
      }).filter(l => l.contactRef);

      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leads: payload })
        });
        if (res.ok) {
          alert(`Imported successfully`);
          window.location.reload();
        } else {
          alert("Import failed. Make sure Ad Set IDs are valid internal IDs.");
        }
      } catch (err) {
        console.error(err);
        alert("Network error during import");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
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
          <p className="m-0 text-[13.5px] text-ink-soft">Today's WhatsApp inquiries — tag each one against its ad</p>
        </div>
        <div className="text-[12.5px] border border-stone px-4 py-2 text-ink-soft bg-card rounded-md">
          {leads.length} leads
        </div>
      </div>

      <div className="card-base p-6 mb-7 flex justify-between items-center bg-amber-tint border-[#e3d3a8]">
        <div>
          <h3 className="text-[14px] font-bold mb-1">Bulk Import Leads</h3>
          <p className="text-[12.5px] text-ink-soft">Upload a CSV of WhatsApp inquiries. Format: Contact Ref, Message Text, Ad Set ID</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            disabled={importing}
            className="text-[12.5px] file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-[12.5px] file:font-semibold file:bg-amber file:text-white hover:file:bg-amber/90 cursor-pointer disabled:opacity-50" 
          />
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
