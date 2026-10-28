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
  { at: 2.5, icon: '🏛️', name: 'A Roman coin', text: 'Someone in 43 AD also lost money in this garden.', reward: { mult: 0.05, junk: 'roman' } },
  { at: 6, icon: '📼', name: 'A 1994 time capsule', text: 'Contains a Tamagotchi. It is still alive. It is hungry.', reward: { cash: 120, junk: 'tamagotchi' } },
  { at: 3.5, icon: '💨', name: 'A stink bomb from 1989', text: 'Still sealed. Still potent. You know exactly whose car this is for.', reward: { item: 'stink' } },
  { at: 15, icon: '🏴‍☠️', name: "A pirate's chest", text: 'Long way inland for a pirate. Good for him.', reward: { cash: 600 } },
  { at: 40, icon: '🚽', name: "Next door's sewer pipe", text: 'Sorry, Brian.', reward: { buttons: 3 } },
  { at: 100, icon: '🦖', name: 'A fossilised £1 coin', text: 'Dinosaurs had money. That is how they could afford to be so big.', reward: { mult: 0.1 } },
  { at: 350, icon: '🅿️', name: 'An underground car park', text: 'Pay and display. You pay. You display.', reward: { cash: 1800 } },
  { at: 1000, icon: '👑', name: 'The Mole Kingdom', text: 'The Mole King knights you. Your dig speed is doubled. He gives you a tiny crown.', reward: { dig: 2, junk: 'crown' } },
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
  jogger: ['"Can\'t stop! Personal best!"', '"Found a quid on my run once. By the phone box."', '"Do you ever just... run?"', '"I\'ve been running for nine years. I don\'t know how to stop."'],
  oldman: ['"Back in my day you\'d find a pound under every park bench."', '"That fountain\'s full of wishes. Shame to waste them."', '"Your grandad and I used to go metal detecting. He never told me what he found."', '"The dog\'s called Biscuit. Biscuit is smarter than me."'],
  postman: ['"Lot of post for your Grandad lately. Big parcels. Heavy."', '"That goose bit me on Tuesday. And Wednesday."', '"Brian at number 7 gets a lot of parcels from a shop called SPADES R US."', '"Never trust a letterbox with brushes in it."'],
  mum: ['"Oh hello love! Saving up for something?"', '"The baby swallowed a 2p once. We got it back. Don\'t ask how."', '"I always leave my change in the washing. Every time."', '"Have you seen the size of the hole next door to Brian\'s?"'],
  kid: ['"I\'m saving up too. I have 4p."', '"The fountain is magic. My mate got 50p out of it."', '"Brian shouted at me for touching his gnome."', '"Do you want to swap a Lego for a button?"'],
  lady: ['"Ooh, you\'re Ken\'s grandchild aren\'t you! Lovely man. Hid money everywhere."', '"I put 20p in the phone box in 1994 and it never gave it back."', '"The pigeons round here are organised, dear. Be careful."', '"Have you tried the benches in the park?"'],
};

