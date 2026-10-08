/*
 * The Dude: the crew's names, the daily sayings, and the story in "Meet the Dude".
 * Edit freely, then run `python3 scripts/build.py` so installed apps pick up the change.
 * {dog} and {cat} are replaced with the names below.
 */
window.BOOK_DUDE = {
  dog: 'Dewey',
  cat: 'Footnote',

  // One a day in the Dude's speech bubble on Explore. Tapping the bubble shows another.
  sayings: [
    'Shoes off. Socks on. What are we reading?',
    'I found my glasses. They were on my head. Again.',
    'A good book is like a prism. Plain light goes in, a whole rainbow comes out.',
    '{dog} fetched a sock instead of a book. We’re working on it.',
    'If {cat} falls asleep on a book, that’s the next book. Those are the rules.',
    'Give it ten pages. If it still isn’t working, pause it. No hard feelings.',
    'Write down one line you loved today. Future you will thank you.',
    'The fourth rung on the ladder squeaks. I’m never fixing it. It’s tradition.',
    'Points are nice. Stories are better. (Points are still nice.)',
    'I once read so long my hot cocoa turned into iced cocoa.',
    'Nobody has counted my books. {dog} tried once and fell asleep around the M’s.',
    'Every book you finish is a little room you get to keep forever.',
    'Can’t pick? Tap Ask {cat}. {cat} has never been wrong. Or awake.',
    'Rainy day? Best reading day. Sunny day? Also the best reading day.',
    'Big words aren’t scary. They’re just small words holding hands.',
    'The globe in the corner says we could go anywhere. Books agree.',
    'Snacks and books: excellent. Sticky fingers and books: we need to talk.',
    'A bookmark is just a promise to come back.'
  ],

  story: [
    {
      paragraphs: [
        'Hey there. Come on in. Shoes off, socks on. That’s the first rule.',
        'I’m the Dude. Most people call me the Book Dude, which is fair, because I have a lot of books. Nobody has ever counted them. {dog} tried once and fell asleep somewhere around the M’s.',
        'This is the Reading Room. It’s at the very top of a creaky old house, up under the rafters, with a round window that catches the sunset coming off the mountains. Every shelf is full. The ladder squeaks on the fourth rung. There’s a globe in the corner that I spin when I can’t decide where a story should take me next.'
      ]
    },
    {
      heading: 'How it started',
      paragraphs: [
        'When I was about your age, I was not a reader. I was a fidgeter. I could not sit still for anything except dessert.',
        'Then one rainy afternoon, a librarian with very sensible shoes handed me a book and said, “Give it ten pages.” So I gave it ten pages. Then fifty. Then I missed dinner. (Sorry, Mom.)',
        'That librarian told me something I never forgot: “A good book is like a prism. You put plain light in, and a whole rainbow comes out.” That’s why I wear this shirt. It reminds me.',
        'So I made a promise. I would keep a room full of rainbows and share it with anybody who wanted one. That’s this place. And now it’s yours too.'
      ]
    },
    {
      heading: 'The crew',
      crew: [
        { img: 'img/dog.jpg', name: '{dog}, Head of Fetching', text: 'Welsh terrier. Type what you’re looking for in the search box and off {dog} goes. Sometimes {dog} brings back a sock. We’re working on it.' },
        { img: 'img/cat.jpg', name: '{cat}, Head of Naps', text: 'Tabby cat. {cat} only falls asleep on very good books. When you can’t decide what to read, tap Ask {cat}.' },
        { img: 'img/dude-face.jpg', name: 'Me, Head of Cardigans', text: 'I lose my glasses about nine times a day. They are usually on my head.' }
      ]
    },
    {
      heading: 'The rules of the Reading Room',
      ordered: true,
      list: [
        'Shoes off. Socks on. Wool is best.',
        'You don’t have to finish a book you don’t love. Put it on the Paused shelf. No hard feelings.',
        'If {cat} is asleep on a book, that’s your next book.',
        'Write things down: favorite lines, funny parts, words you didn’t know. That’s what My notes is for.',
        'AR points are nice. Stories are better. (Points are still nice.)',
        'Never let {dog} near the dictionary. It weighs more than {dog} does.'
      ]
    },
    {
      paragraphs: ['Now pull up a chair. That one’s the comfy one. What are we reading?']
    }
  ],
  signoff: 'The Dude'
};
