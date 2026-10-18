// Local server: `npm start`, then open http://localhost:3000.
// On Vercel this file isn't used; index.html is served statically and api/*.js run as functions.
import http from "node:http";
import { readFile } from "node:fs/promises";
import scan from "./api/scan.js";
import image from "./api/image.js";

const PORT = Number(process.env.PORT) || 3000;
const routes = { "/api/scan": scan, "/api/image": image };

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (routes[pathname]) return routes[pathname](req, res);
    if (pathname === "/" || pathname === "/index.html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(await readFile(new URL("./index.html", import.meta.url)));
    }
    res.statusCode = 404;
    res.end("Not found");
  })
  .listen(PORT, () => console.log(`Image Finder running at http://localhost:${PORT}`));