// ---- Tasks: a guided checklist (separate from secrets). Three show at a time, top-left. ----
// progress(s) returns a number compared against `target`. reward: { secs } = seconds of income,
// { cash } = flat £, { gen: [id, n] } = free helpers, { up: id } = free upgrade, { tool: [id, n] } = free diggers, { buttons }.
LC.TASKS = [
  { id: 't1', text: 'Rummage down the sofa 10 times', target: 10, progress: (s) => s.stats.clicks, reward: { cash: 1 }, rewardText: '£1' },
  { id: 't2', text: 'Find £1 in total', target: 1, progress: (s) => s.lifetime, reward: { gen: ['cat', 1] }, rewardText: 'A free Nosy Cat' },
  { id: 't3', text: 'Open your phone (Tab) and hire your Little Brother', target: 1, progress: (s) => s.gens.brother || 0, reward: { cash: 5 }, rewardText: '£5' },
  { id: 't4', text: 'Smash the piggy bank on the mantelpiece', target: 1, progress: (s) => s.stats.pigs, reward: { up: 'gloves' }, rewardText: 'Free Rubber Gloves' },
  { id: 't5', text: 'Dig the hole in the back garden to 1 m', target: 1, progress: (s) => s.depth, reward: { secs: 60, min: 8 }, rewardText: 'A minute of income' },
  { id: 't6', text: 'Pick up 5 coins off the floor', target: 5, progress: (s) => s.stats.floor || 0, reward: { up: 'magnet1' }, rewardText: 'Free Magnetic Trousers' },
  { id: 's1', text: 'Put some junk out on your stall in the front garden', target: 1, progress: (s) => s.stall.filter(Boolean).length + (s.stats.sold || 0), reward: { cash: 10 }, rewardText: '£10' },
  { id: 's2', text: 'Sell 3 things at your stall', target: 3, progress: (s) => s.stats.sold || 0, reward: { secs: 90, min: 15 }, rewardText: 'Ninety seconds of income' },
  { id: 't7', text: 'Read a message on your phone', target: 1, progress: (s) => Object.values(s.texts).filter((t) => t.read).length, reward: { cash: 15 }, rewardText: '£15' },
  { id: 't8', text: 'Find £100 in total', target: 100, progress: (s) => s.lifetime, reward: { gen: ['detectorist', 1] }, rewardText: 'A free Metal Detectorist' },
  { id: 't9', text: 'Buy a scratch card at the corner shop', target: 1, progress: (s) => s.stats.cards, reward: { secs: 120, min: 20 }, rewardText: 'Two minutes of income' },
  { id: 'b1', text: "Find out where Brian hides his spare key", target: 1, progress: (s) => (s.flags.hasKey ? 1 : 0), reward: { secs: 120, min: 15 }, rewardText: 'Two minutes of income' },
  { id: 'b2', text: "Sneak into Brian's house and raid his sofa 10 times", target: 10, progress: (s) => s.stats.brianSofa || 0, reward: { secs: 240 }, rewardText: 'Four minutes of income' },
  { id: 't10', text: 'Own 10 Nosy Cats', target: 10, progress: (s) => s.gens.cat || 0, reward: { secs: 180 }, rewardText: 'Three minutes of income' },
  { id: 't11', text: 'Dig to 5 m', target: 5, progress: (s) => s.depth, reward: { tool: ['gnome', 1] }, rewardText: 'A free Garden Gnome digger' },
  { id: 't12', text: 'Catch a golden coin', target: 1, progress: (s) => s.stats.golden, reward: { secs: 300 }, rewardText: 'Five minutes of income' },
  { id: 't13', text: 'Find a secret somewhere in town', target: 1, progress: (s) => s.secrets.length, reward: { buttons: 5, secs: 120 }, rewardText: '5 buttons + two minutes of income' },
  { id: 'b3', text: 'Pull a prank on Brian (find something to prank him with first)', target: 1, progress: (s) => s.stats.pranks || 0, reward: { secs: 300, buttons: 5 }, rewardText: 'Five minutes of income + 5 buttons' },
  { id: 't14', text: 'Find £10,000 in total', target: 1e4, progress: (s) => s.lifetime, reward: { gen: ['well', 1] }, rewardText: 'A free Wishing Well' },
  { id: 't15', text: 'Smash 10 piggy banks', target: 10, progress: (s) => s.stats.pigs, reward: { up: 'hammer' }, rewardText: 'Free Proper Hammer' },
  { id: 't16', text: 'Hire a Coin Pusher', target: 1, progress: (s) => s.gens.pusher || 0, reward: { secs: 600 }, rewardText: 'Ten minutes of income' },
  { id: 't17', text: 'Dig to 100 m', target: 100, progress: (s) => s.depth, reward: { secs: 600 }, rewardText: 'Ten minutes of income' },
  { id: 'b4', text: "Raid Brian's Thing Fund jar 3 times", target: 3, progress: (s) => s.stats.fundRaids || 0, reward: { secs: 900 }, rewardText: '15 minutes of income' },
  { id: 't18', text: 'Find 3 secrets', target: 3, progress: (s) => s.secrets.length, reward: { buttons: 10, secs: 900 }, rewardText: '10 buttons + 15 minutes of income' },
  { id: 't19', text: 'Find £1 million in total', target: 1e6, progress: (s) => s.lifetime, reward: { gen: ['pigeons', 2] }, rewardText: 'Two free Pigeon Syndicates' },
  { id: 's3', text: 'Sell something to The Collector', target: 1, progress: (s) => s.stats.collector || 0, reward: { secs: 900 }, rewardText: '15 minutes of income' },
  { id: 't20', text: 'Scratch 10 scratch cards', target: 10, progress: (s) => s.stats.cards, reward: { up: 'luckypen' }, rewardText: 'Free Lucky Scratching Coin' },
  { id: 't21', text: 'Dig to 1 km and meet the Mole King', target: 1000, progress: (s) => s.depth, reward: { secs: 1200 }, rewardText: '20 minutes of income' },
  { id: 'b5', text: 'Prank Brian 5 times', target: 5, progress: (s) => s.stats.pranks || 0, reward: { secs: 1200 }, rewardText: '20 minutes of income' },
  { id: 't22', text: 'Survive 25 random events', target: 25, progress: (s) => s.stats.events, reward: { secs: 1200 }, rewardText: '20 minutes of income' },
  { id: 't23', text: 'Find £1 billion in total', target: 1e9, progress: (s) => s.lifetime, reward: { gen: ['factory', 1] }, rewardText: 'A free Sofa Factory' },
  { id: 't24', text: 'Reach the centre of the Earth', target: 6371000, progress: (s) => s.depth, reward: { secs: 1800 }, rewardText: '30 minutes of income' },
  { id: 't25', text: 'Save up £1 trillion for The Thing', target: 1e12, progress: (s) => s.money, reward: { cash: 0 }, rewardText: 'Find out what it is' },
];

