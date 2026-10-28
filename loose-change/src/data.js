// Loose Change — game content. Everything you can buy, find, scratch or witness.
// Plain script (no modules) so it runs from file:// in Electron and in a browser.
const LC = (globalThis.LC = globalThis.LC || {});

LC.THING_COST = 1e12;
LC.COST_GROWTH = 1.15;

// ---- Coin finders (passive income, £ per second) ----
LC.GENERATORS = [
  { id: 'cat', icon: '🐈', name: 'Nosy Cat', cost: 0.5, income: 0.016,
    desc: 'Knocks coins off every surface. Judges you while doing it.',
    ups: ['Laser Pointer', 'Extra-Long Paws', 'Cat Flap Toll Booth', 'Second Cat (Unrelated)', 'The Cat Cartel'] },
  { id: 'brother', icon: '🧒', name: 'Little Brother', cost: 8, income: 0.13,
    desc: 'Fits down the back of the sofa. Literally.',
    ups: ['A Torch', 'An Even Smaller Brother', 'Bribed With Haribo', "Brother's Mates", 'Brother Goes Pro'] },
  { id: 'detectorist', icon: '🧓', name: 'Metal Detectorist', cost: 150, income: 1.3,
    desc: 'Beeps at your back garden. Socks with sandals.',
    ups: ['Fresh Batteries', 'A Louder Beep', 'Matching Fleece', 'Detectorist Club Membership', 'Beeps In His Sleep'] },
  { id: 'well', icon: '⛲', name: 'Wishing Well', cost: 3000, income: 14,
    desc: 'People throw coins in. You throw a net in.',
    ups: ['A Bigger Net', '"Make A Wish" Sign', 'Fake Rainbow', 'Wish Influencer', 'Wishes Now Cost £2'] },
  { id: 'pusher', icon: '🕹️', name: 'Coin Pusher', cost: 70000, income: 170,
    desc: 'The coins are SO close to the edge.',
    ups: ['Strategic Nudge', 'Slightly Tilted Machine', 'Seaside Location', 'Remove The Teddy', 'Infinite Edge'] },
  { id: 'pigeons', icon: '🐦', name: 'Pigeon Syndicate', cost: 1.8e6, income: 2300,
    desc: 'They collect shiny things. They want a cut.',
    ups: ['Tiny Bags', 'Pigeon Union Deal', 'Seagull Liaison Officer', 'Bread Budget', 'The Pigeon Godfather'] },
  { id: 'carboot', icon: '🚗', name: 'Car Boot Empire', cost: 5e7, income: 33000,
    desc: "Sells your old junk. Sells your neighbour's junk.",
    ups: ['Folding Table', 'Hand-Written Signs', 'Haggling Lessons', 'Sell The Car Too', 'Boot Of Infinite Holding'] },
  { id: 'mine', icon: '⛏️', name: 'Garden Mineshaft', cost: 1.5e9, income: 520000,
    desc: 'Planning permission: pending. Forever.',
    ups: ['Hard Hats', 'A Canary (Retired)', 'Gnome Labour', 'Express Lift', 'The Mine Has Its Own Mine'] },
  { id: 'factory', icon: '🛋️', name: 'Sofa Factory', cost: 5e10, income: 9.2e6,
    desc: 'Makes sofas with coins pre-installed down the back.',
    ups: ['Deeper Cushions', 'Recliner Edition', 'L-Shaped Sofas', 'Sale Ends Sunday (Every Sunday)', 'Sofa Singularity'] },
  { id: 'moon', icon: '🌙', name: 'Moon Sofa', cost: 2e12, income: 1.9e8,
    desc: "Turns out the Moon has a sofa. Nobody's checked it.",
    ups: ['Low-Gravity Rummaging', 'Moon Cat', 'Dark Side Cushions', 'Space Hoover', 'Moon Piggy'] },
  { id: 'multiverse', icon: '🌀', name: 'Parallel Sofas', cost: 8e13, income: 4e9,
    desc: 'Every universe has a sofa. Every sofa has 20p in it.',
    ups: ['Portal Gloves', 'Your Evil Twin Helps', 'The Universe With Bigger Coins', 'Sofa Prime', 'Infinite 20ps'] },
];
LC.GEN_UP_TIERS = [ // owned threshold -> cost multiplier of base cost; each doubles that finder
  { at: 1, mult: 10 }, { at: 10, mult: 50 }, { at: 25, mult: 500 }, { at: 50, mult: 5000 }, { at: 100, mult: 50000 },
];

// ---- Other upgrades ----
// kind: click (x mult), clickPct (adds % of income/s to each click), global (+%), piggyCap, piggyHits,
// piggyFill, luck (scratch cards), stock (scratch card stock), dig (click dig x mult)
LC.UPGRADES = [ // shop: where you buy it (charity shop, corner shop, hardware shop)
  { id: 'sock', shop: 'charity', icon: '🧦', name: 'Lucky Sock', cost: 1500, kind: 'global', value: 0.1, desc: "You've never washed it. All income +10%." },
  { id: 'fengshui', shop: 'charity', icon: '🪴', name: 'Couch Feng Shui', cost: 80000, kind: 'global', value: 0.2, desc: 'Point the sofa at the money. All income +20%.' },
  { id: 'shiny', shop: 'charity', icon: '✨', name: 'Shiny Things Theory', cost: 8e6, kind: 'global', value: 0.3, desc: 'A pigeon explained it to you. All income +30%.' },
  { id: 'accountant', shop: 'charity', icon: '🐱', name: 'Accountant (Also A Cat)', cost: 2e9, kind: 'global', value: 0.5, desc: 'Has no idea what he is doing. All income +50%.' },
  { id: 'bigpig', shop: 'charity', icon: '🐖', name: 'Bigger Pig', cost: 400, kind: 'piggyCap', value: 2, desc: 'Piggy banks hold twice as much.' },
  { id: 'pigfood', shop: 'corner', icon: '🌽', name: 'Premium Pig Feed', cost: 50000, kind: 'piggyFill', value: 2, desc: 'Pigs fill twice as fast. Do not ask what is in it.' },
  { id: 'hugepig', shop: 'charity', icon: '🐘', name: 'Pig The Size Of An Elephant', cost: 5e6, kind: 'piggyCap', value: 3, desc: 'Piggy banks hold 3x as much. Is it still a pig?' },
  { id: 'luckypen', shop: 'corner', icon: '🖊️', name: 'Lucky Scratching Coin', cost: 5000, kind: 'luck', value: 1, desc: 'Better scratch card odds.' },
  { id: 'shopmate', shop: 'corner', icon: '🏪', name: 'Mate At The Corner Shop', cost: 30000, kind: 'stock', value: 3, desc: 'Shop keeps 3 more cards for you.' },
  { id: 'magnet1', shop: 'hardware', icon: '🧲', name: 'Magnetic Trousers', cost: 250, kind: 'magnet', value: 1.5, desc: 'Coins on the floor fly to you from further away.' },
  { id: 'magnet2', shop: 'hardware', icon: '👖', name: 'Extremely Magnetic Trousers', cost: 2e6, kind: 'magnet', value: 2.5, desc: 'Coins fly to you from even further. Your keys are stuck to you.' },
  { id: 'oldbook', shop: 'charity', icon: '📕', name: 'An Old Book', cost: 50, kind: 'letter', value: 'l11', desc: '"A Hundred Places To Hide Money". Something is tucked inside.' },
  { id: 'horseshoe', shop: 'charity', icon: '🧲', name: 'Magnetic Horseshoe', cost: 5e7, kind: 'luck', value: 1, desc: 'Even better scratch card odds. Mildly cursed.' },
];

// ---- Garden digging ----
LC.DIG_TOOLS = [
  { id: 'fork', icon: '🍴', name: 'Garden Fork', cost: 15, click: 0.1, rate: 0, desc: 'Each dig goes 0.1 m deeper.' },
  { id: 'moles', icon: '🐀', name: 'Hired Mole', cost: 60, click: 0, rate: 0.15, desc: 'Digs 0.15 m/s. Paid in worms.' },
  { id: 'gnome', icon: '🧙', name: 'Garden Gnome (Awake)', cost: 2e4, click: 0, rate: 2, desc: 'Digs 2 m/s. Nobody knows how long he has been awake.' },
  { id: 'digger', icon: '🚜', name: 'Mini Digger', cost: 1e7, click: 0, rate: 30, desc: 'Digs 30 m/s. Hired from a man called Steve.' },
  { id: 'badgers', icon: '🦡', name: 'Badger Cartel', cost: 3e9, click: 0, rate: 400, desc: 'Digs 400 m/s. Do not make eye contact.' },
  { id: 'tbm', icon: '🛞', name: 'Tunnel Boring Machine', cost: 1e12, click: 0, rate: 6000, desc: 'Digs 6 km/s. Named Brenda.' },
  { id: 'gran', icon: '👵', name: 'Gran With A Shovel', cost: 5e13, click: 0, rate: 90000, desc: 'Digs 90 km/s. She did this in the war.' },
];
LC.EARTH_DIAMETER = 12742000; // metres, sofa to Australia

// reward: { cash: seconds of income } | { mult: +x global } | { dig: x dig speed } | { buttons: n }
LC.DIG_FINDS = [
  { at: 0.3, icon: '🪱', name: 'A worm called Gary', text: 'Gary has seen things.', reward: { cash: 10 } },
  { at: 1, icon: '🪙', name: 'A 2p from 1971', text: "Still smells of 1971.", reward: { cash: 30 } },
  { at: 2.5, icon: '🏛️', name: 'A Roman coin', text: 'Someone in 43 AD also lost money in this garden.', reward: { mult: 0.05, junk: 'roman' } },
  { at: 6, icon: '📼', name: 'A 1994 time capsule', text: 'Contains a Tamagotchi. It is still alive. It is hungry.', reward: { cash: 120, junk: 'tamagotchi' } },
  { at: 3.5, icon: '💨', name: 'A stink bomb from 1989', text: 'Still sealed. Still potent. You know exactly whose car this is for.', reward: { item: 'stink' } },
  { at: 15, icon: '🏴‍☠️', name: "A pirate's chest", text: 'Long way inland for a pirate. Good for him.', reward: { cash: 600 } },
  { at: 20, icon: '🍪', name: 'A biscuit tin', text: 'Inside: no biscuits. A letter, in Grandad\'s handwriting.', reward: { letter: 'l5' } },
  { at: 40, icon: '🚽', name: "Next door's sewer pipe", text: 'Sorry, Brian. You can hear the sewer beyond it. You\'d need to get in from the street.', reward: { buttons: 3 } },
  { at: 100, icon: '🦖', name: 'A fossilised £1 coin', text: 'Dinosaurs had money. That is how they could afford to be so big.', reward: { mult: 0.1 } },
  { at: 350, icon: '🅿️', name: 'An underground car park', text: 'Pay and display. You pay. You display.', reward: { cash: 1800 } },
  { at: 1000, icon: '👑', name: 'A lost royal mole', text: 'A mole in a tiny crown. "Wrong hole," it sniffs, and points towards the park. It leaves you its spare crown and a tip: dig smarter. (Dig speed doubled.)', reward: { dig: 2, junk: 'crown' } },
  { at: 5000, icon: '🌊', name: 'An underground lake of 2ps', text: 'You go for a swim. It hurts.', reward: { cash: 3600 } },
  { at: 35000, icon: '🔥', name: 'The bottom of the crust', text: "It's warm down here. Like a sofa.", reward: { mult: 0.15 } },
  { at: 410000, icon: '🧦', name: 'Every sock you ever lost', text: 'The dryer was a portal. Of course it was.', reward: { buttons: 10 } },
  { at: 2900000, icon: '🍫', name: 'The outer core', text: "It's... a chocolate coin? The Earth is a chocolate coin.", reward: { mult: 0.5 } },
  { at: 6371000, icon: '🛋️', name: 'The exact centre of the Earth', text: 'There is a sofa here. You check down the back. 20p.', reward: { dig: 3 } },
  { at: 12742000, icon: '🦘', name: 'Australia', text: 'You have dug straight through.', reward: { ending: 'australia' } },
];

