"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  type LucideIcon,
  Coffee, Droplets, Bath, Sparkles, AlarmClock, Monitor,
  UtensilsCrossed, Phone, Wifi, HelpCircle,
} from "lucide-react";
import { supabase, fetchActiveRequests, fetchTodayRequests, resolveRequest } from "@/lib/supabase";

import { type ServiceRequest } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  Coffee, Droplets, Bath, Sparkles, AlarmClock, Monitor, UtensilsCrossed, Phone, Wifi,
};
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { timeAgo, isOverdue, getConfig } from "@/lib/utils";

function sortRequests(list: ServiceRequest[]): ServiceRequest[] {
  // Overdue pending first (oldest first within group), then rest by created_at ascending
  const overdue = list.filter(
    (r) => r.status === "pending" && isOverdue(r.created_at)
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const rest = list.filter(
    (r) => !(r.status === "pending" && isOverdue(r.created_at))
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return [...overdue, ...rest];
}

function RequestCard({
  req,
  tick,
  onResolve,
}: {
  req: ServiceRequest;
  tick: number;
  onResolve: (id: string) => void;
}) {
  void tick; // used to trigger re-render for timeAgo freshness
  const config = getConfig(req.type);
  const overdue = req.status === "pending" && isOverdue(req.created_at);

  return (
    <div
      className={`bg-white rounded-2xl border-2 p-4 space-y-3 transition-all
        ${req.status === "pending" ? (overdue ? "border-red-300" : "border-brand-200") : "border-stone-200"}
        ${req.status === "in_progress" ? "border-amber-300" : ""}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              {(() => { const I = ICON_MAP[config?.icon ?? ""] ?? HelpCircle; return <I size={20} strokeWidth={1.5} className="text-brand-400" />; })()}
            </span>
          <div>
            <p className="font-semibold text-stone-800 text-sm">{config?.label ?? req.type}</p>
            <p className="text-stone-400 text-xs">Room {req.room}</p>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={req.status} />
          <p className={`text-xs mt-1 ${overdue ? "text-red-500 font-medium" : "text-stone-400"}`}>
            {overdue && "⚠ "}
            {timeAgo(req.created_at)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {req.notes && (
        <p className="text-stone-600 text-xs bg-stone-50 rounded-lg px-3 py-2 italic">
          &ldquo;{req.notes}&rdquo;
        </p>
      )}

      {/* Assigned to */}
      {req.assigned_to && (
        <p className="text-xs text-stone-400">
          Assigned to <strong className="text-stone-600">{req.assigned_to}</strong>
        </p>
      )}

      {/* Actions */}
      {(req.status === "pending" || req.status === "in_progress") && (
        <button
          onClick={() => onResolve(req.id)}
          className="w-full text-sm bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-xl transition-colors"
        >
          Done
        </button>
      )}
    </div>
  );
}

export default function StaffDashboard() {
  const { name: staffName, loading } = useAuthSession();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [tick, setTick] = useState(0); // force re-render for timeAgo
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Re-render every 30s so relative timestamps stay fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load requests based on active filter
  const loadRequests = useCallback(async () => {
    const data =
      filter === "all" ? await fetchTodayRequests() : await fetchActiveRequests();
    setRequests(sortRequests(data));
  }, [filter]);

  useEffect(() => {
    if (!loading) loadRequests();
  }, [loading, loadRequests]);

  // Realtime subscription
  useEffect(() => {
    if (loading) return;

    const channel = supabase
      .channel("requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => {
          const updated = payload.new as ServiceRequest;

          if (payload.eventType === "INSERT") {
            setRequests((prev) => sortRequests([updated, ...prev]));
            // Play alert only if sound is enabled
            if (soundEnabled) {
              try {
                if (!audioRef.current) {
                  audioRef.current = new Audio("/alert.wav");
                }
                audioRef.current.play().catch(() => {});
              } catch {}
            }
          }

          if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              sortRequests(prev.map((r) => (r.id === updated.id ? updated : r)))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading, soundEnabled]);

  const handleResolve = async (id: string) => {
    setRequests((prev) =>
      sortRequests(prev.map((r) => (r.id === id ? { ...r, status: "done" } : r)))
    );
    await resolveRequest(id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/staff/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const visibleRequests =
    filter === "active"
      ? requests.filter((r) => r.status !== "done")
      : requests;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const overdueCount = requests.filter(
    (r) => r.status === "pending" && isOverdue(r.created_at)
  ).length;

  return (
    <main className="min-h-screen bg-[#F3F5F8]">
      {/* Header */}
      <header className="bg-white border-b-[3px] border-brand-400 px-5 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">Staff Dashboard</p>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>
              <span className="font-bold text-stone-900">TeaCorp</span><span className="text-brand-400 font-bold">Hotels</span>
            </span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? "Sound alerts on" : "Sound alerts off"}
            className={`text-lg transition-opacity ${soundEnabled ? "opacity-100" : "opacity-40"}`}
          >
            🔔
          </button>
          <a href="/admin" className="text-xs text-stone-500 hover:text-stone-800 transition-colors hidden sm:block">
            Admin
          </a>
          <span className="text-stone-500 text-xs hidden sm:block">{staffName}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pt-4">
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
            ${filter === "active" ? "bg-brand-400 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
        >
          Active
          {overdueCount > 0 && filter === "active" && (
            <span className="ml-1.5 bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
              {overdueCount} overdue
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
            ${filter === "all" ? "bg-brand-400 text-white" : "bg-white text-stone-600 border border-stone-200"}`}
        >
          All today
        </button>
      </div>

      {/* Request list */}
      <section className="p-4 space-y-3 pb-20">
        {visibleRequests.length === 0 ? (
          <div className="text-center text-stone-400 text-sm py-16">
            {filter === "active" ? "No active requests." : "No requests yet today."}
          </div>
        ) : (
          visibleRequests.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              tick={tick}
              onResolve={handleResolve}
            />
          ))
        )}
      </section>
    </main>
  );
}
