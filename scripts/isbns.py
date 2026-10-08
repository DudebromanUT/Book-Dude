#!/usr/bin/env python3
"""Add an ISBN for each book to docs/books.csv (columns isbn13 and isbn10).

Picks one English print edition per book from Open Library, from the same work as the book's rating
(ol_work, filled by ratings.py): the edition whose cover the app shows when it is a regular print
edition with an ISBN, otherwise a recent paperback or hardcover, from the English-language ISBN
groups that US and UK stores list (978-0, 978-1, 979-8). Audiobooks, e-books, large print,
study guides, library rebinds (Turtleback, Perma-Bound and the like) and other languages are skipped.
isbn10 is filled when the ISBN-13 starts with 978; for a print book it is usually also its Amazon
product number.

Books that already have an ISBN keep it (an ISBN typed in by hand is never replaced);
--redo picks again for every book.

Usage: python3 scripts/isbns.py [--redo]
Then run python3 scripts/build.py.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build   # noqa: E402
import covers  # noqa: E402

REBINDERS = re.compile(r'turtleback|perma.?bound|perfection learning|paw prints|demco|bound to stay bound|sagebrush|san val|'
                       r'econo.?clad|topeka|rebound|library binding|follett', re.I)
# ISBN ranges that belong to library rebinders (Turtleback, Perfection Learning, Econo-Clad, Paw Prints).
REBIND_RANGES = ('9780606', '9780613', '97807857', '97808335', '97807569', '97807807', '97814352', '97814176', '97814177')
NOT_PRINT = re.compile(r'e.?book|electronic|kindle|digital|online|audio|cd|cassette|mp3', re.I)


def isbn13_ok(s):
    return bool(re.fullmatch(r'97[89]\d{10}', s)) and sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(s)) % 10 == 0


def isbn10_ok(s):
    if not re.fullmatch(r'\d{9}[\dX]', s):
        return False
    return sum((10 - i) * (10 if c == 'X' else int(c)) for i, c in enumerate(s)) % 11 == 0


def to13(isbn10):
    core = '978' + isbn10[:9]
    check = (10 - sum(int(c) * (3 if i % 2 else 1) for i, c in enumerate(core)) % 10) % 10
    return core + str(check)


def to10(isbn13):
    if not isbn13.startswith('978'):
        return ''
    core = isbn13[3:12]
    check = (11 - sum((10 - i) * int(c) for i, c in enumerate(core)) % 11) % 11
    return core + ('X' if check == 10 else str(check))


def clean(s):
    return re.sub(r'[^0-9X]', '', str(s).upper())


def edition_isbn(ed):
    for s in map(clean, ed.get('isbn_13', [])):
        if isbn13_ok(s):
            return s
    for s in map(clean, ed.get('isbn_10', [])):
        if isbn10_ok(s):
            return to13(s)
    return ''


def pick(row, cover_edition):
    work = row.get('ol_work')
    if not work:
        return ''
    data = covers.fetch(f'{covers.OL}/works/{work}/editions.json?limit=200') or {}
    allowed = covers.norm(row['title'])
    best = None
    for ed in data.get('entries', []):
        isbn = edition_isbn(ed)
        if not isbn:
            continue
        langs = [l.get('key') for l in ed.get('languages', [])]
        if langs and '/languages/eng' not in langs:
            continue
        english_group = isbn.startswith(('9780', '9781', '9798'))
        if not english_group and '/languages/eng' not in langs:
            continue  # Probably a translation with no language listed.
        title = ed.get('title', '') + (': ' + ed['subtitle'] if ed.get('subtitle') else '')
        if not covers.title_match(row['title'], title) and not covers.title_match(row['title'], ed.get('title', '')):
            continue
        fmt = ed.get('physical_format', '') or ''
        publishers = ' '.join(ed.get('publishers', []))
        text = covers.norm(' '.join([title, ed.get('edition_name', ''), fmt, publishers]))
        if NOT_PRINT.search(fmt) or any(not re.search(r'\b' + m.group(0) + r'\b', allowed) for m in covers.NOT_THE_BOOK.finditer(text)):
            continue
        score = 0
        # ISBNs from the English-language groups (978-0, 978-1, and 979-8 in the US) are the ones US and UK stores list.
        if english_group:
            score += 30
        else:
            score -= 20
        if isbn.startswith(REBIND_RANGES):
            score -= 40
        if ed['key'].rsplit('/', 1)[-1] == cover_edition:
            score += 25
        if REBINDERS.search(publishers):
            score -= 40
        if re.search(r'paper', fmt, re.I):
            score += 12
        elif re.search(r'hard|cloth', fmt, re.I):
            score += 8
        year = covers.year_of(ed.get('publish_date'))
        if year:
            score += max(0, min(year, 2026) - 1970) / 2
        if best is None or score > best[0]:
            best = (score, isbn)
    return best[1] if best else ''


def main():
    redo = '--redo' in sys.argv[1:]
    fields, rows = build.read_books()
    for col in ('isbn13', 'isbn10'):
        if col not in fields:
            fields.insert(fields.index('title') + 2 if col == 'isbn13' else fields.index('isbn13') + 1, col)
        for r in rows:
            r.setdefault(col, '')
    choices = json.loads(covers.CHOICES.read_text(encoding='utf-8')) if covers.CHOICES.exists() else {}
    covers.CACHE.mkdir(exist_ok=True)
    for i, r in enumerate(rows, 1):
        if r['isbn13'] and not redo:
            continue
        try:
            isbn = pick(r, choices.get(r['book_id'], {}).get('edition', ''))
        except Exception as e:
            print(f'  ! {r["title"]}: {e}', file=sys.stderr)
            continue
        r['isbn13'], r['isbn10'] = isbn, to10(isbn) if isbn else ''
        if i % 100 == 0:
            print(f'  {i} of {len(rows)}', flush=True)
    build.CSV_PATH.write_text(build.csv_text(fields, rows), encoding='utf-8', newline='')
    have = [r for r in rows if r['isbn13']]
    print(f'{len(have)} of {len(rows)} books have an ISBN.')
    missing = [r['title'] for r in rows if not r['isbn13']]
    if missing:
        print('No ISBN found for: ' + '; '.join(missing))
    print('Run python3 scripts/build.py to add them to the app.')


if __name__ == '__main__':
    main()