// ---- Things found when checking down the sofa ----
LC.SOFA_FINDS = [
  { text: 'a TV remote. It was here the whole time.', junk: 'remote' },
  { text: 'a crisp. Prawn cocktail. Vintage.', cash: 0 },
  { text: 'a bus ticket from 1987.', junk: 'ticket' },
  { text: 'a Lego brick (stood on it first).', junk: 'lego' },
  { text: 'a button.', buttons: 1 },
  { text: 'another button. Where are they coming from?', buttons: 1 },
  { text: 'a fiver! An actual fiver!', flat: 5 },
  { text: "a note that says 'stop looking down here'.", cash: 0 },
  { text: 'a Werther\'s Original. Nan was here.', cash: 10 },
  { text: 'a small, confused hamster.', cash: 15 },
  { text: 'a foreign coin. Somebody will want it.', junk: 'foreign' },
  { text: 'a shiny thing! The pigeons will want this.', cash: 60 },
  { text: 'three buttons in a trench coat.', buttons: 3 },
  { text: 'your old phone. It has 4% battery and 400 notifications.', junk: 'phone' },
  { text: 'a jam sandwich. Do not eat the jam sandwich.', cash: 0 },
  { text: 'a whoopee cushion! This could be useful...', item: 'whoopee', weight: 2 },
  { text: 'a marble. A good one.', junk: 'marble' },
  { text: 'a toy car with three wheels.', junk: 'toycar' },
  { text: 'an odd sock. Its partner is gone.', junk: 'sock' },
];

// ---- Piggy bank personalities ----
LC.PIGS = [
  { id: 'normal', icon: '🐷', name: 'Piggy Bank', hits: 8, mult: 1, weight: 60, text: 'A classic.' },
  { id: 'golden', icon: '🐷', name: 'Golden Pig', hits: 12, mult: 3, weight: 10, gold: true, text: 'Shiny. Smug.' },
  { id: 'kevin', icon: '🐗', name: 'Kevin', hits: 30, mult: 2.5, weight: 10, text: 'Kevin does not want to be smashed.' },
  { id: 'owl', icon: '🦉', name: 'An Owl?', hits: 8, mult: 1.5, weight: 8, text: "It's an owl. It's still a bank. Don't overthink it." },
  { id: 'nesting', icon: '🪆', name: 'Nesting Pig', hits: 6, mult: 0.6, weight: 7, nest: 3, text: 'There is a smaller pig inside. And inside that...' },
  { id: 'real', icon: '🐖', name: 'A Real Pig', hits: 4, mult: 0, weight: 5, real: true, text: 'Hang on. Is that...' },
];

// ---- Scratch cards ----
// Outcomes picked first, then the grid is laid out to match.
LC.SCRATCH_SYMBOLS = {
  coin: { icon: '🪙', label: 'x2', mult: 2 },
  pig: { icon: '🐷', label: 'x4', mult: 4 },
  clover: { icon: '🍀', label: 'x10', mult: 10 },
  gem: { icon: '💎', label: 'JACKPOT x50', mult: 50 },
  goose: { icon: '🪿', label: 'A GOOSE', special: 'goose' },
  button: { icon: '🔘', label: '"Lifetime supply" of buttons', special: 'buttons' },
  sock: { icon: '🧦', label: 'One lucky sock', special: 'sock' },
  frog: { icon: '🐸', label: 'Nothing (frog)', special: 'frog' },
};
// Weight per outcome. Each point of luck takes 6 off 'lose'. Average cash back is about 1.2x the price.
LC.CARDS = [
  { id: 'dip', name: 'Lucky Dip', secs: 30, min: 1, colour: 'var(--grass)', desc: 'Match 3 to win. Probably.',
    odds: { lose: 60, coin: 20, pig: 8, clover: 3, gem: 0.4, goose: 3, button: 4, sock: 1, frog: 0.6 } },
  { id: 'gold', name: 'Golden Goose', secs: 300, min: 50, colour: 'var(--gold)', desc: 'Costs 10x. Same odds of cash, but far more socks, buttons and geese.',
    odds: { lose: 48, coin: 20, pig: 8, clover: 3, gem: 0.4, goose: 6, button: 10, sock: 4, frog: 0.6 } },
];
LC.CARD_RESTOCK_SECS = 60;

// ---- News ticker ----
LC.NEWS = [
  'Man queues for forty minutes, reaches front, apologises, leaves.',
  'Local woman says it is "close" today. It is 19 degrees.',
  'Hosepipe ban announced after two sunny days.',
  'Kettle sales soar as nation agrees "it\'s a bit nippy".',
  'Brian writes 14th letter to council about "the hole".',
  'Bus arrives on time. Witnesses "shaken".',
  'Pensioner wins argument about the correct way to make tea. "Milk last," confirms everyone except her.',
  'Local cat arrested for fraud. "He seemed so normal," say neighbours.',
  'Experts confirm sofas are now 40% coins.',
  'Pigeons deny involvement in wave of shiny-thing thefts.',
  'Man checks down sofa, finds other man. Both "fine".',
  'Seagull spotted with a briefcase.',
  'Wishing well reports record wishes, record nets.',
  'Scientists: "Back gardens are just sofas for the ground."',
  'Coin pusher edge "definitely about to go", says man who has been there since Tuesday.',
  'Nan visits, leaves fiver, says you look thin.',
  'Moon sofa "absolutely full of 20ps", confirms astronaut.',
  'Goose sightings up 400%. Goose declines to comment. Goose honks.',
  'Area man has 9,000 buttons and no idea why.',
  'Survey: 9 out of 10 piggy banks "would rather not".',
  'Brian next door "not happy" about the hole.',
  'Breaking: still no planning permission for the mineshaft.',
  'Economists warn loose change "getting a bit out of hand".',
  'Corner shop runs out of scratch cards again. Owner buys a boat.',
  'Badger Cartel denies existence of Badger Cartel.',
  'Local gran digs 90 km before lunch, says "it\'s not hard, love".',
  'Derek the coin "doing well, thanks for asking".',
  'Parallel universe confirms its sofa also has 20p in it.',
];

// ---- Endings. One is picked at random when you buy The Thing. ----
LC.ENDINGS = [
  { id: 'mealdeal', title: 'The Meal Deal', icon: '🥪', lines: [
    'You hand over £1,000,000,000,000 in loose change.',
    'It takes the man at the till eleven years to count it.',
    'You have bought... a meal deal.',
    'Sandwich. Crisps. Drink.',
    '"Do you want a bag? It\'s 10p."',
    'You check your pockets. You have nothing left.',
    'You carry it home in your hands.' ] },
  { id: 'moon', title: 'You Bought The Moon', icon: '🌝', lines: [
    'The Thing was the Moon. You now own the Moon.',
    'You fly up to inspect it.',
    "It's mostly one enormous sofa.",
    'You check down the back.',
    '20p.',
    'Here we go again.' ] },
  { id: 'scratch', title: 'It Was A Scratch Card', icon: '🎟️', lines: [
    'The Thing arrives in a very large box.',
    'It is a scratch card. The biggest scratch card ever printed.',
    'You scratch it for three days with a 2p.',
    'BETTER LUCK NEXT TIME.',
    'On the back, in small print: "the real jackpot was the coins you found along the way".',
    'You do not find this comforting.' ] },
  { id: 'piggy', title: 'The Last Piggy Bank', icon: '🐷', lines: [
    'The Thing is a piggy bank big enough to hold all the money in the world.',
    'You pour every coin you have into it.',
    'It is full.',
    'It looks at you.',
    'You look at it.',
    'It stands up and walks off into the sunset. It is not coming back.' ] },
  { id: 'goose', title: 'The Goose Was Behind It All', icon: '🪿', lines: [
    'You bring a trillion pounds to the shop.',
    'The shopkeeper slowly turns around.',
    'It is the goose.',
    'It has always been the goose.',
    'The goose takes the money.',
    'HONK.' ] },
  { id: 'dev', title: "The Developer's Sofa", icon: '🧑‍💻', lines: [
    'You have checked every sofa in every universe.',
    'There is one sofa left. It is in a small room, in front of a computer.',
    'Someone is sitting on it, making a game about sofas.',
    'You reach down the back.',
    '"Oi. Get out of my sofa."',
    'You found 20p.' ] },
  { id: 'dream', title: 'It Was All A Dream', icon: '💤', lines: [
    'You hand over the money and the world goes blurry.',
    'You wake up. On the sofa.',
    'It was all a dream. The cat. The goose. The moon.',
    'Out of habit, you check down the back of the sofa.',
    'A trillion pounds.',
    'You put it back. You go back to sleep.' ] },
  { id: 'australia', secret: true, title: 'G\'day', icon: '🦘', lines: [
    'You have dug straight through the Earth.',
    'You climb out of the hole into bright sunshine.',
    'Everyone is upside down. No, wait. You are upside down.',
    'A man hands you a coin. It has a kangaroo on it.',
    'You check down the back of his barbecue.',
    '20 Australian cents.' ] },
  { id: 'buttons', secret: true, title: 'The Button Baron', icon: '🔘', lines: [
    'You have 100 buttons.',
    'A tall man in a coat made entirely of buttons appears.',
    '"You have done well," he whispers. "Buttons are the true currency."',
    'He crowns you Button Baron.',
    'Your subjects are buttons. They do not do anything.',
    'You are very happy.' ] },
];
LC.ENDINGS.push({ id: 'brian', title: 'Brian Got It', icon: '😤', lines: [
  'Brian knocks on your door.',
  'He is holding a cheque for £1,000,000,000,000.',
  '"Your grandad said whoever pays first gets it," he says.',
  'He wheels The Thing out of your hall.',
  'He looks under the sheet. His face goes white.',
  'He wheels it back in and leaves without a word. You never find out why.' ] });
LC.RANDOM_ENDINGS = ['mealdeal', 'moon', 'scratch', 'piggy', 'goose', 'dev', 'dream'];

