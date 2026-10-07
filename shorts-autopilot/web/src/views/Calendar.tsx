import { useState } from "react";
import { api, PLATFORM_NAME } from "../api.ts";
import type { ViewProps } from "../App.tsx";
import { STATUS_LABEL } from "../util.ts";

export function CalendarView({ state, refresh, notify }: ViewProps) {
  const tz = state.settings.timezone;
  const [showPast, setShowPast] = useState(false);
  const cutoff = Date.now() - 24 * 3600_000;

  const rows = state.videos
    .flatMap((v) => v.posts.map((p) => ({ p, v })))
    .filter(({ p }) => showPast || p.status !== "published" || new Date(p.scheduled_at).getTime() > cutoff)
    .sort((a, b) => a.p.scheduled_at.localeCompare(b.p.scheduled_at));

  // Group by day in the posting timezone, then by time slot.
  const days = new Map<string, Map<string, typeof rows>>();
  for (const r of rows) {
    const d = new Date(r.p.scheduled_at);
    const day = d.toLocaleDateString(undefined, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
    const time = d.toLocaleTimeString(undefined, { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    if (!days.has(day)) days.set(day, new Map());
    const slots = days.get(day)!;
    slots.set(time, [...(slots.get(time) ?? []), r]);
  }

  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Schedule</h2>
          <p className="muted small">Times in {tz}. Change your posting times in Settings.</p>
        </div>
        <div className="toolbar-actions">
          <label className="check">
            <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show older posts
          </label>
          <button
            className="ghost"
            onClick={async () => {
              if (!confirm("Remove every scheduled post that hasn't been uploaded yet? The videos stay in your library.")) return;
              const r = await api<{ removed: number }>("/api/schedule/clear", "POST");
              await refresh();
              notify(`Removed ${r.removed} scheduled post${r.removed === 1 ? "" : "s"}.`);
            }}
          >
            Clear schedule
          </button>
        </div>
      </div>

      {days.size === 0 ? (
        <p className="empty muted">
          Nothing scheduled. Go to <a href="#/library">Videos</a> and press Auto-schedule.
        </p>
      ) : (
        [...days].map(([day, slots]) => (
          <section key={day} className="day">
            <h3>{day}</h3>
            {[...slots].map(([time, items]) => (
              <div key={time} className="slot">
                <span className="slot-time">{time}</span>
                <div className="slot-items">
                  {[...new Map(items.map((i) => [i.v.id, i.v])).values()].map((v) => (
                    <div key={v.id} className="slot-item">
                      <img src={`/media/thumbs/${v.id}`} alt="" />
                      <div>
                        <strong>{v.title || v.original_name}</strong>
                        <div className="posts">
                          {items
                            .filter((i) => i.v.id === v.id)
                            .map(({ p }) => (
                              <span key={p.id} className={`chip ${p.platform} st-${p.status}`} title={p.error ?? ""}>
                                {PLATFORM_NAME[p.platform]} · {STATUS_LABEL[p.status]}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </>
  );
}
