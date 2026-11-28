/* Tägliche Challenge: jeden Tag dieselben 5 Songs für alle.
   - Auswahl hängt nur vom Datum ab (Zufallsgenerator mit dem Datum als Startwert) → überall gleich, ohne Server.
   - Quelle: Billionärs Club (feste Liste in data/billions.json, ändert sich nicht wie Deezer-Playlists).
   - Feste Regeln (DAILY_RULES in quiz.js), einmal pro Tag, Ergebnis + Serie werden lokal gespeichert. */
const Daily = (() => {
  const N = 5;
  const { START, dayNo } = DailyPick;            // Challenge #1 = START; Auswahl-Logik in js/daily-pick.js
  const CAT = { id: 'daily', group: 'special', name: 'Tägliche Challenge', icon: 'calendar', color: '#f59e0b' };
  trProps(CAT, ['name']);
  const TZ = 'Europe/Berlin';                     // Tageswechsel um Mitternacht deutscher Zeit – für alle gleich

  const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ }); // „2026-11-07“
  const prevDay = d => new Date(Date.parse(d) - 864e5).toISOString().slice(0, 10);

  /** Fertig berechnete Tagesdatei (scripts/build-daily.js) – überall exakt dieselben Songs, auch in der iPhone-App.
      Fehlt sie oder ist man offline: null → Auswahl wie bisher selbst berechnen. */
  async function loadDayFile(d) {
    try {
      const r = await fetch(`data/daily/${d}.json`);
      if (!r.ok) return null;
      const f = await r.json();
      if (f?.v !== 1 || f.day !== d || !f.items?.length) return null;
      return f.items.map(t => ({ id: t.id, title: t.title, artist: { name: t.artist }, rank: t.rank, explicit_lyrics: !!t.x, stub: true }));
    } catch { return null; }
  }

  const log = () => LS.get('daily', {});           // { "2026-11-07": { score, found, items, aborted, late } }
  const result = d => log()[d];

  /** Serie: aufeinanderfolgende Tage, jeweils am Tag selbst gespielt, bis heute (oder bis gestern, wenn heute noch offen).
      Im Archiv nachgespielte Tage (late) zählen nicht – sonst ließe sich jede Serie nachträglich reparieren. */
  function streak() {
    const L = log(), onTime = d => L[d] && !L[d].late;
    let d = today();
    if (!onTime(d)) d = prevDay(d);
    let n = 0;
    while (onTime(d)) { n++; d = prevDay(d); }
    return n;
  }

  /** Archiv: die letzten 30 Tage vor heute (ab START), neueste zuerst */
  const ARCHIVE_DAYS = 30;
  function pastDays() {
    const out = [];
    for (let d = prevDay(today()); d >= START && out.length < ARCHIVE_DAYS; d = prevDay(d)) out.push(d);
    return out;
  }

  /** Speicher klein halten: Einträge, die älter als das Archiv sind, behalten nur Punkte und Emoji-Raster
      (reicht für Statistik und Serie) – Titel, Interpreten und Cover-Links fliegen raus. */
  function tidy() {
    const L = log(), limit = pastDays().at(-1) || today();
    let changed = false;
    for (const [d, r] of Object.entries(L)) {
      if (d >= limit || !r?.items?.some(x => x.t || x.a || x.c)) continue;
      r.items = r.items.map(x => ({ p: x.p, e: x.e }));
      changed = true;
    }
    if (changed) LS.set('daily', L);
  }
  const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString(LOC(), { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });

  function msToMidnight() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map(x => [x.type, +x.value]));
    return (86400 - (p.hour * 3600 + p.minute * 60 + p.second)) * 1000;
  }
  const fmtLeft = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); };

  /* ---------- Starten ---------- */
  async function start(d = today()) {
    if (d > today() || d < START || (d !== today() && !pastDays().includes(d))) return;
    const late = d !== today();
    if (result(d)) return showResult(d);
    if (busy) return;
    busy = true;
    loading(true, late ? tx('Lade Challenge #{n}…', { n: dayNo(d) }) : tx('Lade die heutige Challenge…'));
    Snip.ac();
    try {
      const file = await loadDayFile(d);
      const pool = await loadPool(CATS.find(c => c.id === 'billion')).catch(e => { if (file) return file; throw e; });
      const cand = file || DailyPick.cand(pool, d, norm);
      STEPS = LADDERS.classic;
      G = { cat: CAT, cand, pool, next: 0, rounds: [], i: -1, score: 0, n: N, daily: { date: d, no: dayNo(d), late } };
      setCat(CAT.color);
      show('game');
      busy = false;
      await nextRound();
      if (G && !G.rounds.length) throw new Error(tx('Die Challenge konnte nicht geladen werden. Prüf die Verbindung und versuch es nochmal.'));
      saveRun();   // ab dem ersten Song zählt sie als gespielt
    } catch (e) {
      toast(e.message || tx('Challenge konnte nicht geladen werden'));
      G = null; show('home');
    } finally { busy = false; loading(false); }
  }

  /* ---------- Ende (oder Abbruch) ---------- */
  // Stand der laufenden Challenge als Ergebnis (fertige Songs mit Punkten, der Rest leer)
  function snapshot(aborted) {
    const { date, late } = G.daily;
    const rounds = G.rounds.filter(Boolean);
    const items = rounds.map(r => ({
      t: showTitle(r.track), a: r.track.artist?.name || '', c: r.track.album?.cover_small || '',
      p: r.done ? r.pts : 0, e: r.done ? emojiRow(r) : '⬛⬛⬛⬛⬛⬛',
    }));
    while (items.length < N) items.push({ t: '–', a: 'nicht gespielt', c: '', p: 0, e: '⬛⬛⬛⬛⬛⬛' });
    const score = items.reduce((s, x) => s + x.p, 0);
    const complete = rounds.length >= N && rounds.every(r => r.done);
    return { date, res: { score, found: rounds.filter(r => r.won).length, items, aborted: (aborted && !complete) || undefined, late: late || undefined } };
  }
  /* Laufende Challenge mitschreiben (nach dem Laden und nach jedem Song). Wird die Seite mittendrin neu geladen oder
     geschlossen, zählt sie beim nächsten Öffnen wie „Abbrechen“ – mit den bisherigen Punkten. Vorher ließ sie sich durch
     Neuladen beliebig oft neu versuchen (mit denselben, schon bekannten Songs). Eigener Schlüssel (mq.dailyRun): wird
     nicht abgeglichen und nicht an die Bestenliste gemeldet – das geschieht erst mit dem fertigen Ergebnis. */
  function saveRun() { if (G?.daily) LS.set('dailyRun', snapshot(true)); }
  function recover() {
    const run = LS.get('dailyRun', null);
    if (!run?.date || !run.res) return;
    const L = log();
    if (!L[run.date]) { L[run.date] = run.res; LS.set('daily', L); LS.set('dailyBest', Math.max(LS.get('dailyBest', 0), streak())); }
    LS.set('dailyRun', null);
  }
  function finish(aborted = false) {
    Snip.stop();
    const { date, res } = snapshot(aborted);
    const L = log();
    L[date] = res;
    LS.set('daily', L);
    LS.set('dailyRun', null);
    LS.set('dailyBest', Math.max(LS.get('dailyBest', 0), streak()));
    const freshAch = checkAch(G);
    G = null;
    showResult(date);
    showAch(freshAch);
  }

  /* ---------- Ergebnis-Ansicht (auch später am selben Tag wieder aufrufbar) ---------- */
  let timer = 0;
  function showResult(d) {
    const res = result(d);
    if (!res) return;
    $('#endAch').innerHTML = '';
    // Bestenliste der Tages-Challenge (nachgespielte Tage zählen dort nicht)
    $('#endLb').classList.toggle('hidden', !!res.late); $('#endLb').href = LB_PAGE + 'daily';
    $('#endLbT').textContent = tx('Zur Bestenliste'); $('#endLbNote').classList.add('hidden');
    setCat(CAT.color);
    $('#endCat').textContent = `${tx('Tägliche Challenge')} #${dayNo(d)}`;
    $('#endFound').textContent = tx('{a} von {b} erkannt', { a: res.found, b: N });
    $('#endScore').textContent = fmtN(res.score);
    const st = streak();
    $('#endSub').textContent = tx('von {n} möglichen', { n: fmtN(N * PTS[0]) }) + (st ? ' · 🔥 ' + tx('Serie {n}', { n: st }) : '') + (res.aborted ? ' · ' + tx('abgebrochen') : '') + (res.late ? ' · ' + tx('nachgespielt') : '');
    $('#endList').innerHTML = res.items.map(x => `
      <div class="cell"><img class="pl-cover" src="${x.c}" alt="">
        <span class="grow">${esc(x.t)}<span class="sub">${esc(x.t === '–' ? tx(x.a) : x.a)}</span><span class="emo">${x.e}</span></span>
        <span class="trail ${x.p ? '' : 'zero'}">${x.p ? '+' + fmtN(x.p) : '0'}</span></div>`).join('');
    $('#dailyNext').classList.remove('hidden');
    renderStats(d);
    $('#againBtn').classList.add('hidden');
    $('#shareBtn').classList.replace('ghost', 'big');
    $('#shareBtn').dataset.daily = d;
    lastResult = { title: `${tx('Tägliche Challenge')} #${dayNo(d)}`, sub: res.late ? tx('aus dem Archiv') : '', score: res.score, found: res.found, n: N, max: N * PTS[0], items: res.items, text: shareText(d) };
    clearInterval(timer);
    const tick = () => {
      if ($('#end').classList.contains('hidden')) return clearInterval(timer);
      const arch = ` · <a href="#" id="toArchive">${tx('Archiv')}</a>`;
      if (d !== today()) return $('#dailyNext').innerHTML = esc(fmtDate(d)) + arch;
      $('#dailyNext').innerHTML = tx('Nächste Challenge in {t}', { t: `<b>${fmtLeft(msToMidnight())}</b>` }) + arch;
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
        <div><b>${days.length}</b><span>${tx('Gespielt')}</span></div>
        <div><b>${fmtN(avg)}</b><span>${tx('Ø Punkte')}</span></div>
        <div><b>${streak()}</b><span>${tx('Serie')}</span></div>
        <div><b>${Math.max(LS.get('dailyBest', 0), streak())}</b><span>${tx('Beste Serie')}</span></div>
      </div>
      <div class="dstats-h">${tx('Erkannt bei')}</div>
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
    return `🎵 Needle Drop #${dayNo(d)}${res.late ? ' (' + tx('Archiv') + ')' : ''} · ${tx('{n} Punkte', { n: fmtN(res.score) })}\n${res.items.map(x => x.e).join('\n')}` +
      (st > 1 ? '\n🔥 ' + tx('Serie: {n} Tage', { n: st }) : '') + (Profile.tag() ? '\n' + Profile.tag() : '') + `\nhttps://jukeboxquiz.de/needle-drop/`;
  }

  /* ---------- Knopf in der Kopfzeile ---------- */
  function renderCard() {
    const d = today(), res = result(d), st = streak(), b = $('#dailyHdr');
    b.innerHTML = `<span class="dh-ic"><svg class="ic"><use href="#i-calendar"/></svg></span>
      <span class="dh-t"><span class="dh-name">${tx('Tägliche Challenge')}</span> #${dayNo(d)}</span>` + (res
      ? `<span class="dh-st done"><svg class="ic"><use href="#i-check"/></svg><span class="dh-x">${fmtN(res.score)}</span></span>`
      : `<span class="dh-st">${st ? `<span class="dh-x">🔥${st}</span>` : ''}<span class="dh-go">${tx('Spielen')}</span><i class="dh-dot"></i></span>`);
    b.classList.toggle('done', !!res);
    b.title = res
      ? tx('Heute: {n} Punkte · {a}/{b} erkannt', { n: fmtN(res.score), a: res.found, b: N })
      : tx('5 Songs · für alle gleich') + ' · ' + (st ? '🔥 ' + tx('Serie {n}', { n: st }) : tx('jeden Tag neu'));
    b.setAttribute('aria-label', tx('Tägliche Challenge') + ' #' + dayNo(d) + ' – ' + b.title);
    const open = pastDays().filter(x => !result(x)).length;
    $('#subArchive').textContent = open ? tx('{n} nachspielbar', { n: open }) : tx('Die letzten 30 Tage');
  }

  /* ---------- Archiv: alle bisherigen Tage, verpasste nachspielen ---------- */
  function renderArchive() {
    const days = pastDays();
    $('#archiveList').innerHTML = days.length ? days.map(d => {
      const res = result(d);
      const right = res
        ? `<span class="trail">${fmtN(res.score)}${res.late ? ' <small>' + tx('nachgespielt') + '</small>' : ''}</span>`
        : `<span class="trail play">${tx('Spielen')}<svg class="ic chev"><use href="#i-chev"/></svg></span>`;
      return `<button class="cell tap" data-day="${d}"><span class="arch-no">#${dayNo(d)}</span>
        <span class="grow">${esc(fmtDate(d))}<span class="sub">${res ? tx('{a} von {b} erkannt', { a: res.found, b: N }) : tx('noch nicht gespielt')}</span></span>${right}</button>`;
    }).join('') : `<div class="cell"><span class="grow">${tx('Noch keine früheren Challenges.')}</span></div>`;
  }
  $('#archiveList').addEventListener('click', e => {
    const b = e.target.closest('[data-day]');
    if (!b || busy || G) return;
    $('#sheetSettings').close();
    const d = b.dataset.day;
    result(d) ? showResult(d) : start(d);
  });
  const openArchive = e => { e?.preventDefault(); openSettings('archive'); };
  $('#dailyNext').addEventListener('click', e => { if (e.target.id === 'toArchive') openArchive(e); });

  $('#dailyHdr').onclick = () => { if (busy || G) return; const d = today(); result(d) ? showResult(d) : start(); };
  recover();
  tidy();
  renderCard();
  return { start, finish, saveRun, showResult, resetEnd, shareText, renderCard, renderArchive, today, streak };
})();

