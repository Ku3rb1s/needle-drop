/* Needle Drop – Spielablauf und Anzeige */
const APP_VERSION = '1.16.17', APP_DATE = '08.11.2026'; // bei jedem Update erhöhen + CHANGELOG.md ergänzen
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Regeln ----------
   Punkte je Stufe: 600 / 500 / 400 / 300 / 200 / 100.
   Nur Interpret erkannt (Song nicht): halbe Punkte der Stufe, auf der der Interpret stimmte.
   Tipps ziehen feste Punkte ab (50 / 100 / 150), nie unter 0. */
const LADDERS = {
  easy: [0.5, 1, 2, 4, 8, 15],
  classic: [0.1, 0.5, 1, 2, 5, 10],
  pro: [0.1, 0.2, 0.4, 0.8, 1.5, 3],
};
let STEPS = LADDERS.classic; // wird beim Spielstart aus den Einstellungen gesetzt
const START_INFO = {
  start: 'Der Ausschnitt beginnt dort, wo die 30-s-Vorschau anfängt (Stille wird übersprungen). Deezer-Vorschauen sind nicht immer der echte Song-Anfang.',
  hook: 'Sucht die lauteste Passage der Vorschau – meist Refrain oder Drop – und startet beim Einsatz davor.',
  random: 'Irgendeine laute Stelle der Vorschau – am schwersten.',
};
const PTS = [600, 500, 400, 300, 200, 100];
// Spielmodi – „Standard“ ist das normale Spiel
const MODES = {
  standard: { label: 'Standard', icon: '', info: 'Titel und Interpret erkennen – das normale Spiel.' },
  crazy: { label: 'Verrückt', icon: '🌀', info: 'Die Ausschnitte werden verzerrt: rückwärts, unter Wasser, schneller oder langsamer. Die Auflösung läuft normal.' },
  artist: { label: 'Nur Interpret', icon: '🎤', info: 'Es reicht, den Interpreten zu erkennen – leichter, gut für gemischte Runden.' },
};
const FX_NAMES = { random: 'Zufall', reverse: 'Rückwärts', underwater: 'Unterwasser', chipmunk: 'Chipmunk', slow: 'Zeitlupe' };
const FX_LIST = ['reverse', 'underwater', 'chipmunk', 'slow'];
const HINT_COST = [50, 100, 150];
const HINT_FROM = 1; // Tipps erst ab Stufe 2 (je nach Leiter 0,2 / 0,5 / 1 s)
const LOC = () => ({ de: 'de-DE', en: 'en-GB', fr: 'fr-FR', es: 'es-ES', nb: 'nb-NO' }[curLang] || 'de-DE');
const fmtS = s => s.toLocaleString(LOC()) + ' s';
const fmtN = n => Math.round(n).toLocaleString(LOC());

// Quellen: Deezer-Redaktions-Playlists; Billionärs Club als eigene Liste (scripts/build-billions.js)
const P = id => ({ type: 'playlist', id });
// Fertig gemischte Songliste einer Kategorie (gebaut von scripts/build-cats.js aus den Playlists in data/sources.json)
const C = id => ({ type: 'static', url: `data/cats/${id}.json` });
// Latin-Kategorie: nur Songs dieser Interpreten aus dem Billionärs Club – also nur Latin-Hits mit über 1 Mrd. Streams
const LATIN_ARTISTS = ['Bad Bunny', 'J Balvin', 'Daddy Yankee', 'Shakira', 'Enrique Iglesias', 'Ozuna', 'KAROL G', 'Maluma', 'Rauw Alejandro',
  'Luis Fonsi', 'Nicky Jam', 'Don Omar', 'Anuel AA', 'Sebastián Yatra', 'Camilo', 'Myke Towers', 'Jhayco', 'Jhay Cortez', 'Farruko', 'Feid',
  'Peso Pluma', 'Becky G', 'Natti Natasha', 'Romeo Santos', 'Marc Anthony', 'Ricky Martin', 'Manuel Turizo', 'Quevedo', 'Bizarrap', 'ROSALÍA',
  'TINI', 'Reik', 'Prince Royce', 'Wisin', 'Yandel', 'Wisin & Yandel', 'Juanes', 'Carlos Vives', 'Gente De Zona', 'Danny Ocean', 'Lunay', 'Sech',
  'Mau y Ricky', 'CNCO', 'Arcángel', 'Tainy', 'Grupo Frontera', 'Eslabon Armado', 'Fuerza Regida', 'Junior H', 'Natanael Cano', 'Young Miko',
  'Xavi', 'Morat', 'Aitana', 'Lola Indigo', 'Bad Gyal', 'Mora', 'Chencho Corleone', 'Dalex', 'Piso 21', 'Cali Y El Dandee', 'Alvaro Soler'];
const CATS = [
  { id: '70s', group: 'decades', name: '70er', big: '70s', color: '#e08a1e', src: [C('70s')], decade: 1970 },
  { id: '80s', group: 'decades', name: '80er', big: '80s', color: '#e043f5', src: [C('80s')], decade: 1980 },
  { id: '90s', group: 'decades', name: '90er', big: '90s', color: '#7c4dff', src: [C('90s')], decade: 1990 },
  { id: '00s', group: 'decades', name: '2000er', big: '00s', color: '#3b82f6', src: [C('00s')], decade: 2000 },
  { id: '10s', group: 'decades', name: '2010er', big: '10s', color: '#10b981', src: [C('10s')], decade: 2010 },
  { id: '20s', group: 'decades', name: '2020er', big: '20s', color: '#8ace00', src: [C('20s')], decade: 2020 },
  // International
  { id: 'pop', group: 'intl', name: 'Pop', icon: 'star', sub: 'Chart-Pop von früher bis heute', color: '#ff6eb4', src: [C('pop')] },
  { id: 'rap', group: 'intl', name: 'Hip-Hop & Rap', icon: 'mic', sub: 'US-Rap von den 90ern bis heute', color: '#f5b301', src: [C('rap')] },
  { id: 'rnb', group: 'intl', name: 'R&B', icon: 'heart', sub: 'Klassiker aus den 90ern und 2000ern', color: '#a855f7', src: [C('rnb')] },
  { id: 'rock', group: 'intl', name: 'Rock', icon: 'guitar', sub: 'Klassiker und große Hymnen', color: '#e11d1d', src: [C('rock')] },
  { id: 'edm', group: 'intl', name: 'EDM', icon: 'wave', sub: 'Avicii, Guetta, Calvin Harris & Dance-Klassiker', color: '#5b5cf6', src: [C('edm')] },
  { id: 'latin', group: 'intl', name: 'Latin', icon: 'sun', sub: 'Reggaeton und Latin-Hits', color: '#ff7a1a', src: [{ type: 'static', url: 'data/billions.json', artists: LATIN_ARTISTS }, C('latin')] },
  // Deutsch
  { id: 'derap', group: 'de', name: 'Deutschrap', icon: 'mic', sub: 'Von den Klassikern bis heute', color: '#c81e4a', src: [C('derap')] },
  { id: 'depop', group: 'de', name: 'Deutsch-Pop', icon: 'star', sub: 'Deutschsprachige Pop-Hits', color: '#38bdf8', src: [C('depop')] },
  { id: 'schlager', group: 'de', name: 'Schlager & Party', icon: 'party', sub: 'Schlager, Malle, Après-Ski', color: '#ff4fa3', src: [C('schlager')] },
  { id: 'ndw', group: 'de', name: 'Neue Deutsche Welle', icon: 'sea', sub: 'Die 80er auf Deutsch', color: '#f7e400', src: [C('ndw')] },
  // Spezial
  { id: 'now', group: 'special', name: 'Aktuelle Hits', icon: 'trend', sub: 'Charts Deutschland & weltweit', color: '#22c55e', src: [P(1111143121), P(3155776842), P(785141981), P(65490170)] },
  { id: 'billion', group: 'special', name: 'Billionärs Club', icon: 'diamond', sub: 'Über 1 Mrd. Spotify-Streams', color: '#e5a50a', src: [{ type: 'static', url: 'data/billions.json' }] },
  { id: 'tiktok', group: 'special', name: 'TikTok-Hits', icon: 'phone', sub: 'Was gerade viral geht', color: '#25f4ee', src: [P(4403076402), P(8740958602), P(10920666262)] },
  { id: 'film', group: 'special', name: 'Film & Serien', icon: 'clapper', sub: 'Soundtracks und Titelsongs', color: '#d62d3a', src: [C('film')] },
  { id: 'disney', group: 'special', name: 'Disney', icon: 'castle', sub: 'Die großen Disney-Songs im Original', color: '#2f6bff', src: [C('disney')] },
  { id: 'esc', group: 'special', name: 'Eurovision', icon: 'globe', sub: 'Sieger und Fan-Lieblinge', color: '#9b5cf6', src: [C('esc')] },
  { id: 'custom', group: 'special', name: 'Eigene Playlist', icon: 'link', sub: 'Spotify- oder Deezer-Link', color: '#6b7280', src: null },
];
const GROUPS = [['decades', 'Jahrzehnte'], ['intl', 'International'], ['de', 'Deutsch'], ['special', 'Spezial']];
const DIFF = {
  easy: { top: 0.35, label: 'Leicht', info: 'Nur die bekanntesten 35 % der Kategorie – Songs, die fast jeder kennt.' },
  normal: { top: 0.7, label: 'Normal', info: 'Die bekannteren 70 % der Kategorie: viele Hits, dazu Songs, an die man sich erst erinnern muss.' },
  hard: { top: 1, label: 'Schwer', info: 'Die komplette Kategorie – auch Album-Tracks und Songs, die nicht jeder kennt.' },
};
// Farbthemen wie in Musik-Bingo
const THEMES = [['graphit', 'Graphit', '#3a4252', '#1f3a32'], ['ozean', 'Ozean', '#0b4f75', '#0d6e66'], ['wald', 'Wald', '#1d5a3a', '#4c5b1a'],
  ['abend', 'Abend', '#7a2e1c', '#7d1f4a'], ['lila', 'Lila', '#4a22a0', '#8a1458'], ['oled', 'OLED', '#000', '#000']];

// Namen/Beschreibungen werden beim Auslesen übersetzt (tx) – so gilt die gewählte Sprache überall
const trProps = (o, keys) => keys.forEach(k => { if (o[k] == null) return; const v = o[k]; Object.defineProperty(o, k, { get: () => tx(v), enumerable: true, configurable: true }); });
CATS.forEach(c => trProps(c, ['name', 'sub']));
Object.values(DIFF).forEach(d => trProps(d, ['label', 'info']));
trProps(START_INFO, ['start', 'hook', 'random']);

const LS = {
  get(k, d) { try { const v = localStorage.getItem('mq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mq.' + k, JSON.stringify(v)); } catch {} },
};

