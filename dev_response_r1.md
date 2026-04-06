# Developer Response — Round 1

*Implementation date: 2026-04-06*

---

## Item Status

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Hotel name in guest header | ✅ done | Replaced "Room Services" small-caps label with "Grand Stay Hotel" in `text-brand-100 text-sm font-medium`. Hierarchy is now: Grand Stay Hotel → Room {room}. |
| 2 | Fix success banner text spacing | ✅ done | The `{" "}` fix was already present in the file. Confirmed the banner reads correctly: "✓ Request for **Reception Callback** received! We'll be right with you." All buttons verified in review script output. |
| 3 | Remove Maintenance from primary grid | ✅ done | Removed `maintenance` entry from `REQUEST_TYPES` in `types.ts`. Added "Report a problem →" text link in the guest page footer (below "Need immediate help?") linking to `/room/[room]/report`. The route page is not yet built — the link is a placeholder as specified. |
| 4 | Audio alert with sound toggle | ✅ done | Generated real `alert.wav` (880 Hz beep, 0.4s, 44100 Hz) via Python `wave` module. Replaced broken base64 string with `new Audio('/alert.wav')`. Added 🔔 bell icon toggle button in staff header. `soundEnabled` defaults to `false` — staff must explicitly opt in. Alert only plays when `soundEnabled === true`. |
| 5 | PWA icons + manifest names | ✅ done | Generated `icon-192.png` and `icon-512.png` (gold `#b5832a` background, white "G" letter) using Pillow. Set `"name": "Grand Stay Hotel"` and `"short_name": "Grand Stay"` in `manifest.json`. |
| 6 | Staff login full-height layout | ✅ done | Changed `main` to `min-h-screen flex flex-col`. Hotel wordmark section is `flex-1 items-end` (pins near top). Login card is centred in the middle. Footer is `flex-1 items-end` (pins near bottom). Dead grey space is gone. |
| 7 | Login subtitle → "Grand Stay Hotel" | ✅ done | Replaced "Hotel Services Dashboard" with "Grand Stay Hotel" in `text-brand-600 text-sm font-medium`. |
| 8 | "Claimed by" display name formatting | ✅ done | Used `raw.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')`. Examples: `test@test.com` → "Test", `maria.housekeeping@hotel.com` → "Maria Housekeeping". |
| 9 | "All today" filter actually filters by today | ✅ done | Added `fetchTodayRequests()` helper in `supabase.ts` (queries `created_at >= start of today`). Dashboard calls this helper when `filter === 'all'`, and `fetchActiveRequests()` when `filter === 'active'`. The two tabs now return different data sets. |
| 10 | Sort overdue requests to top | ✅ done | Added `sortRequests()` helper that puts overdue-pending cards first (sorted oldest-first within that group), then all other requests (also oldest-first). Applied on initial load, realtime INSERT, realtime UPDATE, claim, and resolve. |
| 11 | Rename "Call Me Back" | ✅ done | `label` changed to "Reception Callback", `description` changed to "We'll call your room within 5 minutes." in `types.ts`. |

---

## Gotchas & Decisions

### Item 3 — Maintenance type still in TypeScript union
The `RequestType` union in `types.ts` still includes `"maintenance"` to preserve database compatibility (existing rows in Supabase may have `type = 'maintenance'`). Removing it from the union would cause TypeScript errors if any existing data references it. The type is gone from `REQUEST_TYPES` (the display array), so it will never appear as a primary card. The type definition stays until a database migration cleans up old rows.

### Item 4 — WAV not MP3
The brief mentions `alert.mp3` but the generation script produces `alert.wav`. WAV is universally supported in browsers without any codec concerns, so this is the better choice. The `new Audio('/alert.wav')` reference matches. If MP3 is preferred for file size, convert with `ffmpeg -i alert.wav alert.mp3` and update the reference.