// Aus der Jukebox („Heute noch offen“): ?daily=1 zeigt sofort einen Knopf „Challenge starten“ (schon gespielt → Ergebnis).
// Nicht automatisch starten: Die Challenge zählt ab dem Start, und iPhone/iPad spielen Ton erst nach einem Tipp.
if (new URLSearchParams(location.search).has('daily')) {
  history.replaceState(history.state, '', location.pathname + location.hash);   // beim Neuladen nicht noch einmal
  if ((LS.get('daily', {}) || {})[Daily.today()]) setTimeout(() => $('#dailyHdr').click(), 0);
  else {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)';
    const btn = 'font:inherit;font-weight:800;color:#fff;border:0;cursor:pointer;border-radius:18px';
    o.innerHTML = `<div style="display:grid;gap:10px;justify-items:center;text-align:center">
      <div style="font-size:1rem;font-weight:800;color:#fff;opacity:.8">📅 ${esc(tx('Tägliche Challenge'))}</div>
      <button type="button" data-go style="${btn};font-size:1.2rem;padding:18px 34px;background:var(--accent,#1ed760);color:#000">▶ ${esc(tx('Challenge starten'))}</button>
      <button type="button" style="${btn};font-size:.95rem;padding:10px 20px;background:none;opacity:.75">${esc(tx('Abbrechen'))}</button></div>`;
    o.onclick = e => { const b = e.target.closest('button'); if (!b && e.target !== o) return; o.remove(); if (b?.hasAttribute('data-go')) $('#dailyHdr').click(); };
    document.body.appendChild(o);
    o.querySelector('[data-go]').focus();
  }
}
