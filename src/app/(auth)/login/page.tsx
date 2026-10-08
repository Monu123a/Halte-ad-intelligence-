"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-[400px] bg-card border border-stone p-12 rounded-md">
        <div className="font-serif text-[22px] font-semibold mb-1">
          Halte <span className="text-amber">Ad Intelligence</span>
        </div>
        <div className="text-[13.5px] text-ink-soft mb-8">
          Sign in to view your brand reports
        </div>
        
        {error && <div className="text-rust text-[12.5px] mb-4 p-2 bg-rust-tint rounded-sm">{error}</div>}

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <div>
            <label className="text-[12.5px] font-semibold text-ink-soft block mb-1.5">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="harsh@halte.in" 
              className="w-full p-3 border border-stone text-[14px] font-sans bg-bg rounded-sm focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-[12.5px] font-semibold text-ink-soft block mb-1.5">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full p-3 border border-stone text-[14px] font-sans bg-bg rounded-sm focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber transition-colors"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-ink text-white border-none p-3 text-[14px] font-semibold mt-2 cursor-pointer tracking-[0.01em] hover:bg-amber transition-colors rounded-sm disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
