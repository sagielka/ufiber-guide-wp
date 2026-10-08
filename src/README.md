# Source for the UFIBER Guide app

`assets/app/ufiber-guide.html` is **generated**. Edit the files here and rebuild:

    python3 src/build.py            # writes assets/app/ufiber-guide.html
    python3 src/build.py --check    # verifies the built file matches these sources

The guide is one self-contained page on purpose: no build step on the server, no
external requests, and it works with no connection. That is why the images, the
case library and the offline model are embedded rather than fetched.

## What is where

| file | what it holds |
|---|---|
| `shell.html` | the page skeleton; `@@TOKENS@@` are filled by the build |
| `styles.css` | all styling |
| `engine.js` | data tables, item numbers, and the recommendation |
| `sf.js` | speeds and feeds per material row |
| `ui1.js` … `ui8.js` | the interface, in load order |
| `nlu.js` | the offline domain model (runs `model_block.txt`) |
| `usage.js` | structured usage events and deliberate sharing |
| `msg.js` | Outlook `.msg` reader |
| `share.js` | packing a setup into a link |
| `embed.js` | postMessage handshake used only inside the WordPress iframe |
| `heroimg_block.txt` | product photos, base64 |
| `cases_block.txt` | the tested-application library |
| `model_block.txt` | the trained offline model, quantised |

## Rules worth keeping

- **Numbers stay in the engine.** `engine.js` and `sf.js` own speeds, feeds and
  item numbers. The AI layer reads language and explains; it never invents a
  figure. Breaking that is how the guide starts sounding confident and wrong.
- **Nothing is fetched at runtime** except what the host page passes in.
- **Bump `APP_VERSION` in `ui1.js`** with every release so the footer, the
  printed sheet and the offline cache all agree.
