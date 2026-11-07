/* Musik-Quiz – Spielablauf und Anzeige */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- Regeln ----------
   Punkte je Stufe: 600 / 500 / 400 / 300 / 200 / 100.
   Nur Interpret erkannt (Song nicht): halbe Punkte der Stufe, auf der der Interpret stimmte.
   Tipps ziehen feste Punkte ab (50 / 100 / 150), nie unter 0. */
const STEPS = [0.1, 0.5, 1, 2, 5, 10];
const PTS = [600, 500, 400, 300, 200, 100];
const HINT_COST = [50, 100, 150];
const HINT_FROM = 1; // Tipps erst ab Stufe 2 (0,5 s)
const fmtS = s => String(s).replace('.', ',') + ' s';
const fmtN = n => Math.round(n).toLocaleString('de-DE');

// Quellen: Deezer-Redaktions-Playlists; Billionärs Club als eigene Liste (scripts/build-billions.js)
const P = id => ({ type: 'playlist', id });
const CATS = [
  { id: '80s', group: 'decades', name: '80er', big: '80s', color: '#ff4fa3', src: [P(867825522)], decade: 1980 },
  { id: '90s', group: 'decades', name: '90er', big: '90s', color: '#8b6bff', src: [P(878989033), P(3829647662)], decade: 1990 },
  { id: '00s', group: 'decades', name: '2000er', big: '00s', color: '#00b8ff', src: [P(1977689462), P(11153531204)], decade: 2000 },
  { id: '10s', group: 'decades', name: '2010er', big: '10s', color: '#1ed760', src: [P(14917741483)], decade: 2010 },
  { id: '20s', group: 'decades', name: '2020er', big: '20s', color: '#ffb020', src: [P(13650084141)], decade: 2020 },
  { id: 'pop', group: 'genres', name: 'Pop', icon: 'star', sub: 'Chart-Pop von früher bis heute', color: '#ff8ad8', src: [P(1282483245), P(8282573142)] },
  { id: 'rap', group: 'genres', name: 'Hip-Hop & Rap', icon: 'mic', sub: 'US-Rap & Deutschrap', color: '#ff7a3c', src: [P(7662551722), P(12547421383), P(10578289242)] },
  { id: 'edm', group: 'genres', name: 'EDM', icon: 'wave', sub: 'Dance, Mainstage, Electronic', color: '#00e5c3', src: [P(1902101402), P(1495242491)] },
  { id: 'now', group: 'special', name: 'Aktuelle Hits', icon: 'trend', sub: 'Charts Deutschland & weltweit', color: '#ff5a6a', src: [P(1111143121), P(3155776842)] },
  { id: 'billion', group: 'special', name: 'Billionärs Club', icon: 'diamond', sub: 'Über 1 Mrd. Spotify-Streams', color: '#ffd54a', src: [{ type: 'static', url: 'data/billions.json' }] },
  { id: 'custom', group: 'special', name: 'Eigene Playlist', icon: 'link', sub: 'Deezer-Link einfügen', color: '#a1a1ad', src: null },
];
const DIFF = {
  easy: { top: 0.35, label: 'Leicht', info: 'Es kommen nur die bekanntesten 35 % der Kategorie dran – Songs, die fast jeder kennt.' },
  normal: { top: 0.7, label: 'Normal', info: 'Die bekannteren 70 % der Kategorie: viele Hits, dazu ein paar Songs, an die man sich erst erinnern muss.' },
  hard: { top: 1, label: 'Schwer', info: 'Die komplette Kategorie – auch Album-Tracks und Songs, die nicht jeder kennt.' },
};
const START_INFO = { start: 'Beginn des Ausschnitts', random: 'irgendwo im Ausschnitt' };

const LS = {
  get(k, d) { try { const v = localStorage.getItem('mq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mq.' + k, JSON.stringify(v)); } catch {} },
};

