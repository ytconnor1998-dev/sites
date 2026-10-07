import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { config, paths } from "../config.ts";
import type { Post, Settings, Video } from "../db.ts";
import { PublishError, accessTokenFor, hashtagLine, saveAccount, uniqueTags, type TokenSet } from "./common.ts";

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];
const redirectUri = () => `${config.publicUrl}/api/oauth/youtube/callback`;

export const youtubeConfigured = () => Boolean(config.google.clientId && config.google.clientSecret);

export function youtubeAuthUrl(state: string) {
  const q = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // always returns a refresh token
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.google.clientId, client_secret: config.google.clientSecret, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error ?? `Google said ${res.status}`);
  return data;
}

export async function youtubeConnect(code: string) {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!tokens.refresh_token) throw new Error("Google didn't return a refresh token. Remove the app's access at myaccount.google.com/permissions and try again.");
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) throw new Error("That Google account has no YouTube channel. Create one at youtube.com first.");
  saveAccount("youtube", tokens, {
    display_name: channel.snippet.title,
    avatar_url: channel.snippet.thumbnails?.default?.url ?? "",
    extra: { channelId: channel.id },
  });
}

const token = () => accessTokenFor("youtube", (refresh_token) => tokenRequest({ refresh_token, grant_type: "refresh_token" }));

// YouTube rejects < and > in titles and descriptions.
const clean = (s: string) => s.replace(/[<>]/g, "");

export function youtubeMetadata(video: Video, s: Settings) {
  const tags = uniqueTags(JSON.parse(video.hashtags), s.alwaysHashtags);
  let title = clean(video.title || path.parse(video.original_name).name).trim().slice(0, 100);
  if (s.addShortsTag && !/#shorts/i.test(title) && title.length + 8 <= 100) title += " #Shorts";
  const description = clean([video.description, hashtagLine(tags)].filter(Boolean).join("\n\n")).slice(0, 4900);
  // snippet.tags: max ~500 characters in total.
  const keywords: string[] = [];
  let len = 0;
  for (const t of tags) if ((len += t.length + 1) <= 480) keywords.push(t);
  return { title, description, tags: keywords };
}

/**
 * Uploads the video. If the post time is in the future YouTube holds it as private
 * and makes it public at `publishAt` itself, so this server doesn't need to be awake then.
 */
export async function youtubePublish(post: Post, video: Video, s: Settings) {
  const access = await token();
  const file = path.join(paths.uploads, video.file_name);
  const size = fs.statSync(file).size;
  const meta = youtubeMetadata(video, s);
  const goLiveLater = new Date(post.scheduled_at).getTime() > Date.now() + 5 * 60_000;

  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(size),
      "X-Upload-Content-Type": "video/*",
    },
    body: JSON.stringify({
      snippet: { title: meta.title, description: meta.description, tags: meta.tags, categoryId: s.youtubeCategoryId },
      status: {
        privacyStatus: goLiveLater ? "private" : "public",
        ...(goLiveLater ? { publishAt: new Date(post.scheduled_at).toISOString() } : {}),
        selfDeclaredMadeForKids: s.youtubeMadeForKids,
      },
    }),
  });
  if (!init.ok) throw await youtubeError(init);
  const uploadUrl = init.headers.get("location");
  if (!uploadUrl) throw new PublishError("YouTube didn't return an upload address.");

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/*", "Content-Length": String(size) },
    body: Readable.toWeb(fs.createReadStream(file)) as ReadableStream,
    duplex: "half",
  } as RequestInit);
  if (!put.ok) throw await youtubeError(put);
  const uploaded = await put.json();

  return {
    externalId: uploaded.id as string,
    url: `https://youtube.com/shorts/${uploaded.id}`,
    live: !goLiveLater,
  };
}

async function youtubeError(res: Response) {
  let reason = "";
  let message = `YouTube error ${res.status}`;
  try {
    const data = await res.json();
    reason = data.error?.errors?.[0]?.reason ?? "";
    message = data.error?.message ?? message;
  } catch {}
  if (reason === "quotaExceeded" || reason === "uploadLimitExceeded" || reason === "dailyLimitExceeded")
    return new PublishError(`YouTube's daily upload limit was reached; trying again in a few hours. (${message})`, 4 * 3600_000, true);
  if (res.status === 401) return new PublishError("YouTube rejected the login. Reconnect YouTube on the Accounts page.", null);
  if (res.status >= 500 || res.status === 429) return new PublishError(message);
  return new PublishError(message, null);
}
