"use client";

import { useState, useEffect } from "react";
import {
  Crown,
  ShieldCheck,
  Users,
  MessageSquare,
  Search,
  Trash2,
  Key,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  Clock,
  Sparkles,
  Database,
  Plus,
  UserCheck,
  AlertTriangle,
  Sliders
} from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  role: "MASTER" | "ADMIN" | "ANALYST" | "LEAD_TAGGER";
  createdAt: string;
  _count?: {
    aiChatSessions: number;
  };
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  messages: ChatMessage[];
}

export function MasterPanelClient({
  currentUserId,
  currentUserEmail
}: {
  currentUserId: string;
  currentUserEmail: string;
}) {
  const [activeTab, setActiveTab] = useState<"history" | "users">("history");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  // Filters
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals & User Management State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"MASTER" | "ADMIN" | "ANALYST" | "LEAD_TAGGER">("ANALYST");

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"MASTER" | "ADMIN" | "ANALYST" | "LEAD_TAGGER">("ANALYST");
  const [editPassword, setEditPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch initial master data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, historyRes] = await Promise.all([
        fetch("/api/master/overview"),
        fetch("/api/master/chat-history")
      ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setStats(overviewData.stats);
        setUsers(overviewData.users || []);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setChatSessions(historyData.sessions || []);
      }
    } catch (err: any) {
      console.error("Failed to load master panel data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter sessions
  const filteredSessions = chatSessions.filter((s) => {
    if (selectedUserFilter !== "ALL" && s.userId !== selectedUserFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(q);
    const emailMatch = s.user?.email.toLowerCase().includes(q);
    const messageMatch = s.messages.some((m) => m.content.toLowerCase().includes(q));
    return titleMatch || emailMatch || messageMatch;
  });

  // Handle Delete Session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this user conversation session?")) return;

    try {
      const res = await fetch(`/api/master/chat-session/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (expandedSessionId === sessionId) setExpandedSessionId(null);
      }
    } catch (err) {
      alert("Failed to delete session");
    }
  };

  // Copy transcript
  const handleCopyTranscript = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `# Halte AI Advisor Audit: ${session.title}\n*User: ${session.user.email} (${session.user.role})*\n*Date: ${new Date(session.updatedAt).toLocaleString()}*\n\n` +
      session.messages.map((m) => `### ${m.role === "user" ? "👤 " + session.user.email : "🤖 Halte AI Advisor"} (${m.timestamp})\n\n${m.content}\n\n---`).join("\n\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setUsers((prev) => [data.user, ...prev]);
      setShowAddUserModal(false);
      setNewEmail("");
      setNewPassword("");
      setActionMessage({ type: "success", text: `Account ${data.user.email} created with role ${newRole}!` });
      fetchData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update User (Role & Password)
  const handleUpdateUser = async (userId: string) => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const payload: any = { role: editRole };
      if (editPassword.trim()) {
        payload.newPassword = editPassword.trim();
      }

      const res = await fetch(`/api/master/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: editRole } : u)));
      setEditingUserId(null);
      setEditPassword("");
      setActionMessage({ type: "success", text: `Updated ${data.user.email} permissions successfully!` });
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userEmail}" and all their records?`)) return;

    try {
      const res = await fetch(`/api/master/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setActionMessage({ type: "success", text: `User ${userEmail} deleted.` });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                Master Authority
              </span>
              <span className="text-white/40 text-[12px]">&middot;</span>
              <span className="text-[12px] text-white/70 font-mono">Logged in as {currentUserEmail}</span>
            </div>
            <h1 className="font-serif text-[28px] font-semibold tracking-tight text-white m-0">
              Master Governance &amp; User Intelligence Panel
            </h1>
            <p className="text-[13px] text-white/70 max-w-2xl mt-1 m-0">
              Maximum access control: Inspect every team member&apos;s AI queries, manage elevated administrator accounts, and enforce company-wide data governance.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white px-3.5 py-2 rounded-md text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-lg border text-[13px] flex items-center justify-between gap-3 ${
            actionMessage.type === "success"
              ? "bg-green-tint border-green/30 text-green"
              : "bg-rust-tint border-rust/30 text-rust"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-stone p-4 rounded-lg shadow-2xs">
          <div className="text-[11.5px] font-semibold text-ink-soft flex items-center justify-between">
            <span>Total Accounts</span>
            <Users className="w-3.5 h-3.5 text-stone-dark" />
          </div>
          <div className="font-serif text-[24px] font-bold text-ink mt-1">
            {stats?.totalUsers || users.length}
          </div>
          <div className="text-[11px] text-ink-soft mt-1 flex items-center gap-1.5">
            <span className="text-purple-700 font-bold">{stats?.roleCounts?.MASTER || 1} Master</span>
            <span>&middot;</span>
            <span className="text-emerald-700 font-bold">{stats?.roleCounts?.ADMIN || 0} Admins</span>
            <span>&middot;</span>
            <span>{(stats?.roleCounts?.ANALYST || 0) + (stats?.roleCounts?.LEAD_TAGGER || 0)} Staff</span>
          </div>
        </div>

        <div className="bg-card border border-stone p-4 rounded-lg shadow-2xs">
          <div className="text-[11.5px] font-semibold text-ink-soft flex items-center justify-between">
            <span>AI User Sessions</span>
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="font-serif text-[24px] font-bold text-ink mt-1">
            {stats?.totalSessions || chatSessions.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Persisted in PostgreSQL
          </div>
        </div>

        <div className="bg-card border border-stone p-4 rounded-lg shadow-2xs">
          <div className="text-[11.5px] font-semibold text-ink-soft flex items-center justify-between">
            <span>Total Queries Executed</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="font-serif text-[24px] font-bold text-ink mt-1">
            {stats?.totalMessages || 0}
          </div>
          <div className="text-[11px] text-ink-soft mt-1">
            Across all team members
          </div>
        </div>

        <div className="bg-card border border-stone p-4 rounded-lg shadow-2xs">
          <div className="text-[11.5px] font-semibold text-ink-soft flex items-center justify-between">
            <span>Halte Store DB</span>
            <Database className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-serif text-[24px] font-bold text-emerald-700 mt-1">
            29,487
          </div>
          <div className="text-[11px] text-ink-soft mt-1">
            Live orders connected
          </div>
        </div>
      </div>

      {/* Navigation Segmented Control */}
      <div className="border-b border-stone flex items-center gap-2">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 pb-3 pt-1 px-3 text-[13.5px] font-semibold border-b-2 transition-all ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Every User&apos;s AI History</span>
          <span className="px-2 py-0.2 bg-stone/40 rounded-full text-[11px] font-mono">
            {chatSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 pb-3 pt-1 px-3 text-[13.5px] font-semibold border-b-2 transition-all ${
            activeTab === "users"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Master User Authority &amp; Admins</span>
          <span className="px-2 py-0.2 bg-stone/40 rounded-full text-[11px] font-mono">
            {users.length}
          </span>
        </button>
      </div>

      {/* ======================= TAB 1: ALL USER AI CHAT AUDITS ======================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-card border border-stone p-4 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
              {/* User Dropdown Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-ink-soft shrink-0">Filter by User:</span>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="bg-stone/20 border border-stone rounded-md px-3 py-1.5 text-[12.5px] text-ink font-medium focus:outline-hidden focus:border-slate"
                >
                  <option value="ALL">All Users ({users.length})</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Keyword Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across questions, SQL outputs, or SKUs..."
                  className="w-full pl-8 pr-3 py-1.5 bg-stone/20 border border-stone rounded-md text-[12.5px] text-ink placeholder:text-ink-soft/60 focus:outline-hidden focus:border-slate"
                />
              </div>
            </div>

            <div className="text-[12px] text-ink-soft">
              Showing <b>{filteredSessions.length}</b> user conversations
            </div>
          </div>

          {/* Sessions List */}
          {filteredSessions.length === 0 ? (
            <div className="bg-card border border-stone rounded-lg p-12 text-center">
              <MessageSquare className="w-10 h-10 text-stone-dark mx-auto mb-3 opacity-60" />
              <h3 className="font-serif text-[17px] font-semibold text-ink m-0">No chat sessions found</h3>
              <p className="text-[13px] text-ink-soft max-w-md mx-auto mt-1">
                {searchQuery || selectedUserFilter !== "ALL"
                  ? "No conversation matches the current filter."
                  : "When any user asks questions in the AI Advisor, their entire question, queries, and AI responses will appear here in real-time."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                const userMessages = session.messages.filter((m) => m.role === "user");
                const lastMessage = session.messages[session.messages.length - 1];

                return (
                  <div
                    key={session.id}
                    className="bg-card border border-stone rounded-lg hover:border-slate/40 transition-all shadow-2xs overflow-hidden"
                  >
                    {/* Header Row */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* User Pill & Title */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10.5px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                            session.user?.role === "MASTER"
                              ? "bg-purple-100 text-purple-800 border-purple-300"
                              : session.user?.role === "ADMIN"
                              ? "bg-green-tint text-green border-green/30"
                              : session.user?.role === "ANALYST"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-tint text-amber border-[#e3d3a8]"
                          }`}>
                            {session.user?.email || "Unknown User"} ({session.user?.role || "USER"})
                          </span>
                          <span className="text-stone-dark">&middot;</span>
                          <h4 className="font-serif text-[15.5px] font-semibold text-ink m-0 truncate">
                            {session.title}
                          </h4>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-[11.5px] text-ink-soft">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-dark" />
                            {new Date(session.updatedAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          <span>&middot;</span>
                          <span>{userMessages.length} questions asked ({session.messages.length} total messages)</span>
                        </div>

                        {/* Snippet Preview */}
                        <div className="mt-2 text-[12px] text-ink-soft bg-stone/10 p-2 rounded border border-stone/30 line-clamp-2">
                          <b className="text-ink">Last Response:</b> {lastMessage?.content ? lastMessage.content.replace(/[#*`_]/g, "").slice(0, 200) + "..." : "No reply recorded."}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone/30">
                        {/* Copy transcript */}
                        <button
                          onClick={(e) => handleCopyTranscript(session, e)}
                          className="px-2.5 py-1.5 rounded-md border border-stone hover:bg-stone/20 text-ink text-[12px] font-medium flex items-center gap-1 transition-colors"
                          title="Copy full transcript"
                        >
                          {copiedId === session.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green" />
                              <span className="text-green font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-dark" />
                              <span>Copy</span>
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

                        {/* Expand View */}
                        <button
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="bg-slate hover:bg-slate-dark text-white px-3 py-1.5 rounded-md text-[12px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? "Close" : "Inspect Dialogue"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Complete Transcript */}
                    {isExpanded && (
                      <div className="border-t border-stone/60 bg-[#FCFBF8] p-5 space-y-4 max-h-[500px] overflow-y-auto">
                        <div className="flex items-center justify-between text-[11px] font-mono text-ink-soft uppercase tracking-wider pb-2 border-b border-stone/30">
                          <span>Complete Q&amp;A Audit Log:</span>
                          <span>Session ID: {session.id}</span>
                        </div>

                        {session.messages.map((m) => (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-lg text-[13px] leading-relaxed ${
                              m.role === "user"
                                ? "bg-slate/10 border border-slate/20 text-ink"
                                : "bg-card border border-stone text-ink shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold text-[11px] mb-1.5 text-ink-soft">
                              <span>
                                {m.role === "user" ? `👤 ${session.user.email} asked:` : "🤖 Halte AI Advisor replied:"}
                              </span>
                              <span className="font-mono text-[10px]">{m.timestamp}</span>
                            </div>
                            <div className="whitespace-pre-wrap prose prose-sm max-w-none prose-p:my-1">
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: MASTER USER GOVERNANCE ======================= */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="bg-card border border-stone p-4 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div>
              <h3 className="font-serif text-[17px] font-semibold text-ink m-0">
                System Account Authority
              </h3>
              <p className="text-[12.5px] text-ink-soft m-0">
                As Master, you have sole authority to view and govern all Administrator, Analyst, and Lead Tagger accounts. Admin and Master accounts remain hidden from all standard user views.
              </p>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-slate hover:bg-slate-dark text-white px-3.5 py-2 rounded-md text-[12.5px] font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create User / Admin</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-card border border-stone rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-stone text-left text-[11.5px] font-semibold text-ink-soft">
                  <th className="p-3.5">User Email</th>
                  <th className="p-3.5">Authority Tier</th>
                  <th className="p-3.5">AI Sessions Run</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Master Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/40">
                {users.map((u) => {
                  const isCurrent = u.id === currentUserId;
                  const isMasterUser = u.role === "MASTER";

                  return (
                    <tr key={u.id} className="hover:bg-stone/10 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-ink flex items-center gap-2">
                          {u.email}
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-1.5 py-0.5 rounded border border-indigo-200">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-soft font-mono">ID: {u.id}</div>
                      </td>

                      <td className="p-3.5">
                        <span className={`text-[10.5px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                          u.role === "MASTER"
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : u.role === "ADMIN"
                            ? "bg-green-tint text-green border-green/30"
                            : u.role === "ANALYST"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-tint text-amber border-[#e3d3a8]"
                        }`}>
                          {u.role === "MASTER" ? "👑 MASTER" : u.role}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono font-semibold text-ink">
                          {u._count?.aiChatSessions || 0}
                        </span>{" "}
                        <span className="text-ink-soft text-[11px]">sessions</span>
                      </td>

                      <td className="p-3.5 text-ink-soft text-[12px]">
                        {new Date(u.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditRole(u.role);
                              setEditPassword("");
                            }}
                            className="p-1.5 rounded border border-stone hover:bg-stone/20 text-ink text-[11.5px] font-medium flex items-center gap-1 transition-colors"
                            title="Edit Role or Password"
                          >
                            <Sliders className="w-3.5 h-3.5 text-stone-dark" />
                            <span>Modify</span>
                          </button>

                          {!isMasterUser && !isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-1.5 rounded border border-stone hover:border-rust/40 hover:bg-rust-tint text-stone-dark hover:text-rust transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CREATE USER / ADMIN ======================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-stone rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone">
              <h3 className="font-serif text-[18px] font-semibold text-ink m-0 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Create New Account (Master Privilege)
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-ink-soft hover:text-ink text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-semibold text-ink-soft mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@halte.in"
                  className="w-full text-[13px] px-3 py-2 border border-stone rounded-md bg-stone/20 text-ink focus:outline-hidden focus:border-slate"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-soft mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full text-[13px] px-3 py-2 border border-stone rounded-md bg-stone/20 text-ink focus:outline-hidden focus:border-slate"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-soft mb-1">Authority Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full text-[13px] px-3 py-2 border border-stone rounded-md bg-white text-ink focus:outline-hidden focus:border-slate"
                >
                  <option value="ANALYST">Analyst (Full Analytics &amp; Reports)</option>
                  <option value="LEAD_TAGGER">Lead Tagger (Leads &amp; Abandoned Carts)</option>
                  <option value="ADMIN">Admin (Full Management - Hidden from staff views)</option>
                  <option value="MASTER">Master (Supreme Authority - Access to Master Panel)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-2 rounded-md border border-stone text-ink text-[12px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-md bg-slate text-white text-[12px] font-semibold hover:bg-slate-dark disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: MODIFY USER ======================= */}
      {editingUserId && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-stone rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone">
              <h3 className="font-serif text-[18px] font-semibold text-ink m-0 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Modify Account Authority
              </h3>
              <button onClick={() => setEditingUserId(null)} className="text-ink-soft hover:text-ink text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="text-[12.5px] text-ink-soft">
                Editing user: <b className="text-ink">{users.find((u) => u.id === editingUserId)?.email}</b>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-soft mb-1">Change Authority Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full text-[13px] px-3 py-2 border border-stone rounded-md bg-white text-ink focus:outline-hidden focus:border-slate"
                >
                  <option value="LEAD_TAGGER">Lead Tagger</option>
                  <option value="ANALYST">Analyst</option>
                  <option value="ADMIN">Admin (Full Control - Hidden from regular views)</option>
                  <option value="MASTER">Master (Supreme Authority)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink-soft mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full text-[13px] px-3 py-2 border border-stone rounded-md bg-stone/20 text-ink focus:outline-hidden focus:border-slate"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone">
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="px-3 py-2 rounded-md border border-stone text-ink text-[12px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateUser(editingUserId)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-md bg-slate text-white text-[12px] font-semibold hover:bg-slate-dark disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