const opt = {
  cat: LS.get('cat', '80s'), diff: LS.get('diff', 'normal'), count: LS.get('count', 10),
  startMode: LS.get('startMode2', 'start'), hintsOn: LS.get('hintsOn', 'on'), theme: LS.get('theme', 'graphit'),
  ladder: LS.get('ladder', 'classic'), answer: LS.get('answer', 'search'), auto: LS.get('auto', false),
  clean: LS.get('clean', false), vol: LS.get('vol', 80), muted: false, sfx: LS.get('sfx', true),
  mode: LS.get('mode', 'standard'), fx: LS.get('fx', 'random'),
};
// Gespeicherte Werte prüfen – unbekannte (z. B. nach Umbauten) auf Standard zurücksetzen
if (!CATS.some(c => c.id === opt.cat)) opt.cat = '80s';
if (!DIFF[opt.diff]) opt.diff = 'normal';
if (!LADDERS[opt.ladder]) opt.ladder = 'classic';
if (!START_INFO[opt.startMode] && !['start', 'hook', 'random'].includes(opt.startMode)) opt.startMode = 'start';
if (![5, 10, 15, 20].includes(opt.count)) opt.count = 10;
if (!['search', 'mc'].includes(opt.answer)) opt.answer = 'search';
if (!MODES[opt.mode]) opt.mode = 'standard';
if (!FX_NAMES[opt.fx]) opt.fx = 'random';

// Während der Tages-Challenge gelten feste Regeln (für alle gleich), sonst die eigenen Einstellungen
const DAILY_RULES = { answer: "search", startMode: "start", hintsOn: "on", mode: "standard" };
const isArtistMode = () => rule('mode') === 'artist';
const rule = k => (G && G.daily && k in DAILY_RULES) ? DAILY_RULES[k] : opt[k];
const bestKey = (cat = opt.cat) => `best2.${cat}.${opt.diff}.${opt.count}.${opt.ladder}.${opt.answer}` + (opt.mode === 'standard' ? '' : `.${opt.mode}${opt.mode === 'crazy' ? '.' + opt.fx : ''}`);
const pools = {};
let G = null;
let catTab = null; // gerade offener Kategorie-Reiter auf der Startseite

/* ---------- Antworten vergleichen ---------- */
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/\b(feat|ft|featuring)\b.*$/, '')
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
/** Anzeigetitel ohne „(Remastered 2007)“, „- Radio Edit“ usw. */
const showTitle = t => (t.title_short || t.title || '')
  .replace(/\s*[([][^)\]]*(remaster|radio edit|single version|album version|edit\b|mono|stereo|deluxe|from )[^)\]]*[)\]]/gi, '')
  .replace(/\s+-\s+[^-]*(remaster|radio edit|version|edit\b|mono|stereo)[^-]*$/i, '').trim();
const artistNames = t => [t.artist?.name, ...(t.contributors || []).map(c => c.name)]
  .filter(Boolean).flatMap(n => n.split(/,|&| x | feat\.? | with /i)).map(norm).filter(Boolean);

function judge(g, t) {
  const ta = artistNames(t), ga = artistNames(g);
  const artistOk = (g.artist?.id != null && g.artist.id === t.artist?.id) || ga.some(a => ta.includes(a));
  const titleOk = norm(showTitle(g)) === norm(showTitle(t));
  const songOk = g.id === t.id || (g.isrc && g.isrc === t.isrc) || (titleOk && artistOk);
  return { songOk, artistOk, titleOk };
}

/* ---------- Songs laden ---------- */
async function loadPool(cat) {
  if (cat.id !== 'custom' && pools[cat.id]) return pools[cat.id];
  const lists = await Promise.all(cat.src.map(async s => {
    if (s.type === 'static') {
      const r = await fetch(s.url);
      if (!r.ok) throw new Error(tx('Liste für diese Kategorie fehlt noch.'));
      const d = await r.json();
      const only = s.artists && new Set(s.artists.map(a => a.toLowerCase()));
      return d.tracks.filter(t => !only || only.has(String(t.artist).toLowerCase())).map(t => ({ id: t.id, title: t.title, artist: { name: t.artist }, rank: t.rank ?? t.streams, explicit_lyrics: !!t.x, stub: true }));
    }
    if (s.type === 'spotify') return Spot.tracks(s);
    return DZ.sourceTracks(s);
  }));
  const seen = new Set(), pool = [];
  for (const t of lists.flat()) {
    if (!t.stub && (!t.readable || !t.preview)) continue;
    const k1 = t.isrc || t.id, k2 = norm(t.title_short || t.title) + '|' + norm(t.artist?.name);
    if ((k1 != null && seen.has(k1)) || seen.has(k2)) continue; // Spotify-Platzhalter haben noch keine ID
    if (k1 != null) seen.add(k1);
    seen.add(k2);
    pool.push(t);
  }
  if (cat.id !== 'custom') pools[cat.id] = pool;
  return pool;
}

function pickTracks(pool, diff, n) {
  const sorted = pool.filter(t => !opt.clean || !t.explicit_lyrics).sort((a, b) => (b.rank || 0) - (a.rank || 0));
  const top = sorted.slice(0, Math.max(n, Math.ceil(sorted.length * DIFF[diff].top)));
  for (let i = top.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [top[i], top[j]] = [top[j], top[i]]; }
  // Abwechslung: jeder Interpret möglichst nur einmal pro Spiel (Doppelte wandern ans Ende – nur genutzt, wenn sonst zu wenig da ist)
  const seen = new Set(), first = [], rest = [];
  for (const t of top) { const a = norm(t.artist?.name); (seen.has(a) ? rest : first).push(t); seen.add(a); }
  return [...first, ...rest];
}

/** Audio + Albuminfos einer Runde laden. Abgelaufene Vorschau-Links werden über /track/{id} erneuert. */
function prepare(r) {
  return r.ready ||= (async () => {
    let t = r.track;
    if (t.sp) t = r.track = await Spot.match(t);            // Spotify-Song → passender Deezer-Song
    else if (t.stub || !t.preview) t = r.track = await DZ.track(t.id);
    if (opt.clean && t.explicit_lyrics) throw new Error('explizit'); // Billionärs-Liste kennt das erst hier
    try { r.buf = await Snip.load(t.preview); }
    catch { t = r.track = await DZ.track(t.id); r.buf = await Snip.load(t.preview); }
    r.offset = Snip.findStart(r.buf, rule("startMode"), STEPS[STEPS.length - 1]);
    const showAlbum = a => {
      r.album = a;
      if (G && R() === r && !r.done && r.hints.length) renderHints(); // Tipp schon offen? Jahr/Genre nachtragen
      if (G && R() === r && r.done) {
        const y = a.release_date?.slice(0, 4); $('#rvMeta').textContent = [t.album?.title, y].filter(Boolean).join(' · ');
        if (t.album?.cover_big) $('#discCover').innerHTML = `<img src="${esc(t.album.cover_big)}" alt="">`;
      }
    };
    DZ.album(t.album.id).then(async a => {
      showAlbum(a);
      // Liegt der Song bei Deezer nur auf einem Sampler („Sommer Hits“ …)? Dann Cover, Album und Jahr vom Original
      const o = await originalAlbum(t, a);
      if (!o) return;
      t.album = { ...t.album, id: typeof o.id === 'number' ? o.id : t.album.id, title: o.title, md5_image: o.md5_image || t.album.md5_image,
        cover: o.cover, cover_small: o.cover_small, cover_medium: o.cover_medium, cover_big: o.cover_big, cover_xl: o.cover_xl };
      // Jahr vom Original; Genre aus Deezer behalten, falls das Original keins hat (MusicBrainz liefert keine Genres)
      showAlbum({ ...a, ...o, genres: o.genres?.data?.length ? o.genres : a.genres });
    }).catch(() => {});
  })();
}

/* ---------- Original-Cover statt Sampler-Cover ----------
   Deezer liefert das Album, auf dem der Track in der Playlist liegt – oft ein Sampler (Various Artists, „Bravo Hits“,
   späte Soundtracks). Dann wird das Album des Interpreten selbst gesucht: gleicher Titel, keine Remix/Live/Cover-Fassung,
   echte Alben/Singles vor Best-ofs. Gleiche Regeln wie Spiele-Hub/scripts/check-covers.js für Gold Record. */
