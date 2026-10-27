# Brief: content keys for the Beat Planner prototype

Paste this whole file into a new Claude Code chat opened in
`~/Projects/Beat Planner HTML/field-view-crm`.

## Goal

Product management should own the UI copy, so copy changes stop interrupting
development. Every user-facing string becomes a named key whose text lives in
a sheet the PM edits. The user exports that sheet as CSV, replaces
`content/strings.csv`, and refreshes; no code edit is needed.

## The project

- Vanilla HTML/CSS/JS prototype. No build step, no framework.
- Served by Python's http.server, configured in `.claude/launch.json` as
  "beat-planner" on port 4321. Use the preview tools to run and check it.
- Main page in scope: `beat-detail.html` + `src/beat-detail.js` (~2,400 lines)
  + `src/style-beat-detail.css`. Shared components hold their own text:
  `src/time-picker.js`, `src/record-picker.js`, `src/select-menu.js`,
  `src/sidebar.js`, `src/address-icons.js`.
- Text appears in three places:
  1. static HTML (labels, buttons, dialog titles, placeholders, aria-labels,
     tooltips in data-tip)
  2. JS template strings (toasts, dialog titles, validation messages, tags,
     banners, day summaries)
  3. component scripts (placeholders like "Select Record", "None", "Search",
     "No records found", "min")
- Many strings carry data, e.g. `Route optimized for ${day.label} - ${day.date}.`
  and `Cancel “${visit.name}”`.

## Agreed design (manual export, decided)

The PM edits a Zoho Sheet. When copy changes, the user exports it as CSV and
replaces the file in the project by hand. **No live fetch from Zoho.**

1. **One strings file in the repo: `content/strings.csv`**, with columns
   `key,text,where,notes`. The page fetches it from its own server at load
   (same origin, so no CORS issues; it needs http, not file://) and parses it
   with a real CSV parser (quoted values, commas, quotes, line breaks, UTF-8).
   Render only after the strings load, so there is no flash of placeholder
   text.
2. **A missing or blank key** renders as `[the.key]` and logs a
   `console.warn`, so a broken edit shows up in review instead of hiding.
3. **Named placeholders** in the text, e.g.
   `beatDetail.toast.routeOptimized = Route optimized for {day}.`, filled by
   a `t(key, vars)` helper. The PM can reword around a placeholder without
   breaking it.
4. **Static HTML** gets `data-t="key"`, plus `data-t-attr="placeholder|aria-label|title|data-tip"`
   where the text is an attribute. A small applier fills these at load.
5. **Key naming:** `screen.area.element.purpose`, e.g.
   `beatDetail.header.optimize.label`, `beatDetail.toast.routeOptimized`,
   `editVisit.duration.replanInfo`, `cancelBeat.title`.
6. **Sheet columns:** `key | text | where it appears | notes`.
   "Where it appears" names the screen and element in plain words.
7. **"Show content keys" switch** in the page's existing "Simulate today"
   panel (`#bd-sim-panel`). When on, hovering any keyed text shows its key in
   the page's tooltip, so the PM can find keys alone.
8. **Check script before replacing the file** (`tools/check-strings`, run
   with python3 and no dependencies). Given the new CSV and the current one,
   it lists keys added, removed or renamed, blank texts, and any `{placeholder}`
   that differs from the current text, so a typo in a key or in `{day}` is
   caught before the file goes in.
9. **Export rules for the PM sheet** (put them in the sheet's first notes row
   or a README): don't touch the header row or the `key` column; edit only
   `text` (and `notes`); keep `{placeholders}` as they are; export as
   CSV (UTF-8).

## Order of work

1. Build the CSV loader and parser, the `t()` helper, the `data-t` applier,
   and the missing-key rendering and warnings.
2. Move every string on Beat Detail and its components into keys. Keep the
   current wording exactly; this is extraction only, not a copy rewrite.
3. Write `content/strings.csv` (key, text, where, notes) for the user to
   import into Zoho Sheet.
4. Add the "Show content keys" switch.
5. Add the check script, and a short `content/README.md` with the
   export-and-replace steps.
6. Check in the preview that every dialog, toast, tooltip, tag and banner
   still reads the same, with no console errors. Also check a CSV with one
   key removed and one placeholder broken, to see the warnings and the
   check script catch them.

## Rules

- Work stays local. **Do not commit or push**; the user does that.
- Match the surrounding code style: comment density, naming, idioms.
- Rough estimate: 0.5 day for the loader and helpers, 1–1.5 days for
  extraction, 0.25 day for the CSV, check script and README.
