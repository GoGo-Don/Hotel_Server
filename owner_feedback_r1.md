# Hotel Owner Brief — Round 1

*Screenshots reviewed: 14 images, mobile viewport. Date: 2026-04-06.*

---

## Non-negotiable (ship blocker)

1. **Add the hotel name to the guest page header — now.** The gold header currently reads "ROOM SERVICES" (small caps, top) and "Room 204" (large, below). Add "Grand Stay Hotel" in white text above "Room 204". The hierarchy should read: `Grand Stay Hotel` → `Room 204`. No guest should look at this screen and not know which property they are in. This is the single most embarrassing omission.

2. **Fix the success banner text — every single button triggers a broken string.** Every confirmation message is missing a space between the service name and the word "received". Screenshots show:
   - "Request for **Waterreceived!** We'll be right with you."
   - "Request for **Room Cleaningreceived!** We'll be right with you."
   - "Request for **Extra Pillowsreceived!** We'll be right with you."
   - "Request for **Call Me Backreceived!** We'll be right with you."
   - "Request for **Maintenancereceived!** We'll be right with you."

   The fix is a single space: `"Request for ${serviceName} received! We'll be right with you."`. Test every button after you fix it. Every one is broken.

3. **Move Maintenance off the primary grid.** Right now it sits in position 6, bottom-right, directly alongside Water and Towels. A guest's first impression should not include a wrench icon labelled "Report a technical issue" — it implies the room is already broken. Move it behind a small "Report a problem" text link in the footer, below the "Need immediate help?" line. It must not appear as a primary service card.

4. **Fix the audio alert — staff are missing requests.** The base64 WAV string in the code is truncated and produces silence. Staff will not hear a thing when a new request comes in. Do this:
   - Drop a real `alert.mp3` into `/public/`.
   - Load it with `new Audio('/alert.mp3')`.
   - Add a prominent "Enable sound alerts" toggle button on the staff dashboard — browsers block autoplay until the user interacts with the page. The toggle must be visible the moment a staff member logs in, not buried in settings.

5. **Add the PWA icons — the 404 on load is unacceptable.** `manifest.json` references `/icon-192.png` and `/icon-512.png`. Neither file exists in `/public`. Every page load throws a 404. Create proper icons (our gold/white colour scheme) and place them at exactly those paths. While you are there, confirm `manifest.json` has `"name": "Grand Stay Hotel"` and `"short_name": "Grand Stay"` — not a placeholder.

---

## Should fix this round

6. **Staff login card is floating in dead space.** On mobile, roughly 40% of the screen is empty grey above the card and another 40% below it. It looks like something failed to load. Make the login screen full-height: pin the hotel wordmark near the top, centre the form card in the remaining space, and put a small footer at the bottom. The grey void has to go.

7. **"Hotel Services Dashboard" subtitle on the login screen is redundant.** They navigated to the login page — they know what it is. Replace that subtitle with "Grand Stay Hotel" in the hotel's gold colour. That line is currently doing zero work and wasting the only branding opportunity on that screen.

8. **"Claimed by test" on the dashboard is embarrassing.** Screenshot `05_staff_after_claim.png` clearly shows a claimed card reading "Claimed by **test**" — that is the raw email prefix from the test account, but the same logic will show "maria.housekeeping" or "nightmanager2" in production. Strip the domain suffix, capitalise first letter, and display a proper name. Minimum viable fix: `email.split('@')[0].replace('.', ' ')` with each word capitalised. Proper fix: add a display name field to the staff profile.

9. **"All today" tab is not filtering by today.** Both dashboard screenshots (`04_staff_dashboard.png` and `04_staff_dashboard_all_today.png`) show identical request lists — same 6 requests, same timestamps. The "All today" tab is doing nothing different from "Active". Add a `created_at >= start of today` filter to the query when "All today" is selected. The tabs must show different data.

10. **Overdue requests need to be unmissable.** The Towels card in `04_staff_dashboard.png` has a red dashed border and a "44m ago" timestamp with a warning triangle — it has been waiting 44 minutes. But it sits at the bottom of the list, below fresher requests. Rules: (a) sort overdue cards to the top of the list, and (b) add a red badge to the tab itself showing the overdue count, e.g. "Active 1 overdue". A card sitting at the bottom for 44 minutes means a guest has been waiting 44 minutes without us noticing.

11. **Rename "Call Me Back" and clarify what it means.** The button says "Call Me Back" and the description says "Reception will call your room." The confirmation banner then reads "Request for Call Me Backreceived!" (aside from the missing-space bug). Rename this service to "Reception Callback" everywhere. Add the description: "We'll call your room within 5 minutes."

---

## Noted for later

12. **Emoji icons are hostel-grade, not hotel-grade.** The water droplet, pillow, broom, and phone emojis render differently across operating systems and look inconsistent. Replace them with a consistent SVG icon set — Lucide or Heroicons work well and are free. This is a quality-of-feel issue that guests will notice subconsciously even if they can not articulate it.

13. **Card descriptions add clutter without adding value.** "Bottled water delivered to your room" — the guest tapping the Water card already knows what water is. Either remove the descriptions entirely or shrink them to 10px grey text that does not compete with the service name. Let the icon and label do the work.

14. **"Call reception: 0" in the footer needs to be configurable.** Extension 0 is hardcoded. Different properties use different extensions. Make this a config value — even a single constant in a config file is better than a magic number buried in JSX.

15. **The Next.js "N" dev badge is visible in every screenshot.** Bottom-left corner, black circle with "N". This will not appear in production builds, but confirm it is gone before any guest-facing deploy. Test the Vercel production URL explicitly.

16. **No reconnection feedback on the staff dashboard.** If the WebSocket drops (staff tablets on hotel Wi-Fi are unreliable), the dashboard silently goes stale. Add a small "Reconnecting..." banner at the top of the dashboard when the realtime channel is not connected.

17. **"ROOM SERVICES" label above the room number is weak.** It is tiny, all-caps, and faint. Once the hotel name is added (item 1 above), consider whether this label is even necessary — "Grand Stay Hotel / Room 204" is self-explanatory without a "ROOM SERVICES" strapline.

---

## What I actually like

- **The two-column card grid works.** Scannable at a glance, big enough tap targets, no reading required. A tired guest at midnight can find what they need in under two seconds. Do not break this layout.
- **The gold colour scheme is solid.** The header gold, the gold "Claim" buttons, the gold "Sign in" button — it is cohesive and reads as intentional. It just needs the hotel name dropped in to tie it together.
- **The active card highlight (gold border on tap) is a nice touch.** Instant visual feedback that the tap registered. Small thing, does the right job.
- **The overdue warning system exists.** The red dashed border and warning triangle on the 44-minute Towels card shows someone thought about this. It just needs to be louder — see item 10.
- **The "already on its way" duplicate-request guard is smart.** Tapping Towels a second time shows "Your Towels request is already on its way" instead of creating a duplicate. Guests will absolutely tap things twice. This is good defensive UX.
- **"Done" turning the card green on completion is clear.** The status transition from gold "Claim" / green "Done" to a full green "Done" state is easy to read across a busy corridor. Staff can see the state at a glance.
- **The request count badge on the dashboard header ("Requests 6") is useful.** Tells staff immediately how many are open. Keep it.

---

*Fix items 1–5 before this goes anywhere near a guest. Items 6–11 should be in the same release — they are not big. The rest can wait.*
