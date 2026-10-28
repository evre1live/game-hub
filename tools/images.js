// Картинка для превью ссылки (public/og.png, 1200×630) и иконка для iPhone (public/apple-touch-icon.png).
// Запуск: npm run build && node tools/images.js
const { chromium } = require('playwright');
const { setup, launchArgs } = require('./serve');
(async () => {
  const b = await chromium.launch({ args: launchArgs });
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await setup(p);
  await p.addInitScript(() => { window.__hubTest = true; });
  await p.goto('https://hub.test/');
  await p.waitForFunction(() => !document.body.classList.contains('is-loading'), null, { timeout: 120000 });
  await p.addStyleTag({ content: '.hint{display:none!important}' });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: 'public/og.png', timeout: 180000 });
  const i = await b.newPage({ viewport: { width: 180, height: 180 } });
  await i.setContent(`<body style="margin:0;background:#07080b"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180"><rect width="64" height="64" fill="#07080b"/><rect x="11" y="23" width="12" height="29" rx="6" fill="#f0a64e"/><rect x="26" y="14" width="12" height="38" rx="6" fill="#ff2a44"/><rect x="41" y="23" width="12" height="29" rx="6" fill="#4fd39b"/></svg></body>`);
  await i.screenshot({ path: 'public/apple-touch-icon.png' });
  await b.close();
  console.log('public/og.png, public/apple-touch-icon.png');
})();