// ---- Achievements. API names match what you set up in Steamworks. ----
LC.ACHIEVEMENTS = [
  { id: 'FIRST_PENNY', name: 'Every Penny Counts', desc: 'Find your first coin.', test: (s) => s.lifetime > 0 },
  { id: 'ONE_POUND', name: 'A Whole Pound', desc: 'Find £1 in total.', test: (s) => s.lifetime >= 1 },
  { id: 'THOUSAND', name: 'Thousandaire', desc: 'Find £1,000 in total.', test: (s) => s.lifetime >= 1e3 },
  { id: 'MILLION', name: 'Millionaire (In Coins)', desc: 'Find £1 million in total.', test: (s) => s.lifetime >= 1e6 },
  { id: 'BILLION', name: 'Coin-ventional Billionaire', desc: 'Find £1 billion in total.', test: (s) => s.lifetime >= 1e9 },
  { id: 'CLICK_1000', name: 'Sore Fingers', desc: 'Check down the sofa 1,000 times.', test: (s) => s.stats.clicks >= 1000 },
  { id: 'CATS_25', name: 'Crazy Cat Person', desc: 'Own 25 Nosy Cats.', test: (s) => (s.gens.cat || 0) >= 25 },
  { id: 'PIG_1', name: 'Sorry, Piggy', desc: 'Smash a piggy bank.', test: (s) => s.stats.pigs >= 1 },
  { id: 'PIG_50', name: 'Pig Iron', desc: 'Smash 50 piggy banks.', test: (s) => s.stats.pigs >= 50 },
  { id: 'REAL_PIG', name: 'That Was A Real Pig', desc: 'Try to smash a real pig.', test: (s) => s.flags.realPig },
  { id: 'SCRATCH_1', name: 'Scratchy', desc: 'Scratch a scratch card.', test: (s) => s.stats.cards >= 1 },
  { id: 'JACKPOT', name: 'JACKPOT', desc: 'Win a scratch card jackpot.', test: (s) => s.flags.jackpot },
  { id: 'ROMAN', name: 'Time Team', desc: 'Dig up a Roman coin.', test: (s) => s.depth >= 2.5 },
  { id: 'CORE', name: 'Journey To The Centre', desc: 'Reach the centre of the Earth.', test: (s) => s.depth >= 6371000 },
  { id: 'GOOSE_FRIEND', name: 'Goose Whisperer', desc: 'Befriend the goose.', test: (s) => s.goose.friend },
  { id: 'DEREK', name: 'Derek', desc: 'Keep Derek.', test: (s) => s.flags.derek },
  { id: 'GOLDEN', name: 'Shiny!', desc: 'Catch a golden coin.', test: (s) => s.stats.golden >= 1 },
  { id: 'EVENTS_25', name: 'What Is Even Happening', desc: 'Witness 25 random events.', test: (s) => s.stats.events >= 25 },
  { id: 'UPSIDE', name: 'Which Way Is Up', desc: 'Get flipped by a cursed penny.', test: (s) => s.flags.flipped },
  { id: 'PRANK_1', name: 'Gotcha', desc: 'Prank Brian.', test: (s) => (s.stats.pranks || 0) >= 1 },
  { id: 'PRANK_ALL', name: 'Neighbour From Hell', desc: 'Pull every kind of prank on Brian.', test: (s) => ['whoopee', 'glitter', 'stink', 'ticket', 'goose'].every((k) => (s.flags['prank_' + k])) },
  { id: 'SNEAKY', name: 'Sneaky', desc: "Raid Brian's sofa 25 times.", test: (s) => (s.stats.brianSofa || 0) >= 25 },
  { id: 'CAUGHT', name: 'Busted', desc: 'Get caught in Brian\'s house.', test: (s) => s.flags.caught },
  ...['mealdeal', 'moon', 'scratch', 'piggy', 'goose', 'dev', 'dream', 'australia', 'buttons', 'brian'].map((e) => ({
    id: 'END_' + e.toUpperCase(), name: 'Ending: ' + e, desc: 'See this ending.', ending: e, test: (s) => s.endings.includes(e),
  })),
  { id: 'ALL_ENDINGS', name: 'Seen It All', desc: 'See every ending.', test: (s) => LC.ENDINGS.every((e) => s.endings.includes(e.id)) },
];
for (const a of LC.ACHIEVEMENTS) {
  if (a.ending) { const e = LC.ENDINGS.find((x) => x.id === a.ending); a.name = 'Ending: ' + e.title; a.desc = e.secret ? 'A secret ending.' : 'See this ending.'; }
}

// ---- Phone: notes the kid has written. They unlock as you play. ----
// `when` gets the save state and returns true once the note should appear.
LC.NOTES = [
  { id: 'plan', title: 'THE PLAN', when: () => true, body:
`1. Find money
2. Find more money
3. Buy The Thing
4. ???
5. Don't tell Brian` },
  { id: 'thing', title: 'What is The Thing??', when: () => true, body:
`Things it could be:
- a hovercraft
- a horse (please)
- a smaller Thing inside a bigger sheet
- infinite Haribo
- a portal
- Grandad (no)

Things it's NOT:
- socks
- a "learning experience"` },
  { id: 'sofa', title: 'Sofa facts', when: (s) => s.stats.clicks >= 25, body:
`The sofa has given me ${'{clicks}'} coins so far.
I don't know how. Nobody sits on it.
Dad says "it's just where coins go".
I think the sofa is a bank.
I think the sofa is the REAL bank.` },
  { id: 'cat', title: 'The cat (observations)', when: (s) => (s.gens.cat || 0) >= 1, body:
`Day 1: Hired the cat. Payment: one (1) sardine.
Day 1 later: The cat knocked a 20p off the table. Looked at me. Did not apologise.
Day 2: The cat has a second job. I don't know where.
Day 3: Found the cat asleep on £4.60. Respect.` },
  { id: 'brother', title: 'Little brother contract', when: (s) => (s.gens.brother || 0) >= 1, body:
`I, LITTLE BROTHER, agree to go down the sofa
for 1 Haribo per hour.
I am not allowed to keep: coins, crisps, the remote.
I am allowed to keep: fluff.

Signed: [crayon scribble]
Witness: the cat` },
  { id: 'pig', title: 'Pig names', when: (s) => s.stats.pigs >= 1, body:
`Piggy banks I have smashed (RIP):
- Gerald
- Gerald 2
- Kevin (he fought back)
- an owl? (still counts)

I feel bad. I also feel rich.` },
  { id: 'hole', title: 'Hole log', when: (s) => s.depth >= 1, body:
`The hole is going great.
Mum asked what the hole is for.
I said "for science".
She said "fill it in".
I have not filled it in.
I have made it deeper.` },
  { id: 'goose', title: 'GOOSE', when: (s) => s.goose.met, body:
`DO NOT LOOK THE GOOSE IN THE EYE
DO NOT LOOK THE GOOSE IN THE EYE
DO NOT LOOK THE GOOSE IN THE EYE

(I looked the goose in the eye)` },
  { id: 'brian', title: 'Reasons Brian is evil', when: (s) => s.lifetime >= 50, body:
`1. Says The Thing is his
2. Has a moustache (suspicious)
3. Waves at me "normally"
4. Mows his lawn on Sundays at 7am
5. Owns a leaf blower and USES it
6. I'm pretty sure he's working with the goose` },
  { id: 'scratch', title: 'Scratchcard strategy', when: (s) => s.stats.cards >= 1, body:
`Tips from the man at the corner shop:
- "Scratch from the left, it's luckier"
- "No wait, from the right"
- "Actually it doesn't matter, it's random"
- "Please buy another one"` },
  { id: 'frog', title: 'Frog', when: (s) => s.frogs >= 1, body:
`I won a frog on a scratchcard.
The frog's name is Colin.
Colin lives in my pocket now.
Colin does not want to be put down.` },
  { id: 'derek', title: 'Derek', when: (s) => s.flags.derek, body:
`Derek (1p) is doing well.
Derek likes: being shiny, the radio.
Derek dislikes: the coin pusher (bad memories).
Derek is NOT for spending.` },
  { id: 'places', title: 'Places to check', when: (s) => s.lifetime >= 15, body:
`Places money might be:
- sofa (obviously)
- the floor (look DOWN)
- piggy bank (sorry Gerald)
- the garden (dig)
- ??? (ask Nan, she knows things)
- ??? (the park??)` },
  { id: 'grandad', title: "Grandad's habits", when: (s) => s.lifetime >= 60, body:
`Things Grandad always did:
- whistled
- checked the phone box (WHY)
- fed the ducks
- said "a penny saved is a penny found"
- went quiet whenever anyone mentioned the sofa` },
  { id: 'million', title: 'I AM A MILLIONAIRE', when: (s) => s.lifetime >= 1e6, body:
`I have found a MILLION POUNDS.
Down the sofa. And other places.
This is normal. Everything is normal.
Still not enough for The Thing.
How much IS a trillion???
(Googled it. It's a lot.)` },
  { id: 'moon', title: 'Moon admin', when: (s) => (s.gens.moon || 0) >= 1, body:
`Things I need to do on the Moon:
- check the sofa (done)
- check behind the sofa
- say hi to the moon cat
- do NOT tell Mum I've been to the Moon` },
];

// ---- Phone: text messages. Each arrives once its `when` is true. ----
LC.TEXTS = [
  { id: 'mum1', from: 'Mum', when: () => true, msgs: ['Morning love. Have you seen the big thing in the hall??', "Grandad's note says it's yours if you can pay for it. Good luck with that x"] },
  { id: 'nan1', from: 'Nan', when: (s) => s.lifetime >= 2, msgs: ['HELLO DEAR THIS IS NAN', 'HOW DO I TURN OFF CAPITALS', 'I have put a fiver aside for you. It is under the fiver I put aside last time.'] },
  { id: 'brian1', from: 'Brian (next door)', when: (s) => s.lifetime >= 20, msgs: ["Just so you know, your grandad promised that Thing to ME.", "I'm saving up too. I have a spreadsheet.", "Good luck kiddo 🙂"] },
  { id: 'mum2', from: 'Mum', when: (s) => s.depth >= 0.5, msgs: ['Why is there a hole in the garden', 'Fill it in please', 'Is that my good spoon'] },
  { id: 'unknown1', from: 'Unknown number', when: (s) => s.lifetime >= 200, msgs: ['hello is this the sofa'] },
  { id: 'brother1', from: 'Little brother', when: (s) => (s.gens.brother || 0) >= 1, msgs: ["i am in the sofa", "it is dark", "i found a crisp", "i am staying here forever"] },
  { id: 'nan2', from: 'Nan', when: (s) => s.lifetime >= 1000, msgs: ['A GOOSE CAME TO MY HOUSE AND ASKED FOR YOU', 'Well it honked. I assumed it was for you.'] },
  { id: 'brian2', from: 'Brian (next door)', when: (s) => s.lifetime >= 5000, msgs: ['Is that a METAL DETECTORIST in your garden?', "That's cheating.", "...where did you get him? Asking for a friend."] },
  { id: 'bank1', from: 'Bank', when: (s) => s.lifetime >= 1e5, msgs: ['Dear Customer, we have noticed unusual sofa activity on your account.', 'Please confirm you are a real person and not a sofa. Reply Y or N.'] },
  { id: 'mum3', from: 'Mum', when: (s) => (s.gens.pigeons || 0) >= 1, msgs: ['Why are there 40 pigeons on the roof', 'They are looking at me', 'One of them has a tiny briefcase'] },
  { id: 'unknown2', from: 'Unknown number', when: (s) => s.lifetime >= 1e6, msgs: ['honk'] },
  { id: 'brian3', from: 'Brian (next door)', when: (s) => s.lifetime >= 1e7, msgs: ["OK how are you doing this", "I've been digging for three days", "I found a sock"] },
  { id: 'grandad1', from: 'Grandad', when: (s) => s.lifetime >= 1e9, msgs: ["Hello. It's Grandad. Nan showed me how to text.", 'Proud of you. Keep going.', "Don't let Brian peek under the sheet."] },
  { id: 'nan3', from: 'Nan', when: (s) => s.lifetime >= 30, msgs: ['Your grandad never walked past that red phone box without checking the little coin flap.', 'Said it paid for his paper every morning.'] },
  { id: 'mate1', from: 'Jamal (school)', when: (s) => s.lifetime >= 120, msgs: ['yo r u coming to the park', 'someone said u can get money out the fountain??', 'i got 30p and a duck bit me'] },
  { id: 'mum4', from: 'Mum', when: (s) => s.lifetime >= 400, msgs: ["If you're going to the park, take a bag for the litter under the benches.", 'You would not BELIEVE what people drop.'] },
  { id: 'brian4', from: 'Brian (next door)', when: (s) => s.lifetime >= 2000, msgs: ['Stop staring at my gnome.', 'He has been in the family for 40 years.', 'He sees EVERYTHING.'] },
  { id: 'mumkey', from: 'Mum', when: (s) => s.lifetime >= 250, flag: 'knowsKey', msgs: ["Brian's asked me to water his plants while he's at the shops again.", 'He keeps his spare key under that ugly gnome. Do NOT go in there.', 'I mean it.'] },
  { id: 'brianW', from: 'Brian (next door)', when: (s) => s.flags.prank_whoopee, msgs: ['WHO PUT A WHOOPEE CUSHION ON MY SOFA', 'I had GUESTS round', 'This means war.'] },
  { id: 'brianG', from: 'Brian (next door)', when: (s) => s.flags.prank_glitter, msgs: ['There is GLITTER in my HALLWAY', 'It is in the CARPET', 'It is in my MOUSTACHE'] },
  { id: 'brianS', from: 'Brian (next door)', when: (s) => s.flags.prank_stink, msgs: ['My car smells like a dead badger', 'The Tax Badger says it was not him', 'I know it was you'] },
  { id: 'brianT', from: 'Brian (next door)', when: (s) => s.flags.prank_ticket, msgs: ['I paid an £80 parking ticket.', 'On my own drive.', 'The council says they have "no record of it".'] },
  { id: 'brianGo', from: 'Brian (next door)', when: (s) => s.flags.prank_goose, msgs: ['There is a GOOSE on my lawn', 'It ate my gnome\'s hat', 'Call it off. CALL IT OFF.'] },
  { id: 'brianFund', from: 'Brian (next door)', when: (s) => (s.stats.fundRaids || 0) >= 1, msgs: ['Has someone been in my Thing Fund jar?', 'The coins have been... rearranged.'] },
  { id: 'brianCaught', from: 'Brian (next door)', when: (s) => s.flags.caught, msgs: ['Stay. Out. Of. My. House.', "I've told your mum.", 'I have also told the gnome.'] },
  { id: 'brian50', from: 'Brian (next door)', when: (s) => (s.brian && s.brian.p >= 0.5), msgs: ["Halfway there, kiddo. How's the sofa going? 🙂"] },
  { id: 'brian85', from: 'Brian (next door)', when: (s) => (s.brian && s.brian.p >= 0.85), msgs: ['Getting close now.', "I've measured my hall. The Thing will fit perfectly."] },
  { id: 'nanring', from: 'Nan', when: (s) => s.lifetime >= 600, msgs: ["I've been thinking about your grandad.", 'I dropped his wedding ring down a drain on this street in 1987. Never found it.', 'Silly old Nan.'] },
  { id: 'moleK', from: 'Unknown number', when: (s) => s.depth >= 1000, msgs: ['this is the mole king', 'how did i get a phone', 'come down. we must talk.'] },
  { id: 'moon1', from: 'NASA (probably)', when: (s) => (s.gens.moon || 0) >= 1, msgs: ['Hi. Could you please stop checking the Moon sofa.', 'The astronauts were going to check it.'] },
];

