#!/usr/bin/env python3
"""Build the Reading Room's generated files.

Reads docs/books.csv (and the cover choices in scripts/covers.json) and writes:
  docs/catalog.js  the public book catalog the app loads
  docs/sw.js       the offline service worker, versioned by a hash of every app asset and cover

Books without a book_id get a new, unique one written back into books.csv.
Existing IDs are never changed; personal records are keyed by them.

Usage:
  python3 scripts/build.py           regenerate files
  python3 scripts/build.py --check   fail if generated files are out of date (CI)
"""
import csv
import hashlib
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'
CSV_PATH = DOCS / 'books.csv'
CATALOG_PATH = DOCS / 'catalog.js'
SW_PATH = DOCS / 'sw.js'
SW_TEMPLATE = ROOT / 'scripts' / 'sw.template.js'
COVERS_JSON = ROOT / 'scripts' / 'covers.json'
COVER_NAME = re.compile(r'^[0-9a-f]{12}\.webp$')
COVER_SHAPES = {'tall', 'short', 'square', 'wide'}  # Must match the shape classes in docs/styles.css.

# Everything the installed app needs offline. sw.js is the worker itself and is never cached.
ASSETS = [
    'index.html',
    'styles.css',
    'core.js',
    'dude.js',
    'pets.js',
    'app.js',
    'catalog.js',
    'manifest.webmanifest',
    'img/dude.jpg',
    'img/dude-face.jpg',
    'img/dog.jpg',
    'img/cat.jpg',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.jpg',
    'icons/icon-maskable-512.jpg',
]

REQUIRED = ['book_id', 'award', 'category', 'year', 'title', 'author', 'description', 'ar_points']
DROPPED = {'image'}  # The app never requests remote images.
# Always present in the catalog; other blank fields are left out to keep the download small.
ALWAYS = {'book_id', 'award', 'category', 'year', 'title', 'author', 'description', 'ar_points'}
URL_FIELDS = ['description_source', 'ar_source', 'selection_source', 'ar_research_source']
ID_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')
NUMBER_RE = re.compile(r'^\d+(\.\d+)?$')
CUSTOM_PREFIX = 'mine:'  # Must match CUSTOM_PREFIX in docs/core.js.


def slug(text, limit):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text[:limit].rstrip('-') or 'book'


def fail(errors):
    print('Build stopped. Fix these in docs/books.csv:', file=sys.stderr)
    for e in errors[:50]:
        print('  - ' + e, file=sys.stderr)
    if len(errors) > 50:
        print(f'  ...and {len(errors) - 50} more', file=sys.stderr)
    sys.exit(1)


def read_books():
    with CSV_PATH.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or [])
        rows = [dict(r) for r in reader]
    if 'book_id' not in fields:
        fields.insert(0, 'book_id')
    for r in rows:
        if None in r:
            fail([f'Row "{r.get("title", "?")}" has more cells than there are column headings.'])
        for k in fields:
            r[k] = (r.get(k) or '').strip()
    missing = [c for c in REQUIRED if c not in fields]
    if missing:
        fail([f'Missing column: {c}' for c in missing])
    return fields, rows


def assign_ids(rows):
    used = {r['book_id'] for r in rows if r['book_id']}
    added = 0
    for r in rows:
        if r['book_id']:
            continue
        base = slug(r['title'], 60) + '--' + slug(r['author'], 40)
        candidate, n = base, 2
        while candidate in used:
            candidate, n = f'{base}-{n}', n + 1
        r['book_id'] = candidate
        used.add(candidate)
        added += 1
    return added


def validate(rows):
    errors, seen = [], {}
    for i, r in enumerate(rows, start=2):
        where = f'line {i} ({r["title"] or "untitled"})'
        bid = r['book_id']
        if not ID_RE.match(bid) or bid in ('__proto__', 'constructor', 'prototype'):
            errors.append(f'{where}: book_id "{bid}" may only use letters, numbers, . _ : -')
        if bid.startswith(CUSTOM_PREFIX):
            errors.append(f'{where}: book_id "{bid}" cannot start with "{CUSTOM_PREFIX}" (reserved for books added in the app)')
        if bid in seen:
            errors.append(f'{where}: book_id "{bid}" is already used on line {seen[bid]}')
        seen[bid] = i
        if not r['title']:
            errors.append(f'{where}: title is blank')
        if not r['description']:
            errors.append(f'{where}: description is blank')
        if r['year'] and not re.match(r'^\d{3,4}$', r['year']):
            errors.append(f'{where}: year "{r["year"]}" is not a year')
        for k in ('ar_points', 'ar_level', 'score'):
            if r.get(k) and not NUMBER_RE.match(r[k]):
                errors.append(f'{where}: {k} "{r[k]}" is not a number (leave it blank if unknown)')
        if r['ar_points'] and not r.get('ar_source'):
            errors.append(f'{where}: ar_points needs an ar_source link')
        for k in URL_FIELDS:
            for url in filter(None, (u.strip() for u in r.get(k, '').split(';'))):
                if not url.startswith('https://') and not url.startswith('http://'):
                    errors.append(f'{where}: {k} must be web links, got "{url}"')
    if errors:
        fail(errors)


