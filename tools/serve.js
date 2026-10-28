// Помощник для тестов: открывает public/index.html по адресу https://hub.test/ и подменяет CDN
// (three.js и шрифты) локальными файлами из node_modules, чтобы тесты шли без интернета.
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, '..', 'node_modules');
const FONTS = { 'dela-gothic-one': ['400'], 'golos-text': ['400', '500', '600', '700'], unbounded: ['600', '800'], 'cormorant-sc': ['700'], podkova: ['700', '800'] };
function fontCss() {
  let css = '';
  for (const [pkg, ws] of Object.entries(FONTS)) for (const w of ws) {
    const f = path.join(NM, '@fontsource', pkg, w + '.css');
    if (fs.existsSync(f)) css += fs.readFileSync(f, 'utf8').replace(/url\(\.\/files\//g, `url(https://fonts.gstatic.com/local/${pkg}/files/`);
  }
  return css;
}
async function setup(page, opts = {}) {
  const log = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => log.push('pageerror: ' + e.message));
  await page.route('**/*', async (route) => {
    const u = new URL(route.request().url());
    if (u.host === 'hub.test') {
      const f = path.join(__dirname, '..', 'public', u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
      return fs.existsSync(f) ? route.fulfill({ path: f, contentType: f.endsWith('.html') ? 'text/html; charset=utf-8' : undefined }) : route.fulfill({ status: 404, body: '' });
    }
    if (u.host === 'cdn.jsdelivr.net' && u.pathname.startsWith('/npm/three@0.160.0/')) {
      const f = path.join(NM, 'three', u.pathname.replace('/npm/three@0.160.0/', ''));
      return route.fulfill({ path: f, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
    }
    if (u.host === 'fonts.googleapis.com') return route.fulfill({ body: fontCss(), contentType: 'text/css' });
    if (u.host === 'fonts.gstatic.com' && u.pathname.startsWith('/local/')) {
      const f = path.join(NM, '@fontsource', u.pathname.replace('/local/', ''));
      return route.fulfill({ path: f, contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
    }
    if (opts.onExternal) opts.onExternal(u.href);
    return route.abort();
  });
  return log;
}
const launchArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
module.exports = { setup, launchArgs };
