# Shorts Autopilot

Upload a pile of short videos once. For each one, the AI watches it and writes the title, descriptions and hashtags. It then picks a posting order and times, and the app posts each video to **YouTube Shorts** and **TikTok** at its time. You don't upload anything by hand.

Node 22 · Express · SQLite (built into Node) · React + Vite · Claude (vision) · ffmpeg

## What it does

1. **Upload.** Drag in as many videos as you want (MP4/MOV/WebM, up to 4 GB each). You can add a note for the batch ("clips from my Tokyo trip…").
2. **The AI watches each video.** ffmpeg pulls 8 frames spread through the video. Claude looks at them along with the file name and your notes, then writes:
   - a YouTube title (`#Shorts` is added for you) and description
   - a TikTok caption
   - 5–8 hashtags, plus any you've set to go on every video
   - a short topic label, used to keep similar videos apart in the schedule

   You can edit any of it, or press **Rewrite with AI** after adding a note.
3. **Auto-schedule.** One click and the AI orders your videos: strongest hooks first, similar topics spread apart, part 1 before part 2. It drops them into your daily posting times (for example 12:00, 18:00 and 21:00). If you allow it, it also picks the times. You can still move any video by hand, post one right away, or clear the schedule.
4. **Posting.**
   - **YouTube:** the video is uploaded up to 24 hours early as *private*, with a `publishAt` time. YouTube makes it public on time even if your server is down at that moment.
   - **TikTok:** the video is sent at its time through TikTok's Content Posting API. The app checks until TikTok confirms it's live.
   - Failures are retried automatically (rate limits wait and try again later). Anything that still fails shows a red **Failed** badge with the reason and a **Retry** button.

Pages: **Videos** (upload, edit, queue), **Schedule** (day-by-day list), **Accounts** (connect YouTube/TikTok), **Settings** (channel description for the AI, tone, language, timezone, posting times, platform options).

## Read this first: the platforms' limits

These rules come from Google and TikTok. No code can get around them:

