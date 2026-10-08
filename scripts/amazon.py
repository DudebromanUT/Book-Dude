#!/usr/bin/env python3
"""Fill in each book's Amazon star rating in docs/books.csv, using Amazon Scraper API
(amazonscraperapi.com, a paid service with a free starter allowance).

Adds or refreshes four columns:
  amz_asin     the Amazon product looked up (for print books, usually the 10-digit ISBN)
  amz_rating   average star rating out of 5 (blank when Amazon shows none)
  amz_ratings  how many ratings Amazon counts (across all of the book's formats)
  amz_checked  the day it was fetched

Looks a book up by its isbn10 (from isbns.py) and falls back to a title-and-author search.
Each successful lookup costs 5 credits (about $0.0009); failed lookups are free. Books checked
before are skipped unless --redo is given.

The API key is read from the AMAZON_SCRAPER_API_KEY environment variable and never written anywhere.

Usage: python3 scripts/amazon.py [--redo] [--limit N]
Then run python3 scripts/build.py.
"""
import datetime
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build   # noqa: E402
import covers  # noqa: E402

API = 'https://api.amazonscraperapi.com/api/v1/amazon/'
COLUMNS = ['amz_asin', 'amz_rating', 'amz_ratings', 'amz_checked']
NOT_THE_BOOK = re.compile(r'\b(study guide|sparknotes|cliffsnotes|summary|analysis|teacher|activity|workbook|box set|boxed set|collection|audiobook|audible)\b', re.I)


def call(path, key, **params):
    url = API + path + '?' + urllib.parse.urlencode({**params, 'api_key': key})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'BookDude/1.0'}), timeout=120) as r:
                return 200, json.loads(r.read())
        except urllib.error.HTTPError as e:
            body = e.read()[:500]
            if e.code == 429:
                time.sleep(float(e.headers.get('Retry-After') or 3))
                continue
            if e.code == 502 and b'target_unreachable' in body and attempt < 2:
                time.sleep(3)
                continue
            return e.code, body
        except Exception as e:  # Network trouble: try again, then give up on this book for now.
            time.sleep(3)
            err = e
    return 0, str(err) if 'err' in locals() else 'gave up'


def by_isbn(row, key):
    if not row.get('isbn10'):
        return None
    status, data = call('product', key, query=row['isbn10'], domain='com')
    if status == 200 and isinstance(data, dict) and data.get('title'):
        return {'asin': data.get('asin') or row['isbn10'], 'rating': data.get('rating'), 'count': data.get('reviews_count')}
    return None


def by_search(row, key):
    author = re.split(r';| and | with |illustrated by', row['author'])[0].strip()
    status, data = call('search', key, query=f'{row["title"]} {author} book', domain='com')
    if status != 200 or not isinstance(data, dict):
        return None
    for p in data.get('products', []):
        if p.get('is_sponsored'):
            continue
        title = p.get('title') or ''
        if NOT_THE_BOOK.search(title) and not NOT_THE_BOOK.search(row['title']):
            continue
        if covers.title_match(row['title'], title) or covers.title_match(row['title'], re.split(r'[(\[]', title)[0]):
            return {'asin': p.get('asin'), 'rating': p.get('rating'), 'count': p.get('reviews_count')}
    return None


def main():
    key = os.environ.get('AMAZON_SCRAPER_API_KEY', '').strip()
    if not key:
        sys.exit('Set AMAZON_SCRAPER_API_KEY (in the environment settings, not in a file).')
    args = sys.argv[1:]
    redo = '--redo' in args
    limit = int(args[args.index('--limit') + 1]) if '--limit' in args else None
    fields, rows = build.read_books()
    for col in COLUMNS:
        if col not in fields:
            fields.append(col)
        for r in rows:
            r.setdefault(col, '')
    todo = [r for r in rows if redo or not r['amz_checked']][:limit]
    today = datetime.date.today().isoformat()
    lock, stats = threading.Lock(), {'done': 0, 'found': 0}

    def save():
        build.CSV_PATH.write_text(build.csv_text(fields, rows), encoding='utf-8', newline='')

    def look(r):
        found = by_isbn(r, key) or by_search(r, key)
        with lock:
            if found:
                r['amz_asin'] = found['asin'] or ''
                r['amz_rating'] = f'{float(found["rating"]):.1f}' if found.get('rating') else ''
                r['amz_ratings'] = str(int(found['count'])) if found.get('count') else ('0' if found.get('rating') is None else '')
                stats['found'] += 1
            r['amz_checked'] = today
            stats['done'] += 1
            if stats['done'] % 50 == 0:
                save()
                print(f'  {stats["done"]} of {len(todo)}', flush=True)
        time.sleep(0.6)  # The free plan allows about 2 requests a second.

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(look, todo))
    save()
    rated = [r for r in rows if r['amz_rating']]
    print(f'Looked up {len(todo)} books; found {stats["found"]} on Amazon. {len(rated)} of {len(rows)} books have an Amazon rating.')
    print('Run python3 scripts/build.py to add them to the app.')


if __name__ == '__main__':
    main()