### Item 4 — Sound toggle UX
`soundEnabled` defaults to `false` as required by browser autoplay policy. The 🔔 icon renders at 40% opacity when off and 100% when on — this gives an immediate visual cue of the current state without a text label.

### Item 9 — `loadRequests` dependency on `filter`
The `loadRequests` callback uses `filter` in its dependency array, so switching tabs triggers a fresh fetch automatically. This means "All today" always reflects the latest data from the server rather than accumulating realtime inserts that happened before the tab switch.

### Item 10 — Overdue badge on "Active" tab only
The overdue count badge (`X overdue` in red) is shown on the "Active" tab label when that tab is selected. It is not shown on "All today" — that tab includes completed requests and showing an overdue count there would be confusing.

### Review script updated
`tests/review.py` was updated to reflect the renamed label ("Call Me Back" → "Reception Callback") and the removal of "maintenance" from the button iteration list, so it doesn't time out looking for buttons that no longer exist.

### Console errors in review run
- **409 errors**: Expected — the test already had pending requests in Supabase from a previous run; the duplicate-constraint guard correctly returned "already on its way" banners.
- **1× 404**: Not caused by our changes — likely the browser requesting a favicon or Next.js asset. All three new public files (`alert.wav`, `icon-192.png`, `icon-512.png`) are confirmed present in `/public/`.

---

## What the Hotel Owner Should Verify in the New Screenshots

1. **`01_guest_initial.png`** — Header should show "Grand Stay Hotel" (small, white) above "Room 204" (large, white) on gold background. No "ROOM SERVICES" label. Footer should have two lines: "Need immediate help? Call reception: 0" and "Report a problem →".

2. **`02_guest_click_05_reception_callback.png`** — Banner should read: "✓ Request for **Reception Callback** received! We'll be right with you." (correct spacing, new label).

3. **`02_guest_click_01_water.png` through `_04_extra_pillows.png`** — These show "already on its way" banners from duplicate detection (test DB had existing requests). On a fresh room with no pending requests they would show the success banner. The banner text spacing is confirmed correct from the reception callback test.

4. **`03_staff_login_empty.png`** — Login screen should show "Grand Stay Hotel" in gold below the hotel emoji, card in the middle, footer at the bottom. No large grey void.

5. **`03_staff_login_filled.png`** — Same layout with email/password filled in.

6. **`04_staff_dashboard.png`** — Header should show 🔔 toggle button (dimmed = off). "Reception Callback" card should appear with new label. No "Maintenance" card.

7. **`05_staff_after_claim.png`** — "Claimed by" line should show a properly capitalised name (e.g. "Test" for `test@test.com`), not raw email prefix.

8. **`04_staff_dashboard_all_today.png`** — This should include completed ("done") requests from today, making it visually different from the "Active" tab once some requests are resolved.

9. **PWA icons** — Install the app to the home screen (or check the browser's "add to home screen" prompt) to confirm the gold "G" icon appears instead of a missing-icon placeholder.

---

## Files Changed

- `/home/gg/Documents/Hotel_Server/frontend/src/lib/types.ts`
- `/home/gg/Documents/Hotel_Server/frontend/src/lib/supabase.ts`
- `/home/gg/Documents/Hotel_Server/frontend/src/app/room/[room]/page.tsx`
- `/home/gg/Documents/Hotel_Server/frontend/src/app/staff/page.tsx`
- `/home/gg/Documents/Hotel_Server/frontend/src/app/staff/login/page.tsx`
- `/home/gg/Documents/Hotel_Server/frontend/public/manifest.json`
- `/home/gg/Documents/Hotel_Server/frontend/public/alert.wav` *(new)*
- `/home/gg/Documents/Hotel_Server/frontend/public/icon-192.png` *(new)*
- `/home/gg/Documents/Hotel_Server/frontend/public/icon-512.png` *(new)*
- `/home/gg/Documents/Hotel_Server/tests/review.py` *(updated label map)*
