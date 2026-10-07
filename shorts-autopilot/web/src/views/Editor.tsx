import { useEffect, useRef, useState } from "react";
import { api, PLATFORM_NAME, type Platform, type State, type Video } from "../api.ts";
import { fmtDuration, fmtSize, fmtWhen, STATUS_LABEL, toLocalInput, warnings } from "../util.ts";

interface Props {
  video: Video;
  state: State;
  refresh: () => Promise<void>;
  notify: (t: string, bad?: boolean) => void;
  onClose: () => void;
}

export function Editor({ video: v, state, refresh, notify, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(v.title);
  const [description, setDescription] = useState(v.description);
  const [caption, setCaption] = useState(v.caption);
  const [tags, setTags] = useState(v.hashtags.map((t) => `#${t}`).join(" "));
  const [notes, setNotes] = useState(v.notes);
  const pending = v.posts.filter((p) => p.status === "scheduled" || p.status === "failed");
  const [platforms, setPlatforms] = useState<Platform[]>(pending.length ? pending.map((p) => p.platform) : state.settings.platforms);
  const [when, setWhen] = useState(toLocalInput(pending[0]?.scheduled_at ?? new Date(Date.now() + 3600_000).toISOString()));
  const [busy, setBusy] = useState(false);

  // When the AI finishes while the editor is open, show its text.
  useEffect(() => {
    setTitle(v.title);
    setDescription(v.description);
    setCaption(v.caption);
    setTags(v.hashtags.map((t) => `#${t}`).join(" "));
  }, [v.title, v.description, v.caption, v.hashtags.join(" ")]);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const dirty =
    title !== v.title || description !== v.description || caption !== v.caption || notes !== v.notes ||
    tags !== v.hashtags.map((t) => `#${t}`).join(" ");
  const thinking = v.status === "uploaded" || v.status === "analyzing";
  const locked = v.posts.filter((p) => !["scheduled", "failed"].includes(p.status)).map((p) => p.platform);

  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (done) notify(done);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    api(`/api/videos/${v.id}`, "PATCH", {
      title: title.trim(),
      description,
      caption,
      notes,
      hashtags: tags.split(/[\s,]+/).map((t) => t.replace(/^#+/, "")).filter(Boolean),
    });

  const schedule = (at: string | null) =>
    run(async () => {
      if (dirty) await save();
      const usable = platforms.filter((p) => !locked.includes(p));
      if (!usable.length) throw new Error("Pick at least one platform that hasn't been posted to yet.");
      await api(`/api/videos/${v.id}/schedule`, "POST", { platforms: usable, at });
    }, at ? "Scheduled." : "Posting now…");

  return (
    <dialog ref={dialog} className="editor" onClose={onClose} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
      <div className="editor-inner">
        <div className="editor-media">
          <video src={`/media/videos/${v.id}`} poster={`/media/thumbs/${v.id}`} controls playsInline preload="metadata" />
          <p className="muted small">
            {v.original_name} · {fmtDuration(v.duration)} · {v.width}×{v.height} · {fmtSize(v.size)}
          </p>
          {warnings(v).map((w) => (
            <p key={w} className="warn small">
              {w}
            </p>
          ))}
          {v.summary && (
            <p className="small">
              <strong>What the AI saw:</strong> {v.summary}
            </p>
          )}
        </div>

        <div className="editor-form">
          <div className="editor-head">
            <h2>{thinking ? "AI is watching this video…" : "Title, captions & hashtags"}</h2>
            <button className="ghost small" onClick={() => dialog.current?.close()} aria-label="Close">
              ✕
            </button>
          </div>
          {v.status === "error" && <p className="error">{v.error}</p>}

          <label>
            Title <span className="muted">(YouTube)</span>
            <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} disabled={thinking} />
            <span className="counter">{title.length}/100{state.settings.addShortsTag ? " · #Shorts is added automatically" : ""}</span>
          </label>
          <label>
            YouTube description
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={thinking} />
          </label>
          <label>
            TikTok caption
            <textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} disabled={thinking} />
          </label>
          <label>
            Hashtags <span className="muted">(added to both)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} disabled={thinking} />
          </label>
          <label>
            Notes for the AI
            <textarea
              rows={2}
              placeholder="e.g. This is part 2 of my gym series. Mention the giveaway."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <div className="row">
            <button className="primary" disabled={busy || !dirty || thinking} onClick={() => run(save, "Saved.")}>
              Save changes
            </button>
            <button
              className="ghost"
              disabled={busy || thinking || !state.ai}
              onClick={() => run(() => api(`/api/videos/${v.id}/analyze`, "POST", { notes }), "The AI is re-watching it.")}
            >
              ✨ Rewrite with AI
            </button>
          </div>

          <hr />

          <h3>Posting</h3>
          {v.posts.length > 0 && (
            <ul className="post-list">
              {v.posts.map((p) => (
                <li key={p.id}>
                  <span className={`chip ${p.platform} st-${p.status}`}>{PLATFORM_NAME[p.platform]}</span>
                  <span>
                    {STATUS_LABEL[p.status]} {p.status !== "published" && fmtWhen(p.scheduled_at, state.settings.timezone)}
                    {p.external_url && (
                      <>
                        {" · "}
                        <a href={p.external_url} target="_blank" rel="noreferrer">
                          Open ↗
                        </a>
                      </>
                    )}
                  </span>
                  {p.status === "failed" && (
                    <button className="link" disabled={busy} onClick={() => run(() => api(`/api/posts/${p.id}/retry`, "POST"), "Trying again.")}>
                      Retry
                    </button>
                  )}
                  {(p.error || p.note) && <p className={`small ${p.error ? "error" : "muted"}`}>{p.error ?? p.note}</p>}
                </li>
              ))}
            </ul>
          )}

          <fieldset className="row" disabled={thinking || v.status !== "ready"}>
            {(["youtube", "tiktok"] as const).map((p) => (
              <label key={p} className="check">
                <input
                  type="checkbox"
                  checked={platforms.includes(p)}
                  disabled={locked.includes(p)}
                  onChange={(e) => setPlatforms((cur) => (e.target.checked ? [...cur, p] : cur.filter((x) => x !== p)))}
                />
                {PLATFORM_NAME[p]}
              </label>
            ))}
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Post time (your time)" />
          </fieldset>
          <div className="row">
            <button className="primary" disabled={busy || thinking || v.status !== "ready" || !when} onClick={() => schedule(new Date(when).toISOString())}>
              {pending.length ? "Reschedule" : "Schedule"}
            </button>
            <button className="ghost" disabled={busy || thinking || v.status !== "ready"} onClick={() => schedule(null)}>
              Post now
            </button>
            {pending.length > 0 && (
              <button className="ghost" disabled={busy} onClick={() => run(() => api(`/api/videos/${v.id}/schedule`, "DELETE"), "Unscheduled.")}>
                Unschedule
              </button>
            )}
            <span className="spacer" />
            <button
              className="danger"
              disabled={busy}
              onClick={() => {
                if (!confirm("Delete this video from Shorts Autopilot? Anything already posted stays on YouTube/TikTok.")) return;
                run(() => api(`/api/videos/${v.id}`, "DELETE"), "Deleted.").then(() => dialog.current?.close());
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
