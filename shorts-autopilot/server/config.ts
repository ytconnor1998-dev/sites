import path from "node:path";
import fs from "node:fs";

const env = process.env;

export const config = {
  port: Number(env.PORT ?? 3000),
  isProd: env.NODE_ENV === "production",
  publicUrl: (env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  appPassword: env.APP_PASSWORD ?? "",
  sessionSecret: env.SESSION_SECRET ?? "",
  dataDir: path.resolve(env.DATA_DIR ?? "./data"),
  anthropicKey: env.ANTHROPIC_API_KEY ?? "",
  aiModel: env.AI_MODEL ?? "claude-opus-5-5",
  google: { clientId: env.GOOGLE_CLIENT_ID ?? "", clientSecret: env.GOOGLE_CLIENT_SECRET ?? "" },
  tiktok: { clientKey: env.TIKTOK_CLIENT_KEY ?? "", clientSecret: env.TIKTOK_CLIENT_SECRET ?? "" },
};

export const paths = {
  uploads: path.join(config.dataDir, "uploads"),
  thumbs: path.join(config.dataDir, "thumbs"),
  frames: path.join(config.dataDir, "frames"),
  db: path.join(config.dataDir, "app.db"),
};

export function checkConfig() {
  const problems: string[] = [];
  if (!config.appPassword || config.appPassword === "change-me") problems.push("APP_PASSWORD is not set");
  if (config.sessionSecret.length < 32) problems.push("SESSION_SECRET must be at least 32 characters");
  if (problems.length) {
    console.error(`\nShorts Autopilot can't start:\n  - ${problems.join("\n  - ")}\nCopy .env.example to .env and fill it in.\n`);
    process.exit(1);
  }
  for (const dir of Object.values(paths)) if (!dir.endsWith(".db")) fs.mkdirSync(dir, { recursive: true });
}
