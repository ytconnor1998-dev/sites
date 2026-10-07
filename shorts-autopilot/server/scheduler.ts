import { aiEnabled, planSchedule } from "./ai.ts";
import { db, getSettings, now, saveSettings, type Platform, type Video } from "./db.ts";
import { addDays, dateIn, zonedToUtc } from "./time.ts";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const validTimes = (times: string[]) => [...new Set(times.filter((t) => HHMM.test(t)))].sort();

/** Upcoming posting slots (UTC ISO strings) that no other video is using yet. */
function* freeSlots(timezone: string, times: string[], taken: Set<string>) {
  const earliest = Date.now() + 10 * 60_000;
  const today = dateIn(timezone, new Date());
  for (let day = 0; day < 3650; day++) {
    const ymd = addDays(today, day);
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const at = zonedToUtc(timezone, ymd.y, ymd.m, ymd.d, h, m);
      const iso = at.toISOString();
      if (at.getTime() >= earliest && !taken.has(iso)) yield iso;
    }
  }
}

/** Puts videos that share a topic as far apart as possible, keeping each topic's own order. */
function spreadTopics(videos: Video[]) {
  const groups = new Map<string, Video[]>();
  for (const v of videos) {
    const k = v.topic.trim().toLowerCase() || `#${v.id}`;
    groups.set(k, [...(groups.get(k) ?? []), v]);
  }
  const queues = [...groups.values()].sort((a, b) => b.length - a.length);
  const out: Video[] = [];
  while (out.length < videos.length) for (const q of queues) if (q.length) out.push(q.shift()!);
  return out;
}

export function setPosts(videoId: number, platforms: Platform[], at: string) {
  const ins = db.prepare(
    `INSERT INTO posts (video_id, platform, scheduled_at, status, attempts, next_attempt_at, error, note, updated_at)
     VALUES (?, ?, ?, 'scheduled', 0, NULL, NULL, NULL, ?)
     ON CONFLICT(video_id, platform) DO UPDATE SET scheduled_at = excluded.scheduled_at, status = 'scheduled',
       attempts = 0, next_attempt_at = NULL, error = NULL, note = NULL, updated_at = excluded.updated_at
     WHERE posts.status IN ('scheduled', 'failed')`,
  );
  for (const p of platforms) ins.run(videoId, p, at, now());
}

/**
 * Gives every ready, unscheduled video a slot. With the AI on, it orders the videos
 * (best hooks first, topics spread out) and can pick the daily posting times too.
 */
export async function autoSchedule(useAi: boolean) {
  const s = getSettings();
  const videos = db
    .prepare(
      `SELECT * FROM videos WHERE status = 'ready' AND id NOT IN (SELECT video_id FROM posts) ORDER BY created_at, id`,
    )
    .all() as unknown as Video[];
  if (!videos.length) return { scheduled: 0, reasoning: "Nothing to schedule: every ready video already has a time." };
  if (!s.platforms.length) throw new Error("Pick at least one platform in Settings first.");

  let ordered = spreadTopics(videos);
  let times = validTimes(s.postTimes);
  let reasoning = "Videos with similar topics are spread apart and fill your posting times in order.";

  if (useAi && aiEnabled()) {
    try {
      const plan = await planSchedule(videos, s);
      const byId = new Map(videos.map((v) => [v.id, v]));
      const fromAi = [...new Set(plan.order)].map((id) => byId.get(id)).filter((v): v is Video => Boolean(v));
      ordered = [...fromAi, ...ordered.filter((v) => !fromAi.includes(v))];
      reasoning = plan.reasoning;
      const aiTimes = validTimes(plan.times).slice(0, Math.max(1, times.length));
      if (s.aiPicksTimes && aiTimes.length) {
        times = aiTimes;
        saveSettings({ ...s, postTimes: aiTimes });
      }
    } catch (e) {
      reasoning = `The AI planner failed (${(e as Error).message}), so videos were spread by topic instead.`;
    }
  }
  if (!times.length) throw new Error("Add at least one posting time in Settings first.");

  const taken = new Set(
    (db.prepare(`SELECT DISTINCT scheduled_at FROM posts WHERE status != 'failed'`).all() as { scheduled_at: string }[]).map(
      (r) => r.scheduled_at,
    ),
  );
  const slots = freeSlots(s.timezone, times, taken);
  for (const v of ordered) {
    const at = slots.next().value;
    if (!at) break;
    setPosts(v.id, s.platforms, at);
  }
  return { scheduled: ordered.length, reasoning };
}
