# Approach 4 — Serverless BaaS (Supabase / Firebase)

## Overview

Use a Backend-as-a-Service platform to handle the database, real-time subscriptions, authentication, and edge functions — without operating any backend infrastructure yourself. The frontend (React/Next.js) talks directly to Supabase or Firebase. Real-time updates to the staff dashboard happen via the platform's own WebSocket layer.

**Best for:** Small-to-medium hotels wanting real-time UX without the operational overhead of running servers. Ideal for a solo developer or a team that wants to move fast.

---

## Architecture (Supabase)

```
 [QR Code in Room 204]
        |
        | HTTPS: hotel.com/room/204
        v
 +----------------------+
 | Guest PWA            |  ← Next.js / React, hosted on Vercel
 | Supabase JS client   |     Inserts directly into `requests` table
 +----------+-----------+
            |
            | supabase.from('requests').insert({...})
            v
 +----------------------+
 | Supabase             |
 | ┌──────────────────┐ |
 | │ PostgreSQL       │ |  ← Row Level Security: guests can INSERT, staff can SELECT/UPDATE
 | │ (managed)        │ |
 | ├──────────────────┤ |
 | │ Realtime         │ |  ← Broadcasts INSERT/UPDATE events via WebSocket
 | │ (WebSocket push) │ |
 | ├──────────────────┤ |
 | │ Edge Functions   │ |  ← Triggered on DB insert → sends email/SMS notification
 | │ (Deno)           │ |
 | ├──────────────────┤ |
 | │ Auth             │ |  ← Staff login (email+password or magic link)
 | └──────────────────┘ |
 +----------+-----------+
            |
            | Realtime subscription
            v
 +----------------------+
 | Staff Dashboard      |  ← Next.js page at /staff (auth'd via Supabase Auth)
 | Supabase JS client   |     Receives live INSERT/UPDATE events
 +----------------------+
```

---

## Pipeline Walkthrough

### 1. QR Code Layer

Same as Approach 1: static URL per room.

```
https://hotel.yourdomain.com/room/204
```

Hosted on Vercel — the Next.js page at `/room/[id]` auto-reads the room number from the URL.

---

### 2. Guest Interface

Next.js page at `/room/[room]`. The Supabase client is initialized with the project URL and the **anon key** (safe to expose in frontend — RLS enforces what anonymous users can do).

```tsx
// pages/room/[room].tsx
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RoomPage({ params }: { params: { room: string } }) {
  const { room } = params;

  const submitRequest = async (type: string) => {
    const { data, error } = await supabase
      .from("requests")
      .insert({ room, type, status: "pending" });
    
    if (error) {
      console.error(error);
      // Show "Something went wrong, please call reception"
    } else {
      // Show confirmation screen
    }
  };

  return (
    <div>
      <h1>Room {room}</h1>
      <button onClick={() => submitRequest("towels")}>Towels</button>
      <button onClick={() => submitRequest("water")}>Water</button>
      {/* etc. */}
    </div>
  );
}
```

---

### 3. Request Ingestion + Row Level Security

**Database schema (SQL run in Supabase dashboard):**
```sql
CREATE TABLE requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room        VARCHAR(10) NOT NULL,
  type        VARCHAR(50) NOT NULL,
  notes       TEXT,
  status      VARCHAR(20) DEFAULT 'pending',
  assigned_to VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Anonymous users (guests) can only INSERT
CREATE POLICY "guests_can_insert"
  ON requests FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users (staff) can read and update all requests
CREATE POLICY "staff_can_read"
  ON requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "staff_can_update"
  ON requests FOR UPDATE
  TO authenticated
  USING (true);
```

RLS is the security layer — the anon key is safe in the frontend because policies prevent guests from reading other rooms' requests.

**Preventing spam / idempotency:**
```sql
-- Unique constraint: only one pending request of each type per room
CREATE UNIQUE INDEX unique_pending_request
  ON requests (room, type)
  WHERE status = 'pending';
```

A guest tapping "Towels" twice gets a unique constraint error on the second insert, which the client handles gracefully ("Request already submitted").

---

### 4. Staff Notification — Edge Function

Supabase Edge Functions run on Deno and can be triggered by database webhooks.

**`supabase/functions/notify-staff/index.ts`:**
```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  const { record } = await req.json(); // DB webhook payload
  
  const room = record.room;
  const type = record.type;
  
  // Send SMS via Twilio
  const twilioSid = Deno.env.get("TWILIO_SID")!;
  const twilioToken = Deno.env.get("TWILIO_TOKEN")!;
  const staffPhone = Deno.env.get("STAFF_PHONE")!;
  
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: Deno.env.get("TWILIO_FROM")!,
        To: staffPhone,
        Body: `🔔 Room ${room} requests: ${type}`,
      }),
    }
  );

  return new Response("ok");
});
```

**Register the webhook** in Supabase Dashboard → Database → Webhooks:
- Table: `requests`
- Event: `INSERT`
- URL: `https://<project>.supabase.co/functions/v1/notify-staff`

---

### 5. Staff Dashboard — Supabase Realtime

Supabase Realtime broadcasts PostgreSQL changes over WebSocket. Staff dashboard subscribes without writing any WebSocket code.

