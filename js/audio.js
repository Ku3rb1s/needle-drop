/* Snippet-Wiedergabe über die Web Audio API.
   <audio> startet je nach Browser 50–300 ms verzögert und ungenau – für 0,1-s-Ausschnitte unbrauchbar.
   Hier wird die Vorschau komplett dekodiert und auf die Probe genau abgespielt. */
const Snip = (() => {
  let ctx = null, master = null, cur = null, vol = 0.8;

  /* iPhone/iPad: Web Audio ist bei eingeschaltetem Lautlos-Schalter stumm. Abhilfe:
     neueres Safari → audioSession „playback“; älteres → einmal ein (lautloses) <audio> starten,
     dann behandelt iOS die Seite wie einen Musik-Player. */
  let iosDone = false, silent = null;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function unlockIOS() {
    if (iosDone) return;
    iosDone = true;
    try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; } } catch {}
    if (!isIOS) return;
    if (silent) { silent.play().catch(() => { iosDone = false; }); return; } // erneut versuchen (nur bei Nutzer-Klick erfolgreich)
    try {
      // 0,5 s Stille als WAV (8 kHz, 8 bit, mono), in Schleife
      const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
      const str = (o, s) => [...s].forEach((c, i) => b[o + i] = c.charCodeAt(0));
      str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      str(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
      silent = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
      silent.loop = true; silent.setAttribute('playsinline', ''); silent.play().catch(() => { iosDone = false; });
    } catch {}
  }

  function ac() {
    unlockIOS();
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

  /** Kurze Spiel-Töne, direkt erzeugt (keine Dateien). Laufen über die Gesamtlautstärke.
      ok = Treffer, top = Treffer bei der ersten Stufe, wrong = falscher Tipp, miss = nicht erkannt */
  function sfx(type) {
    const c = ac();
    const notes = {
      ok: [[784, 0, .12], [1175, .09, .22]],
      top: [[784, 0, .1], [988, .08, .1], [1175, .16, .1], [1568, .24, .35]],
      wrong: [[220, 0, .16, 'triangle', 160]],
      miss: [[392, 0, .16, 'triangle'], [294, .14, .3, 'triangle']],
    }[type];
    if (!notes) return;
    const t0 = c.currentTime + 0.01;
    for (const [f, at, len, wave = 'sine', to] of notes) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = wave;
      o.frequency.setValueAtTime(f, t0 + at);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + at + len);
      g.gain.setValueAtTime(0, t0 + at);
      g.gain.linearRampToValueAtTime(0.22, t0 + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + at + len);
      o.connect(g).connect(master);
      o.start(t0 + at); o.stop(t0 + at + len + 0.02);
    }
  }

  const elapsed = () => (cur && ctx) ? Math.max(0, ctx.currentTime - cur.t0) : -1;

  return { ac, load, findStart, play, stop, elapsed, setVolume, sfx };
})();
