# Tests

    python3 tests/run.py

Everything in one command. PHP and the browser are skipped with a note if their
tools are missing, so the suite still reports something useful anywhere.

## What is covered, and why

Each case here is a bug that reached a user, or a behaviour that broke while
fixing one. That is the whole selection rule: no case is here because it was
easy to write.

| file | covers |
|---|---|
| `engine.test.js` | reading a customer's words into a job, and the item numbers that come out |
| `key.test.php` | storing the API key, and every way a paste actually arrives |
| `spend.test.php` | counting what the AI actually cost, and refusing to invent a price |
| `browser.test.py` | the page as a person meets it, with the AI endpoint mocked |

The build check in `run.py` is the quiet one that matters most: it fails if
`assets/app/ufiber-guide.html` is not exactly what `src/` produces. Editing the
generated file instead of the source is otherwise invisible until a later
release silently throws the change away.

## Cases worth keeping

- **A customer's tool is not their part.** "a 3/8 inch hone with ceramic
  abrasive fiber" once set the workpiece material to carbide and the bore to
  203 mm, because 3/8 was read as 8 inches.
- **A signature is not a job.** A +420 phone number read as 420 stainless, and
  a cncbastards.cz address as a CNC machine.
- **A paste is never clean.** Curly quotes, zero-width characters, a wrapped
  line, a whole `define(...)` line, a byte that is not valid UTF-8 — every one
  of these refused a valid key at some point.
- **The error message is not a key.** Removing all validation once let the
  message displayed above the field be saved as the key.
- **Nothing is sent unless the site asks for it.** The standalone and offline
  copies make no requests at all.

## Adding a case

Fix the bug first, then add the case that would have caught it, and give it a
name that says what should be true rather than what the code does — `a +420
phone number is not 420 stainless` rather than `test scrubContact`.
