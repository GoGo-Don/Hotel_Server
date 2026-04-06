# Approach 2 — QR → Messaging Bot (WhatsApp / Telegram)

## Overview

Instead of building a custom web UI, this approach routes guests into a conversation with a bot on an existing messaging platform. The QR code opens WhatsApp or Telegram with a pre-filled message. The bot presents a menu, records the request, and notifies staff via the same messaging platform.

**Best for:** Hotels in markets where WhatsApp or Telegram is dominant (Middle East, South Asia, Southeast Asia, Latin America, Eastern Europe), or hotels with zero developer resources that want staff notification built-in for free.

---

## Architecture

```
 [QR Code in Room 204]
        |
        | WhatsApp deep link:  https://wa.me/+1XXXXXXXXXX?text=Room+204
        | OR Telegram deep link: https://t.me/HotelBot?start=room204
        v
 +------------------+
 | Messaging App    |  ← WhatsApp or Telegram on guest's phone
 | (guest's phone)  |     Pre-filled message sent automatically
 +--------+---------+
          |
          | webhook (HTTPS POST with message body)
          v
 +------------------+
 | Bot Server       |  ← FastAPI / Node webhook receiver
 |                  |     Parses message, drives conversation state machine
 +--------+---------+
          |
          | write request
          v
 +------------------+       +---------------------+
 |  PostgreSQL /    |       |  Staff Channel      |
 |  SQLite          |──────▶|  (Telegram group or |
 |                  |       |   WhatsApp group)   |
 +------------------+       +---------------------+
                                      |
                            Staff replies to acknowledge
                            Bot relays reply to guest
```

---

## Pipeline Walkthrough

### 1. QR Code Layer

**WhatsApp:**
```
https://wa.me/+1XXXXXXXXXX?text=Room+204+request
```
- Opens WhatsApp with a pre-filled message to the hotel's business number
- Guest just hits "Send" — no typing required
- Works on iOS and Android if WhatsApp is installed

**Telegram:**
```
https://t.me/HotelBot?start=room204
```
- Opens Telegram and starts a conversation with the bot, passing `room204` as a payload
- Bot receives `/start room204` and knows which room the guest is in

**Key difference:** Telegram's `start` parameter is cleaner — the bot gets the room number as structured data. WhatsApp requires parsing free text from the pre-filled message.

---

### 2. Guest Interface (Messaging App)

**Telegram bot conversation flow:**
```
Bot:  Welcome to Grand Hotel! You're in Room 204.
      What do you need? Reply with a number:
      1 - Water
      2 - Towels
      3 - Room Cleaning
      4 - Extra Pillows
      5 - Reception Callback
      6 - Something else (type your request)

Guest: 2

Bot:  Got it! We'll bring fresh towels to Room 204 shortly.
      You'll hear back when they're on the way.
```

**Telegram inline keyboards (button rows):**
Instead of typing numbers, the bot can send interactive buttons:
```python
keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton("Towels", callback_data="towels"),
     InlineKeyboardButton("Water", callback_data="water")],
    [InlineKeyboardButton("Room Cleaning", callback_data="cleaning"),
     InlineKeyboardButton("Reception Callback", callback_data="callback")],
])
await bot.send_message(chat_id, "What do you need?", reply_markup=keyboard)
```

Buttons appear as tappable chips — no typing at all.

**WhatsApp (via Twilio):**
- WhatsApp Business API supports "List Messages" and "Reply Buttons" (max 3 buttons, or a scrollable list of options)
- Similar experience to Telegram but with Meta's API overhead

---

### 3. Request Ingestion (Bot Server)

**Telegram (python-telegram-bot):**
```python
from telegram.ext import Application, CommandHandler, CallbackQueryHandler

async def start(update, context):
    room = context.args[0].replace("room", "") if context.args else "unknown"
    context.user_data["room"] = room
    keyboard = build_request_keyboard()
    await update.message.reply_text(
        f"Welcome! You're in Room {room}. What do you need?",
        reply_markup=keyboard
    )

async def handle_callback(update, context):
    query = update.callback_query
    await query.answer()
    room = context.user_data.get("room", "unknown")
    request_type = query.data
    
    # Save to DB
    save_request(room=room, type=request_type, chat_id=query.message.chat_id)
    
    # Notify staff channel
    await context.bot.send_message(
        chat_id=STAFF_CHANNEL_ID,
        text=f"🔔 Room {room} requests: {request_type}"
    )
    
    await query.edit_message_text(
        f"Done! We'll bring {request_type} to Room {room} soon."
    )
```

**WhatsApp (Twilio):**
```python
from twilio.rest import Client

@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    form = await request.form()
    body = form.get("Body", "").strip()
    from_number = form.get("From")
    
    # Parse room from pre-filled message or session
    room = parse_room_from_message(body, from_number)
    
    # Send menu using Twilio Content API (list message)
    client.messages.create(
        from_="whatsapp:+1XXXXXXXXXX",
        to=from_number,
        content_sid="HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  # pre-approved template
    )
```

**Database schema:** Same as other approaches — `requests` table with room, type, status, created_at.

---

### 4. Staff Notification

This is where messaging bots shine — notification is **built into the platform**.

**Telegram:**
- Create a private Telegram group for staff
- Get the group's `chat_id`
- Bot posts a formatted message when a request comes in:
  ```
  🔔 New Request
  Room: 204
  Type: Towels
  Time: 14:32
  [Claim] [Done]
  ```
- Inline buttons let staff claim/resolve directly in Telegram
- Staff get push notifications from Telegram (which they already use)

