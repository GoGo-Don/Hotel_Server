# Approach 5 — Self-Hosted on Hotel LAN (No Internet Required)

## Overview

The entire system runs on a small server (Raspberry Pi 4 or mini PC) physically located in the hotel's network room. Guests connect to hotel Wi-Fi and access the system via a local URL. No internet dependency for the guest-facing system. All data stays on-premises. Staff devices on the same Wi-Fi receive updates in real-time.

**Best for:** Hotels with strict data privacy requirements, hotels in locations with unreliable internet, budget-conscious properties that can do initial hardware setup, or any hotel where the owner wants full control and zero ongoing cloud costs.

---

## Architecture

```
 Hotel Internal Network (Wi-Fi)
 ─────────────────────────────────────────────────────────
 
 [QR Code in Room 204]
        |
        | http://10.0.1.10/room/204   (or http://hotel.local/room/204)
        v
 +----------------------+
 | Guest PWA            |  ← Static files served by Nginx on LAN server
 | (mobile browser)     |
 +----------+-----------+
            |
            | POST /api/requests  (LAN HTTP, no internet)
            v
 +-------------------------------------------+
 |  Hotel LAN Server  (Raspberry Pi 4 / NUC) |
 |                                           |
 |  ┌─────────┐  ┌──────────┐  ┌──────────┐ |
 |  │ FastAPI │  │ SQLite / │  │  Nginx   │ |
 |  │ + SSE   │  │ Postgres │  │ (proxy + │ |
 |  │         │  │          │  │  static) │ |
 |  └────┬────┘  └──────────┘  └──────────┘ |
 |       │                                   |
 +───────┼───────────────────────────────────+
         |
         | SSE push (LAN)
         v
 +----------------------+
 | Staff Dashboard      |  ← Browser on reception tablet / staff phone
 | (on hotel Wi-Fi)     |     Receives SSE updates
 +----------------------+

 Optional: nightly rsync/rclone backup to cloud (S3 / Backblaze)
```

---

## Pipeline Walkthrough

### 1. QR Code Layer

**Option A — IP address (most compatible):**
```
http://10.0.1.10/room/204
```
- Works on 100% of Android and iOS devices
- Requires the server to have a static IP on the hotel network (set in router DHCP reservation)
- Downside: HTTP (not HTTPS) — browser may show "Not Secure" but will still load
- HTTPS on LAN requires a self-signed cert or a local CA, which causes browser warnings unless the cert is installed on guest devices (impractical)

**Option B — Local hostname (`.local` mDNS):**
```
http://hotel.local/room/204
```
- Works on iOS (Bonjour) and most Linux devices
- **Does NOT work reliably on Android** — Android removed mDNS support for `http://` in recent versions
- Not recommended as the primary URL

**Option C — Custom domain pointing to LAN IP:**
```
https://hotel-service.com/room/204
```
- Register a real domain, point its DNS A record to the LAN server's IP
- Obtain a real Let's Encrypt certificate for the domain
- Guests must be connected to hotel Wi-Fi for the domain to resolve to the LAN IP
- Outside the hotel, the domain resolves to nothing (or a "not available outside hotel" page)
- Gives you real HTTPS — best UX, no browser warnings
- Requires internet access during certificate renewal (certbot), but not for normal operation

**Recommendation: Option A as primary (IP), Option C if budget allows a domain.**

---

### 2. Guest Interface

Same React PWA as Approach 1 — served as static files from Nginx.

Key consideration: **caching**. Since guests may have visited the page before (on a previous stay), the service worker might serve a stale version. Set aggressive cache-control headers on the HTML entry point:
```nginx
location / {
    root /var/www/hotel-app;
    try_files $uri $uri/ /index.html;
    # Never cache the main HTML — always fetch fresh
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
# Cache static assets (JS/CSS/images) aggressively
location /assets/ {
    root /var/www/hotel-app;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

**Captive portal integration:**
Hotel Wi-Fi routers (Ubiquiti UniFi, MikroTik, pfSense) support captive portals. Configure the captive portal to redirect to `http://10.0.1.10/room/` when a guest first connects to the Wi-Fi. Guest scans QR → connects to Wi-Fi → captive portal auto-opens the room page. No manual navigation required.

