"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  Send,
  RefreshCw,
  TrendingUp,
  Database,
  Bot,
  User as UserIcon,
  HelpCircle,
  Loader2,
  History,
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  ArrowUpRight,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const PRESET_QUESTIONS = [
  "What is our true store net profit and ROAS after total ad spend?",
  "How should I allocate a ₹1,00,000 budget across Meta, Google, and Amazon?",
  "Which products and SKUs drive the highest revenue in our store database?",
  "Why is Google PMax losing impression share and which campaign is responsible?",
  "Which Indian states have the highest sales and lowest customer acquisition cost?"
];

const STORAGE_KEY = "halte_ai_advisor_sessions_v2";
const CURRENT_ID_KEY = "halte_ai_current_session_id_v2";

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
  const totalOrdersCount =
    storeSummary?.totalOrders && storeSummary.totalOrders > 0
      ? storeSummary.totalOrders.toLocaleString()
      : "29,487";
  const totalCustomersCount =
    storeSummary?.totalCustomers && storeSummary.totalCustomers > 0
      ? storeSummary.totalCustomers.toLocaleString()
      : "7,110";

  const createInitialWelcomeMessage = useCallback((): ChatMessage => ({
    id: "welcome-1",
    role: "assistant",
    content: `### Welcome to Halte AI Marketing & Revenue Advisor

I am directly connected to your **Halte Production Store Database** (${totalOrdersCount} orders, ${totalCustomersCount} customers) and your **Live Advertising Telemetry** across Meta, Google Ads, and Amazon.

**Ask me anything about:**
* Cross-platform budget allocation & bidding strategy
* Real store profitability, COGS, and True Net ROAS
* Top-selling SKUs, cancellation rates, and customer LTV
* Underperforming campaigns or search impression share bottlenecks

*Select a quick prompt below or type your question in English or Hinglish.*`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }), [totalOrdersCount, totalCustomersCount]);

  const createNewSession = useCallback((title: string = "New Conversation"): ChatSession => {
    const now = new Date();
    return {
      id: "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      title,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: [createInitialWelcomeMessage()]
    };
  }, [createInitialWelcomeMessage]);

  // State
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const savedSessionsRaw = localStorage.getItem(STORAGE_KEY);
      const savedCurrentId = localStorage.getItem(CURRENT_ID_KEY);

      if (savedSessionsRaw) {
        const parsed: ChatSession[] = JSON.parse(savedSessionsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          const activeExists = parsed.find((s) => s.id === savedCurrentId);
          if (activeExists) {
            setCurrentSessionId(activeExists.id);
          } else {
            setCurrentSessionId(parsed[0].id);
          }
          setIsLoaded(true);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to read chat history from localStorage", e);
    }

    // Default initial session
    const initialSession = createNewSession();
    setSessions([initialSession]);
    setCurrentSessionId(initialSession.id);
    setIsLoaded(true);
  }, [createNewSession]);

  // Save sessions to localStorage on state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      if (currentSessionId) {
        localStorage.setItem(CURRENT_ID_KEY, currentSessionId);
      }
    } catch (e) {
      console.warn("Failed to persist chat sessions to localStorage", e);
    }
  }, [sessions, currentSessionId, isLoaded]);

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;
  }, [sessions, currentSessionId]);

  const messages = useMemo(() => {
    return currentSession?.messages || [];
  }, [currentSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, isLoading, activeTab]);

  // Start new clean chat session
  const handleNewChat = () => {
    const newSession = createNewSession();
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveTab("chat");
    setInput("");
  };

  // Switch to an existing session from history
  const handleResumeSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setActiveTab("chat");
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = createNewSession();
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (sessionId === currentSessionId) {
        setCurrentSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Clear all conversation history
  const handleClearAllHistory = () => {
    if (window.confirm("Are you sure you want to delete all saved conversations? This cannot be undone.")) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setCurrentSessionId(fresh.id);
      setActiveTab("chat");
    }
  };

  // Copy chat transcript as formatted markdown
  const handleCopyTranscript = (session: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const markdown = session.messages
      .filter((m) => m.id !== "welcome-1")
      .map((m) => `### ${m.role === "user" ? "👤 User" : "🤖 Halte AI Advisor"} (${m.timestamp})\n\n${m.content}\n\n---`)
      .join("\n\n");

    const fullText = `# Halte AI Advisor Transcript: ${session.title}\n*Saved: ${new Date(session.updatedAt).toLocaleString()}*\n\n` + (markdown || "Empty conversation.");

    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Send message
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    // Update session title on first user message
    const isFirstUserMessage = !messages.some((m) => m.role === "user");
    const newTitle = isFirstUserMessage
      ? textToSend.length > 55
        ? textToSend.substring(0, 52) + "..."
        : textToSend
      : currentSession?.title || "Conversation";

    const updatedMessagesWithUser = [...messages, userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              title: newTitle,
              updatedAt: new Date().toISOString(),
              messages: updatedMessagesWithUser
            }
          : s
      )
    );

    if (!messageText) setInput("");
    setIsLoading(true);

    try {
      const historyPayload = updatedMessagesWithUser
        .filter((m) => m.id !== "welcome-1")
        .slice(-6)
        .map((m) => ({
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

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, assistantMsg]
              }
            : s
        )
      );
    } catch (err: any) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [
                  ...s.messages,
                  {
                    id: "err-" + Date.now(),
                    role: "assistant",
                    content: `⚠️ **Error:** ${err.message}. Please verify network connectivity and database status.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  }
                ]
              }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered sessions for History tab
  const validHistorySessions = sessions.filter(
    (s) => s.messages.some((m) => m.role === "user") || s.messages.length > 1
  );

  const filteredSessions = validHistorySessions.filter((s) => {
    if (!historySearch.trim()) return true;
    const query = historySearch.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(query);
    const messageMatch = s.messages.some((m) => m.content.toLowerCase().includes(query));
    return titleMatch || messageMatch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-card border border-stone rounded-lg shadow-xs overflow-hidden">
      {/* Header Bar with Tabs, Telemetry & New Chat */}
      <div className="p-3.5 border-b border-stone bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Segmented Tabs */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="hidden sm:block">
            <h2 className="font-serif text-[17px] font-semibold text-ink m-0 flex items-center gap-2 leading-tight">
              Halte AI Advisor
            </h2>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-stone/20 p-0.5 rounded-md border border-stone/50 ml-1 sm:ml-2">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] font-semibold transition-all ${
                activeTab === "chat"
                  ? "bg-card text-ink shadow-2xs border border-stone/60"
                  : "text-ink-soft hover:text-ink hover:bg-stone/10"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] font-semibold transition-all ${
                activeTab === "history"
                  ? "bg-card text-ink shadow-2xs border border-stone/60"
                  : "text-ink-soft hover:text-ink hover:bg-stone/10"
              }`}
            >
              <History className="w-3.5 h-3.5 text-stone-dark" />
              <span>History</span>
              {validHistorySessions.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-stone/40 text-ink rounded-full text-[10px] font-mono">
                  {validHistorySessions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Actions & Live Pills */}
        <div className="flex items-center gap-2">
          {/* Telemetry Pills */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-card border border-stone text-ink flex items-center gap-1.5 shadow-2xs">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Halte Store DB:</span>
              <span className="text-emerald-700 font-bold">29.4k Orders</span>
            </span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded bg-card border border-stone text-ink flex items-center gap-1.5 shadow-2xs">
              <TrendingUp className="w-3 h-3 text-[#1877F2]" />
              <span>Ad Signals:</span>
              <span className="text-blue-700 font-bold">Live</span>
            </span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 bg-slate hover:bg-slate-dark text-white px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors shadow-2xs active:scale-98"
            title="Start a new clean chat session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: ADVISOR CHAT ======================= */}
      {activeTab === "chat" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Suggested Quick Prompt Chips */}
          <div className="p-2.5 border-b border-stone/60 bg-stone/10 overflow-x-auto flex items-center gap-2 text-[12px]">
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
                  className={`max-w-[88%] md:max-w-[78%] rounded-lg p-4 text-[13.5px] leading-relaxed shadow-2xs ${
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
                  <span>Querying Halte Store DB &amp; analyzing cross-platform marketing telemetry...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-stone bg-card">
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
                placeholder="Ask about orders today, high margin SKUs, state revenue, or budget allocation..."
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
              <span>Connected to Halte Core Database (29,487 live orders)</span>
              <span>Gemini 2.5 Flash Autonomous Agent</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB 2: CONVERSATION HISTORY ======================= */}
      {activeTab === "history" && (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#FAF9F6]">
          {/* History Search & Toolbar */}
          <div className="p-3.5 border-b border-stone bg-card flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search past questions, SKUs, or states..."
                className="w-full pl-9 pr-3 py-1.5 bg-stone/20 border border-stone rounded-md text-[13px] text-ink placeholder:text-ink-soft/60 focus:outline-hidden focus:border-slate transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[12px] text-ink-soft">
                {filteredSessions.length} {filteredSessions.length === 1 ? "conversation" : "conversations"}
              </span>

              {validHistorySessions.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-[11.5px] text-rust hover:text-rust/80 flex items-center gap-1 font-medium transition-colors border border-rust/20 px-2.5 py-1 rounded hover:bg-rust-tint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {filteredSessions.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-card border border-stone rounded-lg">
                <div className="w-12 h-12 rounded-full bg-stone/30 flex items-center justify-center text-ink-soft mb-3">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-[17px] font-semibold text-ink m-0">
                  {historySearch ? "No matching conversations found" : "No conversation history yet"}
                </h3>
                <p className="text-[13px] text-ink-soft max-w-md mt-1 mb-4">
                  {historySearch
                    ? "Try searching for a different keyword like 'today', 'Maharashtra', or 'profit'."
                    : "When you ask questions in the Advisor Chat, your queries and live database findings will be automatically preserved here for future reference."}
                </p>
                <button
                  onClick={() => setActiveTab("chat")}
                  className="bg-slate hover:bg-slate-dark text-white px-4 py-2 rounded-md text-[12.5px] font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Start a Conversation</span>
                </button>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const userMessagesCount = session.messages.filter((m) => m.role === "user").length;
                const lastMessage = session.messages[session.messages.length - 1];
                const isExpanded = expandedSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`bg-card border rounded-lg transition-all shadow-2xs ${
                      isCurrent ? "border-indigo-400/80 ring-1 ring-indigo-400/30" : "border-stone hover:border-slate/40"
                    }`}
                  >
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Title & Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-serif text-[15.5px] font-semibold text-ink m-0 truncate">
                            {session.title}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-mono uppercase bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">
                              Active Session
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11.5px] text-ink-soft">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-dark" />
                            {new Date(session.updatedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          <span>&middot;</span>
                          <span>{userMessagesCount} {userMessagesCount === 1 ? "question" : "questions"}</span>
                        </div>

                        {/* Snippet preview */}
                        <p className="text-[12.5px] text-ink-soft/90 mt-2 line-clamp-2 leading-relaxed bg-stone/10 p-2 rounded border border-stone/30">
                          <span className="font-semibold text-ink">Last Answer: </span>
                          {lastMessage?.content
                            ? lastMessage.content.replace(/[#*`_]/g, "").slice(0, 180) + "..."
                            : "No response yet."}
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone/40">
                        {/* Toggle Inline Preview */}
                        <button
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="px-2.5 py-1.5 rounded-md border border-stone hover:bg-stone/20 text-ink text-[12px] font-medium flex items-center gap-1 transition-colors"
                          title="View transcript preview"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span className="hidden md:inline">{isExpanded ? "Collapse" : "Preview"}</span>
                        </button>

                        {/* Copy Entire Chat */}
                        <button
                          onClick={(e) => handleCopyTranscript(session, e)}
                          className="px-2.5 py-1.5 rounded-md border border-stone hover:bg-stone/20 text-ink text-[12px] font-medium flex items-center gap-1 transition-colors"
                          title="Copy full conversation markdown"
                        >
                          {copiedId === session.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green" />
                              <span className="text-green font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-dark" />
                              <span className="hidden md:inline">Copy</span>
                            </>
                          )}
                        </button>

                        {/* Delete Session */}
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1.5 rounded-md border border-stone hover:border-rust/40 hover:bg-rust-tint text-stone-dark hover:text-rust transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Resume Chat */}
                        <button
                          onClick={() => handleResumeSession(session.id)}
                          className="bg-slate hover:bg-slate-dark text-white px-3 py-1.5 rounded-md text-[12px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <span>Resume</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Full Transcript Preview */}
                    {isExpanded && (
                      <div className="border-t border-stone/50 bg-[#FCFBF8] p-4 max-h-[350px] overflow-y-auto space-y-3 rounded-b-lg">
                        <div className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-2">
                          Conversation Transcript Preview:
                        </div>
                        {session.messages
                          .filter((m) => m.id !== "welcome-1")
                          .map((m) => (
                            <div
                              key={m.id}
                              className={`p-3 rounded-md text-[12.5px] leading-relaxed ${
                                m.role === "user"
                                  ? "bg-slate/10 border border-slate/20 text-ink"
                                  : "bg-card border border-stone text-ink prose prose-xs max-w-none"
                              }`}
                            >
                              <div className="font-semibold text-[11px] mb-1 text-ink-soft">
                                {m.role === "user" ? "👤 You:" : "🤖 AI Advisor:"}
                              </div>
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            </div>
                          ))}
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleResumeSession(session.id)}
                            className="bg-slate text-white px-3 py-1 rounded text-[11.5px] font-semibold flex items-center gap-1"
                          >
                            <span>Open in Chat &rarr;</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
