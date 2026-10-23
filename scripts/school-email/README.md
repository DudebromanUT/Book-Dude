# Book Dude's Google script: school quizzes, the talking Dude and COBOL

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
7. On Maddy's iPad, open Book Dude → **Farty Pants Central** → **Book money and screen time**. Unlock it if you've set a passcode. Paste
   the whole link into **School quiz link**. It checks right away.

## Turning on the talking Dude (Claude)

With a Claude API key, the same script also adds:

1. **A Dude joke for every new quiz.** It becomes the Dude's line on Explore, linked to the book.
2. **A weekly email to you**, Sunday at 9 a.m.: her quizzes, points, money and minutes waiting, books finished and
   being read, tests passed in Book Dude, two or three dinner-table questions for each book, what Claude cost that week,
   and her week with COBOL: a short summary, every flagged exchange in full, and the whole week's chat at the bottom.
3. **"What should I read next?"**, a button under the Dude's bubble. Book Dude sends only books right for her age that
   she hasn't read (no heads-up warnings, nothing marked for teens, near her level), and only those can come back.
4. **COBOL**, a chat with a kid-safe AI helper (the button under the Dude's bubble), made to feel like a machine, not a
   person: an IBM 3270 mainframe terminal with retro beeps. It calls her "Human"; her name is never sent to Claude.
   Answers appear whole, with no "typing" bubble or pauses, and there is no voice and no pictures. Nothing rewards
   coming back or chatting longer: no streaks, no counters, no "come back tomorrow". The keys along the bottom work like
   a mainframe's: **PF1 HISTORY** (COBOL's history file and its test), **PF3 EXIT** (leave the screen she's on) and
   **PF5 SOUND** (beeps on or off).
   - A line that never scrolls away says **"This is an AI. Mom and Dad can read these chats."**
   - A small yellow **Talk to a grown-up** button is always at the top, whatever COBOL is doing (even after hours, at
     the day's limit, or offline). It tells her to go talk to Mom or Dad right now, and **emails you right away** with
     the last few messages. Asking for help never depends on her typing the right words.
   - A soft timer suggests a break at 15, 30 and 45 minutes. It never blocks her.
   - The script checks the rules before Claude sees anything: open 7 a.m. to 9 p.m., 40 messages a day, 400 letters a
     message, and phone numbers, email addresses, street addresses and passwords never go to Claude.
   - **COBOL's instructions are yours**, in this script (`COBOL_PROMPT`; the same words are in `cobol-prompt.md` to read
     or edit): your prompt, with your choices. Questions about bodies and growing up go to you; anything serious points
     her to Mom and Dad (no phone numbers); anything kid-safe is fine to talk about. Two short sections fit it to Book
     Dude: plain text only, no pictures or voice, no spoilers, no AR quiz answers, and the yellow button. When COBOL
     thinks you should know about something (safety, online strangers, bullying, worrying feelings), it flags it and
     **you get an email right away**.
   - Every message and answer goes in a Google Sheet called **Book Dude chats** in this account, and the Sunday email
     has the week's summary, everything flagged, and the whole log.
   - You can switch it off in Book Dude (Farty Pants Central, behind the passcode) or here (`CHAT` = `off`).

COBOL's history file and its 10-question test don't need Claude: they also open from the end of About the Dude. A
pass (8 of 10, 80%) earns 2 points once, counted like AR points.

### Setup (about 10 minutes, on a computer)

1. In the [Claude Console](https://platform.claude.com/), create an API key named **Book Dude**. While you're there, set
   a **monthly spend limit** (Settings, Limits). A chat message costs about 1½ cents, a set of picks about 5 cents, a
   joke under a cent, and the weekly email about 3 cents (a little more in a week with lots of chats, for the summary): about $6 a month with ten chats and one set of picks a day,
   and about $33 if she used every daily limit every day. A $15 limit covers normal use.
2. In the script editor, replace everything with the new `Code.gs` and click **save**.
3. Click the gear (**Project Settings**), scroll to **Script Properties**, click **Add script property**, and add
   `ANTHROPIC_API_KEY` with your key as the value. Save. **The key goes only here**: never in Book Dude, a text, an
   email or a chat. If it ever leaks, delete it in the Console and make a new one.
4. Optional, in the same place: `DIGEST_TO` with both your email addresses, separated by a comma, so you both get the
   weekly email and alerts. Blank means this account only.
5. **Deploy → Manage deployments → pencil → Version: New version → Deploy.** The link stays the same.
6. Choose **setup** in the function menu and click **Run**. Google asks for new permissions (to send email as you, to
   make the chat Sheet, and to reach Claude). Allow them the same way as before. The log says the Claude features are on.
7. On her iPad, open Book Dude. **COBOL** and **What should I read next?** show up under the Dude's bubble.
   To see the weekly email right away, run **sendWeeklyEmailNow** in the editor.

### Settings you can change (Script Properties)

| Property | Default | What it does |
| --- | --- | --- |
| `MODEL` | `claude-opus-5-5` | The Claude model. `claude-haiku-5-5` costs far less, if the bill matters more than the polish. |
| `CHAT` | `on` | `off` stops COBOL. |
| `CHAT_HOURS` | `7-21` | Hours she can chat, Utah time (7 a.m. to 9 p.m.). |
| `CHAT_LIMIT` | `40` | Messages to COBOL a day. |
| `PICKS_LIMIT` | `10` | "What should I read next?" asks a day. |
| `DIGEST_TO` | this account | Who gets the weekly email and alerts. |
| `DIGEST_HOUR` | `9` | Sunday hour for the weekly email (run **setup** again after changing it). |

The Claude requests use Claude Opus 5.5 at low effort for jokes and COBOL and medium effort for picks and the weekly
email. If a request is declined for safety reasons, Claude retries it on the model Anthropic recommends (server-side
fallback); if it is still declined, COBOL gives a gentle answer that points her to Mom or Dad, and the Sheet notes it.

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
- **If quizzes aren't coming in:** choose **checkEmails** in the function menu, click **Run**, and open the Execution log. It shows the newest Renaissance emails, whether each one reads as a quiz, and how many results are saved for Book Dude.
- **COBOL is a helper, not a guarantee.** The rules and alerts catch a lot, but read the chats now and then.
- **If you change the script later:** go to Deploy → Manage deployments → edit (pencil) → Version: New version →
  Deploy. The link stays the same.
