/* Musik-Blitz – Spielablauf und Anzeige */
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
const HINT_COST = [50, 100, 150];
const HINT_FROM = 1; // Tipps erst ab Stufe 2 (0,5 s)
const fmtS = s => String(s).replace('.', ',') + ' s';
const fmtN = n => Math.round(n).toLocaleString('de-DE');

// Quellen: Deezer-Redaktions-Playlists; Billionärs Club als eigene Liste (scripts/build-billions.js)
const P = id => ({ type: 'playlist', id });
const CATS = [
  { id: '80s', group: 'decades', name: '80er', big: '80s', color: '#ff4fa3', src: [P(867825522)], decade: 1980 },
  { id: '90s', group: 'decades', name: '90er', big: '90s', color: '#8b6bff', src: [P(878989033), P(3829647662)], decade: 1990 },
  { id: '00s', group: 'decades', name: '2000er', big: '00s', color: '#0ea5e9', src: [P(1977689462), P(11153531204)], decade: 2000 },
  { id: '10s', group: 'decades', name: '2010er', big: '10s', color: '#1ed760', src: [P(14917741483)], decade: 2010 },
  { id: '20s', group: 'decades', name: '2020er', big: '20s', color: '#ffa03c', src: [P(13650084141)], decade: 2020 },
  { id: 'pop', group: 'genres', name: 'Pop', icon: 'star', sub: 'Chart-Pop von früher bis heute', color: '#ff4fa3', src: [P(1282483245), P(8282573142)] },
  { id: 'rap', group: 'genres', name: 'Hip-Hop & Rap', icon: 'mic', sub: 'US-Rap & Deutschrap', color: '#ff7a3c', src: [P(7662551722), P(12547421383), P(10578289242)] },
  { id: 'edm', group: 'genres', name: 'EDM', icon: 'wave', sub: 'Dance, Mainstage, Electronic', color: '#14b8a6', src: [P(1902101402), P(1495242491)] },
  { id: 'now', group: 'special', name: 'Aktuelle Hits', icon: 'trend', sub: 'Charts Deutschland & weltweit', color: '#ff5a6a', src: [P(1111143121), P(3155776842)] },
  { id: 'billion', group: 'special', name: 'Billionärs Club', icon: 'diamond', sub: 'Über 1 Mrd. Spotify-Streams', color: '#e5a50a', src: [{ type: 'static', url: 'data/billions.json' }] },
  { id: 'custom', group: 'special', name: 'Eigene Playlist', icon: 'link', sub: 'Deezer-Link einfügen', color: '#6b7280', src: null },
];
const DIFF = {
  easy: { top: 0.35, label: 'Leicht', info: 'Nur die bekanntesten 35 % der Kategorie – Songs, die fast jeder kennt.' },
  normal: { top: 0.7, label: 'Normal', info: 'Die bekannteren 70 % der Kategorie: viele Hits, dazu Songs, an die man sich erst erinnern muss.' },
  hard: { top: 1, label: 'Schwer', info: 'Die komplette Kategorie – auch Album-Tracks und Songs, die nicht jeder kennt.' },
};
// Farbthemen wie in Musik-Bingo
const THEMES = [['graphit', 'Graphit', '#3a4252', '#1f3a32'], ['ozean', 'Ozean', '#0b4f75', '#0d6e66'], ['wald', 'Wald', '#1d5a3a', '#4c5b1a'],
  ['abend', 'Abend', '#7a2e1c', '#7d1f4a'], ['lila', 'Lila', '#4a22a0', '#8a1458'], ['oled', 'OLED', '#000', '#000']];

const LS = {
  get(k, d) { try { const v = localStorage.getItem('mq.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mq.' + k, JSON.stringify(v)); } catch {} },
};

