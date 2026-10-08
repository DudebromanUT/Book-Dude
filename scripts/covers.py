#!/usr/bin/env python3
"""Find real cover art for the catalog and keep small copies in docs/covers/.

Looks each book up on Open Library (openlibrary.org, run by the Internet Archive), picks an
English-language edition with real cover art, and saves a 280-pixel-wide WebP copy named by a
hash of its contents. Every choice is kept in scripts/covers.json, which build.py reads to add
covers to the catalog and the offline cache. Only this script contacts Open Library; the app
loads covers from its own site like any other file.

Needs Python 3 with Pillow (pip install Pillow) and an internet connection. Downloads are kept
in scripts/.cover-cache/ so running it again is quick.

Usage:
  python3 scripts/covers.py                  find covers for books without a decision yet
  python3 scripts/covers.py --redo ID ...    look these books up again
  python3 scripts/covers.py --use ID NUMBER  use Open Library cover NUMBER for this book
  python3 scripts/covers.py --none ID ...    keep the generated cover for these books
Then run python3 scripts/build.py.
"""
import csv
import difflib
import hashlib
import io
import json
import re
import statistics
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / 'docs' / 'books.csv'
COVERS_DIR = ROOT / 'docs' / 'covers'
CHOICES = ROOT / 'scripts' / 'covers.json'
CACHE = ROOT / 'scripts' / '.cover-cache'
OL = 'https://openlibrary.org'
IMAGE = 'https://covers.openlibrary.org/b/id/{}-L.jpg?default=false'
AGENT = 'BookDude/1.0 (family reading app; https://github.com/DudebromanUT/Book-Dude)'
QUALITY = 70
# Covers keep roughly their real shape, so a picture book stands on the shelf like a picture book.
SHAPES = {'tall': (280, 420), 'short': (280, 350), 'square': (280, 280), 'wide': (280, 210)}
STOP = {'the', 'a', 'an', 'of', 'and'}
# Words that mark an edition as something other than the book itself, unless the catalog title says so.
NOT_THE_BOOK = re.compile(r'\b(movie|film|tie in|motion picture|netflix|now a major|screenplay|adaptation|adapted|retold|abridged|'
                          r'graphic novel|study guide|sparknotes|cliffsnotes|summary|teacher s guide|activity book|coloring|'
                          r'audio|audiobook|cassette|cd|braille|large print|sound recording)\b')

lock = threading.Lock()


def norm(text):
    text = re.sub(r"['’‘`]", '', text or '')  # O'Dell and O’Dell both become odell
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower().replace('&', ' and ')
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def words(text):
    return set(norm(text).split()) - STOP


def main_title(title):
    return re.split(r'[:(]', title)[0]


def surnames(author):
    names = re.split(r';|,| and | with |illustrated by', author or '')
    return {norm(n).split()[-1] for n in names if norm(n)}


def title_match(catalog, other):
    """2 = same title, 1 = close enough (subtitle added or dropped, small typo), 0 = something else."""
    full, main, theirs = norm(catalog), norm(main_title(catalog)), norm(other)
    if theirs in (full, main):
        return 2
    want = words(main_title(catalog)) or set(full.split())
    if want and want <= words(other) and (theirs.startswith(main) or difflib.SequenceMatcher(None, main, norm(main_title(other))).ratio() >= 0.6):
        return 1
    if difflib.SequenceMatcher(None, full, theirs).ratio() >= 0.88:
        return 1
    return 0


# ---------- Network, with a local cache ----------

def fetch(url, binary=False):
    key = CACHE / (hashlib.sha1(url.encode()).hexdigest() + ('.bin' if binary else '.json'))
    if key.exists():
        data = key.read_bytes()
        return None if data == b'404' else (data if binary else json.loads(data))
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': AGENT})
            data = urllib.request.urlopen(req, timeout=40).read()
            key.write_bytes(data)
            return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                key.write_bytes(b'404')
                return None
            time.sleep(10 if e.code == 429 else 2 * (attempt + 1))
        except Exception:
            time.sleep(2 * (attempt + 1))
    raise RuntimeError('could not reach Open Library: ' + url)


