"use client";

import { useState } from "react";

export function UnmappedCampaigns({ campaigns, brands, products }: { campaigns: any[], brands: any[], products: string[] }) {
  const [updates, setUpdates] = useState<Record<string, { brandPageId: string, products: string[] }>>({});

  if (campaigns.length === 0) return null;

  const handleSave = async (id: string) => {
    const data = updates[id];
    if (!data?.brandPageId) return;

    await fetch(`/api/campaigns/${id}/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    window.location.reload();
  };

  return (
    <div className="mt-12">
      <h2 className="font-serif text-[24px] mb-4 font-semibold text-rust">Action Required: Unmapped Campaigns</h2>
      <p className="text-[13.5px] text-ink-soft mb-6">These campaigns could not be auto-mapped to a brand or product. They will be excluded from recommendations until mapped.</p>
      
      <div className="bg-card border border-stone rounded-md overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead className="bg-stone/30">
            <tr>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Campaign Name</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Raw Page ID</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Brand</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Products</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-stone last:border-0">
                <td className="py-3 px-4 font-medium">{c.name}</td>
                <td className="py-3 px-4 text-ink-soft font-mono text-[11px]">{c.pageId || "Unknown"}</td>
                <td className="py-3 px-4">
                  <select 
                    className="border border-stone rounded-sm px-2 py-1 bg-white"
                    onChange={(e) => setUpdates({...updates, [c.id]: { ...updates[c.id], brandPageId: e.target.value }})}
                    defaultValue=""
                  >
                    <option value="" disabled>Select Brand</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.pageId}>{b.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <select 
                    multiple
                    className="border border-stone rounded-sm px-2 py-1 bg-white h-[60px]"
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setUpdates({...updates, [c.id]: { ...updates[c.id], products: selected }})
                    }}
                  >
                    {products.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <button 
                    onClick={() => handleSave(c.id)}
                    className="bg-ink text-white px-3 py-1.5 rounded-sm text-[12px] font-semibold disabled:opacity-50"
                    disabled={!updates[c.id]?.brandPageId}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
