// Needle Drop – Besonderheiten für scripts/check-lang.js (das Skript selbst ist gemeinsam für alle Spiele)
module.exports = {
  ignore: ['Needle Drop', 'M'],                                  // Eigennamen/Tasten
  fields: ['name', 'sub', 'label', 'info', 'start', 'hook', 'random'], // Kategorien, Modi, Startpunkte (trProps)
  tables: ['FX_NAMES'],                                          // Effekte im Modus „Verrückt“
  patterns: [/\['(?:decades|intl|de|special)', '([^']+)'\]/g],   // Kategorie-Gruppen
  sources: [{ file: 'worker/spotify.js', pattern: /error: '((?:\\.|[^'\\])*)'/g }], // Fehlertexte des Spotify-Workers
  add: ['Tipps an', 'Tipps aus', 'Autoplay an', 'ohne Explicit', 'Töne aus', 'nicht gespielt'],
  skip: /^(on|off|mc|search|start|hook|random|easy|classic|pro|normal|hard|reverse|underwater|chipmunk|slow)$/, // Code-Werte
  keep: ['OLED', 'Hook', 'Normal', 'Songs', 'Genre', 'Design', 'Pop', 'Rock', 'EDM', 'Latin', 'R&B', 'Disney', 'Eurovision'],
};
