// Balance check: plays fast-forwarded runs with the real game code and reports when The Thing is bought.
// Needs Playwright and the game served locally:
//   python3 -m http.server 8765 --directory src   (in another terminal)
//   node tools/balance.js                          (normal player)
//   node tools/balance.js '{"active":0.3,"rhythm":1.4}'   (casual player)
// Options go to LC.debug.simRun in game.js: secs, active, rhythm, log, incomes, payback.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  p.setDefaultTimeout(900000);
  const opts = JSON.parse(process.argv[2] || '{"log":1800}');
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(() => { LC.debug.quiet(); for (let i = 0; i < 3; i++) document.querySelector('#overlay.show .modal-choices button, #dialog.show .modal-choices button')?.click(); });
  const r = await p.evaluate((o) => LC.debug.simRun(o), opts);
  console.log(r.marks.filter((m) => !m.startsWith('[')).join('\n'));
  console.log(`The Thing after ${r.minutes} minutes. Brian was at ${r.brian}%.`);
  await b.close();
})();
