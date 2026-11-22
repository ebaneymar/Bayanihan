# SUHANAYAN — Tara, Bilang!

SUHANAYAN is a Filipino and English math game for the classroom. In **Sari-sari Store → Ako ang tindero**, pupils serve four customers, give change using peso coins, and compare their receipts. Teachers can open the count-up guide during a turn.

## Build the offline game

Run this command with Python 3.8 or newer.

```sh
python build_game.py
```

Open `dist/game.html` in a browser. The build downloads the original v1.2.8 game once per build and verifies its SHA-256. It includes the artwork, narration, arithmetic activities, and Sir Vincent’s lesson in the finished file. Classroom play works offline.

To build offline with a previously downloaded [v1.2.8 game.html](https://github.com/ebaneymar/Bayanihan/releases/download/v1.2.8/game.html), run `python build_game.py --base /path/to/game.html`. The cashier activity is editable in `src/cashier.html`, `src/cashier.css`, and `src/cashier.js`.

With Playwright for Python and its Chromium browser installed, run `python tests/test_cashier.py` to exercise all four customers, alternative coin combinations, exact payment, language changes, and receipts offline.
