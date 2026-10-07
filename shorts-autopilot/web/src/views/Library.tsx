import { useMemo, useRef, useState } from "react";
import { api, uploadFile, PLATFORM_NAME, type Video } from "../api.ts";
import type { ViewProps } from "../App.tsx";
import { bucketOf, fmtDuration, fmtWhen, STATUS_LABEL, warnings, type Bucket } from "../util.ts";
import { Editor } from "./Editor.tsx";

interface Uploading {
  key: string;
  name: string;
  progress: number;
  error?: string;
}

const FILTERS: { id: Bucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "unscheduled", label: "Not scheduled" },
  { id: "scheduled", label: "Scheduled" },
  { id: "posted", label: "Posted" },
];

export function Library({ state, refresh, notify }: ViewProps) {
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [notes, setNotes] = useState("");
  const [drag, setDrag] = useState(false);
  const [filter, setFilter] = useState<Bucket>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [planning, setPlanning] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { all: state.videos.length, attention: 0, unscheduled: 0, scheduled: 0, posted: 0 };
    for (const v of state.videos) c[bucketOf(v)]++;
    return c;
  }, [state.videos]);
  const shown = state.videos.filter((v) => filter === "all" || bucketOf(v) === filter);
  const readyToSchedule = state.videos.filter((v) => v.status === "ready" && !v.posts.length).length;
  const thinking = state.videos.filter((v) => v.status === "uploaded" || v.status === "analyzing").length;
  const open = state.videos.find((v) => v.id === openId) ?? null;
  const missing = (["youtube", "tiktok"] as const).filter(
    (p) => state.settings.platforms.includes(p) && !state.accounts.some((a) => a.platform === p),
  );

  async function addFiles(list: FileList | File[]) {
    const files = [...list].filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(f.name));
    if (!files.length) return notify("Those aren't video files.", true);
    const batch = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, progress: 0, file: f }));
    setUploads((u) => [...u, ...batch.map(({ file: _f, ...rest }) => rest)]);
    const set = (key: string, patch: Partial<Uploading>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...patch } : x)));

    // Two at a time keeps the connection busy without choking it.
    let next = 0;
    let failed = 0;
    const worker = async () => {
      while (next < batch.length) {
        const item = batch[next++];
        try {
          await uploadFile(item.file, notes, (p) => set(item.key, { progress: p }));
          setUploads((u) => u.filter((x) => x.key !== item.key));
          refresh();
        } catch (e) {
          failed++;
          set(item.key, { error: (e as Error).message });
        }
      }
    };
    await Promise.all([worker(), worker()]);
    notify(failed ? `${batch.length - failed} uploaded, ${failed} failed.` : `${batch.length} video${batch.length > 1 ? "s" : ""} uploaded. The AI is watching them now.`, failed > 0);
  }

  async function autoSchedule() {
    setPlanning(true);
    try {
      const r = await api<{ scheduled: number; reasoning: string }>("/api/schedule/auto", "POST", { useAi: true });
      notify(r.scheduled ? `Scheduled ${r.scheduled} video${r.scheduled > 1 ? "s" : ""}. ${r.reasoning}` : r.reasoning);
      await refresh();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setPlanning(false);
    }
  }

  return (
    <>
      {missing.length > 0 && (
        <div className="banner">
          {missing.map((p) => PLATFORM_NAME[p]).join(" and ")} {missing.length > 1 ? "aren't" : "isn't"} connected yet, so posts there
          will wait. <a href="#/accounts">Connect accounts →</a>
        </div>
      )}
      {!state.ai && (
        <div className="banner">
          The AI is off because <code>ANTHROPIC_API_KEY</code> isn't set. Videos get their file name as a title until you add it.
        </div>
      )}

      <section
        className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="dropzone-main">
          <h2>Drop your Shorts here</h2>
          <p className="muted">As many as you like. MP4, MOV or WebM, up to 4 GB each. Vertical videos under 3 minutes work on both platforms.</p>
          <button className="primary" onClick={() => input.current?.click()}>
            Choose videos
          </button>
          <input
            ref={input}
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <label className="dropzone-notes">
          Anything the AI should know about this batch? <span className="muted">(optional)</span>
          <textarea
            rows={3}
            placeholder="e.g. Clips from my Tokyo trip, ramen spot is Ichiran Shibuya. Mention the 3-day itinerary."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </section>

      {uploads.length > 0 && (
        <ul className="uploads">
          {uploads.map((u) => (
            <li key={u.key}>
              <span className="name">{u.name}</span>
              {u.error ? (
                <span className="error">
                  {u.error}{" "}
                  <button className="link" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                    Dismiss
                  </button>
                </span>
              ) : (
                <progress value={u.progress} max={1} />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="toolbar">
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} <span className="count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          {thinking > 0 && <span className="muted pulse">AI is watching {thinking} video{thinking > 1 ? "s" : ""}…</span>}
          <button className="primary" disabled={!readyToSchedule || planning} onClick={autoSchedule}>
            {planning ? "Planning…" : `Auto-schedule ${readyToSchedule || ""} video${readyToSchedule === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="empty muted">{state.videos.length ? "Nothing here." : "No videos yet. Drop some in above."}</p>
      ) : (
        <div className="grid">
          {shown.map((v) => (
            <VideoCard key={v.id} v={v} tz={state.settings.timezone} onOpen={() => setOpenId(v.id)} />
          ))}
        </div>
      )}

      {open && <Editor video={open} state={state} refresh={refresh} notify={notify} onClose={() => setOpenId(null)} />}
    </>
  );
}

function VideoCard({ v, tz, onOpen }: { v: Video; tz: string; onOpen: () => void }) {
  const warn = warnings(v);
  return (
    <button className="vcard" onClick={onOpen}>
      <div className="thumb">
        <img src={`/media/thumbs/${v.id}`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
        {v.duration ? <span className="dur">{fmtDuration(v.duration)}</span> : null}
        {(v.status === "uploaded" || v.status === "analyzing") && <span className="overlay pulse">AI is watching…</span>}
      </div>
      <div className="vbody">
        <strong className="vtitle">{v.title || v.original_name}</strong>
        {v.hashtags.length > 0 && <span className="tags">{v.hashtags.slice(0, 4).map((t) => `#${t}`).join(" ")}</span>}
        {v.status === "error" && <span className="error small">{v.error}</span>}
        {warn.length > 0 && <span className="warn small">{warn[0]}</span>}
        <div className="posts">
          {v.posts.length === 0 && v.status === "ready" && <span className="chip">Not scheduled</span>}
          {v.posts.map((p) => (
            <span key={p.id} className={`chip ${p.platform} st-${p.status}`} title={p.error ?? p.note ?? ""}>
              {PLATFORM_NAME[p.platform]} · {p.status === "scheduled" ? fmtWhen(p.scheduled_at, tz) : STATUS_LABEL[p.status]}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
