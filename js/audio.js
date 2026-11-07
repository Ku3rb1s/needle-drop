/* Snippet-Wiedergabe über die Web Audio API.
   <audio> startet je nach Browser 50–300 ms verzögert und ungenau – für 0,1-s-Ausschnitte unbrauchbar.
   Hier wird die Vorschau komplett dekodiert und auf die Probe genau abgespielt. */
const Snip = (() => {
  let ctx = null, cur = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  async function load(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.arrayBuffer();
    const c = ac();
    return await new Promise((res, rej) => c.decodeAudioData(data, res, rej)); // Callback-Form für ältere Safari
  }

  /** Startpunkt in Sekunden. Vorschauen beginnen oft mit Einblendung oder Stille –
      daher Lautheit in 100-ms-Fenstern messen und nur „laute“ Stellen nehmen. */
  function findStart(buf, mode) {
    const d = buf.getChannelData(0), win = Math.floor(buf.sampleRate * 0.1);
    const rms = [];
    for (let i = 0; i + win <= d.length; i += win) {
      let s = 0;
      for (let j = i; j < i + win; j += 4) s += d[j] * d[j];
      rms.push(Math.sqrt(s / (win / 4)));
    }
    const ref = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * 0.8)] || 0;
    const need = 10.3; // die längste Stufe (10 s) muss noch hineinpassen
    // „Anfang“: erste hörbare Stelle (nur Stille/Einblendung überspringen); „Zufall“: irgendeine laute Stelle
    const thr = mode === 'random' ? 0.55 : 0.3;
    const ok = [];
    for (let i = 0; i < rms.length; i++) {
      if (i * 0.1 + need > buf.duration) break;
      if (rms[i] >= ref * thr) ok.push(i * 0.1);
    }
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
    src.connect(g).connect(c.destination);
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

  /** Sekunden seit Start der aktuellen Wiedergabe (oder -1). */
  const elapsed = () => cur ? Math.max(0, ac().currentTime - cur.t0) : -1;

  return { ac, load, findStart, play, stop, elapsed };
})();
