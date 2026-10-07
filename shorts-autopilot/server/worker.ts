import path from "node:path";
import { AiRefusal, aiEnabled, writeCopyForVideo } from "./ai.ts";
import { paths } from "./config.ts";
import { db, getSettings, getVideo, now, updatePost, updateVideo, type Post, type Video } from "./db.ts";
import { extractFrames } from "./media.ts";
import { PublishError } from "./platforms/common.ts";
import { tiktokPublish, tiktokStatus } from "./platforms/tiktok.ts";
import { youtubePublish } from "./platforms/youtube.ts";

const MAX_ATTEMPTS = 4;
const YOUTUBE_UPLOAD_AHEAD_MS = 24 * 3600_000; // upload up to a day early; YouTube publishes it on time
const busy = new Set<string>();

function log(...args: unknown[]) {
  console.log(new Date().toISOString(), ...args);
}

// ── 1. The AI watches new videos ────────────────────────────────────────

async function analyzeNext() {
  const v = db.prepare(`SELECT * FROM videos WHERE status = 'uploaded' ORDER BY id LIMIT 1`).get() as Video | undefined;
  if (!v) return false;
  updateVideo(v.id, { status: "analyzing", error: null });

  if (!aiEnabled()) {
    updateVideo(v.id, {
      status: "ready",
      title: v.title || path.parse(v.original_name).name.replace(/[_-]+/g, " "),
      error: "AI is off (no ANTHROPIC_API_KEY), so the title is the file name. Edit it before posting.",
    });
    return true;
  }

  try {
    const frames = await extractFrames(v.id, path.join(paths.uploads, v.file_name), v.duration ?? 0);
    const copy = await writeCopyForVideo(v, frames, getSettings());
    // The video may have been deleted while the AI was working.
    if (!getVideo(v.id)) return true;
    updateVideo(v.id, {
      status: "ready",
      title: copy.title,
      description: copy.description,
      caption: copy.caption,
      hashtags: JSON.stringify(copy.hashtags.map((t) => t.replace(/^#+/, "").replace(/\s+/g, ""))),
      topic: copy.topic,
      summary: copy.summary,
    });
    log(`AI wrote copy for video ${v.id}: ${copy.title}`);
  } catch (e) {
    const msg = (e as Error).message;
    log(`AI failed on video ${v.id}: ${msg}`);
    if (getVideo(v.id)) updateVideo(v.id, { status: "error", error: e instanceof AiRefusal ? msg : `AI error: ${msg}` });
  }
  return true;
}

// ── 2. Posting ──────────────────────────────────────────────────────────

function fail(post: Post, e: unknown) {
  const err = e instanceof PublishError ? e : new PublishError((e as Error).message ?? String(e));
  const attempts = post.attempts + (err.limit ? 0 : 1);
  if (err.retryInMs != null && attempts < MAX_ATTEMPTS) {
    updatePost(post.id, {
      status: "scheduled",
      attempts,
      next_attempt_at: new Date(Date.now() + err.retryInMs * Math.max(1, attempts)).toISOString(),
      error: err.message,
    });
  } else {
    updatePost(post.id, { status: "failed", attempts, error: err.message });
  }
  log(`Post ${post.id} (${post.platform}) failed: ${err.message}`);
}

function duePosts(platform: "youtube" | "tiktok") {
  // Posts for an account that isn't connected yet just wait.
  if (!db.prepare(`SELECT 1 FROM accounts WHERE platform = ?`).get(platform)) return undefined;
  const horizon = new Date(Date.now() + (platform === "youtube" ? YOUTUBE_UPLOAD_AHEAD_MS : 0)).toISOString();
  return db
    .prepare(
      `SELECT p.* FROM posts p JOIN videos v ON v.id = p.video_id
       WHERE p.platform = ? AND p.status = 'scheduled' AND v.status = 'ready'
         AND p.scheduled_at <= ? AND (p.next_attempt_at IS NULL OR p.next_attempt_at <= ?)
       ORDER BY p.scheduled_at LIMIT 1`,
    )
    .get(platform, horizon, now()) as Post | undefined;
}

async function publishYoutube() {
  const s = getSettings();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { n } = db
    .prepare(`SELECT COUNT(*) AS n FROM posts WHERE platform = 'youtube' AND uploaded_at >= ?`)
    .get(since) as { n: number };
  if (n >= s.youtubeDailyLimit) return;

  const post = duePosts("youtube");
  if (!post) return;
  const video = getVideo(post.video_id)!;
  updatePost(post.id, { status: "uploading", error: null });
  try {
    const r = await youtubePublish(post, video, s);
    updatePost(post.id, {
      status: r.live ? "published" : "waiting",
      external_id: r.externalId,
      external_url: r.url,
      uploaded_at: now(),
      error: null,
    });
    log(`Uploaded video ${video.id} to YouTube (${r.url})`);
  } catch (e) {
    fail(post, e);
  }
}

async function publishTiktok() {
  const post = duePosts("tiktok");
  if (!post) return;
  const video = getVideo(post.video_id)!;
  updatePost(post.id, { status: "uploading", error: null });
  try {
    const r = await tiktokPublish(post, video, getSettings());
    updatePost(post.id, { status: "processing", external_id: r.publishId, note: r.note, uploaded_at: now(), error: null });
    log(`Sent video ${video.id} to TikTok (publish id ${r.publishId})`);
  } catch (e) {
    fail(post, e);
  }
}

/** TikTok processes uploads for a while; check how they're doing. */
async function checkTiktokProcessing() {
  const posts = db.prepare(`SELECT * FROM posts WHERE platform = 'tiktok' AND status = 'processing'`).all() as unknown as Post[];
  for (const post of posts) {
    try {
      const r = await tiktokStatus(post.external_id!);
      if (r.status === "PUBLISH_COMPLETE") {
        updatePost(post.id, { status: "published", external_id: r.postId ?? post.external_id });
      } else if (r.status === "FAILED") {
        updatePost(post.id, { status: "failed", error: `TikTok couldn't publish it: ${r.failReason ?? "unknown reason"}` });
      } else if (Date.now() - new Date(post.uploaded_at ?? post.updated_at).getTime() > 2 * 3600_000) {
        updatePost(post.id, { status: "failed", error: `TikTok was still processing after 2 hours (${r.status}). Check the TikTok app.` });
      }
    } catch (e) {
      log(`Couldn't check TikTok status for post ${post.id}: ${(e as Error).message}`);
    }
  }
}

function markYoutubeLive() {
  db.prepare(`UPDATE posts SET status = 'published', updated_at = ? WHERE platform = 'youtube' AND status = 'waiting' AND scheduled_at <= ?`).run(
    now(),
    now(),
  );
}

// ── Loop ────────────────────────────────────────────────────────────────

function once(name: string, fn: () => Promise<unknown>) {
  if (busy.has(name)) return;
  busy.add(name);
  fn()
    .catch((e) => log(`${name} crashed:`, e))
    .finally(() => busy.delete(name));
}

export function kick() {
  once("analyze", async () => {
    while (await analyzeNext());
  });
  once("youtube", publishYoutube);
  once("tiktok", publishTiktok);
  once("tiktok-status", checkTiktokProcessing);
  markYoutubeLive();
}

export function startWorker() {
  kick();
  setInterval(kick, 20_000);
}
