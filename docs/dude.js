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

  // The Dude's one-liners. A new one shows every time the app opens (shuffled, no repeats until all
  // have been seen). Tapping the speech bubble shows another.
  sayings: [
    'Shoes off. Socks on. What are we reading?',
    'I found my glasses. They were on my head. Again.',
    'My cardigan has eleven pockets. Four have bookmarks. Six have snacks. One has {cat}.',
    'Gerald the octopus sent me a postcard. It just said “thanks for the glasses.”',
    'I asked {cat} for a book recommendation. {cat} recommended a nap. {cat} always recommends a nap.',
    '{cat} knocked a book off the shelf. On purpose. While looking right at me. It was a great book. I think that was the point.',
    'I lost my glasses again. {dog} found them. {dog} was wearing them.',
    '{dog} has 212 socks. I have 211. Do the math.',
    'Today’s forecast: 90% chance of a good book. 10% chance of {cat} sitting on it.',
    'Fun fact: a group of owls is called a parliament. A group of books is called a Tuesday.',
    'Some people count sheep to fall asleep. I count books I still want to read. I never fall asleep.',
    'As a photographer, I learned to say “cheese.” As a reader, I learned to say “one more chapter.” Both are lies.',
    'When I was a botanist I talked to plants. Now I talk to books. The books are better listeners. The plant is still sulking.',
    'I designed a video game where you win by reading. My high score is “still reading.”',
    'If you see a bouncing pudding in Nevada, it’s mine. Do not eat it.',
    'Pancake, my old cowboy horse, used to read over my shoulder. Very slow reader. Horse.',
    '{dog} tried to fetch a library book. It is now “gently loved.” Please don’t tell the librarian.',
    'I tried reading underwater once. That was a short phase. The book is still drying.',
    'The ladder squeaks on the fourth rung. I named the squeak Gary. We’re close.',
    'Doctor’s orders: two chapters before bed. I was a doctor. I checked.',
    'I once read so long my hot cocoa turned into iced cocoa. Then back into hot cocoa. It was a long book.',
    'Bedtime arrives 40% faster when you’re in the middle of a good chapter. That’s science. I was a physicist.',
    'I licked about four thousand rocks as a geologist. Granite tastes like a sidewalk. Do not recommend.',
    'I traded my only gold nugget for a copy of Treasure Island. The book had way more treasure in it.',
    'A bookmark is just a promise to come back.',
    'Big words aren’t scary. They’re just small words holding hands.',
    'The Dude backwards is “Edud Eht.” Sounds like a wizard. I’m keeping it.',
    'I tried to teach {cat} to read. {cat} learned to sit on the exact page I was reading. Close enough.',
    'The best time to read is right now. The second-best time is also right now, but with a snack.',
    'I built a time machine once. It’s called a nap. You close your eyes and wake up in the future. Works every time.',
    'Sleeps all day. Prowls all night. Hates garlic. Not a vampire. That’s {cat}.',
    'The dog and the cat took over this house years ago. I just live here.',
    'Some people worry about Martians invading. I worry about {dog} invading the couch. Only one of those actually happens.'
  ],

  // Jokes about books in the Reading Room. The title must match the book's title in the list;
  // the Dude's speech bubble then links to that book. If she has one of these books on a shelf,
  // the Dude brings it up more often.
  bookJokes: {
    'Holes': ['In Holes, they dig one hole a day, five feet deep. {dog} read it and took it as a personal challenge. The backyard is now Swiss cheese.'],
    "Charlotte's Web": ['Charlotte wrote SOME PIG in her web. I asked the spider in the attic to write SOME DUDE. It just stared at me. Rude.'],
    'Hatchet': ['Brian survives the whole wilderness in Hatchet with just a hatchet. I once got lost in a grocery store with a full cart. We are not the same.'],
    'Because of Winn-Dixie': ['Winn-Dixie is a dog named after a grocery store. {dog} wants to be renamed after a grocery store too. {dog} is holding out for “Snack Aisle.”'],
    'The Tale of Despereaux': ['Despereaux is a tiny mouse with enormous ears who loves stories. {cat} read it and is now very confused about how to feel about mice.'],
    'Frindle': ['In Frindle, Nick invents a new word for pen. I invented a new word for socks: “toasters.” Nobody uses it. Please use it.'],
    'Matilda': ['Matilda could move things with her mind. I stared at the TV remote for an hour. Then {dog} sat on it and changed the channel. {dog} might be magic.'],
    'Wonder': ['Mr. Browne’s rule in Wonder: when you can be right or be kind, choose kind. My rule: when you can have one cookie or two, choose two. Both are wise.'],
    'The Westing Game': ['In The Westing Game, sixteen heirs race to solve a puzzle. I once did a 500-piece puzzle of a picture of a puzzle. Took me a year. Worth it.'],
    'Mrs. Frisby and the Rats of NIMH': ['The rats of NIMH taught themselves to read. {cat} refuses. {cat} says books are for napping on.'],
    'From the Mixed-Up Files of Mrs. Basil E. Frankweiler': ['Claudia ran away to live in an art museum and bathed in the fountain. I ran away to the library once. I lasted four hours. The snack situation was bad.'],
    'A Wrinkle in Time': ['A Wrinkle in Time explains the tesseract, a shortcut through space. I use the same technology to find my glasses. (Head. They’re on my head.)'],
    'Island of the Blue Dolphins': ['Karana lived alone on an island for years. I spent one weekend alone in a library and started talking to the encyclopedias. Volume K was a great listener.'],
    'Treasure Island': ['Long John Silver’s parrot shouts “Pieces of eight!” {cat} shouts “Pieces of ham!” at 6 a.m. every day. Same energy.'],
    "Alice's Adventures in Wonderland": ['Alice drinks a bottle labeled DRINK ME and shrinks. I drank a bottle labeled DRINK ME once. It was apple juice. I have never been so disappointed.'],
    'The Wind in the Willows': ['Mr. Toad in The Wind in the Willows yells “Poop-poop!” every time he sees a car. I’m not saying it’s the funniest thing in classic literature. I’m saying I’ve read it forty times.'],
    'The Secret Garden': ['Mary finds a key to a secret garden. I found a key once too. It opens nothing. I’ve tried every door. It might be a key to a different book.'],
    'Anne of Green Gables': ['Anne Shirley cracked a slate over a boy’s head for calling her “Carrots.” The Dude does not recommend this. The Dude also does not call anyone Carrots.'],
    'Little Women': ['Jo March sold her hair for twenty-five dollars in Little Women. I tried to sell my beard. No offers. Not one.'],
    'The Jungle Book': ['Mowgli was raised by wolves. {dog} thinks {dog} raised me. Honestly? Not wrong.'],
    'Black Beauty': ['Black Beauty is a whole book told by a horse. My horse Pancake also had a lot to say. It was mostly complaints about me.'],
    'The Call of the Wild': ['Buck answers the call of the wild. {dog} answers the call of the fridge door. Every time. From any room. Even asleep.'],
    'The Adventures of Sherlock Holmes': ['Sherlock Holmes can tell where you’ve been from the mud on your boots. I can tell where {dog} has been from the mud on my couch.'],
    'Twenty Thousand Leagues Under the Sea': ['Captain Nemo’s submarine battles a giant squid. Gerald the octopus read it and has strong opinions. They were mostly written in ink.'],
    'A Christmas Carol': ['Scrooge gets visited by ghosts all night. I get visited by {cat} all night. Same thing, but with more stepping on my face.'],
    'The Little Prince': ['The Little Prince says, “Draw me a sheep.” I drew a sheep once. {dog} barked at it. Best review I’ve ever gotten.'],
    'The Hobbit': ['Hobbits have dinner twice a day when they can get it. That is the only part of The Hobbit I have tried at home. It went great.', 'Bilbo asks Gollum, “What have I got in my pocket?” I asked {dog} the same thing. {dog} guessed “treat.” {dog} was right.'],
    'The Fellowship of the Ring': ['There is a LOT of walking in The Fellowship of the Ring. {dog} read it and asked for a walk. Then another. We’re on page 300 and mile 12.'],
    'The Lion, the Witch and the Wardrobe': ['Lucy found a whole world in the back of a wardrobe. I check the back of my closet every day. So far: two socks, a raisin, and {cat}.'],
    'The Lightning Thief': ['Percy Jackson has a pen that turns into a sword. My pen turns into a frindle. Different book. Ask Nick.'],
    'The City of Ember': ['In The City of Ember, the lights keep going out. In the Reading Room, the lights stay on until I finish the chapter. So, never.'],
    'Eragon': ['Eragon finds a stone that hatches into a dragon. I found a stone once. I licked it. It was granite. (See: geologist.)'],
    'Ella Enchanted': ['Ella is cursed to obey every order. I wish {dog} had that curse. “{dog}, drop the sock.” {dog} did not drop the sock.'],
    'The One and Only Ivan': ['Ivan the gorilla paints pictures. {cat} paints too. Mostly with muddy paws. Mostly on my notes.'],
    'The Girl Who Drank the Moon': ['There’s a Perfectly Tiny Dragon in The Girl Who Drank the Moon who believes he is Simply Enormous. {cat} feels the same way about being a lion.'],
    "Mr. Popper's Penguins": ['Mr. Popper kept a penguin in his refrigerator. I kept a penguin in my refrigerator once. It was a pudding cup shaped like a penguin. It still counts.'],
    'The Cricket in Times Square': ['A cricket in Times Square plays music for all of New York City. A cricket in my attic plays music at 3 a.m. Nobody is buying tickets.'],
    'Maniac Magee': ['Maniac Magee untied a knot nobody in town could untie. I can’t untie my own shoelaces. That’s why it’s socks only in here.'],
    'Bud, Not Buddy': ['Bud has a whole list of Rules and Things for Having a Funner Life. My list has one rule: read the next chapter. It is a very short list.'],
    'The Voyages of Doctor Dolittle': ['Doctor Dolittle could talk to animals. I was a doctor too. {dog} talked to me once. {dog} said “walk.” {dog} says it a lot.'],
    'Smoky, the Cowhorse': ['Smoky was the best cowhorse in the West. Pancake was the best napping horse in the West. Different skills.'],
    'Flora & Ulysses': ['Ulysses the squirrel gets superpowers from a vacuum cleaner and starts writing poetry. I vacuumed for an hour once. Nothing. Not even a haiku.'],
    "The Inquisitor's Tale": ['There’s a dragon in The Inquisitor’s Tale whose farts are deadly. I’m not saying {dog} is a dragon. I’m saying crack a window.'],
    'The Wednesday Wars': ['In The Wednesday Wars, Holling has to read Shakespeare every Wednesday. I read Shakespeare every Wednesday too. Also Thursdays. Also in the bathtub.'],
    'Princess Academy': ['Princess Academy takes place on a mountain where everybody cuts stone. I licked three rocks just reading it. Old geologist habits.'],
    'El Deafo': ['Cece turns her hearing aid into a superpower in El Deafo. I turned my cardigan into a snack pouch. Also a superpower.'],
    'The Candy Shop War': ['The Moon Rocks in The Candy Shop War make kids bounce like astronauts. I tried a regular jelly bean. Nothing. I’m writing a complaint.'],
    'The Chocolate Touch': ['In The Chocolate Touch, everything John’s lips touch turns to chocolate. Sounds great until you try to drink water. I have thought about this way too much.'],
    'Superfudge': ['There’s a bird in Superfudge that says “Bonjour, stupid.” {cat} says something like that to me every morning. Without the French.'],
    'Dragon Rider': ['In Dragon Rider, a dragon flies across the world searching for the Rim of Heaven. I search the whole house for the TV remote. Equally epic.'],
    'Jeremy Thatcher, Dragon Hatcher': ['Jeremy Thatcher buys a strange little ball that hatches into a dragon. I bought a strange marble once. It is still a marble. I am being very patient.'],
    'The Great Pet Heist': ['The pets in The Great Pet Heist plan a heist. {dog} and {cat} are planning one too. The target is the cheese drawer.'],
    'Duck and Moose: Duck Moves In!': ['Duck moves in with Moose without asking. {cat} moved into my favorite chair without asking. Nobody asked me either.'],
    'Garlic and the Vampire': ['Garlic is a vegetable who has to face a vampire. I once had to face a vegetable. It was broccoli. I lost.'],
    'The Graveyard Book': ['Bod is raised by ghosts in a graveyard. I was raised by librarians. Also very quiet. Also always saying “shh.”'],
    'When You Reach Me': ['Miranda gets mysterious notes from someone who knows the future. I got a note from the future once. It said, “Your glasses are on your head.”'],
    'The Twenty-One Balloons': ['The professor in The Twenty-One Balloons sets off to cross the ocean in a balloon. I tried to float in the bathtub with a book. The book did not float.'],
    'Hoot': ['Hoot is about kids saving burrowing owls. {cat} would love to meet the owls. {cat} would love it a little too much. {cat} is not invited.'],
    'Skyward': ['The spaceship in Skyward is completely obsessed with mushrooms. I respect that. I am completely obsessed with socks.'],
    'Stormbreaker': ['Alex Rider gets spy gadgets disguised as a yo-yo and zit cream. I got a stapler disguised as a stapler. Still waiting for my secret mission.'],
    'Shiloh': ['Marty hides a beagle named Shiloh. {dog} hides socks. Nobody has ever found them. Not even Marty.'],
    'Julie of the Wolves': ['Julie learns to talk to wolves. {dog} is part Welsh terrier, part wolf, and part couch cushion.'],
    'The Crossover': ['The Crossover tells a whole basketball season in poems. I tried to write my grocery list in poems. “Milk, so cold, so white, so true.” The cashier was not impressed.'],
    'New Kid': ['Jordan draws comics about his new school in New Kid. I drew a comic once. It was a guy losing his glasses. It was based on a true story.'],
    'Lulu and the Brontosaurus': ['Lulu wants a brontosaurus for her birthday. I also wanted a brontosaurus for my birthday. I got socks. Okay, I love socks. But still.'],
    'Restart': ['Chase forgets everything in Restart and has to figure out who he was. I do that every morning before breakfast.']
  },

  // A "P.S." under the Dude's line about her own books and rewards. {title}, {p}, {toGo}, and {prize} are filled in.
  ps: {
    owed: ['P.S. Book money is waiting: {prize}. Go tell a grown-up before {dog} spends it on socks.', 'P.S. You have book money waiting! ({prize}.) The Dude is already putting on his bookstore cardigan.'],
    quiz: ['P.S. You finished {title}! Take the AR quiz and add your points on its page. {cat} will supervise.', 'P.S. {title}: finished. Quiz: not yet. The Dude is tapping his sock impatiently.'],
    close: ['P.S. Only {toGo} points until book money. {dog} can smell the bookstore from here.', 'P.S. {toGo} more points and the book-money jar is full. {cat} has never been this awake.'],
    reading: ['P.S. You’re {p}% through {title}. {cat} is saving your spot. By sitting on it.', 'P.S. {title}, {p}% done. {dog} wants to know how it ends. {dog} can’t read, so you’ll have to explain.', 'P.S. {p}% through {title}. The Dude would like a full report. Spoilers allowed.'],
    readingStart: ['P.S. How’s {title} going? Give it ten pages. That’s the rule.', 'P.S. {title} is on your Reading shelf. It misses you. Books get lonely.']
  },

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
        'Safety is no accident.',
        'You don’t have to finish a book you don’t love. Put it on the Paused shelf. No hard feelings.',
        'If {cat} is asleep on a book, that’s your next book.',
        'Write things down: favorite lines, funny parts, words you didn’t know. That’s what My notes is for.',
        'AR points are nice. Stories are better. (Points are still nice. Especially the book-money kind.)'
      ]
    },
    {
      paragraphs: ['Now pull up a chair. That one’s the comfy one. What are we reading?']
    }
  ],
  signoff: 'The Dude',

  // The Secret Files: one of the Dude's old jobs unlocks at each point total (all-time AR points).
  // Spaced for about 250 points a year: one every few weeks, with the finale at 300.
  files: [
    { at: 5, job: 'Geologist', title: 'Junior Rock Licker',
      text: 'My first job was geologist. Here’s a real fact: geologists lick rocks. A wet rock shows its true colors. I licked about four thousand rocks. Maybe four thousand and one. My tongue still knows what granite tastes like. Gravelly. Do not recommend.' },
    { at: 20, job: 'Chemist', title: 'Bouncy Pudding Chemist',
      text: 'As a chemist, I tried to invent a pudding that wouldn’t spill. It worked too well. It bounced. Off the table, off the ceiling, out the window, and as far as I know, it is still bouncing somewhere in Nevada. If you see it, don’t eat it.' },
    { at: 40, job: 'Gold miner', title: 'Pea-Sized Gold Miner',
      text: 'I spent a whole summer panning for gold in a freezing mountain stream. I found exactly one nugget, about the size of a pea. I traded it for a used copy of Treasure Island. Best trade I ever made. The book had way more treasure in it.' },
    { at: 60, job: 'Cowboy', title: 'Cowboy Who Lost the Cows',
      text: 'I was a cowboy for one long season. My horse was named Pancake. Every night I read by the campfire, and every morning the cows were gone. I finished eleven books and lost forty-two cows. Pancake was not impressed. The cows were fine. They went home. Cows know the way.' },
    { at: 80, job: 'Marine biologist', title: 'Octopus Wrangler',
      text: 'Out on the ocean I studied octopuses. One of them, Gerald, could open jars, unscrew bottles, and take the glasses right off my face. That’s when I started losing my glasses. I like to think Gerald is wearing them somewhere, reading.' },
    { at: 100, job: 'Physicist', title: 'Bedtime Physicist',
      text: 'As a physicist, I made one important discovery: bedtime arrives 40% faster when you are in the middle of a good chapter. I measured it very carefully, with a stopwatch and a flashlight under the covers. Nobody gave me a prize. I know I’m right.' },
    { at: 125, job: 'Doctor', title: 'Dr. Two-Chapters',
      text: 'When I was a doctor, I gave every patient the same prescription: two chapters before bed, and call me in the morning. Sniffles? Two chapters. Grumpy? Two chapters. Broken arm? Okay, a cast. And then two chapters.' },
    { at: 150, job: 'Teacher', title: 'Teacher of the Year (Unofficial)',
      text: 'I taught fifth grade. My class read so many books that the library ran out of shelves, and we had to build new ones out of pizza boxes. They held up surprisingly well. They smelled amazing.' },
    { at: 175, job: 'Photographer', title: 'Blurry Hummingbird Photographer',
      text: 'I spent three years trying to photograph a hummingbird. I took four thousand pictures of blurry hummingbirds and one perfect, crystal-clear picture of my own thumb. It’s framed. It’s on the wall. Look for it.' },
    { at: 200, job: 'Botanist', title: 'Plant Whisperer',
      text: 'As a botanist, I grew a plant that only grows when someone reads out loud to it. It’s the one hanging by the bookshelf. Its name is Chapter. If it ever looks droopy, you know what to do.' },
    { at: 225, job: 'Video game developer', title: 'Final Boss Designer',
      text: 'I made exactly one video game. The final boss could only be defeated by reading it a bedtime story. It sold eleven copies, all to librarians. All eleven of them beat it on the first try.' },
    { at: 250, job: 'Geologist (again)', title: 'Geologist, Again',
      text: 'I went back to geology because I missed the rocks. The rocks did not miss me. Rocks are like that. I licked one, for old times’ sake, and decided I’d had enough.' },
    { at: 275, job: 'Fairy', title: 'Tooth Fairy, Retired',
      text: 'Okay. Fine. For one summer, and I am not explaining how, I was a tooth fairy. Tiny wings. Tiny hat. Very long nights. I got paid in quarters, which is how I bought the armchair. The wings are in a box in the attic. No, you can’t see them. They itch.' },
    { at: 300, job: 'All of them', title: 'Honorary Dude',
      text: 'Three hundred points. You know what that means? You’ve been a cowboy, a scientist, a detective, a dragon rider, and who knows what else, all without leaving your chair. That’s the whole secret. You’re officially an Honorary Dude now. (Sorry. It’s the only title I’ve got.)' }
  ],

  // The visiting pets: one comes by each time the app opens, in turn. Tap a pet to hear a line.
  // Leave a name blank and the pet goes by what it is ("Red-tailed hawk").
  pets: {
    bobby: { name: 'Bobby Joe', lines: [
      'People say secretary birds got their name because our head feathers look like old quill pens. I have never once answered a phone.',
      'I walk about 20 miles a day. You could read a whole chapter in that time. Maybe two.',
      'Yes, I can fly. I just prefer to strut. Have you seen these legs?',
      'These are real eyelashes. Thank you for noticing.',
      'I stomp on snakes. Also on cliffhangers. Mostly snakes.',
      'It looks like you’re trying to read a book. Would you like help? Just kidding. You’ve got this.',
      'Charlotte wrote words in a web. I’d write words with my head feathers, but I don’t have thumbs. Neither does Charlotte.',
      'Bobby Joe’s reading tip: when a chapter ends on a cliffhanger, read the next one standing up. Very dramatic.'
    ] },
    maple: { name: '{dog}', lines: [
      'Woof. (That means: read the part with the dog again.)',
      'Welsh terriers were bred to chase foxes out of holes. I chase plot twists.',
      'Because of Winn-Dixie is my favorite book. Winn-Dixie is a very good dog. So am I. Just saying.',
      'If you read out loud, I will listen. If you drop a snack, I will listen harder.',
      'I would like to report that {cat} is asleep on your book again.',
      'Shiloh is about a kid who would do anything for a dog. I support this message.',
      'Ginger Pye is a dog who goes missing and comes home. I also come home. Usually right at dinnertime.',
      'I buried a bookmark in the yard. Now the yard knows where it left off.'
    ] },
    fig: { name: '{cat}', lines: [
      'I’m not asleep on this book. I’m saving your place.',
      'The rule about me napping on your next book? I wrote that one.',
      'I knocked your bookmark off the table. You’re welcome.',
      'Gray stripes. Green eyes. Zero apologies.',
      'The best reading spot is wherever you were just sitting.',
      'Mrs. Frisby and the Rats of NIMH sounds like a delicious book. I mean delightful. Delightful.',
      'Millions of Cats is a true story. Mostly about me.',
      'The stripes are for speed. The naps are for balance.'
    ] },
    hawk: { name: '', lines: [
      'Kee-eeee-arrr! When an eagle screams in a movie, that’s really a red-tailed hawk like me. Real eagles sound like squeaky toys.',
      'I can spot a mouse from 100 feet up. I can spot an unfinished chapter from 200.',
      'In My Side of the Mountain, Sam trains a falcon named Frightful. Falcons are fine. Hawks have red tails. Just pointing that out.',
      'Brian in Hatchet could have used a hawk’s eyes. They see about eight times better than yours.',
      'I like sitting up high and looking at everything. That’s why libraries have tall shelves.',
      'Bobby Joe walks everywhere. I think that’s adorable.',
      'Fly through the next chapter. That’s what I’d do.',
      'My tail is red, my eyes are sharp, and my reading list is long.'
    ] }
  },

  // What the Dude says about her star rating (1 to 5).
  ratings: ['{cat} wouldn’t even nap on it.', 'Meh. {dog} would chew it.', 'Pretty good.', 'Loved it!', 'Dude-level amazing!'],

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
