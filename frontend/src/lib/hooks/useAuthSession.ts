"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, fetchMyProfile } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/utils";

export function useAuthSession() {
  const router = useRouter();
  const [name, setName] = useState("Staff");
  const [role, setRole] = useState<"staff" | "manager" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push("/staff/login");
        return;
      }
      // Try to get display name + role from profiles table
      const profile = await fetchMyProfile();
      if (profile) {
        setName(profile.display_name);
        setRole(profile.role as "staff" | "manager" | "admin");
      } else {
        // Fallback: derive name from email if profile row doesn't exist yet
        setName(formatDisplayName(session.user.email ?? "staff@teacorphotels.com"));
        setRole("staff");
      }
      setLoading(false);
    });
  }, [router]);

  return { name, role, loading };
}
