# Approach 3 — Full-Stack Real-Time (WebSockets + Redis Pub/Sub)

## Overview

The most powerful and flexible approach. A full custom stack with WebSocket-based real-time updates in both directions: guests see live status on their request, staff see new requests appear instantly without any refresh. Uses Redis as a pub/sub broker to decouple the API from the WebSocket push layer.

**Best for:** Large hotels (150+ rooms), hotels with a dedicated tech team, or any hotel that wants a production-grade system with full control, analytics, multi-property management, and PMS integration.

---

## Architecture

```
 [QR Code in Room 204]
        |
        | HTTPS: hotel.com/room/204
        v
 +----------------------+
 | Guest PWA            |  ← React, mobile-first
 | WebSocket client     |     Subscribes to ws://api/ws/room/204
 +----------+-----------+
            |
            | POST /api/requests  (submit)
            | WS  /ws/room/204    (listen for status updates)
            v
 +----------------------+
 | FastAPI App Server   |  ← Multiple workers (Gunicorn + Uvicorn)
 | REST + WebSocket     |     Validates, writes to DB, publishes to Redis
 +----------+-----------+
            |
    ┌───────┴────────┐
    ▼                ▼
+----------+   +----------+
| PostgreSQL|  | Redis     |  ← Pub/Sub channels per room + "staff:all"
| (requests,|  | (events)  |
|  audit)   |  +----+------+
+----------+       |
                   | subscribe
                   v
 +----------------------+
 | Staff WebSocket      |  ← Pushes to all connected staff dashboards
 | broadcast layer      |     (part of same FastAPI app)
 +----------+-----------+
            |
            | WS /ws/staff  (listen for new requests + status changes)
            v
 +----------------------+
 | Staff Dashboard      |  ← React, separate auth'd route
 | WebSocket client     |     Real-time request feed with audio alert
 +----------------------+
```

---

## Pipeline Walkthrough

### 1. QR Code Layer

Same as Approach 1: static URL per room, printed once, encoded in QR.

```
https://hotel.com/room/204
```

Optionally add a signed token for room verification:
```python
import jwt, time
token = jwt.encode({"room": "204", "exp": time.time() + 86400*365}, SECRET_KEY)
# URL: https://hotel.com/r?t=eyJ...
```
Token expires in 1 year; staff reprint annually or when rooms are renumbered.

---

### 2. Guest Interface

React PWA with two active connections:
- **REST POST** to submit a request
- **WebSocket** to receive live status updates on that request

```tsx
// GuestRoom.tsx
const ws = useRef<WebSocket>(null);

useEffect(() => {
  ws.current = new WebSocket(`wss://api.hotel.com/ws/room/${room}`);
  ws.current.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // update.type === "request_claimed" | "request_done"
    setRequestStatus(update);
  };
  return () => ws.current?.close();
}, [room]);

const submitRequest = async (type: string) => {
  const res = await fetch("/api/requests", {
    method: "POST",
    body: JSON.stringify({ room, type }),
    headers: { "Content-Type": "application/json" }
  });
  const { id } = await res.json();
  setActiveRequestId(id);
  setStatus("pending");
};
```

Guest sees: "Your request is pending → Staff is on the way → Done" — live, without refreshing.

---

### 3. Request Ingestion + WebSocket Backend

**FastAPI with WebSocket support:**

```python
# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
import asyncio, json

app = FastAPI()
redis_client = aioredis.from_url("redis://localhost")

# --- Connection manager for staff WebSocket clients ---
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)

manager = ConnectionManager()

# --- REST endpoint: submit a request ---
@app.post("/api/requests")
async def create_request(body: RequestBody, db=Depends(get_db)):
    req = Request(**body.dict(), status="pending")
    db.add(req); db.commit(); db.refresh(req)
    
    event = {"event": "new_request", "data": req.to_dict()}
    await redis_client.publish("staff:all", json.dumps(event))
    return req.to_dict()

# --- WebSocket: staff dashboard ---
@app.websocket("/ws/staff")
async def staff_ws(websocket: WebSocket, token: str):
    verify_staff_token(token)  # raises if invalid
    await manager.connect(websocket)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("staff:all")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await pubsub.unsubscribe("staff:all")

# --- WebSocket: guest room status ---
@app.websocket("/ws/room/{room}")
async def room_ws(websocket: WebSocket, room: str):
    await websocket.accept()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"room:{room}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        await pubsub.unsubscribe(f"room:{room}")
```

**Publishing status updates back to guest:**
```python
# When staff claims a request
@app.patch("/api/requests/{req_id}/claim")
async def claim_request(req_id: str, staff=Depends(get_current_staff), db=Depends(get_db)):
    req = db.query(Request).get(req_id)
    req.status = "in_progress"
    req.assigned_to = staff.name
    db.commit()
    
    event = {"event": "request_claimed", "by": staff.name, "eta": "15 mins"}
    await redis_client.publish(f"room:{req.room}", json.dumps(event))
    return req.to_dict()
