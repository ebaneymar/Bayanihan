"""Exercise the built game offline through its normal classroom controls."""

import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def play_queue(page):
    def control(name):
        return page.locator(f'[data-ma="{name}"]')

    def give(*values):
        for value in values:
            control("cashier-drawer").locator(f'[data-sv-coin="{value}"]').click()

    def language(code):
        control("settings-open").click()
        control("language-select").select_option(code)
        control("settings-close").click()

    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.reload()
    control("language-start").select_option("fil")
    control("start").click()
    page.locator('[data-character="girl"]').click()
    control("character-next").click()
    control("shop-open").click()
    control("cashier-open").click()

    expect(control("cashier-progress")).to_have_text("Mamimili 1 sa 4")
    expect(control("cashier-next")).to_be_hidden()
    control("cashier-guide").locator("summary").click()
    give(20)
    control("cashier-check").click()
    expect(control("cashier-feedback")).to_contain_text("Sobra")
    control("cashier-tray").locator('[data-sv-coin="20"]').press("Enter")
    expect(control("cashier-drawer").locator('[data-sv-coin="20"]')).to_be_focused()
    expect(control("cashier-total")).to_have_text("?")
    give(10, 5)
    expect(control("cashier-guide-equation")).to_have_text("₱32 + ₱15 = ₱47")
    control("cashier-check").click()
    expect(control("cashier-feedback")).to_contain_text("Kulang")
    give(1, 1, 1)
    control("cashier-check").click()
    expect(control("cashier-next")).to_be_focused()
    expect(control("cashier-feedback")).to_contain_text("₱32 + ₱18 = ₱50")

    control("cashier-another").click()
    give(1, 1, 1, 5, 10)
    control("cashier-check").click()
    expect(control("cashier-feedback")).to_contain_text("Nagamit mo na")
    control("cashier-reset").click()
    give(5, 5, 5, 1, 1, 1)
    control("cashier-check").click()
    language("en")
    expect(control("cashier-progress")).to_have_text("Customer 1 of 4")
    expect(control("cashier-total")).to_have_text("₱18")
    control("cashier-next").click()

    expect(control("cashier-cost")).to_have_text("− ₱15")
    expect(control("cashier-paid")).to_have_text("₱20")
    give(5)
    control("cashier-check").click()
    control("cashier-another").click()
    give(1, 1, 1, 1, 1)
    control("cashier-check").click()
    expect(control("cashier-another")).to_be_hidden()
    control("cashier-next").click()

    control("cashier-check").click()
    expect(control("cashier-feedback")).to_contain_text("select “No change” first")
    expect(control("cashier-next")).to_be_hidden()
    control("cashier-zero").press("Enter")
    give(1)
    expect(control("cashier-zero")).to_have_attribute("aria-pressed", "false")
    control("cashier-zero").click()
    expect(control("cashier-total")).to_have_text("₱0")
    control("cashier-check").click()
    expect(control("cashier-another")).to_be_hidden()
    control("cashier-next").click()

    give(20, 20, 5, 1)
    control("cashier-check").click()
    control("cashier-another").click()
    # The class may move on after an earned receipt even during an optional extra try.
    control("cashier-next").click()
    expect(control("cashier-receipt-title")).to_be_focused()
    rows = control("cashier-receipt-list").locator("li")
    expect(rows).to_have_count(4)
    for index, (equation, ways) in enumerate([
        ("₱50 − ₱32 = ₱18", "2 ways"), ("₱20 − ₱15 = ₱5", "2 ways"),
        ("₱20 − ₱20 = ₱0", "1 way"), ("₱100 − ₱54 = ₱46", "1 way")
    ]):
        expect(rows.nth(index)).to_contain_text(equation)
        expect(rows.nth(index)).to_contain_text(ways)
    language("fil")
    expect(control("cashier-receipt-title")).to_have_text("Mga resibo ng klase")
    expect(rows.first).to_contain_text("2 paraan")
    control("cashier-replay").click()
    expect(control("cashier-progress")).to_have_text("Mamimili 1 sa 4")
    expect(control("cashier-next")).to_be_hidden()
    expect(control("cashier-total")).to_have_text("?")
    control("cashier-back").click()
    expect(control("cashier-open")).to_be_focused()
    assert not errors, errors


if __name__ == "__main__":
    game = Path(sys.argv[1] if len(sys.argv) > 1 else "dist/game.html").resolve()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(offline=True, reduced_motion="reduce")
        page.goto(game.as_uri())
        play_queue(page)
        browser.close()
    print("Passed offline cashier queue, keyboard, bilingual play, and receipts.")
