# Loose Change — design

A first-person, single-player incremental game (co-op possible later). First ending in about 2 to 2.5 hours.

## The pitch

It's the summer holidays. You're a kid. A huge **Thing** under a dust sheet has turned up in the hallway with a note from Grandad:
*"It's yours when you can pay for it. £1,000,000,000,000. No peeking. Love, Grandad."*

You have 0p. Brian next door says Grandad promised it to *him*, and he's saving up too.

So you check down the back of the sofa.

## What makes it more than "number goes up"

| Layer | What it is | Why it's fun |
|---|---|---|
| **Mystery** | The Thing reacts as you save: it hums, twitches and the sheet slips. Grandad's 12 letters are hidden around the world and tell the story. | A reason to explore and keep going |
| **Places** | The house and the neighbourhood unlock one by one, each with its own activity | Always something new around the corner |
| **Jobs list** | Short goals ("Smash 3 piggy banks") that unlock places and tools | Clear direction, steady pacing |
| **Tools in hand** | Tiers and durability for each activity, held in first person | Feels physical. Upgrades you can see and feel |
| **Junk** | A second resource found everywhere, sold at your stand outside the house | Choices: sell now, or keep for gadgets |
| **Helpers** | Hired on your phone, they appear in the world and work at stations | The world fills up as you grow |
| **Rival** | Brian is racing you to The Thing. He sabotages you, you prank him back | Tension, comedy, a villain |
| **Chaos** | Random events, golden coins, the goose, visitors | Surprises |
| **Endings** | Random funny endings, secret endings, and Brian's "bad" ending. Each one found boosts the next run | Replay and collecting |

## Places and activities

| # | Place | Activity | Unlocked by |
|---|---|---|---|
| 1 | Living room | **Sofa**: rummage. Hands, then grabber, then hoover, then X-ray goggles | Start |
| 2 | Kitchen | **Mum's change jar** (refills over time), **washing machine** (load clothes, run a cycle, coins come out of the pockets) | Job: hire your first helper |
| 3 | Back garden | **The hole**: dig. Spoon, then trowel, then spade, then drill. Treasure at set depths. Shed for diggers | Job: do a load of washing |
| 4 | Front of the house | **Your stand**: put junk out, set a price (cheap, fair or cheeky), and passers-by buy it | Job: dig to 1 m |
| 5 | Street and corner shop | **Scratch cards**, **tools and gadgets** counter | Job: sell 5 bits of junk |
| 6 | Loft | **Piggy bank collection**: smash them. Toy hammer, then hammer, then sledgehammer, then dynamite. Grandad's boxes | Job: buy a hammer |
| 7 | Brian's garden and house | **Sneak** onto his sofa while he isn't looking. Plant pranks | Job: smash 5 piggy banks |
| 8 | Seaside arcade (bus stop) | **Coin pusher** you play yourself | Later jobs |
| 9 | The Moon | Moon sofa | Late game |

## Tools

Every activity has a tool you hold. Better tools find more per use. Tools wear out: when one breaks you drop back to the previous tier until you repair it at the shed bench, which is cheap. Upgrades also add durability.

## Brian (the rival)

- His progress towards The Thing shows on the HUD.
- He gains steadily, rubber-banded to your progress so the race stays close.
- He sends the goose after you, blocks your stand, and digs a rival hole.
- **Pranks** (bought from the shop) slow him down: a whoopee cushion on his sofa, the goose released into his garden, glitter in his post.
- If Brian reaches 100% first, you get the **Brian ending**: you lose, but it's funny, and it still counts as an ending.

## Voice

- **Babble voices** (gibberish synthesised in code, with a different voice for each character) and subtitles for everyone.
- **Narrator**: a dry British voice. Lines live in `src/voice.js` with IDs. Drop recorded files in `src/assets/voice/<id>.ogg` and they play automatically. Without them, the line shows as a subtitle with a soft babble.

## Look

Our own style: a cosy British house and neighbourhood with a warm, moody late-afternoon light (glowing lamps, soft haze, long shadows), human-style characters, a cartoony HUD and menus (chunky rounded cream boxes, Fredoka font, gold money), and tools held in first person.

## Upgrades (already in)

About 75: five tiers per helper (each doubles it), plus sofa, piggy bank, scratch card luck, shop stock, coin magnet and all-income upgrades. Tools add tiers on top.

## Idea bank (to pick from after play-testing)

- **Chores for pocket money**: Mum's chore list (tidy your room, wash the car, walk the dog). Quick tasks for coins.
- **Day and evening**: a short in-game day. Customers come to the stand in the daytime. Foxes and odd events happen in the evening. Mum calls you in at bedtime, and you get a dream bonus.
- **Weather**: sunny means more customers, rain brings worms up for fishing, and storms bring coin rain.
- **Metal detector gadget**: hold it and follow the beeps (hot or cold) to buried coins in the garden and the park.
- **The park**: a duck pond with a wishing fountain, and lost things under benches.
- **The tooth fairy**: eat toffee, lose a tooth, find coins under your pillow. Limited per day.
- **Can recycling**: 10p a can. Collect them around the street.
- **Museum shelf** in your bedroom: put your rarest finds on display for permanent bonuses. A collection book of everything you can find.
- **Grandad's sticker album**: complete a page for a bonus.
- **Bike**: unlocks faster travel around the neighbourhood.
- **Lemonade at the stand**: make it from lemons in the kitchen. Brian makes worse lemonade.
- **Ice cream van**: chase it for buffs.
- **Perk tree after an ending**: spend Sofa Karma on permanent perks instead of a flat bonus.
- **Photo mode** and a **speedrun timer** for Steam players.
- **Co-op** later: friends join as your cousins.

## Build phases

1. **Look and feel:** glow, grain, tools in hand, kid camera height, new HUD. Jobs list, locked areas, tool tiers and durability. Kitchen, loft, stand and junk.
2. **Story and rival:** Brian and pranks, Grandad's letters, The Thing reacting, voices.
3. **Extra places:** the arcade and the Moon.
4. **Ship:** balance to 2 to 2.5 hours with `tools/sim.js`, Electron desktop build, Steam achievements and cloud saves.
