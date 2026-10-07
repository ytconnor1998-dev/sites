export type Platform = "youtube" | "tiktok";
export type PostStatus = "scheduled" | "uploading" | "processing" | "waiting" | "published" | "failed";

export interface Post {
  id: number;
  video_id: number;
  platform: Platform;
  scheduled_at: string;
  status: PostStatus;
  attempts: number;
  next_attempt_at: string | null;
  external_id: string | null;
  external_url: string | null;
  error: string | null;
  note: string | null;
}

export interface Video {
  id: number;
  original_name: string;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: "uploaded" | "analyzing" | "ready" | "error";
  error: string | null;
  notes: string;
  title: string;
  description: string;
  caption: string;
  hashtags: string[];
  topic: string;
  summary: string;
  created_at: string;
  posts: Post[];
}

export interface Settings {
  timezone: string;
  postTimes: string[];
  aiPicksTimes: boolean;
  platforms: Platform[];
  channelAbout: string;
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

export interface State {
  videos: Video[];
  accounts: { platform: Platform; display_name: string; avatar_url: string }[];
  settings: Settings;
  ai: boolean;
  configured: Record<Platform, boolean>;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

/** Upload one file with progress (fetch can't report upload progress). */
export function uploadFile(file: File, notes: string, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("notes", notes);
    form.append("files", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/videos");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status < 300) return resolve();
      let msg = `Upload failed (${xhr.status})`;
      try {
        msg = JSON.parse(xhr.responseText).error ?? msg;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(form);
  });
}

export const PLATFORM_NAME: Record<Platform, string> = { youtube: "YouTube", tiktok: "TikTok" };
