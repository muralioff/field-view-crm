#!/usr/bin/env python3
"""Content keys: bring the PM's edits into content/strings.json.

  python3 tools/sync_strings.py pull    # content/strings.csv → content/strings.json
  python3 tools/sync_strings.py csv     # content/strings.json → content/strings.csv (to import into the sheet)

The PM edits a Zoho Sheet with the columns key | text | where it appears |
notes. Export it as CSV (UTF-8), replace content/strings.csv, run `pull`,
and refresh the page.

`pull` only changes keys the page already has. A row whose text is empty,
or uses a {placeholder} the page does not fill, keeps the current text and is
reported instead.

Keys the page has but the sheet lacks (new UI added since the sheet was
made) are written to content/strings-new.csv, rows only with no header:
paste them below the last row of the sheet, so the PM's edits are never overwritten by a fresh
import. Keys the sheet has but the page no longer uses are listed so their
rows can be deleted from the sheet.
"""
import csv, io, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STRINGS = ROOT / 'content' / 'strings.json'
CSV = ROOT / 'content' / 'strings.csv'
NEW = ROOT / 'content' / 'strings-new.csv'
COLUMNS = ['key', 'text', 'where it appears', 'notes']

placeholders = lambda s: set(re.findall(r'\{(\w+)\}', s))


def load():
    return json.loads(STRINGS.read_text(encoding='utf-8'))


def save(strings):
    STRINGS.write_text(json.dumps(strings, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def read_sheet(text):
    """key → {text, where, notes}. A real CSV parser: values hold commas,
    quotes, curly quotes and line breaks."""
    rows = csv.DictReader(io.StringIO(text, newline=''))
    head = {(h or '').strip().lower(): h for h in rows.fieldnames or []}
    if 'key' not in head or 'text' not in head:
        sys.exit(f'The sheet has no "key" and "text" columns (found: {list(head)}). Nothing changed.')
    col = lambda r, name: (r.get(head[name]) or '') if name in head else ''
    out = {}
    for r in rows:
        key = col(r, 'key').strip()
        if key:
            out[key] = {'text': col(r, 'text'), 'where': col(r, 'where it appears'), 'notes': col(r, 'notes')}
    return out


def pull():
    if not CSV.is_file():
        sys.exit(f'No {CSV.relative_to(ROOT)} to read. Nothing changed.')
    strings = load()
    sheet = read_sheet(CSV.read_text(encoding='utf-8-sig'))

    # A sheet that lost most of its rows is more likely broken than edited
    found = sum(1 for k in strings if k in sheet)
    if found < len(strings) / 2:
        sys.exit(f'The sheet has only {found} of {len(strings)} keys — not syncing. Check the exported file.')

    changed, missing, empty, bad = [], [], [], []
    for key, entry in strings.items():
        row = sheet.get(key)
        if row is None:
            missing.append(key); continue
        text = row['text']
        if not text.strip():
            empty.append(key); continue
        extra = placeholders(text) - placeholders(entry['text'])
        if extra:
            bad.append(f"{key} (unknown {', '.join('{' + x + '}' for x in sorted(extra))})"); continue
        new = dict(entry, text=text,
                   where=row['where'].strip() or entry['where'],
                   notes=row['notes'].strip() or entry['notes'])
        if new != entry:
            strings[key] = new
            if text != entry['text']:
                changed.append(f'{key}: {entry["text"]!r} → {text!r}')
    unknown = [k for k in sheet if k not in strings]

    def report(title, items):
        if items:
            print(f'{title} ({len(items)}):')
            for i in items: print(f'  {i}')
    report('Text changed', changed)
    report('New keys, not in the sheet yet — add the rows from content/strings-new.csv', missing)
    report('Empty in the sheet, kept as is', empty)
    report('Uses a placeholder the page does not fill, kept as is', bad)
    report('In the sheet but no longer used by the page — delete these rows from the sheet', unknown)

    if missing:
        write_csv(NEW, {k: strings[k] for k in missing}, header=False)   # rows only, to paste as they are
        print(f'Wrote {len(missing)} new rows to {NEW.relative_to(ROOT)}.')
    elif NEW.exists():
        NEW.unlink()

    if strings != load():
        save(strings)
        print(f'Updated {STRINGS.relative_to(ROOT)}.')
    else:
        print('Already up to date.')


def write_csv(path, strings, header=True):
    with path.open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        if header: w.writerow(COLUMNS)
        for key, e in strings.items():
            w.writerow([key, e['text'], e['where'], e['notes']])


def to_csv():
    strings = load()
    write_csv(CSV, strings)
    print(f'Wrote {len(strings)} keys to {CSV.relative_to(ROOT)}.')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'pull': pull()
    elif cmd == 'csv': to_csv()
    else: sys.exit(__doc__)