// ---- Phone: weather app forecasts ----
LC.FORECASTS = [
  ['☀️', 'Sunny', 'Highs of 24°. 40% chance of coins.'],
  ['🌦️', 'Light showers', 'Of pigeons. Bring an umbrella. A strong one.'],
  ['🪿', 'Goose warning', 'A goose has been spotted in your area. Stay indoors. Lock the cat flap.'],
  ['☁️', 'Overcast', 'Grey all day. Perfect sofa weather.'],
  ['🌈', 'Rainbow', 'Ending somewhere around the park fountain today. Probably a 2p.'],
  ['🍃', 'Breezy', 'Expect litter under park benches. And possibly treasure.'],
  ['🌬️', 'Windy', 'Brian\'s leaf blower expected from 7am.'],
  ['🌙', 'Clear skies', 'Good night for looking at the Moon. Is that a sofa up there?'],
  ['🌧️', 'Rain', 'Worms will come up. Gary sends his regards.'],
];

// ---- Secrets: hidden ways to earn and Easter eggs. The phone's Secrets app shows hints. ----
LC.SECRETS = [
  { id: 'fountain', icon: '⛲', name: 'Wishing fountain', hint: 'People throw their wishes into water. Somebody has to get them out.', found: 'Fish coins out of the park fountain. It refills as people make wishes.' },
  { id: 'bench', icon: '🪑', name: 'Under the benches', hint: 'Old men sit in the park and drop things.', found: 'Check under park benches for dropped change.' },
  { id: 'phonebox', icon: '☎️', name: 'Coin return', hint: 'Grandad always checked the phone box.', found: 'Check the coin return in the red phone box.' },
  { id: 'dog', icon: '🐕', name: 'Good boy', hint: 'Pat everything with fur.', found: 'The dog in the park sometimes finds you coins.' },
  { id: 'floor', icon: '🪙', name: 'Eyes down', hint: 'Money is everywhere if you look down.', found: 'Coins turn up on the floor all over town. Walk over them.' },
  { id: 'golden', icon: '✨', name: 'Shiny!', hint: 'When the arrow appears, run.', found: 'Golden coins appear somewhere in town. Follow the arrow.' },
  { id: 'gnome', icon: '🧙', name: "The gnome's notebook", hint: "Brian's gnome is always watching. Watch it back.", found: 'Stare down the gnome five times.', egg: true },
  { id: 'colin', icon: '🐸', name: 'Colin', hint: 'Not every scratchcard prize is a prize.', found: 'Win a frog on a scratchcard. His name is Colin.', egg: true },
  { id: 'chatty', icon: '💬', name: 'Local celebrity', hint: 'Say hello to everyone in town.', found: 'Chat to every kind of townsperson.', egg: true },
  { id: 'notes', icon: '📝', name: 'Diary of a millionaire', hint: 'Read your own notes. All of them.', found: 'Read every note on your phone.', egg: true },
];

// ---- What townsfolk say when you say hello. The first lines often hide a hint. ----
LC.CHAT = {
  jamal: ['"Kickflip attempt number 4,000. Watch this. ...Don\'t watch this."', '"Daz and that lot are by the benches again. Avoid. Or don\'t. Your funeral, bruv."', '"If you get The Thing can I sit on it? Even if it\'s a sofa? ESPECIALLY if it\'s a sofa."', '"My mum says I can\'t come round yours because of \'the hole\'. I respect her position."'],
  priya: ['"Did you know the Romans had public toilets with no walls? Imagine. IMAGINE."', '"Daz is all talk. You just need a good comeback. He hates a good comeback."', '"I\'m cataloguing every pigeon in the park. There\'s one called Kevin. He\'s the boss."', '"Captain Pete says there\'s treasure on the beach. Pete also says he once punched a shark."'],
  jogger: ['"Alright la! Can\'t stop! Personal best, this!"', '"Found a quid on me run once. By the phone box. Best day of me life, that."', '"D\'ya ever just... run? Ya should. Clears the head, la."', '"Been runnin\' for nine years. Me legs don\'t know how to stop. Send help."', '"That drain on Acacia Road jingles, by the way. Just sayin\'. Proper jingles."'],
  oldman: ['"Ooh arr. Back in my day you\'d find a pound under every park bench, and a pickled egg."', '"That fountain\'s full of wishes, my lover. Shame to waste \'em."', '"Your grandad and I went metal detectin\'. He never told me what he found. Proper secretive, he were."', '"The dog\'s called Biscuit. Biscuit is cleverer than I. Biscuit does my taxes."', '"Moles under the park, there are. Big molehill by the swings. They\'m up to summat."'],
  postman: ['"Ow do! Lot of post for your grandad lately. Big parcels. Heavy. Rattly."', '"That drain cover on Acacia Road jingles when I walk over it. Jingles! Drains shouldn\'t jingle. Not my department though, bab."', '"That goose had me on Tuesday. And Wednesday. Thursday I took the long way round."', '"Brian at number 7 gets a parcel from SPADES R US every week. What\'s he DOING?"'],
  mum: ['"Oh my DAYS, hiya babe! Saving up for something, are ya?"', '"Tyson swallowed a 2p once. We got it back. Don\'t ask, babe. Honestly, don\'t."', '"I always leave me change in the washing. Every. Single. Time. Shocking."', '"Have you seen the size of that hole in your garden? Your mum\'s gonna do her nut."'],
  kid: ['"Bruv. I\'m saving up too. I\'ve got 4p. I\'m basically rich, innit."', '"The fountain\'s well magic. My mate got 50p out of it. He\'s a legend."', '"Brian shouted at me for touching his gnome. So I touched it again. Twice."', '"Swap you a Lego for a button? No? Rude, innit."'],
  lady: ['"Och, you\'re Ken\'s wee grandbairn! Lovely man. Hid money EVERYWHERE, so he did."', '"I put 20p in that phone box in 1994, hen. Never gave it back. I\'ve not forgotten."', '"The pigeons round here are organised, dear. They\'ve got a union."', '"Have you tried the benches in the park? Folk drop all sorts. Mostly their dignity."'],
};

// ---- Tasks: a guided checklist (separate from secrets). Three show at a time, top-left. ----
// progress(s) returns a number compared against `target`. reward: { secs } = seconds of income,
// { cash } = flat £, { gen: [id, n] } = free helpers, { up: id } = free upgrade, { tool: [id, n] } = free diggers, { buttons }.
LC.TASKS = [
  { id: 't1', text: 'Rummage down the sofa 10 times', target: 10, progress: (s) => s.stats.clicks, reward: { cash: 1 }, rewardText: '£1' },
  { id: 't2', text: 'Find £1 in total', target: 1, progress: (s) => s.lifetime, reward: { gen: ['cat', 1] }, rewardText: 'A free Nosy Cat' },
  { id: 't3', text: 'Hire your Little Brother at the notice board outside the post office', target: 1, progress: (s) => s.gens.brother || 0, reward: { cash: 5 }, rewardText: '£5' },
  { id: 't4', text: 'Smash the piggy bank on the mantelpiece', target: 1, progress: (s) => s.stats.pigs, reward: { toolTier: ['sofa', 1] }, rewardText: 'Free Rubber Gloves (better rummaging)' },
  { id: 't5', text: 'Dig the hole in the back garden to 1 m', target: 1, progress: (s) => s.depth, reward: { secs: 60, min: 8 }, rewardText: 'A minute of income' },
  { id: 't6', text: 'Pick up 5 coins off the floor', target: 5, progress: (s) => s.stats.floor || 0, reward: { up: 'magnet1' }, rewardText: 'Free Magnetic Trousers' },
  { id: 's1', text: 'Put some junk out on your stall in the front garden', target: 1, progress: (s) => s.stall.filter(Boolean).length + (s.stats.sold || 0), reward: { cash: 10 }, rewardText: '£10' },
  { id: 's2', text: 'Sell 3 things at your stall', target: 3, progress: (s) => s.stats.sold || 0, reward: { secs: 90, min: 15 }, rewardText: 'Ninety seconds of income' },
  { id: 't7', text: 'Read a message on your phone', target: 1, progress: (s) => Object.values(s.texts).filter((t) => t.read).length, reward: { cash: 15 }, rewardText: '£15' },
  { id: 't8', text: 'Find £100 in total', target: 100, progress: (s) => s.lifetime, reward: { gen: ['detectorist', 1] }, rewardText: 'A free Metal Detectorist' },
  { id: 'k1', text: 'Raid Mum\'s change jar in the kitchen', target: 1, progress: (s) => s.stats.jar || 0, reward: { cash: 3 }, rewardText: '£3 (Mum will never know)' },
  { id: 'k2', text: 'Do a load of washing (and check the pockets)', target: 1, progress: (s) => s.stats.washes || 0, reward: { secs: 60, min: 10 }, rewardText: 'A minute of income' },
  { id: 'l1', text: 'Get up into the loft (the hardware shop sells a pole)', target: 1, progress: (s) => (s.flags.loft ? 1 : 0), reward: { secs: 120, min: 20 }, rewardText: 'Two minutes of income' },
  { id: 'l2', text: "Find 3 of Grandad's letters", target: 3, progress: (s) => (s.letters || []).length, reward: { secs: 300 }, rewardText: 'Five minutes of income' },
  { id: 't9', text: 'Buy a scratch card at the corner shop', target: 1, progress: (s) => s.stats.cards, reward: { secs: 120, min: 20 }, rewardText: 'Two minutes of income' },
  { id: 'b1', text: "Find out where Brian hides his spare key", target: 1, progress: (s) => (s.flags.hasKey ? 1 : 0), reward: { secs: 120, min: 15 }, rewardText: 'Two minutes of income' },
  { id: 'b2', text: "Sneak into Brian's house and raid his sofa 10 times", target: 10, progress: (s) => s.stats.brianSofa || 0, reward: { secs: 240 }, rewardText: 'Four minutes of income' },
  { id: 't10', text: 'Own 10 Nosy Cats', target: 10, progress: (s) => s.gens.cat || 0, reward: { secs: 180 }, rewardText: 'Three minutes of income' },
  { id: 't11', text: 'Dig to 5 m', target: 5, progress: (s) => s.depth, reward: { tool: ['gnome', 1] }, rewardText: 'A free Garden Gnome digger' },
  { id: 'u1', text: 'Climb down the ladder into your hole', target: 1, progress: (s) => (s.flags.wentDown ? 1 : 0), reward: { secs: 180 }, rewardText: 'Three minutes of income' },
  { id: 't12', text: 'Catch a golden coin', target: 1, progress: (s) => s.stats.golden, reward: { secs: 300 }, rewardText: 'Five minutes of income' },
  { id: 't13', text: 'Find a secret somewhere in town', target: 1, progress: (s) => s.secrets.length, reward: { buttons: 5, secs: 120 }, rewardText: '5 buttons + two minutes of income' },
  { id: 'b3', text: 'Pull a prank on Brian (find something to prank him with first)', target: 1, progress: (s) => s.stats.pranks || 0, reward: { secs: 300, buttons: 5 }, rewardText: 'Five minutes of income + 5 buttons' },
  { id: 't14', text: 'Find £10,000 in total', target: 1e4, progress: (s) => s.lifetime, reward: { gen: ['well', 1] }, rewardText: 'A free Wishing Well' },
  { id: 't15', text: 'Smash 10 piggy banks', target: 10, progress: (s) => s.stats.pigs, reward: { toolTier: ['pig', 1] }, rewardText: 'Free Proper Hammer' },
  { id: 't16', text: 'Hire a Coin Pusher', target: 1, progress: (s) => s.gens.pusher || 0, reward: { secs: 600 }, rewardText: 'Ten minutes of income' },
  { id: 't17', text: 'Dig to 100 m', target: 100, progress: (s) => s.depth, reward: { secs: 600 }, rewardText: 'Ten minutes of income' },
  { id: 'b4', text: "Raid Brian's Thing Fund jar 3 times", target: 3, progress: (s) => s.stats.fundRaids || 0, reward: { secs: 900 }, rewardText: '15 minutes of income' },
  { id: 'u2', text: "Find Nan's lost wedding ring", target: 1, progress: (s) => (s.flags.ringReturned ? 1 : 0), reward: { secs: 900 }, rewardText: '15 minutes of income' },
  { id: 't18', text: 'Find 3 secrets', target: 3, progress: (s) => s.secrets.length, reward: { buttons: 10, secs: 900 }, rewardText: '10 buttons + 15 minutes of income' },
  { id: 't19', text: 'Find £1 million in total', target: 1e6, progress: (s) => s.lifetime, reward: { gen: ['pigeons', 2] }, rewardText: 'Two free Pigeon Syndicates' },
  { id: 's3', text: 'Sell something to The Collector', target: 1, progress: (s) => s.stats.collector || 0, reward: { secs: 900 }, rewardText: '15 minutes of income' },
  { id: 't20', text: 'Scratch 10 scratch cards', target: 10, progress: (s) => s.stats.cards, reward: { up: 'luckypen' }, rewardText: 'Free Lucky Scratching Coin' },
  { id: 't21', text: 'Dig to 1 km and meet the Mole King', target: 1000, progress: (s) => s.depth, reward: { secs: 1200 }, rewardText: '20 minutes of income' },
  { id: 'b5', text: 'Prank Brian 5 times', target: 5, progress: (s) => s.stats.pranks || 0, reward: { secs: 1200 }, rewardText: '20 minutes of income' },
  { id: 'u3', text: 'Earn the trust of the Mole King', target: 1, progress: (s) => (s.flags.honoraryMole ? 1 : 0), reward: { secs: 1500 }, rewardText: '25 minutes of income' },
  { id: 't22', text: 'Survive 25 random events', target: 25, progress: (s) => s.stats.events, reward: { secs: 1200 }, rewardText: '20 minutes of income' },
  { id: 't23', text: 'Find £1 billion in total', target: 1e9, progress: (s) => s.lifetime, reward: { gen: ['factory', 1] }, rewardText: 'A free Sofa Factory' },
  { id: 'l3', text: "Find all 12 of Grandad's letters", target: 12, progress: (s) => (s.letters || []).length, reward: { secs: 3600 }, rewardText: 'An hour of income' },
  { id: 't24', text: 'Reach the centre of the Earth', target: 6371000, progress: (s) => s.depth, reward: { secs: 1800 }, rewardText: '30 minutes of income' },
  { id: 't25', text: 'Save up £1 trillion for The Thing', target: 1e12, progress: (s) => s.money, reward: { cash: 0 }, rewardText: 'Find out what it is' },
];