**WhatsApp:**
- WhatsApp Business API allows sending to groups but approval is complex
- More practical: send individual WhatsApp messages to a duty manager's number
- Or: use a Twilio-to-Slack webhook bridge (request → Twilio → Slack)

**Routing by department:**
```python
ROUTING = {
    "towels": HOUSEKEEPING_CHAT_ID,
    "cleaning": HOUSEKEEPING_CHAT_ID,
    "water": HOUSEKEEPING_CHAT_ID,
    "callback": RECEPTION_CHAT_ID,
    "maintenance": MAINTENANCE_CHAT_ID,
}

staff_channel = ROUTING.get(request_type, GENERAL_STAFF_CHAT_ID)
await bot.send_message(chat_id=staff_channel, text=notification_text)
```

---

### 5. Staff Dashboard

**Telegram-native:**
- Staff view and act on requests directly inside Telegram
- No separate dashboard to build or maintain
- Downside: no aggregate view (can't see "we have 5 pending towel requests")

**Optional minimal web dashboard:**
- A simple read-only page showing open requests, pulled from the DB
- Staff use Telegram for real-time alerts, web dashboard for overview
- No real-time needed here — polling every 30s is fine

---

### 6. Infrastructure

**Telegram:**
- Bot API is free, no approval needed
- Webhook server: any HTTPS endpoint (FastAPI on Railway, ~$5/month, or free on Render)
- No cost per message
- Total: **$0–$5/month**

**WhatsApp (Twilio):**
- WhatsApp Business Account approval: 1–5 business days, requires Facebook Business Manager
- Twilio WhatsApp pricing: ~$0.005–$0.05 per conversation per day (session-based)
- Message templates must be pre-approved by Meta for outbound messages
- Total: **$20–$100/month** depending on volume

---

## Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Guest UI | Telegram / WhatsApp native | No UI to build |
| Bot framework | python-telegram-bot OR Twilio | Free vs $$/month |
| Webhook server | FastAPI | Receives platform webhooks |
| Database | SQLite or PostgreSQL | Request log |
| Staff notification | Telegram group / WhatsApp | Platform-native |
| Hosting | Railway / Render | $0–$5/month |
| QR generation | URL-based (no special tooling) | Deep link in QR |

---

## Pros and Cons by Pipeline Stage

### QR Code Layer
| | |
|---|---|
| **Pro** | Deep link format is simple — just a URL with parameters |
| **Pro** | No backend involved in QR scan — just opens the app |
| **Con** | Guest must have the specific app installed |
| **Con** | WhatsApp deep links open to a "send message" screen — requires guest to tap Send |

### Guest Interface
| | |
|---|---|
| **Pro** | Zero UI to build — messaging app handles everything |
| **Pro** | Familiar, trusted UX for many users |
| **Pro** | Two-way communication with guest is natural |
| **Con** | Not branded — looks like any other WhatsApp/Telegram chat |
| **Con** | Button layout is limited by platform constraints |
| **Con** | Conversation state must be maintained server-side (what room is this user in?) |
| **Con** | Guest must have WhatsApp or Telegram installed — not universal |

### Request Ingestion
| | |
|---|---|
| **Pro** | Platform handles delivery, retry, and session management |
| **Con** | Webhook parsing is messy — text-based intents require careful handling |
| **Con** | WhatsApp requires message templates pre-approved by Meta |
| **Con** | Conversation state (room number per chat_id) must be stored in a session/DB |

### Staff Notification
| | |
|---|---|
| **Pro** | Built-in push notifications via the messaging platform |
| **Pro** | Staff already have the app — zero onboarding |
| **Pro** | Two-way: staff can reply and guest sees it |
| **Con** | No aggregate dashboard — hard to see all open requests at once |
| **Con** | Staff noise if many requests come in — no claim/de-duplicate mechanism without building it |

### Staff Dashboard
| | |
|---|---|
| **Pro** | Telegram handles it — nothing to build |
| **Con** | No aggregate view, filtering, or SLA tracking without additional tooling |
| **Con** | Staff must use Telegram — can't use hotel's existing systems |

### Infrastructure
| | |
|---|---|
| **Pro** | Telegram approach costs almost nothing |
| **Pro** | No frontend hosting needed |
| **Con** | WhatsApp API is expensive and requires Meta approval bureaucracy |
| **Con** | Platform dependency — if Telegram is blocked in a country, everything breaks |
| **Con** | API terms of service can change, breaking the integration |

---

## Failure Modes

| Scenario | Impact | Mitigation |
|---|---|---|
| Guest doesn't have WhatsApp/Telegram | Can't use the system | Print fallback instructions ("or call reception at ext. 0") on QR card |
| Telegram/WhatsApp API outage | All requests fail | Fallback QR pointing to PWA (Approach 1) |
| Bot server goes down | Webhooks fail silently | Platform queues webhooks for retry; uptime monitoring on bot server |
| Staff leave the notification group | Requests go unseen | Periodic audit of staff group membership |
| WhatsApp session expires | Bot can't message guest proactively | Use within 24h session window; always use template messages for outbound |

---

## Recommendation

**Use Telegram if:** Your hotel's target market uses Telegram heavily and you want the fastest possible time-to-deploy with zero UI work and near-zero cost.

**Use WhatsApp if:** Your guests primarily use WhatsApp (most of the world outside China/Russia) AND you have the budget for Twilio and the patience for Meta's approval process.

**Avoid this approach if:** You want a branded experience, need analytics, or your guest demographic is older and less likely to have either app installed.