---

### 3. Request Ingestion

Same FastAPI + REST as Approach 1, but running on the local server.

**Database choice on local server:**

| Database | Use case |
|---|---|
| SQLite | < 20 concurrent users, simplest ops, single file |
| PostgreSQL | > 20 rooms, better concurrent write handling, richer queries |

**SQLite with WAL mode** handles light concurrency well:
```python
# database.py
from sqlalchemy import create_engine
engine = create_engine("sqlite:///./hotel.db", connect_args={"check_same_thread": False})
# Enable WAL mode for concurrent reads
with engine.connect() as conn:
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
```

**Backup strategy:**
```bash
# /etc/cron.d/hotel-backup
# Run at 3am every day
0 3 * * * root rclone copy /opt/hotel/hotel.db s3:hotel-backups/$(date +%Y-%m-%d)/hotel.db
```

Or use SQLite's built-in backup:
```python
# Triggered nightly via APScheduler
import sqlite3, shutil
def backup_db():
    src = sqlite3.connect("hotel.db")
    dst = sqlite3.connect(f"backups/hotel_{date.today()}.db")
    src.backup(dst)
    dst.close(); src.close()
```

---

### 4. Staff Notification

Options on LAN are the same as other approaches, but simpler because everything is local:

**Option A — Server-Sent Events (SSE) — Recommended:**
- Staff dashboard holds a persistent SSE connection to the local server
- No external services, no internet, instant push
- Connection stays alive over hotel Wi-Fi
- See Approach 1 for SSE implementation

**Option B — Local audio alert terminal:**
- A Raspberry Pi Zero with a speaker at the reception desk
- Plays an alert sound via `aplay` when a new request arrives
- The hotel server POSTs to the Pi Zero's local HTTP endpoint
- Zero-dependency physical notification — works even if staff aren't looking at a screen

**Option C — SMS via local GSM modem:**
- A USB GSM modem (e.g., Huawei E3372) connected to the server
- `gammu` or `python-gammu` library sends SMS to staff phone
- Works entirely without internet
- Costs per SMS but uses local SIM card

---

### 5. Staff Dashboard

React frontend served from the same Nginx server. Accessed from:
- Reception desk PC/tablet: `http://10.0.1.10/staff`
- Staff phones on hotel Wi-Fi

Same features as Approach 1 — SSE for real-time updates, claim/done workflow, filter by room.

**Authentication on LAN:**
- Simple username/password with JWT
- Or IP-based access control: only allow `/staff` from the staff subnet
  ```nginx
  location /staff {
      allow 10.0.1.0/24;   # hotel staff subnet
      deny all;
  }
  ```

---

### 6. Infrastructure

**Hardware:**

| Option | Cost | Specs | Notes |
|---|---|---|---|
| Raspberry Pi 4 (4GB) | ~$55 | 4-core ARM, 4GB RAM, MicroSD | Sufficient for < 100 rooms |
| Intel NUC (used) | ~$100–150 | x86, 8GB RAM, SSD | More reliable, faster |
| Mini PC (Beelink, etc.) | ~$150–200 | x86, 8–16GB RAM, SSD | Best reliability |
| Old laptop | $0 | Whatever you have | Works, but fan noise in server room |

**RPi 4 setup:**
```bash
# Install OS (Raspberry Pi OS Lite, 64-bit)
# Set static IP in /etc/dhcpcd.conf
interface eth0
static ip_address=10.0.1.10/24
static routers=10.0.1.1

# Install dependencies
sudo apt update && sudo apt install -y python3-pip nginx postgresql

# Clone and run the app
git clone https://github.com/yourorg/hotel-server /opt/hotel
cd /opt/hotel
pip3 install -r requirements.txt

# Run as systemd service
sudo cp hotel.service /etc/systemd/system/
sudo systemctl enable hotel && sudo systemctl start hotel
```

