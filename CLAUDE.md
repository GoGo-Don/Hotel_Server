# Hotel Room Service — Project Spec

## What This Is

A QR code-based room service request system to replace in-room phones. Guests scan a QR code, land on a branded web UI, and tap to request services. Staff see requests in real-time on a dashboard and can claim/resolve them.

## Chosen Architecture: Approach 4 — Supabase BaaS

See `04_approach_baas.md` for full rationale.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Database | Supabase PostgreSQL |
| Real-time | Supabase Realtime (postgres_changes over WebSocket) |
| Auth | Supabase Auth (email + password for staff) |
| Edge functions | Supabase Edge Functions (Deno) — for SMS/email on new request |
| Hosting | Vercel (frontend) + Supabase (backend) |
| QR generation | Python `qrcode` script |

---

## Project Layout

```
Hotel_Server/
├── CLAUDE.md                  ← this file
├── frontend/                  ← Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── room/[room]/   ← guest interface
│   │   │   ├── staff/         ← staff dashboard (auth required)
│   │   │   └── staff/login/   ← staff login
│   │   └── lib/
│   │       ├── supabase.ts    ← Supabase client singleton
│   │       └── types.ts       ← shared TypeScript types
│   └── .env.local.example
├── supabase/
│   └── migrations/
│       └── 001_initial.sql    ← schema + RLS policies
└── scripts/
    └── generate_qr.py         ← generates QR PNGs for each room
```

---

## Database Schema

```sql
CREATE TABLE requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room        VARCHAR(10)  NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  notes       TEXT,
  status      VARCHAR(20)  DEFAULT 'pending',   -- pending | in_progress | done
  assigned_to VARCHAR(100),
  created_at  TIMESTAMPTZ  DEFAULT now(),
  updated_at  TIMESTAMPTZ  DEFAULT now()
);
```

**Row Level Security:**
- `anon` role: INSERT only (guests submit requests, cannot read anything)
- `authenticated` role: SELECT + UPDATE (staff read and manage requests)

**Idempotency:** Partial unique index prevents duplicate pending requests:
```sql
CREATE UNIQUE INDEX unique_pending_request ON requests (room, type) WHERE status = 'pending';
```

---

## Guest Flow

1. Guest scans QR code in room → lands on `/room/204`
2. Page shows room number + grid of service buttons
3. Guest taps a service → Supabase `anon` insert into `requests`
4. UI shows confirmation; gracefully handles duplicate (already pending)
5. No login, no account, no personal data collected

**Request types:** water, towels, cleaning, extra_pillows, reception_callback, maintenance

---

## Staff Flow

1. Staff navigates to `/staff/login` → signs in with email + password
2. Redirected to `/staff` dashboard
3. Dashboard loads all pending/in-progress requests
4. Supabase Realtime subscription fires on every INSERT or UPDATE
5. New request: card appears at top, audio alert plays
6. Staff clicks "Claim" → status → `in_progress`, `assigned_to` = staff name
7. Staff clicks "Done" → status → `done`

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

The service role key is **never** exposed to the frontend. All privileged operations go through Edge Functions with the service role key set as a Supabase secret.

---

## Supabase Setup Checklist

Run once when creating a new project:

1. Create project at supabase.com
2. Run `supabase/migrations/001_initial.sql` in the SQL editor
3. Enable Realtime for the `requests` table (Database → Replication → Realtime)
4. Create staff user: Authentication → Users → Invite user
5. (Optional) Deploy Edge Function for SMS: `supabase functions deploy notify-staff`
6. (Optional) Register DB webhook: Database → Webhooks → new webhook on `requests` INSERT → Edge Function URL

---

## Running Locally

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key in .env.local
npm run dev
```

App runs at `http://localhost:3000`.

- Guest view: `http://localhost:3000/room/204`
- Staff login: `http://localhost:3000/staff/login`
- Staff dashboard: `http://localhost:3000/staff`

---

## QR Code Generation

```bash
cd scripts
pip install qrcode pillow
python generate_qr.py --base-url https://yourdomain.com --rooms 101-230
# Outputs PNG files: qr_room_101.png ... qr_room_230.png
```

---

## Key Decisions & Constraints

- **No guest authentication** — room number from URL is the only identity. Acceptable risk for hotel context.
- **RLS is the security boundary** — anon key is safe in the frontend because policies are restrictive.
- **Supabase Realtime** — uses `postgres_changes` subscription. If the connection drops, the client auto-reconnects and does a fresh fetch to catch missed events.
- **No SSR for guest page** — fully client-rendered to keep Supabase client simple. SEO is irrelevant for a room-specific URL.
- **Staff auth is client-side** — session stored in localStorage via Supabase Auth. Staff dashboard checks session on mount and redirects to login if absent.
- **Do not** add analytics, multi-property support, or PMS integration until this PoC is validated in a real hotel.
