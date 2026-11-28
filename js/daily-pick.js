/* Auswahl der Tages-Challenge – ohne Browser-Teile, damit dieselbe Datei auch in Node läuft
   (scripts/build-daily.js schreibt damit die fertigen Tagesdateien data/daily/JJJJ-MM-TT.json).
   Hier ändern heißt: Die Challenge ändert sich für alle Tage, die noch keine Datei haben. */
const DailyPick = (() => {
  const START = '2026-10-01';                     // Challenge #1
  const CAND = 40;                                // Kandidaten je Tag (Songs ohne Hörprobe werden im Spiel übersprungen)
  const dayNo = d => Math.round((Date.parse(d) - Date.parse(START)) / 864e5) + 1;

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

  /** Kandidaten eines Tages aus dem Billionärs-Club-Pool (wie loadPool ihn liefert). norm = Namensvergleich aus quiz.js */
  function cand(pool, d, norm) {
    // Nur die bekannteren 70 % (nach Streams), fest sortiert – damit die Auswahl überall gleich ist
    const known = [...pool].sort((a, b) => (b.rank - a.rank) || (a.id - b.id)).slice(0, Math.ceil(pool.length * 0.7));
    const rnd = rng('needle-drop|' + d);
    for (let i = known.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [known[i], known[j]] = [known[j], known[i]]; }
    const artists = new Set();
    return known.filter(t => { const a = norm(t.artist?.name); if (artists.has(a)) return false; artists.add(a); return true; }).slice(0, CAND);
  }

  return { START, dayNo, rng, cand };
})();
if (typeof module !== 'undefined') module.exports = DailyPick;
