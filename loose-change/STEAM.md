# Shipping Loose Change on Steam

## What's already done

- **Desktop app:** `electron/` wraps the game in a window (F11 or Alt+Enter for fullscreen).
- **Steam features** through [steamworks.js](https://github.com/ceifa/steamworks.js) (MIT):
  - Achievements unlock automatically. The IDs are listed below.
  - Cloud saves: the save is mirrored to Steam Cloud, and the newest one wins on load.
  - The Steam overlay works.
- **Without Steam:** the game still runs fine, with no Steam features.
- **Builds:** the `Loose Change build` GitHub Action builds Windows, Mac and Linux. Run it from the Actions tab and download the results.
- **Local build:** `npm ci` then `npm run dist:win` (or `:mac` / `:linux`). The output goes in `dist/`.

## What you need to do

1. **Join Steamworks:** go to partner.steamgames.com, pay the Steam Direct fee (US$100 per game) and do the tax and bank forms.
2. **Create the app:** it gives you an **App ID**.
   - Put the App ID in `steam_appid.txt`, replacing `480`. (480 is Valve's test app, used for development.)
3. **Achievements:** in Steamworks, open *Stats & Achievements* and add each achievement below with exactly the same **API name**.
   - Upload an icon for each, then publish.
4. **Steam Cloud:** under *Steam Cloud*, set a byte quota (1 MB is plenty) and a file count (1).
   - The save file is called `loose-change-save.json`.
5. **Depots and builds:** make one depot per platform.
   - Upload the folders from the build (`win-unpacked`, `mac-universal`, `linux-unpacked`) with SteamPipe (the ContentBuilder in the Steamworks SDK).
   - Set the launch options:
     - Windows: `Loose Change.exe`
     - Linux: `loose-change`
     - Mac: `Loose Change.app`
6. **Store page:** add the capsule art, screenshots (use photo mode: press P, then Enter), the trailer and the description.
   - Valve asks for the store page to be live for 2 weeks before release.
7. **Mac only:** signing and notarising need an Apple Developer account (US$99 a year).
   - Leaving out the Mac build is fine for a first release.

## Licences to credit (already on the in-game Credits screen)

| Asset | Licence |
|---|---|
| three.js | MIT |
| Twemoji icons | CC-BY 4.0 (credit: Twitter, Inc. and other contributors) |
| Fredoka, Bebas Neue fonts | SIL Open Font License |
| steamworks.js | MIT |
| Electron | MIT |
| Music, sounds, 3D models, textures | Original, made in code for this game |

## Achievement API names (34)

| API name | Name | Description |
|---|---|---|
| `FIRST_PENNY` | Every Penny Counts | Find your first coin. |
| `ONE_POUND` | A Whole Pound | Find £1 in total. |
| `THOUSAND` | Thousandaire | Find £1,000 in total. |
| `MILLION` | Millionaire (In Coins) | Find £1 million in total. |
| `BILLION` | Coin-ventional Billionaire | Find £1 billion in total. |
| `CLICK_1000` | Sore Fingers | Check down the sofa 1,000 times. |
| `CATS_25` | Crazy Cat Person | Own 25 Nosy Cats. |
| `PIG_1` | Sorry, Piggy | Smash a piggy bank. |
| `PIG_50` | Pig Iron | Smash 50 piggy banks. |
| `REAL_PIG` | That Was A Real Pig | Try to smash a real pig. |
| `SCRATCH_1` | Scratchy | Scratch a scratch card. |
| `JACKPOT` | JACKPOT | Win a scratch card jackpot. |
| `ROMAN` | Time Team | Dig up a Roman coin. |
| `CORE` | Journey To The Centre | Reach the centre of the Earth. |
| `GOOSE_FRIEND` | Goose Whisperer | Befriend the goose. |
| `DEREK` | Derek | Keep Derek. |
| `GOLDEN` | Shiny! | Catch a golden coin. |
| `EVENTS_25` | What Is Even Happening | Witness 25 random events. |
| `UPSIDE` | Which Way Is Up | Get flipped by a cursed penny. |
| `PRANK_1` | Gotcha | Prank Brian. |
| `PRANK_ALL` | Neighbour From Hell | Pull every kind of prank on Brian. |
| `SNEAKY` | Sneaky | Raid Brian's sofa 25 times. |
| `CAUGHT` | Busted | Get caught in Brian's house. |
| `END_MEALDEAL` | Ending: The Meal Deal | See this ending. |
| `END_MOON` | Ending: You Bought The Moon | See this ending. |
| `END_SCRATCH` | Ending: It Was A Scratch Card | See this ending. |
| `END_PIGGY` | Ending: The Last Piggy Bank | See this ending. |
| `END_GOOSE` | Ending: The Goose Was Behind It All | See this ending. |
| `END_DEV` | Ending: The Developer's Sofa | See this ending. |
| `END_DREAM` | Ending: It Was All A Dream | See this ending. |
| `END_AUSTRALIA` | Ending: G'day | A secret ending. |
| `END_BUTTONS` | Ending: The Button Baron | A secret ending. |
| `END_BRIAN` | Ending: Brian Got It | See this ending. |
| `ALL_ENDINGS` | Seen It All | See every ending. |