const opt = {
  cat: LS.get('cat', '80s'), diff: LS.get('diff', 'normal'), count: LS.get('count', 10),
  startMode: LS.get('startMode2', 'start'), hintsOn: LS.get('hintsOn', 'on'), theme: LS.get('theme', 'graphit'),
  ladder: LS.get('ladder', 'classic'), answer: LS.get('answer', 'search'), auto: LS.get('auto', false),
  clean: LS.get('clean', false), vol: LS.get('vol', 80), muted: false,
};
const bestKey = (cat = opt.cat) => `best2.${cat}.${opt.diff}.${opt.count}.${opt.ladder}.${opt.answer}`;
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
  const sorted = pool.filter(t => !opt.clean || !t.explicit_lyrics).sort((a, b) => (b.rank || 0) - (a.rank || 0));
  const top = sorted.slice(0, Math.max(n, Math.ceil(sorted.length * DIFF[diff].top)));
  for (let i = top.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [top[i], top[j]] = [top[j], top[i]]; }
  return top;
}

/** Audio + Albuminfos einer Runde laden. Abgelaufene Vorschau-Links werden über /track/{id} erneuert. */
function prepare(r) {
  return r.ready ||= (async () => {
    let t = r.track;
    if (t.stub || !t.preview) t = r.track = await DZ.track(t.id);
    if (opt.clean && t.explicit_lyrics) throw new Error('explizit'); // Billionärs-Liste kennt das erst hier
    try { r.buf = await Snip.load(t.preview); }
    catch { t = r.track = await DZ.track(t.id); r.buf = await Snip.load(t.preview); }
    r.offset = Snip.findStart(r.buf, opt.startMode, STEPS[STEPS.length - 1]);
    DZ.album(t.album.id).then(a => r.album = a).catch(() => {});
  })();
}

/* ---------- Spiel ---------- */
async function startGame() {
  const cat = CATS.find(c => c.id === opt.cat);
  let c = cat;
  if (cat.id === 'custom') {
    const src = DZ.parseLink($('#customUrl').value);
    if (src.error) { toast(src.error); $('#customUrl').focus(); return; }
    LS.set('customUrl', $('#customUrl').value.trim());
    c = { ...cat, src: [src] };
  }
  loading(true, 'Lade Songs…');
  Snip.ac(); // Audio im Klick freischalten (iOS)
  try {
    const pool = await loadPool(c);
    if (pool.length < 3) throw new Error('Zu wenige abspielbare Songs in dieser Quelle.');
    const cand = pickTracks(pool, opt.diff, opt.count);
    STEPS = LADDERS[opt.ladder] || LADDERS.classic;
    G = { cat, cand, pool, next: 0, rounds: [], i: -1, score: 0, n: Math.min(opt.count, cand.length) };
    setCat(cat.color);
    show('game');
    await nextRound();
  } catch (e) {
    toast(e.message || 'Fehler beim Laden');
    if (!G?.rounds.length) show('home');
  } finally { loading(false); }
}

function newRound() {
  const t = G.cand[G.next++];
  return t && { track: t, stage: 0, artistAt: null, hints: [], hintCost: 0, guesses: [], done: false, won: false, pts: 0 };
}

