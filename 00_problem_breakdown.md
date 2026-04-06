# Hotel QR Room Service System — Problem Breakdown

## Overview

This document breaks down the hotel room phone replacement system into discrete pipeline stages that are common to all implementation approaches. Each stage has its own concerns, tradeoffs, and failure modes. Understanding these independently makes it easier to compare the 5 approaches in the sibling documents.

---

## The Core Problem

A hotel guest needs to request services (water, towels, room cleaning, reception callback, etc.) without picking up a phone. The solution:

1. A QR code is printed and placed in every room (on the door, TV stand, or welcome card)
2. Guest scans it with their phone camera — no app install required
3. They see a simple UI and tap what they need
4. Staff are notified immediately and can track/resolve the request

---

## Pipeline Stages

### Stage 1 — QR Code Layer

**What it does:** Encodes a URL that identifies the room and points to the guest interface.

**Key decisions:**
- **Static vs Dynamic QR codes**
  - Static: URL is baked into the QR code at print time (e.g. `hotel.com/room/204`). Cheap, no infrastructure needed. If the URL ever changes, reprint all codes.
  - Dynamic: QR code points to a redirect service (e.g. `qr.hotel.com/abc123` → redirects to actual URL). Costs money (QR service subscription) but lets you change destinations without reprinting.
- **Room identification:** The URL must carry the room number. Options:
  - Path param: `/room/204`
  - Query param: `/?room=204`
  - Token: `/r/eyJyb29tIjoiMjA0In0` (encoded, tamper-evident)
- **Uniqueness:** Each room needs a unique code. A 100-room hotel needs 100 codes.
- **HTTPS requirement:** Modern phone cameras only auto-open HTTPS URLs. HTTP URLs require manual copy-paste. **HTTPS is mandatory.**
- **Tampering:** A bad actor could replace the QR sticker with one pointing to a phishing page. Mitigations: laminated codes, difficult-to-peel placement, token-based room verification.

**Tools for generation:** `qrcode` (Python), `qrcode.js` (JS), or any online generator for small volumes.

---

### Stage 2 — Guest Interface

**What it does:** The page/app the guest interacts with to submit a request.

**Key decisions:**
- **Web vs native app:** Native apps require installation — a non-starter for one-time hotel guests. Web (PWA or plain HTML) is the right default.
- **Messaging app (WhatsApp/Telegram):** Avoids building a UI entirely, but requires the guest to have the app installed.
- **Mobile-first design:** Guests are on phones. Large tap targets, minimal text input, fast load time.
- **Branding:** The interface should match the hotel's brand, not look like a generic form.
- **Language support:** International hotels need i18n. Even detecting browser locale and switching language goes a long way.
- **Accessibility:** Screen reader support, sufficient contrast, no CAPTCHA friction.
- **No authentication:** Guests should not need to create accounts. Room number (from URL) is the identity. Optionally ask for name/contact.
- **Request types:** Water, towels, room cleaning, extra pillows, reception callback, wake-up call, etc. These should be configurable per hotel.

---

### Stage 3 — Request Ingestion

**What it does:** Receives the guest's request and stores it durably.

**Key decisions:**
- **API endpoint:** A POST endpoint that accepts `{ room: "204", type: "towels", notes: "..." }` and writes to a database.
- **Database choice:**
  - SQLite: Zero-ops, fine for small hotels (< 50 rooms, low concurrency)
  - PostgreSQL: Production-grade, supports concurrent writes, easier to query for reporting
  - Firestore/Supabase: Managed, with built-in real-time subscriptions
- **Request schema:** At minimum: `id`, `room_number`, `request_type`, `status` (pending/in-progress/done), `created_at`, `updated_at`, optionally `guest_name`, `notes`, `assigned_staff`
- **Idempotency:** Prevent duplicate submissions if the guest taps twice. Use a short debounce on the client + unique constraint on (room, type, status=pending) on the server.
- **Rate limiting:** A room shouldn't be able to spam 100 requests per minute.

---

### Stage 4 — Staff Notification

**What it does:** Alerts the right staff member as soon as a request comes in.

