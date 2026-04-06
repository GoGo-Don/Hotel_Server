# Approach 1 — Static QR + Progressive Web App (PWA)

## Overview

The simplest web-native approach. A static QR code in each room encodes a URL. Guests scan it and land on a mobile-optimized Progressive Web App hosted on a cloud provider. Requests are submitted via REST to a lightweight backend and stored in a database. Staff receive notifications and use a simple dashboard.

**Best for:** Medium hotels (30–150 rooms), teams with one developer, hotels that want a branded experience without heavy infrastructure.

---

## Architecture

```
 [QR Code in Room 204]
        |
        | scans (HTTPS URL: hotel.com/room/204)
        v
 +------------------+
 |  Guest PWA       |  ← React / Next.js, hosted on Vercel or Cloudflare Pages
 |  (mobile web)    |     Tailwind CSS, service worker for offline state
 +--------+---------+
          |
          | POST /api/requests  { room: "204", type: "towels" }
          v
 +------------------+
 |  API Server      |  ← FastAPI (Python) or Express (Node)
 |                  |     Rate limiting, validation, idempotency check
 +--------+---------+
          |
          | write
          v
 +------------------+       +------------------+
 |  PostgreSQL      |       |  Notification    |
 |  (Supabase /     |──────▶|  Service         |
 |   Railway / RDS) |       |  (email/SMS/push)|
 +------------------+       +------------------+
          |
          | read (polling or SSE)
          v
 +------------------+
 |  Staff Dashboard |  ← Separate URL: hotel.com/staff  (login required)
 |                  |     React, polled every 10s or SSE stream
 +------------------+
```

---

## Pipeline Walkthrough

### 1. QR Code Layer