async function nextRound() {
  Snip.stop();
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
  Snip.play(r.buf, r.offset, dur, () => { disc.classList.remove('playing', 'counting'); disc.classList.add('paused'); });
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
  let calc = '';
  if (won) {
    r.pts = possible(r);
    calc = `Erkannt bei ${fmtS(STEPS[r.stage])}: ${PTS[r.stage]}` + (r.hintCost ? ` − ${r.hintCost} für Tipps` : '');
  } else if (r.artistAt != null) {
    const half = PTS[r.artistAt] / 2;
    r.pts = Math.max(0, half - r.hintCost);
    calc = `Nur Interpret (bei ${fmtS(STEPS[r.artistAt])}): ${PTS[r.artistAt]} ÷ 2` + (r.hintCost ? ` − ${r.hintCost} für Tipps` : '');
  } else { r.pts = 0; calc = 'Diesmal leider nicht erkannt'; }
  G.score += r.pts;
  const t = r.track;
  // Platte dreht sich um und zeigt das Cover (wie bei Musik-Bingo)
  $('#discCover').innerHTML = t.album?.cover_big ? `<img src="${t.album.cover_big}" alt="">` : '🎵';
  $('#disc').classList.add('flipped');
  const ans = $('#rvA').parentElement;
  ans.className = 'rv-answer ' + (won ? '' : r.pts ? 'half' : 'bad');
  $('#rvQ').textContent = calc;
  $('#rvA').textContent = r.pts ? `+${fmtN(r.pts)} Punkte` : '0 Punkte';
  $('#rvTitle').textContent = showTitle(t);
  $('#rvArtist').textContent = t.artist?.name || '';
  const y = r.album?.release_date?.slice(0, 4);
  $('#rvMeta').textContent = [t.album?.title, y].filter(Boolean).join(' · ');
  $('#nextBtn').textContent = G.i + 1 >= G.n ? 'Zum Ergebnis' : 'Nächster Song';
  $('#playArea').classList.add('hidden');
  $('#possibleLine').textContent = r.won ? 'Erkannt!' : 'Auflösung';
  $('#reveal').classList.remove('hidden');
  renderMeta();
  renderTries();
  playSnippet();
}

