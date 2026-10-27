// Copies just the icons and font files the game uses into src/assets.
// Run after `npm install`: npm run assets
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const iconsOut = path.join(src, 'assets', 'icons');
const fontsOut = path.join(src, 'assets', 'fonts');
const twemoji = path.join(root, 'node_modules', '@twemoji', 'svg');
const fredoka = path.join(root, 'node_modules', '@fontsource', 'fredoka', 'files');

// Same naming rule as emojiFile() in game.js.
function emojiFile(emoji) {
  const cps = [...emoji].map((c) => c.codePointAt(0));
  const list = cps.includes(0x200d) ? cps : cps.filter((c) => c !== 0xfe0f);
  return list.map((c) => c.toString(16)).join('-');
}

const EMOJI = /\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}️?)*/gu;
const found = new Set();
for (const f of fs.readdirSync(src).filter((f) => /\.(js|html)$/.test(f))) {
  for (const m of fs.readFileSync(path.join(src, f), 'utf8').matchAll(EMOJI)) found.add(m[0]);
}
// Icons referenced by file name in index.html
for (const m of fs.readFileSync(path.join(src, 'index.html'), 'utf8').matchAll(/assets\/icons\/([0-9a-f-]+)\.svg/g)) found.add(m[1]);

fs.rmSync(iconsOut, { recursive: true, force: true });
fs.mkdirSync(iconsOut, { recursive: true });
const missing = [];
for (const e of found) {
  const name = /^[0-9a-f-]+$/.test(e) ? e : emojiFile(e);
  const from = path.join(twemoji, name + '.svg');
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(iconsOut, name + '.svg'));
  else missing.push(`${e} (${name})`);
}
console.log(`Copied ${found.size - missing.length} icons.`);
if (missing.length) { console.error('Missing icons:', missing.join(', ')); process.exitCode = 1; }

fs.mkdirSync(fontsOut, { recursive: true });
let css = '';
for (const w of [400, 500, 600, 700]) {
  const file = `fredoka-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join(fredoka, file), path.join(fontsOut, file));
  css += `@font-face { font-family: 'Fredoka'; font-style: normal; font-weight: ${w}; font-display: swap; src: url('${file}') format('woff2'); }\n`;
}
fs.writeFileSync(path.join(fontsOut, 'fredoka.css'), css);
fs.copyFileSync(path.join(root, 'node_modules', '@fontsource', 'fredoka', 'LICENSE'), path.join(fontsOut, 'OFL.txt'));
console.log('Copied Fredoka font.');
