// Farbvarianten für das Needle-Drop-Logo → logo-options/colors.html (zum Auswählen)
// Aufruf: node scripts/logo-colors.js            (Übersicht)
//         node scripts/logo-colors.js <id> > logo.svg   (eine Variante als Logo ausgeben)
const fs = require('fs'), path = require('path');

const VARIANTS = {
  mint:     ['Mint (aktuell)', '#14b8a6', '#22c55e', '#2dd4bf', '#4ade80', '#e7e7ea'],
  nacht:    ['Nacht-Grün', '#1c2a2b', '#0b1412', '#1ed760', '#14b8a6', '#e7e7ea'],
  ozean:    ['Ozean', '#0ea5e9', '#1e3a8a', '#38bdf8', '#2563eb', '#e7e7ea'],
  violett:  ['Violett', '#8b5cf6', '#4c1d95', '#c084fc', '#7c3aed', '#e7e7ea'],
  koralle:  ['Koralle', '#fb7185', '#be123c', '#fda4af', '#e11d48', '#f4f4f6'],
  retro:    ['Retro-Gold', '#fbbf24', '#ea580c', '#fde68a', '#f59e0b', '#fff7ed'],
};

function logo([, a, b, la, lb, arm]) {
  const grooves = [182, 166, 150, 134, 118, 104].map(r => `<circle cx="256" cy="256" r="${r}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
<!-- Needle Drop: gleiche Platte wie Musik-Bingo, dazu ein Tonarm, der die Nadel aufsetzt -->
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
  <linearGradient id="lab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${la}"/><stop offset="1" stop-color="${lb}"/></linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".35"/></filter>
  <filter id="ss" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity=".3"/></filter>
</defs>
<rect width="512" height="512" fill="url(#bg)"/>
<g transform="translate(256 256) scale(.9) translate(-256 -256)">
  <g filter="url(#sh)"><circle cx="256" cy="256" r="196" fill="#111114"/></g>
  <g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2">${grooves}</g>
  <path d="M256 256 L118 117 A196 196 0 0 1 176 77 Z" fill="#fff" fill-opacity=".1"/>
  <path d="M256 256 L394 395 A196 196 0 0 1 336 435 Z" fill="#fff" fill-opacity=".1"/>
  <circle cx="256" cy="256" r="92" fill="url(#lab)"/><circle cx="256" cy="256" r="12" fill="#111114"/>
</g>
<g filter="url(#ss)">
  <circle cx="440" cy="72" r="28" fill="${arm}"/><circle cx="440" cy="72" r="11" fill="#9a9aa3"/>
  <path d="M440 72 L426 232 L372 280" fill="none" stroke="${arm}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="348" y="270" width="40" height="27" rx="6" fill="#fff" transform="rotate(-42 368 283.5)"/>
</g>
</svg>
`;
}

const pick = process.argv[2];
if (pick) { process.stdout.write(logo(VARIANTS[pick])); return; }

const out = path.join(__dirname, '..', 'logo-options');
fs.mkdirSync(out, { recursive: true });
let cards = '';
for (const [id, v] of Object.entries(VARIANTS)) {
  const u = p => logo(v).replace(/id="(\w+)"/g, `id="${p}-$1"`).replace(/url\(#(\w+)\)/g, `url(#${p}-$1)`);
  cards += `<div class="c"><div class="i">${u(id + 'a')}</div><b>${v[0]}</b><div class="s">${u(id + 'b')}</div></div>`;
}
fs.writeFileSync(path.join(out, 'colors.html'), `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap" rel="stylesheet">
<style>body{margin:0;background:#0c0c0f;color:#f4f4f6;font-family:Outfit,system-ui,sans-serif;padding:32px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.c{background:#1a1a20;border:1px solid #2a2a33;border-radius:26px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative}
.i{width:200px;height:200px;border-radius:46px;overflow:hidden;box-shadow:0 18px 40px -16px #000;margin-bottom:8px}
b{font-size:26px;font-weight:900}.s{position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:11px;overflow:hidden}</style>
<div class="g">${cards}</div>`);
console.log('ok');
