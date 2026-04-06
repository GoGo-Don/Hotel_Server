"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/utils";

export function useAuthSession() {
  const router = useRouter();
  const [name, setName] = useState("Staff");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/staff/login");
      } else {
        setName(formatDisplayName(session.user.email ?? "staff@teacorphotels.com"));
        setLoading(false);
      }
    });
  }, [router]);

  return { name, loading };
}
