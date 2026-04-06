# Hotel Owner — Round 3 Final Review

*Screenshots reviewed: 6 images, mobile viewport. Date: 2026-04-06.*

---

## Round 1 items — final status

1. **Hotel name in guest header** — ✅ "Grand Stay Hotel" above "Room 204" on gold header. Correct hierarchy. Done.
2. **Fix success banner text spacing** — ✅ "✓ Request for Water received!" reads correctly. All five active service types confirmed with correct spacing in this round's screenshots.
3. **Move Maintenance off primary grid** — ✅ Confirmed. `01_guest_initial.png` shows exactly 5 cards: Water, Towels, Room Cleaning, Extra Pillows, Reception Callback. No Maintenance card. "Report a problem →" link in footer. Done.
4. **Audio alert with sound toggle** — ⚠️ Bell icon visible in staff dashboard header. Cannot verify actual audio playback from screenshots. 404 on `/alert.wav` noted in the dev console log. Must be manually tested before go-live — not confirmed closed.
5. **PWA icons and manifest names** — ⚠️ Still cannot verify from screenshots. Dev confirms files exist. Must be spot-checked on a production install before guests use it.
6. **Staff login full-height layout** — ⚠️ Materially improved. Wordmark and hotel emoji are in the top ~15% of the screen — that requirement is met. However, `03_staff_login_empty.png` still shows a very large dead grey void between the bottom of the login card and the footer. Roughly 45% of the screen is empty grey below the card. The three-zone distribution is not balanced. Better, but not done.
7. **Login subtitle replaced with hotel name** — ✅ Inside the card, "Grand Stay Hotel" in gold replaces the old "Hotel Services Dashboard" subtitle. Done.
8. **"Claimed by" display name formatting** — ✅ Confirmed clean in prior round. No regression visible in Round 3 screenshots.
9. **"All today" filter actually filters by today** — ✅ Confirmed in Round 2, no regression. Two tabs show clearly different data sets.
10. **Sort overdue requests to top with red badge** — ❌ Not verifiable from any screenshot across three rounds. `04_staff_dashboard.png` shows 5 active cards with no red overdue badge on the Active tab and no card sorted to the top with a red border. The dev acknowledges the code is in place but cannot prove it with a screenshot because no backdated row exists in the test run. After three rounds this is still unverified. It must be demonstrated before go-live — a feature that cannot be shown to work may as well not exist.
11. **Rename "Call Me Back" to "Reception Callback"** — ✅ Confirmed on guest grid and banners. "Reception Callback / We'll call your room within 5 minutes." is correct on `01_guest_initial.png`.

---

## Round 2 items — final status

1. **Prove the build under test is current / clean build** — ✅ Round 3 screenshots clearly show a consistent, current build: 5 cards only, correct labels everywhere, no Maintenance card, no "Call Me Back" label. The stale-build issue from Round 2 is resolved.
2. **Trace and eliminate Maintenance card — verify with fresh screenshot** — ✅ Done and proved. `01_guest_initial.png` is unambiguous: 5 cards, no Maintenance.
3. **Fix login page layout — wordmark at the top** — ⚠️ Half credit. Wordmark is genuinely at the top now — that part is done. But the card is top-aligned in the flex-1 zone rather than centred, leaving an enormous grey void in the bottom half of the screen. The screen still looks broken on a tall mobile viewport. `items-start` should be changed to `items-center` to close this properly.
4. **Overdue sorting — add and demonstrate with verifiable test** — ❌ Not demonstrated. Three rounds in, no screenshot has ever shown a red overdue badge on the Active tab or a card sorted to the top with overdue styling. The dev's explanation (cannot backdate via anon key) is understood but is not an acceptable final answer. This is a guest-facing safety feature — if a request sits for 44 minutes without a visual alarm, that is a service failure. It must be demonstrated.
5. **Fix legacy "maintenance" rows rendering broken in All today** — ✅ Done. `05_staff_after_claim.png` and `06_staff_after_done.png` show legacy maintenance rows rendering with the wrench icon, "Maintenance" label, and standard card styling. No longer a broken lowercase entry.
6. **Keep Active tab selected after claim/done** — ✅ Confirmed correct by code trace. The Round 2 observation was caused by the test script selecting "All today" before claiming — not a state reset. No regression.
7. **Remove "STAFF DASHBOARD" small-caps label from dashboard header** — ✅ Done. `04_staff_dashboard.png` shows "Grand Stay Hotel" in small gold text above "Requests". Clean.

---

## Overall verdict

Three rounds of work have produced a genuinely usable product for staff and a clean, professional experience for guests. The guest-facing page is essentially ready: hotel name is prominent, five services are clearly presented, confirmation banners are correctly worded, Maintenance is off the grid, and Reception Callback is properly named and described. The staff dashboard is functional — claims and completions work, tab filtering works, legacy data is handled gracefully, and the header is on-brand. What is holding this back from a confident green light is a combination of two unverified safety features and one layout issue that looks embarrassingly unfinished on a tall phone screen. The overdue sorting system — the single most important operational safety feature in this entire application — has never been demonstrated working in three rounds of review. A guest request that sits for 44 minutes without a visible alarm is a guest service failure, and right now I cannot confirm the alarm works. That is the one thing missing.

---

## Green light / Red light

**RED LIGHT — demonstrate the overdue alert working before we go live.**

Specifically: use the Supabase dashboard to backdate one request's `created_at` to 20 minutes ago, take a fresh screenshot of the Active tab, and show me a red badge on the tab label and a red-bordered card at the top of the list. If that screenshot arrives and looks right, this is a green light with the login layout fix done in the same commit.

---

## Remaining punch list

*Strict priority order. Only items that matter for soft launch.*

1. **Demonstrate overdue sorting with a real screenshot** — Use Supabase table editor, backdate a `created_at` field, screenshot the Active tab. Must show: red "N overdue" badge on Active tab, overdue card at top of list with red dashed border. This is mandatory before go-live. (Item R1-10, R2-4)

2. **Fix login screen void below the card** — Change `items-start` to `items-center` on the middle zone div in `/frontend/src/app/staff/login/page.tsx`. One line. The wordmark is correctly at the top; the card just needs to be centred in the remaining space rather than bunched at the top of it. The current layout looks broken on tall phones. (Item R1-6, R2-3)

3. **Confirm `/alert.wav` (or `.mp3`) is committed and plays** — The dev console logged a 404 on the sound file. Manually toggle the bell on, submit a test request, and confirm audio fires. This is a staff usability feature, not cosmetic. (Item R1-4)

4. **Confirm PWA icons exist and manifest is correct** — Install the app to a home screen on a real phone. Confirm the icon is the gold/white hotel icon (not a broken image or generic browser icon) and the app name reads "Grand Stay Hotel". One minute to verify, never been confirmed. (Item R1-5)

*The following are noted but do not block soft launch:*

- "All today" list length / pagination — valid concern for a busy property but manageable for a soft launch with low volume.
- Emoji icons vs. SVG set — cosmetic, save for after go-live.
- Reconnection feedback on WebSocket drop — valid but edge-case for a soft launch.
- "Call reception: 0" hardcoded extension — make it a config constant post-launch.
- Next.js "N" dev badge — will not appear on Vercel production build; verify once on the Vercel preview URL.