const SAMPLER_ARTIST = /various|verschiedene|varios|divers|vari artisti|compilation|soundtrack|motion picture|cast|karaoke/i;
const OTHER_VERSION = /\b(live|karaoke|instrumental|acoustic|unplugged|tribute|cover|covers|remix|remixes|mix|edit|relift|rework|remake|re-?recorded|sped up|slowed|8-bit|lullaby|orchestral|piano|originally|performed by|made famous|in the style|version|a cappella|demo|en directo)\b/i;
const normCv = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, '')
  .replace(/\s+-\s+.*$/, '').replace(/\b(feat|ft|featuring)\b.*$/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const firstArtistCv = a => normCv(String(a).split(/,|&| x | und | and | feat\.? | ft\.? | with /i)[0]);
const sameArtistCv = (x, y) => { const a = normCv(x), b = normCv(y), fa = firstArtistCv(x), fb = firstArtistCv(y);
  return !!a && !!b && (a === b || fa === fb || a.includes(fb) || b.includes(fa)); };
const ownAlbumCv = (al, artist) => !!al?.artist?.name && sameArtistCv(al.artist.name, artist) && !SAMPLER_ARTIST.test(al.artist.name);
const originals = new Map();   // „Interpret|Titel“ → Promise<Album|null>
// Bild laden und erst dann zusagen (archive.org ist manchmal langsam – nach 5 s bleibt das bisherige Cover)
const imgOk = src => new Promise(res => { const i = new Image(); const to = setTimeout(() => res(false), 5000);
  i.onload = () => { clearTimeout(to); res(i.naturalWidth > 0); }; i.onerror = () => { clearTimeout(to); res(false); }; i.src = src; });
/** MusicBrainz: früheste Single/Album/EP mit dem Songtitel (keine Compilation, kein Live/Soundtrack), Cover aus dem Cover Art Archive */
let mbQueue = Promise.resolve();   // MusicBrainz erlaubt etwa 1 Abfrage pro Sekunde – Abfragen nacheinander mit Abstand
function mbOriginal(artist, title) {
  const run = mbQueue.then(() => mbLookup(artist, title));
  mbQueue = run.catch(() => null).then(() => new Promise(r => setTimeout(r, 1100)));
  return run;
}
async function mbLookup(artist, title) {
  const base = String(title).replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim(), a0 = artist.split(/ & | x | feat\.? | with |, /i)[0].trim();
  // Ohne Typ-Bedingung in der Suche (die lässt MusicBrainz manchmal leer zurückkommen) – der Typ wird unten geprüft
  const q = `releasegroup:"${base.replace(/"/g, '')}" AND (artist:"${artist.replace(/"/g, '')}" OR artist:"${a0.replace(/"/g, '')}")`;
  const r = await fetch('https://musicbrainz.org/ws/2/release-group?fmt=json&limit=25&query=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const T = base.toLowerCase().replace(/[’']/g, "'");
  const list = ((await r.json())['release-groups'] || []).filter(x => {
    const tt = String(x.title || '').toLowerCase().replace(/[’']/g, "'");
    const credit = (x['artist-credit'] || []).map(c => c.name || c.artist?.name).join(' ');
    return /^(single|album|ep)$/i.test(x['primary-type'] || '') && !(x['secondary-types'] || []).length
      && /^\d{4}/.test(x['first-release-date'] || '') && !OTHER_VERSION.test(x.title || '')
      && (tt === T || (tt.startsWith(T) && /^[\s/(:,–-]/.test(tt.slice(T.length)))) && sameArtistCv(credit, artist);
  }).sort((a, b) => a['first-release-date'].localeCompare(b['first-release-date']));
  for (const x of list.slice(0, 3)) {
    const u = s => `https://coverartarchive.org/release-group/${x.id}/front-${s}`;
    if (await imgOk(u(250))) return { id: 'mb:' + x.id, title: x.title, release_date: x['first-release-date'], cover: u(250), cover_small: u(250), cover_medium: u(250), cover_big: u(500), cover_xl: u(500), md5_image: '' };
  }
  return null;
}
function originalAlbum(t, al) {
  const artist = t.artist?.name || '', title = t.title_short || t.title || '';
  if (!al || !artist) return Promise.resolve(null);
  // Album vom Interpreten selbst: passt – außer es ist sein Best-of („The Very Best Of · 2009“ für einen Song von 1984).
  // Dann nur bei MusicBrainz nach dem Original schauen (richtiges Jahr für Tipp und Auflösung); sonst bleibt es.
  // Deezer führt Best-ofs oft als normales Album – darum auch am Titel erkennen
  const bestOf = ownAlbumCv(al, artist) && (al.record_type === 'compile'
    || /\b(best of|greatest hits|the hits|hits collection|collection|anthology|essential|essentials|gold|platinum|definitive|ultimate|singles|number ones|#1'?s)\b/i.test(al.title || ''));
  if (ownAlbumCv(al, artist) && !bestOf) return Promise.resolve(null);
  // Filmsong, der als solcher veröffentlicht wurde („Let It Go (From "Frozen")“): der Soundtrack ist das Original
  if (/\bfrom ["“'«]|soundtrack|motion picture/i.test(t.title || '')) return Promise.resolve(null);
  const key = artist + '|' + title;
  if (!originals.has(key)) originals.set(key, (async () => {
    const mb = await mbOriginal(artist, title).catch(() => null);
    if (mb || bestOf) return mb;
    const found = await DZ.search(`${artist} ${title}`, 25);
    const ids = [...new Set(found.filter(x => x.album?.id && sameArtistCv(x.artist?.name, artist) && normCv(x.title_short || x.title) === normCv(title)
      && !OTHER_VERSION.test(x.title || '') && !OTHER_VERSION.test(x.album.title || '')).map(x => x.album.id))].slice(0, 4);
    const own = [];
    for (const id of ids) { try { const a = await DZ.album(id); if (ownAlbumCv(a, artist) && !OTHER_VERSION.test(a.title || '')) own.push(a); } catch {} }
    own.sort((x, y) => (x.record_type === 'compile') - (y.record_type === 'compile'));   // sonst Deezer-Reihenfolge (bekannteste zuerst)
    return own[0] || null;
  })().catch(() => null));
  return originals.get(key);
}

/* ---------- Spiel ---------- */
let busy = false; // verhindert doppelte Starts/Rundenwechsel bei Doppelklick oder Leertaste
async function startGame() {
  if (busy) return;
  const cat = CATS.find(c => c.id === opt.cat);
  let c = cat;
  if (cat.id === 'custom') {
    const src = DZ.parseLink($('#customUrl').value);
    if (src.error) { toast(src.error); $('#customUrl').focus(); return; }
    LS.set('customUrl', $('#customUrl').value.trim());
    c = { ...cat, src: [src] };
  }
  loading(true, tx('Lade Songs…'));
  Snip.ac(); // Audio im Klick freischalten (iOS)
  busy = true;
  try {
    const pool = await loadPool(c);
    if (pool.length < 3) throw new Error(tx('Zu wenige abspielbare Songs in dieser Quelle.'));
    const cand = pickTracks(pool, opt.diff, opt.count);
    STEPS = LADDERS[opt.ladder] || LADDERS.classic;
    G = { cat, cand, pool, next: 0, rounds: [], i: -1, score: 0, n: Math.min(opt.count, cand.length) };
    setCat(cat.color);
    show('game');
    busy = false;
    await nextRound();
    if (!G) return;
    if (!G.rounds.length) throw new Error(tx('Keiner der Songs ließ sich laden. Versuch es gleich nochmal oder nimm eine andere Kategorie.'));
  } catch (e) {
    toast(e.message || tx('Fehler beim Laden'));
    G = null; show('home');
  } finally { busy = false; loading(false); }
}

function newRound() {
  const t = G.cand[G.next++];
  const fx = rule('mode') === 'crazy' ? (opt.fx === 'random' ? FX_LIST[Math.floor(Math.random() * FX_LIST.length)] : opt.fx) : null;
  return t && { track: t, stage: 0, artistAt: null, hints: [], hintCost: 0, guesses: [], done: false, won: false, pts: 0, fx };
}

async function nextRound() {
  if (busy || !G) return;
  busy = true;
  try { await nextRoundInner(); } finally { busy = false; }
}
async function nextRoundInner() {
  Snip.stop();
  G.i++;
  if (G.i >= G.n) return endGame();
  loading(true, tx('Lade Song…'));
  try {
    for (;;) {
      const r = G.pending || newRound();
      G.pending = null;
      if (!r) { G.n = G.i; return G.i ? endGame() : undefined; } // keine weiteren Songs ladbar
      try { await prepare(r); G.rounds[G.i] = r; break; } catch { /* Song überspringen */ }
    }
  } finally { loading(false); }
  if (G.i + 1 < G.n) { const p = G.pending = newRound(); p && prepare(p).catch(() => { if (G.pending === p) G.pending = null; }); }
  renderRound();
  if (opt.auto) playSnippet();
}

const R = () => G.rounds[G.i];
const possible = r => Math.max(0, PTS[r.stage] - r.hintCost);

/* Platte antippen = Ausschnitt abspielen (nach der Auflösung: bis zu 30 s) */
function playSnippet() {
  const r = R();
  if (!r?.buf) return;
  const dur = r.done ? Math.min(30, r.buf.duration - r.offset) : STEPS[r.stage];
  const disc = $('#disc');
  disc.classList.add('playing', 'counting'); disc.classList.remove('paused');
  Snip.play(r.buf, r.offset, dur, () => { disc.classList.remove('playing', 'counting'); disc.classList.add('paused'); }, r.done ? null : r.fx); // Auflösung immer ohne Effekt
  animate(dur, !r.done);
}

let raf = 0;
const RING = 2 * Math.PI * 56;
function setRing(p) { const s = $('#disc .ring-svg').style; s.setProperty('--len', RING); s.setProperty('--off', RING * (1 - p)); }
function animate(dur, ladder) {
  cancelAnimationFrame(raf);
  const segs = $$('#ladder .bar-fill');
  const tick = () => {
    const t = Snip.elapsed();
    if (t < 0) { segs.forEach(s => s.style.transform = 'scaleY(0)'); setRing(0); return; }
    setRing(Math.min(1, t / dur));
    if (ladder) STEPS.forEach((d, k) => {
      const prev = k ? STEPS[k - 1] : 0;
      segs[k].style.transform = `scaleY(${Math.max(0, Math.min(1, (t - prev) / (d - prev)))})`;
    });
    raf = requestAnimationFrame(tick);
  };
  tick();
}

function guess(g) {
  const r = R();
  if (r.done) return;
  const { songOk, artistOk, titleOk } = judge(g, r.track);
  if (isArtistMode()) {
    const text = g.artist?.name || '';
    if (artistOk) { r.guesses.push({ text, kind: 'ok' }); return finishRound(true); }
    r.guesses.push({ text, kind: 'bad' }); sound('wrong'); shake(); return advance(false);
  }
  const text = `${showTitle(g)} – ${g.artist?.name || ''}`;
  if (songOk) { r.guesses.push({ text, kind: 'ok' }); return finishRound(true); }
  let note = '';
  if (artistOk) {
    if (r.artistAt == null) r.artistAt = r.stage;
    note = tx('Interpret stimmt!');
  } else if (titleOk) note = tx('Titel stimmt, Interpret nicht');
  r.guesses.push({ text, kind: note ? 'half' : 'bad', note });
  sound('wrong');
  shake();
  advance(false);
}

function advance(autoplay) {
  const r = R();
  if (r.stage >= STEPS.length - 1) return finishRound(false);
  r.stage++;
  renderRound();
  if (autoplay) playSnippet();
}

function skip() {
  const r = R();
  if (r.done) return;
  r.guesses.push({ text: tx('Übersprungen bei {s}', { s: fmtS(STEPS[r.stage]) }), kind: 'skip' });
  advance(true);
}

function useHint(h) {
  const r = R();
  if (r.done || r.hints.includes(h) || r.stage < HINT_FROM || (h === 1 && r.hints.includes(2))) return;
  r.hints.push(h);
  r.hintCost += HINT_COST[h];
  renderRound();
}

function finishRound(won) {
  const r = R();
  r.done = true; r.won = won;
  let calc = '';
  if (won) {
    r.pts = possible(r);
    calc = tx(isArtistMode() ? 'Interpret erkannt bei {s}: {p}' : 'Erkannt bei {s}: {p}', { s: fmtS(STEPS[r.stage]), p: PTS[r.stage] }) + (r.hintCost ? ' ' + tx('− {n} für Tipps', { n: r.hintCost }) : '');
  } else if (r.artistAt != null) {
    const half = PTS[r.artistAt] / 2;
    r.pts = Math.max(0, half - r.hintCost);
    calc = tx('Nur Interpret (bei {s}): {p} ÷ 2', { s: fmtS(STEPS[r.artistAt]), p: PTS[r.artistAt] }) + (r.hintCost ? ' ' + tx('− {n} für Tipps', { n: r.hintCost }) : '');
  } else { r.pts = 0; calc = tx('Diesmal leider nicht erkannt'); }
  G.score += r.pts;
  const t = r.track;
  // Platte dreht sich um und zeigt das Cover (wie bei Musik-Bingo)
  $('#discCover').innerHTML = t.album?.cover_big ? `<img src="${esc(t.album.cover_big)}" alt="">` : '🎵';
  $('#disc').classList.add('flipped');
  const ans = $('#rvA').parentElement;
  ans.className = 'rv-answer ' + (won ? '' : r.pts ? 'half' : 'bad');
  $('#rvQ').textContent = calc;
  $('#rvA').textContent = r.pts ? tx('+{n} Punkte', { n: fmtN(r.pts) }) : tx('0 Punkte');
  $('#rvTitle').textContent = showTitle(t);
  $('#rvArtist').textContent = t.artist?.name || '';
  const y = r.album?.release_date?.slice(0, 4);
  $('#rvMeta').textContent = [t.album?.title, y].filter(Boolean).join(' · ');
  const q = encodeURIComponent(`${showTitle(t)} ${t.artist?.name || ''}`);
  $('#rvLinks').innerHTML = `<a class="pill-btn" href="https://open.spotify.com/search/${q}" target="_blank" rel="noopener">${tx('Auf Spotify anhören')}</a>`
    + (t.link ? `<a class="pill-btn" href="${esc(t.link)}" target="_blank" rel="noopener">${tx('Auf Deezer anhören')}</a>` : '');
  $('#nextBtn').textContent = G.i + 1 >= G.n ? tx('Zum Ergebnis') : tx('Nächster Song');
  $('#playArea').classList.add('hidden');
  $('#possibleLine').textContent = r.won ? tx('Erkannt!') : tx('Auflösung');
  $('#reveal').classList.remove('hidden');
  renderMeta();
  renderTries();
  if (won && r.stage === 0) { sound('top'); confetti(); }
  else sound(won ? 'ok' : r.pts ? 'ok' : 'miss');
  setTimeout(() => { if (G && R() === r && !$('#reveal').classList.contains('hidden')) playSnippet(); }, opt.sfx ? 450 : 0);
}

/* ---------- Töne & Konfetti ---------- */
function sound(type) { if (opt.sfx) Snip.sfx(type); }
function confetti(n = 90) {
  if (!opt.sfx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = [getComputedStyle(document.documentElement).getPropertyValue('--cat').trim() || '#fbbf24', '#fbbf24', '#ffffff', '#ff4fa3', '#22d3ee'];
  box.innerHTML = Array.from({ length: n }, () => {
    const c = colors[Math.floor(Math.random() * colors.length)];
    return `<i style="left:${Math.random() * 100}%;background:${c};animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * .4}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
  }).join('');
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

function endGame() {
  Snip.stop();
  if (G.daily) return Daily.finish();
  Daily.resetEnd();
  const max = G.n * PTS[0];
  const key = bestKey(G.cat.id);
  const best = LS.get(key, 0);
  const isBest = G.cat.id !== 'custom' && G.score > best;
  if (isBest) LS.set(key, G.score);
  const found = G.rounds.filter(r => r.won).length;
  recordStats(G);
  const freshAch = checkAch(G);
  lastResult = {
    title: G.cat.name, sub: DIFF[opt.diff].label + modeSuffix(), score: G.score, found, n: G.n, max,
    items: G.rounds.map(r => ({ t: showTitle(r.track), a: r.track.artist?.name || '', c: r.track.album?.cover_medium || '', e: emojiRow(r), p: r.pts })),
    text: shareText(),
  };
  if (found === G.n && G.n >= 5) confetti(140);
  $('#endCat').textContent = `${G.cat.name} · ${DIFF[opt.diff].label}` + modeSuffix();
  $('#endFound').textContent = tx('{a} von {b} erkannt', { a: found, b: G.n });
  window.countUp ? countUp($('#endScore'), G.score, fmtN) : $('#endScore').textContent = fmtN(G.score);
  $('#endSub').textContent = tx('von {n} möglichen', { n: fmtN(max) }) + (isBest ? ' · 🏆 ' + tx('Neuer Rekord!') : best ? ' · ' + tx('Rekord {n}', { n: fmtN(best) }) : '');
  $('#endList').innerHTML = G.rounds.map(r => `
    <div class="cell"><img class="pl-cover" src="${r.track.album?.cover_small || ''}" alt="">
      <span class="grow">${esc(showTitle(r.track))}<span class="sub">${esc(r.track.artist?.name || '')}</span><span class="emo">${emojiRow(r)}</span></span>
      <span class="trail ${r.pts ? '' : 'zero'}">${r.pts ? '+' + fmtN(r.pts) : '0'}</span></div>`).join('');
  G = null;                                                    // Spiel ist vorbei – Archiv & Challenge wieder frei
  show('end');
  showAch(freshAch);
}

function emojiRow(r) {
  return STEPS.map((_, k) => {
    if (r.won && k === r.stage) return '🟩';
    if (k === r.artistAt) return '🟨';
    if (!r.won && k === r.stage) return '🟥';
    return k < r.stage ? '⬛' : '⬜';
  }).join('');
}

const modeLabel = () => opt.mode === 'crazy' ? FX_NAMES[opt.fx] : MODES[opt.mode].label;
const modeSuffix = () => opt.mode === 'standard' ? '' : ` · ${MODES[opt.mode].icon} ${tx(modeLabel())}`;
const shareText = () => `🎵 Needle Drop – ${G.cat.name} (${DIFF[opt.diff].label}${modeSuffix()})\n${tx('{n} Punkte', { n: fmtN(G.score) })}\n${G.rounds.map(emojiRow).join('\n')}${Profile.tag() ? '\n' + Profile.tag() : ''}\nhttps://ku3rb1s.github.io/needle-drop/`;

/* ---------- Erfolge ---------- */
// [id, Symbol, Name, Beschreibung] – gleicher Aufbau wie in Gold Record. Gespeichert unter mq.ach als { id: Datum },
// mit dem persönlichen Code werden sie auf allen Geräten zusammengeführt (Regel „union“ in sync.js).
const ACH = [
  ['first', '🎵', 'Erste Runde', 'Ein Spiel gespielt'],
  ['flash', '⚡', 'Blitzmerker', 'Einen Song in 0,1 Sekunden erkannt'],
  ['flash3', '🎯', 'Absolutes Gehör', '3 Songs in einem Spiel in 0,1 Sekunden erkannt'],
  ['strong', '💪', 'Starke Runde', 'Mindestens die Hälfte der möglichen Punkte geholt'],
  ['perfect', '💯', 'Volltreffer', 'Alle Songs einer Runde erkannt (ab 5 Songs)'],
  ['nohint', '🧠', 'Ohne Hilfe', '10 von 10 Songs erkannt, ohne einen Tipp'],
  ['crazy', '🌀', 'Verrückt gut', 'Im Modus „Verrückt“ 5 Songs in einem Spiel erkannt'],
  ['artist', '🎤', 'Kenner', 'Im Modus „Nur Interpret“ alle Songs erkannt'],
  ['billion', '💰', 'Milliarden-Ohr', 'Im Billionärs Club alle Songs erkannt'],
  ['custom', '🔗', 'Eigener Geschmack', 'Mit einer eigenen Playlist gespielt'],
  ['explorer', '🧭', 'Weltenbummler', 'In 10 verschiedenen Kategorien gespielt'],
  ['daily', '📅', 'Tagesgast', 'Die Tägliche Challenge gespielt'],
  ['dailyPerfect', '🌟', 'Perfekter Tag', 'In der Täglichen Challenge 5 von 5 erkannt'],
  ['daily3', '🔥', 'Dranbleiben', '3 Tage in Folge die Tägliche Challenge gespielt'],
  ['daily7', '🗓️', 'Eine ganze Woche', '7 Tage in Folge die Tägliche Challenge gespielt'],
  ['games25', '🎧', 'Stammgast', '25 Spiele gespielt'],
];
const achHave = () => LS.get('ach', {}) || {};
/** Neue Erfolge nach einem Spiel (auch Tages-Challenge) – gibt die neu freigeschalteten ids zurück */
function checkAch(g) {
  const have = achHave(), rounds = g.rounds.filter(Boolean), won = rounds.filter(r => r.won);
  const st = Sync.view('mq.stats', LS.get('stats', null)) || { games: 0, cats: {} };
  const all = rounds.length >= g.n && won.length === g.n;
  const flashes = won.filter(r => STEPS[r.stage] <= 0.1).length;
  const normal = !g.daily, streak = typeof Daily !== 'undefined' ? Daily.streak() : 0;
  const cond = {
    first: true, flash: flashes >= 1, flash3: flashes >= 3,
    strong: g.n >= 5 && g.score >= g.n * PTS[0] / 2,
    perfect: all && g.n >= 5, nohint: all && g.n >= 10 && rounds.every(r => !r.hints.length),
    crazy: normal && opt.mode === 'crazy' && won.length >= 5, artist: normal && opt.mode === 'artist' && all && g.n >= 5,
    billion: normal && g.cat.id === 'billion' && all && g.n >= 5, custom: normal && g.cat.id === 'custom',
    explorer: Object.keys(st.cats || {}).length >= 10,
    daily: !!g.daily, dailyPerfect: !!g.daily && all, daily3: streak >= 3, daily7: streak >= 7, games25: (st.games || 0) >= 25,
  };
  const fresh = ACH.filter(([id]) => cond[id] && !have[id]).map(([id]) => id);
  if (fresh.length) { fresh.forEach(id => { have[id] = Daily.today(); }); LS.set('ach', have); }
  return fresh;
}
/** Neue Erfolge auf der Ergebnis-Seite als goldene Plaketten + kurze Meldung */
function showAch(ids = []) {
  const name = id => ACH.find(x => x[0] === id);
  $('#endAch').innerHTML = ids.map(id => `<span class="ach-new">${name(id)[1]} ${esc(tx(name(id)[2]))}</span>`).join('');
  if (ids.length) setTimeout(() => toast('🏅 ' + tx('Neuer Erfolg: {s}', { s: ids.map(id => tx(name(id)[2])).join(', ') }), 3200), 700);
}
function renderAch() {
  const have = achHave();
  $('#achList').innerHTML = ACH.map(([id, ic, name, sub]) => `<div class="cell ach ${have[id] ? 'got' : 'locked'}"><span class="ach-ic">${have[id] ? ic : '🔒'}</span>
    <span class="grow">${tx(name)}<span class="sub">${tx(sub)}</span></span><span class="trail">${have[id] ? '✓' : ''}</span></div>`).join('');
}

/* ---------- Statistik (nur auf diesem Gerät) ---------- */
let lastResult = null; // letztes Ergebnis – für „Teilen“ (Text + Bild)
function recordStats(g) {
  const S = LS.get('stats', null) || { games: 0, songs: 0, found: 0, stageSum: 0, cats: {}, best: [] }; // null = zurückgesetzt
  S.games++;
  const c = S.cats[g.cat.id] ||= { g: 0, s: 0, f: 0 };
  c.g++;
  for (const r of g.rounds) {
    S.songs++; c.s++;
    if (!r.won) continue;
    S.found++; c.f++; S.stageSum += r.stage;
    S.best.push({ t: showTitle(r.track), a: r.track.artist?.name || '', s: STEPS[r.stage], cat: g.cat.id, d: Daily.today() });
  }
  // nur die 5 schnellsten Treffer behalten
  S.best.sort((a, b) => a.s - b.s);
  S.best = S.best.slice(0, 5);
  LS.set('stats', S);
}
function renderStats() {
  const S = Sync.view('mq.stats', LS.get('stats', null)); // alle verbundenen Geräte zusammen
  const box = $('#statsBox');
  if (!S || !S.games) { box.innerHTML = `<div class="group-f center" style="margin-top:20px">${tx('Noch keine Spiele – spiel eine Runde, dann erscheint hier deine Statistik.')}</div>`; return; }
  const pct = S.songs ? Math.round(S.found / S.songs * 100) : 0;
  const avg = S.found ? S.stageSum / S.found : 0;
  const cats = Object.entries(S.cats).map(([id, v]) => ({ c: CATS.find(x => x.id === id), ...v })).filter(x => x.c).sort((a, b) => b.s - a.s);
  const fav = [...cats].filter(x => x.s >= 5).sort((a, b) => b.f / b.s - a.f / a.s)[0];
  box.innerHTML = `
    <div class="dstats-tiles" style="margin-top:14px">
      <div><b>${S.games}</b><span>${tx('Spiele')}</span></div>
      <div><b>${S.songs}</b><span>${tx('Songs')}</span></div>
      <div><b>${pct} %</b><span>${tx('erkannt')}</span></div>
      <div><b>${S.found ? (avg + 1).toLocaleString(LOC(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–'}</b><span>${tx('Ø Stufe')}</span></div>
    </div>
    ${fav ? `<div class="group-f center" style="margin-top:12px">${tx('Deine Stärke: {c} – {p} % erkannt', { c: `<b>${esc(fav.c.name)}</b>`, p: Math.round(fav.f / fav.s * 100) })}</div>` : ''}
    <div class="group-h">${tx('Nach Kategorie')}</div>
    <div class="group">${cats.map(x => `
      <div class="cell"><span class="cell-ic" style="background:${x.c.color};color:${ink(x.c.color)}">${x.c.group === 'decades' ? `<b style="font-size:.7rem">${x.c.big}</b>` : `<svg class="ic"><use href="#i-${x.c.icon}"/></svg>`}</span>
        <span class="grow">${esc(x.c.name)}<span class="sub">${tx(x.g === 1 ? '{n} Spiel' : '{n} Spiele', { n: x.g })} · ${tx('{a} von {b} erkannt', { a: x.f, b: x.s })}</span></span>
        <b>${Math.round(x.f / x.s * 100)} %</b></div>`).join('')}</div>
    ${S.best.length ? `<div class="group-h">${tx('Schnellste Treffer')}</div>
    <div class="group">${S.best.map(b => `<div class="cell"><span class="grow">${esc(b.t)}<span class="sub">${esc(b.a)} · ${esc(CATS.find(c => c.id === b.cat)?.name || b.cat)}</span></span><b>${fmtS(b.s)}</b></div>`).join('')}</div>` : ''}
    <div class="group" style="margin-top:22px"><button class="cell tap danger" id="btnResetStats"><span class="grow">${tx('Statistik zurücksetzen')}</span></button></div>`;
  $('#btnResetStats').onclick = async () => { if (await ask(tx('Statistik auf diesem Gerät löschen?'), { ok: tx('Löschen'), danger: true })) { LS.set('stats', null); Sync.reset('mq.stats'); renderStats(); } };
}

/* ---------- Ergebnis als Bild (Instagram-Story-Format) ---------- */
async function resultImage(res) {
  const W = 1080, H = 1920, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const cat = getComputedStyle(document.documentElement).getPropertyValue('--cat').trim() || '#fbbf24';
  const load = src => new Promise(ok => { if (!src) return ok(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  await document.fonts.load('900 40px Outfit').catch(() => {});
  // Hintergrund mit Farbfleck in der Kategoriefarbe
  x.fillStyle = '#0c0c0f'; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, r, col, a) => { const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'transparent'); x.globalAlpha = a; x.fillStyle = gr; x.fillRect(0, 0, W, H); x.globalAlpha = 1; };
  glow(150, 200, 900, cat, .35); glow(1000, 1700, 900, '#f59e0b', .18);
  const font = (w, s) => `${w} ${s}px Outfit, system-ui, sans-serif`;
  const logo = await load('icon-192.png');
  if (logo) { x.save(); roundRect(x, 90, 110, 120, 120, 30); x.clip(); x.drawImage(logo, 90, 110, 120, 120); x.restore(); }
  x.fillStyle = '#fff'; x.font = font(900, 64); x.fillText('Needle Drop', 240, 192);
  const who = Profile.tag();
  if (who) { x.textAlign = 'right'; x.fillStyle = '#a1a1ad'; x.font = font(700, 44); x.fillText(clip(x, who, 330), W - 90, 186); x.textAlign = 'left'; }
  x.fillStyle = cat; x.font = font(800, 40); x.fillText((res.title + (res.sub ? ' · ' + res.sub : '')).toUpperCase(), 90, 340);
  x.fillStyle = '#fff'; x.font = font(900, 210); x.fillText(fmtN(res.score), 82, 540);
  x.fillStyle = '#a1a1ad'; x.font = font(600, 44); x.fillText(tx('Punkte') + ' · ' + tx('{a} von {b} erkannt', { a: res.found, b: res.n }), 90, 615);
  // Songs
  const covers = await Promise.all(res.items.slice(0, 10).map(it => load((it.c || '').replace('56x56', '250x250'))));
  const rows = res.items.slice(0, 10), rowH = Math.min(175, 1050 / Math.max(rows.length, 1)); // wenige Songs → größere Zeilen
  rows.forEach((it, i) => {
    const y = 700 + i * rowH, s = rowH - 22;
    x.fillStyle = 'rgba(255,255,255,.06)'; roundRect(x, 70, y, W - 140, rowH - 12, 22); x.fill();
    if (covers[i]) { x.save(); roundRect(x, 88, y + 9, s, s, 12); x.clip(); x.drawImage(covers[i], 88, y + 9, s, s); x.restore(); }
    const tx = 88 + s + 26;
    x.fillStyle = '#fff'; x.font = font(700, Math.round(s * .36)); x.fillText(clip(x, it.t, 600), tx, y + s * .48);
    x.fillStyle = '#a1a1ad'; x.font = font(500, Math.round(s * .28)); x.fillText(clip(x, it.a, 520), tx, y + s * .9);
    x.textAlign = 'right';
    x.fillStyle = it.p ? '#1ed760' : '#6b6b75'; x.font = font(800, Math.round(s * .36)); x.fillText(it.p ? '+' + fmtN(it.p) : '0', W - 100, y + s * .55);
    x.font = `${Math.round(s * .2)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; x.fillText(it.e, W - 100, y + s * .92);
    x.textAlign = 'left';
  });
  x.fillStyle = '#a1a1ad'; x.font = font(600, 40); x.textAlign = 'center';
  x.fillText(tx('Erkennst du den Song in 0,1 Sekunden?'), W / 2, H - 150);
  x.fillStyle = cat; x.font = font(800, 44); x.fillText('ku3rb1s.github.io/needle-drop', W / 2, H - 90);
  return await new Promise(ok => cv.toBlob(ok, 'image/png'));
}
function roundRect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function clip(x, t, max) { if (x.measureText(t).width <= max) return t; while (t.length > 1 && x.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; }

async function shareResult() {
  const res = lastResult;
  if (!res) return;
  const btn = $('#shareBtn'); btn.disabled = true;
  try {
    const blob = await resultImage(res).catch(() => null);
    const file = blob && new File([blob], 'needle-drop.png', { type: 'image/png' });
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: res.text });
    } else {
      try { await navigator.clipboard.writeText(res.text); } catch {}
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'needle-drop.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast(tx('Bild gespeichert, Text kopiert'));
      } else toast(tx('Ergebnis kopiert'));
    }
  } catch { /* Teilen abgebrochen */ }
  finally { btn.disabled = false; }
}

/* ---------- Anzeige ---------- */
function show(id) {
  $('#home').classList.toggle('hidden', id !== 'home');
  $('#game').classList.toggle('hidden', id !== 'game');
  $('#end').classList.toggle('hidden', id !== 'end');
  $('#btnQuit').classList.toggle('hidden', id !== 'game');
  $('#dailyHdr').classList.toggle('hidden', id !== 'home');
  window.scrollTo(0, 0);
}

function setCat(color) {
  document.documentElement.style.setProperty('--cat', color);
  document.documentElement.style.setProperty('--cat-ink', ink(color));
}
/** Schriftfarbe auf einer Kategoriefarbe: dunkel auf hellen Farben (Gelb, Limette, Eisblau), sonst weiß */
function ink(hex) {
  const n = parseInt(hex.slice(1), 16), [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(v => v / 255);
  const L = 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2;
  return L > 0.4 ? '#16130a' : '#fff';
}
const catIcon = c => c.group === 'decades' ? c.big : `<svg class="ic"><use href="#i-${c.icon}"/></svg>`;

function catCell(c) {
  const on = c.id === opt.cat;
  return `<button class="cell tap${on ? ' sel' : ''}" data-id="${c.id}">
    <span class="cell-ic" style="background:${c.color};color:${ink(c.color)}"><svg class="ic"><use href="#i-${c.icon}"/></svg></span>
    <span class="grow">${c.name}<span class="sub">${c.sub}</span></span>
    <span class="trail">${on ? '<svg class="ic"><use href="#i-check"/></svg>' : ''}</span></button>`;
}

function renderHome() {
  const c = CATS.find(x => x.id === opt.cat);
  setCat(c.color);
  // Reiter: zeigt immer nur eine Gruppe (Standard: die Gruppe der gewählten Kategorie)
  if (!catTab) catTab = c.group === 'genres' ? 'intl' : c.group;
  $('#catTabs').innerHTML = GROUPS.map(([g, title]) => `<button data-tab="${g}" class="${g === catTab ? 'on' : ''}">${tx(title)}</button>`).join('');
  $('#catTiles').className = 'tiles' + (catTab === 'decades' ? ' dec' : '');
  $('#catTiles').innerHTML = CATS.filter(x => x.group === catTab).map(x => `
    <button class="tile${x.id === opt.cat ? ' on' : ''}" data-id="${x.id}" style="--c:${x.color};--ci:${ink(x.color)}">
      <span class="tile-ic">${x.group === 'decades' ? x.big : `<svg class="ic"><use href="#i-${x.icon}"/></svg>`}</span>
      <span class="tile-t">${x.group === 'decades' ? x.name : x.name}</span></button>`).join('');
  $('#homeCatSub').textContent = c.sub || tx('Die größten Hits der {c}', { c: c.name });
  $('#customBox').classList.toggle('hidden', opt.cat !== 'custom');
  $('#customNote').classList.toggle('hidden', opt.cat !== 'custom');
  $$('#diff button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.diff));
  $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.mode));
  $$('#fxSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.fx));
  $('#fxSeg').classList.toggle('hidden', opt.mode !== 'crazy');
  $('#modeInfo').textContent = tx(MODES[opt.mode].info);
  $('#diffInfo').textContent = DIFF[opt.diff].info;
  const icon = $('#homeCatIcon');
  icon.className = 'cat-icon' + (c.group === 'decades' ? ' dec' : '');
  icon.innerHTML = catIcon(c);
  $('#homeCatName').textContent = c.name;
  $('#startLbl').textContent = tx('{c} spielen', { c: c.name });
  const best = LS.get(bestKey(), 0);
  renderSetup();
  if (typeof Daily !== 'undefined') Daily.renderCard();
  $('#bestPill').textContent = best ? '🏆 ' + tx('Rekord {n}', { n: fmtN(best) }) : `${DIFF[opt.diff].label} · ${tx('{n} Songs', { n: opt.count })}`;
}

/** Aktuelle Regeln als kleine Pills unter dem Spielen-Knopf (Klick öffnet die Einstellungen) */
function renderSetup() {
  const L = LADDERS[opt.ladder];
  const chip = (ic, t) => `<span class="chip"><svg class="ic"><use href="#i-${ic}"/></svg>${t}</span>`;
  $('#setupChips').innerHTML = [
    ...(opt.mode !== 'standard' ? [`<span class="chip mode">${MODES[opt.mode].icon} ${tx(modeLabel())}</span>`] : []),
    chip('clock', `${fmtS(L[0])} – ${fmtS(L[L.length - 1])}`),
    chip(opt.answer === 'mc' ? 'list' : 'search', tx(opt.answer === 'mc' ? '4 Antworten' : 'Suchen')),
    chip('start', tx({ start: 'Am Anfang', hook: 'Hook', random: 'Zufällig' }[opt.startMode])),
    chip('bulb', tx(opt.hintsOn === 'on' ? 'Tipps an' : 'Tipps aus')),
  ].join('');
  $('#settingsDot').classList.toggle('hidden', !!LS.get('seenSettings', false));
}

function renderMeta() {
  $('#roundNo').textContent = tx('Song {a} / {b}', { a: G.i + 1, b: G.n });
  $('#scorePill').textContent = tx('{n} Punkte', { n: fmtN(G.score) });
  $('#progress').innerHTML = Array.from({ length: G.n }, (_, k) => {
    const r = G.rounds[k];
    const cls = k === G.i && !r?.done ? 'cur' : r?.done ? (r.won ? 'ok' : r.pts ? 'half' : 'bad') : '';
    return `<i class="${cls}"></i>`;
  }).join('');
}

function renderTries() {
  const r = R();
  $('#triesBox').classList.toggle('has', r.guesses.length > 0);
  $('#triesN').textContent = r.guesses.length ? `(${r.guesses.length})` : '';
  $('#guesses').innerHTML = r.guesses.slice().reverse().map(g => {
    const ic = { ok: '✅', half: '🟨', bad: '❌', skip: '⏭' }[g.kind];
    return `<li class="${g.kind}"><span>${ic}</span><span>${esc(g.text)}${g.note ? `<small>${esc(g.note)}</small>` : ''}</span></li>`;
  }).join('');
}

function renderRound() {
  const r = R();
  const disc = $('#disc');
  if (!r.done) {
    disc.classList.remove('flipped', 'playing', 'counting'); disc.classList.add('paused');
    $('#reveal').classList.add('hidden');
    $('#playArea').classList.remove('hidden');
  }
  renderMeta();
  $('#gameKicker').textContent = (G.daily ? `${G.cat.name} #${G.daily.no}` : G.cat.name) + (r.fx ? ` · 🌀 ${tx(FX_NAMES[r.fx])}` : isArtistMode() ? ` · 🎤 ${tx('Nur Interpret')}` : '');
  $('#guessInput').placeholder = tx(isArtistMode() ? 'Interpret suchen…' : 'Song oder Interpret suchen…');
  const icon = $('#gameCatIcon');
  icon.className = 'cat-icon' + (G.cat.group === 'decades' ? ' dec' : '');
  icon.innerHTML = catIcon(G.cat);
  $('#stageName').textContent = fmtS(STEPS[r.stage]);
  $('#possibleLine').innerHTML = tx('Jetzt möglich: {n} Punkte', { n: `<b>${fmtN(possible(r))}</b>` });
  $('#ladder').innerHTML = STEPS.map((s, k) => `
    <div class="step ${k < r.stage ? 'past' : k === r.stage ? 'cur' : ''}">
      <div class="bar" style="--h:${12 + k * 8}px"><div class="bar-fill"></div></div>
      <span class="s">${fmtS(s)}</span><span class="p">${PTS[k]}</span>
    </div>`).join('');
  setRing(0);
  const nx = STEPS[r.stage + 1];
  $('#skipLbl').textContent = nx ? tx('{s} hören', { s: fmtS(nx) }) : tx('Mehr hören');
  $('#skipBtn').disabled = !nx;
  $('#status').innerHTML = r.artistAt != null ? `<span class="badge warn-b">✓ ${tx('Interpret richtig – jetzt noch der Song')}</span>` : '';
  $('#guessInput').value = '';
  closeSuggest();
  renderChoices();
  renderTries();
  renderHints();
}

/* ---------- 4 Antworten (Multiple Choice) ---------- */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function renderChoices() {
  const r = R(), mc = rule("answer") === 'mc';
  $('#choices').classList.toggle('hidden', !mc);
  $('.guess').classList.toggle('hidden', mc);
  if (!mc) return;
  if (!r.choices) {
    // Falsche Antworten aus derselben Kategorie, aber von anderen Interpreten
    const ta = norm(r.track.artist?.name), seen = new Set([ta]), tt = norm(showTitle(r.track));
    const others = shuffle(G.pool.filter(t => t.id !== r.track.id && norm(showTitle(t)) !== tt)).filter(t => {
      const a = norm(t.artist?.name); if (seen.has(a)) return false; seen.add(a); return true;
    }).slice(0, 3);
    r.choices = shuffle([r.track, ...others]);
    r.wrong = [];
  }
  const am = isArtistMode();
  $('#choices').innerHTML = r.choices.map((t, i) => `<button class="choice${am ? ' artist' : ''}${r.wrong.includes(i) ? ' wrong' : ''}" data-c="${i}" ${r.wrong.includes(i) ? 'disabled' : ''}>
    <b>${esc(am ? t.artist?.name || '' : showTitle(t))}</b>${am ? '' : `<small>${esc(t.artist?.name || '')}</small>`}</button>`).join('');
}
function choose(i) {
  const r = R();
  if (r.done || r.wrong.includes(i)) return;
  const t = r.choices[i];
  if (isArtistMode()) {
    const text = t.artist?.name || '';
    if (t.id === r.track.id || judge(t, r.track).artistOk) { r.guesses.push({ text, kind: 'ok' }); return finishRound(true); }
    r.wrong.push(i); r.guesses.push({ text, kind: 'bad' }); sound('wrong'); shake('#choices'); return advance(false);
  }
  if (t.id === r.track.id) { r.guesses.push({ text: `${showTitle(t)} – ${t.artist?.name || ''}`, kind: 'ok' }); return finishRound(true); }
  r.wrong.push(i);
  r.guesses.push({ text: `${showTitle(t)} – ${t.artist?.name || ''}`, kind: 'bad' });
  sound('wrong');
  shake('#choices');
  advance(false);
}

function renderHints() {
  const r = R(), t = r.track, a = r.album;
  const enabled = rule("hintsOn") === 'on', unlocked = r.stage >= HINT_FROM;
  const btn = $('#hintBtn');
  btn.classList.toggle('hidden', !enabled);
  btn.disabled = !unlocked;
  btn.title = unlocked ? '' : tx('Tipps gibt es ab {s}', { s: fmtS(STEPS[HINT_FROM]) });
  if (!enabled || !unlocked) $('#hintPanel').classList.add('hidden');
  btn.classList.toggle('active', !$('#hintPanel').classList.contains('hidden'));
  // „Stark“ enthält die Titel-Lücken schon – danach ist „Mittel“ überflüssig
  $$('.hint-b').forEach(b => b.classList.toggle('used', r.hints.includes(+b.dataset.h) || (+b.dataset.h === 1 && r.hints.includes(2))));

  const row = (k, v) => `<div class="cell"><span class="grow muted">${k}</span><b>${v}</b></div>`;
  const out = [];
  const words = showTitle(t).replace(/\s*[([].*?[)\]]/g, '').trim().split(/\s+/);
  if (r.hints.includes(0)) {
    const y = +(a?.release_date || '').slice(0, 4);
    const genre = a?.genres?.data?.map(g => g.name).slice(0, 2).join(', ');
    let when = y ? tx('{n}er', { n: Math.floor(y / 10) * 10 }) : '';
    if (G.cat.decade && y && Math.floor(y / 10) * 10 !== G.cat.decade) when = tx('{n}er', { n: G.cat.decade }); // Best-of-Alben haben oft falsche Jahre
    out.push(row(tx('Jahrzehnt'), when || tx(a ? 'unbekannt' : 'wird geladen…')));
    if (genre) out.push(row(tx('Genre'), esc(genre)));
  }
  if (r.hints.includes(1) && !r.hints.includes(2))
    out.push(row(tx('Titel'), `<span class="gaps">${esc(words.map(w => w.replace(/[\p{L}\p{N}]/gu, '_')).join('  '))}</span>`));
  if (r.hints.includes(2)) {
    out.push(row(tx('Titel'), `<span class="gaps">${esc(words.map(w => w.replace(/^([\p{L}\p{N}])|[\p{L}\p{N}]/gu, (m, f) => f || '_')).join('  '))}</span>`));
    out.push(row(tx('Interpret'), esc((t.artist?.name || '?')[0]) + '…'));
  }
  $('#hintOut').innerHTML = out.join('');
  const cv = $('#pixel');
  cv.classList.toggle('hidden', !r.hints.includes(2));
  if (r.hints.includes(2)) pixelate(t.album?.cover_medium, cv, 7);
}

let pixTok = 0;
function pixelate(src, cv, n) {
  if (!src) return;
  const tok = ++pixTok;
  const img = new Image();
  img.onload = () => {
    if (tok !== pixTok) return; // inzwischen anderer Song
    const tiny = document.createElement('canvas'); tiny.width = tiny.height = n;
    tiny.getContext('2d').drawImage(img, 0, 0, n, n);
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(tiny, 0, 0, cv.width, cv.height);
  };
  img.src = src;
}

/* ---------- Einstellungen ---------- */
function applyTheme() {
  const th = THEMES.find(x => x[0] === opt.theme) ? opt.theme : 'graphit';
  document.documentElement.dataset.theme = th;
  const bg = { graphit: '#0c0c0f', lila: '#0d0a1a', ozean: '#05111a', abend: '#130a0b', wald: '#08110c', oled: '#000000' }[th];
  $('meta[name=theme-color]').content = bg;
  $('#themeRow').innerHTML = THEMES.map(([id, name, a, b]) =>
    `<button class="theme-pick ${th === id ? 'on' : ''}" data-theme-pick="${id}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${tx(name)}</button>`).join('');
}
function renderSettings() {
  const segOn = (id, v) => $$(`#${id} button`).forEach(b => b.classList.toggle('on', b.dataset.v == v));
  segOn('setLadder', opt.ladder); segOn('setStart', opt.startMode); segOn('setAnswer', opt.answer); segOn('setCount', opt.count);
  $('#setAuto').checked = !!opt.auto;
  $('#setHints').checked = opt.hintsOn === 'on';
  $('#setClean').checked = !!opt.clean;
  $('#setSfx').checked = !!opt.sfx;
  $('#startInfo').textContent = START_INFO[opt.startMode];
  const L = LADDERS[opt.ladder];
  $('#pointsInfo').innerHTML = L.map((s, k) => `<div class="cell"><span class="grow">${tx('Erkannt bei {s}', { s: fmtS(s) })}</span><b>${PTS[k]}</b></div>`).join('');
  // Zusammenfassungen auf der Übersichtsseite
  const LN = tx({ easy: 'Entspannt', classic: 'Klassisch', pro: 'Profi' }[opt.ladder]);
  const SN = tx({ start: 'Am Anfang', hook: 'Hook', random: 'Zufällig' }[opt.startMode]);
  $('#subRules').textContent = `${LN} · ${SN} · ${tx(opt.answer === 'mc' ? '4 Antworten' : 'Suchen')} · ${tx('{n} Songs', { n: opt.count })}`;
  $('#subHelp').textContent = [opt.hintsOn === 'on' ? 'Tipps an' : 'Tipps aus', opt.auto ? 'Autoplay an' : '', opt.clean ? 'ohne Explicit' : '', opt.sfx ? '' : 'Töne aus'].filter(Boolean).map(s => tx(s)).join(' · ');
  $('#subDesign').textContent = tx((THEMES.find(x => x[0] === opt.theme) || THEMES[0])[1]);
  $('#subPoints').textContent = tx('600 bis 100 je Stufe, Tipps kosten Punkte');
  $('#subData').textContent = tx('Alles bleibt auf diesem Gerät');
  $('#langSel').innerHTML = langOptions();
  const st = Sync.view('mq.stats', LS.get('stats', null)); // alle verbundenen Geräte zusammen
  $('#subAch').textContent = tx('{a} von {b}', { a: ACH.filter(([id]) => achHave()[id]).length, b: ACH.length });
  $('#subStats').textContent = st?.games ? tx(st.games === 1 ? '{n} Spiel' : '{n} Spiele', { n: st.games }) + ' · ' + tx('{p} % erkannt', { p: st.songs ? Math.round(st.found / st.songs * 100) : 0 }) : tx('Noch keine Spiele');
  $('#appVersion').innerHTML = `Needle Drop · ${tx('Version')} ${APP_VERSION} · ${APP_DATE}<span>${tx('Neuerungen ansehen')} ›</span>`;
  applyTheme();
}

/* Neuerungen (Einstellungen → Versionsnummer): CHANGELOG.md, einmal geladen – wie bei Musik-Bingo */
let changesCache = null, changesAll = false;
async function renderChanges() {
  const box = $('#changesList');
  if (!changesCache) {
    box.innerHTML = '<div class="cell muted"><span class="loader"></span></div>';
    try {
      const r = await fetch('CHANGELOG.md?v=' + APP_VERSION);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      changesCache = parseChanges(await r.text());
    } catch {
      box.innerHTML = `<div class="cell muted">${tx('Die Neuerungen konnten nicht geladen werden.')}</div>`;
      return;
    }
  }
  const list = changesAll ? changesCache : changesCache.slice(0, 6);
  const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  box.innerHTML = list.map(v => `<div class="chg">
      <div class="chg-h"><b>${esc(v.ver)}</b>${v.ver === APP_VERSION ? `<span class="chg-now">${tx('aktuell')}</span>` : ''}<span class="chg-d">${esc(v.date)}</span></div>
      <ul>${v.items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul></div>`).join('')
    + (!changesAll && changesCache.length > list.length ? `<button class="ghost" id="btnChangesAll" style="width:100%;margin-top:6px">${tx('Ältere Versionen anzeigen')}</button>` : '');
  const more = $('#btnChangesAll');
  if (more) more.onclick = () => { changesAll = true; renderChanges(); };
}
// „## 1.2.0 – 07.11.2026“ + Spiegelstriche → [{ ver, date, items }]
function parseChanges(text) {
  const out = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const hd = line.match(/^##\s+(\S+)(?:\s+[–-]\s+(.+))?$/);
    if (hd) { cur = { ver: hd[1], date: hd[2] || '', items: [] }; out.push(cur); continue; }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li && cur) cur.items.push(li[1]);
    else if (cur?.items.length && line.trim()) cur.items[cur.items.length - 1] += ' ' + line.trim();
  }
  return out;
}

/* Spielerprofil (geteilt mit Bingo und Jukebox) */
function renderProfile() {
  const p = Profile.get(), s = Sync.status();
  // „Dein Code“ (verwaltet in der Jukebox). Noch nicht gesichert? Merkt sich die Jukebox unter hub.codeSaved.
  let saved = false; try { saved = JSON.parse(localStorage.getItem('hub.codeSaved')) === s.code; } catch {}
  const unsaved = s.connected && !saved;
  $('#syncTitle').textContent = s.connected ? tx('Dein Code') : tx('Auf anderen Geräten weiterspielen');
  $('#syncSub').textContent = unsaved ? '⚠️ ' + tx('Noch nicht gesichert – in der Jukebox sichern')
    : s.connected ? '✓ ' + tx('Abgeglichen · verwalten in der Jukebox')   /* Code selbst nur in der Jukebox */ : tx('Rekorde, Serien und Profil mit einem Code mitnehmen – ohne E-Mail und Passwort');
  $('#syncIc').style.background = unsaved ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : s.connected ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : 'linear-gradient(135deg,#ff4f86,#fbbf24)';
  $('#profEmoji').textContent = p.emoji;
  if (document.activeElement !== $('#profName')) $('#profName').value = p.name;
  $('#profName').placeholder = tx('Dein Name');
}
$('#profEmoji').onclick = () => Profile.pick(e => { $('#profEmoji').textContent = e; });   // Auswahl-Fenster (js/profile.js)
$('#profName').oninput = () => Profile.set({ name: $('#profName').value });
$('#profName').onkeydown = e => { if (e.key === 'Enter') $('#profName').blur(); };

/* Seiten im Einstellungsmenü (Übersicht → Unterseite → zurück) */
function goPage(p, back = false) {
  const page = $(`#sheetSettings .page[data-page="${p}"]`) || $('#sheetSettings .page[data-page="main"]');
  $$('#sheetSettings .page').forEach(x => x.classList.toggle('active', x === page));
  page.classList.toggle('back', back);
  $('#navTitle').textContent = page.dataset.title;
  $('#navBack').classList.toggle('invisible', page.dataset.page === 'main');
  $('#sheetSettings .sheet-body').scrollTop = 0;
  if (page.dataset.page === 'changes') renderChanges();
  if (page.dataset.page === 'stats') renderStats();
  if (page.dataset.page === 'ach') renderAch();
  if (page.dataset.page === 'archive' && typeof Daily !== 'undefined') Daily.renderArchive();
}

/* ---------- Lautstärke (nur am PC sichtbar – am Handy regeln die Tasten) ---------- */
function applyVol() {
  const v = opt.muted ? 0 : opt.vol;
  Snip.setVolume(v / 100);
  const r = $('#vol');
  r.value = opt.vol; r.style.setProperty('--p', opt.vol + '%');
  $('#volVal').textContent = opt.muted ? '–' : opt.vol;
  $('#volMute use').setAttribute('href', opt.muted || !opt.vol ? '#i-mute' : '#i-vol');
  $('#volBox').classList.toggle('off', opt.muted);
}
function setVol(v) { opt.vol = Math.max(0, Math.min(100, Math.round(v))); opt.muted = false; LS.set('vol', opt.vol); applyVol(); }

/* ---------- Suche mit Vorschlägen ---------- */
let sugg = [], sel = -1, seq = 0, deb = 0;
function onType() {
  clearTimeout(deb);
  const q = $('#guessInput').value.trim();
  if (q.length < 2) return closeSuggest();
  deb = setTimeout(async () => {
    const my = ++seq;
    let res = [];
    if (isArtistMode()) {
      try { res = await DZ.searchArtist(q, 25); } catch { return; }
      if (my !== seq) return;
      sugg = res.sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0)).slice(0, 20)
        .map(a => ({ id: 'a' + a.id, title: '', artist: { id: a.id, name: a.name }, album: { cover_small: a.picture_small }, isArtist: true }));
      sel = sugg.length ? 0 : -1;
      return renderSuggest(q);
    }
    try { res = await DZ.search(q, 50); } catch { return; }
    if (my !== seq) return;
    const seen = new Set();
    // die 20 passendsten (Deezer-Reihenfolge) nach Bekanntheit vorne, weitere Treffer dahinter
    const byRank = l => l.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    sugg = [...byRank(res.slice(0, 20)), ...byRank(res.slice(20))]
      .filter(t => { const k = norm(showTitle(t)) + '|' + norm(t.artist?.name); return !seen.has(k) && seen.add(k); })
      .slice(0, 30);                                          // mehr Treffer – die Liste lässt sich scrollen
    sel = sugg.length ? 0 : -1;
    renderSuggest(q);
  }, 160);
}
function mark(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}
function renderSuggest(q = '', keep = false) {
  const ul = $('#suggest');
  ul.classList.toggle('hidden', !sugg.length);
  if (!keep) ul.scrollTop = 0;                                 // neue Treffer: wieder oben anfangen
  requestAnimationFrame(fitSuggest);
  ul.innerHTML = sugg.map((t, i) => `<li class="${i === sel ? 'sel' : ''}" data-i="${i}">
    <img src="${t.album?.cover_small || ''}" alt="" loading="lazy">
    <span>${t.isArtist ? `<b>${mark(t.artist.name, q)}</b><small>${tx('Interpret')}</small>` : `<b>${mark(showTitle(t), q)}</b><small>${mark(t.artist?.name || '', q)}</small>`}</span></li>`).join('');
}
function closeSuggest() { sugg = []; sel = -1; seq++; $('#suggest').classList.add('hidden'); }
function pick(i) {
  const t = sugg[i];
  if (!t) return;
  closeSuggest();
  $('#guessInput').value = '';
  guess(t);
}

/* ---------- Kleinkram ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function loading(on, txt) { $('#loading').classList.toggle('hidden', !on); if (txt) $('#loadingTxt').textContent = txt; }
let toastT = 0;
function toast(msg, ms = 3500) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms); }
function shake(sel = '.guess') { const c = $(sel); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

/* ---------- Ereignisse ---------- */
$('#catTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  catTab = b.dataset.tab; renderHome();
});
$('#home').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  opt.cat = b.dataset.id; LS.set('cat', opt.cat); renderHome();
  if (opt.cat === 'custom') $('#customUrl').focus();
});
$('#modeSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.mode = b.dataset.v; LS.set('mode', opt.mode); renderHome();
});
$('#fxSeg').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.fx = b.dataset.v; LS.set('fx', opt.fx); renderHome();
});
$('#diff').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.diff = b.dataset.v; LS.set('diff', opt.diff); renderHome();
});
$('#startBtn').onclick = startGame;
// Platte antippen: läuft etwas → stoppen, sonst abspielen
$('#disc').onclick = () => {
  if (Snip.elapsed() >= 0) {
    Snip.stop(); cancelAnimationFrame(raf); setRing(0);
    $$('#ladder .bar-fill').forEach(s => s.style.transform = 'scaleY(0)');
    const d = $('#disc'); d.classList.remove('playing', 'counting'); d.classList.add('paused');
  } else playSnippet();
};
$('#disc').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#disc').click(); } });
$('#skipBtn').onclick = skip;
$('#hintBtn').onclick = () => { $('#hintPanel').classList.toggle('hidden'); renderHints(); };
$('#giveupBtn').onclick = async () => {
  const r = R();
  if (!r || r.done) return;
  if (await ask(tx('Song auflösen? Du bekommst nur Punkte, falls der Interpret schon stimmte.'), { ok: tx('Auflösen') }) && R() === r && !r.done) finishRound(false);
};
$('#nextBtn').onclick = nextRound;
$$('.hint-b').forEach(b => b.onclick = () => useHint(+b.dataset.h));
$('#againBtn').onclick = startGame;
/** Eigene Rückfrage im Stil des Spiels (wie im Musik-Bingo) statt des grauen Browser-Fensters.
    Liefert true (Hauptknopf) oder false (Abbrechen / daneben getippt / Esc). danger = Hauptknopf rot. */
let askDone = null; // Antwort der gerade offenen Rückfrage
function ask(msg, { ok = tx('OK'), cancel = tx('Abbrechen'), danger = false } = {}) {
  const d = $('#dlgAsk');
  answerAsk(false);                    // eine noch offene Frage gilt als „Abbrechen“
  $('#askMsg').textContent = msg; $('#askOk').textContent = ok; $('#askNo').textContent = cancel;
  $('#askOk').classList.toggle('danger', danger);
  d.showModal(); $('#askOk').focus();
  return new Promise(res => { askDone = res; });
}
// Antwort direkt über die Knöpfe weitergeben – nicht erst über das close-Ereignis, das manche Browser verzögert schicken
function answerAsk(yes) {
  const done = askDone; askDone = null;
  if ($('#dlgAsk').open) $('#dlgAsk').close();
  if (done) done(yes);
}
$('#askOk').onclick = e => { e.preventDefault(); answerAsk(true); };
$('#askNo').onclick = e => { e.preventDefault(); answerAsk(false); };
$('#dlgAsk').addEventListener('click', e => { if (e.target === $('#dlgAsk')) answerAsk(false); }); // daneben tippen = Abbrechen
$('#dlgAsk').addEventListener('close', () => answerAsk(false));                                     // Esc

const goHome = () => { Snip.stop(); G = null; renderHome(); show('home'); };
/** Zur Startseite – mitten im Spiel nur nach Rückfrage */
async function leave() {
  const inGame = G && !$('#game').classList.contains('hidden');
  if (inGame && G.daily) {
    // Tages-Challenge: Abbrechen zählt als gespielt (sonst könnte man sie beliebig oft neu versuchen)
    const g = G;
    if (!await ask(tx('Challenge abbrechen? Sie zählt dann mit den bisherigen Punkten – heute geht es nicht nochmal.'), { ok: tx('Abbrechen'), cancel: tx('Weiterspielen'), danger: true })) return;
    if (G === g) Daily.finish(true);
    return;
  }
  if (inGame && !await ask(tx('Spiel beenden? Der bisherige Punktestand geht verloren.'), { ok: tx('Beenden'), cancel: tx('Weiterspielen'), danger: true })) return;
  goHome();
}
$('#homeBtn').onclick = goHome;
$('#btnQuit').onclick = leave;
$('#logoBtn').onclick = leave;
$('#shareBtn').onclick = shareResult;

// Einstellungen
const sheet = $('#sheetSettings');
const openSettings = (p = 'main') => {
  renderSettings(); renderProfile(); goPage(p); sheet.showModal();
  LS.set('seenSettings', true); $('#settingsDot').classList.add('hidden');
};
$('#btnSettings').onclick = () => openSettings();
$('#setupRow').onclick = () => openSettings('rules'); // Regel-Pills → direkt zu den Spielregeln
sheet.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) goPage(g.dataset.go); });
$('#navBack').onclick = () => goPage('main', true);
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });
// Startseite dahinter sofort mitziehen (Regel-Pills, Rekord) – nicht erst beim Schließen
const refreshBehind = () => { if (!$('#home').classList.contains('hidden')) renderHome(); };
sheet.addEventListener('change', refreshBehind);
sheet.addEventListener('click', e => { if (e.target.closest('.seg button')) refreshBehind(); });
sheet.addEventListener('close', () => {
  if (!$('#home').classList.contains('hidden')) renderHome();
  else if (G && R() && !R().done && !$('#game').classList.contains('hidden')) { renderChoices(); renderHints(); }
});
const segPick = (id, fn) => { $('#' + id).onclick = e => { const b = e.target.closest('button'); if (b) { fn(b.dataset.v); renderSettings(); } }; };
segPick('setCount', v => { opt.count = +v; LS.set('count', opt.count); });
segPick('setAnswer', v => { opt.answer = v; LS.set('answer', opt.answer); });
$('#setAuto').onchange = e => { opt.auto = e.target.checked; LS.set('auto', opt.auto); renderSettings(); };
$('#setHints').onchange = e => { opt.hintsOn = e.target.checked ? 'on' : 'off'; LS.set('hintsOn', opt.hintsOn); renderSettings(); };
$('#setSfx').onchange = e => { opt.sfx = e.target.checked; LS.set('sfx', opt.sfx); renderSettings(); if (opt.sfx) sound('ok'); };
$('#setClean').onchange = e => { opt.clean = e.target.checked; LS.set('clean', opt.clean); renderSettings(); };
$('#setStart').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.startMode = b.dataset.v; LS.set('startMode2', opt.startMode); renderSettings();
};
$('#setLadder').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.ladder = b.dataset.v; LS.set('ladder', opt.ladder); renderSettings();
  if (G && !$('#game').classList.contains('hidden')) toast(tx('Gilt ab dem nächsten Spiel'));
};
$('#btnResetAll').onclick = async () => {
  if (!await ask(tx('Alles löschen, was Needle Drop auf diesem Gerät gespeichert hat?'), { ok: tx('Löschen'), danger: true })) return;
  try { Object.keys(localStorage).filter(k => k.startsWith('mq.')).forEach(k => localStorage.removeItem(k)); } catch {}
  Sync.leave(); // vom persönlichen Code trennen, sonst käme beim nächsten Abgleich alles zurück
  location.reload();
};
$('#btnResetBest').onclick = async () => {
  if (!await ask(tx('Alle Rekorde auf diesem Gerät löschen?'), { ok: tx('Löschen'), danger: true })) return;
  try { Object.keys(localStorage).filter(k => k.startsWith('mq.best')).forEach(k => localStorage.removeItem(k)); } catch {}
  Sync.reset('mq.best2.'); // auch auf den anderen verbundenen Geräten
  toast(tx('Rekorde gelöscht'));
};

