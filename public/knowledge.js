// Salah Tracker — learning content for the games: words with hints (Balloon Words) and quiz questions (Quiz Time),
// across many topics, not only prayer. Maths questions are made fresh each time to suit the level.
// To add more: put another [word, hint] or [question, right answer, wrong, wrong, wrong] in the lists below.

export const TOPICS = [
  ["mixed", "Mixed", "sparkles"], ["science", "Science", "rocket"], ["space", "Space", "t-space"], ["world", "World", "globe"],
  ["animals", "Animals", "lion"], ["maths", "Maths", "hundred"], ["english", "English", "abc"], ["salah", "Salah", "mosque"],
];
// Balloon Words uses these topics (no maths/english words)
export const WORD_TOPICS = [["mixed", "Mixed", "sparkles"], ["animals", "Animals", "lion"], ["science", "Science", "rocket"], ["space", "Space", "t-space"],
  ["world", "World", "globe"], ["food", "Food", "apple"], ["sports", "Sports", "av-soccer"], ["body", "My body", "e-hug"], ["salah", "Salah", "mosque"]];

// ---------- words: [WORD, hint] by level ----------
const W = {
  animals:{
    easy:[["CAT","It purrs and says meow"],["DOG","Man's best friend"],["COW","It gives us milk"],["HEN","It lays eggs"],["FOX","A clever orange animal"],["BEE","It makes honey"],["OWL","It hoots at night"],["ANT","A tiny hard worker"],["FROG","It jumps and croaks"],["DUCK","It says quack"],["GOAT","It has a beard and climbs rocks"],["BEAR","A big furry animal that loves honey"]],
    medium:[["TIGER","A big cat with stripes"],["ZEBRA","A horse with black and white stripes"],["MONKEY","It swings from trees"],["RABBIT","It has long ears and hops"],["PARROT","A colourful bird that can talk"],["TURTLE","It carries its house on its back"],["SHARK","A big fish with sharp teeth"],["EAGLE","A strong bird with sharp eyes"],["SNAKE","It slithers and has no legs"],["CAMEL","The ship of the desert"],["WHALE","The biggest animal in the sea"],["PANDA","A black and white bear that eats bamboo"]],
    hard:[["ELEPHANT","The biggest animal on land"],["GIRAFFE","The tallest animal"],["KANGAROO","It hops and has a pouch"],["PENGUIN","A bird that swims but can't fly"],["OCTOPUS","It has eight arms"],["CHEETAH","The fastest land animal"],["CROCODILE","A big reptile with strong jaws"],["BUTTERFLY","It was once a caterpillar"],["DOLPHIN","A clever sea mammal that loves to play"],["FLAMINGO","A pink bird that stands on one leg"]],
  },
  science:{
    easy:[["ICE","Frozen water"],["AIR","We breathe it"],["SUN","Our closest star"],["HOT","The opposite of cold"],["RAIN","Water falling from clouds"],["SEED","A plant grows from it"],["LEAF","The green part of a plant"],["WIND","Moving air"]],
    medium:[["MAGNET","It pulls iron things"],["ENERGY","What makes things move and work"],["OXYGEN","The gas we need to breathe"],["STEAM","Water turned into a gas"],["LIGHT","It travels very fast and helps us see"],["PLANT","It makes food from sunlight"],["SOUND","What we hear"],["FOSSIL","Old bones or shells turned to stone"],["ATOM","A tiny piece that everything is made of"]],
    hard:[["GRAVITY","It pulls things down to the ground"],["VOLCANO","A mountain that can erupt with lava"],["SKELETON","All the bones in your body"],["MOLECULE","Atoms joined together"],["ELECTRIC","A kind of energy that powers lights"],["MICROSCOPE","It makes tiny things look big"],["EXPERIMENT","A test scientists do to learn"],["THERMOMETER","It measures how hot or cold"]],
  },
  space:{
    easy:[["SUN","The star in our sky"],["MOON","It goes around the Earth"],["STAR","It twinkles at night"],["MARS","The red planet"],["SKY","Where the clouds are"]],
    medium:[["EARTH","The planet we live on"],["ORBIT","The path around a planet or star"],["COMET","An icy ball with a long tail"],["VENUS","The hottest planet"],["ROCKET","It flies into space"],["SATURN","The planet with big rings"],["PLANET","Earth is one of these"]],
    hard:[["JUPITER","The biggest planet"],["MERCURY","The planet closest to the Sun"],["ASTRONAUT","A person who travels into space"],["TELESCOPE","It helps us see far into space"],["GALAXY","A huge group of billions of stars"],["NEPTUNE","The planet farthest from the Sun"],["METEOR","A shooting star"]],
  },
  world:{
    easy:[["OMAN","Our country of mountains and sea"],["SEA","Big salty water"],["MAP","It shows where places are"],["HILL","A small mountain"],["CITY","A big town"],["SAND","The desert is full of it"]],
    medium:[["MUSCAT","The capital of Oman"],["EGYPT","The country of the pyramids"],["DESERT","A very dry place"],["ISLAND","Land with water all around it"],["LONDON","The capital of England"],["RIVER","Fresh water flowing to the sea"],["JAPAN","A country of islands in Asia"],["FOREST","A place full of trees"]],
    hard:[["PACIFIC","The biggest ocean"],["MOUNTAIN","A very tall hill"],["CONTINENT","Asia and Africa are each one of these"],["EVEREST","The tallest mountain in the world"],["AMAZON","A huge rainforest and river"],["SAHARA","The biggest hot desert"],["EQUATOR","An imaginary line around the middle of the Earth"]],
  },
  food:{
    easy:[["RICE","Small white grains we cook"],["CAKE","A birthday treat"],["EGG","A hen lays it"],["MILK","A white drink from cows"],["BREAD","We make sandwiches with it"],["DATE","A sweet fruit from palm trees"],["SOUP","A hot food you eat with a spoon"]],
    medium:[["BANANA","A long yellow fruit"],["CARROT","An orange vegetable rabbits love"],["CHEESE","Made from milk, mice love it"],["ORANGE","A fruit and a colour"],["HONEY","Sweet food made by bees"],["MANGO","A sweet tropical fruit"],["PIZZA","A round flat bread with toppings"]],
    hard:[["SANDWICH","Food between two slices of bread"],["BROCCOLI","A green vegetable like a little tree"],["PINEAPPLE","A spiky fruit with a crown"],["WATERMELON","A big green fruit, red inside"],["CHOCOLATE","A sweet brown treat"],["SPAGHETTI","Long thin pasta"]],
  },
  sports:{
    easy:[["BALL","You kick or throw it"],["GOAL","Score one in football!"],["RUN","Move fast on your feet"],["SWIM","Move through water"],["BAT","Used in cricket"],["TEAM","Players playing together"]],
    medium:[["TENNIS","Hit the ball over a net with a racket"],["SOCCER","Another name for football"],["RACE","Who is the fastest?"],["MEDAL","A prize for winners"],["HOCKEY","Hit a puck or ball with a stick"],["KARATE","A martial art with kicks and chops"]],
    hard:[["FOOTBALL","The most popular sport in the world"],["CRICKET","A game with a bat, ball and wickets"],["CHAMPION","The winner of a competition"],["OLYMPICS","Big games held every four years"],["SWIMMING","A sport in the pool"],["BASKETBALL","Throw the ball through a hoop"]],
  },
  body:{
    easy:[["EYE","You see with it"],["EAR","You hear with it"],["NOSE","You smell with it"],["HAND","It has five fingers"],["FOOT","You stand on it"],["HAIR","It grows on your head"]],
    medium:[["HEART","It pumps your blood"],["BRAIN","It helps you think"],["LUNGS","They help you breathe"],["TEETH","You chew with them"],["BONES","They hold your body up"],["MUSCLE","It helps you move and lift"]],
    hard:[["SKELETON","All your bones together"],["STOMACH","Where food goes after you swallow"],["SHOULDER","Where your arm joins your body"],["FINGERS","You have ten of them"],["EYEBROWS","The hair above your eyes"]],
  },
  salah:{
    easy:[["SUN","It shines in the day"],["MOON","It shines at night"],["STAR","Twinkle, twinkle…"],["PRAY","What we do five times a day"],["DUA","Asking Allah for something"],["BOOK","You read it"]],
    medium:[["MOSQUE","Where we pray together"],["QURAN","The holy book"],["KAABA","We face it when we pray"],["FAJR","The dawn prayer"],["WUDU","Washing before prayer"],["ZAKAT","Giving to people in need"],["MAKKAH","The city of the Kaaba"],["PRAYER","Salah in English"]],
    hard:[["RAMADAN","The month of fasting"],["MAGHRIB","The sunset prayer"],["TAHAJJUD","A prayer in the night"],["SUJOOD","Forehead on the ground"],["ISHRAQ","A prayer after sunrise"],["MADINAH","The city of the Prophet ﷺ"],["MINARET","The tall tower of a mosque"],["GRATEFUL","Saying Alhamdulillah"],["KINDNESS","Being nice to everyone"]],
  },
};
const WORD_TOPIC_KEYS = Object.keys(W);
// all words of one level (used by older saved games)
export const WORD_BANK = Object.fromEntries(["easy", "medium", "hard"].map(l => [l, WORD_TOPIC_KEYS.flatMap(k => W[k][l])]));
// One word for a topic and level; avoids repeating recent words when given a Set
export function pickWord(topic = "mixed", level = "medium", used){
  const keys = W[topic] ? [topic] : WORD_TOPIC_KEYS, lv = ["easy", "medium", "hard"].includes(level) ? level : "medium";
  let pool = keys.flatMap(k => W[k][lv]);
  if (used){ const fresh = pool.filter(([w]) => !used.has(w)); if (fresh.length) pool = fresh; else used.clear(); }
  const pick = pool[Math.random() * pool.length | 0]; used?.add(pick[0]); return pick;
}

