import type { Post, Video } from "./api.ts";

export function fmtWhen(iso: string, tz?: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toLocaleDateString(undefined, { timeZone: tz }) === b.toLocaleDateString(undefined, { timeZone: tz });
  const tomorrow = new Date(Date.now() + 86400_000);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: tz });
  if (sameDay(d, today)) return `Today ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: tz })} ${time}`;
}

export function fmtDuration(s: number | null) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
}

export function fmtSize(bytes: number) {
  return bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

/** For <input type="datetime-local">, in the browser's own timezone. */
export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function warnings(v: Video) {
  const out: string[] = [];
  if (v.duration && v.duration > 180) out.push("Over 3 minutes: YouTube won't treat it as a Short.");
  if (v.width && v.height && v.width > v.height) out.push("Landscape: Shorts and TikTok look best vertical (9:16).");
  return out;
}

export const STATUS_LABEL: Record<Post["status"], string> = {
  scheduled: "Scheduled",
  uploading: "Uploading…",
  processing: "Processing…",
  waiting: "Uploaded, goes live",
  published: "Live",
  failed: "Failed",
};

export type Bucket = "all" | "attention" | "unscheduled" | "scheduled" | "posted";

export function bucketOf(v: Video): Exclude<Bucket, "all"> {
  if (v.status === "error" || v.posts.some((p) => p.status === "failed")) return "attention";
  if (v.status !== "ready") return "unscheduled";
  if (!v.posts.length) return "unscheduled";
  if (v.posts.every((p) => p.status === "published")) return "posted";
  return "scheduled";
}
