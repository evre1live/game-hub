// Проверка сценариев: наведение, клик, клавиши, ссылки, переход в игру, работа в рамке.
// Запуск: npm install && npx playwright install chromium && npm run build && npm test
const { chromium } = require('playwright');
const { setup, launchArgs } = require('./serve');
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
(async () => {
  const b = await chromium.launch({ args: launchArgs });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 625 } });
  const p = await ctx.newPage();
  const ext = [];
  const log = await setup(p, { onExternal: (u) => ext.push(u) });
  await p.addInitScript(() => { window.__hubTest = true; });
  await p.goto('https://hub.test/index.html');
  await p.waitForFunction(() => !document.body.classList.contains('is-loading'), null, { timeout: 90000 });
  await p.waitForTimeout(3500);
  const st = () => p.evaluate(() => ({ cls: document.body.className, hash: location.hash, title: document.querySelector('#p-title')?.textContent, href: document.querySelector('#p-play')?.getAttribute('href'), target: document.querySelector('#p-play')?.getAttribute('target'), hot: [...document.querySelectorAll('.tag')].map((t) => t.classList.contains('hot')), pressed: [...document.querySelectorAll('.sw')].map((s) => s.getAttribute('aria-pressed')) }));
  const tagPos = await p.evaluate(() => [...document.querySelectorAll('.tag')].map((t) => { const r = t.getBoundingClientRect(); return [r.x + r.width / 2, r.y]; }));
  // наведение на среднюю комнату: точка выше её подписи
  const [mx, my] = [tagPos[1][0], tagPos[1][1] - 120];
  await p.mouse.move(mx - 30, my - 30); await p.waitForTimeout(400);
  await p.mouse.move(mx, my); await p.waitForTimeout(2500);
  let s = await st();
  ok('наведение подсвечивает комнату 2', s.cls.includes('can-click') && s.hot[1], JSON.stringify(s.hot) + ' ' + s.cls);
  await p.screenshot({ path: 'shots/hover.png', timeout: 150000 });
  await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(1500);
  s = await st();
  ok('клик по комнате открывает ГРЯЗЬ', s.cls.includes('is-focus') && s.title === 'ГРЯЗЬ' && s.hash === '#gryaz', `${s.title} ${s.hash}`);
  ok('ссылка на игру', s.href === 'https://gryaz.onrender.com/' && !s.target, s.href + ' target=' + s.target);
  ok('кнопка в переключателе отмечена', s.pressed[1] === 'true');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
  s = await st(); ok('стрелка вправо → Под Землёй', s.title === 'Под Землёй' && s.hash === '#podzemlei', s.title + ' ' + s.hash);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800);
  s = await st(); ok('по кругу → Дикий Запад', s.title === 'Дикий Запад' && s.href === 'https://dikiy-zapad.onrender.com/', s.title);
  await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  s = await st(); ok('Esc → обзор', !s.cls.includes('is-focus') && s.hash === '', s.cls + ' ' + s.hash);
  await p.keyboard.press('3'); await p.waitForTimeout(800);
  s = await st(); ok('клавиша 3 → Под Землёй', s.title === 'Под Землёй');
  await p.click('#p-back'); await p.waitForTimeout(800);
  s = await st(); ok('«Все комнаты» → обзор', !s.cls.includes('is-focus'));
  await p.waitForTimeout(1500);
  await p.click('.tag >> nth=0'); await p.waitForTimeout(800);
  s = await st(); ok('клик по подписи → Дикий Запад', s.title === 'Дикий Запад');
  await p.click('#p-prev'); await p.waitForTimeout(800);
  s = await st(); ok('кнопка ← по кругу → Под Землёй', s.title === 'Под Землёй');
  await p.click('.sw >> nth=1'); await p.waitForTimeout(800);
  s = await st(); ok('переключатель 02 → ГРЯЗЬ', s.title === 'ГРЯЗЬ');
  await p.click('.sw >> nth=1'); await p.waitForTimeout(800);
  s = await st(); ok('повторный клик 02 → обзор', !s.cls.includes('is-focus'));
  // перетаскивание не открывает комнату
  await p.mouse.move(500, 300); await p.mouse.down(); await p.mouse.move(600, 320, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(600);
  s = await st(); ok('перетаскивание не открывает комнату', !s.cls.includes('is-focus'), s.cls);
  // глубокая ссылка
  await p.evaluate(() => { location.hash = 'podzemlei'; }); await p.waitForTimeout(800);
  s = await st(); ok('hash #podzemlei открывает комнату', s.title === 'Под Землёй');
  // переход в игру
  await p.click('#p-play');
  await p.waitForTimeout(2500);
  ok('«Играть» ведёт на podzemlei.onrender.com', ext.some((u) => u.startsWith('https://podzemlei.onrender.com/')), ext.join(', '));
  ok('сервер будится заранее', ext.filter((u) => u.includes('onrender.com')).length >= 2, String(ext.length));
  // в рамке (как в артефакте) ссылка открывается в новой вкладке
  const f = await ctx.newPage();
  await setup(f);
  await f.addInitScript(() => { window.__hubTest = true; });
  await f.route('https://frame.test/**', (r) => r.fulfill({ body: '<!doctype html><iframe id="fr" src="https://hub.test/index.html#gryaz" style="width:1000px;height:600px;border:0"></iframe>', contentType: 'text/html' }));
  await f.goto('https://frame.test/');
  const fr = await (await f.waitForSelector('#fr')).contentFrame();
  await fr.waitForFunction(() => !!document.querySelector('#p-play'), null, { timeout: 90000 });
  const tgt = await fr.evaluate(() => document.querySelector('#p-play').getAttribute('target'));
  ok('в рамке ссылка с target=_blank', tgt === '_blank', String(tgt));
  console.log(results.join('\n'));
  console.log(log.filter((l) => !l.includes('ERR_FAILED')).slice(0, 20).join('\n') || 'no console errors');
  await b.close();
})();