// Sprache: Auswahl in den Einstellungen, Wechsel ohne Neuladen
$('#langSel').onchange = e => setLang(e.target.value);
self.liveLang = () => {
  renderHome();
  if (sheet.open) { renderSettings(); goPage($('#sheetSettings .page.active')?.dataset.page || 'main'); }
  if (G && R() && !$('#game').classList.contains('hidden')) { renderRound(); if (R().done) $('#nextBtn').textContent = G.i + 1 >= G.n ? tx('Zum Ergebnis') : tx('Nächster Song'); }
};

// Lautstärke
$('#vol').oninput = e => setVol(+e.target.value);
$('#volMute').onclick = () => { opt.muted = !opt.muted; applyVol(); };
$('#choices').onclick = e => { const b = e.target.closest('[data-c]'); if (b) choose(+b.dataset.c); };
$('#themeRow').onclick = e => {
  const b = e.target.closest('[data-theme-pick]'); if (!b) return;
  opt.theme = b.dataset.themePick; LS.set('theme', opt.theme); renderSettings();
};

const gi = $('#guessInput');
gi.addEventListener('input', onType);
gi.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && sugg.length) { sel = (sel + 1) % sugg.length; renderSuggest(gi.value.trim(), true); $('#suggest .sel')?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
  else if (e.key === 'ArrowUp' && sugg.length) { sel = (sel - 1 + sugg.length) % sugg.length; renderSuggest(gi.value.trim(), true); $('#suggest .sel')?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    if (sel >= 0) pick(sel);
    else if (gi.value.trim().length >= 2) { clearTimeout(deb); seq++; onType(); } // Vorschläge sofort holen
  }
  else if (e.key === 'Escape') closeSuggest();
});
/* Vorschläge antippen: erst beim Loslassen auswählen und nur, wenn der Finger nicht gewischt hat – so lässt sich die Liste scrollen.
   Mit der Maus verhindert mousedown, dass das Suchfeld den Fokus verliert. */
{
  const ul = $('#suggest');
  let down = null;
  ul.addEventListener('mousedown', e => e.preventDefault());
  ul.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, top: ul.scrollTop }; });
  ul.addEventListener('pointerup', e => {
    const li = e.target.closest('li'), d = down; down = null;
    if (!li || !d) return;
    if (Math.abs(e.clientX - d.x) > 10 || Math.abs(e.clientY - d.y) > 10 || Math.abs(ul.scrollTop - d.top) > 4) return; // gewischt
    e.preventDefault(); pick(+li.dataset.i);
  });
  ul.addEventListener('pointercancel', () => { down = null; });
}
/* Liste nur so hoch, wie über der Tastatur Platz ist (visualViewport = sichtbarer Bereich ohne Tastatur) */
function fitSuggest() {
  const ul = $('#suggest');
  if (ul.classList.contains('hidden')) return;
  const vv = window.visualViewport, bottom = vv ? vv.offsetTop + vv.height : innerHeight;
  const room = bottom - ul.getBoundingClientRect().top - 12;
  ul.style.maxHeight = Math.max(150, Math.min(room, 460)) + 'px';
  moreHint();
}
/* Unten leicht ausblenden, solange weitere Treffer folgen (zeigt: hier geht's weiter) */
function moreHint() {
  const ul = $('#suggest');
  ul.classList.toggle('more', ul.scrollHeight - ul.scrollTop - ul.clientHeight > 8);
}
$('#suggest').addEventListener('scroll', moreHint, { passive: true });
window.visualViewport?.addEventListener('resize', fitSuggest);
window.visualViewport?.addEventListener('scroll', fitSuggest);
addEventListener('resize', fitSuggest);
/* Am Handy: das Suchfeld weich nach oben holen, damit die Vorschläge darunter Platz haben.
   Schon beim Antippen (touchstart) – dann ist das Feld oben, bevor die Tastatur kommt, und iOS muss nicht selbst
   springen. Bei Fokus ohne Antippen (z. B. Tastatur-Weiter) dasselbe nach dem Fokus. */
