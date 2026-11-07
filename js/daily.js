/* Tägliche Challenge: jeden Tag dieselben 5 Songs für alle.
   - Auswahl hängt nur vom Datum ab (Zufallsgenerator mit dem Datum als Startwert) → überall gleich, ohne Server.
   - Quelle: Billionärs Club (feste Liste in data/billions.json, ändert sich nicht wie Deezer-Playlists).
   - Feste Regeln (DAILY_RULES in quiz.js), einmal pro Tag, Ergebnis + Serie werden lokal gespeichert. */
const Daily = (() => {
  const N = 5;
  const START = '2026-11-07';                     // Challenge #1
  const CAT = { id: 'daily', group: 'special', name: 'Tägliche Challenge', icon: 'calendar', color: '#f59e0b' };
  trProps(CAT, ['name']);
  const TZ = 'Europe/Berlin';                     // Tageswechsel um Mitternacht deutscher Zeit – für alle gleich

  const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ }); // „2026-11-07“
  const dayNo = d => Math.round((Date.parse(d) - Date.parse(START)) / 864e5) + 1;
  const prevDay = d => new Date(Date.parse(d) - 864e5).toISOString().slice(0, 10);

  // Kleiner Zufallsgenerator mit Startwert (mulberry32) – gleiches Datum → gleiche Folge
  function rng(str) {
    let h = 2166136261;
    for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => {
      h = (h + 0x6D2B79F5) | 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const log = () => LS.get('daily', {});           // { "2026-11-07": { score, found, items, aborted } }
  const result = d => log()[d];

  /** Serie: aufeinanderfolgende gespielte Tage bis heute (oder bis gestern, wenn heute noch offen) */
  function streak() {
    const L = log();
    let d = today();
    if (!L[d]) d = prevDay(d);
    let n = 0;
    while (L[d]) { n++; d = prevDay(d); }
    return n;
  }

  function msToMidnight() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, +x.value]));
    return (86400 - (p.hour * 3600 + p.minute * 60 + p.second)) * 1000;
  }
  const fmtLeft = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); };

  /* ---------- Starten ---------- */
  async function start() {
    const d = today();
    if (result(d)) return showResult(d);
    if (busy) return;
    busy = true;
    loading(true, tx('Lade die heutige Challenge…'));
    Snip.ac();
    try {
      const pool = await loadPool(CATS.find(c => c.id === 'billion'));
      // Nur die bekannteren 70 % (nach Streams), fest sortiert – damit die Auswahl überall gleich ist
      const known = [...pool].sort((a, b) => (b.rank - a.rank) || (a.id - b.id)).slice(0, Math.ceil(pool.length * 0.7));
      const rnd = rng('needle-drop|' + d);
      for (let i = known.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [known[i], known[j]] = [known[j], known[i]]; }
      const artists = new Set();
      const cand = known.filter(t => { const a = norm(t.artist?.name); if (artists.has(a)) return false; artists.add(a); return true; }).slice(0, 40);
      STEPS = LADDERS.classic;
      G = { cat: CAT, cand, pool, next: 0, rounds: [], i: -1, score: 0, n: N, daily: { date: d, no: dayNo(d) } };
      setCat(CAT.color);
      show('game');
      busy = false;
      await nextRound();
      if (G && !G.rounds.length) throw new Error(tx('Die Challenge konnte nicht geladen werden. Prüf die Verbindung und versuch es nochmal.'));
    } catch (e) {
      toast(e.message || tx('Challenge konnte nicht geladen werden'));
      G = null; show('home');
    } finally { busy = false; loading(false); }
  }

  /* ---------- Ende (oder Abbruch) ---------- */
  function finish(aborted = false) {
    Snip.stop();
    const { date } = G.daily;
    const rounds = G.rounds.filter(Boolean);
    const items = rounds.map(r => ({
      t: showTitle(r.track), a: r.track.artist?.name || '', c: r.track.album?.cover_small || '',
      p: r.done ? r.pts : 0, e: r.done ? emojiRow(r) : '⬛⬛⬛⬛⬛⬛',
    }));
    while (items.length < N) items.push({ t: '–', a: 'nicht gespielt', c: '', p: 0, e: '⬛⬛⬛⬛⬛⬛' });
    const score = items.reduce((s, x) => s + x.p, 0);
    const L = log();
    const complete = rounds.length >= N && rounds.every(r => r.done);
    L[date] = { score, found: rounds.filter(r => r.won).length, items, aborted: (aborted && !complete) || undefined };
    LS.set('daily', L);
    LS.set('dailyBest', Math.max(LS.get('dailyBest', 0), streak()));
    G = null;
    showResult(date);
  }

  /* ---------- Ergebnis-Ansicht (auch später am selben Tag wieder aufrufbar) ---------- */
  let timer = 0;
  function showResult(d) {
    const res = result(d);
    if (!res) return;
    setCat(CAT.color);
    $('#endCat').textContent = `${tx('Tägliche Challenge')} #${dayNo(d)}`;
    $('#endFound').textContent = tx('{a} von {b} erkannt', { a: res.found, b: N });
    $('#endScore').textContent = fmtN(res.score);
    const st = streak();
    $('#endSub').textContent = tx('von {n} möglichen', { n: fmtN(N * PTS[0]) }) + (st ? ' · 🔥 ' + tx('Serie {n}', { n: st }) : '') + (res.aborted ? ' · ' + tx('abgebrochen') : '');
    $('#endList').innerHTML = res.items.map(x => `
      <div class="cell"><img class="pl-cover" src="${x.c}" alt="">
        <span class="grow">${esc(x.t)}<span class="sub">${esc(x.t === '–' ? tx(x.a) : x.a)}</span><span class="emo">${x.e}</span></span>
        <span class="trail ${x.p ? '' : 'zero'}">${x.p ? '+' + fmtN(x.p) : '0'}</span></div>`).join('');
    $('#dailyNext').classList.remove('hidden');
    renderStats(d);
    $('#againBtn').classList.add('hidden');
    $('#shareBtn').classList.replace('ghost', 'big');
    $('#shareBtn').dataset.daily = d;
    lastResult = { title: `${tx('Tägliche Challenge')} #${dayNo(d)}`, sub: '', score: res.score, found: res.found, n: N, max: N * PTS[0], items: res.items, text: shareText(d) };
    clearInterval(timer);
    const tick = () => {
      if ($('#end').classList.contains('hidden')) return clearInterval(timer);
      $('#dailyNext').innerHTML = tx('Nächste Challenge in {t}', { t: `<b>${fmtLeft(msToMidnight())}</b>` });
    };
    show('end');
    tick(); timer = setInterval(tick, 1000);
  }

  /** Statistik über alle gespielten Tage – alles nur aus dem lokalen Speicher */
  function renderStats(d) {
    const L = log(), days = Object.keys(L);
    const scores = days.map(k => L[k].score);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    // Bei welcher Stufe wurden Songs erkannt? (aus dem Emoji-Raster: Position von 🟩, sonst „nicht erkannt“)
    const labels = [...LADDERS.classic.map(fmtS), '✗'];
    const all = Array(7).fill(0), now = Array(7).fill(0);
    for (const k of days) for (const x of L[k].items) {
      const i = Array.from(x.e).indexOf('🟩');
      const slot = i < 0 ? 6 : i;
      all[slot]++;
      if (k === d) now[slot]++;
    }
    const max = Math.max(1, ...all);
    $('#dailyStats').innerHTML = `
      <div class="dstats-tiles">
        <div><b>${days.length}</b><span>Gespielt</span></div>
        <div><b>${fmtN(avg)}</b><span>Ø Punkte</span></div>
        <div><b>${streak()}</b><span>Serie</span></div>
        <div><b>${Math.max(LS.get('dailyBest', 0), streak())}</b><span>Beste Serie</span></div>
      </div>
      <div class="dstats-h">Erkannt bei</div>
      <div class="dist">${all.map((n, i) => `
        <div class="dist-row${now[i] ? ' today' : ''}${i === 6 ? ' miss' : ''}"><span class="lbl">${labels[i]}</span>
          <span class="dist-bar" style="width:${Math.max(8, n / max * 100)}%">${n}</span></div>`).join('')}
      </div>`;
    $('#dailyStats').classList.remove('hidden');
  }

  /** Normale Ergebnis-Ansicht wiederherstellen (wenn danach ein normales Spiel endet) */
  function resetEnd() {
    $('#dailyNext').classList.add('hidden');
    $('#dailyStats').classList.add('hidden');
    $('#againBtn').classList.remove('hidden');
    $('#shareBtn').classList.replace('big', 'ghost');
    delete $('#shareBtn').dataset.daily;
  }

  function shareText(d) {
    const res = result(d);
    const st = streak();
    return `🎵 Needle Drop #${dayNo(d)} · ${tx('{n} Punkte', { n: fmtN(res.score) })}\n${res.items.map(x => x.e).join('\n')}` +
      (st > 1 ? '\n🔥 ' + tx('Serie: {n} Tage', { n: st }) : '') + `\nhttps://ku3rb1s.github.io/needle-drop/`;
  }

  /* ---------- Karte auf der Startseite ---------- */
  function renderCard() {
    const d = today(), res = result(d), st = streak();
    $('#dailyNo').textContent = '#' + dayNo(d);
    $('#dailySub').textContent = res
      ? tx('Heute: {n} Punkte · {a}/{b} erkannt', { n: fmtN(res.score), a: res.found, b: N })
      : tx('5 Songs · für alle gleich') + ' · ' + (st ? '🔥 ' + tx('Serie {n}', { n: st }) : tx('jeden Tag neu'));
    $('#dailyRight').innerHTML = res ? `<svg class="ic"><use href="#i-check"/></svg>${tx('Ergebnis')}` : `${tx('Spielen')}<svg class="ic chev"><use href="#i-chev"/></svg>`;
    $('#dailyCard').classList.toggle('done', !!res);
  }

  $('#dailyCard').onclick = () => { const d = today(); result(d) ? showResult(d) : start(); };
  renderCard();
  return { start, finish, showResult, resetEnd, shareText, renderCard, today };
})();