**systemd service:**
```ini
[Unit]
Description=Hotel Request Server
After=network.target postgresql.service

[Service]
User=pi
WorkingDirectory=/opt/hotel
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name 10.0.1.10 hotel.local;

    # Serve React build
    root /opt/hotel/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    # Proxy SSE (long-lived connections)
    location /api/staff/stream {
        proxy_pass http://127.0.0.1:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

**Updates:**
```bash
# From any machine with SSH access on the LAN
ssh pi@10.0.1.10
cd /opt/hotel && git pull
sudo systemctl restart hotel
```

Or set up a cron job that pulls and restarts nightly at 4am.

---

## Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Guest UI | React + Tailwind + Vite | Static files via Nginx |
| API | FastAPI + Uvicorn | systemd service |
| Database | SQLite (small) or PostgreSQL | Local, nightly backup to S3 |
| Real-time | SSE | No Redis needed — single process |
| Staff UI | React (same repo) | Served from same Nginx |
| Hardware | Raspberry Pi 4 or NUC | ~$55–$200 one-time |
| Network | Hotel LAN (static IP) | Optional: real domain + Let's Encrypt |
| Backup | rclone → S3/Backblaze | Nightly, $0.006/GB/month |

---

## Pros and Cons by Pipeline Stage

### QR Code Layer
| | |
|---|---|
| **Pro** | No external service needed |
| **Con** | IP address URLs are ugly and hard to remember |
| **Con** | mDNS (`.local`) unreliable on Android |
| **Con** | HTTPS requires extra setup (real domain or self-signed cert) |

### Guest Interface
| | |
|---|---|
| **Pro** | Fully branded, works on any phone on hotel Wi-Fi |
| **Pro** | Captive portal can auto-open the page |
| **Pro** | No internet required — works during ISP outages |
| **Con** | Guest must connect to hotel Wi-Fi first |
| **Con** | Page won't load if guest uses mobile data instead of Wi-Fi |

### Request Ingestion
| | |
|---|---|
| **Pro** | Zero latency — everything on LAN |
| **Pro** | SQLite is simple to operate and back up |
| **Con** | SQLite has write concurrency limits at high traffic |
| **Con** | Server hardware failure = full outage until repaired |

### Staff Notification
| | |
|---|---|
| **Pro** | SSE over LAN is instant and requires no external services |
| **Pro** | GSM modem option works without internet |
| **Con** | Staff must be on hotel Wi-Fi to receive SSE updates |
| **Con** | No remote access for developer without VPN |

### Staff Dashboard
| | |
|---|---|
| **Pro** | All data local — fast, private |
| **Con** | Staff must use hotel Wi-Fi — can't check from home |
| **Con** | No remote monitoring/debugging without VPN |

### Infrastructure
| | |
|---|---|
| **Pro** | $55–$200 one-time cost, then ~$0/month |
| **Pro** | No internet required for operation |
| **Pro** | Data never leaves the building — GDPR-friendly |
| **Con** | Hardware maintenance burden |
| **Con** | Who restarts the server at 3am when it hangs? |
| **Con** | No automatic updates / security patches unless you set them up |
| **Con** | Power failure = system down (add UPS for ~$30) |

---

## Failure Modes

| Scenario | Impact | Mitigation |
|---|---|---|
| Server crashes | Full system down | systemd auto-restarts; watchdog script; UPS |
| Power outage | Full system down | UPS (~$30); generator |
| MicroSD corruption (RPi) | Data loss + boot failure | Use SSD via USB adapter; daily backups |
| Wi-Fi drops | Guests on mobile data can't reach local server | Print "connect to hotel Wi-Fi" instruction on QR card |
| IP changes | QR codes point to wrong server | DHCP reservation in router — server always gets same IP |
| Developer needs remote access | Can't SSH in from outside | Tailscale VPN (free for personal use) on the server |

**Tailscale for remote access:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Server now accessible at its Tailscale IP from anywhere
```

---

## Recommendation

**Best for privacy-first and cost-first scenarios.** The $55 Raspberry Pi pays for itself vs any cloud subscription within 2–3 months. The main risk is hardware reliability — mitigate with an SSD instead of MicroSD, a UPS, and Tailscale for remote access. 

For the truly paranoid: run two RPi 4s in an active-passive setup with a shared USB drive — if the primary crashes, swap the drive and power on the secondary. Total cost: ~$120.

**Avoid this approach if:** The hotel has no one technical on-site who can reboot a server or the hotel staff are not technical enough to troubleshoot basic network issues.
