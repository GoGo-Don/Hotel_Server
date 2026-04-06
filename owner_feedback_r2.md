# Hotel Owner Brief — Round 2

*Screenshots reviewed: 14 images, mobile viewport. Date: 2026-04-06.*

---

## Verdict on Round 1 fixes

1. **Hotel name in guest header** — ✅ Fixed. "Grand Stay Hotel" appears in white above "Room 204" on the gold header. Hierarchy is correct.

2. **Fix success banner text spacing** — ⚠️ Partially fixed. The Water banner reads "✓ Request for **Water** received! We'll be right with you." — spacing is correct. However, `02_guest_click_06_maintenance.png` still shows "Request for **Maintenancereceived!** We'll be right with you." — the broken string is alive and visible in the test run. The fix is applied inconsistently.

3. **Remove Maintenance from primary grid** — ❌ Not fixed. `02_guest_click_06_maintenance.png` shows a full Maintenance card in position 6 of the grid, still labelled "Report a technical issue", still reachable by tapping. The "Report a problem →" footer link may exist on the clean build but the Maintenance card was not removed from the grid the test ran against. The screenshot is evidence — Maintenance is on the primary grid.

4. **Audio alert with sound toggle** — ⚠️ Partially fixed. The 🔔 icon is visible in the staff dashboard header (dimmed, default off). Cannot verify from a screenshot whether the WAV file actually plays, but the implementation is described and the UI element is present. Accepted with the caveat that it must be manually tested with sound on before any live deployment.

5. **PWA icons and manifest names** — ✅ Accepted on trust. Cannot verify icons from screenshots alone, but the dev confirms the files are in `/public/` and the manifest has the correct names. Must be spot-checked on install.

6. **Staff login full-height layout** — ⚠️ Partially fixed. The login card is no longer a tiny island in infinite grey. "Grand Stay Hotel" wordmark appears above the card, and "Grand Stay Hotel — Staff Portal" sits in the footer. However, there is still a substantial grey void above the wordmark (roughly 30% of screen height) and another gap below the card before the footer. The card is not centred in the available space — it is bunched toward the middle-bottom. Better than before, but not done.

7. **Login subtitle replaced with hotel name** — ✅ Fixed. Inside the card, below "Staff Login", it now reads "Grand Stay Hotel" in gold. The old "Hotel Services Dashboard" is gone.

8. **"Claimed by" display name formatting** — ✅ Fixed. `05_staff_after_claim.png` shows "Claimed by Test" — clean capitalised name, no raw email, no domain suffix.

9. **"All today" filter actually filters by today** — ✅ Fixed. `04_staff_dashboard_all_today.png` shows a noticeably longer list including completed (green "Done") requests that do not appear on the Active tab. The two tabs are clearly showing different data sets.

10. **Sort overdue requests to top** — ❌ Not fixed. `04_staff_dashboard.png` shows 5 active requests: Towels (5m ago), Room Cleaning (5m ago), Extra Pillows (5m ago), Reception Callback (2m ago), Water (23s ago). None are flagged as overdue and none are sorted to the top by age — the oldest requests (Towels, Room Cleaning) happen to appear first but that appears coincidental or default insertion order, not a deliberate sort by overdue status. There is no red overdue badge on the Active tab. No overdue warning is visible on any card.

11. **Rename "Call Me Back" to "Reception Callback"** — ✅ Fixed on the main guest page. The card correctly reads "Reception Callback / We'll call your room within 5 minutes." on `01_guest_initial.png`. However, `02_guest_click_06_maintenance.png` — the stale Maintenance screenshot — still shows the old "Call Me Back" label and description "Reception will call your room." This confirms item 3 and item 11 are both unresolved in the code path that screenshot captured.

---

## Still broken / not good enough

**Maintenance card is still on the primary guest grid.** This is the most important outstanding issue. `02_guest_click_06_maintenance.png` is unambiguous: a Maintenance card with a wrench emoji, the label "Maintenance", and "Report a technical issue" is sitting in position 6 alongside Water and Towels. Tapping it shows a banner reading "Request for **Maintenancereceived!** We'll be right with you." — which means (a) the card is present, (b) it is submitting requests, and (c) the spacing bug is also still present on that code path. The dev says they removed it from `REQUEST_TYPES` but the screenshot shows a live test run that still renders it. Something is wrong — either the build being tested is stale, the change did not deploy, or there is another place where Maintenance is being injected. This needs to be traced and verified.

**The same screenshot also shows "Call Me Back" instead of "Reception Callback".** Both the card label and the description revert to the old text in this screenshot. This reinforces that the test was run against an older build, OR there is a conditional path that restores the old values. Either way the developer needs to confirm the test environment is running the new code.

**Login screen still has too much dead space.** The card sits in roughly the bottom 60% of the screen with 30%+ of empty grey above the wordmark. "Pin the hotel wordmark near the top" was the instruction — it is not near the top, it is near the middle. This needs a proper `justify-between` or `space-between` flex layout that actually distributes: wordmark at top, card in centre, footer at bottom.

**No overdue sorting or badge is visible.** The Active tab shows no red badge, no count, and no evidence that overdue cards rise to the top. Either the implementation exists but was not triggered during this test (no request was old enough to be "overdue"), or it was not implemented in a way that the screenshots can confirm. The developer should add a clearly documented overdue threshold (e.g. 15 minutes) and force a test where at least one card exceeds it, then re-screenshot.

---

## New issues spotted

