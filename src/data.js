const q = (prompt, choices, answer, why) => ({ prompt, choices, answer, why })

export const ZONES = [
  {
    id: 'verdant',
    index: 0,
    numeral: 'I',
    name: 'Verdant Reach',
    short: 'Verdant',
    glyph: '❧',
    accent: '#8ff5d4',
    objective: 'Attune the Verdant Beacon',
    missionTitle: 'The Verdant Equation',
    kicker: 'Study Trial · I',
    arrival: 'The old grove remembers every truth spoken beneath it.',
  },
  {
    id: 'hollow',
    index: 1,
    numeral: 'II',
    name: 'Prism Hollow',
    short: 'Hollow',
    glyph: '◇',
    accent: '#9dd8ff',
    objective: 'Attune the Prism Beacon',
    missionTitle: 'The Hollow Proof',
    kicker: 'Study Trial · II',
    arrival: 'Light bends differently where the mountain keeps its secrets.',
  },
  {
    id: 'archive',
    index: 2,
    numeral: 'III',
    name: 'Skybound Archive',
    short: 'Archive',
    glyph: '⌂',
    accent: '#f4cf91',
    objective: 'Attune the Archive Beacon',
    missionTitle: 'The Skybound Synthesis',
    kicker: 'Study Trial · III',
    arrival: 'Above the clouds, forgotten knowledge waits in golden stone.',
  },
]

