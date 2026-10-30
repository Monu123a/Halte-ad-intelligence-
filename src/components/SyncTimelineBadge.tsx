"use client";

import { useState } from "react";
import { SyncTimelineOverview } from "@/lib/services";
import {
  Calendar,
  Clock,
  ChevronDown,
  Info,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface Props {
  timeline: SyncTimelineOverview;
  activePlatform?: string;
}

export function SyncTimelineBadge({ timeline, activePlatform = "ALL" }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (d: Date | string | null | undefined, includeYear: boolean = false) => {
    if (!d) return "No data";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {})
    });
  };

  const formatDateTime = (d: Date | string | null | undefined) => {
    if (!d) return "Never";
    const date = typeof d === "string" ? new Date(d) : d;
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${dateStr} at ${timeStr}`;
  };

  // Determine which platform is highlighted based on active selection
  const currentPlatformItem =
    activePlatform === "GOOGLE"
      ? timeline.platforms.GOOGLE
      : activePlatform === "AMAZON"
      ? timeline.platforms.AMAZON
      : activePlatform === "META"
      ? timeline.platforms.META
      : null;

  // The primary "Data Synced Through" date to display
  const primaryDataDate = currentPlatformItem
    ? currentPlatformItem.dataThroughDate
    : timeline.overallDataThroughDate;

  // The primary last sync trigger timestamp
  const primarySyncTimestamp = currentPlatformItem
    ? currentPlatformItem.lastSyncedAt
    : timeline.overallLastSyncedAt;

  return (
    <div className="relative inline-block text-left">
      {/* Pill Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-card hover:bg-stone/20 border border-stone px-3 py-1.5 rounded text-[12px] text-ink transition-colors shadow-2xs group"
        title="Click to view detailed timeline of data synched across ad accounts"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>

        <span className="font-semibold text-ink flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate" />
          <span>Data through:</span>
          <strong className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-mono text-[11.5px]">
            {formatDate(primaryDataDate, true)}
          </strong>
        </span>

        <span className="hidden lg:inline text-stone-dark font-sans text-[11px] border-l border-stone pl-2">
          Synced: {formatDate(primarySyncTimestamp)}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-ink-soft transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] bg-card border border-stone rounded-lg shadow-xl z-50 p-4 text-[12.5px] animate-in fade-in zoom-in-95 duration-100">
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-slate-tint flex items-center justify-center text-slate">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-[15px] font-bold text-ink m-0">
                    Data Sync &amp; Timeline Status
                  </h4>
                  <p className="text-[11px] text-ink-soft m-0">
                    Live telemetry across connected advertising networks
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Context Callout */}
            <div className="bg-[#FAF9F6] border border-stone/80 rounded p-2.5 mb-3 text-[11.5px] text-ink-soft flex items-start gap-2">
              <Info className="w-4 h-4 text-slate shrink-0 mt-0.5" />
              <div>
                All performance metrics (Spend, Impressions, Clicks, Leads) are
                fully synced through <strong className="text-ink font-semibold">{formatDate(primaryDataDate, true)}</strong>.
              </div>
            </div>

            {/* Platform Timeline Items */}
            <div className="space-y-2 mb-3">
              {/* Meta Ads */}
              <div
                className={`p-2.5 rounded border transition-colors ${
                  activePlatform === "META" || activePlatform === "ALL"
                    ? "bg-[#1877F2]/5 border-[#1877F2]/30"
                    : "bg-stone/20 border-stone/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-ink">
                    <span className="w-2 h-2 rounded-full bg-[#1877F2]"></span>
                    <span>Meta Ads</span>
                    <span className="text-[10px] font-mono text-stone-dark font-normal">
                      ({timeline.platforms.META.accounts.length} Accounts)
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white text-emerald-800 border border-emerald-200">
                    Through {formatDate(timeline.platforms.META.dataThroughDate, true)}
                  </span>
                </div>
                <div className="text-[11px] text-ink-soft flex items-center justify-between">
                  <span>Last synced with Meta API:</span>
                  <span className="font-medium text-ink">
                    {formatDateTime(timeline.platforms.META.lastSyncedAt)}
                  </span>
                </div>
              </div>

              {/* Google Ads */}
              <div
                className={`p-2.5 rounded border transition-colors ${
                  activePlatform === "GOOGLE"
                    ? "bg-[#EA4335]/5 border-[#EA4335]/30"
                    : "bg-stone/20 border-stone/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-ink">
                    <span className="w-2 h-2 rounded-full bg-[#EA4335]"></span>
                    <span>Google Ads</span>
                    <span className="text-[10px] font-mono text-stone-dark font-normal">
                      (138-993-9760)
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white text-emerald-800 border border-emerald-200">
                    Through {formatDate(timeline.platforms.GOOGLE.dataThroughDate, true)}
                  </span>
                </div>
                <div className="text-[11px] text-ink-soft flex items-center justify-between">
                  <span>Last synced with Google API:</span>
                  <span className="font-medium text-ink">
                    {formatDateTime(timeline.platforms.GOOGLE.lastSyncedAt)}
                  </span>
                </div>
              </div>

              {/* Amazon Ads */}
              <div
                className={`p-2.5 rounded border transition-colors ${
                  activePlatform === "AMAZON"
                    ? "bg-[#FF9900]/5 border-[#FF9900]/30"
                    : "bg-stone/20 border-stone/60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-ink">
                    <span className="w-2 h-2 rounded-full bg-[#FF9900]"></span>
                    <span>Amazon Ads</span>
                    <span className="text-[10px] font-mono text-stone-dark font-normal">
                      (India Seller Store)
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white text-emerald-800 border border-emerald-200">
                    Through {formatDate(timeline.platforms.AMAZON.dataThroughDate, true)}
                  </span>
                </div>
                <div className="text-[11px] text-ink-soft flex items-center justify-between">
                  <span>Last report processed:</span>
                  <span className="font-medium text-ink">
                    {formatDateTime(timeline.platforms.AMAZON.lastSyncedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with Links */}
            <div className="flex items-center justify-between pt-2.5 border-t border-stone text-[11px] text-ink-soft">
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sync pipelines operational</span>
              </span>
              <Link
                href="/connections"
                className="font-semibold text-ink hover:underline flex items-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                <span>Manage Accounts</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
