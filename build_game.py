"""Build the standalone SUHANAYAN game using the original offline artwork and audio."""

import argparse
import hashlib
import os
from pathlib import Path
import tempfile
from urllib.request import urlopen


SOURCE = Path(__file__).resolve().parent / "src"
BASE_URL = "https://github.com/ebaneymar/Bayanihan/releases/download/v1.2.8/game.html"
BASE_SHA256 = "36b71e12564912687b3de4c4b2fac5193bd944ef760cf6dd178f21bc939e7f52"
VERSION = "1.2.9"


def build(base):
    if hashlib.sha256(base).hexdigest() != BASE_SHA256:
        raise ValueError("Expected the game.html asset from the SUHANAYAN v1.2.8 release.")
    game = base.decode("utf-8")

    start = game.index('    <section class="sv-cashier-screen"')
    end = game.index('    <section class="ma-setup td-setup"', start)
    game = game[:start] + (SOURCE / "cashier.html").read_text(encoding="utf-8") + game[end:]

    start = game.index("  Object.assign(staticCopy,{\n    cashierEntry:")
    end = game.index("  const cashierApplyLanguage=applyLanguage;", start)
    game = game[:start] + (SOURCE / "cashier.js").read_text(encoding="utf-8") + "\n" + game[end:]

    end = game.index("</style>\n<script>")
    game = game[:end] + (SOURCE / "cashier.css").read_text(encoding="utf-8") + "\n" + game[end:]
    game = game.replace("v1.2.8</small>", "v" + VERSION + "</small>")
    game = game.replace("v1.2.8</span>", "v" + VERSION + "</span>")
    return game.replace("const appVersion = '1.2.8';", f"const appVersion = '{VERSION}';").encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, help="Use a previously downloaded v1.2.8 game.html.")
    parser.add_argument("--output", type=Path, default=Path("dist/game.html"))
    args = parser.parse_args()
    if args.base and args.base.resolve() == args.output.resolve():
        parser.error("Choose an output path different from the base game.")
    if args.base:
        base = args.base.read_bytes()
    else:
        with urlopen(BASE_URL, timeout=120) as response:
            base = response.read()
    result = build(base)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_path = tempfile.mkstemp(dir=args.output.parent)
    try:
        with os.fdopen(descriptor, "wb") as temp:
            temp.write(result)
        os.replace(temp_path, args.output)
    finally:
        Path(temp_path).unlink(missing_ok=True)
    print(f"Built SUHANAYAN {VERSION} at {args.output}")


if __name__ == "__main__":
    main()
