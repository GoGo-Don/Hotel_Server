"""
Hotel app end-to-end review script.
Logs in as staff, browses guest page, clicks every service button,
screenshots everything, and writes a structured log.

Usage:
    cd /home/gg/Documents/Hotel_Server
    .venv/bin/python tests/review.py
"""

import json
import time
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

BASE_URL   = "http://localhost:3000"
STAFF_EMAIL    = "test@test.com"
STAFF_PASSWORD = "test"

SCREENSHOTS = Path("tests/screenshots")
LOGS        = Path("tests/logs")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)
LOGS.mkdir(parents=True, exist_ok=True)

log_lines = []

def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    line = f"[{ts}] {msg}"
    print(line)
    log_lines.append(line)

def shot(page: Page, name: str, full_page=True):
    path = SCREENSHOTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=full_page)
    log(f"  screenshot → {path}")

def flush_log(name: str):
    path = LOGS / f"{name}.log"
    path.write_text("\n".join(log_lines))
    print(f"\nLog saved → {path}")


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path="/usr/bin/chromium",
    )
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
    )
    page = ctx.new_page()

    console_errors = []
    page.on("console", lambda m: console_errors.append(f"[{m.type}] {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(f"[pageerror] {e}"))

    # ─────────────────────────────────────────────
    # 1. Guest page — initial load
    # ─────────────────────────────────────────────
    log("=== GUEST PAGE ===")
    page.goto(f"{BASE_URL}/room/204", wait_until="networkidle")
    page.wait_for_timeout(1000)
    shot(page, "01_guest_initial")
    log(f"  title: {page.title()}")
    log(f"  url:   {page.url}")

    # Find all service buttons
    buttons = page.locator("button").all()
    log(f"  found {len(buttons)} button(s)")

    # ─────────────────────────────────────────────
    # 2. Click each service button
    # ─────────────────────────────────────────────
    log("\n=== CLICKING SERVICE BUTTONS ===")

    SERVICE_TYPES = [
        "water", "towels", "cleaning",
        "extra_pillows", "reception_callback"
    ]

    for i, svc in enumerate(SERVICE_TYPES):
        # Fresh page load between clicks so each is independent
        page.goto(f"{BASE_URL}/room/204", wait_until="networkidle")
        page.wait_for_timeout(500)

        # Find the button by its visible text (label matches REQUEST_TYPES)
        label_map = {
            "water":             "Water",
            "towels":            "Towels",
            "cleaning":          "Room Cleaning",
            "extra_pillows":     "Extra Pillows",
            "reception_callback":"Reception Callback",
        }
        label = label_map[svc]
        btn = page.get_by_role("button", name=label)

        log(f"\n  [{i+1}] Clicking '{label}' ({svc})")
        btn.click()
        page.wait_for_timeout(2500)  # wait for Supabase response + banner

        # Capture the status banner text
        banner = page.locator(".mx-4.mt-4").first
        banner_text = banner.inner_text() if banner.count() > 0 else "(no banner visible)"
        log(f"       banner: {banner_text.strip()}")

        shot(page, f"02_guest_click_{i+1:02d}_{svc}")

        # Second click — test duplicate handling
        if svc == "water":
            log(f"  [{i+1}b] Clicking '{label}' AGAIN (duplicate test)")
            page.wait_for_timeout(500)
            btn.click()
            page.wait_for_timeout(2500)
            banner2 = page.locator(".mx-4.mt-4").first
            banner2_text = banner2.inner_text() if banner2.count() > 0 else "(no banner)"
            log(f"         duplicate banner: {banner2_text.strip()}")
            shot(page, f"02_guest_click_{i+1:02d}_{svc}_duplicate")

    # ─────────────────────────────────────────────
    # 2b. Overdue sorting note
    # ─────────────────────────────────────────────
    log("\n=== OVERDUE SORTING NOTE ===")
    log("  Overdue sorting code is in place — verify manually by waiting 10+ minutes")
    log("  after submitting a request, or by using the Supabase dashboard to backdate")
    log("  a created_at timestamp. The Active tab will show a red 'N overdue' badge")
    log("  on the tab label, and overdue cards will appear at the top with red borders.")

    # ─────────────────────────────────────────────
    # 3. Staff login
    # ─────────────────────────────────────────────
    log("\n=== STAFF LOGIN ===")
    page.goto(f"{BASE_URL}/staff/login", wait_until="networkidle")
    page.wait_for_timeout(500)
    shot(page, "03_staff_login_empty")

    page.fill('input[type="email"]', STAFF_EMAIL)
    page.fill('input[type="password"]', STAFF_PASSWORD)
    shot(page, "03_staff_login_filled")

    page.click('button[type="submit"]')
    page.wait_for_url(f"{BASE_URL}/staff", timeout=10000)
    page.wait_for_timeout(2000)  # let realtime subscription load
    log(f"  logged in — url: {page.url}")
    shot(page, "04_staff_dashboard")

    # ─────────────────────────────────────────────
    # 4. Staff dashboard — inspect requests
    # ─────────────────────────────────────────────
    log("\n=== STAFF DASHBOARD ===")
    cards = page.locator(".bg-white.rounded-2xl.border-2").all()
    log(f"  visible request cards: {len(cards)}")
    for i, card in enumerate(cards):
        text = card.inner_text().replace("\n", " | ")
        log(f"  card {i+1}: {text}")

    # Click "All today" tab
    page.get_by_role("button", name="All today").click()
    page.wait_for_timeout(800)
    shot(page, "04_staff_dashboard_all_today")

    # Claim first pending card if any
    claim_btn = page.get_by_role("button", name="Claim").first
    if claim_btn.count() > 0:
        log("\n  Claiming first pending request...")
        claim_btn.click()
        page.wait_for_timeout(1500)
        shot(page, "05_staff_after_claim")
        log("  Claimed.")

    # Resolve it
    done_btn = page.get_by_role("button", name="Done").first
    if done_btn.count() > 0:
        log("  Marking as Done...")
        done_btn.click()
        page.wait_for_timeout(1500)
        shot(page, "06_staff_after_done")
        log("  Done.")

    # ─────────────────────────────────────────────
    # 5. Console errors summary
    # ─────────────────────────────────────────────
    log(f"\n=== CONSOLE ERRORS ({len(console_errors)}) ===")
    for e in console_errors:
        log(f"  {e}")

    browser.close()

# ─────────────────────────────────────────────
# Save log
# ─────────────────────────────────────────────
flush_log("review")
print(f"\nScreenshots in: {SCREENSHOTS.resolve()}")