// ---- Junk: things you find and sell at your stall. value = seconds of income when found (min £). ----
// rarity: 1 common, 2 uncommon, 3 rare, 4 legendary (collectors pay more for 3+)
LC.JUNK = {
  remote: { icon: '📺', name: 'TV remote', value: 6.25, min: 0.5, rarity: 1 },
  lego: { icon: '🧱', name: 'Lego brick', value: 2.5, min: 0.2, rarity: 1 },
  phone: { icon: '📱', name: 'Old phone', value: 22.5, min: 3, rarity: 2 },
  ticket: { icon: '🎟️', name: 'Bus ticket (1987)', value: 3.75, min: 0.3, rarity: 1 },
  foreign: { icon: '🪙', name: 'Foreign coin', value: 5, min: 0.4, rarity: 1 },
  marble: { icon: '🔮', name: 'Marble', value: 4.5, min: 0.3, rarity: 1 },
  toycar: { icon: '🚗', name: 'Toy car', value: 7.5, min: 0.6, rarity: 1 },
  sock: { icon: '🧦', name: 'Odd sock', value: 1.5, min: 0.1, rarity: 1 },
  bottlecap: { icon: '🍾', name: 'Bottle cap', value: 2, min: 0.1, rarity: 1 },
  spoon: { icon: '🥄', name: 'Old spoon', value: 5.5, min: 0.4, rarity: 1 },
  horseshoe: { icon: '🧲', name: 'Horseshoe', value: 15, min: 1, rarity: 2 },
  pipe: { icon: '🪈', name: 'Clay pipe', value: 17.5, min: 1.5, rarity: 2 },
  soldier: { icon: '💂', name: 'Toy soldier', value: 13.75, min: 1, rarity: 2 },
  bottle: { icon: '🫙', name: 'Old glass bottle', value: 20, min: 1.5, rarity: 2 },
  key: { icon: '🗝️', name: 'Mystery key', value: 37.5, min: 4, rarity: 3 },
  roman: { icon: '🏛️', name: 'Roman coin', value: 62.5, min: 12, rarity: 3 },
  fossil: { icon: '🐚', name: 'Fossil', value: 50, min: 9, rarity: 3 },
  tamagotchi: { icon: '🥚', name: 'Tamagotchi (still alive)', value: 75, min: 20, rarity: 3 },
  medal: { icon: '🎖️', name: "Grandad's old medal", value: 125, min: 30, rarity: 4 },
  ring: { icon: '💍', name: 'Gold ring', value: 175, min: 60, rarity: 4 },
  crown: { icon: '👑', name: 'Tiny mole crown', value: 250, min: 120, rarity: 4 },
  helmet: { icon: '⛑️', name: "Centurion's helmet", value: 225, min: 100, rarity: 4 },
};
// junk you can turn up while digging, deeper = better
LC.DIG_JUNK = [
  { upTo: 2, ids: ['bottlecap', 'spoon', 'lego', 'marble', 'sock'] },
  { upTo: 50, ids: ['spoon', 'horseshoe', 'pipe', 'bottle', 'soldier', 'marble'] },
  { upTo: 5000, ids: ['bottle', 'pipe', 'roman', 'fossil', 'key', 'horseshoe'] },
  { upTo: Infinity, ids: ['fossil', 'roman', 'key', 'medal', 'ring', 'crown'] },
];
LC.STALL_PRICES = { cheap: { mult: 0.7, buy: 0.9, label: 'Cheap', note: 'Sells fast' }, fair: { mult: 1, buy: 0.65, label: 'Fair', note: 'Sells OK' }, cheeky: { mult: 1.7, buy: 0.35, label: 'Cheeky', note: 'Slow, people haggle' } };
LC.STALL_UPS = [
  { id: 'sign', icon: '🪧', name: 'Hand-drawn sign', cost: 20, desc: '"BARGINS". More people stop. (+40% customers)' },
  { id: 'table', icon: '🪑', name: 'Bigger table', cost: 300, desc: 'Room for 10 things instead of 6.' },
  { id: 'parasol', icon: '⛱️', name: 'Parasol', cost: 2500, desc: 'Looks very professional. (+30% customers)' },
  { id: 'lemonade', icon: '🍋', name: 'Lemonade jug', cost: 15000, desc: 'Sell lemonade too: earns a little while anyone is at the stall.' },
  { id: 'bell', icon: '🔔', name: 'Shop bell', cost: 2e5, desc: 'Ding! Customers come twice as often.' },
];
LC.STALL_LINES = {
  browse: ['Ooh, what\'s all this then?', 'Lovely bit of tat, this.', 'Mind if I have a gander?', 'How much for the... no, go on, guess.', 'Is that a genuine Lego?', 'Just browsing, love. Like a civilised person.', 'Oh, I used to have one of these. Then I grew up.'],
  buy: ['Go on then, I\'ll take it. Cheers, love!', 'Bargain! Don\'t tell the wife.', 'Our Jason will love this. He loves anything.', 'Sold! Keep the change. Actually, no, give me the change.', 'Smashing. Absolutely smashing.', 'Right, that\'s Christmas sorted.'],
  pass: ['Ooh, no, not today, love.', 'How much?! I\'ve seen cheaper at the tip.', 'I\'ve already got one. In the loft. Somewhere.', 'Mustn\'t grumble. But I will. No thanks.', 'Is that a sock? Why are you selling a sock?', 'I\'ll have a think. (They will not have a think.)'],
  collector: ['Good heavens. A RARE one! I collect these, you know.', 'My word. Name your price, young man. Or young lady. Or whoever you are.', 'This belongs in a museum. My museum. It\'s in my shed.'],
  waiting: ['Hello? Anybody home?', 'Is this your stall? It\'s very... a stall.', '*taps foot in a very British way*', 'I don\'t want to be a bother, but...', '*clears throat politely*'],
  impatient: ['Helloooo? I\'m queueing here.', 'I\'ve been stood here longer than the bus takes.', 'Right, I\'m going to sigh. *sighs*', 'I am NOT making a fuss. *makes a fuss*', 'This is worse than the post office.'],
  thief: ['Finders keepers, losers weepers!', 'Ta very much!', 'It said "free", innit? Didn\'t it? It didn\'t.', 'Cheerio!'],
  caught: ['Sorry! SORRY! Very sorry! I\'m British!', 'Alright, alright, keep your hair on!', 'Please don\'t tell me mum.', 'I was only borrowing it, honest guv!'],
};


// ---- Tools you hold. Bought at Nailed It Hardware. They wear out; repair them at the shed workbench. ----
// sofa: mult = each rummage x, pct = also finds this share of your £/s. pig: hits = hits needed x, pay = payout x. dig: mult = per dig x.
LC.TOOLS = {
  sofa: [
    { name: 'Your hands', icon: '✋' },
    { name: 'Rubber Gloves', icon: '🧤', cost: 3, mult: 2, pct: 0, dur: 500, desc: 'Sofa crumbs no longer a concern.' },
    { name: 'Litter Grabber', icon: '🦯', cost: 150, mult: 6, pct: 0.01, dur: 800, desc: 'Reaches the deep bits. Also finds 1% of your £/s.' },
    { name: 'Hoover', icon: '🧹', cost: 60000, mult: 18, pct: 0.03, dur: 1500, desc: 'The thin nozzle. Finds 3% of your £/s.' },
    { name: 'X-Ray Goggles', icon: '🥽', cost: 3e6, mult: 90, pct: 0.06, dur: 3000, desc: 'You can see the coins. You can see EVERYTHING. 6% of your £/s.' },
  ],
  pig: [
    { name: 'Toy Hammer', icon: '🔨' },
    { name: 'Proper Hammer', icon: '🔨', cost: 2000, hits: 0.5, pay: 1, dur: 200, desc: 'Piggy banks take half as many hits.' },
    { name: 'Sledgehammer', icon: '🔨', cost: 5e5, hits: 0.3, pay: 1.25, dur: 300, desc: 'Fewer hits, and 25% more inside (it shakes more out).' },
    { name: 'Dynamite', icon: '🧨', cost: 1e8, hits: 0, pay: 1.5, dur: 120, desc: 'One hit. Everything. 50% more. Stand back.' },
  ],
  dig: [
    { name: 'Mum\'s Good Spoon', icon: '🥄' },
    { name: 'Trowel', icon: '🌱', cost: 40, mult: 3, dur: 400, desc: 'Digs three times as much.' },
    { name: 'Spade', icon: '⛏️', cost: 5000, mult: 10, dur: 800, desc: 'A real spade. Digs ten times as much.' },
    { name: 'Power Drill', icon: '🔩', cost: 2e6, mult: 40, dur: 1500, desc: 'BRRRRR. Digs forty times as much.' },
  ],
};
LC.HARDWARE_EXTRAS = [
  { id: 'rucksack', icon: '🎒', name: 'Bigger Rucksack', cost: 800, desc: 'Carry 24 things instead of 12.' },
  { id: 'wheelbarrow', icon: '🛒', name: 'Wheelbarrow', cost: 5e5, desc: 'Carry 48 things. Very serious.' },
  { id: 'crowbar', icon: '🪛', name: 'Crowbar', cost: 2500, desc: 'For "opening things". The man does not ask what things. He does not want to know.' },
  { id: 'loftpole', icon: '🪝', name: 'Loft Pole', cost: 120, desc: 'A pole with a hook on the end. For opening loft hatches. Hint hint.' },
];