export const SUBJECTS = {
  mathematics: {
    name: 'Mathematics',
    glyph: 'Σ',
    accent: '#8ff5d4',
    blurb: 'Pattern, proof, and number',
    topics: [
      {
        id: 'algebra',
        label: 'Algebra',
        keywords: ['algebra', 'equation', 'linear', 'quadratic', 'variable', 'expression', 'polynomial', 'solve'],
        questions: [
          q('Solve for x:  3x + 5 = 20', ['x = 3', 'x = 5', 'x = 15', 'x = 25'], 1, 'Subtract 5 from both sides to get 3x = 15, then divide by 3.'),
          q('Expand:  (x + 4)(x − 2)', ['x² + 2x − 8', 'x² − 2x + 8', 'x² + 6x − 8', 'x² − 8'], 0, 'Multiply each term: x² − 2x + 4x − 8 = x² + 2x − 8.'),
          q('If 2x − 7 = 11, what is x?', ['x = 2', 'x = 7', 'x = 9', 'x = 18'], 2, 'Add 7 to both sides: 2x = 18, so x = 9.'),
        ],
      },
      {
        id: 'geometry',
        label: 'Geometry',
        keywords: ['geometry', 'triangle', 'circle', 'angle', 'area', 'perimeter', 'pythagoras', 'shape', 'polygon'],
        questions: [
          q('What is the sum of the interior angles of a triangle?', ['90°', '180°', '270°', '360°'], 1, 'Every triangle in flat space has interior angles totaling 180°.'),
          q('A circle has radius 4. What is its area?', ['8π', '12π', '16π', '32π'], 2, 'Area = πr². With r = 4, the area is 16π.'),
          q('A right triangle has legs 6 and 8. How long is the hypotenuse?', ['9', '10', '12', '14'], 1, 'Pythagoras: 6² + 8² = 36 + 64 = 100, and √100 = 10.'),
        ],
      },
      {
        id: 'fractions',
        label: 'Fractions & Ratio',
        keywords: ['fraction', 'decimal', 'percent', 'percentage', 'ratio', 'proportion', 'fraction'],
        questions: [
          q('What is 3/4 + 1/8?', ['4/12', '6/8', '7/8', '1'], 2, 'Rewrite 3/4 as 6/8. Then 6/8 + 1/8 = 7/8.'),
          q('Which fraction is equal to 0.75?', ['1/2', '2/3', '3/4', '4/5'], 2, '0.75 means 75 hundredths, which simplifies to 3/4.'),
          q('What is 20% of 150?', ['20', '25', '30', '45'], 2, '20% = 0.20, and 0.20 × 150 = 30.'),
        ],
      },
      {
        id: 'probability',
        label: 'Probability & Data',
        keywords: ['probability', 'chance', 'statistics', 'mean', 'median', 'average', 'data', 'random'],
        questions: [
          q('A fair coin is flipped once. What is the probability of heads?', ['1/4', '1/3', '1/2', '1'], 2, 'There are two equally likely outcomes, and one is heads.'),
          q('What is the mean of 4, 8, 6, and 10?', ['6', '7', '8', '9'], 1, 'The sum is 28. Dividing by the four values gives 7.'),
          q('What is the probability of rolling an even number on a fair six-sided die?', ['1/6', '1/3', '1/2', '2/3'], 2, 'The even results are 2, 4, and 6: three of six outcomes.'),
        ],
      },
    ],
    general: [
      q('What is 7 × 8?', ['48', '54', '56', '64'], 2, 'Seven groups of eight equal 56.'),
      q('What is 144 ÷ 12?', ['10', '11', '12', '14'], 2, 'Twelve times twelve is 144, so the quotient is 12.'),
      q('What is the value of 5³?', ['15', '25', '100', '125'], 3, '5³ means 5 × 5 × 5, which equals 125.'),
      q('Which number is prime?', ['21', '27', '29', '33'], 2, '29 has no positive divisors besides 1 and itself.'),
      q('Simplify:  2(x + 3)', ['2x + 3', '2x + 6', 'x + 6', '2x + 5'], 1, 'Distribute the 2 to both terms inside the parentheses.'),
      q('What is 45 minutes as a fraction of an hour?', ['1/4', '1/3', '1/2', '3/4'], 3, '45 out of 60 minutes simplifies to 3/4.'),
      q('A square has side length 9. What is its perimeter?', ['18', '27', '36', '81'], 2, 'A square has four equal sides, so 4 × 9 = 36.'),
      q('Which is the best approximation of π?', ['2.14', '3.14', '4.14', '5.14'], 1, 'Pi is approximately 3.14159.'),
      q('What is the next prime number after 23?', ['25', '27', '29', '31'], 2, '25 and 27 are composite. 29 is the next prime.'),
    ],
  },

  history: {
    name: 'History',
    glyph: '◈',
    accent: '#f4cf91',
    blurb: 'People, turning points, and time',
    topics: [
      {
        id: 'ancient',
        label: 'Ancient World',
        keywords: ['ancient', 'egypt', 'rome', 'roman', 'greece', 'greek', 'mesopotamia', 'babylon', 'pyramid'],
        questions: [
          q('Which civilization built the pyramids at Giza?', ['Ancient Egypt', 'Ancient Rome', 'Ancient Greece', 'The Aztec Empire'], 0, 'The Giza pyramids were built in ancient Egypt as royal tombs.'),
          q('Which Roman city was buried by Mount Vesuvius in 79 CE?', ['Carthage', 'Pompeii', 'Athens', 'Alexandria'], 1, 'Pompeii was preserved under volcanic ash after Vesuvius erupted.'),
          q('The Code of Hammurabi came from which ancient civilization?', ['Babylon', 'Egypt', 'Persia', 'Macedonia'], 0, 'Hammurabi ruled Babylon and issued one of the earliest written law codes.'),
        ],
      },
      {
        id: 'medieval',
        label: 'Medieval World',
        keywords: ['medieval', 'middle ages', 'feudal', 'feudalism', 'crusades', 'magna carta', 'knight', 'silk road'],
        questions: [
          q('In feudalism, what was a grant of land called?', ['A fief', 'A guild', 'A charter', 'A tithe'], 0, 'A fief was land granted in exchange for loyalty and service.'),
          q('In which year was the Magna Carta sealed?', ['1066', '1215', '1348', '1492'], 1, 'King John sealed the Magna Carta in 1215 at Runnymede.'),
          q('The Silk Road mainly connected Europe with which region?', ['Australia', 'Asia', 'South America', 'Antarctica'], 1, 'Trade routes carried goods and ideas between Europe and Asia.'),
        ],
      },
      {
        id: 'revolutions',
        label: 'Revolutions',
        keywords: ['revolution', 'independence', 'french revolution', 'industrial', 'enlightenment', '1776', '1789'],
        questions: [
          q('In which year did the French Revolution begin?', ['1607', '1688', '1776', '1789'], 3, 'The storming of the Bastille took place in 1789.'),
          q('The United States Declaration of Independence was adopted in which year?', ['1492', '1620', '1776', '1865'], 2, 'The Declaration was adopted on July 4, 1776.'),
          q('The Industrial Revolution began in which country?', ['France', 'Britain', 'Germany', 'Italy'], 1, 'Britain led early industrialization in the 18th century.'),
        ],
      },
      {
        id: 'worldwars',
        label: 'Modern Conflicts',
        keywords: ['world war', 'ww1', 'ww2', 'wwi', 'wwii', 'cold war', '1914', '1945', 'treaty'],
        questions: [
          q('In which year did World War I begin?', ['1905', '1914', '1918', '1939'], 1, 'World War I began in 1914 after the assassination of Archduke Franz Ferdinand.'),
          q('In which year did World War II end?', ['1918', '1939', '1945', '1949'], 2, 'World War II ended in 1945.'),
          q('The Cold War was primarily a rivalry between the United States and which power?', ['China', 'Japan', 'The Soviet Union', 'Germany'], 2, 'The United States and the Soviet Union competed from roughly 1947 to 1991.'),
        ],
      },
    ],
    general: [
      q('Who was the first president of the United States?', ['Thomas Jefferson', 'George Washington', 'John Adams', 'Abraham Lincoln'], 1, 'George Washington served as the first U.S. president.'),
      q('Who developed a movable-type printing press in Europe?', ['Johannes Gutenberg', 'Leonardo da Vinci', 'Galileo Galilei', 'Nicolaus Copernicus'], 0, 'Gutenberg’s press made books far easier to reproduce.'),
      q('The ancient Olympic Games originated in which country?', ['Italy', 'Greece', 'Egypt', 'Persia'], 1, 'The games were held at Olympia in ancient Greece.'),
      q('In which year did the Berlin Wall fall?', ['1961', '1975', '1989', '1991'], 2, 'The Berlin Wall opened in 1989.'),
      q('Tenochtitlan was the capital of which empire?', ['The Inca Empire', 'The Aztec Empire', 'The Ottoman Empire', 'The Roman Empire'], 1, 'Tenochtitlan was the Aztec capital, located beneath modern Mexico City.'),
      q('The Renaissance began in which region?', ['Italy', 'Norway', 'India', 'Brazil'], 0, 'The Renaissance emerged in Italian city-states such as Florence.'),
      q('The Rosetta Stone helped scholars decipher which writing system?', ['Cuneiform', 'Egyptian hieroglyphs', 'Runes', 'Sanskrit'], 1, 'Its parallel texts unlocked the meaning of Egyptian hieroglyphs.'),
      q('In which year did humans first land on the Moon?', ['1957', '1961', '1969', '1975'], 2, 'Apollo 11 landed on the Moon in 1969.'),
      q('Which document begins with “We the People”?', ['The Magna Carta', 'The U.S. Constitution', 'The Declaration of Independence', 'The Bill of Rights'], 1, 'The preamble of the U.S. Constitution begins with those words.'),
    ],
  },

  science: {
    name: 'Science',
    glyph: '⚛',
    accent: '#9dd8ff',
    blurb: 'Matter, life, energy, and stars',
    topics: [
      {
        id: 'biology',
        label: 'Biology',
        keywords: ['biology', 'cell', 'dna', 'photosynthesis', 'evolution', 'body', 'organ', 'plant', 'life'],
        questions: [
          q('Which organelle is known as the powerhouse of the cell?', ['Nucleus', 'Mitochondrion', 'Ribosome', 'Vacuole'], 1, 'Mitochondria release energy from food through cellular respiration.'),
          q('Photosynthesis uses carbon dioxide, water, and what else?', ['Oxygen', 'Sunlight', 'Nitrogen', 'Salt'], 1, 'Plants use light energy to make sugars from carbon dioxide and water.'),
          q('What molecule carries genetic information?', ['ATP', 'DNA', 'Glucose', 'Hemoglobin'], 1, 'DNA stores the instructions for building and operating living things.'),
        ],
      },
      {
        id: 'chemistry',
        label: 'Chemistry',
        keywords: ['chemistry', 'atom', 'molecule', 'periodic', 'acid', 'chemical', 'reaction', 'element', 'compound'],
        questions: [
          q('What is the chemical formula for water?', ['CO₂', 'H₂O', 'O₂', 'NaCl'], 1, 'Water contains two hydrogen atoms and one oxygen atom.'),
          q('A solution with a pH below 7 is considered what?', ['Acidic', 'Neutral', 'Basic', 'Metallic'], 0, 'Lower pH values indicate higher acidity.'),
          q('The atomic number of an element equals the number of what?', ['Neutrons', 'Protons', 'Electrons in the outer shell', 'Isotopes'], 1, 'Atomic number is the count of protons in an atom’s nucleus.'),
        ],
      },
      {
        id: 'physics',
        label: 'Physics',
        keywords: ['physics', 'force', 'motion', 'energy', 'gravity', 'electricity', 'wave', 'speed', 'newton'],
        questions: [
          q('Which equation expresses Newton’s second law of motion?', ['E = mc²', 'F = ma', 'v = d/t', 'P = IV'], 1, 'Force equals mass multiplied by acceleration.'),
          q('The speed of light in a vacuum is about how fast?', ['300 km/s', '3,000 km/s', '300,000 km/s', '30,000,000 km/s'], 2, 'Light travels at roughly 300,000 kilometers per second.'),
          q('What is Earth’s approximate gravitational acceleration at its surface?', ['1.6 m/s²', '9.8 m/s²', '24 m/s²', '98 m/s²'], 1, 'Objects accelerate downward at about 9.8 meters per second squared.'),
        ],
      },
      {
        id: 'astronomy',
        label: 'Astronomy',
        keywords: ['astronomy', 'planet', 'star', 'solar', 'universe', 'moon', 'space', 'galaxy', 'orbit'],
        questions: [
          q('Which planet is the largest in our solar system?', ['Saturn', 'Jupiter', 'Neptune', 'Earth'], 1, 'Jupiter is the largest planet by mass and diameter.'),
          q('What is at the center of our solar system?', ['Earth', 'The Moon', 'The Sun', 'Jupiter'], 2, 'The Sun is the star at the center of the solar system.'),
          q('What causes the phases of the Moon?', ['Earth’s shadow', 'The Moon’s orbit around Earth', 'The Sun moving around Earth', 'Clouds'], 1, 'We see different portions of the Moon’s sunlit side as it orbits Earth.'),
        ],
      },
    ],
    general: [
      q('What is the hardest natural substance?', ['Iron', 'Quartz', 'Diamond', 'Granite'], 2, 'Diamond ranks 10 on the Mohs hardness scale.'),
      q('At sea level, water boils at what temperature?', ['0 °C', '50 °C', '100 °C', '212 °C on the Celsius scale'], 2, 'At standard pressure, water boils at 100 degrees Celsius.'),
      q('What do red blood cells carry?', ['Oxygen', 'Bile', 'Hormones only', 'Bone tissue'], 0, 'Hemoglobin in red blood cells binds and transports oxygen.'),
      q('Earth’s atmosphere is mostly made of which gas?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 1, 'Nitrogen makes up about 78% of the atmosphere.'),
      q('What force pulls objects toward Earth?', ['Friction', 'Magnetism', 'Gravity', 'Tension'], 2, 'Gravity attracts objects with mass toward one another.'),
      q('Which group of animals begins life in water and often lives on land as adults?', ['Reptiles', 'Amphibians', 'Birds', 'Mammals'], 1, 'Amphibians such as frogs metamorphose from aquatic young.'),
      q('What is the chemical symbol for gold?', ['Ag', 'Au', 'Fe', 'Gd'], 1, 'Au comes from the Latin word aurum.'),
      q('Sound travels fastest through which medium?', ['Air', 'Water', 'Solids', 'A vacuum'], 2, 'Particles are packed most closely in solids, so sound moves fastest there.'),
      q('Which energy source is renewable?', ['Coal', 'Sunlight', 'Natural gas', 'Petroleum'], 1, 'Sunlight is continuously replenished, unlike fossil fuels.'),
    ],
  },

  languages: {
    name: 'Languages',
    glyph: '⌘',
    accent: '#b8a4ff',
    blurb: 'Words, grammar, and world tongues',
    topics: [
      {
        id: 'grammar',
        label: 'Grammar',
        keywords: ['grammar', 'tense', 'verb', 'sentence', 'syntax', 'noun', 'adjective', 'punctuation', 'conjugation'],
        questions: [
          q('What is the past tense of “go”?', ['goed', 'gone', 'went', 'going'], 2, '“Went” is the irregular past tense form of “go.”'),
          q('In the sentence “The swift fox leaps,” what is the subject?', ['swift', 'fox', 'leaps', 'The swift'], 1, 'The fox performs the action, so it is the subject.'),
          q('What is the plural of “child”?', ['childs', 'childes', 'children', 'child’s'], 2, '“Children” is the irregular plural form.'),
        ],
      },
      {
        id: 'vocabulary',
        label: 'Vocabulary',
        keywords: ['vocabulary', 'word', 'etymology', 'root', 'synonym', 'antonym', 'prefix', 'suffix', 'meaning'],
        questions: [
          q('Which word is a synonym of “benevolent”?', ['Cruel', 'Kind', 'Silent', 'Fragile'], 1, 'Benevolent means kind and generous.'),
          q('Which word is an antonym of “scarce”?', ['Rare', 'Limited', 'Abundant', 'Hidden'], 2, 'Scarce means in short supply; abundant means plentiful.'),
          q('The prefix “tele-” means what?', ['Far', 'Small', 'Water', 'Before'], 0, '“Tele-” comes from Greek and means far, as in telephone or telescope.'),
        ],
      },
      {
        id: 'spanish',
        label: 'Spanish',
        keywords: ['spanish', 'español', 'espanol', 'libro', 'gracias', 'hola', 'verbos'],
        questions: [
          q('What does “libro” mean in Spanish?', ['Book', 'Window', 'Friend', 'River'], 0, '“Libro” is Spanish for book.'),
          q('What does “gracias” mean?', ['Please', 'Thank you', 'Goodbye', 'Welcome'], 1, '“Gracias” expresses thanks in Spanish.'),
          q('What does “¿Cómo estás?” mean?', ['Where are you?', 'How are you?', 'What is your name?', 'How old are you?'], 1, 'The phrase asks how someone is doing.'),
        ],
      },
      {
        id: 'french',
        label: 'French',
        keywords: ['french', 'français', 'francais', 'merci', 'bonjour', 'chat', 'langue'],
        questions: [
          q('What does “merci” mean in French?', ['Sorry', 'Thank you', 'Hello', 'Please'], 1, '“Merci” is French for thank you.'),
          q('What does “bonjour” mean?', ['Good night', 'Hello', 'Goodbye', 'Please'], 1, '“Bonjour” is a standard French greeting.'),
          q('What does “chat” mean in French?', ['Dog', 'Bird', 'Cat', 'Horse'], 2, '“Chat” is French for cat.'),
        ],
      },
    ],
    general: [
      q('Which part of speech describes a noun?', ['Verb', 'Adjective', 'Adverb', 'Preposition'], 1, 'Adjectives modify or describe nouns.'),
      q('Which punctuation mark ends a direct question?', ['Period', 'Comma', 'Question mark', 'Colon'], 2, 'A question mark signals a direct question.'),
      q('In “She ran quickly,” what part of speech is “quickly”?', ['Adjective', 'Adverb', 'Noun', 'Pronoun'], 1, '“Quickly” modifies the verb “ran,” so it is an adverb.'),
      q('Etymology is the study of what?', ['Sentence structure', 'Word origins', 'Speech sounds', 'Handwriting'], 1, 'Etymology traces the history and development of words.'),
      q('Which language has the most native speakers worldwide?', ['English', 'Spanish', 'Mandarin Chinese', 'Arabic'], 2, 'Mandarin Chinese has the largest native-speaker population.'),
      q('“Their,” “they’re,” and “there” are examples of what?', ['Homophones', 'Antonyms', 'Acronyms', 'Idioms'], 0, 'They sound alike but have different meanings and spellings.'),
      q('A verb typically expresses what?', ['A person, place, or thing', 'An action or state', 'A descriptive quality', 'A relationship between nouns'], 1, 'Verbs express actions or states of being.'),
      q('Which Spanish article is masculine singular?', ['la', 'los', 'el', 'las'], 2, '“El” is the masculine singular definite article.'),
      q('When reading, what does “inference” mean?', ['Copying a sentence', 'Drawing a conclusion from clues', 'Memorizing every word', 'Skipping unfamiliar words'], 1, 'An inference combines evidence in the text with reasoning.'),
    ],
  },

  literature: {
    name: 'Literature',
    glyph: '✒',
    accent: '#ffb7a1',
    blurb: 'Stories, poems, and close reading',
    topics: [
      {
        id: 'narrative',
        label: 'Story & Narrative',
        keywords: ['novel', 'story', 'character', 'plot', 'narrative', 'protagonist', 'setting', 'fiction'],
        questions: [
          q('Who is the protagonist of a story?', ['The narrator', 'The main character', 'The author', 'The antagonist'], 1, 'The protagonist is the central character whose journey drives the story.'),
          q('What does “setting” refer to in a story?', ['The time and place', 'The final sentence', 'The author’s biography', 'The book’s cover'], 0, 'Setting establishes when and where a narrative takes place.'),
          q('What is the climax of a plot?', ['The introduction', 'The turning point of highest tension', 'The list of characters', 'The final page'], 1, 'The climax is the decisive turning point where tension peaks.'),
        ],
      },
      {
        id: 'poetry',
        label: 'Poetry',
        keywords: ['poem', 'poetry', 'stanza', 'meter', 'rhyme', 'verse', 'sonnet', 'metaphor'],
        questions: [
          q('What is a stanza in a poem?', ['A group of lines', 'A single word', 'The poem’s title', 'A type of rhyme'], 0, 'Stanzas are grouped lines, similar to paragraphs in prose.'),
          q('What is a metaphor?', ['A comparison using “like” or “as”', 'A direct comparison without “like” or “as”', 'A repeated sound', 'A line break'], 1, 'A metaphor states one thing is another, without using “like” or “as.”'),
          q('What is a rhyme scheme?', ['The pattern of end rhymes', 'The poem’s font', 'The number of pages', 'The poet’s name'], 0, 'A rhyme scheme maps which line endings rhyme with one another.'),
        ],
      },
      {
        id: 'analysis',
        label: 'Literary Analysis',
        keywords: ['theme', 'symbol', 'metaphor', 'analysis', 'foreshadowing', 'irony', 'tone', 'close reading'],
        questions: [
          q('What is a theme?', ['A central idea or message', 'The first line', 'A character’s name', 'The number of chapters'], 0, 'A theme is an underlying idea explored throughout a work.'),
          q('A symbol in literature is something that does what?', ['Repeats a sound', 'Stands for something beyond its literal meaning', 'Describes the weather', 'Names the author'], 1, 'Symbols carry additional meaning beyond their literal form.'),
          q('What is foreshadowing?', ['A hint about events to come', 'A summary of the plot', 'A list of characters', 'A funny aside'], 0, 'Foreshadowing plants clues that prepare readers for later events.'),
        ],
      },
      {
        id: 'worldlit',
        label: 'World Literature',
        keywords: ['shakespeare', 'homer', 'epic', 'odyssey', 'achebe', 'world literature', 'author', 'classic'],
        questions: [
          q('Who wrote “Romeo and Juliet”?', ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Homer'], 1, 'Shakespeare wrote the tragedy in the late 16th century.'),
          q('The “Odyssey” is traditionally attributed to which poet?', ['Virgil', 'Homer', 'Sophocles', 'Ovid'], 1, 'Homer is traditionally credited with the Odyssey and the Iliad.'),
          q('Who wrote “Things Fall Apart”?', ['Chinua Achebe', 'Toni Morrison', 'Gabriel García Márquez', 'George Orwell'], 0, 'Achebe’s novel was published in 1958.'),
        ],
      },
    ],
    general: [
      q('Which figure of speech uses “like” or “as” to compare two things?', ['Metaphor', 'Simile', 'Personification', 'Hyperbole'], 1, 'A simile makes a comparison using “like” or “as.”'),
      q('Who is the antagonist?', ['The main character', 'The character or force opposing the protagonist', 'The narrator', 'The author'], 1, 'The antagonist creates conflict with the protagonist.'),
      q('Which pronoun signals first-person narration?', ['He', 'She', 'I', 'They'], 2, 'First-person narrators refer to themselves as “I.”'),
      q('What is the plot of a story?', ['The sequence of events', 'The book’s cover', 'The author’s life', 'The list of symbols'], 0, 'Plot describes the arranged sequence of events in a narrative.'),
      q('Alliteration is the repetition of what?', ['Initial consonant sounds', 'Final rhymes', 'Whole sentences', 'Vowel meanings'], 0, 'Alliteration repeats sounds at the beginnings of nearby words.'),
      q('A tragedy typically ends with what?', ['A wedding', 'The protagonist’s downfall', 'A comic misunderstanding', 'A travelogue'], 1, 'Tragic narratives often conclude with the protagonist’s ruin or death.'),
      q('A fable often ends with what?', ['A moral', 'A bibliography', 'A riddle', 'A map'], 0, 'Fables are short tales that teach a moral lesson.'),
      q('What does “genre” mean?', ['A category of literature', 'A type of punctuation', 'The length of a novel', 'The author’s age'], 0, 'Genre classifies works by shared conventions and style.'),
      q('Who tells the story in a narrative?', ['The narrator', 'The reader', 'The printer', 'The cover artist'], 0, 'The narrator is the voice that conveys the story to the reader.'),
    ],
  },

  geography: {
    name: 'Geography',
    glyph: '◍',
    accent: '#a8e6a3',
    blurb: 'Earth, maps, places, and people',
    topics: [
      {
        id: 'earth',
        label: 'Earth Science',
        keywords: ['earth', 'plate', 'volcano', 'earthquake', 'rock', 'climate', 'tectonic', 'geology'],
        questions: [
          q('What is Earth’s outermost layer called?', ['The core', 'The mantle', 'The crust', 'The atmosphere'], 2, 'The crust is the thin, solid outer layer of Earth.'),
          q('Earthquakes are most commonly caused by what?', ['Tectonic plate movement', 'Ocean tides', 'Cloud formation', 'Moon phases'], 0, 'Moving tectonic plates build stress that releases as earthquakes.'),
          q('When magma reaches Earth’s surface, it forms what?', ['A glacier', 'A volcano', 'A delta', 'A canyon'], 1, 'A volcano forms where magma erupts onto the surface.'),
        ],
      },
      {
        id: 'maps',
        label: 'Maps & Coordinates',
        keywords: ['map', 'latitude', 'longitude', 'scale', 'compass', 'coordinate', 'equator', 'meridian'],
        questions: [
          q('Lines of latitude measure distance north or south of what?', ['The equator', 'The prime meridian', 'The North Star', 'The International Date Line'], 0, 'Latitude measures angular distance from the equator.'),
          q('The prime meridian is at which longitude?', ['0°', '45°', '90°', '180°'], 0, 'The prime meridian is the 0° longitude line.'),
          q('What does a map’s scale show?', ['The ratio between map distance and real distance', 'The map’s age', 'The number of cities', 'The direction of wind'], 0, 'Scale converts measurements on a map to real-world distances.'),
        ],
      },
      {
        id: 'biomes',
        label: 'Biomes',
        keywords: ['biome', 'rainforest', 'desert', 'ocean', 'ecosystem', 'forest', 'coral', 'tundra'],
        questions: [
          q('Which rainforest is the largest tropical rainforest on Earth?', ['The Congo', 'The Amazon', 'The Daintree', 'The Tongass'], 1, 'The Amazon rainforest covers much of South America.'),
          q('A desert is defined primarily by what?', ['Very low precipitation', 'High altitude', 'Abundant trees', 'Frozen ground'], 0, 'Deserts receive very little precipitation, regardless of temperature.'),
          q('Coral reefs are known for what?', ['Extremely low biodiversity', 'High biodiversity', 'Being made of sand only', 'Existing only in cold water'], 1, 'Reefs support a huge variety of marine life.'),
        ],
      },
      {
        id: 'human',
        label: 'Human Geography',
        keywords: ['population', 'city', 'migration', 'economy', 'resources', 'urban', 'culture', 'human geography'],
        questions: [
          q('What is migration?', ['Movement from one place to another', 'The study of rocks', 'A type of rainfall', 'The growth of a plant'], 0, 'Migration is the movement of people or animals between places.'),
          q('Urbanization refers to what?', ['The growth of cities', 'The decline of trade', 'The formation of mountains', 'The study of stars'], 0, 'Urbanization is the increasing share of people living in cities.'),
          q('Which of these is a renewable resource?', ['Coal', 'Sunlight', 'Petroleum', 'Natural gas'], 1, 'Sunlight is naturally replenished and not depleted by use.'),
        ],
      },
    ],
    general: [
      q('Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2, 'The Pacific Ocean covers more area than any other ocean.'),
      q('The Sahara Desert is located on which continent?', ['Asia', 'Africa', 'Australia', 'Europe'], 1, 'The Sahara spans much of northern Africa.'),
      q('What is the capital of Japan?', ['Kyoto', 'Osaka', 'Tokyo', 'Seoul'], 2, 'Tokyo has been Japan’s capital since 1868.'),
      q('The equator is at which latitude?', ['0°', '23.5° N', '45° N', '90° N'], 0, 'The equator is the 0° latitude line.'),
      q('About what percentage of Earth’s surface is covered by water?', ['31%', '51%', '71%', '91%'], 2, 'Water covers roughly 71% of Earth’s surface.'),
      q('What is the highest mountain above sea level?', ['K2', 'Mount Everest', 'Kilimanjaro', 'Denali'], 1, 'Mount Everest rises highest above sea level.'),
      q('Which continent contains the most countries?', ['Asia', 'Africa', 'Europe', 'South America'], 1, 'Africa has 54 recognized countries, the most of any continent.'),
      q('Climate describes what?', ['Long-term weather patterns', 'Today’s temperature only', 'The position of the Moon', 'A single storm'], 0, 'Climate is the long-term average pattern of weather in a region.'),
      q('The “Ring of Fire” is known for what?', ['Deserts', 'Volcanoes and earthquakes around the Pacific', 'Coral reefs', 'Polar ice'], 1, 'The Ring of Fire is a seismically active belt around the Pacific.'),
    ],
  },
}

export const SUBJECT_ORDER = ['mathematics', 'history', 'science', 'languages', 'literature', 'geography']

export function matchTopic(subjectKey, focus) {
  const subject = SUBJECTS[subjectKey]
  if (!subject || !focus) return null
  const text = focus.toLowerCase()
  let best = null
  let bestScore = 0
  for (const topic of subject.topics) {
    let score = 0
    if (text.includes(topic.label.toLowerCase())) score += 4
    for (const kw of topic.keywords) {
      if (text.includes(kw)) score += kw.length > 4 ? 2 : 1
    }
    if (score > bestScore) { bestScore = score; best = topic }
  }
  return bestScore > 0 ? best : null
}

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function buildTrialQuestions(subjectKey, focus, dayKey) {
  const subject = SUBJECTS[subjectKey]
  if (!subject) return []
  const topic = matchTopic(subjectKey, focus)
  const rand = seededRandom(hashString(`${dayKey}|${subjectKey}|${focus}|${topic?.id || 'general'}`))
  const shuffle = (items) => {
    const arr = items.map((item) => ({ ...item }))
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  const topicQuestions = topic ? shuffle(topic.questions) : []
  const generalQuestions = shuffle(subject.general)
  const chosen = []
  if (topicQuestions.length >= 3) {
    chosen.push(topicQuestions[0], generalQuestions[0], generalQuestions[1])
    chosen.push(topicQuestions[1], generalQuestions[2], generalQuestions[3])
    chosen.push(topicQuestions[2], generalQuestions[4], generalQuestions[5])
  } else {
    chosen.push(...generalQuestions)
  }
  const unique = []
  const seen = new Set()
  for (const item of chosen) {
    if (seen.has(item.prompt)) continue
    seen.add(item.prompt)
    unique.push(item)
  }
  return unique.slice(0, 9).map((item) => {
    const order = shuffle(item.choices.map((choice, index) => ({ choice, index })))
    return {
      prompt: item.prompt,
      choices: order.map((entry) => entry.choice),
      answer: order.findIndex((entry) => entry.index === item.answer),
      why: item.why,
    }
  })
}

export function focusLabel(subjectKey, focus) {
  const topic = matchTopic(subjectKey, focus)
  return topic ? topic.label : 'Foundations'
}
