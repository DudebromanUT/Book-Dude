# Book Dude — The Reading Room

A static, iPhone/iPad-friendly reading app for `DudebromanUT/Book-Dude`, hosted by the Book Dude from the Reading Room, an attic library full of books, with Maple the Welsh terrier and Fig the tabby cat.

The catalog includes 637 distinct books, all with descriptions, and 468 sourced AR records. The other 169 remain explicitly unresolved. Source and edition notes are available in each book's details. No account, server database, paid service, or JavaScript build dependencies are needed.

## Put it on GitHub Pages

1. The app lives in `docs/` (it starts at `docs/index.html`). `scripts/` builds the generated files and `tests/` checks them.
2. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, select `main`, select **`/docs`**, and save.
3. Once GitHub finishes deploying (a minute or two; watch the **Actions** tab), the app is at `https://dudebromanut.github.io/Book-Dude/` unless a custom domain is configured.
4. Use HTTPS. All asset paths, the installation manifest, the service worker, and local database naming support the `/Book-Dude/` subdirectory.

The repository is public, so Pages publishes the catalog and application to anyone with the URL. Personal records are never part of the published files. The Dude's portrait (`docs/img/`) and the book covers (`docs/covers/`) are part of the published site, so anyone with the link can see them. The covers are the publishers' and illustrators' artwork, kept as small thumbnails to show which book is which. Do not commit exported backups (`.gitignore` already ignores `book-dude-backup-*.json` and the older `reading-room-backup-*.json`).

GitHub's instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Install on each iPhone or iPad

1. Open the published website in Safari.
2. Tap **Share → Add to Home Screen**. Keep **Open as Web App** enabled if iOS shows that option.
3. Open the new home-screen icon while online. Wait for **Ready offline** (shown at the top of Explore, and under More → This device) before leaving the network.
4. Use that icon for reading and notes from then on. Safari and home-screen installations can have separate storage. If you already entered notes in Safari, save a backup there, then restore it inside the installed app.
5. Repeat on the other devices. Each has a separate journal and dashboard; no family sharing or cross-device synchronization is implemented.

A file opened from the iOS Files preview is not a reliable installation method. Host the whole `docs` folder through Pages; do not download just index.html for home-screen installation.

## What is included

- **Explore** all 637 books with search (title matches first), collection chips, and filters for AR book level, AR points, interest level, age guidance, and genre. Sort by award year, title, author, level, points, or community score. Switch between covers (standing on wooden shelves) and a list. **Ask Fig** opens a random unfinished book from the current results.
- Real cover art for most books, from Open Library, with a small seal for the book's award (Newbery Medal or Honor, Beehive, Classic, Pulitzer, Printz, Carnegie, National Book Award). Books without a good cover, and books she adds herself, get a homemade cover in the same style. The covers ship with the site: the app saves them in the background after it is ready offline (More → This device shows how many are saved), and any cover not saved yet shows the homemade one. Each book's page credits Open Library.
- **My Shelves**: Reading, Want to read, Finished, Paused, Favorites, and My books.
- **Add your own books** for anything that isn't in the catalog: title, author (optional), AR book level and points (optional; blank stays unknown), and a short description. Use **Add a book** on My Shelves, or search for a title and tap **Add it as my book** when nothing matches (the search text becomes the title). Added books get a "My book" seal and work like every other book: shelves, notes, ratings, quiz points, search, the Progress dashboard, and backups. They can be edited or deleted from the book's page. If the title is already in the catalog, the app offers to open that book instead.
- Private notes, reading percentage, start and finish dates, and her own 5-star rating on any book (with a word from the Dude for each star count). Her rating shows on the book's card, and Explore can sort by **My ratings**.
- Actual AR points earned, entered from quiz results; blank and zero mean different things.
- **Progress**: all-time and per-year dashboards, an annual points goal ring, a month-by-month chart (points by quiz date, books finished by finish date), a "Ready for a quiz" list, and progress through each award collection.
- Earned points are counted by quiz date; books finished are counted by completion date. Currently reading is always a present-day count. Undated completions count only in All time.
- Awaiting quiz entry means finished books without an entered quiz result. Their known available points are shown separately; unknown values are never counted as zero-value books.
- A book has one current quiz-result entry. Edit it to correct that result. Multiple attempts and repeated readings are not separate ledger entries in this version.
- **Book Money Jar** (Progress): $1 per AR point, paid out every 100 all-time points ($100 for her Barnes & Noble account). The jar shows the dollars building up ("$37 of $100"), fills with coins, cracks jokes as it fills, celebrates each payout, and shows how much is waiting. A grown-up taps **mark as deposited** after the money goes in. Dollars per point, points per payout, where the money goes, the payouts already made, and whether the jar shows at all are under More → Book money; dollars per point 0 switches to a non-money reward. Points come from the quiz results entered in the app (honor system).
- **The Dude's Secret Files** (Progress): 14 short stories from the Dude's old jobs (geologist, chemist, gold miner, cowboy, marine biologist, physicist, doctor, teacher, photographer, botanist, video game developer, geologist again, fairy, and a 300-point finale), each unlocked at an all-time point total. They are spaced for about 250 points a year: one every few weeks. The highest one unlocked is her title on the jar.
- **The Dude**: a speech bubble on Explore with a new joke every time the app opens (or comes back after 30 seconds away). About 100 lines are shuffled like a deck so none repeats until all have played; most are jokes about books in the catalog with a link to that book, and books on her shelves come up a little more often. A P.S. under the joke mentions book money waiting, a quiz to enter, being close to the next reward, or the book she is reading. Tap the bubble for another joke.
- **Meet the Dude**: the Dude's story with the crew and the rules of the Reading Room. A brand-new reader sees the story the first time the app opens; after that it is under More and behind the Dude's picture on Explore.
- **More**: the reader's name (used in greetings), a color (leather, rug red, brass, ivy, teal, navy, plum, or berry), backup and restore, device status, and notes about the data.
- JSON backup and restore (including added books). On iPhone and iPad, **Save a backup** opens the share sheet (choose **Save to Files**). Restore shows what will change before it changes anything, merges newer book records, and preserves newer device records. Annual goals already on the device take precedence. Unknown book records are retained in backups and totals.
- Compatibility with the earlier reading-list version 1/2 JSON backups. Old notes and checkmarks migrate on import; they never become earned quiz points automatically.
- Offline app and catalog after installation; external source links require a connection.
- Dark mode, larger touch controls, safe-area spacing, accessible labels, reduced-motion support, and a small celebration when a book is finished or a quiz is recorded.