def csv_text(fields, rows):
    out = io.StringIO(newline='')
    writer = csv.DictWriter(out, fieldnames=fields, lineterminator='\r\n')
    writer.writeheader()
    writer.writerows(rows)
    return '﻿' + out.getvalue()


def read_covers(rows):
    """Cover art chosen by scripts/covers.py: {book_id: (file, Open Library id, shape)}."""
    if not COVERS_JSON.exists():
        return {}
    choices = json.loads(COVERS_JSON.read_text(encoding='utf-8'))
    ids = {r['book_id'] for r in rows}
    covers, errors = {}, []
    for bid, c in choices.items():
        name = c.get('file')
        if bid not in ids or not name:
            continue
        shape = c.get('shape', 'tall')
        if not COVER_NAME.match(name):
            errors.append(f'scripts/covers.json: "{name}" for {bid} is not a cover file name')
        elif shape not in COVER_SHAPES:
            errors.append(f'scripts/covers.json: shape "{shape}" for {bid} is not one of {", ".join(sorted(COVER_SHAPES))}')
        elif not (DOCS / 'covers' / name).exists():
            errors.append(f'scripts/covers.json: docs/covers/{name} for {bid} is missing (run python3 scripts/covers.py --redo {bid})')
        else:
            covers[bid] = (name, c.get('edition') or c.get('work') or '', shape)
    if errors:
        fail(errors)
    return covers


def catalog_text(fields, rows, covers):
    keep = [f for f in fields if f not in DROPPED]
    def entry(r):
        e = {k: r[k] for k in keep if r[k] or k in ALWAYS}
        if r['book_id'] in covers:
            e['cover'], ol, shape = covers[r['book_id']]
            if ol:
                e['cover_ol'] = ol
            if shape != 'tall':
                e['cover_shape'] = shape
        return e
    lines = [json.dumps(entry(r), ensure_ascii=False, separators=(',', ':')) for r in rows]
    return ('/* Generated by scripts/build.py from books.csv. Do not edit by hand. */\n'
            'window.READING_CATALOG=[\n' + ',\n'.join(lines) + '\n];\n')


def sw_text(catalog, covers):
    digest = hashlib.sha256()
    for path in ASSETS:
        data = catalog.encode() if path == 'catalog.js' else (DOCS / path).read_bytes()
        digest.update(path.encode() + b'\0' + data + b'\0')
    # Cover file names are hashes of the pictures, so the names alone version them.
    cover_paths = sorted({'covers/' + c[0] for c in covers.values()})
    digest.update(json.dumps(cover_paths).encode())
    version = digest.hexdigest()[:12]
    template = SW_TEMPLATE.read_text(encoding='utf-8')
    text = template.replace("'__VERSION__'", json.dumps(version)).replace('__ASSETS__', json.dumps(ASSETS))
    return text.replace('__COVERS__', json.dumps(cover_paths, separators=(',', ':'))), version


def main():
    check = '--check' in sys.argv[1:]
    missing = [p for p in ASSETS if p != 'catalog.js' and not (DOCS / p).exists()]
    if missing:
        fail([f'Missing app file docs/{p}' for p in missing])
    fields, rows = read_books()
    added = assign_ids(rows)
    validate(rows)
    covers = read_covers(rows)
    outputs = {CATALOG_PATH: catalog_text(fields, rows, covers)}
    outputs[SW_PATH], version = sw_text(outputs[CATALOG_PATH], covers)
    if added:
        outputs[CSV_PATH] = csv_text(fields, rows)

    if check:
        stale = [p for p, text in outputs.items() if not p.exists() or p.read_bytes().decode('utf-8') != text]
        if stale:
            print('Out of date: ' + ', '.join(str(p.relative_to(ROOT)) for p in stale) + '. Run python3 scripts/build.py', file=sys.stderr)
            sys.exit(1)
        print(f'Up to date: {len(rows)} books, offline version {version}')
        return

    for path, text in outputs.items():
        path.write_text(text, encoding='utf-8', newline='')
    with_points = sum(1 for r in rows if r['ar_points'])
    print(f'{len(rows)} books ({with_points} with AR points, {len(rows) - with_points} unresolved, {len(covers)} with cover art)')
    unused = sorted(f.name for f in (DOCS / 'covers').glob('*.webp') if f.name not in {c[0] for c in covers.values()})
    if unused:
        print(f'{len(unused)} file(s) in docs/covers are not used by any book; running python3 scripts/covers.py removes them')
    if added:
        print(f'Assigned {added} new book_id value(s) in docs/books.csv')
    print(f'Offline version {version}')


if __name__ == '__main__':
    main()
