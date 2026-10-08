/*
 * The Dude: the crew's names, the daily sayings, the story in "Meet the Dude",
 * the Secret Files she unlocks with AR points, and the jokes on the Book Money Jar.
 * Edit freely, then run `python3 scripts/build.py` so installed apps pick up the change.
 *
 * Placeholders: {dog} and {cat} become the names below. Jar and fact lines can also use
 * {points}, {toGo}, {prize}, {pages}, and {nuggets}.
 */
window.BOOK_DUDE = {
  dog: 'Maple',
  cat: 'Fig',

  // One a day in the Dude's speech bubble on Explore. Tapping the bubble shows another.
  sayings: [
    'Shoes off. Socks on. What are we reading?',
    'I found my glasses. They were on my head. Again.',
    'A good book is like a prism. Plain light goes in, a whole rainbow comes out.',
    '{dog} fetched a sock instead of a book. We’re working on it.',
    'If {cat} falls asleep on a book, that’s the next book. Those are the rules.',
    'Give it ten pages. If it still isn’t working, pause it. No hard feelings.',
    'Fun fact: geologists lick rocks. I licked about four thousand. Don’t ask what granite tastes like.',
    'An octopus named Gerald still has my favorite glasses. I hope he’s reading something good.',
    'I once traded a gold nugget for a copy of Treasure Island. Best trade I ever made.',
    'Bedtime arrives 40% faster when you’re in the middle of a good chapter. That’s science. I was a physicist.',
    'Doctor’s orders: two chapters before bed.',
    'Every 100 points goes in the book-money jar. {dog} is guarding it. Mostly by napping next to it.',
    'Write down one line you loved today. Future you will thank you.',
    'The fourth rung on the ladder squeaks. I’m never fixing it. It’s tradition.',
    'Can’t pick? Tap Ask {cat}. {cat} has never been wrong. Or awake.',
    'Big words aren’t scary. They’re just small words holding hands.',
    'Don’t ask about the wings.',
    'A bookmark is just a promise to come back.'
  ],

  story: [
    {
      paragraphs: [
        'Nobody knows the Dude’s real name. Not the mail carrier. Not the librarian. Not even {dog}, and {dog} knows everything that happens in this house (mostly by sniffing it). He’s just the Dude.',
        'And before he was the Dude, he was a lot of other things. A LOT of other things.'
      ]
    },
    {
      heading: 'Everything he’s ever been',
      chips: ['Geologist', 'Chemist', 'Gold miner', 'Cowboy', 'Marine biologist', 'Physicist', 'Doctor', 'Teacher', 'Photographer', 'Botanist', 'Video game developer', 'Geologist (again)', 'Fairy'],
      paragraphs: [
        'Yes, geologist is on there twice. He missed the rocks. And yes, fairy. For one very confusing summer. He will not explain.',
        'Ask him about any of them and he just wiggles his socks and says, “Earn a few points and I’ll tell you.” He means it. Every time you earn AR points, you unlock another one of his Secret Files on the Progress tab.'
      ]
    },
    {
      heading: 'How he became the Dude',
      paragraphs: [
        'Every job ended the same way. He’d be right in the middle of something important, open a book “just for a minute,” and look up three days later. Halfway through a cattle drive. Halfway through a chemistry experiment. Halfway up a volcano. (It was a small volcano.)',
        'Then one night, somewhere between being a cowboy and being a fairy, it hit him like a falling encyclopedia: in a book, you can be anything. A cowboy at breakfast. A marine biologist by lunch. A fairy by bedtime. And you never, ever have to clean the octopus tank.',
        'So he hung up his hard hat, his lasso, his lab coat, his stethoscope, and his (very small) wings. He climbed to the top of a creaky old house, filled every wall with books, and called it the Reading Room. He has been whatever he wants ever since.',
        'Look closely at his picture and you’ll spot souvenirs from his other lives: the old map from his geology days, the little sailboat from his ocean years, the brass globe from his physics lab, and a hanging plant named Chapter that only grows when someone reads out loud.'
      ]
    },
    {
      heading: 'The story on the shirt',
      paragraphs: [
        'When the Dude was about your age, he was not a reader. He was a fidgeter. He could not sit still for anything except dessert.',
        'Then one rainy afternoon, a librarian with very sensible shoes handed him a book and said, “Give it ten pages.” He gave it ten pages. Then fifty. Then he missed dinner.',
        'That librarian told him something he never forgot: “A good book is like a prism. You put plain light in, and a whole rainbow comes out.” That’s why he wears the shirt. Years later, as a physicist, he proved she was right. (He did not. But he says he did.)'
      ]
    },
    {
      heading: 'The crew',
      crew: [
        { img: 'img/dog.jpg', name: '{dog}, Head of Fetching', text: 'Welsh terrier. Type what you’re looking for in the search box and off {dog} goes. Sometimes {dog} brings back a sock. {dog} has 212 socks. Nobody knows whose.' },
        { img: 'img/cat.jpg', name: '{cat}, Head of Naps', text: 'Tabby cat. {cat} only falls asleep on very good books. When you can’t decide what to read, tap Ask {cat}.' },
        { img: 'img/dude-face.jpg', name: 'The Dude, Head of Cardigans', text: 'Loses his glasses about nine times a day (blame Gerald the octopus). They are usually on his head.' }
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
        'AR points are nice. Stories are better. (Points are still nice. Especially the book-money kind.)',
        'Never let {dog} near the dictionary. It weighs more than {dog} does.',
        'Do not ask about the wings.'
      ]
    },
    {
      paragraphs: ['Now pull up a chair. That one’s the comfy one. What are we reading?']
    }
  ],
  signoff: 'The Dude',

  // The Secret Files: one of the Dude's old jobs unlocks at each point total (all-time AR points).
  files: [
    { at: 5, job: 'Geologist', title: 'Junior Rock Licker',
      text: 'My first job was geologist. Here’s a real fact: geologists lick rocks. A wet rock shows its true colors. I licked about four thousand rocks. Maybe four thousand and one. My tongue still knows what granite tastes like. Gravelly. Do not recommend.' },
    { at: 15, job: 'Chemist', title: 'Bouncy Pudding Chemist',
      text: 'As a chemist, I tried to invent a pudding that wouldn’t spill. It worked too well. It bounced. Off the table, off the ceiling, out the window, and as far as I know, it is still bouncing somewhere in Nevada. If you see it, don’t eat it.' },
    { at: 30, job: 'Gold miner', title: 'Pea-Sized Gold Miner',
      text: 'I spent a whole summer panning for gold in a freezing mountain stream. I found exactly one nugget, about the size of a pea. I traded it for a used copy of Treasure Island. Best trade I ever made. The book had way more treasure in it.' },
    { at: 50, job: 'Cowboy', title: 'Cowboy Who Lost the Cows',
      text: 'I was a cowboy for one long season. My horse was named Pancake. Every night I read by the campfire, and every morning the cows were gone. I finished eleven books and lost forty-two cows. Pancake was not impressed. The cows were fine. They went home. Cows know the way.' },
    { at: 75, job: 'Marine biologist', title: 'Octopus Wrangler',
      text: 'Out on the ocean I studied octopuses. One of them, Gerald, could open jars, unscrew bottles, and take the glasses right off my face. That’s when I started losing my glasses. I like to think Gerald is wearing them somewhere, reading.' },
    { at: 100, job: 'Physicist', title: 'Bedtime Physicist',
      text: 'As a physicist, I made one important discovery: bedtime arrives 40% faster when you are in the middle of a good chapter. I measured it very carefully, with a stopwatch and a flashlight under the covers. Nobody gave me a prize. I know I’m right.' },
    { at: 150, job: 'Doctor', title: 'Dr. Two-Chapters',
      text: 'When I was a doctor, I gave every patient the same prescription: two chapters before bed, and call me in the morning. Sniffles? Two chapters. Grumpy? Two chapters. Broken arm? Okay, a cast. And then two chapters.' },
    { at: 200, job: 'Teacher', title: 'Teacher of the Year (Unofficial)',
      text: 'I taught fifth grade. My class read so many books that the library ran out of shelves, and we had to build new ones out of pizza boxes. They held up surprisingly well. They smelled amazing.' },
    { at: 275, job: 'Photographer', title: 'Blurry Hummingbird Photographer',
      text: 'I spent three years trying to photograph a hummingbird. I took four thousand pictures of blurry hummingbirds and one perfect, crystal-clear picture of my own thumb. It’s framed. It’s on the wall. Look for it.' },
    { at: 350, job: 'Botanist', title: 'Plant Whisperer',
      text: 'As a botanist, I grew a plant that only grows when someone reads out loud to it. It’s the one hanging by the bookshelf. Its name is Chapter. If it ever looks droopy, you know what to do.' },
    { at: 450, job: 'Video game developer', title: 'Final Boss Designer',
      text: 'I made exactly one video game. The final boss could only be defeated by reading it a bedtime story. It sold eleven copies, all to librarians. All eleven of them beat it on the first try.' },
    { at: 600, job: 'Geologist (again)', title: 'Geologist, Again',
      text: 'I went back to geology because I missed the rocks. The rocks did not miss me. Rocks are like that. I licked one, for old times’ sake, and decided I’d had enough.' },
    { at: 800, job: 'Fairy', title: 'Tooth Fairy, Retired',
      text: 'Okay. Fine. For one summer, and I am not explaining how, I was a tooth fairy. Tiny wings. Tiny hat. Very long nights. I got paid in quarters, which is how I bought the armchair. The wings are in a box in the attic. No, you can’t see them. They itch.' },
    { at: 1000, job: 'All of them', title: 'Honorary Dude',
      text: 'A thousand points. You know what that means? You’ve been a cowboy, a scientist, a detective, a dragon rider, and who knows what else, all without leaving your chair. That’s the whole secret. You’re officially an Honorary Dude now. (Sorry. It’s the only title I’ve got.)' }
  ],

  // The Book Money Jar's reaction, by how full it is (0 to 1). The last matching line wins.
  jar: [
    [0, 'The jar is empty. {dog} sniffed it twice to be sure. {dog} believes in you.'],
    [0.01, 'A few points are rattling around in there. {cat} opened one eye.'],
    [0.25, 'A quarter full! The Dude did a small, dignified sock wiggle.'],
    [0.5, 'Halfway! {dog} is wagging so hard the whole back half of {dog} is wagging.'],
    [0.75, 'Three-quarters! The Dude is looking for his bookstore cardigan.'],
    [0.9, 'Only {toGo} points to go. The jar is shaking. (That might be {dog}.)']
  ],
  jarFull: 'BOOK MONEY! You earned {prize}. Go tell a grown-up. The Dude says: wear good socks to the bookstore.',

  // Silly ways to measure her all-time points. One shows each day.
  facts: [
    'The Dude did the math: {points} points is about {pages} pages. He was a physicist once. He checked it twice.',
    'If every point were a sock, {dog} would need {points} more hiding spots. {dog} already has 212.',
    'In gold-miner money, that’s {nuggets} pea-sized nuggets. The Dude would trade every one of them for a good book.',
    '{cat} slept through all {points} of your points. {cat} is still very proud of you.'
  ]
};
