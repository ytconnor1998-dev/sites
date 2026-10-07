import { DatabaseSync } from "node:sqlite";
import { paths } from "./config.ts";

export type Platform = "youtube" | "tiktok";
export const PLATFORMS: Platform[] = ["youtube", "tiktok"];

export type VideoStatus = "uploaded" | "analyzing" | "ready" | "error";
export type PostStatus =
  | "scheduled" // waiting for its time
  | "uploading" // being sent to the platform right now
  | "processing" // sent, platform is still processing it
  | "waiting" // on the platform, set to go public at scheduled_at (YouTube)
  | "published"
  | "failed";

export interface Video {
  id: number;
  original_name: string;
  file_name: string;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: VideoStatus;
  error: string | null;
  notes: string;
  title: string;
  description: string;
  caption: string;
  hashtags: string; // JSON array, no leading '#'
  topic: string;
  summary: string;
  created_at: string;
}

export interface Post {
  id: number;
  video_id: number;
  platform: Platform;
  scheduled_at: string; // ISO, UTC
  status: PostStatus;
  attempts: number;
  next_attempt_at: string | null;
  external_id: string | null;
  external_url: string | null;
  error: string | null;
  note: string | null;
  uploaded_at: string | null;
  updated_at: string;
}

export interface Account {
  platform: Platform;
  display_name: string;
  avatar_url: string;
  access_token: string; // encrypted
  refresh_token: string; // encrypted
  expires_at: number; // ms epoch
  extra: string; // JSON
}

export const db = new DatabaseSync(paths.db);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    duration REAL, width INTEGER, height INTEGER,
    status TEXT NOT NULL DEFAULT 'uploaded',
    error TEXT,
    notes TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    caption TEXT NOT NULL DEFAULT '',
    hashtags TEXT NOT NULL DEFAULT '[]',
    topic TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    external_id TEXT, external_url TEXT,
    error TEXT, note TEXT,
    uploaded_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (video_id, platform)
  );
  CREATE INDEX IF NOT EXISTS posts_due ON posts (status, scheduled_at);

  CREATE TABLE IF NOT EXISTS accounts (
    platform TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    extra TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// Anything that was mid-flight when the server stopped goes back in the queue.
db.exec(`UPDATE videos SET status = 'uploaded' WHERE status = 'analyzing'`);
db.exec(`UPDATE posts SET status = 'scheduled' WHERE status = 'uploading'`);

export const now = () => new Date().toISOString();

// ── Settings ────────────────────────────────────────────────────────────

export interface Settings {
  timezone: string;
  postTimes: string[]; // "HH:MM" in timezone, one post per time per day
  aiPicksTimes: boolean;
  platforms: Platform[]; // where new videos go by default
  channelAbout: string; // what the channel is about, for the AI
  tone: string;
  language: string;
  alwaysHashtags: string[];
  addShortsTag: boolean;
  youtubeCategoryId: string;
  youtubeMadeForKids: boolean;
  youtubeDailyLimit: number;
  tiktokPrivacy: string;
  tiktokAllowComments: boolean;
  tiktokAllowDuet: boolean;
  tiktokAllowStitch: boolean;
  tiktokAiGenerated: boolean;
}

export const defaultSettings: Settings = {
  timezone: "Europe/Rome",
  postTimes: ["12:00", "18:00", "21:00"],
  aiPicksTimes: false,
  platforms: ["youtube", "tiktok"],
  channelAbout: "",
  tone: "Fun, punchy, curiosity-driven",
  language: "English",
  alwaysHashtags: [],
  addShortsTag: true,
  youtubeCategoryId: "22",
  youtubeMadeForKids: false,
  youtubeDailyLimit: 6,
  tiktokPrivacy: "PUBLIC_TO_EVERYONE",
  tiktokAllowComments: true,
  tiktokAllowDuet: true,
  tiktokAllowStitch: true,
  tiktokAiGenerated: false,
};

export function getSettings(): Settings {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'main'`).get() as { value: string } | undefined;
  return { ...defaultSettings, ...(row ? JSON.parse(row.value) : {}) };
}

export function saveSettings(s: Settings) {
  db.prepare(`INSERT INTO settings (key, value) VALUES ('main', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(
    JSON.stringify(s),
  );
}

// ── Small typed helpers ─────────────────────────────────────────────────

export const getVideo = (id: number) => db.prepare(`SELECT * FROM videos WHERE id = ?`).get(id) as Video | undefined;
export const getPost = (id: number) => db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id) as Post | undefined;
export const getAccount = (p: Platform) =>
  db.prepare(`SELECT * FROM accounts WHERE platform = ?`).get(p) as Account | undefined;

export function updatePost(id: number, fields: Partial<Omit<Post, "id">>) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE posts SET ${set}, updated_at = ? WHERE id = ?`).run(
    ...(Object.values(fields) as (string | number | null)[]),
    now(),
    id,
  );
}

export function updateVideo(id: number, fields: Partial<Omit<Video, "id">>) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE videos SET ${set} WHERE id = ?`).run(...(Object.values(fields) as (string | number | null)[]), id);
}