- Generate one QR code per room pointing to `https://hotel.com/room/{room_number}`
- Room number is a path parameter — readable, simple, easy to debug
- Static: once printed, the URL never changes (don't redesign your URL scheme later)
- Python generation:
  ```python
  import qrcode
  for room in range(101, 250):
      img = qrcode.make(f"https://hotel.com/room/{room}")
      img.save(f"qr_room_{room}.png")
  ```
- Print on card stock, laminate, place on desk or back of door

### 2. Guest Interface (PWA)

- React + Tailwind, served as a static build (no SSR needed for guest side)
- URL param (`/room/204`) auto-populates the room context — guest sees "Room 204" in the header
- UI shows a grid of large tap buttons: Water, Towels, Room Cleaning, Reception Callback, Extra Pillows, etc.
- Optional free-text notes field
- On submit: POST to `/api/requests`, show loading state, then confirmation screen
- Service worker caches the shell so the UI loads even if Wi-Fi blips after initial load
- `manifest.json` enables "Add to Home Screen" for repeat guests

### 3. Request Ingestion (API)

- FastAPI endpoint:
  ```python
  @app.post("/api/requests")
  async def create_request(body: RequestBody, db: Session = Depends(get_db)):
      # idempotency: check no pending request of same type exists for room
      existing = db.query(Request).filter_by(
          room=body.room, type=body.type, status="pending"
      ).first()
      if existing:
          return {"id": existing.id, "duplicate": True}
      req = Request(**body.dict(), status="pending")
      db.add(req)
      db.commit()
      notify_staff(req)  # async task
      return {"id": req.id}
  ```
- Database schema:
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
  ```
- Rate limiting: `slowapi` middleware, 10 requests/minute per room

### 4. Staff Notification

- On new request: fire a background task (FastAPI `BackgroundTasks`)
- **Option A — Email:** `smtplib` or SendGrid. Slow, not ideal for urgent requests but zero setup cost.
- **Option B — SMS:** Twilio. ~$0.0075/message. Reliable, works on any phone, no app needed.
- **Option C — Server-Sent Events (SSE):** Staff dashboard holds an open HTTP connection; server pushes events.
  ```python
  @app.get("/api/staff/stream")
  async def stream(request: Request):
      async def event_generator():
          while True:
              if await request.is_disconnected():
                  break
              new_requests = poll_db_for_new()
              if new_requests:
                  yield f"data: {json.dumps(new_requests)}\n\n"
              await asyncio.sleep(2)
      return EventSourceResponse(event_generator())
  ```
- **Option D — Polling:** Dashboard calls `GET /api/requests?status=pending` every 10 seconds. Simple, no persistent connection. Adds ~10s delay. Fine for most hotels.

### 5. Staff Dashboard

- Protected route: `/staff` — login with username/password, JWT stored in localStorage
- Table/card view of all pending requests, sorted by time
- Colour coding: green (new), yellow (in-progress), grey (done)
- "Claim" button sets `assigned_to = me`, status = `in_progress`
- "Done" button sets status = `done`
- Audio alert (Web Audio API) plays when a new card appears
- Filter by: room, type, status, date

### 6. Infrastructure

- **Frontend:** Vercel (free tier). Deploy with `git push`. CDN-backed, auto HTTPS.
- **Backend:** Railway or Render (free tier for hobby, $5/month for always-on). FastAPI in Docker.
- **Database:** Supabase PostgreSQL (free tier: 500MB). Or Railway PostgreSQL ($5/month).
- **Total cost:** $0–$10/month for a small hotel.

---

## Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Guest UI | React + Tailwind + Vite | Static build, PWA manifest |
| API | FastAPI (Python) | REST, BackgroundTasks |
| Database | PostgreSQL (Supabase/Railway) | UUID PKs, TIMESTAMPTZ |
| Notifications | Twilio SMS or SSE | Configurable |
| Staff UI | React (same repo) | JWT auth, polling or SSE |
| Hosting (frontend) | Vercel | Free |
| Hosting (backend) | Railway / Render | $5/month |
| QR generation | Python `qrcode` | One-time script |

---

## Pros and Cons by Pipeline Stage

### QR Code Layer
| | |
|---|---|
| **Pro** | Static, no QR management service needed |
| **Pro** | URL is human-readable (`/room/204`) — easy to debug |
| **Con** | URL scheme change = reprint all codes |
| **Con** | No analytics on scan counts without a redirect layer |

### Guest Interface
| | |
|---|---|
| **Pro** | Fully branded, customisable UI |
| **Pro** | Works on any smartphone without app install |
| **Pro** | Offline shell thanks to service worker |
| **Con** | First load requires network; service worker only caches after first visit |
| **Con** | No push notifications to guest (web push requires opt-in) |

### Request Ingestion
| | |
|---|---|
| **Pro** | Simple REST — easy to test with curl |
| **Pro** | PostgreSQL is reliable, queryable, familiar |
| **Con** | No real-time DB push — needs polling or SSE bolted on |
| **Con** | Background task for notification can fail silently without a task queue |

### Staff Notification
| | |
|---|---|
| **Pro** | SSE is simple to implement, no WebSocket complexity |
| **Pro** | SMS fallback requires no software on staff device |
| **Con** | SSE connections drop and must reconnect (handle with EventSource auto-reconnect) |
| **Con** | SMS costs money per message; can add up if requests are frequent |

### Staff Dashboard
| | |
|---|---|
| **Pro** | Simple to build — just a React table with auto-refresh |
| **Pro** | Works on any device with a browser |
| **Con** | 10s polling delay feels stale in high-traffic periods |
| **Con** | No offline capability — staff must have connectivity |

### Infrastructure
| | |
|---|---|
| **Pro** | Cheapest cloud option; free tiers cover small hotels |
| **Pro** | Vercel auto-deploys on push — easy CI/CD |
| **Con** | Railway/Render free tiers sleep after inactivity — cold start delay |
| **Con** | Split across 2–3 services — slightly more to configure than monolith |

---

## Failure Modes

| Scenario | Impact | Mitigation |
|---|---|---|
| Backend goes down | Guests can't submit requests | Uptime monitor + SMS alert to admin; show "call reception" message on error screen |
| Database full | Requests fail to save | Set up storage alerts; archive old requests |
| SSE connection drops | Staff miss notifications | EventSource reconnects automatically; add audio alert on reconnect |
| Guest submits twice | Duplicate request in DB | Idempotency check on (room, type, status=pending) |
| Bad actor modifies room number in URL | Can submit fake requests for other rooms | Acceptable risk for low-stakes hotel context; optionally use signed tokens |

---

## Recommendation

This is the **best starting point** for most hotels. It has the lowest operational complexity, uses familiar web technologies, costs almost nothing, and produces a fully branded guest experience. If real-time staff updates become critical, you can upgrade the notification layer to WebSockets (Approach 3) without changing the rest of the stack.
