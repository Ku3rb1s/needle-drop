/* Snippet-Wiedergabe über die Web Audio API.
   <audio> startet je nach Browser 50–300 ms verzögert und ungenau – für 0,1-s-Ausschnitte unbrauchbar.
   Hier wird die Vorschau komplett dekodiert und auf die Probe genau abgespielt. */
const Snip = (() => {
  let ctx = null, master = null, cur = null, vol = 0.8;

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = vol * vol;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Lautstärke 0…1 (gilt sofort, auch während der Wiedergabe) */
  function setVolume(v) {
    vol = Math.max(0, Math.min(1, v));
    if (master) master.gain.setTargetAtTime(vol * vol, ctx.currentTime, 0.02); // quadratisch: fühlt sich natürlicher an
  }

  async function load(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.arrayBuffer();
    const c = ac();
    return await new Promise((res, rej) => c.decodeAudioData(data, res, rej)); // Callback-Form für ältere Safari
  }

  /** Startpunkt in Sekunden. `need` = Länge der längsten Stufe, die noch hineinpassen muss.
      start:  erste hörbare Stelle (Stille/Einblendung wird übersprungen)
      hook:   lauteste ~3-s-Passage (meist Refrain/Drop), dort zum Einsatz davor springen
      random: irgendeine laute Stelle */
  function findStart(buf, mode, need = 10) {
    need += 0.3;
    const d = buf.getChannelData(0), win = Math.floor(buf.sampleRate * 0.1);
    const rms = [];
    for (let i = 0; i + win <= d.length; i += win) {
      let s = 0;
      for (let j = i; j < i + win; j += 4) s += d[j] * d[j];
      rms.push(Math.sqrt(s / (win / 4)));
    }
    const last = Math.max(0, Math.floor((buf.duration - need) * 10)); // letztes erlaubtes Fenster
    const ref = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.8)] || 0;

    if (mode === 'hook') {
      const W = 30;
      let best = -1, bi = 0;
      for (let i = 0; i <= Math.min(last, rms.length - W); i++) {
        let s = 0;
        for (let j = i; j < i + W; j++) s += rms[j];
        if (s > best) { best = s; bi = i; }
      }
      // Einsatz: stärkster Lautstärke-Anstieg kurz vor bzw. am Anfang der lauten Passage
      let on = bi, rise = 0;
      for (let i = Math.max(1, bi - 15); i <= Math.min(bi + 5, last); i++) {
        const dlt = rms[i] - rms[i - 1];
        if (dlt > rise) { rise = dlt; on = i; }
      }
      return Math.min(on, last) * 0.1;
    }

    const thr = mode === 'random' ? 0.55 : 0.3;
    const ok = [];
    for (let i = 0; i <= last && i < rms.length; i++) if (rms[i] >= ref * thr) ok.push(i * 0.1);
    if (!ok.length) return 0;
    return mode === 'random' ? ok[Math.floor(Math.random() * ok.length)] : ok[0];
  }

  function stop() {
    if (!cur) return;
    try { cur.src.onended = null; cur.src.stop(); } catch {}
    cur = null;
  }

  /** Spielt `dur` Sekunden ab `offset`. Mini-Ein-/Ausblendung gegen Knacken. */
  function play(buf, offset, dur, onEnd) {
    const c = ac();
    stop();
    dur = Math.min(dur, buf.duration - offset);
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf;
    src.connect(g).connect(master);
    const t0 = c.currentTime + 0.03, fade = Math.min(0.006, dur / 4);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(1, t0 + fade);
    g.gain.setValueAtTime(1, t0 + dur - fade);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    src.start(t0, offset, dur + 0.01);
    const me = { src, t0, dur };
    src.onended = () => { if (cur === me) cur = null; onEnd && onEnd(); };
    cur = me;
    return me;
  }

  const elapsed = () => cur ? Math.max(0, ac().currentTime - cur.t0) : -1;

  return { ac, load, findStart, play, stop, elapsed, setVolume };
})();
