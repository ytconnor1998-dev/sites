import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { checkConfig, config, paths } from "./config.ts";

checkConfig();

const { aiEnabled } = await import("./ai.ts");
const { db, getSettings, getVideo, getPost, saveSettings, updateVideo, PLATFORMS, defaultSettings } = await import("./db.ts");
type Platform = import("./db.ts").Platform;
const { makeThumbnail, probe, thumbPath } = await import("./media.ts");
const { autoSchedule, setPosts, validTimes } = await import("./scheduler.ts");
const { kick, startWorker } = await import("./worker.ts");
const sec = await import("./security.ts");
const yt = await import("./platforms/youtube.ts");
const tt = await import("./platforms/tiktok.ts");
const { isValidTimezone } = await import("./time.ts");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res)).catch(next);
};
const idParam = (req: Request) => Number(req.params.id);
const isPlatform = (p: unknown): p is Platform => PLATFORMS.includes(p as Platform);

// ── Login ───────────────────────────────────────────────────────────────

app.post("/api/login", (req, res) => {
  const ip = req.ip ?? "?";
  if (!sec.loginAllowed(ip)) return res.status(429).json({ error: "Too many tries. Wait 15 minutes." });
  if (!sec.passwordMatches(String(req.body?.password ?? ""))) {
    sec.recordFailedLogin(ip);
    return res.status(401).json({ error: "Wrong password" });
  }
  sec.setCookie(res, sec.SESSION_COOKIE, sec.sealValue({ u: "owner" }, sec.SESSION_AGE), sec.SESSION_AGE);
  res.json({ ok: true });
});

app.post("/api/logout", (_req, res) => {
  res.clearCookie(sec.SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => res.json({ loggedIn: sec.isLoggedIn(req) }));

app.use(["/api", "/media"], sec.requireLogin);

// ── Everything the dashboard shows ──────────────────────────────────────

app.get("/api/state", (_req, res) => {
  const videos = db.prepare(`SELECT * FROM videos ORDER BY id DESC`).all() as unknown as import("./db.ts").Video[];
  const posts = db.prepare(`SELECT * FROM posts`).all() as unknown as import("./db.ts").Post[];
  const accounts = db.prepare(`SELECT platform, display_name, avatar_url FROM accounts`).all();
  res.json({
    videos: videos.map((v) => ({
      ...v,
      file_name: undefined,
      hashtags: JSON.parse(v.hashtags),
      posts: posts.filter((p) => p.video_id === v.id),
    })),
    accounts,
    settings: getSettings(),
    ai: aiEnabled(),
    configured: { youtube: yt.youtubeConfigured(), tiktok: tt.tiktokConfigured() },
  });
});

// ── Uploading videos ────────────────────────────────────────────────────

const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi", ".3gp"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: paths.uploads,
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 4 * 1024 ** 3, files: 50 },
  fileFilter: (_req, file, cb) => cb(null, VIDEO_EXT.has(path.extname(file.originalname).toLowerCase())),
});