// ---- Helpers have names ----
LC.HELPER_NAMES = {
  cat: ['Tibbles', 'Smudge', 'Mr Whiskers', 'Biscuit', 'Duchess', 'Gerald', 'Socks', 'Chairman Meow', 'Pickle', 'Toast'],
  brother: ['Your little brother', 'His mate Dev', 'His mate Ollie', 'Cousin Kyle', 'Some kid called Jayden', 'The twins'],
  detectorist: ['Ken', 'Barry', 'Maureen', 'Big Steve', 'Little Steve', 'Doreen'],
  well: ['The Wishing Well'], pusher: ['Pushy', 'Edge Lord', 'Big Bertha'], pigeons: ['Don Coo-leone', 'Feathers', 'The Accountant', 'Gaz'],
  carboot: ['Trevor', 'Sandra', 'Dodgy Dave'], mine: ['The Mineshaft'], factory: ['The Sofa Factory'], moon: ['Moon Sofa'], multiverse: ['Sofa Prime'],
};

// ---- Helpers sometimes want something. Bring it and they work 3x harder for 5 minutes. ----
LC.REQUESTS = [
  { gen: 'cat', item: 'sardines', icon: '🐟', name: 'Sardines', text: 'The cats are on strike until they get SARDINES.' },
  { gen: 'brother', item: 'haribo', icon: '🍬', name: 'Haribo', text: 'Your little brother wants Haribo. He will not stop asking.' },
  { gen: 'detectorist', item: 'batteries', icon: '🔋', name: 'Batteries', text: "The detectorists' batteries are flat. Beep... beep... b..." },
];

// ---- The shed workbench: make gadgets out of junk ----
LC.RECIPES = [
  { id: 'detector', icon: '📡', name: 'Homemade Metal Detector', needs: ['spoon', 'phone', 'bottlecap'], desc: 'Detectorists x2, and you find junk twice as often when digging.' },
  { id: 'supermagnet', icon: '🧲', name: 'Super Magnet', needs: ['horseshoe', 'marble'], desc: 'Coins fly to you from much further away.' },
  { id: 'robocat', icon: '🤖', name: 'Robo-Cat Suits', needs: ['phone', 'toycar', 'lego'], minGen: ['cat', 25], desc: 'EVOLUTION: your cats become Robo-Cats. Cats x5.' },
  { id: 'spelunk', icon: '🔦', name: 'Spelunking Kit', needs: ['spoon', 'bottle', 'soldier'], minGen: ['brother', 25], desc: 'EVOLUTION: your brother goes pro. Little Brothers x5.' },
  { id: 'pigeonradio', icon: '📻', name: 'Pigeon Radio', needs: ['phone', 'key'], minGen: ['pigeons', 10], desc: 'The Pigeon Syndicate gets organised. Pigeons x3.' },
  { id: 'charm', icon: '🍀', name: 'Lucky Charm', needs: ['horseshoe', 'foreign', 'medal'], desc: 'All income +25%.' },
  { id: 'molekit', icon: '⛑️', name: "Mole King's Hard Hat", needs: ['crown', 'fossil'], desc: 'Dig speed x3.' },
];

LC.UNDER_CHAT = {
  gary: ['Gary: "Alright? Mind the roof. I\'ve been meaning to fix it for 40 years."', 'Gary: "I\'ve seen things down here. Mostly dirt. Some of it was brown."', 'Gary: "The sewer? Can\'t get there from here, pal. Try the drain on Acacia Road. Bring a crowbar. And a peg for your nose."', 'Gary: "The moles live under the park. Big molehill by the swings. Don\'t mention their eyesight, they\'re sensitive."', 'Gary: "I\'m not a snake. I get that a lot. I\'m a worm with ambition."'],
  rat: ['The rat tips its tiny hat. It is wearing a bottle cap.', 'Rat: "The Romans built a road down here. Then the corner shop built on top of it. Typical."', 'Rat: "Squeak." (That was rude.)', 'Rat: "Seen a ring? Gold? Shiny? No? Me neither." (It has definitely seen a ring.)', 'Rat: "Lot of coins come down the drains. We don\'t judge."'],
  mole: ['Mole: "A SURFACE DWELLER! Quick, everyone, pretend to be dirt!"', 'Mole: "You came through the molehill? We call that the front door. Wipe your feet."', 'Mole: "Have you met the King? He is very small and very important."', 'Mole: "We trade in shiny things down here."', 'Mole: "Our houses are holes. Your house is a hole above a hole."'],
};

// ---- Grandad's letters: the real story, found around the world. Shown in the Notes app. ----
LC.LETTERS = [
  { id: 'l1', where: 'loft box', title: 'If you are reading this', body: `If you're reading this, you've found my boxes. Good. Nosy, like me.

I've left you something in the hall. Don't let Brian look under the sheet. He's been trying since 1983.

Start with the sofa. You'll see why.

Love, Grandad (Ken)` },
  { id: 'l2', where: 'loft box', title: 'About the sofa', body: `That sofa was my dad's. And his dad's.

Every Friday since 1961 I've dropped my loose change down the back. Fifty years of Fridays.

That's why it never runs out. Well. That, and something I can't explain.

- Ken` },
  { id: 'l3', where: 'loft box', title: 'Brian', body: `Brian was my paper boy in 1979. Lovely lad. Terrible at maths.

In 1983 he bet me he could save more than me by the end of the summer. He lost. He has never forgiven me.

He thinks The Thing is his prize. It isn't. It never was.

- Ken` },
  { id: 'l4', where: 'loft box', title: 'The goose', body: `The goose is called Margaret. She is 41 years old. Geese don't live that long. Margaret does.

I raised her from an egg I found in the post office. She hates everyone except family.

If she bites you, it means she's thinking about it.

- Ken` },
  { id: 'l5', where: 'the hole', title: 'Buried in a biscuit tin', body: `I buried this tin in 1974, so if you've dug this far, well done.

The garden is older than the house. Romans, pirates, moles. All sorts.

Keep going. The moles are friendly once they know you.

- Ken (age 34, with a spade)` },
  { id: 'l6', where: "Brian's house", title: 'Found in Brian\'s drawer', body: `(A letter Ken wrote to Brian in 1984. Brian kept it.)

Brian, it was only a bet. The Thing isn't for winning. It's for whoever needs it most.

Come round for tea. Margaret says sorry about your ankle.

- Ken` },
  { id: 'l7', where: 'Roman chest', title: 'Note in the Roman chest', body: `WE WERE HERE FIRST - THE ROMANS

(Underneath, in biro:) So was I. The coins are mine, the helmet is theirs. - Ken` },
  { id: 'l8', where: 'the Mole King', title: 'A letter the Mole King kept', body: `To His Majesty the Mole King,

Thank you for the tunnels. Sorry about the noise of the drill. Please look after my grandchild if they ever come down.

Your friend on the surface,
Ken` },
  { id: 'l9', where: 'loft trunk', title: 'In the locked trunk', body: `This trunk has my savings book in it. Every penny I ever found, written down.

The total is exactly one trillion pounds. Well. In my head it is.

I never spent it. I wanted to see what you'd do with it.

- Ken` },
  { id: 'l10', where: 'the sofa', title: 'Folded very small, down the sofa', body: `If you've rummaged this many times, you're definitely my grandchild.

Your Nan thinks I'm daft. She's right. Look after her.

- Ken` },
  { id: 'l11', where: 'the charity shop', title: 'Inside an old book', body: `I gave this book to the charity shop on purpose. I knew you'd go in eventually.

The best things in life are second-hand. Except socks.

- Ken` },
  { id: 'l12', where: 'The Thing', title: 'Pinned to the sheet', body: `You did it. A trillion pounds. I knew you would.

Whatever is under this sheet, remember: it was never about the money.

It was about checking down the back of the sofa.

Love you. Go on then. Have a look.

- Grandad` },
];

// ---------- town events: each run gets 5 or 6 of these at random ----------
// secs = how long it lasts. The world builds the props; game.js does the money.
LC.TOWN_EVENTS = [
  { id: 'party', icon: '🎉', name: 'Street party', secs: 200, news: 'Acacia Road street party! Bunting! Sausage rolls! Customers everywhere!', end: 'The street party is winding down. Someone is still doing the conga.', tip: 'Stall customers ×3 and income +25%' },
  { id: 'funfair', icon: '🎡', name: 'The funfair', secs: 220, news: 'The funfair has rolled into the park! Hook-a-duck: every duck wins a prize.', end: 'The funfair has packed up and left. The Ferris wheel is gone. Was it ever there?', tip: 'Hook-a-duck in the park' },
  { id: 'bins', icon: '🗑️', name: 'Bin day', secs: 180, news: 'BIN DAY. Everyone\'s bins are out on the pavement. Full of other people\'s stuff.', end: 'The bin lorry has been. All the bins are gone.', tip: 'Search the bins along the street' },
  { id: 'marathon', icon: '🏃', name: 'The Fun Run', secs: 160, news: 'The Acacia Fun Run is coming down your road! Cheer the runners on!', end: 'The last runner has finished. He was dressed as a rhino.', tip: 'Cheer the runners. Thirsty runners buy from your stall' },
  { id: 'film', icon: '🎬', name: 'Film crew', secs: 200, news: 'A film crew is shooting outside your house! They need an extra!', end: 'The film crew have wrapped. It\'s going straight to DVD.', tip: 'Talk to the director' },
  { id: 'heatwave', icon: '🥵', name: 'Heatwave', secs: 200, news: 'HEATWAVE. 34 degrees. The ice cream van is out. Lemonade sells like mad.', end: 'The heatwave is over. Back to normal British drizzle.', tip: 'Ice cream van on the street. Stall customers ×2' },
  { id: 'storm', icon: '⛈️', name: 'Thunderstorm', secs: 150, news: 'Thunderstorm! Everyone\'s run inside. Coins are washing down the gutters.', end: 'The storm has passed. The gutters are empty. Mostly.', tip: 'Coins wash down the street. No stall customers' },
  { id: 'powercut', icon: '🔦', name: 'Power cut', secs: 150, news: 'POWER CUT. The whole town is dark. Nobody can see you rummaging...', end: 'The power is back on. Everyone\'s fridge beeps at once.', tip: 'Sofa rummaging ×3. Brian can\'t see you' },
  { id: 'mayor', icon: '🎩', name: 'The Mayor\'s visit', secs: 180, news: 'The Mayor is visiting the high street! Red carpet and everything!', end: 'The Mayor has left in a very shiny car.', tip: 'Shake hands with the Mayor on the high street' },
  { id: 'treasure', icon: '📻', name: 'Radio treasure hunt', secs: 240, news: 'Radio Acacia FM has buried a prize somewhere in town! Listen for clues!', end: 'Radio Acacia FM: the treasure hunt is over! Back to the music.', tip: 'Listen for the clue and find the spot' },
  { id: 'bbq', icon: '🍖', name: 'Brian\'s BBQ', secs: 200, news: 'Brian is having a BBQ. You were not invited. His house is EMPTY.', end: 'Brian\'s BBQ is over. He\'s back inside, smelling of charcoal.', tip: 'Brian is busy. Raid his house!' },
  { id: 'geese', icon: '🪿', name: 'Goose invasion', secs: 120, news: 'GOOSE INVASION. Ten geese have taken the high street. Stay indoors.', end: 'The geese have gone. Nobody knows where. Nobody wants to know.', tip: 'Survive. Geese steal coins' },
  { id: 'snow', icon: '☃️', name: 'Snow in August', secs: 160, news: 'It\'s snowing. In August. Scientists are baffled. Kids are thrilled.', end: 'The snow has melted. It\'s 25 degrees again. Weird.', tip: 'Something is inside the snowman. Income +50%' },
  { id: 'pigeons', icon: '🐦', name: 'Pigeon strike', secs: 180, news: 'PIGEON STRIKE. The pigeons have downed tools. Their boss wants a word.', end: 'The pigeon strike is over. Business as usual.', tip: 'Negotiate with Don Coo-leone' },
  { id: 'sofasale', icon: '🛋️', name: 'Sofa sale', secs: 200, news: 'MASSIVE SOFA SALE on the high street! Sofas out on the pavement! Down the back of them: other people\'s change!', end: 'The sofa sale has ended. The sofas have all gone. Hopefully to good homes.', tip: 'Rummage the sale sofas on the high street' },
];
LC.TREASURE_CLUES = [
  ['Near a little red flag... and wooden letters.', 'Look by your own front gate!'],
  ['Where the buses don\'t come on time...', 'Try the bus stop!'],
  ['Where the ducks keep their secrets...', 'By the pond in the park!'],
  ['Where the road runs out of houses, out west...', 'The far west end of Acacia Road!'],
  ['Where notes are pinned and cats go missing...', 'The notice board!'],
];

