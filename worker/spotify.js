// Needle Drop – Spotify-Vermittler (Cloudflare Worker)
// Liest die Songliste einer öffentlichen Spotify-Playlist bzw. eines Albums aus der Einbettungs-Seite
// (open.spotify.com/embed/…) und gibt nur Titel + Interpret zurück. Kein Login, keine Speicherung, kein Logging.
// Der Browser kann die Seite wegen CORS nicht selbst abrufen – genau dafür ist dieser Worker da.
//
// Aufruf: GET https://<worker>/?type=playlist&id=37i9dQZF1DXcBWIGoYBM5M
// Antwort: { name, tracks: [{ t: "Titel", a: "Interpret" }, …] }   (max. 100 Songs – mehr liefert Spotify dort nicht)

const ALLOWED = ['https://ku3rb1s.github.io', 'http://127.0.0.1:8890', 'http://localhost:8890'];

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'playlist';
    const id = url.searchParams.get('id') || '';
    if (!['playlist', 'album'].includes(type) || !/^[A-Za-z0-9]{22}$/.test(id))
      return json({ error: 'Ungültiger Spotify-Link' }, 400, cors);

    // 1 Stunde zwischenspeichern (Cloudflare-Cache) – schont Spotify und macht wiederholte Abrufe schnell
    const cache = caches.default;
    const key = new Request(`https://cache.needle-drop/${type}/${id}`);
    const hit = await cache.match(key);
    if (hit) return withCors(hit, cors);

    const res = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NeedleDrop/1.0)', 'Accept-Language': 'de' },
    });
    if (!res.ok) return json({ error: res.status === 404 ? 'Playlist nicht gefunden oder privat' : 'Spotify antwortet nicht' }, 502, cors);

    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    let entity;
    try { entity = JSON.parse(m[1]).props.pageProps.state.data.entity; } catch { entity = null; }
    if (!entity || !Array.isArray(entity.trackList))
      return json({ error: 'Songliste nicht lesbar – ist die Playlist öffentlich?' }, 502, cors);

    const out = {
      name: entity.name || entity.title || '',
      tracks: entity.trackList
        .filter(x => x && x.title && (x.entityType === 'track' || !x.entityType))
        .map(x => ({ t: x.title, a: x.subtitle || '', e: x.isExplicit ? 1 : 0 })),
    };
    const resp = json(out, 200, { 'Cache-Control': 'public, max-age=3600' });
    ctx.waitUntil(cache.put(key, resp.clone()));
    return withCors(resp, cors);
  },
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}
function withCors(resp, cors) {
  const r = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
  return r;
}
