# School quiz emails → Book Dude

Each time Maddy passes an AR quiz, Renaissance emails acgumpher@gmail.com. `Code.gs` is a Google script that lives in that
Gmail account. Once a day, at about 3 p.m. Utah time, it copies the new results out of those emails. Book Dude then
picks them up at a private link the next time it opens.

It only reads "Accelerated Reader Reading Practice Quiz" result emails from `autodelivery@renlearnrp.com` about
Madeleine, sent after October 18, 2026. Every other Renaissance email (vocabulary quizzes, Star tests, news) is skipped. It never sends,
changes or deletes email.

## Setup (about 10 minutes, on a computer)

1. Sign in to Google as **acgumpher@gmail.com** and go to [script.google.com](https://script.google.com). Click **New project**.
2. Click "Untitled project" at the top and name it **Book Dude school quizzes**.
3. Delete everything in the editor, paste in all of `Code.gs`, and click the save icon.
4. **Deploy → New deployment.** Click the gear next to "Select type" and choose **Web app**. Then set:
   - Description: Book Dude
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy**. Google asks you to authorize it. Pick the acgumpher account. When it says "Google hasn't verified
   this app", click **Advanced**, then **Go to Book Dude school quizzes (unsafe)**. It says that because you wrote the
   app yourself and didn't send it to Google for review. Then click **Allow**.
5. Copy the **Web app URL**. It ends in `/exec`.
6. Back in the editor, choose **setup** in the function menu next to Run, and click **Run**. It sets up the daily 3 p.m.
   run and collects any quiz emails already there. The log at the bottom prints the Book Dude link, or the code to add to
   the end of the Web app URL (`?key=…`).
7. On Maddy's iPad, open Book Dude → **More** → **Book money and screen time**. Unlock it if you've set a passcode. Paste
   the whole link into **School quiz link**. It checks right away.

## Good to know

- **"Who has access: Anyone" is safe here.** The link answers only when it carries the secret key, and that key exists
  only in this Google account and on her iPad. Anyone who has the full link can see her quiz list (titles, scores,
  points). If the link gets out, change the key: in the script, go to **Project Settings → Script Properties**, delete
  `key`, run **setup** again, and paste the new link into Book Dude.
- **Timing:** the script checks Gmail once a day, some time between 3 and 4 p.m. Book Dude picks up new results when it
  opens after that. **Check for new quizzes now**, in the same settings, asks right away. That only finds quizzes the
  script has already collected. To collect sooner, run `collect` in the script editor.
- **No double counting:** each email is used once. If you already typed a book's points in by hand, those stay. If
  "Count her total from the school's AR report" is on, her points come from that total instead, so the email quizzes
  still land on her shelf but don't add points again.
- **If you change the script later:** go to Deploy → Manage deployments → edit (pencil) → Version: New version →
  Deploy. The link stays the same.
