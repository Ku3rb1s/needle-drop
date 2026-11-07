# Musik-Blitz

Song-Quiz (Repo `musik-quiz`)

Erkenne Songs aus 0,1 s – 0,5 s – 1 s – 2 s – 5 s – 10 s langen Ausschnitten. Schwester-Projekt von
[Musik-Bingo](https://github.com/Ku3rb1s/musik-bingo-lobby) (gleicher Look, eigene App).

**Online:** https://ku3rb1s.github.io/musik-quiz/

Lokal starten: `node server.js` → http://127.0.0.1:8890/

## Wie es funktioniert

- **Audio:** 30-s-Vorschauen von Deezer. Die API wird per **JSONP** abgefragt (sie hat keine CORS-Header),
  die MP3s selbst erlauben CORS und werden mit der **Web Audio API** dekodiert – nur so sind 0,1 s exakt abspielbar.
  Kein Login, kein Server, kein Proxy nötig.
- **Startpunkt:** „Am Anfang“ (Beginn der Vorschau, Stille wird übersprungen), „Hook“ (lauteste ~3-s-Passage, Start beim Einsatz davor), „Zufällig“.
  Deezer-Vorschauen sind 30 s aus dem Song – nicht immer der echte Song-Anfang.
- **Snippet-Leiter:** Entspannt 0,5–15 s, Klassisch 0,1–10 s, Profi 0,1–3 s. **Antworten:** Suchen oder 4 Vorschläge.
- **Punkte:** 600 / 500 / 400 / 300 / 200 / 100 je Stufe. Falscher Tipp oder „Mehr hören“ → nächste Stufe.
  Nur der Interpret stimmt (Song nicht erraten): halbe Punkte der Stufe, auf der er stimmte.
- **Tipps** (abschaltbar, erst ab 0,5 s, eingeklappt): Leicht −50 (Jahrzehnt, Genre), Mittel −100 (Titel-Lücken),
  Stark −150 (Anfangsbuchstaben, Interpret-Initiale, verpixeltes Cover).
- **Schwierigkeit:** sortiert nach Deezer-`rank` (bzw. Streams); Leicht = bekannteste 35 %, Normal = 70 %, Schwer = alle.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Markup (Start, Spiel, Auflösung, Ende) und Icons |
| `logo.svg` | Logo (Vorlage für die PNG-Icons): Platte wie bei Musik-Bingo, Label = Snippet-Leiter |
| `css/base.css` | Basis-Look 1:1 aus Musik-Bingo (Farbthemen, Glas, Platte, Menüs) – Änderungen am besten in beiden Projekten |
| `css/app.css` | Quiz-eigene Teile (Leiter, Suche, Tipps, Ergebnis) |
| `js/deezer.js` | JSONP, Playlists laden, Suche, Link-Erkennung |
| `js/audio.js` | Web-Audio-Snippets, Startpunkt-Erkennung |
| `js/quiz.js` | Kategorien, Spielablauf, Wertung, Hinweise, Anzeige |
| `data/billions.json` | Billionärs Club: Songs mit ≥ 1 Mrd. Spotify-Streams |
| `scripts/build-billions.js` | erzeugt `data/billions.json` neu (Quelle kworb.net → Deezer-Zuordnung) |

## Kategorien

Alle außer Billionärs Club kommen aus offiziellen Deezer-Redaktions-Playlists (IDs in `CATS` in `js/quiz.js`).
Der **Billionärs Club** basiert auf der Streamliste von kworb.net; neu bauen mit `node scripts/build-billions.js`
(dauert einige Minuten wegen des Deezer-Limits von 50 Anfragen / 5 s).

## Bekannte Grenzen / nächste Schritte

- **Spotify:** Neue Spotify-Apps sind seit Feb. 2026 auf 5 Nutzer begrenzt, Redaktions-Playlists und Vorschauen sind gesperrt.
  Geplant: Spotify-Playlist-Import über das bestehende Bingo-Login, Zuordnung zu Deezer über ISRC.
- Deezer-Kurzlinks (link.deezer.com) lassen sich per JSONP nicht auflösen.
- Erscheinungsjahr kommt vom Album – bei Best-of-Alben falsch (beim Jahrzehnt-Hinweis abgefangen).
- Noch offen: Multiplayer (Lobby aus Musik-Bingo), Daily, Blitz, Survival, Jahr schätzen, i18n.
