import { db, getAccount, type Platform } from "../db.ts";
import { decrypt, encrypt } from "../security.ts";

/**
 * An upload failure. `retryInMs` set = worth trying again later.
 * `limit` = a platform rate limit, which doesn't count towards the retry cap.
 */
export class PublishError extends Error {
  constructor(message: string, public retryInMs: number | null = 10 * 60_000, public limit = false) {
    super(message);
  }
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export function saveAccount(
  platform: Platform,
  tokens: TokenSet,
  profile: { display_name: string; avatar_url: string; extra?: object },
) {
  db.prepare(
    `INSERT INTO accounts (platform, display_name, avatar_url, access_token, refresh_token, expires_at, extra)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(platform) DO UPDATE SET display_name = excluded.display_name, avatar_url = excluded.avatar_url,
       access_token = excluded.access_token, refresh_token = excluded.refresh_token,
       expires_at = excluded.expires_at, extra = excluded.extra`,
  ).run(
    platform,
    profile.display_name,
    profile.avatar_url,
    encrypt(tokens.access_token),
    encrypt(tokens.refresh_token),
    Date.now() + tokens.expires_in * 1000,
    JSON.stringify(profile.extra ?? {}),
  );
}

/**
 * A working access token, refreshing it first if it's about to expire.
 * `refresh` gets the stored refresh token and returns a new token set.
 */
export async function accessTokenFor(
  platform: Platform,
  refresh: (refreshToken: string) => Promise<TokenSet>,
): Promise<string> {
  const acc = getAccount(platform);
  if (!acc) throw new PublishError(`${platform === "youtube" ? "YouTube" : "TikTok"} isn't connected. Connect it on the Accounts page.`, null);
  if (acc.expires_at - Date.now() > 5 * 60_000) return decrypt(acc.access_token);

  let fresh: TokenSet;
  try {
    fresh = await refresh(decrypt(acc.refresh_token));
  } catch (e) {
    throw new PublishError(
      `Your ${platform === "youtube" ? "YouTube" : "TikTok"} login has expired. Reconnect it on the Accounts page. (${(e as Error).message})`,
      null,
    );
  }
  db.prepare(`UPDATE accounts SET access_token = ?, refresh_token = ?, expires_at = ? WHERE platform = ?`).run(
    encrypt(fresh.access_token),
    encrypt(fresh.refresh_token || decrypt(acc.refresh_token)),
    Date.now() + fresh.expires_in * 1000,
    platform,
  );
  return fresh.access_token;
}

export function hashtagLine(tags: string[]) {
  return tags.map((t) => `#${t.replace(/^#+/, "").replace(/\s+/g, "")}`).filter((t) => t.length > 1).join(" ");
}

export function uniqueTags(...lists: string[][]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of lists.flat()) {
    const clean = t.replace(/^#+/, "").replace(/\s+/g, "");
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      out.push(clean);
    }
  }
  return out;
}
