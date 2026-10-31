"use client";

import { useState } from "react";

interface UserItem {
  id: string;
  email: string;
  role: "MASTER" | "ADMIN" | "ANALYST" | "LEAD_TAGGER";
  createdAt: string | Date;
}

export function TeamManagement({ 
  initialUsers, 
  currentUserId 
}: { 
  initialUsers: UserItem[]; 
  currentUserId?: string;
}) {
  // Admin and Master accounts should NOT be visible in users list
  const filteredInitial = (initialUsers || []).filter(
    (u) => u.role !== "ADMIN" && (u.role as string) !== "MASTER"
  );
  const [users, setUsers] = useState<UserItem[]>(filteredInitial);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"LEAD_TAGGER" | "ANALYST">("LEAD_TAGGER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUsers([data.user, ...users]);
      setEmail("");
      setPassword("");
      setRole("LEAD_TAGGER");
      setShowAddModal(false);
      setSuccess(`User ${data.user.email} created successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove user "${userEmail}"?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch (err) {
      alert("Error deleting user");
    }
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="font-serif text-[24px] m-0 mb-1 font-semibold text-ink">
            Team &amp; Role Access Control
          </h2>
          <p className="m-0 text-[13.5px] text-ink-soft">
            Manage who can access ADuniFY. Lead Taggers can <strong>only</strong> access the Lead Tagging section — all financial data, analytics, and connections are locked.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="bg-ink text-white py-2 px-4 rounded-sm text-[12.5px] font-semibold hover:bg-ink/90 transition-colors shrink-0"
        >
          {showAddModal ? "Cancel" : "+ Add Team Member"}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-tint border border-green/30 text-green rounded-sm text-[13px] font-medium">
          {success}
        </div>
      )}

      {/* Add User Modal / Form */}
      {showAddModal && (
        <form onSubmit={handleCreate} className="bg-card border border-stone rounded-md p-6 mb-6">
          <h3 className="font-serif text-[18px] font-semibold mb-4">New Team Account</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-rust-tint border border-rust/30 text-rust rounded-sm text-[13px]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="staff@halte.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-[13px] px-3 py-2 border border-stone rounded-sm bg-white outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter login password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-[13px] px-3 py-2 border border-stone rounded-sm bg-white outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1">
                Access Level (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full text-[13px] px-3 py-2 border border-stone rounded-sm bg-white outline-none focus:border-ink cursor-pointer"
              >
                <option value="LEAD_TAGGER">Lead Tagger (Leads &amp; Abandoned Carts - Sales Recovery)</option>
                <option value="ANALYST">Analyst (Full Analytics &amp; Reports)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-[12.5px] px-4 py-2 border border-stone rounded-sm text-ink-soft hover:bg-stone/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-green text-white text-[12.5px] font-semibold px-5 py-2 rounded-sm hover:bg-green/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Save Account"}
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="bg-card border border-stone rounded-md overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead className="bg-stone/30">
            <tr>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Email</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Access Role</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Scope &amp; Permissions</th>
              <th className="text-left font-semibold py-3 px-4 border-b border-stone text-ink-soft">Created</th>
              <th className="text-right font-semibold py-3 px-4 border-b border-stone text-ink-soft">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isCurrent = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-b border-stone last:border-0 hover:bg-stone/5">
                  <td className="py-3 px-4 font-medium">
                    {u.email}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] uppercase font-bold text-ink-soft bg-stone px-1.5 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {u.role === "ADMIN" && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-green/20 text-green border border-green/30">
                        Admin
                      </span>
                    )}
                    {u.role === "LEAD_TAGGER" && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-tint text-amber border border-[#e3d3a8]">
                        Lead Tagger
                      </span>
                    )}
                    {u.role === "ANALYST" && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-stone text-ink-soft border border-stone-dark/30">
                        Analyst
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[12.5px] text-ink-soft">
                    {u.role === "LEAD_TAGGER" ? (
                      <span className="text-amber font-medium">
                        🔒 Restricted: Can ONLY view &amp; tag leads. Analytics &amp; connections locked.
                      </span>
                    ) : u.role === "ADMIN" ? (
                      <span>Full system access, campaign mapping, connections &amp; user management</span>
                    ) : (
                      <span>View analytics, brand reports, recommendations &amp; lead tagging</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-stone-dark text-[12px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!isCurrent && (
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        className="text-[12px] text-rust hover:underline font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