function endGame() {
  Snip.stop();
  const max = G.n * PTS[0];
  const key = bestKey(G.cat.id);
  const best = LS.get(key, 0);
  const isBest = G.cat.id !== 'custom' && G.score > best;
  if (isBest) LS.set(key, G.score);
  const found = G.rounds.filter(r => r.won).length;
  $('#endCat').textContent = `${G.cat.name} · ${DIFF[opt.diff].label}`;
  $('#endFound').textContent = `${found} von ${G.n} erkannt`;
  $('#endScore').textContent = fmtN(G.score);
  $('#endSub').textContent = `von ${fmtN(max)} möglichen` + (isBest ? ' · 🏆 Neuer Rekord!' : best ? ` · Rekord ${fmtN(best)}` : '');
  $('#endList').innerHTML = G.rounds.map(r => `
    <div class="cell"><img class="pl-cover" src="${r.track.album?.cover_small || ''}" alt="">
      <span class="grow">${esc(showTitle(r.track))}<span class="sub">${esc(r.track.artist?.name || '')}</span><span class="emo">${emojiRow(r)}</span></span>
      <span class="trail ${r.pts ? '' : 'zero'}">${r.pts ? '+' + fmtN(r.pts) : '0'}</span></div>`).join('');
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

const shareText = () => `⚡ Musik-Blitz –${G.cat.name} (${DIFF[opt.diff].label})\n${fmtN(G.score)} Punkte\n${G.rounds.map(emojiRow).join('\n')}\nhttps://ku3rb1s.github.io/musik-quiz/`;

/* ---------- Anzeige ---------- */
function show(id) {
  $('#home').classList.toggle('hidden', id !== 'home');
  $('#game').classList.toggle('hidden', id !== 'game');
  $('#end').classList.toggle('hidden', id !== 'end');
  $('#btnQuit').classList.toggle('hidden', id !== 'game');
  window.scrollTo(0, 0);
}

function setCat(color) { document.documentElement.style.setProperty('--cat', color); }
const catIcon = c => c.group === 'decades' ? c.big : `<svg class="ic"><use href="#i-${c.icon}"/></svg>`;

function catCell(c) {
  const on = c.id === opt.cat;
  return `<button class="cell tap${on ? ' sel' : ''}" data-id="${c.id}">
    <span class="cell-ic" style="background:${c.color}"><svg class="ic"><use href="#i-${c.icon}"/></svg></span>
    <span class="grow">${c.name}<span class="sub">${c.sub}</span></span>
    <span class="trail">${on ? '<svg class="ic"><use href="#i-check"/></svg>' : ''}</span></button>`;
}

function renderHome() {
  const c = CATS.find(x => x.id === opt.cat);
  setCat(c.color);
  $('#catsDecades').innerHTML = CATS.filter(x => x.group === 'decades').map(x =>
    `<button class="${x.id === opt.cat ? 'on' : ''}" data-id="${x.id}" style="--c:${x.color}">${x.big}<small>${x.name}</small></button>`).join('');
  $('#catsGenres').innerHTML = CATS.filter(x => x.group === 'genres').map(catCell).join('');
  $('#catsSpecial').innerHTML = CATS.filter(x => x.group === 'special').map(catCell).join('');
  $('#customBox').classList.toggle('hidden', opt.cat !== 'custom');
  $('#customNote').classList.toggle('hidden', opt.cat !== 'custom');
  $$('#diff button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.diff));
  $('#diffInfo').textContent = DIFF[opt.diff].info;
  const icon = $('#homeCatIcon');
  icon.className = 'cat-icon' + (c.group === 'decades' ? ' dec' : '');
  icon.innerHTML = catIcon(c);
  $('#homeCatName').textContent = c.name;
  $('#startLbl').textContent = `${c.name} spielen`;
  const best = LS.get(bestKey(), 0);
  $('#bestPill').textContent = best ? `🏆 Rekord ${fmtN(best)}` : `${DIFF[opt.diff].label} · ${opt.count} Songs`;
}

function renderMeta() {
  $('#roundNo').textContent = `Song ${G.i + 1} / ${G.n}`;
  $('#scorePill').textContent = `${fmtN(G.score)} Punkte`;
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
  $('#gameKicker').textContent = G.cat.name;
  const icon = $('#gameCatIcon');
  icon.className = 'cat-icon' + (G.cat.group === 'decades' ? ' dec' : '');
  icon.innerHTML = catIcon(G.cat);
  $('#stageName').textContent = fmtS(STEPS[r.stage]);
  $('#possibleLine').innerHTML = `Jetzt möglich: <b>${fmtN(possible(r))}</b> Punkte`;
  $('#ladder').innerHTML = STEPS.map((s, k) => `
    <div class="step ${k < r.stage ? 'past' : k === r.stage ? 'cur' : ''}">
      <div class="bar" style="--h:${12 + k * 8}px"><div class="bar-fill"></div></div>
      <span class="s">${fmtS(s)}</span><span class="p">${PTS[k]}</span>
    </div>`).join('');
  setRing(0);
  const nx = STEPS[r.stage + 1];
  $('#skipLbl').textContent = nx ? `${fmtS(nx)} hören` : 'Mehr hören';
  $('#skipBtn').disabled = !nx;
  $('#status').innerHTML = r.artistAt != null ? `<span class="badge warn-b">✓ Interpret richtig – jetzt noch der Song</span>` : '';
  $('#guessInput').value = '';
  closeSuggest();
  renderChoices();
  renderTries();
  renderHints();
}

/* ---------- 4 Antworten (Multiple Choice) ---------- */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function renderChoices() {
  const r = R(), mc = opt.answer === 'mc';
  $('#choices').classList.toggle('hidden', !mc);
  $('.guess').classList.toggle('hidden', mc);
  if (!mc) return;
  if (!r.choices) {
    // Falsche Antworten aus derselben Kategorie, aber von anderen Interpreten
    const ta = norm(r.track.artist?.name), seen = new Set([ta]);
    const others = shuffle(G.pool.filter(t => t.id !== r.track.id)).filter(t => {
      const a = norm(t.artist?.name); if (seen.has(a)) return false; seen.add(a); return true;
    }).slice(0, 3);
    r.choices = shuffle([r.track, ...others]);
    r.wrong = [];
  }
  $('#choices').innerHTML = r.choices.map((t, i) => `<button class="choice${r.wrong.includes(i) ? ' wrong' : ''}" data-c="${i}" ${r.wrong.includes(i) ? 'disabled' : ''}>
    <b>${esc(showTitle(t))}</b><small>${esc(t.artist?.name || '')}</small></button>`).join('');
}
function choose(i) {
  const r = R();
  if (r.done || r.wrong.includes(i)) return;
  const t = r.choices[i];
  if (t.id === r.track.id) { r.guesses.push({ text: `${showTitle(t)} – ${t.artist?.name || ''}`, kind: 'ok' }); return finishRound(true); }
  r.wrong.push(i);
  r.guesses.push({ text: `${showTitle(t)} – ${t.artist?.name || ''}`, kind: 'bad' });
  shake('#choices');
  advance(false);
}

function renderHints() {
  const r = R(), t = r.track, a = r.album;
  const enabled = opt.hintsOn === 'on', unlocked = r.stage >= HINT_FROM;
  const btn = $('#hintBtn');
  btn.classList.toggle('hidden', !enabled);
  btn.disabled = !unlocked;
  btn.title = unlocked ? '' : 'Tipps gibt es ab 0,5 s';
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
    let when = y ? `${Math.floor(y / 10) * 10}er` : '';
    if (G.cat.decade && y && Math.floor(y / 10) * 10 !== G.cat.decade) when = `${G.cat.decade}er`; // Best-of-Alben haben oft falsche Jahre
    out.push(row('Jahrzehnt', when || 'unbekannt'));
    if (genre) out.push(row('Genre', esc(genre)));
  }
  if (r.hints.includes(1) && !r.hints.includes(2))
    out.push(row('Titel', `<span class="gaps">${esc(words.map(w => w.replace(/[\p{L}\p{N}]/gu, '_')).join('  '))}</span>`));
  if (r.hints.includes(2)) {
    out.push(row('Titel', `<span class="gaps">${esc(words.map(w => w.replace(/^([\p{L}\p{N}])|[\p{L}\p{N}]/gu, (m, f) => f || '_')).join('  '))}</span>`));
    out.push(row('Interpret', esc((t.artist?.name || '?')[0]) + '…'));
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

/* ---------- Einstellungen ---------- */
function applyTheme() {
  const th = THEMES.find(x => x[0] === opt.theme) ? opt.theme : 'graphit';
  document.documentElement.dataset.theme = th;
  const bg = { graphit: '#0c0c0f', lila: '#0d0a1a', ozean: '#05111a', abend: '#130a0b', wald: '#08110c', oled: '#000000' }[th];
  $('meta[name=theme-color]').content = bg;
  $('#themeRow').innerHTML = THEMES.map(([id, name, a, b]) =>
    `<button class="theme-pick ${th === id ? 'on' : ''}" data-theme-pick="${id}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${name}</button>`).join('');
}
function renderSettings() {
  $('#setCount').value = String(opt.count);
  $('#setAnswer').value = opt.answer;
  $('#setAuto').checked = !!opt.auto;
  $('#setHints').checked = opt.hintsOn === 'on';
  $('#setClean').checked = !!opt.clean;
  $$('#setStart button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.startMode));
  $$('#setLadder button').forEach(b => b.classList.toggle('on', b.dataset.v === opt.ladder));
  $('#startInfo').textContent = START_INFO[opt.startMode];
  const L = LADDERS[opt.ladder];
  $('#pointsInfo').innerHTML = [0, 3].map(k => `<div class="cell"><span class="grow">Erkannt bei ${L.slice(k, k + 3).map(fmtS).join(' · ')}</span><b>${PTS.slice(k, k + 3).join(' · ')}</b></div>`).join('');
  applyTheme();
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
function shake(sel = '.guess') { const c = $(sel); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

/* ---------- Ereignisse ---------- */
$('#home').addEventListener('click', e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  opt.cat = b.dataset.id; LS.set('cat', opt.cat); renderHome();
  if (opt.cat === 'custom') $('#customUrl').focus();
});
$('#diff').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.diff = b.dataset.v; LS.set('diff', opt.diff); renderHome();
});
$('#startBtn').onclick = startGame;
$('#disc').onclick = playSnippet;
$('#skipBtn').onclick = skip;
$('#hintBtn').onclick = () => { $('#hintPanel').classList.toggle('hidden'); renderHints(); };
$('#giveupBtn').onclick = () => { if (!R().done && confirm('Song auflösen? Du bekommst nur Punkte, falls der Interpret schon stimmte.')) finishRound(false); };
$('#nextBtn').onclick = nextRound;
$$('.hint-b').forEach(b => b.onclick = () => useHint(+b.dataset.h));
$('#againBtn').onclick = startGame;
const goHome = () => { Snip.stop(); G = null; renderHome(); show('home'); };
/** Zur Startseite – mitten im Spiel nur nach Rückfrage */
function leave() {
  const inGame = G && !$('#game').classList.contains('hidden');
  if (inGame && !confirm('Spiel beenden? Der bisherige Punktestand geht verloren.')) return;
  goHome();
}
$('#homeBtn').onclick = goHome;
$('#btnQuit').onclick = leave;
$('#logoBtn').onclick = leave;
$('#shareBtn').onclick = async () => {
  const text = shareText();
  try {
    if (navigator.share && matchMedia('(pointer:coarse)').matches) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast('Ergebnis kopiert'); }
  } catch {}
};

// Einstellungen
const sheet = $('#sheetSettings');
$('#btnSettings').onclick = () => { renderSettings(); sheet.showModal(); };
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });
sheet.addEventListener('close', () => {
  if (!$('#home').classList.contains('hidden')) renderHome();
  else if (G && R() && !R().done && !$('#game').classList.contains('hidden')) { renderChoices(); renderHints(); }
});
$('#setCount').onchange = e => { opt.count = +e.target.value; LS.set('count', opt.count); };
$('#setAnswer').onchange = e => { opt.answer = e.target.value; LS.set('answer', opt.answer); };
$('#setAuto').onchange = e => { opt.auto = e.target.checked; LS.set('auto', opt.auto); };
$('#setHints').onchange = e => { opt.hintsOn = e.target.checked ? 'on' : 'off'; LS.set('hintsOn', opt.hintsOn); };
$('#setClean').onchange = e => { opt.clean = e.target.checked; LS.set('clean', opt.clean); };
$('#setStart').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.startMode = b.dataset.v; LS.set('startMode2', opt.startMode); renderSettings();
};
$('#setLadder').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  opt.ladder = b.dataset.v; LS.set('ladder', opt.ladder); renderSettings();
  if (G && !$('#game').classList.contains('hidden')) toast('Gilt ab dem nächsten Spiel');
};
$('#btnResetBest').onclick = () => {
  if (!confirm('Alle Rekorde auf diesem Gerät löschen?')) return;
  try { Object.keys(localStorage).filter(k => k.startsWith('mq.best')).forEach(k => localStorage.removeItem(k)); } catch {}
  toast('Rekorde gelöscht');
};

// Lautstärke
$('#vol').oninput = e => setVol(+e.target.value);
$('#volMute').onclick = () => { opt.muted = !opt.muted; applyVol(); };
$('#choices').onclick = e => { const b = e.target.closest('[data-c]'); if (b) choose(+b.dataset.c); };
$('#themeRow').onclick = e => {
  const b = e.target.closest('[data-theme-pick]'); if (!b) return;
  opt.theme = b.dataset.themePick; LS.set('theme', opt.theme); applyTheme();
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
  if ($('#game').classList.contains('hidden') || e.target === gi || sheet.open) return;
  if (e.target.matches?.('input,select,textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); R()?.done ? nextRound() : playSnippet(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setVol(opt.vol + 5); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); setVol(opt.vol - 5); }
  else if (e.key === 'm' || e.key === 'M') { opt.muted = !opt.muted; applyVol(); }
  else if (opt.answer === 'mc' && /^[1-4]$/.test(e.key) && !R()?.done) choose(+e.key - 1);
});

$('#customUrl').value = LS.get('customUrl', '');
applyTheme();
applyVol();
renderHome();