**Key decisions:**
- **Notification channel:**
  - Email: Simple but slow. Unacceptable for "please bring water now."
  - SMS: Reliable delivery, no app needed. Costs money per message (Twilio ~$0.0075/SMS).
  - Push notification (Web Push / FCM): Fast, free, but requires staff browser/app to grant permission and stay open.
  - Messaging app (WhatsApp/Telegram group): Staff already live there. Easy setup.
  - In-app dashboard with audio alert: Staff keep a browser tab open; new requests play a sound + highlight.
  - Webhook to existing hotel PMS (Property Management System): Enterprise integration.
- **Routing:** Who gets notified? Options:
  - Broadcast to all staff (simple, noisy)
  - Route by request type: cleaning → housekeeping, callback → reception
  - Route by floor/zone: room 204 → floor 2 staff
- **Acknowledgement:** Staff should be able to "claim" a request so others know it's handled.

---

### Stage 5 — Staff Dashboard

**What it does:** A screen (tablet at reception, phone in pocket) where staff see all active requests and manage them.

**Key decisions:**
- **Authentication:** Staff must log in. Simple username/password is fine. JWT or session-based.
- **Real-time updates:** New requests should appear without refreshing. Options: WebSockets, SSE, Supabase Realtime, polling (every 10s — acceptable for low-traffic hotels).
- **Request lifecycle:** pending → in_progress (staff claimed it) → done. Visual indication of status.
- **Filtering/sorting:** By room, by request type, by time. Overdue requests should be flagged.
- **Mobile-friendly:** Reception staff use tablets; housekeeping staff use phones.
- **Audit log:** Every status change logged with timestamp and staff ID. Useful for dispute resolution and performance tracking.

---

### Stage 6 — Infrastructure & Operations

**What it does:** Keeps everything running reliably.

**Key decisions:**
- **Hosting:** Cloud VPS, serverless (Vercel/Lambda), BaaS (Supabase/Firebase), or on-premises LAN server.
- **Uptime:** If the system goes down, guests can't make requests. What's the fallback? (Phone at reception? Physical button?)
- **Backups:** Database should be backed up at least daily.
- **Monitoring:** Basic uptime monitoring (UptimeRobot is free). Alerting if the server goes down.
- **Updates:** How do you push changes? CI/CD pipeline or manual SSH?
- **Cost:** Ranges from ~$0/month (Supabase free tier) to ~$20/month (VPS) to ~$200 upfront (Raspberry Pi).
- **GDPR / Privacy:** Guest request data has a name attached in some implementations. Retention policy needed. Local-only deployments sidestep most cloud compliance concerns.

---

## Cross-Cutting Concerns

| Concern | Notes |
|---|---|
| HTTPS | Mandatory for QR code auto-open on iOS/Android |
| Mobile performance | Page must load in < 2s on 3G |
| Offline tolerance | What happens if Wi-Fi drops while submitting? Show a retry state. |
| Multi-language | Detect `Accept-Language` header; offer language toggle |
| QR code durability | Laminate codes; consider tamper-evident placement |
| Data retention | Delete requests older than 30 days; configurable |
| Staff turnover | Easy onboarding/offboarding of staff accounts |
| Hotel PMS integration | Future: write requests into Opera, Protel, etc. |

---

## Decision Matrix

Use this to quickly filter approaches by hotel profile:

| Hotel Size | Budget | Tech Team | Recommended Approach |
|---|---|---|---|
| Small (< 30 rooms) | Low | None | Approach 4 (Supabase BaaS) |
| Small-medium, privacy-conscious | Low | Some | Approach 5 (LAN) |
| Medium (30–150 rooms) | Medium | Developer | Approach 1 (PWA) or 4 (BaaS) |
| Large (150+ rooms) | High | Dev team | Approach 3 (Full-stack real-time) |
| Any, WhatsApp-heavy market | Low | Minimal | Approach 2 (Bot) |

---

## Sibling Documents

- [01 — Static QR + PWA](./01_approach_pwa.md)
- [02 — WhatsApp / Telegram Bot](./02_approach_messaging_bot.md)
- [03 — Full-Stack Real-Time (WebSockets)](./03_approach_realtime_stack.md)
- [04 — Serverless BaaS (Supabase / Firebase)](./04_approach_baas.md)
- [05 — Self-Hosted on Hotel LAN](./05_approach_local_network.md)
