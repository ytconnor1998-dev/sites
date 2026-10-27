// Loose Change — game content. Everything you can buy, find, scratch or witness.
// Plain script (no modules) so it runs from file:// in Electron and in a browser.
const LC = (globalThis.LC = globalThis.LC || {});

LC.THING_COST = 1e15;
LC.COST_GROWTH = 1.15;

// ---- Coin finders (passive income, £ per second) ----
LC.GENERATORS = [
  { id: 'cat', icon: '🐈', name: 'Nosy Cat', cost: 0.5, income: 0.02,
    desc: 'Knocks coins off every surface. Judges you while doing it.',
    ups: ['Laser Pointer', 'Extra-Long Paws', 'Cat Flap Toll Booth', 'Second Cat (Unrelated)', 'The Cat Cartel'] },
  { id: 'brother', icon: '🧒', name: 'Little Brother', cost: 8, income: 0.2,
    desc: 'Fits down the back of the sofa. Literally.',
    ups: ['A Torch', 'An Even Smaller Brother', 'Bribed With Haribo', "Brother's Mates", 'Brother Goes Pro'] },
  { id: 'detectorist', icon: '🧓', name: 'Metal Detectorist', cost: 150, income: 2,
    desc: 'Beeps at your back garden. Socks with sandals.',
    ups: ['Fresh Batteries', 'A Louder Beep', 'Matching Fleece', 'Detectorist Club Membership', 'Beeps In His Sleep'] },
  { id: 'well', icon: '⛲', name: 'Wishing Well', cost: 3000, income: 18,
    desc: 'People throw coins in. You throw a net in.',
    ups: ['A Bigger Net', '"Make A Wish" Sign', 'Fake Rainbow', 'Wish Influencer', 'Wishes Now Cost £2'] },
  { id: 'pusher', icon: '🕹️', name: 'Coin Pusher', cost: 70000, income: 160,
    desc: 'The coins are SO close to the edge.',
    ups: ['Strategic Nudge', 'Slightly Tilted Machine', 'Seaside Location', 'Remove The Teddy', 'Infinite Edge'] },
  { id: 'pigeons', icon: '🐦', name: 'Pigeon Syndicate', cost: 1.8e6, income: 1400,
    desc: 'They collect shiny things. They want a cut.',
    ups: ['Tiny Bags', 'Pigeon Union Deal', 'Seagull Liaison Officer', 'Bread Budget', 'The Pigeon Godfather'] },
  { id: 'carboot', icon: '🚗', name: 'Car Boot Empire', cost: 5e7, income: 13000,
    desc: "Sells your old junk. Sells your neighbour's junk.",
    ups: ['Folding Table', 'Hand-Written Signs', 'Haggling Lessons', 'Sell The Car Too', 'Boot Of Infinite Holding'] },
  { id: 'mine', icon: '⛏️', name: 'Garden Mineshaft', cost: 1.5e9, income: 120000,
    desc: 'Planning permission: pending. Forever.',
    ups: ['Hard Hats', 'A Canary (Retired)', 'Gnome Labour', 'Express Lift', 'The Mine Has Its Own Mine'] },
  { id: 'factory', icon: '🛋️', name: 'Sofa Factory', cost: 5e10, income: 1.1e6,
    desc: 'Makes sofas with coins pre-installed down the back.',
    ups: ['Deeper Cushions', 'Recliner Edition', 'L-Shaped Sofas', 'Sale Ends Sunday (Every Sunday)', 'Sofa Singularity'] },
  { id: 'moon', icon: '🌙', name: 'Moon Sofa', cost: 2e12, income: 1e7,
    desc: "Turns out the Moon has a sofa. Nobody's checked it.",
    ups: ['Low-Gravity Rummaging', 'Moon Cat', 'Dark Side Cushions', 'Space Hoover', 'Moon Piggy'] },
  { id: 'multiverse', icon: '🌀', name: 'Parallel Sofas', cost: 8e13, income: 9e7,
    desc: 'Every universe has a sofa. Every sofa has 20p in it.',
    ups: ['Portal Gloves', 'Your Evil Twin Helps', 'The Universe With Bigger Coins', 'Sofa Prime', 'Infinite 20ps'] },
];
LC.GEN_UP_TIERS = [ // owned threshold -> cost multiplier of base cost; each doubles that finder
  { at: 1, mult: 10 }, { at: 10, mult: 50 }, { at: 25, mult: 500 }, { at: 50, mult: 5000 }, { at: 100, mult: 50000 },
];

