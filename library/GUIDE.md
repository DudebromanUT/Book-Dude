# Writing Book Dude Library articles and tests

A guide for an AI model (or a person) writing a new **Library article** and its **test** for Book Dude. Follow it
exactly; the output goes straight into the app after a parent reviews it.

## What Book Dude is

Book Dude is a reading app a dad made for his 10-year-old daughter. It tracks her books and her Accelerated Reader
(AR) quiz points, which she turns into book money or screen time. Inside the app is **COBOL**, a friendly AI helper
that looks like a 1980s IBM mainframe terminal (green text on black). COBOL's menu has a **Library** of short
knowledge articles she can read any time, and **Tests** on some of them. Passing a test earns points that count just
like AR points, once per test.

## Who you're writing for

- A 10-year-old girl. Write at a 6th-grade reading level (AR book level around 6).
- She reads the article on an iPad, then takes the test. She can retake it, and after each try she sees her score and
  which questions to reread, never the right answers.
- Her parents review everything before it goes in the app.

## The article

- **Length:** 300 to 1,500 words, in 4 to 12 short sections. Each section has a short title and 1 to 3 short paragraphs.
  The length sets the points (see the test).
- **Facts:** every fact must be true and checkable. Use numbers and names a reliable encyclopedia would agree with. If
  sources disagree, leave the fact out. Never invent quotes, dates or statistics.
- **Words:** short sentences, plain words. When a hard word is worth keeping, explain it in the same sentence.
- **Kid-safe:** nothing scary, gory, sexual, or about dangerous activities in a way she could copy. No diets, weight
  or looks. Religion and politics only as plain facts, with no side taken. No links.
- **Voice:** pick one and say which.
  - `cobol`: COBOL tells it. ALL CAPS, cheerful and slightly over-serious, like a computer reading out a file:
    "PROCESSING... HISTORY FILE LOADED." Sections are called FILE 1, FILE 2, and so on. Robot jokes are about data and
    computers, never about her, at most one or two per section.
  - `plain`: normal capitalization, a warm, clear explainer voice.
- **Never** use her name or any personal details about her family.
- **Book articles:** if the article is about a book, don't spoil the ending unless the parents say she has finished
  it.

## The test

- **Questions:** 10 for a short article, 15 for a long one, unless the parents ask for a different number.
- **Points by length:** a **short** article (up to 700 words, like COBOL's history) is worth **2 points**; a **long**
  article (701 to 1,500 words) is worth **4 points**. State the article's word count.
- **Pass mark:** 80%: 8 of 10 for a short article, 12 of 15 for a long one, unless the parents say otherwise. Math
  tests may need 90% and give more points.
- **Every question must be answerable from the article alone,** with one clearly right answer.
- **Four choices** per question. **Put the right answer first**; the app shuffles the order she sees.
- **Wrong answers** are plausible, about the same length as the right one, and clearly wrong to someone who read the
  article. A funny wrong answer now and then is fine. No "all of the above," "none of the above," trick wording, or
  double negatives.
- **One fact per question,** spread across the sections. Each question names the section that holds its answer, so the
  app can tell her what to reread.
- **Math tests:** show the problem in the question, give one exact answer, and make the wrong answers common mistakes
  (a wrong carry, a flipped fraction), not random numbers.

## Output format

Give the article and test in exactly this shape, so it can be dropped into the app:

```js
{
  id: 'solar-system',                 // lowercase words joined by hyphens; never reused
  title: 'The Solar System',          // shown on the Library shelf
  voice: 'plain',                     // 'plain' or 'cobol'
  intro: 'One or two sentences that open the article.',
  sections: [
    { title: 'The Sun', text: ['A paragraph.', 'Another paragraph.'] },
    { title: 'The Rocky Planets', text: ['…'] }
    // a section may also have `code: ['line 1', 'line 2']` for a code sample, shown in a box
  ],
  closing: 'One sentence that ends the article.',
  test: {
    pass: 8, outOf: 10, points: 2,   // short (up to 700 words): 8 of 10 for 2 points; long (701 to 1,500): 12 of 15 for 4
    questions: [
      { q: 'What is at the center of the solar system?', ref: 'The Sun',
        choices: ['The Sun', 'The Earth', 'The Moon', 'Jupiter'] }
      // …one entry per question; the right answer is always first
    ]
  }
}
```

Leave out `test` for an article without a test.

## Before you hand it over

Check that:
- every fact is true and every answer is in the article
- each question's `ref` matches a section title exactly
- the right answer is first in every `choices` list
- the article reads at about a 6th-grade level and stays within the kid-safe rules
- the word count matches the test: up to 700 words is 10 questions, 8 to pass, 2 points; 701 to 1,500 is 15
  questions, 12 to pass, 4 points
- nothing mentions her name, and nothing spoils a book she hasn't finished

Then list, in plain words for her parents, any fact you were less than certain of, so they can check it.
