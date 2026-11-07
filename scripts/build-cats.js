// Baut die Songlisten der Kategorien: data/cats/<id>.json
// Quellen stehen in data/sources.json (Deezer-Playlists). Alle Playlists einer Kategorie werden gemischt,
// doppelte Songs entfernt (gleiche ISRC oder gleicher Titel + Interpret, ohne „(Remastered)“, „feat.“ usw.)
// und sehr unbekannte Songs (Deezer-Rang unter minRank) weggelassen. Höchstens „max“ Songs je Kategorie, die bekanntesten zuerst.
// Das Spiel lädt dann eine fertige Datei statt vieler Playlists – schneller, vor allem am Handy.
//
// Aufruf:  node scripts/build-cats.js            alle Kategorien
//          node scripts/build-cats.js 00s 10s    nur diese
// Läuft monatlich automatisch (GitHub Action „Songlisten aktualisieren“). Node 18+, braucht Internet.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sources.json'), 'utf8'));
const OUT = path.join(ROOT, 'data', 'cats');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// gleiche Vereinheitlichung wie im Spiel (js/quiz.js: norm)
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/\b(feat|ft|featuring)\b.*$/, '')
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

let last = 0;
async function api(p) {
  for (let i = 0; i < 6; i++) {
    const wait = last + 130 - Date.now();                     // Deezer erlaubt etwa 50 Anfragen in 5 Sekunden
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const d = await (await fetch('https://api.deezer.com' + p)).json();
      if (d.error?.code === 4) { await sleep(5000); continue; } // zu viele Anfragen → kurz warten
      return d;
    } catch { await sleep(2000); }
  }
  return {};
}
async function playlist(id) {
  const out = [];
  let title = '';
  for (let index = 0; index < 1000; index += 100) {
    const d = await api(`/playlist/${id}/tracks?index=${index}&limit=100`);
    if (d.error) { console.log(`   ⚠️  Playlist ${id}: ${d.error.message}`); break; }
    out.push(...(d.data || []));
    if (!d.next) break;
  }
  if (!out.length) title = '(leer oder nicht gefunden)';
  return { out, title };
}

(async () => {
  const only = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [cat, ids] of Object.entries(cfg.cats)) {
    if (only.length && !only.includes(cat)) continue;
    const minRank = cfg.minRankFor?.[cat] ?? cfg.minRank;
    const byKey = new Map();                                  // Titel+Interpret → bester Eintrag
    const isrcKey = new Map();
    let raw = 0, empty = [];
    for (const id of ids) {
      const { out } = await playlist(id);
      if (!out.length) empty.push(id);
      raw += out.length;
      for (const t of out) {
        if (!t.readable || !t.preview) continue;
        const k = norm(t.title_short || t.title) + '|' + norm(t.artist?.name);
        const k0 = isrcKey.get(t.isrc) || k;                  // gleiche ISRC → derselbe Song, auch bei anderem Titel
        const old = byKey.get(k0);
        if (!old || (t.rank || 0) > old.rank) {
          byKey.set(k0, { id: t.id, title: t.title, artist: t.artist?.name || '', rank: t.rank || 0, ...(t.explicit_lyrics ? { x: 1 } : {}) });
          if (t.isrc) isrcKey.set(t.isrc, k0);
        }
      }
    }
    // einzelne Interpreten, die in dieser Kategorie nichts verloren haben (sources.json → exclude)
    const banned = new Set((cfg.exclude?.[cat] || []).map(a => norm(a)));
    const all = [...byKey.values()].filter(t => !banned.has(norm(t.artist))).sort((a, b) => b.rank - a.rank);
    const tracks = all.filter(t => t.rank >= minRank).slice(0, cfg.max);
    const r = tracks.map(t => t.rank), med = r[r.length >> 1] || 0;
    const file = path.join(OUT, cat + '.json');
    const before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).tracks.length : 0;
    // Sicherheitsnetz: nie eine deutlich kleinere Liste schreiben (z. B. wenn Deezer gerade Fehler liefert)
    if (before && tracks.length < before * 0.6) { console.log(`✗ ${cat}: nur ${tracks.length} statt bisher ${before} Songs – Liste bleibt unverändert`); continue; }
    fs.writeFileSync(file, JSON.stringify({ built: new Date().toISOString().slice(0, 10), sources: ids.length, tracks }));
    console.log(`✓ ${cat.padEnd(8)} ${String(tracks.length).padStart(4)} Songs (aus ${raw} Einträgen, ${all.length} ohne Doppelte, Median-Rang ${Math.round(med / 1000)}k)` +
      (empty.length ? `  ⚠️ leer: ${empty.join(', ')}` : ''));
  }
})();