```

---

### 4. Staff Notification

- Staff dashboard WebSocket receives every new request in real-time
- Audio alert: `new Audio('/alert.mp3').play()` on new message
- Push notification: staff can opt into Web Push; server sends via `pywebpush` when a new request arrives
- SMS fallback: if no staff WebSocket is connected, fall back to Twilio SMS

**Routing by department (via Redis channels):**
```python
ROUTING = {
    "towels": "staff:housekeeping",
    "callback": "staff:reception",
    "maintenance": "staff:maintenance",
}
channel = ROUTING.get(request_type, "staff:all")
await redis_client.publish(channel, json.dumps(event))
```

Staff dashboard subscribes only to their department's channel.

---

### 5. Staff Dashboard

React dashboard with persistent WebSocket connection:

```tsx
// StaffDashboard.tsx
useEffect(() => {
  const ws = new WebSocket(`wss://api.hotel.com/ws/staff?token=${authToken}`);
  ws.onmessage = (e) => {
    const { event, data } = JSON.parse(e.data);
    if (event === "new_request") {
      setRequests(prev => [data, ...prev]);
      playAlert();
    }
    if (event === "request_updated") {
      setRequests(prev => prev.map(r => r.id === data.id ? data : r));
    }
  };
  ws.onclose = () => setTimeout(() => reconnect(), 3000); // auto-reconnect
}, []);
```

Features:
- Live feed of all pending/in-progress requests
- Claim button (optimistic update: show as claimed immediately, confirm via WS event)
- Filter by: room, floor, department, status, time
- SLA timer: each request shows how long it's been pending; turns red after 10 minutes
- Historical view: all requests for the day, with completion times

---

### 6. Infrastructure

**Deployment (Docker Compose for single-server):**
```yaml
version: "3.9"
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://user:pass@db/hotel
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]
  
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
  
  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
  
  redis:
    image: redis:7-alpine
  
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf", "./certs:/etc/nginx/certs"]

volumes:
  pgdata:
```

**Horizontal scaling (multiple API workers):**
- Redis pub/sub acts as the message bus — any worker can receive a request and publish to Redis; any other worker serving a WebSocket connection will receive it
- Use Gunicorn with Uvicorn workers: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
- WebSocket connections are sticky — not an issue with Redis decoupling

**Hosting options:**
- Single VPS: Hetzner CX21 (€3.79/month), DigitalOcean Droplet ($6/month)
- Managed: Railway ($5–20/month), Fly.io
- Total: **$5–$25/month**

---

## Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Guest UI | React + Tailwind + Vite | PWA, WebSocket client |
| Staff UI | React (same repo, different route) | WebSocket client, JWT auth |
| API | FastAPI + Uvicorn | Async WebSocket + REST |
| Database | PostgreSQL | Full audit trail |
| Pub/Sub | Redis 7 | Decouples API from WS push |
| Hosting | VPS (Hetzner/DO) + Docker | Always-on, no cold starts |
| Reverse proxy | Nginx | SSL termination, WS proxy |
| Notifications | Web Push (pywebpush) + Twilio fallback | |

---

## Pros and Cons by Pipeline Stage

### QR Code Layer
| | |
|---|---|
| **Pro** | Same static QR simplicity as Approach 1 |
| **Pro** | Optionally add signed tokens for room verification |
| **Con** | Same reprint risk if URL scheme changes |

### Guest Interface
| | |
|---|---|
| **Pro** | Guest sees live status updates — "Staff is on the way" |
| **Pro** | Full custom UI — fully branded |
| **Pro** | WebSocket reconnects automatically |
| **Con** | WebSocket adds complexity over plain REST |
| **Con** | Some corporate/hotel Wi-Fi networks block WebSocket (use `wss://` + port 443 to avoid) |

### Request Ingestion
| | |
|---|---|
| **Pro** | REST + DB write is still the core — reliable and testable |
| **Pro** | Redis decoupling means ingestion and push are independent |
| **Con** | Redis is an additional service to operate |
| **Con** | Redis pub/sub is fire-and-forget — if no subscriber is listening, event is lost (mitigate: also write to DB, poll as fallback) |

### Staff Notification
| | |
|---|---|
| **Pro** | True real-time — sub-second latency from submission to staff screen |
| **Pro** | Department routing via Redis channels |
| **Pro** | Works even if staff have multiple tabs open (each gets the event) |
| **Con** | Requires staff to keep a browser tab open (or use Web Push) |
| **Con** | Web Push setup is non-trivial (VAPID keys, service worker) |

### Staff Dashboard
| | |
|---|---|
| **Pro** | Richest UX of all approaches — live SLA timers, claim workflow, filters |
| **Pro** | Can support multiple properties from one dashboard |
| **Con** | Most complex frontend to build |
| **Con** | WebSocket reconnect and optimistic UI updates add non-trivial state management |

### Infrastructure
| | |
|---|---|
| **Pro** | Full control — no vendor lock-in |
| **Pro** | Cheap VPS is cheaper than BaaS at scale |
| **Pro** | Horizontal scaling is straightforward with Redis |
| **Con** | You operate Postgres + Redis + FastAPI + Nginx — 4 services |
| **Con** | No serverless — need always-on VPS |
| **Con** | SSL cert management (Let's Encrypt + certbot, but still needs renewing) |

---

## Failure Modes

| Scenario | Impact | Mitigation |
|---|---|---|
| Redis goes down | Real-time push fails; REST still works | Redis Sentinel or managed Redis (Redis Cloud free tier); fall back to DB polling |
| WebSocket connection dropped | Guest/staff miss updates | Auto-reconnect with exponential backoff; show reconnecting indicator |
| VPS goes down | Full outage | Uptime monitoring + alerting; consider Fly.io auto-restart |
| DB disk full | Writes fail | Storage alerts; auto-archive requests older than 90 days |
| Staff tab closed | Misses push; no Web Push set up | Periodic loud audio alert on reconnect; Twilio SMS fallback for unacknowledged requests |
| Corporate Wi-Fi blocks WS | Guest can't get updates | Serve WebSocket on port 443 (same as HTTPS); use TLS WSS |

---

## Recommendation

This is the **most powerful approach** but also the most work. Choose it if:
- You have a developer who will maintain it
- Real-time status feedback to guests is a key product differentiator
- You want to scale to multiple properties
- You need full audit trails, SLA tracking, and analytics

Start with Approach 1 (PWA) and upgrade to this when the hotel grows or when real-time becomes a requirement you can no longer ignore.
