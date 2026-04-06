"use client";

import { useEffect, useState, useCallback } from "react";
import {
  type LucideIcon,
  Coffee, Droplets, Bath, Sparkles, AlarmClock, Monitor,
  UtensilsCrossed, Phone, Wifi, HelpCircle, Users, CheckCircle2,
} from "lucide-react";
import {
  supabase,
  fetchUnassignedRequests,
  fetchActiveRequests,
  fetchTodayRequests,
  assignRequest,
  resolveRequest,
} from "@/lib/supabase";
import { type ServiceRequest, STAFF_ROSTER } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { timeAgo, isOverdue, getConfig } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Coffee, Droplets, Bath, Sparkles, AlarmClock, Monitor, UtensilsCrossed, Phone, Wifi,
};

function RequestIcon({ type, size = 16 }: { type: string; size?: number }) {
  const config = getConfig(type);
  const I = ICON_MAP[config?.icon ?? ""] ?? HelpCircle;
  return (
    <span className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
      <I size={size} strokeWidth={1.5} className="text-brand-400" />
    </span>
  );
}

// ─── Unassigned request card ──────────────────────────────────────────────────

function UnassignedCard({
  req,
  onAssign,
}: {
  req: ServiceRequest;
  onAssign: (id: string, staff: string) => void;
}) {
  const config = getConfig(req.type);
  const overdue = isOverdue(req.created_at);

  return (
    <div className={`bg-white rounded-2xl border-2 p-4 space-y-3 transition-all
      ${overdue ? "border-red-300" : "border-brand-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <RequestIcon type={req.type} size={18} />
          <div>
            <p className="font-semibold text-stone-800 text-sm">{config?.label ?? req.type}</p>
            <p className="text-stone-400 text-xs">Room {req.room}</p>
          </div>
        </div>
        <p className={`text-xs font-medium shrink-0 ${overdue ? "text-red-500" : "text-stone-400"}`}>
          {overdue && "⚠ "}{timeAgo(req.created_at)}
        </p>
      </div>

      {req.notes && (
        <p className="text-stone-500 text-xs bg-stone-50 rounded-lg px-3 py-2 italic">
          &ldquo;{req.notes}&rdquo;
        </p>
      )}

      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onAssign(req.id, e.target.value);
          e.target.value = "";
        }}
        className="w-full text-sm border-2 border-brand-200 rounded-xl px-3 py-2.5 bg-white text-stone-700
          focus:outline-none focus:border-brand-400 font-medium"
      >
        <option value="" disabled>Assign to staff member…</option>
        {STAFF_ROSTER.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  );
}

// ─── In-progress card (compact) ───────────────────────────────────────────────

function InProgressCard({
  req,
  onDone,
  onReassign,
}: {
  req: ServiceRequest;
  onDone: (id: string) => void;
  onReassign: (id: string, staff: string) => void;
}) {
  const config = getConfig(req.type);
  const overdue = isOverdue(req.created_at);

  return (
    <div className={`bg-white rounded-2xl border-2 p-4 space-y-3 transition-all
      ${overdue ? "border-red-300" : "border-amber-300"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <RequestIcon type={req.type} size={16} />
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

      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500 shrink-0">
          → <strong className="text-stone-700">{req.assigned_to}</strong>
        </span>
        <div className="flex-1" />
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onReassign(req.id, e.target.value);
            e.target.value = "";
          }}
          className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-600
            focus:outline-none focus:ring-1 focus:ring-brand-400"
        >
          <option value="" disabled>Reassign…</option>
          {STAFF_ROSTER.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button
          onClick={() => onDone(req.id)}
          className="shrink-0 text-xs bg-teal-500 hover:bg-teal-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Staff workload pill ───────────────────────────────────────────────────────

function WorkloadBar({ requests }: { requests: ServiceRequest[] }) {
  const counts = STAFF_ROSTER.map((name) => ({
    name,
    count: requests.filter((r) => r.assigned_to === name && r.status === "in_progress").length,
  }));

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Users size={14} strokeWidth={1.75} className="text-stone-400" />
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Staff Workload</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {counts.map(({ name, count }) => (
          <div key={name} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
            ${count === 0 ? "bg-stone-100 text-stone-400" : count >= 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
          >
            <span>{name.split(" ")[0]}</span>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${count === 0 ? "bg-stone-200 text-stone-500" : count >= 3 ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"}`}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { name: managerName, loading } = useAuthSession();
  const [unassigned, setUnassigned] = useState<ServiceRequest[]>([]);
  const [active, setActive] = useState<ServiceRequest[]>([]);
  const [done, setDone] = useState<ServiceRequest[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    const [unassignedData, allActive, todayAll] = await Promise.all([
      fetchUnassignedRequests(),
      fetchActiveRequests(),
      fetchTodayRequests(),
    ]);
    setUnassigned(unassignedData);
    setActive(allActive.filter((r) => r.status === "in_progress"));
    setDone(todayAll.filter((r) => r.status === "done"));
  }, []);

  useEffect(() => {
    if (!loading) refresh();
  }, [loading, refresh]);

  // Realtime — full refresh on any change
  useEffect(() => {
    if (loading) return;
    const channel = supabase
      .channel("manager-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loading, refresh]);

  const handleAssign = async (id: string, staffName: string) => {
    await assignRequest(id, staffName);
    await refresh();
  };

  const handleDone = async (id: string) => {
    await resolveRequest(id);
    await refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5F8]">
        <div className="w-8 h-8 border-4 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const overdueCount = unassigned.filter((r) => isOverdue(r.created_at)).length;

  return (
    <main className="min-h-screen bg-[#F3F5F8]">
      {/* Header */}
      <header className="bg-white border-b-[3px] border-brand-400 px-5 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">Manager</p>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Task Queue
              {unassigned.length > 0 && (
                <span className="bg-brand-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unassigned.length}
                </span>
              )}
              {overdueCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {overdueCount} overdue
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-xs text-stone-400 hover:text-stone-700 transition-colors">Stats</a>
            <span className="text-xs text-stone-400 hidden sm:block">{managerName}</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/staff/login"; }}
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-5 pb-10" key={tick}>

        {/* Workload bar */}
        <WorkloadBar requests={active} />

        {/* Unassigned queue */}
        <section>
          <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">
            Unassigned
            {unassigned.length > 0 && (
              <span className="ml-2 text-brand-400 font-bold">{unassigned.length}</span>
            )}
          </h2>
          {unassigned.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-100 text-center text-stone-400 text-sm py-10 flex flex-col items-center gap-2">
              <CheckCircle2 size={28} strokeWidth={1.5} className="text-teal-400" />
              <span>All requests assigned.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {unassigned.map((req) => (
                <UnassignedCard key={req.id} req={req} onAssign={handleAssign} />
              ))}
            </div>
          )}
        </section>

        {/* In progress */}
        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">
              In Progress
              <span className="ml-2 text-amber-500 font-bold">{active.length}</span>
            </h2>
            <div className="space-y-3">
              {active.map((req) => (
                <InProgressCard
                  key={req.id}
                  req={req}
                  onDone={handleDone}
                  onReassign={handleAssign}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed today — compact count only */}
        {done.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-stone-100 shadow-sm">
            <CheckCircle2 size={16} strokeWidth={1.75} className="text-teal-500" />
            <p className="text-sm text-stone-600">
              <strong className="text-teal-600">{done.length}</strong> request{done.length !== 1 ? "s" : ""} completed today
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
