# Needle Drop

Song-Quiz: Nadel drauf, Song erkennen.

Erkenne Songs aus 0,1 s – 0,5 s – 1 s – 2 s – 5 s – 10 s langen Ausschnitten. Schwester-Projekt von
[Musik-Bingo](https://github.com/Ku3rb1s/musik-bingo-lobby) (gleicher Look, eigene App).

**Online:** https://ku3rb1s.github.io/needle-drop/

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

## Tägliche Challenge

Jeden Tag 5 Songs aus dem Billionärs Club, für alle gleich: Die Auswahl hängt nur vom Datum (Europe/Berlin) ab – kein Server nötig.
Feste Regeln (klassische Leiter, Suchen, Start am Anfang, Tipps erlaubt), einmal pro Tag. Ergebnis, Serie, Statistik („erkannt bei …“) und Countdown werden nur lokal gespeichert (`js/daily.js`).

**Datensparsam:** Außer Deezer (Suche + Vorschauen) ruft die Seite keine fremden Server auf; alles andere bleibt im Browser.

## Spotify-Playlists

Unter „Eigene Playlist“ kann man einen Spotify-Link (Playlist oder Album, `open.spotify.com/…`) einfügen:

1. Die Songliste (Titel + Interpret, max. 100) holt ein kleiner **Cloudflare Worker** (`worker/spotify.js`) aus der öffentlichen
   Spotify-Einbettungsseite – ohne Spotify-Login und ohne das 5-Nutzer-Limit der Spotify-API. Der Browser darf die Seite wegen CORS
   nicht selbst abrufen, deshalb der Worker. Er speichert und protokolliert nichts (nur 1 h Cloudflare-Cache).
2. Jeder Song wird erst kurz bevor er drankommt bei Deezer gesucht (`js/spotify.js`) – das Spiel startet sofort.

**Worker einrichten (einmalig, kostenlos):**
```
cd worker
npx wrangler login      # mit dem eigenen Cloudflare-Konto anmelden
npx wrangler deploy     # gibt die Adresse aus, z. B. https://needle-drop-spotify.<name>.workers.dev
```
Live: `https://needle-drop-spotify.ku3rb1s.workers.dev` (in `js/spotify.js` bei `PROXY`). Lokal testen: `npx wrangler dev --port 8787` (die App nutzt lokal automatisch Port 8787).

## Sprachen

Deutsch, Englisch, Französisch, Spanisch, Norwegisch – gleiches System wie Musik-Bingo (`js/i18n.js`, `js/lang/*.js`).
Alle Texte stehen im Code auf Deutsch und laufen über `tx(Text)`; feste Texte in `index.html` werden automatisch übersetzt.
Neue Texte in allen Sprachdateien ergänzen – `node scripts/check-lang.js` zeigt, was fehlt.

## Billionärs Club automatisch

`.github/workflows/update-billions.yml` baut `data/billions.json` am 1. jedes Monats neu (oder per Hand: Actions → Run workflow).
Ist kworb.net oder Deezer gestört, bricht das Skript ab, statt eine halbe Liste zu speichern.

## Versionen

Änderungen stehen in [CHANGELOG.md](CHANGELOG.md) und in der App unter Einstellungen → Versionsnummer → „Neuerungen“.
Bei jedem Update `APP_VERSION`/`APP_DATE` in `js/quiz.js` erhöhen, einen Eintrag in `CHANGELOG.md` ergänzen und `?v=` in `index.html` hochzählen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Markup (Start, Spiel, Auflösung, Ende) und Icons |
| `logo.svg` | Logo (Vorlage für die PNG-Icons): Platte wie bei Musik-Bingo mit Tonarm |
| `css/base.css` | Basis-Look 1:1 aus Musik-Bingo (Farbthemen, Glas, Platte, Menüs) – Änderungen am besten in beiden Projekten |
| `css/fonts.css`, `fonts/` | Schrift Outfit lokal (SIL OFL, `fonts/OFL.txt`) – keine Verbindung zu Google Fonts |
| `css/app.css` | Quiz-eigene Teile (Leiter, Suche, Tipps, Ergebnis) |
| `js/deezer.js` | JSONP, Playlists laden, Suche, Link-Erkennung |
| `js/audio.js` | Web-Audio-Snippets, Startpunkt-Erkennung |
| `js/daily.js` | Tägliche Challenge (Auswahl per Datum, Serie, Teilen) |
| `js/spotify.js` | Spotify-Link erkennen, Songliste über den Worker holen, Songs bei Deezer zuordnen |
| `worker/` | Cloudflare Worker für die Spotify-Songliste |
| `js/quiz.js` | Kategorien, Spielablauf, Wertung, Hinweise, Anzeige |
| `data/billions.json` | Billionärs Club: Songs mit ≥ 1 Mrd. Spotify-Streams |
| `scripts/build-billions.js` | erzeugt `data/billions.json` neu (Quelle kworb.net → Deezer-Zuordnung) |

## Kategorien

| Gruppe | Kategorien |
|---|---|
| Jahrzehnte | 70er, 80er, 90er, 2000er, 2010er, 2020er |
| International | Pop, Hip-Hop & Rap, R&B, Rock, EDM, Latin |
| Deutsch | Deutschrap, Deutsch-Pop, Schlager & Party (inkl. Malle, Après-Ski), Neue Deutsche Welle |
| Spezial | Aktuelle Hits, Billionärs Club, TikTok-Hits, Film & Serien, Disney (deutsch), Eurovision, Eigene Playlist |

Alle außer Billionärs Club und Eigene Playlist kommen aus offiziellen Deezer-Redaktions-Playlists (IDs in `CATS` in `js/quiz.js`, Gruppen in `GROUPS`).
Der **Billionärs Club** basiert auf der Streamliste von kworb.net; neu bauen mit `node scripts/build-billions.js`
(dauert einige Minuten wegen des Deezer-Limits von 50 Anfragen / 5 s).

## Bekannte Grenzen / nächste Schritte

- **Spotify:** Neue Spotify-Apps sind seit Feb. 2026 auf 5 Nutzer begrenzt, Redaktions-Playlists und Vorschauen sind gesperrt.
  Geplant: Spotify-Playlist-Import über das bestehende Bingo-Login, Zuordnung zu Deezer über ISRC.
- Deezer-Kurzlinks (link.deezer.com) lassen sich per JSONP nicht auflösen.
- Erscheinungsjahr kommt vom Album – bei Best-of-Alben falsch (beim Jahrzehnt-Hinweis abgefangen).
- Noch offen: Multiplayer (Lobby aus Musik-Bingo), Daily, Blitz, Survival, Jahr schätzen, i18n.