// ---- Other upgrades ----
// kind: click (x mult), clickPct (adds % of income/s to each click), global (+%), piggyCap, piggyHits,
// piggyFill, luck (scratch cards), stock (scratch card stock), dig (click dig x mult)
LC.UPGRADES = [
  { id: 'gloves', icon: '🧤', name: 'Rubber Gloves', cost: 3, kind: 'click', value: 2, desc: 'Sofa crumbs no longer a concern. Clicks x2.' },
  { id: 'torch', icon: '🔦', name: 'Head Torch', cost: 120, kind: 'clickPct', value: 0.01, desc: 'Clicks also find 1% of your £/s.' },
  { id: 'hoover', icon: '🧹', name: 'Hoover Attachment', cost: 2500, kind: 'click', value: 2, desc: 'The thin nozzle. Clicks x2.' },
  { id: 'grabby', icon: '🤏', name: 'Grabby Hands Training', cost: 60000, kind: 'clickPct', value: 0.02, desc: 'Clicks find another 2% of £/s.' },
  { id: 'xray', icon: '🥽', name: 'Sofa X-Ray Goggles', cost: 3e6, kind: 'clickPct', value: 0.03, desc: 'You can see the coins. You can see everything. Clicks +3% of £/s.' },
  { id: 'bionic', icon: '🦾', name: 'Bionic Fingers', cost: 4e8, kind: 'click', value: 5, desc: 'Clicks x5. Typing is now difficult.' },
  { id: 'sock', icon: '🧦', name: 'Lucky Sock', cost: 1500, kind: 'global', value: 0.1, desc: "You've never washed it. All income +10%." },
  { id: 'fengshui', icon: '🪴', name: 'Couch Feng Shui', cost: 80000, kind: 'global', value: 0.2, desc: 'Point the sofa at the money. All income +20%.' },
  { id: 'shiny', icon: '✨', name: 'Shiny Things Theory', cost: 8e6, kind: 'global', value: 0.3, desc: 'A pigeon explained it to you. All income +30%.' },
  { id: 'accountant', icon: '🐱', name: 'Accountant (Also A Cat)', cost: 2e9, kind: 'global', value: 0.5, desc: 'Has no idea what he is doing. All income +50%.' },
  { id: 'bigpig', icon: '🐖', name: 'Bigger Pig', cost: 400, kind: 'piggyCap', value: 2, desc: 'Piggy banks hold twice as much.' },
  { id: 'hammer', icon: '🔨', name: 'Proper Hammer', cost: 2000, kind: 'piggyHits', value: 0.5, desc: 'Pigs take half as many hits.' },
  { id: 'pigfood', icon: '🌽', name: 'Premium Pig Feed', cost: 50000, kind: 'piggyFill', value: 2, desc: 'Pigs fill twice as fast. Do not ask what is in it.' },
  { id: 'hugepig', icon: '🐘', name: 'Pig The Size Of An Elephant', cost: 5e6, kind: 'piggyCap', value: 3, desc: 'Piggy banks hold 3x as much. Is it still a pig?' },
  { id: 'luckypen', icon: '🖊️', name: 'Lucky Scratching Coin', cost: 5000, kind: 'luck', value: 1, desc: 'Better scratch card odds.' },
  { id: 'shopmate', icon: '🏪', name: 'Mate At The Corner Shop', cost: 30000, kind: 'stock', value: 3, desc: 'Shop keeps 3 more cards for you.' },
  { id: 'magnet1', icon: '🧲', name: 'Magnetic Trousers', cost: 250, kind: 'magnet', value: 1.5, desc: 'Coins on the floor fly to you from further away.' },
  { id: 'magnet2', icon: '👖', name: 'Extremely Magnetic Trousers', cost: 2e6, kind: 'magnet', value: 2.5, desc: 'Coins fly to you from even further. Your keys are stuck to you.' },
  { id: 'horseshoe', icon: '🧲', name: 'Magnetic Horseshoe', cost: 5e7, kind: 'luck', value: 1, desc: 'Even better scratch card odds. Mildly cursed.' },
];

// ---- Garden digging ----
LC.DIG_TOOLS = [
  { id: 'fork', icon: '🍴', name: 'Garden Fork', cost: 15, click: 0.1, rate: 0, desc: 'Each dig goes 0.1 m deeper.' },
  { id: 'moles', icon: '🐀', name: 'Hired Mole', cost: 60, click: 0, rate: 0.15, desc: 'Digs 0.15 m/s. Paid in worms.' },
  { id: 'gnome', icon: '🧙', name: 'Garden Gnome (Awake)', cost: 5000, click: 0, rate: 2, desc: 'Digs 2 m/s. Nobody knows how long he has been awake.' },
  { id: 'digger', icon: '🚜', name: 'Mini Digger', cost: 1e6, click: 0, rate: 30, desc: 'Digs 30 m/s. Hired from a man called Steve.' },
  { id: 'badgers', icon: '🦡', name: 'Badger Cartel', cost: 5e8, click: 0, rate: 400, desc: 'Digs 400 m/s. Do not make eye contact.' },
  { id: 'tbm', icon: '🛞', name: 'Tunnel Boring Machine', cost: 2e11, click: 0, rate: 6000, desc: 'Digs 6 km/s. Named Brenda.' },
  { id: 'gran', icon: '👵', name: 'Gran With A Shovel', cost: 5e13, click: 0, rate: 90000, desc: 'Digs 90 km/s. She did this in the war.' },
];
LC.EARTH_DIAMETER = 12742000; // metres, sofa to Australia

