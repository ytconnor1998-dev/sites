import { useEffect, useState } from "react";
import { api, PLATFORM_NAME, type Platform } from "../api.ts";
import type { ViewProps } from "../App.tsx";

interface CreatorInfo {
  creator_nickname: string;
  privacy_level_options: string[];
  max_video_post_duration_sec: number;
}

const HELP: Record<Platform, string> = {
  youtube: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env (see README → Connect YouTube).",
  tiktok: "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to your .env (see README → Connect TikTok).",
};

export function Accounts({ state, refresh, notify, query }: ViewProps & { query: URLSearchParams }) {
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const tiktok = state.accounts.find((a) => a.platform === "tiktok");

  useEffect(() => {
    const err = query.get("error");
    const ok = query.get("connected");
    if (err) notify(err, true);
    if (ok) notify(`${PLATFORM_NAME[ok as Platform] ?? ok} connected.`);
    if (err || ok) history.replaceState(null, "", "#/accounts");
  }, []);

  useEffect(() => {
    if (tiktok) api<CreatorInfo>("/api/tiktok/creator").then(setCreator).catch(() => setCreator(null));
  }, [tiktok?.display_name]);

  return (
    <>
      <h2>Accounts</h2>
      <p className="muted">Connect once. Videos are then posted straight to these accounts, no manual uploading.</p>
      <div className="accounts">
        {(["youtube", "tiktok"] as const).map((p) => {
          const acc = state.accounts.find((a) => a.platform === p);
          return (
            <div key={p} className={`card account ${p}`}>
              <div className="account-head">
                <span className={`logo ${p}`} aria-hidden>
                  {p === "youtube" ? "▶" : "♪"}
                </span>
                <div>
                  <h3>{PLATFORM_NAME[p]}</h3>
                  {acc ? (
                    <p className="ok small">
                      Connected as <strong>{acc.display_name}</strong>
                    </p>
                  ) : (
                    <p className="muted small">Not connected</p>
                  )}
                </div>
                {acc?.avatar_url && <img className="avatar" src={acc.avatar_url} alt="" referrerPolicy="no-referrer" />}
              </div>
              {p === "tiktok" && acc && creator && (
                <p className="small muted">
                  Posting as @{creator.creator_nickname}. Allowed privacy: {creator.privacy_level_options.join(", ").toLowerCase().replaceAll("_", " ")}.
                  Max length {creator.max_video_post_duration_sec}s.
                </p>
              )}
              {!state.configured[p] ? (
                <p className="warn small">{HELP[p]}</p>
              ) : (
                <div className="row">
                  <a className="button primary" href={`/api/oauth/${p}/start`}>
                    {acc ? "Reconnect" : `Connect ${PLATFORM_NAME[p]}`}
                  </a>
                  {acc && (
                    <button
                      className="ghost"
                      onClick={async () => {
                        if (!confirm(`Disconnect ${PLATFORM_NAME[p]}? Scheduled posts there will wait until you reconnect.`)) return;
                        await api(`/api/accounts/${p}`, "DELETE");
                        await refresh();
                      }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted small">
        By posting through this app you agree to TikTok's{" "}
        <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">
          Music Usage Confirmation
        </a>{" "}
        and YouTube's{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          Terms of Service
        </a>
        .
      </p>
    </>
  );
}
