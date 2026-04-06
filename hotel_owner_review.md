# Hotel Owner Design Review
*Reviewed at mobile viewport — iPhone 14 (390×844 @2x). Date: 2026-04-06*

---

## Overall First Impression

It works. It is clean. It does not feel like a hotel.

Right now this looks like a generic internal tool built by a developer over a weekend. That is fine for a proof-of-concept, but I would not put this in front of a paying guest without fixing the things listed below. The bones are good — the layout is logical, the buttons are large enough, the colours are inoffensive. But nothing here says "you are a valued guest at our property." It says "please fill out this form."

---

## Page-by-Page Assessment

### 1. Guest Room Page (`/room/204`)

**What works:**
- Two-column grid is immediately scannable — guest does not need to read anything, just spot the icon
- Emoji icons actually help with language barriers (international guests, tired guests at midnight)
- The gold header with "Room 204" is clear and anchors the guest
- Confirmation/error banners exist — good, guests need feedback
- Footer fallback ("Call reception: 0") is a sensible safety net

**What does not work:**

**P1 — No hotel identity whatsoever.** The header says "ROOM SERVICES" and "Room 204." That is it. No hotel name, no logo, no tagline. If a guest screenshots this to complain, there is nothing identifying us. Every competitor's app has a logo above the fold. We have a generic header. Fix: add hotel name or logo to the header, even as a text wordmark.

**P1 — "Maintenance" is on the request menu.** I do not want guests thinking about broken things in the room. "Report a technical issue" as a description makes it worse — it implies we already know the room has issues. Rename to "Report an Issue" and move it to the bottom, or hide it behind a "More options" link. It should not sit alongside Water and Towels as a primary option.

**P1 — The 404 console error.** The script captured a 404 on page load. Something is missing — likely the `/icon-192.png` or `/icon-512.png` referenced in `manifest.json`. These do not exist in `/public`. Guests will not see this, but it is sloppy and will affect PWA install behaviour.

**P2 — Emoji icons feel cheap for a hotel.** A water droplet emoji next to "Bottled water delivered to your room" is fine for a hostel. For a 3-star+ property, replace emojis with proper SVG icons — a clean line-art style (Heroicons, Lucide). The difference in perceived quality is significant.

**P2 — Card descriptions are unnecessary clutter.** "Bottled water delivered to your room" — the guest already knows what water is. These descriptions add visual noise and make the tap targets feel smaller. Remove them or make them much smaller grey text. Let the icon and label do the work.

**P2 — "Call Me Back" is ambiguous.** Does this mean the phone in my room will ring? Does a person call me on my mobile? What is the expected wait time? Rename to "Reception Callback" and add a one-liner: "We'll call your room within 5 minutes."

**P3 — The Next.js "N" badge** is visible in the bottom-left corner (dev mode). It will not appear in production builds, but worth noting — ensure the production Vercel deploy is tested and this is gone.

**P3 — "ext. 0" is not personalised.** The footer says "Call reception: **0**." Some hotels use ext. 9, some use a full number. This should be configurable per hotel, not hardcoded.

---

### 2. Staff Login Page (`/staff/login`)

**What works:**
- Clean, minimal — staff do not need a fancy login screen
- Input fields are large enough for a tired night manager
- The gold Sign In button is clear CTA

**What does not work:**

**P1 — Massive dead space above and below the card.** On a phone, roughly 40% of the screen is empty grey above the card and 40% below. The card is floating in a void. This looks broken, not intentional. Either vertically centre the card properly (it appears centred but the card itself is too small for the viewport), or fill the screen — make the card full height, put the logo at top, form in the middle, footer at bottom.

**P2 — Hotel emoji (🏨) is doing all the branding work.** The emoji is the only identity element on this screen. A staff member logging in at 6am deserves to see the actual hotel name. Replace the emoji with a text wordmark or proper logo.