| | Before approval | After approval |
| --- | --- | --- |
| **YouTube** | Uploads from a new, unaudited Google Cloud project are **locked to private**. The API quota allows about **6 uploads a day** (10,000 units; one upload costs 1,600). | Fill in the [YouTube API audit form](https://support.google.com/youtube/contact/yt_api_form). After you pass, videos can be public and you can ask for more quota there too. |
| **TikTok** | An unaudited app can only post as **"Only me"** (private), to a limited number of accounts. | Submit the app for review in the TikTok developer portal. After approval, posts can be public. |

So you can set everything up and test it today. Videos will go up private until each platform approves your app. The app tells you when it had to post something as private.

## Setup

### 1. Install and run locally

You need Node 22.13+ and ffmpeg (`brew install ffmpeg` / `apt install ffmpeg`).

```bash
cd shorts-autopilot
npm install
cp .env.example .env     # then fill it in (next steps)
npm run dev              # web on http://localhost:5173, API on :3000
```

For production: `npm run build && npm start` serves everything on port 3000.

In `.env`:

- `APP_PASSWORD`: the password you log in with.
- `SESSION_SECRET`: a long random string. It's also the key that encrypts your saved YouTube/TikTok logins, so don't change it later. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `PUBLIC_URL`: where the site lives, e.g. `https://shorts.yourdomain.com`. Use `http://localhost:5173` while developing with `npm run dev`.

### 2. AI (Claude)

Create an API key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY`. Each video costs roughly **5 cents** to analyse (8 frames plus the written copy, on Claude Opus 5.5). Auto-scheduling costs about the same per batch. To use a different model, set `AI_MODEL`.

Without a key the app still works, but titles default to the file name and you write them yourself.

### 3. Connect YouTube

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project.
2. **APIs & Services → Library**: enable **YouTube Data API v3**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type **External**. Add your own Google account under **Test users**.
   - Add the scopes `.../auth/youtube.upload` and `.../auth/youtube.readonly`.
   - When it works, press **Publish app**. In "Testing" mode Google logs you out every 7 days. As a published but unverified app you'll see a "Google hasn't verified this app" warning. That's fine for your own channel: click *Advanced → Go to…*.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**. Under **Authorized redirect URIs** add:
   `PUBLIC_URL/api/oauth/youtube/callback` (e.g. `https://shorts.yourdomain.com/api/oauth/youtube/callback`, or `http://localhost:5173/api/oauth/youtube/callback` for local dev).
5. Put the client ID and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, restart, then click **Accounts → Connect YouTube** in the app.
6. Apply for the [audit](https://support.google.com/youtube/contact/yt_api_form) so uploads can be public (see the table above).

### 4. Connect TikTok

1. Sign up at [developers.tiktok.com](https://developers.tiktok.com) and **create an app**.
2. Add the products **Login Kit** and **Content Posting API**, and turn on **Direct Post**.
3. Scopes: `user.info.basic` and `video.publish`.
4. Redirect URI: `PUBLIC_URL/api/oauth/tiktok/callback`. TikTok requires **https**, so test TikTok on your deployed site, or use a tunnel such as `cloudflared tunnel --url http://localhost:3000`, and set `PUBLIC_URL` to the tunnel address.
5. While the app is in **Sandbox**, add your TikTok account as a target user.
6. Put the Client key and secret in `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`, restart, then click **Accounts → Connect TikTok**.
7. Submit the app for review so posts can be public. TikTok's reviewers check the posting screens against their [UX guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines). The app already shows the connected creator's name and the privacy levels TikTok allows, lets you choose privacy, comments, duet and stitch, and links the Music Usage Confirmation. Expect the reviewers to ask for small changes.

## Deploying

The app has to run **all the time**: it posts on a schedule and needs a disk for your videos. That rules out Vercel/Netlify-style hosting. Good options:

- **Any small VPS** (Hetzner, DigitalOcean, about €5/month) using the included Docker setup:
  ```bash
  cp .env.example .env   # fill in, with PUBLIC_URL=https://your-domain
  docker compose up -d --build
  ```
  Put [Caddy](https://caddyserver.com) in front for automatic HTTPS (`your-domain { reverse_proxy localhost:3000 }`). If your proxy limits request size, raise the limit for uploads.
- **Railway / Render / Fly.io**: deploy the Dockerfile, attach a **persistent volume** mounted at `/data`, and set the env vars.

Your data (database, videos, thumbnails) lives in `DATA_DIR` (`./data` locally, `/data` in Docker). Back it up. Video files stay there after posting. Delete videos in the app to free space.

## How it's built

| What | Where |
| --- | --- |
| API routes, login, uploads, OAuth | `server/index.ts` |
| Database tables, settings defaults | `server/db.ts` |
| AI prompts (writing copy, planning the schedule) | `server/ai.ts` |
| Picking slots, auto-schedule | `server/scheduler.ts` |
| Background worker (AI queue, posting, retries, TikTok status checks) | `server/worker.ts` |
| YouTube upload (resumable, `publishAt`) | `server/platforms/youtube.ts` |
| TikTok Direct Post (chunked upload, status) | `server/platforms/tiktok.ts` |
| Frame grabs and thumbnails (ffmpeg) | `server/media.ts` |
| Web app | `web/src/` (`views/Library.tsx`, `Editor.tsx`, `Calendar.tsx`, `Accounts.tsx`, `Settings.tsx`) |

**Security:** a single owner password with a brute-force limit; a signed, httpOnly login cookie; YouTube/TikTok tokens encrypted with AES-256-GCM; OAuth `state` checking; videos and thumbnails only served to the logged-in owner.

**Limits of the AI:** it sees frames, not sound. If a video's point is in the voiceover, add a note (per batch or per video) so the titles get it right.
