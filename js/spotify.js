/* Spotify-Playlists ins Quiz holen.
   1. Songliste (Titel + Interpret) über unseren kleinen Cloudflare Worker (worker/spotify.js) – ohne Spotify-Login.
   2. Jeder Song wird erst kurz bevor er drankommt bei Deezer gesucht (dort gibt es die abspielbare Vorschau).
      So startet das Spiel sofort, statt erst 100 Songs zuzuordnen. */
const Spot = (() => {
  // Adresse des Workers. Lokal (node server.js) läuft er mit „npx wrangler dev“ auf Port 8787.
  const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const PROXY = LOCAL ? 'http://127.0.0.1:8787' : 'https://needle-drop-spotify.WORKERS-SUBDOMAIN.workers.dev';
  const ready = () => LOCAL || !PROXY.includes('WORKERS-SUBDOMAIN');

  /** Spotify-Link → { kind: 'playlist'|'album', id } oder null */
  function parse(str) {
    const m = String(str).match(/(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?|spotify:)(playlist|album)[/:]([A-Za-z0-9]{22})/);
    return m ? { kind: m[1], id: m[2] } : null;
  }

  /** Songliste holen → Platzhalter-Einträge, die erst beim Spielen zu Deezer-Songs werden */
  async function tracks({ kind, id }) {
    if (!ready()) throw new Error(tx('Spotify-Import ist noch nicht eingerichtet.'));
    let r;
    try { r = await fetch(`${PROXY}/?type=${kind}&id=${id}`); }
    catch { throw new Error(tx('Spotify-Import gerade nicht erreichbar.')); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error(tx(d.error || 'Spotify-Playlist konnte nicht geladen werden.'));
    return d.tracks.map((x, i) => ({
      id: null, sp: true, stub: true, title: x.t, artist: { name: x.a.split(',')[0].trim() }, allArtists: x.a,
      explicit_lyrics: !!x.e, rank: 0, spIndex: i,
    }));
  }

  /** Einen Spotify-Song bei Deezer finden (gleicher Titel + gleicher Hauptinterpret, bekannteste Version) */
  async function match(t) {
    const title = t.title.replace(/\s*[([].*$/, '').replace(/\s+-\s+.*$/, '');
    const nt = norm(title), na = norm(t.artist.name);
    const ok = x => x.readable && x.preview
      && (norm(showTitle(x)).startsWith(nt) || nt.startsWith(norm(showTitle(x))))
      && artistNames(x).some(a => a.includes(na) || na.includes(a));
    for (const q of [`artist:"${t.artist.name}" track:"${title}"`, `${t.artist.name} ${title}`]) {
      const res = (await DZ.search(q, 10)).filter(ok).sort((a, b) => b.rank - a.rank);
      if (res[0]) return res[0];
    }
    throw new Error('nicht bei Deezer');
  }

  return { parse, tracks, match, ready };
})();
