"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  fetchTodayRequests,
  assignRequest,
  resolveRequest,
  fetchStats,
} from "@/lib/supabase";
import {
  type ServiceRequest,
  type AdminStats,
  REQUEST_TYPES,
  LEGACY_REQUEST_TYPES,
  STAFF_ROSTER,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

function duration(createdAt: string, updatedAt: string): string {
  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function isOverdue(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() > 10 * 60 * 1000;
}

function getConfig(type: string) {
  return [...REQUEST_TYPES, ...LEGACY_REQUEST_TYPES].find((r) => r.type === type);
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  colour,
}: {
  label: string;
  value: string | number;
  sub?: string;
  colour: string;
}) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-1 ${colour}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

// ─── Request row (active) ────────────────────────────────────────────────────

function ActiveRequestRow({
  req,
  onAssign,
  onDone,
}: {
  req: ServiceRequest;
  onAssign: (id: string, staff: string) => void;
  onDone: (id: string) => void;
}) {
  const config = getConfig(req.type);
  const overdue = req.status === "pending" && isOverdue(req.created_at);

  return (
    <div
      className={`bg-white rounded-2xl border-2 p-4 space-y-3
        ${req.status === "in_progress" ? "border-amber-300" : overdue ? "border-red-300" : "border-stone-200"}`}
    >
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config?.icon ?? "📋"}</span>
          <div>
            <p className="font-semibold text-stone-800 text-sm">{config?.label ?? req.type}</p>
            <p className="text-stone-400 text-xs">Room {req.room}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <StatusBadge status={req.status} />
          <p className={`text-xs mt-1 ${overdue ? "text-red-500 font-medium" : "text-stone-400"}`}>
            {overdue && "⚠ "}{timeAgo(req.created_at)}
          </p>
        </div>
      </div>

      {/* Assigned to */}
      {req.assigned_to && (
        <p className="text-xs text-stone-500">
          Assigned to <strong className="text-stone-700">{req.assigned_to}</strong>
        </p>
      )}

      {/* Assign dropdown + Done */}
      <div className="flex gap-2 items-center">
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onAssign(req.id, e.target.value);
            e.target.value = "";
          }}
          className="flex-1 text-sm border border-stone-200 rounded-xl px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="" disabled>
            {req.assigned_to ? `Reassign…` : "Assign to…"}
          </option>
          {STAFF_ROSTER.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button
          onClick={() => onDone(req.id)}
          className="shrink-0 text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Completed row ────────────────────────────────────────────────────────────

function CompletedRow({ req }: { req: ServiceRequest }) {
  const config = getConfig(req.type);
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-stone-100 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base">{config?.icon ?? "📋"}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-700 truncate">{config?.label ?? req.type}</p>
          <p className="text-xs text-stone-400">Room {req.room}</p>
        </div>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        {req.assigned_to && (
          <p className="text-xs text-stone-500">{req.assigned_to}</p>
        )}
        <p className="text-xs font-medium text-green-600">
          ✓ {duration(req.created_at, req.updated_at)}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceRequest["status"] }) {
  const styles: Record<ServiceRequest["status"], string> = {
    pending: "bg-brand-100 text-brand-700",
    in_progress: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700",
  };
  const labels: Record<ServiceRequest["status"], string> = {
    pending: "Pending",
    in_progress: "In Progress",
    done: "Done",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [tick, setTick] = useState(0);

  // Refresh timestamps every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/staff/login");
      } else {
        const raw = session.user.email?.split("@")[0] ?? "Admin";
        const name = raw.split(/[._-]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        setAdminName(name);
        setLoading(false);
      }
    });
  }, [router]);

  const refresh = useCallback(async () => {
    const [data, s] = await Promise.all([fetchTodayRequests(), fetchStats()]);
    setRequests(data);
    setStats(s);
  }, []);

  useEffect(() => {
    if (!loading) refresh();
  }, [loading, refresh]);

  // Realtime
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loading, refresh]);

  const handleAssign = async (id: string, staffName: string) => {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, assigned_to: staffName, status: "in_progress" } : r)
    );
    await assignRequest(id, staffName);
    await refresh();
  };

  const handleDone = async (id: string) => {
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, status: "done" } : r)
    );
    await resolveRequest(id);
    await refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const active = requests.filter((r) => r.status !== "done");
  const done = requests.filter((r) => r.status === "done");
  const overdueCount = active.filter(
    (r) => r.status === "pending" && isOverdue(r.created_at)
  ).length;

  // Sort active: overdue pending first, then in_progress, then pending by age
  const sortedActive = [...active].sort((a, b) => {
    const aOverdue = a.status === "pending" && isOverdue(a.created_at);
    const bOverdue = b.status === "pending" && isOverdue(b.created_at);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return (
    <main className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-brand-900 text-white px-5 py-4 flex items-center justify-between shadow-md sticky top-0 z-10"
        style={{ backgroundColor: "#3d2a0c" }}>
        <div>
          <p className="text-brand-200 text-xs font-medium" style={{ color: "#c9973a" }}>
            Grand Stay Hotel
          </p>
          <h1 className="text-lg font-bold flex items-center gap-2">
            Admin Dashboard
            {overdueCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {overdueCount} overdue
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <a href="/staff" className="text-xs opacity-60 hover:opacity-100 transition-opacity">
            Staff view
          </a>
          <span className="text-xs opacity-60">{adminName}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/staff/login"); }}
            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="p-4 space-y-5 pb-10">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Today's requests"
              value={stats.total}
              colour="bg-stone-800 text-white"
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              sub={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
              colour={stats.pending > 0 ? "bg-brand-100 text-brand-900" : "bg-stone-50 text-stone-600"}
            />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              colour={stats.inProgress > 0 ? "bg-amber-100 text-amber-900" : "bg-stone-50 text-stone-600"}
            />
            <StatCard
              label="Completed"
              value={stats.done}
              colour="bg-green-100 text-green-900"
            />
            <StatCard
              label="Avg completion"
              value={stats.avgCompletionMins > 0 ? `${stats.avgCompletionMins}m` : "—"}
              sub={stats.done > 0 ? `based on ${stats.done} request${stats.done !== 1 ? "s" : ""}` : "no data yet"}
              colour="bg-stone-50 text-stone-700"
            />
            <StatCard
              label="Active now"
              value={active.length}
              colour={active.length > 0 ? "bg-red-50 text-red-800" : "bg-stone-50 text-stone-600"}
            />
          </div>
        )}

        {/* Active requests */}
        <div>
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-3">
            Active Requests{" "}
            {active.length > 0 && (
              <span className="text-stone-400 font-normal normal-case">
                — {active.length} open
              </span>
            )}
          </h2>

          {sortedActive.length === 0 ? (
            <div className="text-center text-stone-400 text-sm py-10 bg-white rounded-2xl border border-stone-200">
              No active requests right now.
            </div>
          ) : (
            <div className="space-y-3" key={tick}>
              {sortedActive.map((req) => (
                <ActiveRequestRow
                  key={req.id}
                  req={req}
                  onAssign={handleAssign}
                  onDone={handleDone}
                />
              ))}
            </div>
          )}
        </div>

        {/* Completed today */}
        <div>
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-3">
            Completed Today{" "}
            {done.length > 0 && (
              <span className="text-stone-400 font-normal normal-case">
                — {done.length} done
              </span>
            )}
          </h2>

          {done.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-6">
              No completed requests yet today.
            </p>
          ) : (
            <div className="space-y-2">
              {done
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .map((req) => (
                  <CompletedRow key={req.id} req={req} />
                ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