# ---------- Finding the book and its editions ----------

def squash(text):
    return norm(text).replace(' ', '')


def find_works(book):
    """Open Library works that could be this book, best match first.

    Searches by title and author, and by edition, which also finds books filed under another title
    (Dragon Rider is under its German title, Drachenreiter). Among the matches, the work with the
    most editions comes first: duplicates and stray records usually have only one or two.
    """
    title, author = book['title'], book['author']
    # Open Library finds "H. G. Wells" but not "H.G. Wells".
    first = re.sub(r'\.(?=\S)', '. ', re.split(r';| and | with |illustrated by', author)[0].strip())
    last = (sorted(surnames(author), key=len) or [''])[-1]
    fields = 'key,title,subtitle,author_name,cover_i,cover_edition_key,edition_count,editions,editions.key,editions.title'
    searches = [{'title': title, 'author': first}, {'title': main_title(title), 'author': last}, {'q': main_title(title).strip() + ' ' + first, 'lang': 'en'}]
    # "DeJong" and "De Jong" are the same author.
    names = {squash(n) for n in surnames(author)}
    # "March: Book Three" must not match plain "March".
    volume = re.search(r':.*\b(book|volume|vol|part)\b', title, re.I)
    ranked, seen = [], set()
    for params in searches:
        for doc in (fetch(OL + '/search.json?' + urllib.parse.urlencode({**params, 'fields': fields, 'limit': 10})) or {}).get('docs', []):
            if doc.get('key') in seen:
                continue
            seen.add(doc.get('key'))
            by = squash(' '.join(doc.get('author_name', [])))
            if names and not any(n in by for n in names):
                continue
            full = doc.get('title', '') + (': ' + doc['subtitle'] if doc.get('subtitle') else '')
            eds = (doc.get('editions') or {}).get('docs', [])
            ed_title = eds[0].get('title', '') if eds else ''
            if volume and not any(words(title) <= words(t) for t in (full, ed_title)):
                continue
            match = max(title_match(title, doc.get('title', '')), title_match(title, full), title_match(title, ed_title) if ed_title else 0)
            if match:
                ranked.append(((match, doc.get('edition_count', 0), bool(doc.get('cover_i'))), doc))
    return [doc for _, doc in sorted(ranked, key=lambda r: r[0], reverse=True)][:3]


def year_of(text):
    m = re.search(r'(1[5-9]\d\d|20\d\d)', text or '')
    return int(m.group(1)) if m else None


def candidates(book, work):
    """Every edition cover worth trying, best first."""
    data = fetch(OL + work['key'] + '/editions.json?limit=200') or {}
    editions = data.get('entries', [])
    work_cover = work.get('cover_i')
    allowed = norm(book['title'])
    seen, out = set(), []
    for ed in editions:
        covers = [c for c in ed.get('covers', []) if isinstance(c, int) and c > 0]
        if not covers:
            continue
        langs = [l.get('key') for l in ed.get('languages', [])]
        if langs and '/languages/eng' not in langs:
            continue
        notes = ed.get('notes')
        notes = notes.get('value', '') if isinstance(notes, dict) else (notes or '')
        text = norm(' '.join([ed.get('title', ''), ed.get('subtitle', ''), ed.get('edition_name', ''), ed.get('physical_format', ''), ' '.join(ed.get('publishers', [])), notes[:300]]))
        score = 0
        if covers[0] == work_cover:
            score += 30
        if any(not re.search(r'\b' + m.group(0) + r'\b', allowed) for m in NOT_THE_BOOK.finditer(text)):
            score -= 60
        title = ed.get('title', '') + (': ' + ed['subtitle'] if ed.get('subtitle') else '')
        if not title_match(book['title'], title) and not title_match(book['title'], ed.get('title', '')):
            score -= 100  # Another book, or the same book under another language's title.
        year = year_of(ed.get('publish_date'))
        if year:
            score += max(0, min(year, 2024) - 1960) / 4
        seen.add(covers[0])
        out.append((score, covers[0], ed['key'].rsplit('/', 1)[-1]))
    if work_cover and work_cover not in seen:
        out.append((25, work_cover, work.get('cover_edition_key')))
    out.sort(key=lambda c: -c[0])
    return [c for c in out if c[0] > -40] or out[:2]


