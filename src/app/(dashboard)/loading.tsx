export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Top micro progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-slate/10 z-50 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-slate via-ink to-slate w-1/3 animate-[progress_1.2s_ease-in-out_infinite]"></div>
      </div>

      {/* Header Skeleton */}
      <div className="flex justify-between items-end pb-5 border-b border-stone/50 gap-4">
        <div>
          <div className="h-8 w-44 bg-stone/40 rounded mb-2"></div>
          <div className="h-4 w-72 bg-stone/30 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-stone/30 rounded"></div>
          <div className="h-9 w-32 bg-stone/30 rounded"></div>
        </div>
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-stone/60 border border-stone/60 rounded-md overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-card p-6 space-y-3">
            <div className="h-[2px] w-8 bg-stone/50"></div>
            <div className="h-7 w-24 bg-stone/30 rounded"></div>
            <div className="h-3.5 w-32 bg-stone/20 rounded"></div>
          </div>
        ))}
      </div>

      {/* Secondary Intelligence Section Skeleton */}
      <div className="bg-card border border-stone/60 rounded-md p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-stone/40">
          <div className="h-6 w-56 bg-stone/30 rounded"></div>
          <div className="h-6 w-36 bg-stone/20 rounded"></div>
        </div>
        <div className="h-48 w-full bg-stone/15 rounded"></div>
      </div>

      {/* Table rows skeleton */}
      <div className="bg-card border border-stone/60 rounded-md p-5 space-y-3">
        <div className="h-5 w-40 bg-stone/30 rounded mb-4"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-stone/20 last:border-0">
            <div className="h-4 w-48 bg-stone/25 rounded"></div>
            <div className="h-4 w-24 bg-stone/20 rounded"></div>
            <div className="h-4 w-16 bg-stone/20 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
