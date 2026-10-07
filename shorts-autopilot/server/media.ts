import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { paths } from "./config.ts";

const run = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

export interface Probe {
  duration: number;
  width: number;
  height: number;
}

export async function probe(file: string): Promise<Probe> {
  const { stdout } = await run(FFPROBE, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration",
    "-of", "json",
    file,
  ]);
  const info = JSON.parse(stdout);
  const s = info.streams?.[0] ?? {};
  let width = Number(s.width ?? 0);
  let height = Number(s.height ?? 0);
  // Phone videos are often stored landscape with a rotation flag.
  const rotation = Math.abs(Number(s.side_data_list?.find((d: { rotation?: number }) => d.rotation != null)?.rotation ?? 0));
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];
  return { duration: Number(info.format?.duration ?? 0), width, height };
}

async function grab(file: string, at: number, out: string, height: number) {
  await run(FFMPEG, [
    "-y", "-v", "error",
    "-ss", at.toFixed(2),
    "-i", file,
    "-frames:v", "1",
    "-vf", `scale=-2:${height}`,
    "-q:v", "4",
    out,
  ]);
}

export const thumbPath = (videoId: number) => path.join(paths.thumbs, `${videoId}.jpg`);

export async function makeThumbnail(videoId: number, file: string, duration: number) {
  await grab(file, Math.min(1, duration / 2), thumbPath(videoId), 480);
}

/** Evenly spaced still frames so the AI can "watch" the video. */
export async function extractFrames(videoId: number, file: string, duration: number, count = 8): Promise<Buffer[]> {
  const dir = path.join(paths.frames, String(videoId));
  await fs.mkdir(dir, { recursive: true });
  const frames: Buffer[] = [];
  try {
    for (let i = 0; i < count; i++) {
      const at = duration > 0 ? (duration * (i + 0.5)) / count : i;
      const out = path.join(dir, `${i}.jpg`);
      try {
        await grab(file, at, out, 768);
        frames.push(await fs.readFile(out));
      } catch {
        // A frame past the real end of the stream: skip it.
      }
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  return frames;
}
