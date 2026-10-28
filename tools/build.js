// Сборка: встраивает src/app.js в src/index.html и кладёт готовую страницу в public/index.html.
// Запуск: node tools/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');
if (js.includes('</script')) throw new Error('в app.js встречается </script — страница сломается');
const tag = '<script type="module" src="app.js"></script>';
if (!html.includes(tag)) throw new Error('в src/index.html нет тега <script src="app.js">');
html = html.replace(tag, () => '<script type="module">\n' + js + '\n</script>');
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.writeFileSync(path.join(root, 'public', 'index.html'), html);
console.log('public/index.html —', (html.length / 1024).toFixed(1), 'КБ');
