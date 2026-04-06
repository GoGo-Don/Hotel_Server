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
    const { data, error } = await getSupabase()
      .from("requests")
      .insert({ room, type, notes: notes ?? null, status: "pending" })
      .select()
      .single();

    if (error) {
      // Unique constraint violation = duplicate pending request
      if (error.code === "23505") {
        return { data: null, error: "duplicate" };
      }
      return { data: null, error: error.message };
    }
    return { data: data as ServiceRequest, error: null };
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