const opt = {
  cat: LS.get('cat', '80s'), diff: LS.get('diff', 'normal'), count: LS.get('count', 10),
  startMode: LS.get('startMode2', 'start'), hintsOn: LS.get('hintsOn', 'on'),
};
const pools = {};
let G = null;

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
      if (!r.ok) throw new Error('Liste für diese Kategorie fehlt noch.');
      const d = await r.json();
      return d.tracks.map(t => ({ id: t.id, title: t.title, artist: { name: t.artist }, rank: t.streams, stub: true }));
    }
    return DZ.sourceTracks(s);
  }));
  const seen = new Set(), pool = [];
  for (const t of lists.flat()) {
    if (!t.stub && (!t.readable || !t.preview)) continue;
    const k1 = t.isrc || t.id, k2 = norm(t.title_short || t.title) + '|' + norm(t.artist?.name);
    if (seen.has(k1) || seen.has(k2)) continue;
    seen.add(k1); seen.add(k2);
    pool.push(t);
  }
  if (cat.id !== 'custom') pools[cat.id] = pool;
  return pool;
}

function pickTracks(pool, diff, n) {
  const sorted = [...pool].sort((a, b) => (b.rank || 0) - (a.rank || 0));
  const top = sorted.slice(0, Math.max(n, Math.ceil(sorted.length * DIFF[diff].top)));
  for (let i = top.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [top[i], top[j]] = [top[j], top[i]]; }
  return top;
}

/** Audio + Albuminfos einer Runde laden. Abgelaufene Vorschau-Links werden über /track/{id} erneuert. */
function prepare(r) {
  return r.ready ||= (async () => {
    let t = r.track;
    if (t.stub || !t.preview) t = r.track = await DZ.track(t.id);
    try { r.buf = await Snip.load(t.preview); }
    catch { t = r.track = await DZ.track(t.id); r.buf = await Snip.load(t.preview); }
    r.offset = Snip.findStart(r.buf, opt.startMode);
    DZ.album(t.album.id).then(a => r.album = a).catch(() => {});
  })();
}

/* ---------- Spiel ---------- */
async function startGame() {
  const cat = CATS.find(c => c.id === opt.cat);
  let c = cat;
  if (cat.id === 'custom') {
    const src = DZ.parseLink($('#customUrl').value);
    if (src.error) return toast(src.error);
    LS.set('customUrl', $('#customUrl').value.trim());
    c = { ...cat, src: [src] };
  }
  loading(true, 'Lade Songs…');
  Snip.ac(); // Audio im Klick freischalten (iOS)
  try {
    const pool = await loadPool(c);
    if (pool.length < 3) throw new Error('Zu wenige abspielbare Songs in dieser Quelle.');
    const cand = pickTracks(pool, opt.diff, opt.count);
    G = { cat, cand, next: 0, rounds: [], i: -1, score: 0, n: Math.min(opt.count, cand.length) };
    document.documentElement.style.setProperty('--cat', cat.color);
    await nextRound();
    show('game');
  } catch (e) {
    toast(e.message || 'Fehler beim Laden');
  } finally { loading(false); }
}

function newRound() {
  const t = G.cand[G.next++];
  return t && { track: t, stage: 0, artistAt: null, hints: [], hintCost: 0, guesses: [], done: false, won: false, pts: 0 };
}

async function nextRound() {
  Snip.stop();
  $('#reveal').classList.add('hidden');
  G.i++;
  if (G.i >= G.n) return endGame();
  loading(true, 'Lade Song…');
  try {
    for (;;) {
      const r = G.pending || newRound();
      G.pending = null;
      if (!r) { G.n = G.i; return endGame(); }
      try { await prepare(r); G.rounds[G.i] = r; break; } catch { /* Song überspringen */ }
    }
  } finally { loading(false); }
  if (G.i + 1 < G.n) { const p = G.pending = newRound(); p && prepare(p).catch(() => { if (G.pending === p) G.pending = null; }); }
  renderRound();
}

const R = () => G.rounds[G.i];
const possible = r => Math.max(0, PTS[r.stage] - r.hintCost);

