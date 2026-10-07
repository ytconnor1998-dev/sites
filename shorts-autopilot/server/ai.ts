import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { config } from "./config.ts";
import type { Settings, Video } from "./db.ts";

const client = config.anthropicKey ? new Anthropic({ apiKey: config.anthropicKey }) : null;

export const aiEnabled = () => client !== null;

export class AiRefusal extends Error {}

// Fall back to another model automatically if the main one declines a request.
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

// ── Watching a video ────────────────────────────────────────────────────

const VideoCopy = z.object({
  summary: z.string().describe("One or two sentences: what happens in the video."),
  topic: z.string().describe("A 1-3 word topic label, used to avoid posting similar videos back to back."),
  title: z.string().describe("YouTube Shorts title. Hook-first, under 70 characters, no hashtags."),
  description: z.string().describe("YouTube description: 1-3 short lines, no hashtags (they are added separately)."),
  caption: z.string().describe("TikTok caption: one or two punchy lines, no hashtags (they are added separately)."),
  hashtags: z.array(z.string()).describe("5-8 relevant hashtags without the # sign, mixing broad and niche."),
});
export type VideoCopy = z.infer<typeof VideoCopy>;

function systemPrompt(s: Settings) {
  return [
    "You write titles, captions and hashtags for short vertical videos posted to YouTube Shorts and TikTok.",
    "You are shown still frames taken evenly through one video, in order, plus the file name and any notes from the creator.",
    "Describe only what is actually visible or stated; never invent people, places or claims the frames don't support.",
    "If the frames contain on-screen text, use it - it often says what the video is about.",
    "Titles should make someone stop scrolling: concrete, curious, no clickbait that the video doesn't pay off, no ALL CAPS, at most one emoji.",
    `Write in ${s.language}. Tone: ${s.tone || "natural"}.`,
    s.channelAbout ? `About the channel: ${s.channelAbout}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeCopyForVideo(video: Video, frames: Buffer[], s: Settings): Promise<VideoCopy> {
  if (!client) throw new Error("ANTHROPIC_API_KEY is not set, so the AI can't watch videos yet.");
  if (!frames.length) throw new Error("Couldn't read any frames from this video.");

  const content: Anthropic.Beta.BetaContentBlockParam[] = frames.map((f) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: f.toString("base64") },
  }));
  content.push({
    type: "text",
    text: [
      `File name: ${video.original_name}`,
      video.duration ? `Length: ${Math.round(video.duration)} seconds` : "",
      video.notes ? `Creator's notes: ${video.notes}` : "",
      "Write the title, descriptions and hashtags for this video.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const res = await client.beta.messages.parse({
    model: config.aiModel,
    max_tokens: 16000,
    system: systemPrompt(s),
    messages: [{ role: "user", content }],
    output_config: { effort: "medium", format: betaZodOutputFormat(VideoCopy) },
    ...FALLBACK,
  });

  if (res.stop_reason === "refusal") throw new AiRefusal("The AI declined to describe this video. Write the title yourself.");
  if (!res.parsed_output) throw new Error(`The AI's answer was cut off (${res.stop_reason}). Try again.`);
  return res.parsed_output;
}

// ── Planning the schedule ───────────────────────────────────────────────

const Plan = z.object({
  order: z.array(z.number()).describe("Every video id exactly once, in the order they should be posted."),
  times: z.array(z.string()).describe("Daily posting times as HH:MM (24h) in the creator's timezone, earliest first."),
  reasoning: z.string().describe("One or two sentences explaining the plan, shown to the creator."),
});
export type Plan = z.infer<typeof Plan>;

export async function planSchedule(
  videos: Pick<Video, "id" | "title" | "topic" | "summary" | "duration">[],
  s: Settings,
): Promise<Plan> {
  if (!client) throw new Error("ANTHROPIC_API_KEY is not set.");
  const perDay = s.postTimes.length || 1;
  const list = videos
    .map((v) => `- id ${v.id} | topic: ${v.topic || "?"} | ${Math.round(v.duration ?? 0)}s | "${v.title}" | ${v.summary}`)
    .join("\n");

  const res = await client.beta.messages.parse({
    model: config.aiModel,
    max_tokens: 16000,
    system: [
      "You plan posting schedules for a creator's YouTube Shorts and TikTok videos.",
      "Order the videos so the strongest hooks go first, similar topics are spread out, and any obvious series (part 1, part 2...) stays in order.",
      `Pick exactly ${perDay} daily posting time(s) suited to when the creator's audience is most active on short-video apps.`,
      `Creator's timezone: ${s.timezone}. Language: ${s.language}.`,
      s.channelAbout ? `About the channel: ${s.channelAbout}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    messages: [{ role: "user", content: `Videos to schedule:\n${list}` }],
    output_config: { effort: "medium", format: betaZodOutputFormat(Plan) },
    ...FALLBACK,
  });

  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("The AI couldn't plan this schedule.");
  return res.parsed_output;
}