# ---------- Judging and shrinking the picture ----------

def trim(im):
    """Cut off plain scanner borders around the cover, if any."""
    bg = Image.new('RGB', im.size, im.getpixel((2, 2)))
    box = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 24 else 0).getbbox()
    if box and (box[2] - box[0]) > im.width * 0.75 and (box[3] - box[1]) > im.height * 0.75:
        return im.crop(box)
    return im


def shape_of(ratio):
    """Height divided by width -> the closest cover shape, or None for a strip or a sliver."""
    if 1.38 <= ratio <= 1.85:
        return 'tall'
    if 1.15 <= ratio < 1.38:
        return 'short'
    if 0.88 <= ratio < 1.15:
        return 'square'
    if 0.6 <= ratio < 0.88:
        return 'wide'
    return None


def judge(data):
    im = trim(Image.open(io.BytesIO(data)).convert('RGB'))
    w, h = im.size
    shape = shape_of(h / w)
    small = im.resize((64, 96))
    gray = small.convert('L')
    spread = ImageStat.Stat(gray).stddev[0]
    edges = ImageStat.Stat(gray.filter(ImageFilter.FIND_EDGES)).mean[0]
    hard, soft = [], []
    if not shape:
        hard.append('odd shape')
    if spread < 20 and edges < 20:
        hard.append('plain binding')
    if w < 180:
        soft.append('small picture')
    raw = small.tobytes()
    pixels = list(zip(raw[0::3], raw[1::3], raw[2::3]))
    rg = [r - g for r, g, b in pixels]
    yb = [(r + g) / 2 - b for r, g, b in pixels]
    if (statistics.pstdev(rg) ** 2 + statistics.pstdev(yb) ** 2) ** .5 < 10:
        soft.append('no color')
    return im, shape, hard, soft


