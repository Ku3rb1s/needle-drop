// Tages-Challenge vorab berechnen: data/daily/JJJJ-MM-TT.json (heute − 30 bis heute + 14 Tage, Europe/Berlin).
// Website und iPhone-App spielen aus dieser Datei → überall exakt dieselben Songs. Fehlt sie, rechnet das Spiel wie bisher selbst.
//
//   node scripts/build-daily.js            fehlende Tage schreiben (vorhandene bleiben unangetastet)
//   node scripts/build-daily.js --force    auch vorhandene neu schreiben (nur wenn wirklich nötig: ändert veröffentlichte Challenges)
//   node scripts/build-daily.js --check    jede Datei im Bereich mit der Berechnung im Spiel vergleichen (schreibt nichts)
//
// Nichts neu programmiert: Die Auswahl kommt aus js/daily-pick.js, Namensvergleich (norm) und Pool (loadPool) werden
// unverändert aus js/quiz.js gelesen und in Node ausgeführt. Keine Deezer-Anfragen – nur data/billions.json.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'data/daily');
const BEFORE = 30, AFTER = 14, TZ = 'Europe/Berlin';
const args = process.argv.slice(2), FORCE = args.includes('--force'), CHECK = args.includes('--check');

// --- Spiel-Code laden ---
const quiz = fs.readFileSync(path.join(ROOT, 'js/quiz.js'), 'utf8');
function grab(startText) {                   // Anweisung/Funktion aus quiz.js ausschneiden (bis zur passenden Klammer bzw. zum ;)
  const i = quiz.indexOf(startText);
  if (i < 0) throw new Error('Nicht in js/quiz.js gefunden: ' + startText);
  if (startText.startsWith('const')) return quiz.slice(i, quiz.indexOf(';\n', i) + 1);
  let depth = 0, j = quiz.indexOf('{', i);
  for (; j < quiz.length; j++) { if (quiz[j] === '{') depth++; else if (quiz[j] === '}' && !--depth) break; }
  return quiz.slice(i, j + 1);
}
const ctx = vm.createContext({
  pools: {}, tx: s => s,
  fetch: async url => { const f = path.join(ROOT, url); return { ok: fs.existsSync(f), json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) }; },
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/daily-pick.js'), 'utf8').replace(/^const DailyPick/m, 'var DailyPick'), ctx);
vm.runInContext([grab('const norm = '), grab('async function loadPool(cat)')].join('\n').replace(/^const norm/, 'var norm'), ctx);
const { DailyPick, norm, loadPool } = ctx;
const BILLION = { id: 'billion', src: [{ type: 'static', url: 'data/billions.json' }] };   // wie in CATS (js/quiz.js)

// --- Tage ---
const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);
const days = [];
for (let n = -BEFORE; n <= AFTER; n++) { const d = addDays(today, n); if (d >= DailyPick.START) days.push(d); }

const fileFor = (pool, d) => ({
  v: 1, game: 'needle-drop', day: d, no: DailyPick.dayNo(d),
  // Kandidaten in fester Reihenfolge; gespielt werden die ersten 5 mit Hörprobe (Songs ohne Hörprobe überspringt das Spiel).
  // Hörprobe und Cover holt der Client wie bisher bei Deezer über die ID (Vorschau-Links laufen ab, Deezer liefert je Land anderes).
  items: DailyPick.cand(pool, d, norm).map(t => ({ id: t.id, title: t.title, artist: t.artist.name, rank: t.rank, ...(t.explicit_lyrics ? { x: 1 } : {}) })),
});
const same = (a, b) => JSON.stringify(a.items.map(t => t.id)) === JSON.stringify(b.items.map(t => t.id));

(async () => {
  const pool = await loadPool(BILLION);
  fs.mkdirSync(OUT, { recursive: true });
  let wrote = 0, kept = 0, bad = 0, missing = 0;
  for (const d of days) {
    const f = path.join(OUT, d + '.json'), want = fileFor(pool, d);
    if (CHECK) {
      if (!fs.existsSync(f)) { missing++; continue; }
      const have = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (have.v === 1 && have.day === d && have.no === want.no && same(have, want)) kept++;
      else { bad++; console.log(`✗ ${d}: Datei weicht von der Berechnung im Spiel ab`); }
      continue;
    }
    if (fs.existsSync(f) && !FORCE) { kept++; continue; }
    const { items, ...head } = want;           // ein Song pro Zeile – gut lesbar, kleine Diffs
    fs.writeFileSync(f, JSON.stringify(head).slice(0, -1) + ',"items":[\n' + items.map(t => JSON.stringify(t)).join(',\n') + '\n]}\n');
    wrote++;
  }
  if (CHECK) {
    console.log(`Prüfung ${days[0]} bis ${days.at(-1)}: ${kept} gleich, ${bad} abweichend, ${missing} ohne Datei (Pool: ${pool.length} Songs)`);
    if (bad) console.log('Hinweis: Nach einer neuen data/billions.json weichen schon geschriebene Tage ab – gewollt, veröffentlichte Challenges bleiben fest.');
    process.exit(bad ? 1 : 0);
  }
  console.log(`${wrote} neu geschrieben, ${kept} schon vorhanden (${days[0]} bis ${days.at(-1)})`);
})().catch(e => { console.error(e); process.exit(1); });