// reward: { cash: seconds of income } | { mult: +x global } | { dig: x dig speed } | { buttons: n }
LC.DIG_FINDS = [
  { at: 0.3, icon: '🪱', name: 'A worm called Gary', text: 'Gary has seen things.', reward: { cash: 10 } },
  { at: 1, icon: '🪙', name: 'A 2p from 1971', text: "Still smells of 1971.", reward: { cash: 30 } },
  { at: 2.5, icon: '🏛️', name: 'A Roman coin', text: 'Someone in 43 AD also lost money in this garden.', reward: { mult: 0.05 } },
  { at: 6, icon: '📼', name: 'A 1994 time capsule', text: 'Contains a Tamagotchi. It is still alive. It is hungry.', reward: { cash: 120 } },
  { at: 15, icon: '🏴‍☠️', name: "A pirate's chest", text: 'Long way inland for a pirate. Good for him.', reward: { cash: 600 } },
  { at: 40, icon: '🚽', name: "Next door's sewer pipe", text: 'Sorry, Brian.', reward: { buttons: 3 } },
  { at: 100, icon: '🦖', name: 'A fossilised £1 coin', text: 'Dinosaurs had money. That is how they could afford to be so big.', reward: { mult: 0.1 } },
  { at: 350, icon: '🅿️', name: 'An underground car park', text: 'Pay and display. You pay. You display.', reward: { cash: 1800 } },
  { at: 1000, icon: '👑', name: 'The Mole Kingdom', text: 'The Mole King knights you. Your dig speed is doubled.', reward: { dig: 2 } },
  { at: 5000, icon: '🌊', name: 'An underground lake of 2ps', text: 'You go for a swim. It hurts.', reward: { cash: 3600 } },
  { at: 35000, icon: '🔥', name: 'The bottom of the crust', text: "It's warm down here. Like a sofa.", reward: { mult: 0.15 } },
  { at: 410000, icon: '🧦', name: 'Every sock you ever lost', text: 'The dryer was a portal. Of course it was.', reward: { buttons: 10 } },
  { at: 2900000, icon: '🍫', name: 'The outer core', text: "It's... a chocolate coin? The Earth is a chocolate coin.", reward: { mult: 0.5 } },
  { at: 6371000, icon: '🛋️', name: 'The exact centre of the Earth', text: 'There is a sofa here. You check down the back. 20p.', reward: { dig: 3 } },
  { at: 12742000, icon: '🦘', name: 'Australia', text: 'You have dug straight through.', reward: { ending: 'australia' } },
];

// ---- Things found when checking down the sofa ----
LC.SOFA_FINDS = [
  { text: 'a TV remote. It was here the whole time.', cash: 20 },
  { text: 'a crisp. Prawn cocktail. Vintage.', cash: 0 },
  { text: 'a bus ticket from 1987.', cash: 5 },
  { text: 'a Lego brick (stood on it first).', cash: 0 },
  { text: 'a button.', buttons: 1 },
  { text: 'another button. Where are they coming from?', buttons: 1 },
  { text: 'a fiver! An actual fiver!', flat: 5 },
  { text: "a note that says 'stop looking down here'.", cash: 0 },
  { text: 'a Werther\'s Original. Nan was here.', cash: 10 },
  { text: 'a small, confused hamster.', cash: 15 },
  { text: 'a foreign coin. Worth 0.0004p. Nice.', flat: 0.000004 },
  { text: 'a shiny thing! The pigeons will want this.', cash: 60 },
  { text: 'three buttons in a trench coat.', buttons: 3 },
  { text: 'your old phone. It has 4% battery and 400 notifications.', cash: 30 },
  { text: 'a jam sandwich. Do not eat the jam sandwich.', cash: 0 },
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
  ...['mealdeal', 'moon', 'scratch', 'piggy', 'goose', 'dev', 'dream', 'australia', 'buttons'].map((e) => ({
    id: 'END_' + e.toUpperCase(), name: 'Ending: ' + e, desc: 'See this ending.', ending: e, test: (s) => s.endings.includes(e),
  })),
  { id: 'ALL_ENDINGS', name: 'Seen It All', desc: 'See every ending.', test: (s) => LC.ENDINGS.every((e) => s.endings.includes(e.id)) },
];
for (const a of LC.ACHIEVEMENTS) {
  if (a.ending) { const e = LC.ENDINGS.find((x) => x.id === a.ending); a.name = 'Ending: ' + e.title; a.desc = e.secret ? 'A secret ending.' : 'See this ending.'; }
}
