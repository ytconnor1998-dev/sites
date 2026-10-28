// Draws the app icon (a gold coin peeking out of a green sofa) to electron/icon.png. Original art, made in code.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  const font = 'file://' + path.join(__dirname, '..', 'src', 'assets', 'fonts', 'fredoka.css');
  await p.setContent(`<html><head><link rel="stylesheet" href="${font}"><style>
    body { margin: 0; background: transparent; }
    .bg { position: absolute; inset: 16px; border-radius: 110px; background: radial-gradient(circle at 50% 30%, #8fd36a, #4d8a2c); border: 14px solid #2d2118; box-sizing: border-box; overflow: hidden; }
    .sofa { position: absolute; left: 40px; right: 40px; bottom: 60px; height: 150px; background: #6aa84f; border: 12px solid #2d2118; border-radius: 40px; }
    .cush { position: absolute; bottom: 120px; width: 190px; height: 70px; background: #7cc35a; border: 12px solid #2d2118; border-radius: 26px; }
    .coin { position: absolute; left: 50%; top: 70px; width: 230px; height: 230px; margin-left: -115px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe27a, #f2b631 55%, #d08a10); border: 14px solid #2d2118; box-sizing: border-box; display: grid; place-items: center; transform: rotate(-12deg);
      font: 700 150px/1 Fredoka, sans-serif; color: #fff6d0; text-shadow: 0 8px 0 #b07010; }
  </style></head><body><div class="bg"><div class="coin">£</div><div class="sofa"></div><div class="cush" style="left:52px"></div><div class="cush" style="right:52px"></div></div></body></html>`);
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(__dirname, '..', 'electron', 'icon.png'), omitBackground: true });
  await b.close();
})();
