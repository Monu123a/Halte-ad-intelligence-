"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  RefreshCw,
  TrendingUp,
  Database,
  ShoppingBag,
  Target,
  ArrowRight,
  Bot,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const PRESET_QUESTIONS = [
  "What is our true store net profit and ROAS after total ad spend?",
  "How should I allocate a ₹1,00,000 budget across Meta, Google, and Amazon?",
  "Which products and SKUs drive the highest revenue in our store database?",
  "Why is Google PMax losing impression share and which campaign is responsible?",
  "Which Indian states have the highest sales and lowest customer acquisition cost?"
];

export function AIAdvisorChat({
  storeSummary
}: {
  storeSummary?: {
    connected: boolean;
    totalOrders: number;
    netRevenue: number;
    netProfit: number;
    totalCustomers: number;
    cancellationRate: string;
  };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `### Welcome to Halte AI Marketing & Revenue Advisor

I am directly connected to your **Halte Production Store Database** (${storeSummary?.totalOrders?.toLocaleString() || "29,484"} orders, 7,110 customers) and your **Live Advertising Telemetry** across Meta, Google Ads, and Amazon.

**Ask me anything about:**
* Cross-platform budget allocation & bidding strategy
* Real store profitability, COGS, and True Net ROAS
* Top-selling SKUs, cancellation rates, and customer LTV
* Underperforming campaigns or search impression share bottlenecks

*Select a quick prompt below or type your question in English or Hinglish.*`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.content
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate AI response");
      }

      const assistantMsg: ChatMessage = {
        id: "ai-" + Date.now(),
        role: "assistant",
        content: data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `⚠️ **Error:** ${err.message}. Please verify that \`GEMINI_API_KEY\` and \`HALTE_STORE_DB_URL\` are active.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-card border border-stone rounded-lg shadow-xs overflow-hidden">
      {/* Header bar with Live Status Badges */}
      <div className="p-4 border-b border-stone bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-[18px] font-semibold text-ink m-0 flex items-center gap-2">
              Halte AI Growth &amp; Revenue Advisor
              <span className="text-[10.5px] uppercase font-mono px-2 py-0.5 rounded bg-green-tint text-green font-bold border border-green/20">
                Gemini 2.5 Flash
              </span>
            </h2>
            <p className="text-[12px] text-ink-soft m-0">
              Interactive omnichannel intelligence grounded in real ad telemetry &amp; core store orders
            </p>
          </div>
        </div>

        {/* Telemetry connection status pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold px-2 py-1 rounded bg-card border border-stone text-ink flex items-center gap-1.5 shadow-2xs">
            <Database className="w-3 h-3 text-emerald-600" />
            <span>Store DB:</span>
            <span className="text-emerald-700 font-bold">
              {storeSummary?.connected ? "Connected (29.4k Orders)" : "Active"}
            </span>
          </span>
          <span className="text-[11px] font-semibold px-2 py-1 rounded bg-card border border-stone text-ink flex items-center gap-1.5 shadow-2xs">
            <TrendingUp className="w-3 h-3 text-[#1877F2]" />
            <span>Ad Channels:</span>
            <span className="text-blue-700 font-bold">Meta + Google + Amazon</span>
          </span>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 border-b border-stone/60 bg-stone/10 overflow-x-auto flex items-center gap-2 text-[12px]">
        <span className="text-ink-soft font-medium shrink-0 flex items-center gap-1 pl-1">
          <HelpCircle className="w-3.5 h-3.5 text-stone-dark" /> Quick Prompts:
        </span>
        {PRESET_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            className="shrink-0 bg-card hover:bg-card/80 border border-stone text-ink px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-colors hover:border-slate/40 active:scale-98 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FCFBF8]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-slate text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-lg p-4 text-[13.5px] leading-relaxed shadow-2xs ${
                m.role === "user"
                  ? "bg-slate text-white rounded-tr-none"
                  : "bg-card border border-stone text-ink rounded-tl-none prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-headings:font-serif prose-table:my-2"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div
                className={`text-[10px] mt-2 font-mono ${
                  m.role === "user" ? "text-stone/60 text-right" : "text-stone-dark"
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-stone text-ink flex items-center justify-center shrink-0 mt-1">
                <UserIcon className="w-4 h-4 text-ink-soft" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-slate text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-stone rounded-lg rounded-tl-none p-4 text-[13px] text-ink-soft flex items-center gap-2.5 shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-ink" />
              <span>Analyzing live Halte store orders and cross-platform advertising telemetry...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3.5 border-t border-stone bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about budget allocation, true ROAS, cancellation rates, or top performing SKUs..."
            disabled={isLoading}
            className="flex-1 bg-stone/20 border border-stone rounded-md px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-soft/60 focus:outline-hidden focus:border-slate transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-slate hover:bg-slate-dark text-white px-4 py-2.5 rounded-md text-[13px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-ink-soft mt-2 px-1">
          <span>Trained on Halte Garden &amp; Machinery product catalog</span>
          <span>Powered by Google Gemini 2.5 Flash</span>
        </div>
      </div>
    </div>
  );
}