// ---------- friends: chat to people (once a minute) and give them junk they like ----------
// 3 points a heart, 5 hearts. A heart-up plays the line for that heart. Perks at 3 and 5 hearts.
LC.FRIENDS = {
  jogger: { name: 'Speedy Steve', icon: '🏃', likes: ['sock', 'bottle', 'medal'], likeText: 'Likes: anything to do with running. And socks.',
    hearts: [
      'You again! You\'re sound, you are, la. Most people just tell me to slow down.',
      'Can I tell you something? I don\'t know where I\'m running TO. I just started in 2015 and never stopped.',
      'Here\'s a tip: lean forward, swing your arms. You\'ll get everywhere faster. (You now walk 15% faster.)',
      'I ran past your grandad every morning for nine years. He always waved with a biscuit in his hand.',
      'I find coins on every run. From now on, I\'ll drop them off for you. Partners! (Steve brings you coins now and then.)',
    ], perks: { 3: 'Walk 15% faster', 5: 'Steve drops off coins from his runs' } },
  oldman: { name: 'Old Reg', icon: '👴', likes: ['pipe', 'roman', 'horseshoe', 'foreign'], likeText: 'Likes: old things. "Like me," he says.',
    hearts: [
      'Ooh arr, Ken\'s grandchild! You\'ve got his nose. And his habit of lookin\' under things.',
      'Biscuit likes you. Biscuit doesn\'t like anyone. Biscuit bit the vicar.',
      'Secret: under the park benches, look right at the back where the bolts are. (Benches pay three times as much.)',
      'Your grandad and I found a Roman coin once. He swapped it for a pint and a pickled egg. Best day of his life.',
      'Here. Ken\'s old digging gloves. He\'d want you to have them. (Digging is 50% stronger.)',
    ], perks: { 3: 'Park benches pay ×3', 5: 'Digging 50% stronger' } },
  postman: { name: 'Dave the Postie', icon: '📮', likes: ['ticket', 'key', 'phone'], likeText: 'Likes: things that are lost. "Returning things is my whole job."',
    hearts: [
      'Alright! Nothing for you today. Nothing for anyone. The bag\'s just for show on Mondays.',
      'Between you and me, I read the postcards. Mrs Higgins\' sister is on a cruise. It\'s not going well.',
      'Parcels nobody claims... I\'ll pop them through your door. Don\'t tell the depot. (Dave delivers you junk.)',
      'Brian gets a parcel from SPADES R US every single week. What is he DIGGING?',
      'I\'ve been "losing" Brian\'s parcels for a week. He\'s furious. (Brian is set back.)',
    ], perks: { 3: 'Dave delivers unclaimed parcels', 5: 'Dave loses Brian\'s parcels' } },
  mum: { name: 'Kelly (and baby Tyson)', icon: '👶', likes: ['remote', 'marble', 'toycar', 'lego'], likeText: 'Likes: toys for Tyson. He eats them.',
    hearts: [
      'Hiya babe! Say hello, Tyson. He won\'t. He\'s a baby. Bless him, he\'s thick as mince.',
      'Tyson swallowed a 2p last week. We got it back. You can have it. Don\'t ask how.',
      'Little trick: put your washing on the quick cycle. Same coins, half the time. (Washing machine twice as fast.)',
      'I went to school with Brian. He was exactly the same. Even his moustache, I think.',
      'Fancy babysitting? Tyson just sleeps. Mostly. (Kelly pays you to babysit.)',
    ], perks: { 3: 'Washing machine twice as fast', 5: 'A big babysitting payday' } },
  kid: { name: 'Little Alfie', icon: '🧒', likes: ['soldier', 'toycar', 'lego', 'tamagotchi'], likeText: 'Likes: toys. ALL toys. Especially soldiers.',
    hearts: [
      'You\'re the kid with the stall! That\'s well peak, bruv. I\'ve got 4p. I\'m saving up too, innit.',
      'I\'ve got 6p now. I found 2p on the slide. Do you think I\'ll be rich?',
      'I told EVERYONE at school about your stall. (Stall customers come 25% more often.)',
      'Brian shouted at me for touching his gnome. I touched it again when he wasn\'t looking.',
      'Can I work on your stall? I\'ll guard it! Nobody nicks stuff when I\'m there. (No more thieves.)',
    ], perks: { 3: 'Stall customers +25%', 5: 'Alfie guards your stall: no thieves' } },
  jamal: { name: 'Jamal (your mate)', icon: '🛹', likes: ['toycar', 'phone', 'soldier', 'tamagotchi'], likeText: 'Likes: gadgets, toys, anything that beeps.',
    hearts: [
      'Bruv! Where\'ve you BEEN? Oh. Down the back of a sofa. Course you have.',
      'Priya reckons The Thing is a jet ski. I reckon it\'s a time machine. Either way I\'m having a go.',
      'Tip: junk sells better to collectors if it\'s rare. Don\'t flog a Roman coin to some bloke for a quid, you muppet. (Rare junk sells for 25% more.)',
      'Daz used to be alright, y\'know. Before his brother got a moped. Power went to his head.',
      'You\'re my best mate, you know that? Here, I\'ll do your stall rounds after school. (Your stall sells faster.)',
    ], perks: { 3: 'Rare junk sells for 25% more', 5: 'Jamal helps on the stall: customers come faster' } },
  priya: { name: 'Priya (your mate)', icon: '📸', likes: ['fossil', 'medal', 'pipe', 'bottle'], likeText: 'Likes: old stuff. She\'s going to be an archaeologist. "Or a pirate."',
    hearts: [
      'Oh hi! Jamal said you\'d be here. Have you found anything OLD? I need old. Old is life.',
      'I found a Roman nail last summer. My mum threw it away. I\'ve not forgiven her.',
      'Psst. Dig near the park benches. Things drop down the gaps. (Bench finds ×2.)',
      'Your grandad came to our school once and did a talk about the war. He mostly talked about biscuits.',
      'Here, I made you a map of everywhere I\'ve found coins. Don\'t tell Jamal. (Golden coins turn up more often.)',
    ], perks: { 3: 'Park benches pay double', 5: 'Golden coins appear more often' } },
  lady: { name: 'Mrs Higgins', icon: '👵', likes: ['spoon', 'ring', 'bottlecap', 'fossil'], likeText: 'Likes: shiny things and spoons. She collects spoons.',
    hearts: [
      'Och, Ken\'s grandbairn! Come here, let me look at you. You\'re wasting away, hen. Have a biscuit.',
      'I put 20p in that phone box in 1994. It never gave it back. I think about it every day.',
      'I knitted you a little coin purse. Coins seem to stick to it. (All income +5%.)',
      'Your grandad asked me to the dance in 1962. I said no. Biggest mistake of my life. Then I married Gerald.',
      'Here, take Gerald\'s old button tin. He collected buttons. I never knew why. (+20 buttons, income +10%.)',
    ], perks: { 3: 'Income +5%', 5: '+20 buttons, income +10%' } },
};

// ---------- Grandad's sticker album: a sticker for everything you find. Fill a page for a bonus ----------
LC.ALBUM_PAGES = [
  { id: 'junk', name: 'Bits and bobs', icon: '🧦', bonus: 0.05 },
  { id: 'finds', name: 'Down the hole', icon: '⛏️', bonus: 0.05 },
  { id: 'friends', name: 'Friends', icon: '🤝', bonus: 0.05 },
  { id: 'town', name: 'Things that happened', icon: '🎡', bonus: 0.05 },
  { id: 'letters', name: 'Letters from Grandad', icon: '✉️', bonus: 0.1 },
];

// ---------- Sofa Karma perk tree (bought between runs with karma from endings) ----------
LC.PERKS = [
  { id: 'headstart', icon: '💷', name: 'Head start', desc: 'Start every run with £50 under the cushion.', cost: 2 },
  { id: 'pockets', icon: '🎒', name: 'Deep pockets', desc: 'Carry 6 more bits of junk.', cost: 2 },
  { id: 'rhythm', icon: '🥁', name: 'Rhythm', desc: 'The PERFECT rummage window is bigger.', cost: 3, needs: ['headstart'] },
  { id: 'haggler', icon: '🤝', name: 'Haggler', desc: 'Everything in every shop is 10% cheaper.', cost: 3, needs: ['pockets'] },
  { id: 'friendly', icon: '😊', name: 'Friendly face', desc: 'People in town make friends twice as fast.', cost: 4, needs: ['pockets'] },
  { id: 'nemesis', icon: '😈', name: 'Brian\'s nemesis', desc: 'Brian saves 15% slower. He can feel it.', cost: 4, needs: ['rhythm'] },
  { id: 'golden', icon: '✨', name: 'Golden touch', desc: 'Golden coins turn up twice as often.', cost: 4, needs: ['haggler'] },
  { id: 'grandad', icon: '👴', name: 'Grandad\'s favourite', desc: 'Start every run with Grandad\'s grabber and a trowel.', cost: 6, needs: ['nemesis', 'golden'] },
];

// ---------- Grandad's challenges: pick one at the start of a run for extra karma ----------
LC.CHALLENGES = [
  { id: 'brianfast', icon: '🏎️', name: 'Brian\'s on a mission', desc: 'Brian saves 25% faster.', karma: 3 },
  { id: 'diy', icon: '🛠️', name: 'Do it yourself', desc: 'Helpers earn half. Your own rummaging is ×3.', karma: 2 },
  { id: 'chaos', icon: '🎪', name: 'Chaos summer', desc: 'All 15 town events, one every 7 minutes.', karma: 2 },
  { id: 'butter', icon: '🧈', name: 'Butterfingers', desc: 'Tools wear out twice as fast. You dig up twice as much junk.', karma: 2 },
  { id: 'nightowl', icon: '🦉', name: 'Night owl', desc: 'Days go twice as fast. Evenings pay double.', karma: 2 },
  { id: 'skinflint', icon: '🪙', name: 'Skinflint street', desc: 'Stall prices are 30% lower, but customers come twice as often.', karma: 2 },
];