app.post(
  "/api/videos",
  upload.array("files"),
  h(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) return res.status(400).json({ error: "No video files received (mp4, mov, webm…)." });
    const notes = String(req.body?.notes ?? "").slice(0, 2000);
    const created: number[] = [];
    for (const f of files) {
      let info = { duration: 0, width: 0, height: 0 };
      try {
        info = await probe(f.path);
      } catch {
        fs.rmSync(f.path, { force: true });
        continue; // not a readable video
      }
      const r = db
        .prepare(
          `INSERT INTO videos (original_name, file_name, size, duration, width, height, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(f.originalname.slice(0, 200), f.filename, f.size, info.duration, info.width, info.height, notes);
      const id = Number(r.lastInsertRowid);
      created.push(id);
      await makeThumbnail(id, f.path, info.duration).catch(() => {});
    }
    kick();
    if (!created.length) return res.status(400).json({ error: "Those files couldn't be read as videos." });
    res.json({ created });
  }),
);

const VideoEdit = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(4500).optional(),
  caption: z.string().max(2000).optional(),
  hashtags: z.array(z.string().max(100)).max(30).optional(),
  notes: z.string().max(2000).optional(),
});

app.patch(
  "/api/videos/:id",
  h((req, res) => {
    const v = getVideo(idParam(req));
    if (!v) return res.status(404).json({ error: "Not found" });
    const body = VideoEdit.parse(req.body);
    const { hashtags, ...rest } = body;
    updateVideo(v.id, {
      ...rest,
      ...(hashtags ? { hashtags: JSON.stringify(hashtags.map((t) => t.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean)) } : {}),
      // Writing a title by hand makes a video that the AI couldn't handle ready to post.
      ...(v.status === "error" && (body.title ?? v.title) ? { status: "ready", error: null } : {}),
    });
    res.json({ ok: true });
  }),
);

app.post(
  "/api/videos/:id/analyze",
  h((req, res) => {
    const v = getVideo(idParam(req));
    if (!v) return res.status(404).json({ error: "Not found" });
    if (v.status === "analyzing") return res.json({ ok: true });
    const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 2000) : v.notes;
    updateVideo(v.id, { status: "uploaded", error: null, notes });
    kick();
    res.json({ ok: true });
  }),
);

app.delete(
  "/api/videos/:id",
  h((req, res) => {
    const v = getVideo(idParam(req));
    if (!v) return res.status(404).json({ error: "Not found" });
    const busy = db.prepare(`SELECT 1 FROM posts WHERE video_id = ? AND status = 'uploading'`).get(v.id);
    if (busy) return res.status(409).json({ error: "It's uploading right now. Try again in a minute." });
    db.prepare(`DELETE FROM videos WHERE id = ?`).run(v.id);
    fs.rmSync(path.join(paths.uploads, v.file_name), { force: true });
    fs.rmSync(thumbPath(v.id), { force: true });
    res.json({ ok: true });
  }),
);

// ── Scheduling ──────────────────────────────────────────────────────────

const ScheduleBody = z.object({
  platforms: z.array(z.enum(["youtube", "tiktok"])).min(1),
  at: z.string().datetime({ offset: true }).nullable(), // null = post now
});

app.post(
  "/api/videos/:id/schedule",
  h((req, res) => {
    const v = getVideo(idParam(req));
    if (!v) return res.status(404).json({ error: "Not found" });
    if (v.status !== "ready") return res.status(400).json({ error: "Wait until the video has a title." });
    const body = ScheduleBody.parse(req.body);
    const at = body.at ? new Date(body.at) : new Date();
    setPosts(v.id, body.platforms, at.toISOString());
    // Platforms that were unticked lose their pending post.
    db.prepare(
      `DELETE FROM posts WHERE video_id = ? AND status IN ('scheduled','failed') AND platform NOT IN (${body.platforms.map(() => "?").join(",")})`,
    ).run(v.id, ...body.platforms);
    kick();
    res.json({ ok: true });
  }),
);

app.delete(
  "/api/videos/:id/schedule",
  h((req, res) => {
    db.prepare(`DELETE FROM posts WHERE video_id = ? AND status IN ('scheduled','failed')`).run(idParam(req));
    res.json({ ok: true });
  }),
);

app.post(
  "/api/schedule/auto",
  h(async (req, res) => {
    res.json(await autoSchedule(req.body?.useAi !== false));
  }),
);

app.post(
  "/api/schedule/clear",
  h((_req, res) => {
    const r = db.prepare(`DELETE FROM posts WHERE status = 'scheduled'`).run();
    res.json({ removed: Number(r.changes) });
  }),
);

app.post(
  "/api/posts/:id/retry",
  h((req, res) => {
    const p = getPost(idParam(req));
    if (!p || p.status !== "failed") return res.status(400).json({ error: "Only failed posts can be retried." });
    db.prepare(
      `UPDATE posts SET status = 'scheduled', attempts = 0, next_attempt_at = NULL, error = NULL,
         scheduled_at = CASE WHEN scheduled_at < ? THEN ? ELSE scheduled_at END WHERE id = ?`,
    ).run(new Date().toISOString(), new Date().toISOString(), p.id);
    kick();
    res.json({ ok: true });
  }),
);

// ── Settings ────────────────────────────────────────────────────────────

const SettingsBody = z.object({
  timezone: z.string().refine(isValidTimezone, "Unknown timezone"),
  postTimes: z.array(z.string()).max(24),
  aiPicksTimes: z.boolean(),
  platforms: z.array(z.enum(["youtube", "tiktok"])),
  channelAbout: z.string().max(2000),
  tone: z.string().max(300),
  language: z.string().max(60),
  alwaysHashtags: z.array(z.string().max(60)).max(20),
  addShortsTag: z.boolean(),
  youtubeCategoryId: z.string().regex(/^\d{1,3}$/),
  youtubeMadeForKids: z.boolean(),
  youtubeDailyLimit: z.number().int().min(1).max(100),
  tiktokPrivacy: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]),
  tiktokAllowComments: z.boolean(),
  tiktokAllowDuet: z.boolean(),
  tiktokAllowStitch: z.boolean(),
  tiktokAiGenerated: z.boolean(),
});

app.put(
  "/api/settings",
  h((req, res) => {
    const s = SettingsBody.parse({ ...defaultSettings, ...req.body });
    s.postTimes = validTimes(s.postTimes);
    s.alwaysHashtags = s.alwaysHashtags.map((t) => t.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean);
    saveSettings(s);
    res.json(s);
  }),
);

app.get(
  "/api/tiktok/creator",
  h(async (_req, res) => {
    res.json(await tt.tiktokCreatorInfo());
  }),
);

// ── Connecting YouTube and TikTok ───────────────────────────────────────

const OAUTH_COOKIE = "sa_oauth";

app.get("/api/oauth/:platform/start", (req, res) => {
  const p = req.params.platform;
  if (!isPlatform(p)) return res.status(404).end();
  if (p === "youtube" ? !yt.youtubeConfigured() : !tt.tiktokConfigured())
    return res.redirect(`/#/accounts?error=${encodeURIComponent(`${p} keys are missing from .env`)}`);
  const state = crypto.randomBytes(16).toString("hex");
  sec.setCookie(res, OAUTH_COOKIE, sec.sealValue({ state, p }, 10 * 60_000), 10 * 60_000);
  res.redirect(p === "youtube" ? yt.youtubeAuthUrl(state) : tt.tiktokAuthUrl(state));
});

app.get(
  "/api/oauth/:platform/callback",
  h(async (req, res) => {
    const p = req.params.platform;
    const saved = sec.openValue<{ state: string; p: string }>(sec.readCookie(req, OAUTH_COOKIE));
    res.clearCookie(OAUTH_COOKIE, { path: "/" });
    const back = (q: string) => res.redirect(`/#/accounts?${q}`);
    if (req.query.error) return back(`error=${encodeURIComponent(String(req.query.error_description ?? req.query.error))}`);
    if (!saved || saved.p !== p || saved.state !== req.query.state) return back("error=Login+expired%2C+try+again");
    try {
      if (p === "youtube") await yt.youtubeConnect(String(req.query.code));
      else if (p === "tiktok") await tt.tiktokConnect(String(req.query.code));
      else return res.status(404).end();
      kick();
      back(`connected=${p}`);
    } catch (e) {
      back(`error=${encodeURIComponent((e as Error).message)}`);
    }
  }),
);

app.delete(
  "/api/accounts/:platform",
  h((req, res) => {
    db.prepare(`DELETE FROM accounts WHERE platform = ?`).run(String(req.params.platform));
    res.json({ ok: true });
  }),
);

// ── Media (logged-in only) ──────────────────────────────────────────────

app.get("/media/thumbs/:id", (req, res) => {
  const file = thumbPath(idParam(req));
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file, { maxAge: "1h" });
});

app.get("/media/videos/:id", (req, res) => {
  const v = getVideo(idParam(req));
  if (!v) return res.status(404).end();
  res.sendFile(path.join(paths.uploads, v.file_name)); // supports range requests for seeking
});

// ── The web app ─────────────────────────────────────────────────────────

const dist = path.resolve("dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api|media).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: err.issues.map((i) => i.message).join("; ") });
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: (err as Error).message ?? "Something went wrong" });
});

app.listen(config.port, () => {
  console.log(`Shorts Autopilot running on ${config.publicUrl} (port ${config.port})`);
  startWorker();
});
