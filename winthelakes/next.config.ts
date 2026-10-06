import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` writes the whole site to /out as plain HTML/CSS/JS,
  // ready for Cloudflare Pages, Netlify, Vercel or any static host.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    // Same value on the server and in the browser, so demo draw dates match (see config/competitions.ts).
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
