#!/usr/bin/env python3
"""Content keys: bring the PM's edits into content/strings.json.

  python3 tools/sync_strings.py pull    # each page's CSV → content/strings.json
  python3 tools/sync_strings.py scan    # add keys the code uses but strings.json lacks (pull does this first)
  python3 tools/sync_strings.py csv     # content/strings.json → each page's CSV (to import into the sheet)

The PM edits a Zoho Sheet with the columns key | text | where it appears |
notes, one sheet page per screen (see PAGES): Create Beat's keys
(createBeat.*) in content/create_beat_strings.csv, everything else in
content/beat_detail_strings.csv. Export a page as CSV (UTF-8), replace its
file, run `pull`, and refresh the page.

`pull` only changes keys the page already has. A row whose text is empty,
or uses a {placeholder} the page does not fill, keeps the current text and is
reported instead.

Keys the page has but the sheet lacks (new UI added since the sheet was
made) are written to the page's *_new.csv, rows only with no header:
paste them below the last row of the sheet, so the PM's edits are never overwritten by a fresh
import. Keys the sheet has but the page no longer uses are listed so their
rows can be deleted from the sheet.
"""
import csv, io, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STRINGS = ROOT / 'content' / 'strings.json'
CONTENT = ROOT / 'content'

# One sheet page per screen: a key belongs to the first page whose prefix
# it starts with ('' takes the rest)
PAGES = [
    {'prefix': 'createBeat.', 'csv': CONTENT / 'create_beat_strings.csv', 'new': CONTENT / 'create_beat_strings_new.csv'},
    {'prefix': '',            'csv': CONTENT / 'beat_detail_strings.csv', 'new': CONTENT / 'beat_detail_strings_new.csv'},
]
page_of = lambda key: next(p for p in PAGES if key.startswith(p['prefix']))
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


def draft_text(key, names):
    """A stand-in until the PM writes it: the key's last part as words,
    with the placeholders the code fills, e.g. "Send for approval {name}"."""
    parts = key.split('.')
    if parts[-1] in ('one', 'other') and len(parts) > 2:   # a plural pair: name it by what it counts
        parts = parts[:-1]
    last = re.sub(r'([a-z])([A-Z])', r'\1 \2', parts[-1]).lower()
    return ' '.join([last[:1].upper() + last[1:]] + [f'{{{n}}}' for n in names])


def scan():
    """Keys the code uses that strings.json does not have yet get a draft
    entry, so the page never shows a raw key and the key reaches the sheet.
    Found as quoted strings in src/*.js and *.html that start like an
    existing key (so ternaries such as n === 1 ? 'x.one' : 'x.other' count).
    A component's fallback text, T('key', 'Text'), is used when there is one."""
    strings = load()
    prefixes = '|'.join(sorted({re.escape(k.split('.')[0]) for k in strings}))
    key_re = re.compile(rf"""['"`]((?:{prefixes})\.[A-Za-z0-9_.]*[A-Za-z0-9_])['"`]""")
    fallback_re = re.compile(r"""\bT\(\s*'([\w.]+)'\s*,\s*'((?:[^'\\]|\\.)*)'""")
    # The vars object after the key, also past a ternary's second key
    vars_re = re.compile(r"""'([\w.]+)'(?:\s*:\s*'([\w.]+)')?\s*\)?\s*,\s*\{([^}]*)\}""")
    found, fallbacks, names = {}, {}, {}
    for f in sorted(ROOT.glob('src/*.js')) + sorted(ROOT.glob('*.html')):
        text = f.read_text(encoding='utf-8')
        for m in key_re.finditer(text):
            found.setdefault(m.group(1), f.relative_to(ROOT))
        for m in fallback_re.finditer(text):
            fallbacks.setdefault(m.group(1), m.group(2))
        for m in vars_re.finditer(text):
            for k in filter(None, m.group(1, 2)):
                names.setdefault(k, [n for n in (part.split(':')[0].strip() for part in m.group(3).split(',')) if n.isidentifier()])
    added = []
    for key, where in found.items():
        if key in strings:
            continue
        strings[key] = {'text': fallbacks.get(key) or draft_text(key, names.get(key, [])),
                        'where': f'New — used in {where}', 'notes': 'Draft text, needs the PM\'s wording.'}
        added.append(f'{key}: {strings[key]["text"]!r}')
    if added:
        print(f'Added to strings.json with draft text ({len(added)}):')
        for a in added: print(f'  {a}')
        save(strings)
    return bool(added)


def pull():
    scan()
    for page in PAGES:
        pull_page(page)


def pull_page(page):
    CSV, NEW = page['csv'], page['new']
    strings = load()
    mine = [k for k in strings if page_of(k) is page]
    print(f'— {CSV.relative_to(ROOT)}')
    if not CSV.is_file():
        # A page not exported yet: every key is new to the sheet
        write_csv(NEW, {k: strings[k] for k in mine}, header=False)
        print(f'No sheet page yet — wrote {len(mine)} rows to {NEW.relative_to(ROOT)} to start one.')
        return
    sheet = read_sheet(CSV.read_text(encoding='utf-8-sig'))

    # A sheet that lost most of its rows is more likely broken than edited
    found = sum(1 for k in mine if k in sheet)
    if found < len(mine) / 2:
        print(f'The sheet has only {found} of {len(mine)} keys — not syncing this page. Check the exported file.')
        return

    changed, missing, empty, bad = [], [], [], []
    for key in mine:
        entry = strings[key]
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
    report(f'New keys, not in the sheet yet — add the rows from {NEW.relative_to(ROOT)}', missing)
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
    for page in PAGES:
        mine = {k: e for k, e in strings.items() if page_of(k) is page}
        write_csv(page['csv'], mine)
        print(f'Wrote {len(mine)} keys to {page["csv"].relative_to(ROOT)}.')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'pull': pull()
    elif cmd == 'scan': scan() or print('Every key the code uses is in strings.json.')
    elif cmd == 'csv': to_csv()
    else: sys.exit(__doc__)