const touchUI = matchMedia('(pointer: coarse)').matches;
let lift = 0;
function liftSearch() {
  if (!touchUI) return;
  document.body.classList.add('typing');                       // unten Platz schaffen, sonst ginge es nicht weit genug hoch
  cancelAnimationFrame(lift);
  const sat = Math.max(0, parseFloat(getComputedStyle($('header')).paddingTop) - 16) || 0; // Abstand zur Statusleiste
  const from = scrollY, dy = gi.closest('.guess').getBoundingClientRect().top - sat - 14;
  if (Math.abs(dy) < 4) return fitSuggest();
  const t0 = performance.now(), ms = 320, ease = t => 1 - Math.pow(1 - t, 3);
  let done = false;
  const step = now => {
    const t = Math.min(1, (now - t0) / ms);
    scrollTo(0, from + dy * ease(t));
    if (t < 1) lift = requestAnimationFrame(step); else { done = true; fitSuggest(); }
  };
  lift = requestAnimationFrame(step);
  // Absicherung: läuft die Animation nicht (z. B. Stromsparmodus), direkt ans Ziel
  setTimeout(() => { if (!done) { cancelAnimationFrame(lift); scrollTo(0, from + dy); fitSuggest(); } }, ms + 150);
}
gi.addEventListener('touchstart', () => { if (document.activeElement !== gi) liftSearch(); }, { passive: true });
gi.addEventListener('focus', () => setTimeout(() => { if (Math.abs(gi.closest('.guess').getBoundingClientRect().top - 80) > 120) liftSearch(); }, 60));
window.visualViewport?.addEventListener('resize', () => { if (document.activeElement === gi) setTimeout(fitSuggest, 50); });
gi.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== gi) document.body.classList.remove('typing'); }, 200));
gi.addEventListener('blur', () => setTimeout(closeSuggest, 150));
document.addEventListener('keydown', e => {
  if ($('#game').classList.contains('hidden') || e.target === gi || sheet.open || $('#dlgAsk').open) return;
  if (e.target.matches?.('input,select,textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); R()?.done ? nextRound() : $('#disc').click(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setVol(opt.vol + 5); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); setVol(opt.vol - 5); }
  else if (e.key === 'm' || e.key === 'M') { opt.muted = !opt.muted; applyVol(); }
  else if (rule("answer") === 'mc' && /^[1-4]$/.test(e.key) && !R()?.done) choose(+e.key - 1);
});

$('#customUrl').value = LS.get('customUrl', '');
applyTheme();
applyVol();
renderHome();

// Neue Spielstände von anderen Geräten (js/sync.js, Code in der Jukebox): Startseite, Challenge und Einstellungen neu zeichnen
addEventListener('jukebox-sync', () => {
  if (!G && !$('#home').classList.contains('hidden')) renderHome();
  if (typeof Daily !== 'undefined') Daily.renderCard();
  if (sheet.open) { renderSettings(); renderProfile(); const p = $('#sheetSettings .page.active')?.dataset.page; if (p === 'stats') renderStats(); if (p === 'archive') Daily.renderArchive(); }
});
