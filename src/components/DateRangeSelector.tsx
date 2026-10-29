"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Check, X } from "lucide-react";

interface Props {
  currentRange: string;
  from?: string;
  to?: string;
  currentPlatform?: string;
  currentFilter?: string;
}

export function DateRangeSelector({
  currentRange,
  from,
  to,
  currentPlatform = "ALL",
  currentFilter,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Default custom dates to reasonable defaults if not provided
  const todayStr = new Date().toISOString().split("T")[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(from || thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(to || todayStr);

  useEffect(() => {
    if (from) setStartDate(from);
    if (to) setEndDate(to);
  }, [from, to]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const buildUrl = (rangeKey: string, customFrom?: string, customTo?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", rangeKey);
    
    if (rangeKey === "custom" && customFrom) {
      params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
      else params.delete("to");
    } else {
      params.delete("from");
      params.delete("to");
    }

    if (currentPlatform && currentPlatform !== "ALL") {
      params.set("platform", currentPlatform);
    }
    if (currentFilter && currentFilter !== "ALL") {
      params.set("filter", currentFilter);
    }

    return `?${params.toString()}`;
  };

  const handleSelectPreset = (rangeKey: string) => {
    setIsOpen(false);
    router.push(buildUrl(rangeKey));
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;
    setIsOpen(false);
    router.push(buildUrl("custom", startDate, endDate));
  };

  const handleQuickShortcut = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    setStartDate(startStr);
    setEndDate(endStr);
  };

  const handleMonthShortcut = (offsetMonth: number) => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - offsetMonth, 1);
    const startStr = target.toISOString().split("T")[0];
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0);
    const endStr = lastDay.toISOString().split("T")[0];
    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Format custom label if active
  const formatCustomLabel = () => {
    if (!from) return "Select Dates";
    try {
      const fDate = new Date(from).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const tDate = to ? new Date(to).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "Today";
      return `${fDate} – ${tDate}`;
    } catch {
      return `${from} to ${to || "now"}`;
    }
  };

  const isCustomActive = currentRange === "custom";

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={popoverRef}>
      {/* Preset Pills Container */}
      <div className="flex items-center gap-1 bg-card p-1 rounded border border-stone shadow-2xs">
        <span className="text-[11.5px] font-semibold text-ink-soft px-2 hidden sm:inline">Period:</span>

        <button
          onClick={() => handleSelectPreset("7d")}
          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
            currentRange === "7d"
              ? "bg-slate text-white shadow-2xs"
              : "text-ink-soft hover:text-ink hover:bg-stone/30"
          }`}
        >
          7 Days
        </button>

        <button
          onClick={() => handleSelectPreset("30d")}
          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
            currentRange === "30d"
              ? "bg-slate text-white shadow-2xs"
              : "text-ink-soft hover:text-ink hover:bg-stone/30"
          }`}
        >
          30 Days
        </button>

        <button
          onClick={() => handleSelectPreset("90d")}
          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
            currentRange === "90d"
              ? "bg-slate text-white shadow-2xs"
              : "text-ink-soft hover:text-ink hover:bg-stone/30"
          }`}
        >
          90 Days
        </button>

        <button
          onClick={() => handleSelectPreset("all")}
          className={`px-3 py-1 rounded text-[11.5px] font-semibold transition-all ${
            currentRange === "all"
              ? "bg-slate text-white shadow-2xs"
              : "text-ink-soft hover:text-ink hover:bg-stone/30"
          }`}
        >
          All Time
        </button>

        {/* Custom Date Range Toggle Pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 px-3 py-1 rounded text-[11.5px] font-semibold transition-all border ${
            isCustomActive
              ? "bg-slate text-white border-slate shadow-2xs"
              : "text-ink hover:bg-stone/30 border-stone/50"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isCustomActive ? formatCustomLabel() : "Select Dates"}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Date Picker Popover Modal */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-stone rounded-md shadow-xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-stone/30 pb-2 mb-3">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Choose Custom Date Range</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-stone-dark hover:text-slate rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="mb-3">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-soft block mb-1.5">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickShortcut(14)}
                className="text-[11px] py-1 px-2 text-left bg-stone-light hover:bg-stone/30 rounded text-slate font-medium transition-colors"
              >
                Last 14 Days
              </button>
              <button
                type="button"
                onClick={() => handleQuickShortcut(60)}
                className="text-[11px] py-1 px-2 text-left bg-stone-light hover:bg-stone/30 rounded text-slate font-medium transition-colors"
              >
                Last 60 Days
              </button>
              <button
                type="button"
                onClick={() => handleMonthShortcut(0)}
                className="text-[11px] py-1 px-2 text-left bg-stone-light hover:bg-stone/30 rounded text-slate font-medium transition-colors"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handleMonthShortcut(1)}
                className="text-[11px] py-1 px-2 text-left bg-stone-light hover:bg-stone/30 rounded text-slate font-medium transition-colors"
              >
                Last Month
              </button>
            </div>
          </div>

          {/* Custom Date Form */}
          <form onSubmit={handleApplyCustom} className="space-y-3">
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-ink-soft block mb-1">
                  Start Date (From)
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-[12px] p-1.5 border border-stone-dark/30 rounded bg-white text-slate focus:border-slate outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-ink-soft block mb-1">
                  End Date (To)
                </label>
                <input
                  type="date"
                  value={endDate}
                  max={todayStr}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-[12px] p-1.5 border border-stone-dark/30 rounded bg-white text-slate focus:border-slate outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone/30">
              <button
                type="button"
                onClick={() => handleSelectPreset("30d")}
                className="text-[11px] text-ink-soft hover:text-slate underline"
              >
                Reset
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 text-[11.5px] border border-stone rounded hover:bg-stone/20 text-slate font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-[11.5px] bg-slate hover:bg-slate/90 text-white rounded font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply Dates
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
