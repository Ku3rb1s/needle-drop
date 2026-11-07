// Erzeugt logo-options/*.svg und logo-options/sheet.html (Übersicht zum Auswählen).
// Alle Logos nutzen dieselbe Platte wie Musik-Bingo; nur Farbe und Etikett/Symbol ändern sich.
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'logo-options');
fs.mkdirSync(out, { recursive: true });

const grooves = [182, 166, 150, 134, 118, 104].map(r => `<circle cx="256" cy="256" r="${r}"/>`).join('');
const shine = `<path d="M256 256 L118 117 A196 196 0 0 1 176 77 Z" fill="#fff" fill-opacity=".1"/><path d="M256 256 L394 395 A196 196 0 0 1 336 435 Z" fill="#fff" fill-opacity=".1"/>`;
const defs = (a, b, la, lb) => `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
  <linearGradient id="lab" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${la}"/><stop offset="1" stop-color="${lb}"/></linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity=".35"/></filter>
  <filter id="ss" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity=".3"/></filter>
</defs>`;
const disc = (label) => `<g filter="url(#sh)"><circle cx="256" cy="256" r="196" fill="#111114"/></g>
  <g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2">${grooves}</g>${shine}
  <circle cx="256" cy="256" r="92" fill="url(#lab)"/>${label}`;
