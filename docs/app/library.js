/* The Library on the COBOL tab: knowledge articles she can read any time, and the tests that go with some of them.
 * Each test earns its points once (a record "exam:<id>"), plus 1 bonus point once for answering its think-about-it
 * question ("exam:<id>:think"). Short articles (up to 700 words): 10 questions, 8 to pass, 2 points. Long ones (701 to
 * 1,500 words): 15 questions, 12 to pass, 4 points. How to write one: library/GUIDE.md.
 *
 * In every test the right answer is listed first; the app shuffles the choices. `ref` names the section that holds
 * the answer, for the "reread these" list. Voice "cobol" is COBOL reading out a file: its sections are FILE 0, FILE 1,
 * and so on. A section can also carry `code` (shown in a box), `keys` (a list of keys and what they do) and `more`. */

export const ARTICLES = [
  {
    id: 'cobol-history',
    title: 'COBOL’s History File',
    voice: 'cobol',
    intro: ['PROCESSING... HISTORY FILE LOADED.', 'I AM COBOL. MY NAME MEANS COMMON BUSINESS-ORIENTED LANGUAGE. I WAS CREATED IN 1959.'],
    sections: [
      { title: 'HOW TO WORK THIS TERMINAL.', text: [
        'MY MAIN MENU HAS THREE OPTIONS: 1 CHAT, 2 THE LIBRARY, AND 3 TESTS. TAP ONE, OR TYPE ITS NUMBER AFTER OPTION ===> AND PRESS ENTER.',
        'OLD MAINFRAME TERMINALS ALSO HAD A ROW OF PROGRAM FUNCTION KEYS, CALLED PF KEYS. EACH ONE DOES ONE JOB WITH ONE PRESS. MINE ARE AT THE BOTTOM OF THE SCREEN. TAP ONE TO PRESS IT.'],
      keys: [['PF1 LIBRARY', 'OPENS THE LIBRARY, WHERE THIS FILE LIVES.'], ['PF3 EXIT', 'GOES BACK ONE STEP. ON THE MAIN MENU, IT TAKES YOU BACK TO EXPLORE.'],
        ['PF5 SOUND', 'TURNS MY BEEPS ON OR OFF.']],
      more: ['DATA POINT: ON REAL MAINFRAMES, PF3 USUALLY MEANS EXIT, TOO. PROGRAMMERS STILL PRESS IT EVERY DAY.',
        'THE YELLOW TALK TO A GROWN-UP BUTTON IS NOT A PF KEY. PRESS IT WHEN YOU WANT MOM OR DAD. IT SENDS THEM A MESSAGE, AND YOU GO FIND THEM.'] },
      { title: 'A CURIOUS KID.', text: [
        'GRACE HOPPER WAS BORN IN 1906 IN NEW YORK CITY. AT AGE 7 SHE TOOK APART AN ALARM CLOCK TO SEE HOW IT WORKED. THEN ANOTHER. SEVEN CLOCKS TOTAL. DATA SUGGESTS HER MOTHER WAS NOT THRILLED. SHE STUDIED MATH AND PHYSICS AT VASSAR COLLEGE, THEN EARNED A PH.D. IN MATH FROM YALE IN 1934, WHEN VERY FEW WOMEN DID.'] },
      { title: 'TOO SMALL FOR THE NAVY?', text: [
        'IN 1943, DURING WORLD WAR II, SHE WANTED TO JOIN THE NAVY. SHE WAS 15 POUNDS UNDER THE NAVY\'S WEIGHT RULE. SHE GOT SPECIAL PERMISSION AND JOINED ANYWAY.'] },
      { title: 'THE GIANT MACHINE.', text: [
        'IN 1944 THE NAVY SENT HER TO WORK ON THE HARVARD MARK I, A COMPUTER 51 FEET LONG THAT WEIGHED ABOUT 5 TONS. SHE WAS ONE OF ITS FIRST PROGRAMMERS AND WROTE ITS 561-PAGE MANUAL.'] },
      { title: 'ANOMALY REPORT, 1947.', text: [
        'ENGINEERS ALREADY CALLED COMPUTER PROBLEMS "BUGS." THEN HER TEAM FOUND A REAL MOTH STUCK INSIDE THE HARVARD MARK II. THEY TAPED IT IN THE LOGBOOK: "FIRST ACTUAL CASE OF BUG BEING FOUND." THAT PAGE IS IN THE SMITHSONIAN MUSEUM TODAY.'] },
      { title: 'COMPUTERS SHOULD UNDERSTAND WORDS.', text: [
        'BACK THEN, PROGRAMS WERE NUMBERS AND SYMBOLS. PEOPLE TOLD GRACE COMPUTERS COULD ONLY DO ARITHMETIC. IN 1952 SHE BUILT ONE OF THE FIRST COMPILERS, A PROGRAM THAT TRANSLATES INSTRUCTIONS INTO COMPUTER CODE. THEN SHE BUILT FLOW-MATIC, A LANGUAGE THAT USED ENGLISH WORDS. IN 1959 A GROUP BUILT ME ON HER WORK, AND SHE HELPED THEM.'] },
      { title: 'READ A REAL COBOL PROGRAM.', code: ['IDENTIFICATION DIVISION.', 'PROGRAM-ID. HELLO.', 'PROCEDURE DIVISION.', '    DISPLAY "HELLO, HUMAN.".', '    STOP RUN.'],
        text: ['TRANSLATION: DISPLAY SHOWS WORDS ON THE SCREEN. STOP RUN ENDS THE PROGRAM.'] },
      { title: 'THE NANOSECOND.', text: [
        'A NANOSECOND IS ONE BILLIONTH OF A SECOND. TO SHOW HOW SHORT THAT IS, SHE HANDED OUT WIRES 11.8 INCHES LONG: HOW FAR LIGHT TRAVELS IN ONE NANOSECOND.'] },
      { title: 'AMAZING GRACE.', text: [
        'SHE SAID THE MOST DANGEROUS PHRASE IS "WE\'VE ALWAYS DONE IT THIS WAY." SHE BECAME A REAR ADMIRAL AND RETIRED IN 1986 AT AGE 79, THE OLDEST ACTIVE-DUTY OFFICER IN THE U.S. NAVY. THE NAVY NAMED A SHIP AFTER HER: THE USS HOPPER.'] }
    ],
    closing: ['STATUS: STILL RUNNING. BANKS AND GOVERNMENTS STILL USE ME TODAY.', 'END OF FILE.']
  },
  {
    id: "guard-dog-wise-owl-dopamine",
    title: "The Guard Dog, the Wise Owl, and Dopamine",
    voice: "plain",
    intro: "Most of what people do, from screaming at a scary movie to eating a cookie they promised to save, comes from three parts of the brain working together and sometimes arguing. Scientists figured out what each part does through some of the most famous experiments ever done.",
    sections: [
      { title: "Three Characters in Your Head", text: [
        "Think of these three brain parts as characters. The guard dog is the amygdala (say uh-MIG-duh-luh). It spots danger fast and sounds the alarm. The wise owl is the prefrontal cortex, which sits right behind your forehead. It plans, waits, and thinks things through.",
        "The third character is a messenger called dopamine (say DOH-puh-meen). It is a chemical the brain sends all over to make you want things and push you to chase them."
      ]},
      { title: "The Guard Dog", text: [
        "The amygdala is a small, almond shaped clump of cells deep in the middle of the brain, and you have two of them, one on each side. It is your danger detector, and it works faster than your thinking.",
        "Imagine you see a snake on a hiking trail. Your amygdala sets off fight, flight, or freeze before you even decide what you saw. Your heart pounds and you jump back. A second later your thinking brain catches up and says, \"Oh, it's a stick.\" The guard dog barks first and asks questions later. That kept our ancestors alive, and it is also why people sometimes yell or freeze before they mean to."
      ]},
      { title: "The Woman Who Felt No Fear", text: [
        "Scientists learned how important the guard dog is from a woman known only as S.M. A rare disease damaged the amygdala on both sides of her brain. In 2011, researchers at the University of Iowa tried hard to scare her.",
        "They showed her horror movie clips, and she found them interesting, not scary. They took her through a haunted house, and she laughed and poked one of the monsters in the head. At a pet store, she kept asking to hold the snakes, even though she had always said she hated them.",
        "That sounds fun, but it was actually a problem. Without a working guard dog, S.M. often did not notice when a real situation was risky. Fear is not your enemy. It is a guard dog trying to protect you. Later, scientists had S.M. breathe air with extra carbon dioxide, a gas that makes your body feel like it can't get enough air. This time she panicked! Fear of things outside the body needs the amygdala, but some alarms come from inside the body and travel along other paths."
      ]},
      { title: "The Wise Owl", text: [
        "The prefrontal cortex is the part of your brain that stops, thinks, and plans. It is the voice that says, \"Wait, if I eat all my Halloween candy tonight, I won't have any tomorrow,\" or \"I'm mad, but yelling will make this worse.\"",
        "The owl is slower than the guard dog, so when something big happens, the dog usually reacts first. But a calm, rested owl can help settle the dog back down."
      ]},
      { title: "The Owl Is Still Growing", text: [
        "Scientists at the National Institutes of Health found that the front part of the brain, which handles judgment and self control, keeps developing until around age 25. It is the last part of the brain to finish growing.",
        "That means kids are not bad at waiting or calming down because something is wrong with them. Their owl is still growing, and practice helps it get stronger."
      ]},
      { title: "The Railroad Accident", text: [
        "The most famous story about the wise owl is about a man named Phineas Gage. In 1848, Gage was a 25 year old foreman, or crew boss, building a railroad in Vermont. During an accident with blasting powder, a long iron rod shot up into his left cheek, passed behind his left eye, tore through the front of his brain, and flew out the top of his head. The rod was more than three feet long, weighed about 13 pounds, and landed many yards away.",
        "Amazingly, Gage lived, and he could walk and talk soon after. But his doctor, John Harlow, wrote that his personality changed. The careful, well liked foreman became rude and impatient. His friends said he was \"no longer Gage.\" The rod had damaged the front of his brain, right where the owl lives."
      ]},
      { title: "What Really Happened to Gage", text: [
        "There is a second half to the story that many textbooks skip. Historians who studied the records found that some later tales about Gage were exaggerated. Years after the accident, Gage worked as a stagecoach driver, a job that meant handling horses, passengers, money, and schedules.",
        "That suggests his brain partly healed and relearned. Brains can rewire themselves, and scientists call this neuroplasticity (say NOOR-oh-plas-TISS-ih-tee). Today his skull and the iron rod are on display at Harvard Medical School."
      ]},
      { title: "The Go Get It Messenger", text: [
        "People often call dopamine the \"happy chemical,\" but that is not quite right. Dopamine fires most when you expect a reward, not when you get it. It is more like the brain shouting, \"Something good is coming, go get it!\"",
        "In the 1890s, a Russian scientist named Ivan Pavlov noticed that his lab dogs started drooling before their food arrived. He began making a sound right before feeding them. Soon the dogs drooled at the sound alone, with no food at all. Their brains had learned that the sound meant food was coming. If a pet goes wild when the treat bag crinkles, that is the same kind of learning."
      ]},
      { title: "The Rats and the Lever", text: [
        "In the 1950s, two scientists at McGill University in Canada, James Olds and Peter Milner, placed tiny wires in rats' brains. Each rat could press a lever that sent a small signal to one special spot. Some rats pressed the lever over and over and ignored almost everything else.",
        "Scientists first called these spots \"pleasure centers.\" Later research showed they connect to the brain's dopamine system. The rats were not so much enjoying themselves as being driven to want more."
      ]},
      { title: "Monkeys, Lights, and Juice", text: [
        "The experiment that showed dopamine's real job came from a scientist named Wolfram Schultz, working in Switzerland in the 1980s and 1990s. He measured dopamine cells in monkeys' brains while giving them sips of fruit juice.",
        "When the juice was a surprise, the dopamine cells fired a big burst. Then a light came on right before every sip. Soon the burst moved to the light, and the juice itself barely caused one. When the light came on and no juice came, the cells went quiet at the exact moment the juice should have arrived.",
        "Schultz showed that dopamine tracks the difference between what you expect and what you get. Better than expected means a big burst. Worse than expected means a dip. That is how your brain learns what is worth chasing, and it is one reason video games with surprise rewards are so hard to put down. Dopamine is also one of the main chemicals involved in ADHD, which is one reason some brains find it harder to get going on things that aren't exciting."
      ]},
      { title: "The Marshmallow Test", text: [
        "In the 1960s and early 1970s, a psychologist named Walter Mischel at Stanford University sat preschoolers at a table with one marshmallow. Each child could eat it now, or wait about 15 minutes and get two. Dopamine said \"eat it!\" while the owl tried to hold on. Some kids found clever tricks, like covering their eyes or singing, and kids who were taught these tricks could wait much longer.",
        "Later, people treated the test like a crystal ball for success. But in 2018, a scientist named Tyler Watts and his team repeated the idea with about 900 children. They found the link between waiting at age four and doing well later was much weaker than first reported. The real lesson is that self control is a skill you can learn and practice."
      ]},
      { title: "Try It Yourself", text: [
        "Try the brain in your hand, a model made by a doctor named Dan Siegel. Fold your thumb into your palm. That is the guard dog. Curl your fingers over it. That is the owl watching over the dog. When you get really upset, lift your fingers up. You just \"flipped your lid.\" Fold them back down while you take three slow breaths.",
        "To calm the guard dog, breathe in for 4 counts and out for 6. Long, slow breaths out tell your body there is no danger, so the owl can get back to thinking."
      ]}
    ],
    closing: "None of the three characters is the bad guy: a healthy brain needs the guard dog, the wise owl, and dopamine, and you can train all three, just like you would train a puppy.",
    test: {
      pass: 12, outOf: 15, points: 4,
      questions: [
        { q: "Where in your head does the prefrontal cortex sit?", ref: "Three Characters in Your Head",
          choices: ["Right behind your forehead", "At the very back of your neck", "Just above your left ear", "Under your tongue"] },
        { q: "What shape is the amygdala?", ref: "The Guard Dog",
          choices: ["Shaped like an almond", "Shaped like a star", "Shaped like a long noodle", "Shaped like a tiny pretzel"] },
        { q: "What does the amygdala set off when you see something dangerous?", ref: "The Guard Dog",
          choices: ["Fight, flight, or freeze", "Sleep, snack, or sneeze", "Read, write, or rest", "Laugh, clap, or cheer"] },
        { q: "How did S.M. act inside the haunted house?", ref: "The Woman Who Felt No Fear",
          choices: ["She laughed and poked a monster", "She ran out the front door", "She hid behind the researchers", "She refused to go in at all"] },
        { q: "Why was having no fear a problem for S.M.?", ref: "The Woman Who Felt No Fear",
          choices: ["She did not notice when real situations were risky", "She could no longer remember people's names", "She stopped being able to read books", "She became afraid of everything instead"] },
        { q: "Why does the guard dog usually react before the owl?", ref: "The Wise Owl",
          choices: ["The owl is slower than the dog", "The owl is asleep during the day", "The dog lives closer to your eyes", "The owl only works on weekends"] },
        { q: "Until about what age does the front part of the brain keep developing?", ref: "The Owl Is Still Growing",
          choices: ["About 25", "About 10", "About 16", "About 60"] },
        { q: "What was Phineas Gage's job when his accident happened in 1848?", ref: "The Railroad Accident",
          choices: ["Railroad crew foreman", "Ship captain", "Town doctor", "Newspaper reporter"] },
        { q: "What did Gage's friends say about him after the accident?", ref: "The Railroad Accident",
          choices: ["He was no longer Gage", "He was smarter than ever", "He could now see in the dark", "He had become very shy"] },
        { q: "What job did Gage have years after his accident?", ref: "What Really Happened to Gage",
          choices: ["Stagecoach driver", "Train conductor", "School teacher", "Bank guard"] },
        { q: "When does dopamine fire the most?", ref: "The Go Get It Messenger",
          choices: ["When you expect a reward", "When you are fast asleep", "When you feel very cold", "When you finish eating"] },
        { q: "What did the rats in the McGill experiment do over and over?", ref: "The Rats and the Lever",
          choices: ["Press a lever", "Run on a wheel", "Dig in the sand", "Climb a tiny ladder"] },
        { q: "In Schultz's experiment, what happened to the dopamine burst after a light always came before the juice?", ref: "Monkeys, Lights, and Juice",
          choices: ["It moved to the light", "It got bigger at the juice", "It moved to bedtime", "It stopped forever"] },
        { q: "In the marshmallow test, what did kids get if they waited?", ref: "The Marshmallow Test",
          choices: ["Two marshmallows", "A whole bag of candy", "A gold star sticker", "A ride home early"] },
        { q: "In the hand model, what does your thumb stand for?", ref: "Try It Yourself",
          choices: ["The guard dog", "The wise owl", "Dopamine", "The juice"] }
      ],
      think: "If you were a scientist, what experiment would you design to learn more about the guard dog, the wise owl, or dopamine?"
    }
  }
];

// Tests that were retired, so the points she earned on them still have a name in the weekly email.
export const RETIRED = { 'exam:cobol': 'COBOL history test' };