## Privacy and storage

The app uses IndexedDB for personal records. The service worker caches only the application, the public catalog, and the cover pictures. There are no analytics, remote fonts, remote cover-image requests (covers are files on the same site), or personal-data upload APIs. A strict Content Security Policy blocks scripts and styles from anywhere else.

Local data is not encrypted by this application. Anyone with access to the unlocked device/browser can see it. Database names are separated by site path, but browsers isolate storage by **origin**, not repository: other trusted code hosted under the same `dudebromanut.github.io` origin can access origin storage. Use a dedicated domain if you later host untrusted apps on that origin.

The browser may decline a persistent-storage request. Clearing website data, deleting an installation, device loss, or storage eviction can lose records. Save backups periodically (the Progress tab reminds you after 30 days) and before changing devices or website address. Save backups in a private Files/iCloud Drive location. The backup file contains notes in plain text.

Changing the site address/path or opening the app in another browser creates a separate journal. Save a backup from the old location and restore it in the new one. Backups are the transfer mechanism; there is no automatic sync.

## Change the Dude's story, sayings, or the pets' names

Everything the Dude says lives in `docs/dude.js`: the dog's and cat's names (`dog`, `cat`), his one-liners (`sayings`), jokes about catalog books (`bookJokes`, keyed by the book's exact title), the P.S. lines (`ps`), the `story` shown in Meet the Dude, the Secret `files` (and the point total that unlocks each), and the jar's jokes (`jar`, `jarFull`, `facts`). `{dog}` and `{cat}` in any text are replaced with the names. Edit the file, then run `python3 scripts/build.py` so installed apps offer the update.

The portrait and its crops are in `docs/img/` (`dude.jpg`, `dude-face.jpg`, `dog.jpg`, `cat.jpg`), and the home-screen icons are in `docs/icons/`. Replacing any of them also needs `python3 scripts/build.py`.

## Book covers

`scripts/covers.py` finds the covers. It looks each book up on Open Library, skips other-language editions, movie tie-ins, audiobooks, large print, plain cloth bindings, and odd shapes, and saves a 280-pixel WebP thumbnail (about 13 KB) in `docs/covers/`. Its choices are kept in `scripts/covers.json`. It needs Python 3 with Pillow (`pip install Pillow`) and internet access; the app and the build never contact Open Library.

- `python3 scripts/covers.py` finds covers for books that have no decision yet (for example, books just added to the CSV).
- `python3 scripts/covers.py --use BOOK_ID NUMBER` uses a specific Open Library cover. The number is in the cover's address: `covers.openlibrary.org/b/id/NUMBER-L.jpg`.
- `python3 scripts/covers.py --none BOOK_ID` keeps the homemade cover for a book.
- `python3 scripts/covers.py --redo BOOK_ID` looks a book up again.

Then run `python3 scripts/build.py`. Cover file names are hashes of the pictures, so a changed cover reaches installed apps as a new file.

## Update the book catalog

1. Edit `docs/books.csv`. **Keep each existing `book_id` unchanged**, even when correcting a title or author. For a genuinely new book, leave `book_id` blank and the build assigns a new unique one (written back into the CSV). IDs starting with `mine:` are reserved for books added in the app.
2. Run `python3 scripts/build.py` from any directory with Python 3 available. This regenerates `docs/catalog.js` and `docs/sw.js` together, and stops with a readable list if a row has a problem (duplicate ID, non-numeric points, points without a source link, and so on).
3. Commit and push the changed CSV, catalog.js, and sw.js files. Changes to HTML/CSS/JS/icons also require running build.py so the offline version updates. New books get the homemade cover until you run `scripts/covers.py` (see Book covers).
4. Installed apps check for updates when opened online. Tap **Update app** when the banner appears. Saved notes live in a separate database and are not overwritten by catalog updates.

Do not manually edit generated catalog.js or sw.js. No automatic fetching of AR information is performed. The source CSV still contains unverified supplied ratings and incomplete age/genre data; the app labels them accordingly.

## Verification

Run `node --test tests/core.test.cjs tests/offline.test.cjs tests/custom-books.test.cjs tests/rewards.test.cjs tests/covers.test.cjs` and `python3 scripts/build.py --check`. The **Checks** GitHub Action runs both on every push.

The tests cover points calculations, date handling, backup migration/validation, added books (validation, totals, backup round-trip, restore merging), book-money math and settings, cover files and background cover saving (including offline and after updates), stable catalog IDs, and service-worker cache boundaries. Live iOS installation, Safari layout, and the deployed GitHub Pages origin still need a device check after publication.

## Quick device check after publishing

Add a note and record an actual points result, close/reopen the home-screen app, and confirm both remain. Turn on airplane mode and confirm the catalog still opens. Save a backup and restore it on a second test installation. Verify the other family member's device starts with an empty journal.