// ---------- ending scenes, played in the world ----------
// Steps: ['pay'] pour the coins in · ['reveal', prop] sheet comes off · ['turn'] you turn round ·
// ['actor', kind, where] someone appears ('behind' you or at 'thing') · ['say', kind, line] they talk in a bubble ·
// ['narrate', line] a caption at the bottom · ['act', name] a little bit of action · ['wait', secs]
LC.ENDING_SCENES = {
  mealdeal: [
    ['pay'], ['reveal', 'mealdeal'], ['narrate', 'Under the sheet: a sandwich, a packet of crisps and a drink.'],
    ['turn'], ['actor', 'shopkeeper', 'behind'],
    ['say', 'shopkeeper', 'That\'s your meal deal, love. Took me eleven years to count all them coins.'],
    ['say', 'shopkeeper', 'Sandwich, crisps, drink. Lovely.'],
    ['say', 'shopkeeper', 'Do you want a bag? It\'s 10p.'],
    ['narrate', 'You check your pockets. You have nothing left.'],
    ['say', 'shopkeeper', 'Carry it in your hands, then.'] ],
  moon: [
    ['pay'], ['reveal', 'moon'], ['narrate', 'Under the sheet, floating in your hall... is the Moon.'],
    ['turn'], ['actor', 'nan', 'behind'],
    ['say', 'nan', 'Your grandad always said he\'d buy you the Moon one day.'],
    ['say', 'nan', 'Go on then. Have a look.'],
    ['turn'], ['act', 'moonZoom'],
    ['narrate', 'You fly up to inspect it. It\'s mostly one enormous sofa.'],
    ['narrate', 'You check down the back. 20p.'],
    ['say', 'nan', 'Here we go again, love.'] ],
  scratch: [
    ['pay'], ['reveal', 'scratch'], ['narrate', 'It\'s a scratch card. The biggest scratch card ever printed.'],
    ['turn'], ['actor', 'shopkeeper', 'behind'],
    ['say', 'shopkeeper', 'Biggest one we\'ve ever sold! Good luck, kid!'],
    ['turn'], ['narrate', 'You scratch it for three days with a 2p.'], ['act', 'scratchLose'],
    ['narrate', 'BETTER LUCK NEXT TIME.'], ['turn'],
    ['say', 'shopkeeper', 'Says on the back: "the real jackpot was the coins you found along the way."'],
    ['narrate', 'You do not find this comforting.'] ],
  piggy: [
    ['pay'], ['reveal', 'piggy'], ['narrate', 'A piggy bank big enough to hold all the money in the world.'],
    ['narrate', 'You pour every coin you have into it.'],
    ['actor', 'piggy', 'thing'],
    ['say', 'piggy', '...'],
    ['say', 'piggy', 'Oink.'],
    ['say', 'piggy', 'Thanks for the snack. I\'m off.'],
    ['act', 'piggyLeave'],
    ['narrate', 'It walks out of the front door and off into the sunset. It is not coming back.'] ],
  goose: [
    ['pay'], ['reveal', 'goose'], ['narrate', 'Under the sheet there is... nothing. Just one white feather.'],
    ['act', 'honk'], ['wait', 1], ['turn'], ['actor', 'goose', 'behind'],
    ['say', 'goose', 'HONK.'],
    ['say', 'goose', 'Yes. It was me. It has always been me.'],
    ['say', 'goose', 'The Thing. The note. Grandad\'s handwriting. All me.'],
    ['say', 'goose', 'I\'ll be taking that trillion now.'],
    ['say', 'goose', 'HONK.'] ],
  dev: [
    ['pay'], ['reveal', 'dev'], ['narrate', 'Under the sheet: a tiny room, a computer, and a sofa.'],
    ['actor', 'dev', 'thing'],
    ['say', 'dev', 'Oh. Hello. I\'m making a game about sofas.'],
    ['narrate', 'You reach down the back of the sofa.'],
    ['say', 'dev', 'Oi. Get out of my sofa.'],
    ['narrate', 'You found 20p.'] ],
  dream: [
    ['pay'], ['act', 'blur'], ['narrate', 'You pull off the sheet and the world goes blurry...'],
    ['act', 'wakeSofa'], ['actor', 'mum', 'front'],
    ['say', 'mum', 'Wake up, love. You fell asleep on the sofa again.'],
    ['say', 'mum', 'Dreaming about that goose, were you?'],
    ['narrate', 'Out of habit, you check down the back of the sofa. A trillion pounds.'],
    ['narrate', 'You put it back. You go back to sleep.'] ],
  australia: [
    ['act', 'australia'], ['narrate', 'You climb out of the hole into bright sunshine. Everything is upside down.'],
    ['actor', 'aussie', 'front'],
    ['say', 'aussie', 'G\'day! You just came out of my barbie, mate!'],
    ['say', 'aussie', 'Here, have a coin. It\'s got a kangaroo on it.'],
    ['narrate', 'You check down the back of his barbecue.'],
    ['say', 'aussie', 'Fair dinkum. 20 cents. Good on ya.'] ],
  buttons: [
    ['turn'], ['actor', 'buttonman', 'behind'],
    ['say', 'buttonman', 'You have 100 buttons.'],
    ['say', 'buttonman', 'You have done well. Buttons are the true currency.'],
    ['say', 'buttonman', 'Kneel. I crown you... the Button Baron.'],
    ['narrate', 'Your subjects are buttons. They do not do anything. You are very happy.'] ],
  brian: [
    ['act', 'knock'], ['turn'], ['actor', 'brian', 'behind'],
    ['say', 'brian', 'Afternoon. I\'ve got a cheque here for one trillion pounds.'],
    ['say', 'brian', 'Your grandad said whoever pays first gets it. So.'],
    ['turn'], ['act', 'brianPeek'],
    ['narrate', 'Brian lifts the corner of the sheet. His face goes white.'],
    ['say', 'brian', '...'],
    ['say', 'brian', 'You know what? You keep it.'],
    ['narrate', 'He leaves without another word. You never find out why.'] ],
};

// ---------- hidden ways underground. Each part of the underground has its own entrance ----------
// need = digs to break through (each dig counts 1 + your dig tool tier)
LC.DIG_SITES = {
  drain: { name: 'the sewer', spawn: 'sewer' },
  cellar: { name: 'the Roman ruins', spawn: 'roman', need: 45 },
  molehill: { name: 'the Mole Kingdom', spawn: 'mole', need: 80 },
  beach: { name: 'the pirate treasure', need: 30, treasure: true },
};
LC.SITE_LINES = {
  cellarNo: ['"Oi oi! Customers THAT side of the counter, sunshine."', '"That\'s the cellar, innit. Nothing down there. Definitely not Roman. Stop lookin\' at it."', '"STAFF ONLY. Especially you. ESPECIALLY you."'],
  cellarHint: 'Listen \'ere. You\'re my best scratchcard customer, you are. Nobody loses money like you, it\'s beautiful. So, between you and me and the gatepost... when we done the cellar, the builders hit old Roman stones. I told \'em fill it in. Proper cowboys, they were. They never. Grab a spade, my son.',
  drainNo: ['It won\'t budge. You need something to lever it up. Something crow-shaped. And bar-ish.', 'You pull with all your might. The drain wins.', 'You can hear dripping down there. And coins. Definitely coins.'],
  molehill: ['A mole pops out, looks at you, and goes back in. Rude.', 'You dig. Somewhere below, a tiny voice shouts "KNOCK FIRST!"', 'Dirt. More dirt. A mole-sized "KEEP OUT" sign.', 'The molehill is fighting back. You are winning. Just.'],
};

// ---------- warnings as Brian gets close to buying The Thing ----------
LC.BRIAN_WARNINGS = [
  { at: 0.5, icon: '💬', from: 'Mum', text: 'Brian\'s telling everyone at the shop he\'s "halfway there". He\'s bought a new calculator to celebrate. A big one.' },
  { at: 0.7, icon: '👵', from: 'Nan', text: 'Brian\'s saved a LOT, love. He keeps it in a biscuit tin on his sofa. I\'m not saying pinch it. I\'m saying it\'s a biscuit tin. On his sofa.' },
  { at: 0.85, icon: '🧒', from: 'Little Alfie', text: 'BRIAN IS NEARLY THERE!!! he was doing a little dance in his garden. prank him!!! a whoopee cushion or something!!! hurry!!!' },
  { at: 0.93, icon: '😤', from: 'Brian', text: 'Just measuring my hallway for The Thing. Thanks for keeping it warm. Don\'t take it personally. (Take it personally.)' },
  { at: 0.98, icon: '🚨', from: 'Mum', text: 'BRIAN HAS GOT HIS CHEQUEBOOK OUT. Whatever you\'re going to do, DO IT NOW.' },
];

// ---------- the dock: Captain Pete, the chippy, and Captain Gary Blackbeard IV ----------
LC.PETE = [
  'Ahoy, nipper! Captain Pete. Retired. Well, the ferry retired. Last one to the mainland was in 1987. I\'m still waitin\'. Brought sandwiches.',
  'Mind the water, matey. Captain Gary Blackbeard the Fourth runs these waters. Swim out too far and he\'ll have ye. Charges a "swimmin\' tax". Daylight robbery. Well. Seawater robbery.',
  'See that bucket? Magnet on a string. Drop it off the end and you\'ll fish up all sorts. Coins, keys, a bloke\'s false teeth once. He wanted \'em back.',
  'Your grandad and me sailed together, you know. HMS Biscuit. Smallest ship in the navy. He was the only one who could reach the top shelf.',
  'Bottles wash up on that beach all the time. Most of \'em are just bottles. Some of \'em aren\'t. Keep your eyes peeled.',
  'Gary Blackbeard\'s not a bad lad really. His mum still does his washing. Skull and crossbones, 40 degree wash.',
];
LC.PIRATE = [
  'ARRR! Ye\'ve strayed into the waters of Captain Gary Blackbeard the FOURTH! The Fourth! Me dad was the Third. He was rubbish.',
  'That\'ll be the swimmin\' tax, matey. Ten per cent. Plus VAT. Pirates pay VAT now. It\'s been a whole thing.',
  'Now back to the beach with ye, ye soggy little landlubber. And wipe yer feet!',
];
LC.CHIPS = ['Salt and vinegar, love? Course you do. You\'re not a monster.', 'Mind the seagulls. They\'re organised. They\'ve got a WhatsApp group.', 'Cod almighty, you look starving. Have a few extra chips. Go on.', 'Mushy peas are extra. Mushy peas are always extra. That\'s the law.'];
LC.BOTTLE = 'A soggy treasure map, signed "G.B. the 1st, 1962 (and Ken)". There\'s an X on the beach by the big rock, near the park end. Grandad helped bury pirate treasure?!';

// ---------- the bullies: Daz and the Dazzlers hang about by the park benches ----------
// each round: what Daz says, three comebacks, which one works
LC.BULLY_ROUNDS = [
  { daz: 'Oi! Nice trainers. Did your nan knit \'em?', replies: ['Yeah. She knitted your personality too. Out of nothing.', '...no?', 'Please don\'t tell anyone.'], good: 0 },
  { daz: 'Look who it is. Sofa Boy. So skint you check down the BACK of SOFAS.', replies: ['That\'s... fair, actually.', 'At least I\'ve got a sofa. You sit on a traffic cone.', 'How did you know?!'], good: 1 },
  { daz: 'Saw your mum in the shop. She was buying you a personality.', replies: ['Rude.', 'Did she get one? Please say she got one.', 'Shame they sold out of yours in 2009.'], good: 2 },
  { daz: 'You talk to a GOOSE. My cousin saw you.', replies: ['The goose is better company than you, Daz. And it\'s cleverer.', 'It talks back, though.', 'It was a different goose.'], good: 0 },
  { daz: 'Your hole\'s rubbish. My hole\'s way bigger.', replies: ['You don\'t have a hole.', 'Mine goes to Australia, Daz. Yours goes to "nowhere", like your career.', 'Wanna see?'], good: 1 },
];
LC.BULLY_WIN = ['...', 'That\'s actually quite good.', 'Whatever. Come on, lads. We\'ve got... a thing.', 'Bit harsh, but fair.'];
LC.BULLY_LOSE = ['HAHAHA. Tax time. Pockets.', 'Is that it? Pay up, Sofa Boy.', 'Weak. Hand it over.'];