```tsx
// pages/staff/index.tsx
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StaffDashboard() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // Initial load
    supabase.from("requests").select("*").eq("status", "pending")
      .then(({ data }) => setRequests(data ?? []));

    // Real-time subscription
    const channel = supabase
      .channel("requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRequests((prev) => [payload.new, ...prev]);
            new Audio("/alert.mp3").play();
          }
          if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const claimRequest = async (id: string) => {
    await supabase.from("requests").update({
      status: "in_progress",
      assigned_to: "Staff Name", // from auth session
    }).eq("id", id);
  };

  // render table...
}
```

Staff authentication uses Supabase Auth (email+password or magic link):
```tsx
// Login page
await supabase.auth.signInWithPassword({ email, password });
```

---

### 6. Infrastructure

**Frontend:** Vercel (free) — deploy with `git push`
**Backend:** Supabase handles everything — no server to manage
**Total cost:**

| Supabase Tier | Cost | Limits |
|---|---|---|
| Free | $0/month | 500MB DB, 50MB edge function logs, 2GB realtime bandwidth |
| Pro | $25/month | 8GB DB, unlimited realtime, priority support |

For a 50-room hotel, the free tier is very likely sufficient.

**Firebase alternative:**

| Feature | Supabase | Firebase |
|---|---|---|
| Database | PostgreSQL (SQL) | Firestore (NoSQL, document model) |
| Real-time | Postgres changes via WS | Firestore listeners |
| Auth | Supabase Auth | Firebase Auth |
| Functions | Deno Edge Functions | Cloud Functions (Node.js) |
| Pricing | Generous free tier | Free tier, then per-read/write costs |
| Lock-in | Medium (can self-host) | High (proprietary Firestore API) |
| SQL support | Full SQL | None — NoSQL only |

**Recommendation: Supabase over Firebase** for this use case — SQL is easier to query for reporting, RLS is cleaner than Firestore security rules, and Supabase can be self-hosted if needed.

---

## Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Guest UI | Next.js + Tailwind | Vercel deployment |
| Staff UI | Next.js (same project, /staff route) | Supabase Auth |
| Database | Supabase PostgreSQL | Managed, RLS enforced |
| Real-time | Supabase Realtime | WebSocket, no code to write |
| Notifications | Supabase Edge Function → Twilio | Triggered on INSERT |
| Auth | Supabase Auth | Magic link or password |
| Hosting | Vercel (free) + Supabase (free/pro) | |

---

## Pros and Cons by Pipeline Stage

### QR Code Layer
| | |
|---|---|
| **Pro** | Same static QR simplicity |
| **Con** | No dynamic QR management without a separate service |

### Guest Interface
| | |
|---|---|
| **Pro** | Very fast to build — Supabase client does all the heavy lifting |
| **Pro** | No API server to write — frontend inserts directly |
| **Con** | Anon key is public — RLS must be correctly configured or data is exposed |
| **Con** | Direct DB access from frontend is an unusual pattern; debugging RLS issues can be tricky |

### Request Ingestion
| | |
|---|---|
| **Pro** | Zero backend code for ingestion — just a table insert |
| **Pro** | Unique constraint handles idempotency at DB level |
| **Con** | No custom validation logic without an Edge Function in the middle |
| **Con** | RLS misconfiguration = data exposure. Must be tested carefully. |

### Staff Notification
| | |
|---|---|
| **Pro** | Edge Function webhook is clean and serverless |
| **Pro** | Supabase Realtime means staff dashboard updates without any custom WebSocket code |
| **Con** | Edge Functions run on Deno — limited ecosystem vs Node.js |
| **Con** | Edge Function cold starts can add 200–500ms latency on first notification |

### Staff Dashboard
| | |
|---|---|
| **Pro** | Realtime subscription is 10 lines of code |
| **Pro** | Supabase provides a built-in DB admin UI for debugging |
| **Con** | Supabase Realtime has had reliability issues at scale (known limitation) |
| **Con** | If Supabase is down, entire system is down |

### Infrastructure
| | |
|---|---|
| **Pro** | Zero ops — no servers, no Docker, no SSH |
| **Pro** | Free tier covers most small hotels |
| **Con** | Vendor lock-in — migrating off Supabase is non-trivial |
| **Con** | Free tier pauses DB after 1 week of inactivity |
| **Con** | Edge Function limits: 150MB memory, 10s timeout |

---

## Failure Modes

| Scenario | Impact | Mitigation |
|---|---|---|
| Supabase outage | Full system down | Monitor status.supabase.com; show "call reception" fallback message |
| Free tier pauses (inactive 7 days) | DB unavailable | Upgrade to Pro ($25/month) or set up a keep-alive ping |
| RLS misconfiguration | Guests can read/delete all requests | Test RLS policies with anon key before going live |
| Realtime drops | Staff miss live updates | Add fallback polling every 30s as a safety net |
| Edge Function cold start | 200ms notification delay | Acceptable; use Pro plan to reduce cold starts |

---

## Recommendation

**Best choice for rapid prototyping and small-to-medium hotels.** You can go from zero to working system in a day. The free tier is genuinely usable. The main risk is vendor lock-in and Supabase Realtime reliability at high scale — both acceptable for a hotel with up to ~100 rooms. Upgrade to Approach 3 (custom stack) if you outgrow it.
