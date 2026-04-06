import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServiceRequest } from "./types";

// Lazy singleton — only instantiated on first use (client-side).
// Avoids the "supabaseUrl is required" crash during SSR/build when env vars are absent.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in your Supabase project values."
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Convenience alias — same as getSupabase() but named for direct use in components.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Typed helpers

export async function insertRequest(
  room: string,
  type: string,
  notes?: string
): Promise<{ data: ServiceRequest | null; error: string | null }> {
  try {
    // No .select() — anon role has INSERT but not SELECT via RLS.
    // We only need to know if the insert succeeded, not the returned row.
    const { error } = await getSupabase()
      .from("requests")
      .insert({ room, type, notes: notes ?? null, status: "pending" });

    if (error) {
      // Unique constraint violation = duplicate pending request
      if (error.code === "23505") {
        return { data: null, error: "duplicate" };
      }
      return { data: null, error: error.message };
    }
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function fetchActiveRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchActiveRequests:", error.message);
    return [];
  }
  return (data ?? []) as ServiceRequest[];
}

export async function fetchTodayRequests(): Promise<ServiceRequest[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await getSupabase()
    .from("requests")
    .select("*")
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchTodayRequests:", error.message);
    return [];
  }
  return (data ?? []) as ServiceRequest[];
}

export async function claimRequest(
  id: string,
  staffName: string
): Promise<void> {
  await supabase
    .from("requests")
    .update({ status: "in_progress", assigned_to: staffName, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function resolveRequest(id: string): Promise<void> {
  await supabase
    .from("requests")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function assignRequest(
  id: string,
  staffName: string
): Promise<void> {
  await getSupabase()
    .from("requests")
    .update({
      assigned_to: staffName,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function fetchStats(): Promise<import("./types").AdminStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data } = await getSupabase()
    .from("requests")
    .select("*")
    .gte("created_at", today.toISOString());

  const all = (data ?? []) as ServiceRequest[];
  const done = all.filter((r) => r.status === "done");
  const times = done
    .map((r) => new Date(r.updated_at).getTime() - new Date(r.created_at).getTime())
    .filter((t) => t > 0);
  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;

  return {
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    inProgress: all.filter((r) => r.status === "in_progress").length,
    done: done.length,
    avgCompletionMins: Math.round(avgMs / 60000),
  };
}