const wrap = (d, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">${d}<rect width="512" height="512" fill="url(#bg)"/>${body}</svg>`;
const font = `font-family="Outfit,Segoe UI,system-ui,sans-serif" font-weight="900"`;

const LOGOS = {
  // Ein Stück ist aus der Platte geschnitten und schwebt heraus
  snippet: ['Snippet', 'Ein Stück Song, herausgeschnitten', wrap(defs('#a855f7', '#ec4899', '#c084fc', '#f472b6'), `
    <g filter="url(#sh)"><path d="M256 256 L256 60 A196 196 0 1 0 425.7 158 Z" fill="#111114"/></g>
    <g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2">${[182, 166, 150, 134, 118, 104].map(r => `<path d="M256 ${256 - r} A${r} ${r} 0 1 0 ${(256 + r * 0.866).toFixed(1)} ${256 - r * 0.5}"/>`).join('')}</g>
    <path d="M256 256 L118 117 A196 196 0 0 1 176 77 Z" fill="#fff" fill-opacity=".1"/>
    <path d="M256 256 L256 164 A92 92 0 1 0 335.7 210 Z" fill="url(#lab)"/>
    <g transform="translate(34 -26)" filter="url(#ss)">
      <path d="M256 256 L256 60 A196 196 0 0 1 425.7 158 Z" fill="#111114" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-linejoin="round"/>
      <g fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="2">${[182, 166, 150, 134, 118, 104].map(r => `<path d="M256 ${256 - r} A${r} ${r} 0 0 1 ${(256 + r * 0.866).toFixed(1)} ${256 - r * 0.5}"/>`).join('')}</g>
      <path d="M256 256 L256 164 A92 92 0 0 1 335.7 210 Z" fill="url(#lab)"/>
      <path d="M256 256 L256 60 A196 196 0 0 1 425.7 158 Z" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-linejoin="round"/>
    </g>`)],
  // Platte in zwei Hälften – „split second“
  split: ['Split Second', 'Wortspiel: Sekundenbruchteil', wrap(defs('#22d3ee', '#3b82f6', '#67e8f9', '#60a5fa'), `
    <g transform="translate(-16 10)"><g filter="url(#sh)"><path d="M248 60 A196 196 0 0 0 248 452 Z" fill="#111114"/></g>
      <g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2">${[182, 150, 118].map(r => `<path d="M248 ${256 - r} A${r} ${r} 0 0 0 248 ${256 + r}"/>`).join('')}</g>
      <path d="M248 164 A92 92 0 0 0 248 348 Z" fill="url(#lab)"/></g>
    <g transform="translate(16 -10)"><g filter="url(#sh)"><path d="M264 60 A196 196 0 0 1 264 452 Z" fill="#111114"/></g>
      <g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2">${[182, 150, 118].map(r => `<path d="M264 ${256 - r} A${r} ${r} 0 0 1 264 ${256 + r}"/>`).join('')}</g>
      <path d="M264 164 A92 92 0 0 1 264 348 Z" fill="url(#lab)"/></g>
    <path d="M256 40 L256 472" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 18" opacity=".9"/>`)],
  // ,1 auf dem Etikett
  pointone: ['Point One', '0,1 Sekunden – die Kernidee', wrap(defs('#10b981', '#06b6d4', '#34d399', '#22d3ee'),
    disc(`<text x="256" y="292" text-anchor="middle" font-size="100" ${font} fill="#fff" filter="url(#ss)" letter-spacing="-4">.1</text>`))],
  // Platte mit Tempo-Streifen
  quickspin: ['Quick Spin', 'Schnell gedreht, schnell erkannt', wrap(defs('#f59e0b', '#ef4444', '#fbbf24', '#f87171'), `
    <g stroke="#fff" stroke-linecap="round" opacity=".85"><path d="M30 196 H120" stroke-width="16"/><path d="M14 256 H96" stroke-width="16"/><path d="M40 316 H118" stroke-width="16"/></g>
    <g transform="translate(40 0)">${disc(`<path d="M232 210 L300 256 L232 302 Z" fill="#fff" stroke="#fff" stroke-width="10" stroke-linejoin="round" filter="url(#ss)"/>`)}</g>`)],
  // Auge als Etikett – „in the blink of an eye“
  blink: ['Blink', 'Im Wimpernschlag erkennen', wrap(defs('#f43f5e', '#f97316', '#fb7185', '#fb923c'),
    disc(`<g filter="url(#ss)"><path d="M190 256 Q256 196 322 256 Q256 316 190 256 Z" fill="#fff"/><circle cx="256" cy="256" r="22" fill="#111114"/><circle cx="264" cy="248" r="6" fill="#fff"/></g>`))],
  // Schallwellen – „within earshot“
  earshot: ['Earshot', 'Hören und sofort wissen', wrap(defs('#6366f1', '#a855f7', '#818cf8', '#c084fc'),
    disc(`<g fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" filter="url(#ss)"><circle cx="222" cy="256" r="10" fill="#fff" stroke="none"/><path d="M248 222 A44 44 0 0 1 248 290"/><path d="M272 198 A76 76 0 0 1 272 314"/></g>`))],
};

// Runde 2: Namen mit mehr Musik-/Game-Bezug
const LOGOS2 = {
  // Tonarm setzt die Nadel auf – „needle drop“ = Song an beliebiger Stelle anspielen
  needledrop: ['Needle Drop', 'Nadel drauf – sofort erkennen', wrap(defs('#14b8a6', '#22c55e', '#2dd4bf', '#4ade80'), `
    <g transform="translate(-22 22)">${disc('<circle cx="256" cy="256" r="12" fill="#111114"/>')}</g>
    <g filter="url(#ss)">
      <circle cx="420" cy="92" r="34" fill="#e7e7ea"/><circle cx="420" cy="92" r="14" fill="#9a9aa3"/>
      <path d="M420 92 L404 250 L344 300" fill="none" stroke="#e7e7ea" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="318" y="288" width="44" height="30" rx="7" fill="#fff" transform="rotate(-40 340 303)"/>
    </g>`)],
  // Etikett halb Treffer, halb Fehlschuss
  hitormiss: ['Hit or Miss', 'Treffer oder daneben', wrap(defs('#f97316', '#db2777', '#fb923c', '#f472b6'),
    disc(`<g filter="url(#ss)" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
      <path d="M200 258 L220 280 L248 238"/><path d="M276 236 L316 276 M316 236 L276 276"/></g>
      <path d="M256 180 V332" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/>`))],
  // Spirale wie ein Ohr – Ohrwurm
  earworm: ['Earworm', 'Der Song, der hängen bleibt', wrap(defs('#84cc16', '#10b981', '#a3e635', '#34d399'),
    disc(`<path filter="url(#ss)" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"
      d="M232 300 C206 300 196 276 196 252 C196 216 222 194 256 194 C292 194 318 220 318 252 C318 278 302 290 288 302 C276 312 272 322 266 330 M240 256 C240 238 250 228 262 228 C276 228 284 240 282 252 C280 264 268 268 262 278"/>`))],
  // Zurückspulen – passt zu den Jahrzehnt-Kategorien
  flashback: ['Flashback', 'Zurück in die 80er, 90er, 00er', wrap(defs('#f59e0b', '#ec4899', '#fbbf24', '#f472b6'),
    disc(`<g filter="url(#ss)" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"><path d="M254 216 L200 256 L254 296 Z"/><path d="M314 216 L260 256 L314 296 Z"/></g>`))],
  // Kamera-Blende – ein Schnappschuss vom Song
  hitsnap: ['Hitsnap', 'Ein Schnappschuss vom Hit', wrap(defs('#0ea5e9', '#6366f1', '#38bdf8', '#818cf8'),
    disc(`<g filter="url(#ss)"><circle cx="256" cy="256" r="58" fill="none" stroke="#fff" stroke-width="12"/>
      <g stroke="#fff" stroke-width="8" stroke-linecap="round">${[0, 60, 120, 180, 240, 300].map(a => `<path d="M256 256 m${(30 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(30 * Math.sin(a * Math.PI / 180)).toFixed(1)} l${(32 * Math.cos((a + 70) * Math.PI / 180)).toFixed(1)} ${(32 * Math.sin((a + 70) * Math.PI / 180)).toFixed(1)}"/>`).join('')}</g></g>`))],
  // Bruch 1/10 auf dem Etikett
  onetenth: ['One Tenth', 'Eine Zehntelsekunde', wrap(defs('#e11d48', '#7c3aed', '#fb7185', '#a78bfa'),
    disc(`<g filter="url(#ss)" fill="#fff" ${font} text-anchor="middle"><text x="232" y="250" font-size="64">1</text><text x="282" y="316" font-size="58">10</text></g>
      <path d="M220 312 L296 200" stroke="#fff" stroke-width="10" stroke-linecap="round"/>`))],
};

const set = process.argv[2] === '2' ? LOGOS2 : LOGOS;
const sheetName = process.argv[2] === '2' ? 'sheet2.html' : 'sheet.html';
let cards = '';
for (const [id, [name, sub, svg]] of Object.entries(set)) {
  fs.writeFileSync(path.join(out, id + '.svg'), svg);
  // Im Übersichtsblatt stehen mehrere SVGs in einer Seite → IDs (Verläufe, Filter) eindeutig machen
  const u = p => svg.replace(/id="(\w+)"/g, `id="${p}-$1"`).replace(/url\(#(\w+)\)/g, `url(#${p}-$1)`);
  cards += `<div class="c"><div class="i">${u(id + 'a')}</div><b>${name}</b><span>${sub}</span><div class="s">${u(id + 'b')}</div></div>`;
}
fs.writeFileSync(path.join(out, sheetName), `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;900&display=swap" rel="stylesheet">
<style>body{margin:0;background:#0c0c0f;color:#f4f4f6;font-family:Outfit,system-ui,sans-serif;padding:36px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.c{background:#1a1a20;border:1px solid #2a2a33;border-radius:26px;padding:26px;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative}
.i{width:210px;height:210px;border-radius:48px;overflow:hidden;box-shadow:0 18px 40px -16px #000;margin-bottom:10px}
b{font-size:28px;font-weight:900}span{color:#a1a1ad;font-size:16px}.s{position:absolute;top:22px;right:22px;width:44px;height:44px;border-radius:11px;overflow:hidden}</style>
<div class="g">${cards}</div>`);
console.log('ok', Object.keys(LOGOS).length);
