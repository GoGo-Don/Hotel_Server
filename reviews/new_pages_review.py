from playwright.sync_api import sync_playwright
from pathlib import Path

SCREENSHOTS = Path("tests/screenshots")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page = ctx.new_page()

    # Guest room — all 5 tabs
    tabs = [
        ("services",  "http://localhost:3000/room/204"),
        ("amenities", None),
        ("hours",     None),
        ("about",     None),
        ("menu",      None),
    ]

    page.goto("http://localhost:3000/room/204", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.screenshot(path=str(SCREENSHOTS / "room_tab_services.png"), full_page=True)
    print("✓ room_tab_services")

    for tab_id in ["amenities", "hours", "about", "menu"]:
        # Click the tab button by its label
        label_map = {"amenities": "Amenities", "hours": "Hours", "about": "About", "menu": "Menu"}
        page.get_by_role("button", name=label_map[tab_id]).click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(SCREENSHOTS / f"room_tab_{tab_id}.png"), full_page=True)
        print(f"✓ room_tab_{tab_id}")

    # Admin dashboard
    page.goto("http://localhost:3000/staff/login", wait_until="networkidle")
    page.fill('input[type="email"]', "test@test.com")
    page.fill('input[type="password"]', "test")
    page.click('button[type="submit"]')
    page.wait_for_url("http://localhost:3000/staff", timeout=10000)
    page.wait_for_timeout(1000)

    page.goto("http://localhost:3000/admin", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=str(SCREENSHOTS / "admin_dashboard.png"), full_page=True)
    print("✓ admin_dashboard")

    browser.close()
    print("\nDone.")
