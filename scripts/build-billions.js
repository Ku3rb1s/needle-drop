// Baut data/billions.json: alle Songs mit ≥ 1 Mrd. Spotify-Streams (Quelle: kworb.net),
// zugeordnet zu Deezer-IDs, damit das Quiz die Vorschau abspielen kann.
// Aufruf: node scripts/build-billions.js   (Node 18+, braucht Internet; ca. 3–5 Minuten)
const fs = require('fs');
const path = require('path');

const MIN = 1e9;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/feat\..*$/, '')
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function deezer(q) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch('https://api.deezer.com/search?limit=10&q=' + encodeURIComponent(q));
    const d = await r.json();
    if (d.error && d.error.code === 4) { await sleep(5000); continue; } // Quota: 50 Anfragen / 5 s
    return d.data || [];
  }
  return [];
}

(async () => {
  const html = await (await fetch('https://kworb.net/spotify/songs.html', { headers: { 'User-Agent': 'Mozilla/5.0 musik-quiz-build' } })).text();
  const rows = [...html.matchAll(/<tr><td class="text"><div>(.*?)<\/div><\/td><td>([\d,]+)<\/td>/g)]
    .map(m => ({ name: decode(m[1].replace(/<[^>]+>/g, '')), streams: +m[2].replace(/,/g, '') }))
    .filter(r => r.streams >= MIN);
  console.log(rows.length, 'Songs mit ≥ 1 Mrd. Streams');

  const out = [], missing = [];
  for (const [i, r] of rows.entries()) {
    const k = r.name.indexOf(' - ');
    const artist = r.name.slice(0, k), title = r.name.slice(k + 3);
    const main = artist.split(/,| & | x | feat\. | with /i)[0].trim();
    let res = await deezer(`artist:"${main}" track:"${title.replace(/\s*[([].*$/, '')}"`);
    if (!res.length) res = await deezer(`${main} ${title.replace(/\s*[([].*$/, '')}`);
    const nt = norm(title), na = norm(main);
    const hit = res
      .filter(t => t.readable && t.preview)
      .filter(t => (norm(t.title).startsWith(nt) || nt.startsWith(norm(t.title))) && norm(t.artist.name).includes(na.split(' ')[0]))
      .sort((a, b) => b.rank - a.rank)[0];
    if (hit) out.push({ id: hit.id, title: hit.title_short || hit.title, artist: hit.artist.name, streams: r.streams });
    else missing.push(r.name);
    if (i % 50 === 0) console.log(i, '/', rows.length);
    await sleep(110);
  }

  const seen = new Set();
  const list = out.filter(t => !seen.has(t.id) && seen.add(t.id));
  // Sicherung: Ist kworb.net/Deezer gestört, lieber abbrechen als eine halbe Liste speichern
  if (list.length < 1000) { console.error(`Nur ${list.length} Songs zugeordnet – Liste wird NICHT überschrieben.`); process.exit(1); }
  const file = path.join(__dirname, '..', 'data', 'billions.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ source: 'kworb.net/spotify/songs.html', built: new Date().toISOString().slice(0, 10), tracks: list }));
  console.log(`Fertig: ${list.length} zugeordnet, ${missing.length} nicht gefunden`);
  if (missing.length) console.log('Nicht gefunden:\n  ' + missing.join('\n  '));
})();
