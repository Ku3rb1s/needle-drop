/* Deezer-Anbindung: Die API schickt keine CORS-Header, kann aber JSONP.
   Die Vorschau-MP3s (cdnt-preview.dzcdn.net) erlauben CORS – die lädt audio.js direkt per fetch. */
const DZ = (() => {
  let n = 0;
  // Deezer-Fehlercodes verständlich machen (https://developers.deezer.com/api/errors)
  const errText = e => ({
    4: tx('Deezer ist gerade überlastet – bitte kurz warten und nochmal versuchen.'),
    700: tx('Deezer ist gerade nicht erreichbar.'),
    800: tx('Nicht gefunden – ist die Playlist öffentlich und der Link richtig?'),
  })[e.code] || tx('Deezer-Fehler: {m}', { m: e.message || tx('unbekannt') });

  function jsonp(path, params = {}) {
    return new Promise((resolve, reject) => {
      const cb = `__dz${++n}_${Date.now().toString(36)}`;
      const s = document.createElement('script');
      const timer = setTimeout(() => done(new Error(tx('Deezer antwortet nicht'))), 12000);
      function done(err, data) {
        clearTimeout(timer);
        window[cb] = () => {}; // falls die Antwort nach dem Timeout noch kommt
        s.remove();
        err ? reject(err) : resolve(data);
      }
      window[cb] = d => (d && d.error) ? done(new Error(errText(d.error))) : done(null, d);
      s.onerror = () => done(new Error(tx('Deezer nicht erreichbar')));
      s.src = `https://api.deezer.com${path}?${new URLSearchParams({ ...params, output: 'jsonp', callback: cb })}`;
      document.head.appendChild(s);
    });
  }

  /** Alle Titel einer Playlist (seitenweise, max. 1000). */
  async function playlistTracks(id) {
    const out = [];
    for (let index = 0; index < 1000; index += 100) {
      const d = await jsonp(`/playlist/${id}/tracks`, { index, limit: 100 });
      out.push(...(d.data || []));
      if (!d.next) break;
    }
    return out;
  }

  async function artistTop(id) {
    const d = await jsonp(`/artist/${id}/top`, { limit: 100 });
    return d.data || [];
  }

  /** Quelle: { type:'playlist'|'artist', id } */
  async function sourceTracks(src) {
    return src.type === 'artist' ? artistTop(src.id) : playlistTracks(src.id);
  }

  const search = (q, limit = 8) => jsonp('/search', { q, limit }).then(d => d.data || []);
  const track = id => jsonp(`/track/${id}`);
  const album = id => jsonp(`/album/${id}`);

  /** Deezer-Link oder ID → Quelle. Kurzlinks (link.deezer.com) lassen sich per JSONP nicht auflösen. */
  function parseLink(str) {
    str = (str || '').trim();
    let m = str.match(/deezer\.com\/(?:[a-z]{2}\/)?(playlist|artist)\/(\d+)/i);
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    if (/^\d{4,}$/.test(str)) return { type: 'playlist', id: str };
    if (/spotify\.link/.test(str)) return { error: tx('Spotify-Kurzlinks gehen nicht – bitte den Link von open.spotify.com nehmen (Teilen → Link kopieren, am besten im Browser).') };
    if (/spotify\.com|spotify:/.test(str)) {
      const s = typeof Spot !== 'undefined' && Spot.parse(str);
      return s ? { type: 'spotify', ...s } : { error: tx('Das ist kein Spotify-Playlist- oder Album-Link.') };
    }
    if (/link\.deezer\.com|deezer\.page\.link/.test(str)) return { error: tx('Kurzlinks gehen nicht – bitte den Link aus der Adresszeile von deezer.com nehmen.') };
    return { error: tx('Kein gültiger Link – bitte einen Spotify- oder Deezer-Link einfügen.') };
  }

  return { jsonp, sourceTracks, search, track, album, parseLink };
})();