**P2 — No "Forgot password" link.** Staff will forget passwords. Right now there is no recovery path visible. Even a simple mailto link to the admin would be better than nothing.

**P3 — "Hotel Services Dashboard" subtitle is redundant.** They clicked a link to log in to the staff dashboard — they know what this is. Remove it or replace with the hotel name.

---

### 3. Staff Dashboard (`/staff`)

*Note: The headless browser could not authenticate, so this page was not screenshotted — it redirected to login. Assessment is based on code review.*

**From code review:**

**P1 — No sound in production without user interaction.** The audio alert uses `new Audio(...)` with a base64-encoded WAV that is essentially empty/silent (the data string is truncated/invalid). Staff will not hear new requests. This needs a real audio file (`/public/alert.mp3`) and a proper "Enable sound" toggle that satisfies browser autoplay policies.

**P1 — "All today" filter shows all-time requests, not just today.** `fetchActiveRequests` queries `status IN ('pending', 'in_progress')` — the "All today" tab would need a `created_at >= today` filter. Right now it returns everything open, ever.

**P2 — Claimed-by name is the email prefix.** If staff email is `maria.housekeeping@hotel.com`, the dashboard shows "Claimed by maria.housekeeping" — ugly. Either let staff set a display name on first login, or at minimum capitalise and strip the domain suffix properly.

**P2 — No visual priority for overdue requests.** The code flags requests as overdue after 10 minutes (red border), but there is no count badge, no sort-to-top, no audible distinction. A request from 45 minutes ago looks almost the same as one from 2 minutes ago.

**P3 — Realtime subscription has no reconnection feedback.** If the WebSocket drops (Wi-Fi blip on a staff tablet), the dashboard silently stops updating. Add a small "Reconnecting…" indicator when the channel is not subscribed.

---

## Three Things That Would Embarrass Me in Front of a Guest

1. **No hotel name visible anywhere on the guest page.** A guest screenshots it, posts it online — it says nothing about our property.
2. **"Maintenance" as a primary tap option.** First thing they see after Water and Towels. Implies the room is broken.
3. **The 404 error on load.** Even if invisible, any developer who looks at the network tab will judge us.

## Three Things That Would Frustrate My Housekeeping Staff

1. **Silent alerts.** The audio alert is broken. If a maid is in a corridor with a trolley, she will miss every notification.
2. **No way to tell requests apart at a glance.** Ten cards on screen, all the same size, no colour-coded urgency, no sort by room floor/zone.
3. **No display name — claimed by "maria.housekeeping".** Demeaning and unprofessional on an internal tool.

---

## Priority Fix List

| # | Priority | Fix |
|---|---|---|
| 1 | P1 | Add hotel name/logo to guest page header |
| 2 | P1 | Remove or demote "Maintenance" from primary grid |
| 3 | P1 | Add real alert sound + "Enable notifications" toggle on staff dashboard |
| 4 | P1 | Add PWA icons (192px, 512px) to `/public` to fix 404 |
| 5 | P2 | Replace emoji icons with SVG line-art icons on guest page |
| 6 | P2 | Remove card description text or drastically reduce it |
| 7 | P2 | Fix staff login layout — card is drowning in dead grey space |
| 8 | P2 | Add "Forgot password" link to staff login |
| 9 | P2 | Fix "All today" filter to actually filter by today's date |
| 10 | P2 | Staff display name — not email prefix |
| 11 | P3 | Make reception extension configurable, not hardcoded to "0" |
| 12 | P3 | Add reconnection indicator to staff dashboard WebSocket |
| 13 | P3 | Rename "Call Me Back" → "Reception Callback" with ETA note |

---

## Verdict

Ship it internally for testing. Do not show it to paying guests yet. The P1 items — branding, the maintenance button, broken audio alerts, and the 404 — should take less than a day to fix. After those, it is presentable for a soft launch.

The structure is right. The real-time works. The request flow is intuitive. The foundation is solid — it just needs the polish that separates a developer prototype from a guest-facing product.
