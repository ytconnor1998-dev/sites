import fs from "node:fs/promises";
import path from "node:path";
import { config, paths } from "../config.ts";
import type { Post, Settings, Video } from "../db.ts";
import { PublishError, accessTokenFor, hashtagLine, saveAccount, uniqueTags, type TokenSet } from "./common.ts";

// TikTok Content Posting API (Direct Post): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
const API = "https://open.tiktokapis.com/v2";
const SCOPES = ["user.info.basic", "video.publish"];
const redirectUri = () => `${config.publicUrl}/api/oauth/tiktok/callback`;

export const tiktokConfigured = () => Boolean(config.tiktok.clientKey && config.tiktok.clientSecret);

export function tiktokAuthUrl(state: string) {
  const q = new URLSearchParams({
    client_key: config.tiktok.clientKey,
    response_type: "code",
    scope: SCOPES.join(","),
    redirect_uri: redirectUri(),
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenSet & { open_id: string }> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: config.tiktok.clientKey, client_secret: config.tiktok.clientSecret, ...body }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description ?? data.error ?? `TikTok said ${res.status}`);
  return data;
}

export async function tiktokConnect(code: string) {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  const granted = String((tokens as { scope?: string }).scope ?? "");
  if (granted && !granted.includes("video.publish"))
    throw new Error("TikTok didn't grant permission to post videos. Try again and allow every permission.");
  const res = await fetch(`${API}/user/info/?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = (await res.json()).data?.user ?? {};
  saveAccount("tiktok", tokens, {
    display_name: user.display_name ?? "TikTok account",
    avatar_url: user.avatar_url ?? "",
    extra: { openId: tokens.open_id },
  });
}

const token = () => accessTokenFor("tiktok", (refresh_token) => tokenRequest({ refresh_token, grant_type: "refresh_token" }));

async function call<T>(endpoint: string, access: string, body: object): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  const code: string = json.error?.code ?? (res.ok ? "ok" : `http_${res.status}`);
  if (code !== "ok") {
    const msg = `TikTok: ${json.error?.message || code}`;
    if (code === "access_token_invalid") throw new PublishError("TikTok rejected the login. Reconnect TikTok on the Accounts page.", null);
    if (code === "spam_risk_too_many_posts" || code === "rate_limit_exceeded")
      throw new PublishError(`${msg}. Trying again later.`, 3 * 3600_000, true);
    if (code === "spam_risk_user_banned_from_posting" || code === "unaudited_client_can_only_post_to_private_accounts")
      throw new PublishError(msg, null);
    throw new PublishError(msg, res.status >= 500 || res.status === 429 ? 10 * 60_000 : null);
  }
  return json.data as T;
}

export interface CreatorInfo {
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

export async function tiktokCreatorInfo(): Promise<CreatorInfo> {
  return call<CreatorInfo>("/post/publish/creator_info/query/", await token(), {});
}

export function tiktokCaption(video: Video, s: Settings) {
  const tags = uniqueTags(JSON.parse(video.hashtags), s.alwaysHashtags);
  const text = video.caption || video.title || path.parse(video.original_name).name;
  return [text, hashtagLine(tags)].filter(Boolean).join(" ").slice(0, 2200);
}

/** TikTok wants chunks of 5-64 MB (last one up to 128 MB); files under 5 MB go in one piece. */
function chunking(size: number) {
  const MB = 1024 * 1024;
  if (size <= 64 * MB) return { chunkSize: size, count: 1 };
  const chunkSize = 10 * MB;
  return { chunkSize, count: Math.floor(size / chunkSize) };
}

/** Starts a Direct Post and uploads the file. TikTok then processes it; check with tiktokStatus. */
export async function tiktokPublish(post: Post, video: Video, s: Settings) {
  const access = await token();
  const info = await call<CreatorInfo>("/post/publish/creator_info/query/", access, {});
  if (video.duration && info.max_video_post_duration_sec && video.duration > info.max_video_post_duration_sec)
    throw new PublishError(`This video is longer than TikTok allows for your account (${info.max_video_post_duration_sec}s).`, null);

  // Use the privacy you picked in Settings if TikTok allows it for this account, otherwise the most private option.
  const options = info.privacy_level_options ?? [];
  const privacy = options.includes(s.tiktokPrivacy) ? s.tiktokPrivacy : options.includes("SELF_ONLY") ? "SELF_ONLY" : options[0];
  if (!privacy) throw new PublishError("TikTok says this account can't post right now.", null);

  const file = path.join(paths.uploads, video.file_name);
  const handle = await fs.open(file, "r");
  try {
    const size = (await handle.stat()).size;
    const { chunkSize, count } = chunking(size);

    const init = await call<{ publish_id: string; upload_url: string }>("/post/publish/video/init/", access, {
      post_info: {
        title: tiktokCaption(video, s),
        privacy_level: privacy,
        disable_comment: info.comment_disabled || !s.tiktokAllowComments,
        disable_duet: info.duet_disabled || !s.tiktokAllowDuet,
        disable_stitch: info.stitch_disabled || !s.tiktokAllowStitch,
        video_cover_timestamp_ms: 1000,
        is_aigc: s.tiktokAiGenerated,
      },
      source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunkSize, total_chunk_count: count },
    });

    for (let i = 0; i < count; i++) {
      const start = i * chunkSize;
      const end = i === count - 1 ? size - 1 : start + chunkSize - 1;
      const buf = Buffer.alloc(end - start + 1);
      await handle.read(buf, 0, buf.length, start);
      const res = await fetch(init.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(buf.length),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
        body: buf,
      });
      if (!res.ok) throw new PublishError(`TikTok upload failed at part ${i + 1}/${count} (${res.status}).`);
    }

    return {
      publishId: init.publish_id,
      note: privacy !== s.tiktokPrivacy ? `Posted as ${privacy} because TikTok doesn't allow ${s.tiktokPrivacy} for this app/account yet.` : null,
    };
  } finally {
    await handle.close();
  }
}

export async function tiktokStatus(publishId: string) {
  const data = await call<{ status: string; fail_reason?: string; publicaly_available_post_id?: (string | number)[] }>(
    "/post/publish/status/fetch/",
    await token(),
    { publish_id: publishId },
  );
  const postId = data.publicaly_available_post_id?.[0];
  return { status: data.status, failReason: data.fail_reason, postId: postId ? String(postId) : null };
}
