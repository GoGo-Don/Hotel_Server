"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/staff");
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#F3F5F8]">
      {/* Top zone — wordmark pinned near top */}
      <div className="flex flex-col items-center pt-14 pb-6">
        <span className="font-bold text-2xl text-stone-900 tracking-tight">TeaCorp<span className="text-brand-400">Hotels</span></span>
        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-widest mt-1">Bangalore · Corporate Hotels</p>
      </div>

      {/* Middle zone — card takes remaining space, centred */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-stone-800">Staff Login</h1>
            <p className="text-brand-400 text-sm font-medium mt-1">TeaCorp Hotels</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                placeholder="you@hotel.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-400 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom zone — footer */}
      <div className="py-6 text-center">
        <p className="text-stone-400 text-xs">TeaCorp Hotels Staff Portal &middot; Bangalore</p>
      </div>
    </main>
  );
}