// ---------- quiz questions: [question, right answer, wrong, wrong, wrong] ----------
const Q = {
  science:[
    ["What do we breathe in to stay alive?", "Oxygen", "Smoke", "Helium", "Steam"],
    ["What does water turn into when it freezes?", "Ice", "Steam", "Sand", "Juice"],
    ["What does water turn into when it boils?", "Steam", "Ice", "Snow", "Rock"],
    ["What pulls things down to the ground?", "Gravity", "Wind", "Magnets", "Light"],
    ["What do magnets pull?", "Iron", "Wood", "Plastic", "Paper"],
    ["How many legs does an insect have?", "6", "8", "4", "10"],
    ["How many legs does a spider have?", "8", "6", "10", "4"],
    ["At what temperature does water freeze?", "0°C", "10°C", "50°C", "100°C"],
    ["At what temperature does water boil?", "100°C", "50°C", "0°C", "200°C"],
    ["What do plants need from the sky to make their food?", "Sunlight", "Moonlight", "Snow", "Thunder"],
    ["What does a caterpillar turn into?", "A butterfly", "A bee", "A spider", "A bird"],
    ["What makes a rainbow?", "Sunlight shining through raindrops", "Wind blowing clouds", "The Moon at night", "Thunder"],
    ["How many colours are in a rainbow?", "7", "5", "3", "10"],
    ["Which is the hardest natural material?", "Diamond", "Gold", "Wood", "Glass"],
    ["What do we call animals that eat only plants?", "Herbivores", "Carnivores", "Insects", "Reptiles"],
    ["What tool makes tiny things look much bigger?", "A microscope", "A telescope", "A ruler", "A compass"],
    ["Which sense do we use our nose for?", "Smell", "Taste", "Hearing", "Sight"],
    ["Sound travels in…", "Waves", "Squares", "Straight bricks", "Circles of fire"],
  ],
  space:[
    ["Which planet do we live on?", "Earth", "Mars", "Venus", "Jupiter"],
    ["What is the closest star to Earth?", "The Sun", "The Moon", "Mars", "The North Star"],
    ["Which is the biggest planet?", "Jupiter", "Earth", "Mars", "Mercury"],
    ["Which planet is called the Red Planet?", "Mars", "Venus", "Saturn", "Neptune"],
    ["Which planet has big, beautiful rings?", "Saturn", "Mars", "Earth", "Mercury"],
    ["How many planets are in our solar system?", "8", "9", "7", "10"],
    ["What goes around the Earth?", "The Moon", "The Sun", "Mars", "Jupiter"],
    ["How long does the Earth take to go around the Sun?", "About a year", "One day", "One week", "Ten years"],
    ["How long does the Earth take to spin around once?", "About a day", "A week", "A year", "An hour"],
    ["Which planet is closest to the Sun?", "Mercury", "Venus", "Earth", "Neptune"],
    ["What do we call a person who travels into space?", "Astronaut", "Pilot", "Sailor", "Diver"],
    ["What is a shooting star really?", "A space rock burning up", "A falling star", "A plane", "A firework"],
    ["What do we call the Moon when we can see all of it, round and bright?", "Full moon", "New moon", "Half moon", "Blue moon"],
  ],
  world:[
    ["What is the capital of Oman?", "Muscat", "Salalah", "Sohar", "Nizwa"],
    ["What is the highest mountain in Oman?", "Jebel Shams", "Jebel Akhdar", "Mount Everest", "Mount Sinai"],
    ["Which is the biggest ocean?", "Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
    ["Which is the biggest hot desert in the world?", "Sahara", "Gobi", "Kalahari", "Arabian"],
    ["How many continents are there?", "7", "5", "6", "9"],
    ["Which continent is Oman in?", "Asia", "Africa", "Europe", "Australia"],
    ["What is the longest river in Africa?", "The Nile", "The Amazon", "The Thames", "The Danube"],
    ["Which country is shaped like a boot?", "Italy", "Spain", "France", "Egypt"],
    ["Which is the tallest mountain in the world?", "Mount Everest", "K2", "Kilimanjaro", "Jebel Shams"],
    ["What is the capital of the UAE?", "Abu Dhabi", "Dubai", "Sharjah", "Ajman"],
    ["What is the capital of Saudi Arabia?", "Riyadh", "Jeddah", "Makkah", "Dammam"],
    ["What is the capital of Egypt?", "Cairo", "Alexandria", "Luxor", "Giza"],
    ["What is the capital of the United Kingdom?", "London", "Paris", "Manchester", "Dublin"],
    ["What is the capital of France?", "Paris", "Rome", "Madrid", "Berlin"],
    ["In which country are the famous pyramids of Giza?", "Egypt", "Mexico", "Oman", "India"],
    ["Which sea is on Oman's north-east coast?", "The Arabian Sea", "The Red Sea", "The Black Sea", "The Dead Sea"],
  ],
  animals:[
    ["What is the fastest land animal?", "Cheetah", "Lion", "Horse", "Elephant"],
    ["What is the biggest animal that has ever lived?", "Blue whale", "Elephant", "Giraffe", "Dinosaur"],
    ["What is the tallest animal?", "Giraffe", "Elephant", "Camel", "Horse"],
    ["Which animal is called the ship of the desert?", "Camel", "Horse", "Elephant", "Goat"],
    ["What do pandas mostly eat?", "Bamboo", "Fish", "Bananas", "Nuts"],
    ["Which bird cannot fly?", "Penguin", "Eagle", "Parrot", "Pigeon"],
    ["What is a baby cat called?", "Kitten", "Puppy", "Cub", "Calf"],
    ["What is a baby horse called?", "Foal", "Calf", "Kid", "Cub"],
    ["Which animal has black and white stripes?", "Zebra", "Tiger", "Leopard", "Giraffe"],
    ["How do fish breathe underwater?", "With gills", "With lungs", "Through their tail", "They don't breathe"],
    ["How many hearts does an octopus have?", "3", "1", "2", "8"],
    ["Which animal hops and carries its baby in a pouch?", "Kangaroo", "Rabbit", "Frog", "Monkey"],
    ["Which of these is a mammal?", "Whale", "Shark", "Salmon", "Octopus"],
    ["What do bees make?", "Honey", "Milk", "Silk", "Butter"],
  ],
  english:[
    ["Which word is a noun (a person, place or thing)?", "Apple", "Run", "Happy", "Quickly"],
    ["Which word is a verb (an action word)?", "Jump", "Table", "Blue", "Soft"],
    ["Which word is an adjective (it describes something)?", "Beautiful", "Swim", "Car", "Under"],
    ["What is the opposite of hot?", "Cold", "Warm", "Big", "Wet"],
    ["What is the opposite of happy?", "Sad", "Glad", "Kind", "Funny"],
    ["Which word means the same as big?", "Large", "Tiny", "Short", "Thin"],
    ["Which word rhymes with cat?", "Hat", "Dog", "Cup", "Sun"],
    ["How many letters are in the English alphabet?", "26", "24", "28", "30"],
    ["What is the plural of child?", "Children", "Childs", "Childes", "Childrens"],
    ["Which of these is a vowel?", "E", "B", "T", "M"],
    ["What do we put at the end of a question?", "A question mark", "A full stop", "A comma", "An exclamation mark"],
    ["Which word is spelled correctly?", "Friend", "Freind", "Frend", "Friand"],
  ],
  general:[
    ["How many days are in a week?", "7", "5", "6", "10"],
    ["How many months are in a year?", "12", "10", "11", "13"],
    ["How many minutes are in an hour?", "60", "100", "30", "50"],
    ["How many hours are in a day?", "24", "12", "20", "30"],
    ["How many sides does a triangle have?", "3", "4", "5", "6"],
    ["How many sides does a hexagon have?", "6", "5", "8", "7"],
    ["What colour do you get when you mix blue and yellow?", "Green", "Purple", "Orange", "Pink"],
    ["What colour do you get when you mix red and yellow?", "Orange", "Green", "Brown", "Blue"],
    ["What colour do you get when you mix red and blue?", "Purple", "Green", "Orange", "Yellow"],
    ["How many days are in a leap year?", "366", "365", "364", "360"],
    ["Which shape has no corners?", "Circle", "Square", "Triangle", "Rectangle"],
  ],
  salah:[
    ["How many prayers do we pray every day?", "5", "3", "7", "4"],
    ["Which prayer is at dawn, before sunrise?", "Fajr", "Isha", "Asr", "Maghrib"],
    ["Which prayer is at midday?", "Dhuhr", "Fajr", "Maghrib", "Isha"],
    ["Which prayer is in the afternoon?", "Asr", "Fajr", "Isha", "Dhuhr"],
    ["Which prayer is just after sunset?", "Maghrib", "Asr", "Fajr", "Dhuhr"],
    ["Which prayer is at night?", "Isha", "Fajr", "Dhuhr", "Asr"],
    ["How many Fard rakats are in Fajr?", "2", "3", "4", "1"],
    ["How many Fard rakats are in Dhuhr?", "4", "2", "3", "5"],
    ["How many Fard rakats are in Asr?", "4", "2", "3", "5"],
    ["How many Fard rakats are in Maghrib?", "3", "2", "4", "5"],
    ["How many Fard rakats are in Isha?", "4", "3", "2", "6"],
    ["What do we do before praying, to be clean?", "Wudu", "Sujood", "Ruku", "Zakat"],
    ["Which way do we face when we pray?", "Towards the Kaaba", "Towards the sun", "Any way we like", "Towards the sea"],
    ["Which surah do we recite in every rakat?", "Al-Fatiha", "Al-Ikhlas", "An-Nas", "Al-Kawthar"],
    ["What do we say to start the prayer?", "Allahu Akbar", "Alhamdulillah", "SubhanAllah", "Ameen"],
    ["What is it called when we bow with our hands on our knees?", "Ruku", "Sujood", "Qiyam", "Tashahhud"],
    ["What is it called when our forehead touches the ground?", "Sujood", "Ruku", "Qiyam", "Wudu"],
    ["How do we finish the prayer?", "Saying salam to the right and left", "Clapping our hands", "Standing up quickly", "Saying Bismillah"],
    ["Which prayer is followed by Witr?", "Isha", "Fajr", "Dhuhr", "Maghrib"],
    ["How many rakats is Witr?", "3", "1", "2", "4"],
    ["What is the special Friday prayer called?", "Jumu'ah", "Eid", "Tahajjud", "Ishraq"],
    ["In which month do Muslims fast?", "Ramadan", "Rajab", "Shawwal", "Muharram"],
    ["In which city is the Kaaba?", "Makkah", "Madinah", "Muscat", "Cairo"],
    ["What is the call to prayer called?", "Adhan", "Dua", "Dhikr", "Khutbah"],
    ["What do we say after sneezing?", "Alhamdulillah", "Ameen", "SubhanAllah", "Allahu Akbar"],
    ["What do we say before eating?", "Bismillah", "Alhamdulillah", "Ameen", "Allahu Akbar"],
  ],
};
export const QUIZ_BANK = Q.salah;   // kept for older code

// ---------- maths: made fresh each time ----------
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function mathsQ(level){
  let q, a;
  const kind = level === "easy" ? rnd(0, 1) : level === "medium" ? rnd(0, 3) : rnd(2, 5);
  if (kind === 0){ const x = rnd(1, level === "easy" ? 10 : 50), y = rnd(1, level === "easy" ? 10 : 50); q = `${x} + ${y} = ?`; a = x + y; }
  else if (kind === 1){ const x = rnd(5, level === "easy" ? 20 : 99), y = rnd(1, x); q = `${x} − ${y} = ?`; a = x - y; }
  else if (kind === 2){ const x = rnd(2, 10), y = rnd(2, 10); q = `${x} × ${y} = ?`; a = x * y; }
  else if (kind === 3){ const y = rnd(2, 10), a0 = rnd(2, 10); q = `${a0 * y} ÷ ${y} = ?`; a = a0; }
  else if (kind === 4){ const x = rnd(11, 25), y = rnd(3, 9); q = `${x} × ${y} = ?`; a = x * y; }
  else { const p = [10, 25, 50][rnd(0, 2)], n = rnd(1, 10) * 20; q = `What is ${p}% of ${n}?`; a = n * p / 100; }
  const wrong = new Set(); while (wrong.size < 3){ const w = a + rnd(-10, 10) || a + 11; if (w !== a && w >= 0) wrong.add(w); }
  return [q, String(a), ...[...wrong].map(String)];
}

const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
// n questions on a topic ("mixed" = a bit of everything, including some maths)
export function makeQuiz(n, opts, topic = "mixed", level = "medium"){
  let raw;
  if (topic === "maths") raw = Array.from({length:n}, () => mathsQ(level));
  else if (Q[topic]) raw = shuffle(Q[topic]).slice(0, n);
  else {
    const all = shuffle(["science", "space", "world", "animals", "english", "general", "salah"].flatMap(k => Q[k]));
    raw = [...all.slice(0, n - 2), mathsQ(level), mathsQ(level)];
  }
  return shuffle(raw).slice(0, n).map(([q, a, ...w]) => ({q, a, opts:shuffle([a, ...shuffle(w).slice(0, opts - 1)])}));
}

// ---------- word search themes ----------
export const WS_THEMES = [
  ["Prayer", ["PRAYER", "MOSQUE", "QURAN", "FAJR", "ISHA", "WUDU", "ASR", "DUA"]],
  ["Desert", ["CAMEL", "FALCON", "DATES", "DESERT", "OASIS", "PALM", "SAND", "DUNE"]],
  ["Fruit", ["APPLE", "MANGO", "GRAPE", "LEMON", "PEACH", "MELON", "KIWI", "FIG"]],
  ["Animals", ["LION", "TIGER", "ZEBRA", "PANDA", "HORSE", "SHEEP", "GOAT", "OWL"]],
  ["Being good", ["KIND", "HONEST", "HELP", "SMILE", "SHARE", "THANKS", "PEACE", "CARE"]],
  ["Space", ["PLANET", "ROCKET", "COMET", "ORBIT", "MOON", "STAR", "EARTH", "MARS"]],
  ["Ocean", ["WHALE", "SHARK", "CORAL", "WAVE", "CRAB", "FISH", "SEAL", "SQUID"]],
  ["My body", ["HEART", "BRAIN", "LUNGS", "BONE", "SKIN", "TEETH", "HAND", "EYES"]],
  ["Science", ["MAGNET", "ENERGY", "LIGHT", "WATER", "ICE", "STEAM", "GAS", "ATOM"]],
  ["Weather", ["RAIN", "SNOW", "WIND", "STORM", "CLOUD", "SUNNY", "FOG", "HAIL"]],
  ["Colours", ["RED", "BLUE", "GREEN", "PINK", "BLACK", "WHITE", "BROWN", "GOLD"]],
  ["Sports", ["GOAL", "BALL", "SWIM", "RACE", "TEAM", "TENNIS", "MEDAL", "RUN"]],
];