function playSnippet() {
  const r = R();
  if (!r?.buf) return;
  const dur = r.done ? Math.min(30, r.buf.duration - r.offset) : STEPS[r.stage];
  const wrap = $('.play-wrap');
  $('#playBtn').classList.add('playing'); wrap.classList.add('playing-wrap');
  Snip.play(r.buf, r.offset, dur, () => { $('#playBtn').classList.remove('playing'); wrap.classList.remove('playing-wrap'); });
  if (!r.done) animate(dur);
}

let raf = 0;
const RING = 2 * Math.PI * 56;
function animate(dur) {
  cancelAnimationFrame(raf);
  const segs = $$('#ladder .bar-fill'), ring = $('#ringFg');
  const tick = () => {
    const t = Snip.elapsed();
    if (t < 0) { segs.forEach(s => s.style.transform = 'scaleY(0)'); ring.style.strokeDashoffset = RING; return; }
    ring.style.strokeDashoffset = RING * (1 - Math.min(1, t / dur));
    STEPS.forEach((d, k) => {
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
  const text = `${showTitle(g)} – ${g.artist?.name || ''}`;
  if (songOk) { r.guesses.push({ text, kind: 'ok' }); return finishRound(true); }
  let note = '';
  if (artistOk) {
    if (r.artistAt == null) r.artistAt = r.stage;
    note = 'Interpret stimmt!';
  } else if (titleOk) note = 'Titel stimmt, Interpret nicht';
  r.guesses.push({ text, kind: note ? 'half' : 'bad', note });
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
  r.guesses.push({ text: `Übersprungen bei ${fmtS(STEPS[r.stage])}`, kind: 'skip' });
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
  let calc;
  if (won) {
    r.pts = possible(r);
    calc = `${fmtS(STEPS[r.stage])} = ${PTS[r.stage]}` + (r.hintCost ? ` − ${r.hintCost} Tipps` : '');
  } else if (r.artistAt != null) {
    const half = PTS[r.artistAt] / 2;
    r.pts = Math.max(0, half - r.hintCost);
    calc = `Nur Interpret (bei ${fmtS(STEPS[r.artistAt])}): ${PTS[r.artistAt]} ÷ 2 = ${half}` + (r.hintCost ? ` − ${r.hintCost} Tipps` : '');
  } else { r.pts = 0; calc = ''; }
  G.score += r.pts;
  const t = r.track;
  $('#rvCover').src = t.album?.cover_big || t.album?.cover_medium || '';
  $('#rvTitle').textContent = showTitle(t);
  $('#rvArtist').textContent = t.artist?.name || '';
  const y = r.album?.release_date?.slice(0, 4);
  $('#rvMeta').textContent = [t.album?.title, y].filter(Boolean).join(' · ');
  const res = $('#rvResult');
  if (won) { res.textContent = `+${fmtN(r.pts)} Punkte`; res.className = 'rv-result ok'; }
  else if (r.pts) { res.textContent = `+${fmtN(r.pts)} Punkte`; res.className = 'rv-result half'; }
  else { res.textContent = 'Leider nicht erkannt'; res.className = 'rv-result bad'; }
  $('#rvCalc').textContent = calc;
  $('#nextBtn').textContent = G.i + 1 >= G.n ? 'Zum Ergebnis' : 'Nächster Song';
  $('#scoreNo').textContent = fmtN(G.score);
  renderProgress();
  $('#reveal').classList.remove('hidden');
  playSnippet(); // Auflösung: bis zu 30 s ab dem Startpunkt
}

function endGame() {
  Snip.stop();
  $('#reveal').classList.add('hidden');
  const max = G.n * PTS[0];
  $('#endScore').textContent = fmtN(G.score);
  $('#endCat').textContent = `${G.cat.name} · ${DIFF[opt.diff].label}`;
  const key = `best.${G.cat.id}.${opt.diff}.${opt.count}`;
  const best = LS.get(key, 0);
  const isBest = G.cat.id !== 'custom' && G.score > best;
  if (isBest) LS.set(key, G.score);
  const found = G.rounds.filter(r => r.won).length;
  $('#endSub').textContent = `${found} von ${G.n} Songs erkannt · max. ${fmtN(max)}` + (isBest ? ' · 🏆 Neuer Rekord!' : best ? ` · Rekord ${fmtN(best)}` : '');
  $('#endList').innerHTML = G.rounds.map(r => `
    <li><img src="${r.track.album?.cover_small || ''}" alt="">
      <span class="t"><b>${esc(showTitle(r.track))}</b><small>${esc(r.track.artist?.name || '')}</small><span class="emo">${emojiRow(r)}</span></span>
      <span class="p ${r.pts ? '' : 'zero'}">${r.pts ? '+' + fmtN(r.pts) : '0'}</span></li>`).join('');
  show('end');
}

function emojiRow(r) {
  return STEPS.map((_, k) => {
    if (r.won && k === r.stage) return '🟩';
    if (k === r.artistAt) return '🟨';
    if (!r.won && k === r.stage) return '🟥';
    return k < r.stage ? '⬛' : '⬜';
  }).join('');
}

const shareText = () => `🎵 Musik-Quiz – ${G.cat.name} (${DIFF[opt.diff].label})\n${fmtN(G.score)} Punkte\n${G.rounds.map(emojiRow).join('\n')}`;

/* ---------- Anzeige ---------- */
function show(id) {
  ['home', 'game', 'end'].forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
  window.scrollTo(0, 0);
}

function catBtn(c) {
  const on = c.id === opt.cat ? ' on' : '';
  if (c.group === 'decades') return `<button class="cat dec${on}" data-id="${c.id}" style="--c:${c.color}"><span class="big">${c.big}</span><small>${c.name}</small></button>`;
  return `<button class="cat${on}" data-id="${c.id}" style="--c:${c.color}">
    <span class="cat-ic"><svg class="ic"><use href="#i-${c.icon}"/></svg></span>
    <span class="cat-t"><b>${c.name}</b><small>${c.sub}</small></span></button>`;
}

function renderHome() {
  for (const [g, el] of [['decades', '#catsDecades'], ['genres', '#catsGenres'], ['special', '#catsSpecial']])
    $(el).innerHTML = CATS.filter(c => c.group === g).map(catBtn).join('');
  $('#customBox').classList.toggle('hidden', opt.cat !== 'custom');
  $$('#diff button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.diff));
  for (const k of ['count', 'startMode', 'hintsOn']) $$(`#${k} button`).forEach(b => b.classList.toggle('on', b.dataset.v == opt[k]));
  $('#diffInfo').textContent = DIFF[opt.diff].info;
  $('#startInfo').textContent = START_INFO[opt.startMode];
  const c = CATS.find(x => x.id === opt.cat);
  document.documentElement.style.setProperty('--cat', c.color);
  $('#startBtn').textContent = `${c.name} spielen`;
  const best = LS.get(`best.${opt.cat}.${opt.diff}.${opt.count}`, 0);
  $('#best').textContent = best ? `🏆 Dein Rekord: ${fmtN(best)}` : '';
}

function renderProgress() {
  $('#progress').innerHTML = Array.from({ length: G.n }, (_, k) => {
    const r = G.rounds[k];
    const cls = k === G.i && !r?.done ? 'cur' : r?.done ? (r.won ? 'ok' : r.pts ? 'half' : 'bad') : '';
    return `<i class="${cls}"></i>`;
  }).join('');
}

function renderRound() {
  const r = R();
  $('#catChip').textContent = G.cat.name;
  $('#roundNo').textContent = `Song ${G.i + 1} von ${G.n}`;
  $('#scoreNo').textContent = fmtN(G.score);
  renderProgress();
  $('#ladder').innerHTML = STEPS.map((s, k) => `
    <div class="step ${k < r.stage ? 'past' : k === r.stage ? 'cur' : ''}">
      <div class="bar" style="--h:${14 + k * 9}px"><div class="bar-fill"></div></div>
      <span class="s">${fmtS(s)}</span><span class="p">${PTS[k]}</span>
    </div>`).join('');
  $('#ringFg').style.strokeDashoffset = RING;
  $('#playLbl').textContent = fmtS(STEPS[r.stage]);
  $('#possible').textContent = fmtN(possible(r));
  const nx = STEPS[r.stage + 1];
  $('#skipLbl').textContent = nx ? `${fmtS(nx)} hören` : 'Mehr hören';
  $('#skipBtn').disabled = !nx;
  $('#status').innerHTML = r.artistAt != null ? `<span class="pill ok">✓ Interpret richtig – jetzt noch der Song</span>` : '';
  $('#guesses').innerHTML = r.guesses.slice().reverse().map(g => {
    const ic = { ok: '✅', half: '🟨', bad: '❌', skip: '⏭' }[g.kind];
    return `<li class="${g.kind}"><span>${ic}</span><span>${esc(g.text)}${g.note ? `<small>${esc(g.note)}</small>` : ''}</span></li>`;
  }).join('');
  $('#guessInput').value = '';
  closeSuggest();
  renderHints();
}

function renderHints() {
  const r = R(), t = r.track, a = r.album;
  const enabled = opt.hintsOn === 'on';
  const unlocked = r.stage >= HINT_FROM;
  const btn = $('#hintBtn');
  btn.classList.toggle('hidden', !enabled);
  btn.disabled = !unlocked;
  btn.title = unlocked ? '' : 'Tipps gibt es ab 0,5 s';
  if (!enabled || !unlocked) $('#hintPanel').classList.add('hidden');
  btn.classList.toggle('active', !$('#hintPanel').classList.contains('hidden'));

  // „Stark“ enthält die Titel-Lücken schon – danach ist „Mittel“ überflüssig
  $$('.hint').forEach(b => b.classList.toggle('used', r.hints.includes(+b.dataset.h) || (+b.dataset.h === 1 && r.hints.includes(2))));
  const out = [];
  const words = showTitle(t).replace(/\s*[([].*?[)\]]/g, '').trim().split(/\s+/);
  if (r.hints.includes(0)) {
    const y = +(a?.release_date || '').slice(0, 4);
    const genre = a?.genres?.data?.map(g => g.name).slice(0, 2).join(', ');
    let when = y ? `${Math.floor(y / 10) * 10}er` : '';
    if (G.cat.decade && y && Math.floor(y / 10) * 10 !== G.cat.decade) when = `${G.cat.decade}er`; // Best-of-Alben haben oft falsche Jahre
    out.push(`<div><span>Jahrzehnt</span><b>${when || 'unbekannt'}</b></div>` + (genre ? `<div><span>Genre</span><b>${esc(genre)}</b></div>` : ''));
  }
  if (r.hints.includes(1) && !r.hints.includes(2)) {
    out.push(`<div><span>Titel</span><b class="gaps">${esc(words.map(w => w.replace(/[\p{L}\p{N}]/gu, '_')).join('  '))}</b></div>`);
  }
  if (r.hints.includes(2)) {
    out.push(`<div><span>Titel</span><b class="gaps">${esc(words.map(w => w.replace(/^([\p{L}\p{N}])|[\p{L}\p{N}]/gu, (m, f) => f || '_')).join('  '))}</b></div>`);
    out.push(`<div><span>Interpret</span><b>${esc((t.artist?.name || '?')[0])}…</b></div>`);
  }
  $('#hintOut').innerHTML = out.join('');
  const cv = $('#pixel');
  cv.classList.toggle('hidden', !r.hints.includes(2));
  if (r.hints.includes(2)) pixelate(t.album?.cover_medium, cv, 7);
}

function pixelate(src, cv, n) {
  if (!src) return;
  const img = new Image();
  img.onload = () => {
    const tiny = document.createElement('canvas'); tiny.width = tiny.height = n;
    tiny.getContext('2d').drawImage(img, 0, 0, n, n);
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.drawImage(tiny, 0, 0, cv.width, cv.height);
  };
  img.src = src;
}

/* ---------- Suche mit Vorschlägen ---------- */
let sugg = [], sel = -1, seq = 0, deb = 0;
function onType() {
  clearTimeout(deb);
  const q = $('#guessInput').value.trim();
  if (q.length < 2) return closeSuggest();
  deb = setTimeout(async () => {
    const my = ++seq;
    let res = [];
    try { res = await DZ.search(q, 20); } catch { return; }
    if (my !== seq) return;
    const seen = new Set();
    sugg = res.sort((a, b) => (b.rank || 0) - (a.rank || 0))
      .filter(t => { const k = norm(showTitle(t)) + '|' + norm(t.artist?.name); return !seen.has(k) && seen.add(k); })
      .slice(0, 6);
    sel = sugg.length ? 0 : -1;
    renderSuggest(q);
  }, 160);
}
function mark(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}
function renderSuggest(q = '') {
  const ul = $('#suggest');
  ul.classList.toggle('hidden', !sugg.length);
  ul.innerHTML = sugg.map((t, i) => `<li class="${i === sel ? 'sel' : ''}" data-i="${i}">
    <img src="${t.album?.cover_small || ''}" alt="" loading="lazy">
    <span><b>${mark(showTitle(t), q)}</b><small>${mark(t.artist?.name || '', q)}</small></span></li>`).join('');
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
function shake() { const c = $('.guess'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

/* ---------- Ereignisse ---------- */
$('#home').addEventListener('click', e => {
  const b = e.target.closest('.cat'); if (!b) return;
  opt.cat = b.dataset.id; LS.set('cat', opt.cat); renderHome();
  if (opt.cat === 'custom') $('#customUrl').focus();
});
$('#diff').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.diff = b.dataset.v; LS.set('diff', opt.diff); renderHome();
});
for (const [k, key] of [['count', 'count'], ['startMode', 'startMode2'], ['hintsOn', 'hintsOn']]) {
  $('#' + k).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    opt[k] = k === 'count' ? +b.dataset.v : b.dataset.v; LS.set(key, opt[k]); renderHome();
  });
}
$('#startBtn').onclick = startGame;
$('#playBtn').onclick = playSnippet;
$('#skipBtn').onclick = skip;
$('#hintBtn').onclick = () => { $('#hintPanel').classList.toggle('hidden'); renderHints(); };
$('#giveupBtn').onclick = () => { if (!R().done && confirm('Aufgeben und Song auflösen?')) finishRound(false); };
$('#nextBtn').onclick = nextRound;
$('#quitBtn').onclick = () => { if (confirm('Spiel beenden?')) { Snip.stop(); G = null; renderHome(); show('home'); } };
$$('.hint').forEach(b => b.onclick = () => useHint(+b.dataset.h));
$('#againBtn').onclick = startGame;
$('#homeBtn').onclick = () => { renderHome(); show('home'); };
$('#shareBtn').onclick = async () => {
  const text = shareText();
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Ergebnis kopiert'); }
  } catch {}
};

const gi = $('#guessInput');
gi.addEventListener('input', onType);
gi.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' && sugg.length) { sel = (sel + 1) % sugg.length; renderSuggest(gi.value.trim()); e.preventDefault(); }
  else if (e.key === 'ArrowUp' && sugg.length) { sel = (sel - 1 + sugg.length) % sugg.length; renderSuggest(gi.value.trim()); e.preventDefault(); }
  else if (e.key === 'Enter') { if (sel >= 0) pick(sel); e.preventDefault(); }
  else if (e.key === 'Escape') closeSuggest();
});
$('#suggest').addEventListener('pointerdown', e => { const li = e.target.closest('li'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
gi.addEventListener('blur', () => setTimeout(closeSuggest, 150));
document.addEventListener('keydown', e => {
  if ($('#game').classList.contains('hidden') || e.target === gi) return;
  if (e.code === 'Space') { e.preventDefault(); $('#reveal').classList.contains('hidden') ? playSnippet() : nextRound(); }
});

$('#customUrl').value = LS.get('customUrl', '');
renderHome();
