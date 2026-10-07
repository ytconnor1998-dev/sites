import { useState } from "react";
import { api, PLATFORM_NAME, type Settings } from "../api.ts";
import type { ViewProps } from "../App.tsx";

const TIMEZONES = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
const PRIVACY: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  FOLLOWER_OF_CREATOR: "Followers",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  SELF_ONLY: "Only me",
};
const CATEGORIES: Record<string, string> = {
  "1": "Film & Animation", "2": "Autos & Vehicles", "10": "Music", "15": "Pets & Animals", "17": "Sports",
  "19": "Travel & Events", "20": "Gaming", "22": "People & Blogs", "23": "Comedy", "24": "Entertainment",
  "25": "News & Politics", "26": "Howto & Style", "27": "Education", "28": "Science & Technology",
};

export function SettingsView({ state, refresh, notify }: ViewProps) {
  const [s, setS] = useState<Settings>(state.settings);
  const [times, setTimes] = useState(state.settings.postTimes.join(", "));
  const [always, setAlways] = useState(state.settings.alwaysHashtags.map((t) => `#${t}`).join(" "));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((cur) => ({ ...cur, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await api<Settings>("/api/settings", "PUT", {
        ...s,
        postTimes: times.split(/[\s,]+/).filter(Boolean).map((t) => t.padStart(5, "0")),
        alwaysHashtags: always.split(/[\s,]+/).map((t) => t.replace(/^#+/, "")).filter(Boolean),
      });
      setS(saved);
      setTimes(saved.postTimes.join(", "));
      await refresh();
      notify("Settings saved.");
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings" onSubmit={save}>
      <h2>Settings</h2>

      <section className="card">
        <h3>Your channel (for the AI)</h3>
        <label>
          What's your channel about?
          <textarea
            rows={3}
            placeholder="e.g. Quick high-protein recipes for students, filmed in a tiny kitchen. Audience: 18-25, UK and US."
            value={s.channelAbout}
            onChange={(e) => set("channelAbout", e.target.value)}
          />
        </label>
        <div className="two">
          <label>
            Tone
            <input value={s.tone} onChange={(e) => set("tone", e.target.value)} />
          </label>
          <label>
            Language for titles
            <input value={s.language} onChange={(e) => set("language", e.target.value)} />
          </label>
        </div>
        <label>
          Hashtags to add to every video
          <input placeholder="#mybrand" value={always} onChange={(e) => setAlways(e.target.value)} />
        </label>
      </section>

      <section className="card">
        <h3>Schedule</h3>
        <div className="two">
          <label>
            Timezone
            <select value={s.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {(TIMEZONES.includes(s.timezone) ? TIMEZONES : [s.timezone, ...TIMEZONES]).map((tz) => (
                <option key={tz}>{tz}</option>
              ))}
            </select>
          </label>
          <label>
            Posting times each day
            <input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="12:00, 18:00, 21:00" />
            <span className="counter">One video per time, so 3 times = 3 videos a day.</span>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.aiPicksTimes} onChange={(e) => set("aiPicksTimes", e.target.checked)} />
          Let the AI choose the posting times when auto-scheduling (it keeps the same number per day)
        </label>
        <div className="row">
          <span>New videos go to:</span>
          {(["youtube", "tiktok"] as const).map((p) => (
            <label key={p} className="check">
              <input
                type="checkbox"
                checked={s.platforms.includes(p)}
                onChange={(e) => set("platforms", e.target.checked ? [...s.platforms, p] : s.platforms.filter((x) => x !== p))}
              />
              {PLATFORM_NAME[p]}
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>YouTube</h3>
        <div className="two">
          <label>
            Category
            <select value={s.youtubeCategoryId} onChange={(e) => set("youtubeCategoryId", e.target.value)}>
              {Object.entries(CATEGORIES).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Max uploads per day
            <input
              type="number"
              min={1}
              max={100}
              value={s.youtubeDailyLimit}
              onChange={(e) => set("youtubeDailyLimit", Number(e.target.value))}
            />
            <span className="counter">A new Google project's API quota allows about 6 a day.</span>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.addShortsTag} onChange={(e) => set("addShortsTag", e.target.checked)} />
          Add #Shorts to titles
        </label>
        <label className="check">
          <input type="checkbox" checked={s.youtubeMadeForKids} onChange={(e) => set("youtubeMadeForKids", e.target.checked)} />
          My videos are made for kids (COPPA)
        </label>
      </section>

      <section className="card">
        <h3>TikTok</h3>
        <label>
          Who can watch
          <select value={s.tiktokPrivacy} onChange={(e) => set("tiktokPrivacy", e.target.value)}>
            {Object.entries(PRIVACY).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <span className="counter">Until TikTok approves your app, it only allows "Only me".</span>
        </label>
        <div className="row">
          <label className="check">
            <input type="checkbox" checked={s.tiktokAllowComments} onChange={(e) => set("tiktokAllowComments", e.target.checked)} />
            Comments
          </label>
          <label className="check">
            <input type="checkbox" checked={s.tiktokAllowDuet} onChange={(e) => set("tiktokAllowDuet", e.target.checked)} />
            Duet
          </label>
          <label className="check">
            <input type="checkbox" checked={s.tiktokAllowStitch} onChange={(e) => set("tiktokAllowStitch", e.target.checked)} />
            Stitch
          </label>
          <label className="check">
            <input type="checkbox" checked={s.tiktokAiGenerated} onChange={(e) => set("tiktokAiGenerated", e.target.checked)} />
            Label videos as AI-generated
          </label>
        </div>
      </section>

      <div className="row sticky-save">
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