**A "maintenance" type appears in the "All today" list (`04_staff_dashboard_all_today.png` and `05_staff_after_claim.png`).** The "All today" tab shows cards labelled "maintenance" (lowercase, no icon, minimal styling) that are clearly legacy database rows. These are surfacing to staff even though Maintenance was supposed to be removed. They look broken — no proper icon, lowercase label, no description. If old Maintenance rows exist in the database, the staff view needs to either render them gracefully (with a proper label and icon, even if the type is deprecated) or filter them out entirely. Right now they look like a bug.

**The "All today" tab is overwhelmingly long and hard to use.** `04_staff_dashboard_all_today.png` shows what appears to be 15–20+ cards in a single scrolling list, many of which are duplicate test entries (multiple "Water", "Extra Pillows", "Room Cleaning" cards from the same room). In a real hotel context this list will include the full day's history. It needs either: (a) pagination or a visible scroll count, (b) grouping by room, or (c) at minimum a card count badge on the tab so staff know what they are looking at. Currently it is an undifferentiated wall of cards.

**The "All today" tab is selected by default when arriving at the dashboard after claiming/completing (`05_staff_after_claim.png`, `06_staff_after_done.png`).** After a claim or done action, the view snaps to "All today" showing the full historical list instead of staying on the "Active" tab. This is disorienting — staff action should keep them on the working view. The active tab should remain selected after claim/resolve unless the user explicitly switches.

**The staff dashboard header says "STAFF DASHBOARD" in small caps above "Requests".** This is visible on `04_staff_dashboard.png` and `05_staff_after_claim.png`. It is the same pattern as the old guest "ROOM SERVICES" label that was removed in Round 1 — a redundant small-caps descriptor that adds nothing. The staff know they are on the dashboard. Remove it or replace it with "Grand Stay Hotel" to match the login screen.

**The `02_guest_click_01_water_duplicate.png` screenshot shows the guest page with no banner at all after a duplicate tap.** Looking carefully, the page looks identical to the initial state — no "already on its way" message is visible in the screenshot. This may be a timing issue with how the screenshot was taken, but it is worth verifying the duplicate guard is rendering visibly on screen.

---

## This round's priority fixes

1. **Confirm and prove the build under test is current.** Before anything else: wipe the test database of old rows, do a clean `npm run build`, restart the dev server, and run the review script fresh. Re-screenshot everything. Half the issues this round stem from a test run that appears to be running against an old build (Maintenance card still present, "Call Me Back" label still showing, broken banner text on Maintenance). Deliver screenshots from a clean build to close items 2, 3, and 11.

2. **Trace and eliminate the Maintenance card from the guest grid — verify with a fresh screenshot.** The card is still appearing in the test run. Find every place `REQUEST_TYPES` or an equivalent array is defined or imported, confirm the removal is in the built output, and prove it with a screenshot where there are exactly 5 cards: Water, Towels, Room Cleaning, Extra Pillows, Reception Callback. No sixth card.

3. **Fix the login page layout — wordmark must actually be at the top.** Apply a true full-height three-zone layout: `min-h-screen flex flex-col` on the page, wordmark block at the top with `pt-12` or similar, form card with `flex-1 flex items-center justify-center`, footer pinned at the bottom with `pb-6`. The current version still has a large void above the wordmark. Show me a screenshot where the wordmark is within the top quarter of the screen.

4. **Add and demonstrate overdue sorting with a verifiable test.** Manually insert a request with a `created_at` timestamp 20+ minutes in the past into the test database, then screenshot the Active tab. That card must appear at the top of the list with a red dashed border and a red badge on the "Active" tab label showing "1 overdue" or similar. Without this, I cannot confirm the feature works at all.

5. **Fix the "maintenance" legacy cards in "All today".** Old database rows with `type = 'maintenance'` are rendering as broken-looking lowercase cards. Either: (a) add a display fallback so any unknown/deprecated type renders as "Maintenance Request" with a generic icon and normal styling, or (b) add a filter to exclude deprecated types from the All today query. Broken-looking cards on the staff dashboard undermine trust in the system.

6. **Keep the Active tab selected after a claim or done action.** Currently the dashboard snaps to "All today" after an action. The active working view should remain selected. This is a one-line state fix.

7. **Remove or replace the "STAFF DASHBOARD" small-caps label on the dashboard header.** Either remove it (the page is self-explanatory) or replace it with "Grand Stay Hotel" in the brand gold — same pattern as the login fix. The small-caps label adds nothing and reads as placeholder text.

---

## What's genuinely improved

The guest header is now correct — "Grand Stay Hotel" above "Room 204" is exactly what was asked for and it looks right. Clean hierarchy, legible on the gold background.

The banner text spacing fix works on the services it was applied to. Water, Towels, Room Cleaning, Extra Pillows, and Reception Callback all show correctly formatted confirmation messages with proper spacing.

The "Reception Callback" rename is clean. The card reads well, the 5-minute promise in the description is a genuine improvement to the guest experience, and the banner text reflects the new name properly.

The "All today" tab is now doing something meaningfully different from "Active". Completed requests appear, the list is clearly longer, and the distinction between tabs is now real — this was a substantive data-layer fix and it is done correctly.

The "Claimed by Test" display is clean and professional. The email parsing and capitalisation logic works exactly as requested.

The sound toggle bell icon on the staff dashboard header is in the right place and visible immediately on login — that is the correct UX decision.

The login screen is materially better than Round 1. The wordmark, card, and footer structure is there — it just needs the spacing calibrated so the wordmark is actually at the top rather than floating in the middle.

The "Grand Stay Hotel" subtitle inside the login card is a good branding touch. Simple and on-brand.
