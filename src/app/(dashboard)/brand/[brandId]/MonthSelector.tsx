"use client";

import { useRouter } from "next/navigation";

export default function MonthSelector({ currentMonth, brandId }: { currentMonth: string, brandId: string }) {
  const router = useRouter();
  
  // Generate last 6 months
  const months = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const month = d.toISOString().substring(0, 7); // YYYY-MM
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    months.push({ value: month, label });
    d.setMonth(d.getMonth() - 1);
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/brand/${brandId}?month=${e.target.value}`);
  };

  return (
    <select 
      value={currentMonth} 
      onChange={handleChange}
      className="text-[12.5px] border border-stone px-3 py-2 text-ink-soft bg-card rounded-md focus:outline-none focus:border-amber cursor-pointer"
    >
      {months.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  );
}