def thumbnail(im, shape):
    width, height = SHAPES[shape]
    w, h = im.size
    if h / w > height / width:
        cut = round(w * height / width)
        im = im.crop((0, (h - cut) // 2, w, (h - cut) // 2 + cut))
    else:
        cut = round(h * width / height)
        im = im.crop(((w - cut) // 2, 0, (w - cut) // 2 + cut, h))
    if im.width > width:
        im = im.resize((width, height), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, 'WEBP', quality=QUALITY, method=6)
    data = out.getvalue()
    name = hashlib.sha256(data).hexdigest()[:12] + '.webp'
    (COVERS_DIR / name).write_bytes(data)
    return name


def choose(book, forced=None):
    if forced:
        data = fetch(IMAGE.format(forced), binary=True)
        if not data:
            return {'file': None, 'pick': 'none', 'why': f'Open Library has no cover {forced}'}
        im, shape, hard, soft = judge(data)
        shape = shape or ('wide' if im.height < im.width else 'tall')
        choice = {'file': thumbnail(im, shape), 'cover': forced, 'pick': 'chosen'}
        if shape != 'tall':
            choice['shape'] = shape
        return choice
    works = find_works(book)
    if not works:
        return {'file': None, 'pick': 'none', 'why': 'not found on Open Library'}
    for work in works:
        usable = []
        for order, (score, cover, edition) in enumerate(candidates(book, work)[:6]):
            data = fetch(IMAGE.format(cover), binary=True)
            if not data:
                continue
            im, shape, hard, soft = judge(data)
            if hard:
                continue
            usable.append(((bool(soft), shape != 'tall', order), im, shape, cover, edition, soft))
            if not soft and shape == 'tall':
                break
        if usable:
            _, im, shape, cover, edition, soft = min(usable, key=lambda u: u[0])
            choice = {'file': thumbnail(im, shape), 'cover': cover, 'edition': edition, 'work': work['key'].rsplit('/', 1)[-1], 'pick': 'auto'}
            if shape != 'tall':
                choice['shape'] = shape
            if soft:
                choice['check'] = ', '.join(soft)
            return {k: v for k, v in choice.items() if v}
    return {'file': None, 'pick': 'none', 'work': works[0]['key'].rsplit('/', 1)[-1], 'why': 'no usable cover found'}


# ---------- Bookkeeping ----------

def load_choices():
    return json.loads(CHOICES.read_text(encoding='utf-8')) if CHOICES.exists() else {}


def save_choices(choices):
    text = json.dumps(dict(sorted(choices.items())), indent=1, ensure_ascii=False) + '\n'
    CHOICES.write_text(text, encoding='utf-8')


def prune(choices):
    used = {c.get('file') for c in choices.values()}
    for f in COVERS_DIR.glob('*.webp'):
        if f.name not in used:
            f.unlink()


def main():
    args = sys.argv[1:]
    rows = list(csv.DictReader(CSV_PATH.open(encoding='utf-8-sig', newline='')))
    books = {r['book_id']: r for r in rows}
    choices = load_choices()
    COVERS_DIR.mkdir(exist_ok=True)
    CACHE.mkdir(exist_ok=True)

    if args[:1] == ['--none']:
        for bid in args[1:]:
            if bid not in books:
                sys.exit(f'No book with book_id {bid}')
            choices[bid] = {'file': None, 'pick': 'none', 'why': 'generated cover chosen'}
        save_choices(choices)
        prune(choices)
        print(f'{len(args) - 1} book(s) will keep the generated cover. Run python3 scripts/build.py')
        return
    if args[:1] == ['--use']:
        if len(args) != 3 or args[1] not in books or not args[2].isdigit():
            sys.exit('Usage: python3 scripts/covers.py --use BOOK_ID COVER_NUMBER')
        choices[args[1]] = choose(books[args[1]], int(args[2]))
        save_choices(choices)
        prune(choices)
        print(books[args[1]]['title'], '->', choices[args[1]].get('file') or choices[args[1]]['why'])
        return
    if args[:1] == ['--redo']:
        missing = [b for b in args[1:] if b not in books]
        if missing:
            sys.exit('No book with book_id ' + ', '.join(missing))
        todo = args[1:]
    elif args:
        sys.exit(__doc__)
    else:
        todo = [bid for bid in books if bid not in choices]

    done = 0

    def work(bid):
        nonlocal done
        try:
            choice = choose(books[bid])
        except Exception as e:  # Leave it undecided so the next run tries again.
            print(f'  ! {books[bid]["title"]}: {e}', file=sys.stderr)
            return
        with lock:
            choices[bid] = choice
            done += 1
            if done % 25 == 0:
                save_choices(choices)
                print(f'  {done} of {len(todo)}', flush=True)

    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(work, todo))
    save_choices(choices)
    prune(choices)
    found = [c for c in choices.values() if c.get('file')]
    size = sum((COVERS_DIR / c['file']).stat().st_size for c in found)
    print(f'{len(found)} of {len(books)} books have a real cover ({size / 1e6:.1f} MB).')
    checks = [(bid, c) for bid, c in choices.items() if c.get('check')]
    for bid, c in checks:
        print(f'  check {books[bid]["title"]}: {c["check"]}')
    for bid, c in choices.items():
        if not c.get('file') and bid in books:
            print(f'  generated cover: {books[bid]["title"]} ({c.get("why")})')
    print('Run python3 scripts/build.py to add them to the app.')


if __name__ == '__main__':
    main()
