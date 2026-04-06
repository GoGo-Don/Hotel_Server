#!/usr/bin/env python3
"""
scrape_website.py — extract brand data from any website using Playwright + system Chromium.

Usage:
    .venv/bin/python scripts/scrape_website.py <url> [--screenshot /path/out.png]

Outputs JSON to stdout:
    {
      "colors":  { "cssVars": {...}, "bgColors": [...], "textColors": [...], ... },
      "text":    { "title": "...", "h1": [...], "paras": [...], "allText": "..." },
      "fonts":   [...]
    }

Requires: playwright installed in .venv  →  .venv/bin/pip install playwright
          System Chromium at /usr/bin/chromium
"""

import sys
import json
import argparse
from playwright.sync_api import sync_playwright


def scrape(url: str, screenshot_path: str | None = None) -> dict:
    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path="/usr/bin/chromium",
        )
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2000)

        if screenshot_path:
            page.screenshot(path=screenshot_path, full_page=True)

        # ── Colors ────────────────────────────────────────────────────────────
        colors = page.evaluate("""() => {
            const data = {};

            // CSS custom properties on :root
            const vars = {};
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.selectorText === ':root' || rule.selectorText === 'html') {
                            for (let i = 0; i < rule.style.length; i++) {
                                const prop = rule.style[i];
                                if (prop.startsWith('--')) {
                                    vars[prop] = rule.style.getPropertyValue(prop).trim();
                                }
                            }
                        }
                    }
                } catch(e) {}
            }
            data.cssVars = vars;

            // Computed colors on key structural elements
            const nav = document.querySelector('nav, header, .navbar, .header');
            if (nav) data.navBg = getComputedStyle(nav).backgroundColor;
            const hero = document.querySelector('.hero, .banner, [class*="hero"], [class*="banner"]');
            if (hero) data.heroBg = getComputedStyle(hero).backgroundColor;
            const btn = document.querySelector('button, .btn, a[class*="btn"]');
            if (btn) {
                data.btnBg    = getComputedStyle(btn).backgroundColor;
                data.btnColor = getComputedStyle(btn).color;
            }

            // All unique background + text colors across the page
            const bgSet   = new Set();
            const textSet = new Set();
            for (const el of document.querySelectorAll('*')) {
                const bg  = getComputedStyle(el).backgroundColor;
                const col = getComputedStyle(el).color;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') bgSet.add(bg);
                if (col) textSet.add(col);
            }
            data.bgColors   = [...bgSet].slice(0, 20);
            data.textColors = [...textSet].slice(0, 15);
            return data;
        }""")
        results["colors"] = colors

        # ── Text content ──────────────────────────────────────────────────────
        text = page.evaluate("""() => {
            return {
                title:   document.title,
                h1:      [...document.querySelectorAll('h1')].map(e => e.textContent.trim()),
                h2:      [...document.querySelectorAll('h2')].map(e => e.textContent.trim()),
                h3:      [...document.querySelectorAll('h3')].map(e => e.textContent.trim()),
                paras:   [...document.querySelectorAll('p')]
                             .map(e => e.textContent.trim())
                             .filter(t => t.length > 20)
                             .slice(0, 30),
                nav:     [...document.querySelectorAll('nav a, header a')]
                             .map(e => e.textContent.trim())
                             .filter(Boolean),
                allText: document.body.innerText.substring(0, 8000),
            };
        }""")
        results["text"] = text

        # ── Fonts ─────────────────────────────────────────────────────────────
        fonts = page.evaluate("""() => {
            const fonts = new Set();
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule instanceof CSSFontFaceRule) {
                            fonts.add(rule.style.getPropertyValue('font-family'));
                        }
                        if (rule.style) {
                            const ff = rule.style.fontFamily;
                            if (ff) fonts.add(ff);
                        }
                    }
                } catch(e) {}
            }
            return [...fonts].slice(0, 20);
        }""")
        results["fonts"] = fonts

        browser.close()

    return results


def main():
    parser = argparse.ArgumentParser(description="Scrape brand data from a website.")
    parser.add_argument("url", help="URL to scrape")
    parser.add_argument("--screenshot", help="Save full-page screenshot to this path", default=None)
    args = parser.parse_args()

    data = scrape(args.url, screenshot_path=args.screenshot)
    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
