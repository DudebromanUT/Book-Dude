#!/usr/bin/env python3
"""Fill in each book's Open Library reader rating in docs/books.csv.

Adds or refreshes four columns:
  ol_work     the Open Library work (OL...W), the one chosen for the book's cover in scripts/covers.json
  ol_rating   average reader rating out of 5, two decimals (blank when nobody has rated it)
  ol_ratings  how many readers rated it
  ol_checked  the day the rating was fetched

Ratings change slowly; run this now and then, then run python3 scripts/build.py.
Needs Python 3 with Pillow (shared with covers.py) and an internet connection.

Usage: python3 scripts/ratings.py
"""
import datetime
import json
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build   # noqa: E402  (reads and writes books.csv the same way the build does)
import covers  # noqa: E402  (finds a book's Open Library work the same way the covers did)

COLUMNS = ['ol_work', 'ol_rating', 'ol_ratings', 'ol_checked']


def get_json(url):
    """Fresh every run (ratings change), unlike the cover lookups, which are cached."""
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': covers.AGENT})
            return json.loads(urllib.request.urlopen(req, timeout=40).read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(10 if e.code == 429 else 2 * (attempt + 1))
        except Exception:
            time.sleep(2 * (attempt + 1))
    raise RuntimeError('could not reach Open Library: ' + url)


def work_for(row, choices):
    choice = choices.get(row['book_id'], {})
    if choice.get('work'):
        return choice['work']
    if row.get('ol_work'):
        return row['ol_work']
    works = covers.find_works(row)
    return works[0]['key'].rsplit('/', 1)[-1] if works else ''


def main():
    fields, rows = build.read_books()
    for col in COLUMNS:
        if col not in fields:
            fields.append(col)
        for r in rows:
            r.setdefault(col, '')
    choices = json.loads(covers.CHOICES.read_text(encoding='utf-8')) if covers.CHOICES.exists() else {}
    covers.CACHE.mkdir(exist_ok=True)
    today = datetime.date.today().isoformat()
    lock, done = threading.Lock(), [0]

    def rate(r):
        try:
            work = work_for(r, choices)
            summary = (get_json(f'{covers.OL}/works/{work}/ratings.json') or {}).get('summary', {}) if work else {}
        except Exception as e:  # Leave the old values; the next run tries again.
            print(f'  ! {r["title"]}: {e}', file=sys.stderr)
            return
        count = int(summary.get('count') or 0)
        r['ol_work'] = work
        r['ol_rating'] = f'{summary["average"]:.2f}' if count and summary.get('average') else ''
        r['ol_ratings'] = str(count) if work else ''
        r['ol_checked'] = today
        with lock:
            done[0] += 1
            if done[0] % 50 == 0:
                print(f'  {done[0]} of {len(rows)}', flush=True)

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(rate, rows))
    build.CSV_PATH.write_text(build.csv_text(fields, rows), encoding='utf-8', newline='')
    rated = [r for r in rows if r['ol_rating']]
    solid = [r for r in rated if int(r['ol_ratings']) >= 5]
    print(f'{len(rated)} of {len(rows)} books have an Open Library rating; {len(solid)} have 5 or more ratings.')
    print('Run python3 scripts/build.py to add them to the app.')


if __name__ == '__main__':
    main()