// ---- Junk: things you find and sell at your stall. value = seconds of income when found (min £). ----
// rarity: 1 common, 2 uncommon, 3 rare, 4 legendary (collectors pay more for 3+)
LC.JUNK = {
  remote: { icon: '📺', name: 'TV remote', value: 25, min: 0.5, rarity: 1 },
  lego: { icon: '🧱', name: 'Lego brick', value: 10, min: 0.2, rarity: 1 },
  phone: { icon: '📱', name: 'Old phone', value: 90, min: 3, rarity: 2 },
  ticket: { icon: '🎟️', name: 'Bus ticket (1987)', value: 15, min: 0.3, rarity: 1 },
  foreign: { icon: '🪙', name: 'Foreign coin', value: 20, min: 0.4, rarity: 1 },
  marble: { icon: '🔮', name: 'Marble', value: 18, min: 0.3, rarity: 1 },
  toycar: { icon: '🚗', name: 'Toy car', value: 30, min: 0.6, rarity: 1 },
  sock: { icon: '🧦', name: 'Odd sock', value: 6, min: 0.1, rarity: 1 },
  bottlecap: { icon: '🍾', name: 'Bottle cap', value: 8, min: 0.1, rarity: 1 },
  spoon: { icon: '🥄', name: 'Old spoon', value: 22, min: 0.4, rarity: 1 },
  horseshoe: { icon: '🧲', name: 'Horseshoe', value: 60, min: 1, rarity: 2 },
  pipe: { icon: '🪈', name: 'Clay pipe', value: 70, min: 1.5, rarity: 2 },
  soldier: { icon: '💂', name: 'Toy soldier', value: 55, min: 1, rarity: 2 },
  bottle: { icon: '🫙', name: 'Old glass bottle', value: 80, min: 1.5, rarity: 2 },
  key: { icon: '🗝️', name: 'Mystery key', value: 150, min: 4, rarity: 3 },
  roman: { icon: '🏛️', name: 'Roman coin', value: 400, min: 12, rarity: 3 },
  fossil: { icon: '🐚', name: 'Fossil', value: 300, min: 9, rarity: 3 },
  tamagotchi: { icon: '🥚', name: 'Tamagotchi (still alive)', value: 600, min: 20, rarity: 3 },
  medal: { icon: '🎖️', name: "Grandad's old medal", value: 900, min: 30, rarity: 4 },
  ring: { icon: '💍', name: 'Gold ring', value: 1500, min: 60, rarity: 4 },
  crown: { icon: '👑', name: 'Tiny mole crown', value: 3000, min: 120, rarity: 4 },
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
  { id: 'rucksack', icon: '🎒', name: 'Bigger rucksack', cost: 800, desc: 'Carry 24 things instead of 12.' },
  { id: 'wheelbarrow', icon: '🛒', name: 'Wheelbarrow', cost: 5e5, desc: 'Carry 48 things. Very serious.' },
];
LC.STALL_LINES = {
  browse: ['Hmm...', 'Ooh.', 'What\'s this then?', 'How much for the...', 'Interesting.', 'Is this Lego?'],
  buy: ['Lovely, I\'ll take it!', 'Bargain!', 'My nephew will love this.', 'Sold!', 'Just what I needed. Somehow.'],
  pass: ['Not today, love.', 'Bit pricey.', 'I\'ve already got one.', 'Maybe next time.', 'Is that a sock?'],
  collector: ['A RARE one! I collect these!', 'My word. Name your price.', 'This belongs in a museum. My museum.'],
};
