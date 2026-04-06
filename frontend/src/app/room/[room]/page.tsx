"use client";

import { use, useState } from "react";
import { insertRequest } from "@/lib/supabase";
import { REQUEST_TYPES, type RequestType } from "@/lib/types";

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading"; type: RequestType }
  | { kind: "success"; type: RequestType }
  | { kind: "duplicate"; type: RequestType }
  | { kind: "error"; type: RequestType; message: string };

export default function RoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = use(params);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const handleRequest = async (type: RequestType) => {
    if (submitState.kind === "loading") return;
    setSubmitState({ kind: "loading", type });

    const { error } = await insertRequest(room, type);

    if (!error) {
      setSubmitState({ kind: "success", type });
      setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
    } else if (error === "duplicate") {
      setSubmitState({ kind: "duplicate", type });
      setTimeout(() => setSubmitState({ kind: "idle" }), 3000);
    } else {
      setSubmitState({ kind: "error", type, message: error });
      setTimeout(() => setSubmitState({ kind: "idle" }), 4000);
    }
  };

  const activeType =
    submitState.kind !== "idle" ? submitState.type : null;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-600 text-white px-6 py-5 shadow-md">
        <p className="text-brand-100 text-xs uppercase tracking-widest font-medium">
          Room Services
        </p>
        <h1 className="text-3xl font-bold mt-0.5">Room {room}</h1>
      </header>

      {/* Status banner */}
      {submitState.kind !== "idle" && (
        <StatusBanner state={submitState} />
      )}

      {/* Service grid */}
      <section className="flex-1 p-5">
        <p className="text-stone-500 text-sm mb-4">
          Tap a service to send your request. We&apos;ll take care of it shortly.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {REQUEST_TYPES.map(({ type, label, icon, description }) => {
            const isActive = activeType === type;
            const isLoading =
              submitState.kind === "loading" && isActive;

            return (
              <button
                key={type}
                onClick={() => handleRequest(type)}
                disabled={isLoading}
                className={`
                  relative flex flex-col items-start p-4 rounded-2xl border-2 text-left
                  transition-all duration-150 active:scale-95
                  ${
                    isActive
                      ? "border-brand-500 bg-brand-50 shadow-inner"
                      : "border-stone-200 bg-white hover:border-brand-300 hover:shadow-sm"
                  }
                  disabled:opacity-60
                `}
              >
                <span className="text-3xl mb-2">{icon}</span>
                <span className="font-semibold text-stone-800 text-sm leading-tight">
                  {label}
                </span>
                <span className="text-stone-400 text-xs mt-0.5 leading-snug">
                  {description}
                </span>
                {isLoading && (
                  <span className="absolute top-3 right-3 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="p-5 text-center text-stone-400 text-xs">
        Need immediate help? Call reception: <strong>0</strong>
      </footer>
    </main>
  );
}

function StatusBanner({ state }: { state: Exclude<SubmitState, { kind: "idle" }> }) {
  const config = REQUEST_TYPES.find((r) => r.type === state.type)!;

  if (state.kind === "loading") {
    return (
      <div className="mx-4 mt-4 p-3 rounded-xl bg-stone-100 text-stone-600 text-sm text-center">
        Sending your request for <strong>{config.label}</strong>...
      </div>
    );
  }

  if (state.kind === "success") {
    return (
      <div className="mx-4 mt-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm text-center">
        ✓ Request for <strong>{config.label}</strong> received! We&apos;ll be right with you.
      </div>
    );
  }

  if (state.kind === "duplicate") {
    return (
      <div className="mx-4 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
        Your <strong>{config.label}</strong> request is already on its way.
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm text-center">
      Something went wrong. Please call reception at <strong>0</strong>.
    </div>
  );
}
