# Änderungen

Die Versionsnummer steht in `js/quiz.js` (`APP_VERSION`) und unten in den Einstellungen. In `index.html` bei jedem Update auch `?v=` an CSS/JS-Dateien erhöhen.

## 1.11.1 – 07.11.2026
- Die Tägliche Challenge sitzt jetzt oben in der Kopfzeile statt als große Karte – die Startseite ist dadurch aufgeräumter
- Challenge-Archiv zeigt die letzten 30 Tage (auch in den Einstellungen und nach dem Ergebnis erreichbar). Ältere Einträge behalten nur Punkte und Ergebnis-Raster für die Statistik – das hält den Speicher klein

## 1.11.0 – 07.11.2026
- Neu: **Spielmodi** – über der Kategorie wählbar, Standard bleibt das gewohnte Spiel
  - **🌀 Verrückt**: Ausschnitte laufen rückwärts, unter Wasser, als Chipmunk oder in Zeitlupe (ein Effekt fest oder jede Runde zufällig). Die Auflösung läuft normal
  - **🎤 Nur Interpret**: Es reicht, den Interpreten zu erkennen – Suche und 4 Antworten zeigen dann Künstler
  - Rekorde werden je Modus getrennt gezählt
- Neu: **Challenge-Archiv** – alle bisherigen Tages-Challenges ansehen und verpasste nachspielen (zählen nicht zur Serie). Link unter der Challenge-Karte
- Neu: **Spielerprofil** mit Name und Avatar in den Einstellungen – gilt für alle Spiele (Jukebox, Musik-Bingo, Needle Drop), steht beim Teilen unter dem Ergebnis und im Bingo schon beim Beitreten drin
- Nach dem Ergebnis gibt es Links zum Song auf Spotify und Deezer
- Statistik der Tages-Challenge ist jetzt auch übersetzt

## 1.10.0 – 07.11.2026
- Kategorien überarbeitet – alle nachgemessen nach Bekanntheit der Songs:
  - **EDM**: Avicii, Guetta, Calvin Harris & Dance-Klassiker statt Underground-Tracks
  - **Latin**: nur Latin-Hits mit über 1 Mrd. Streams (Despacito, Danza Kuduro, Mi Gente …) + Reggaeton-Klassiker
  - **Hip-Hop & Rap**: 90er/2000er-Rap-Hits + 2010er/2020er statt seltener East-Coast-Tracks
  - **R&B**: Klassiker der 90er und 2000er statt aktueller Nischen-Songs
  - **Disney**: die Originale statt deutscher Cover-Versionen
  - **Schlager & Party**: Schlager-Klassiker statt vieler unbekannter Malle-Titel
- Mehr Abwechslung: Jeder Interpret kommt pro Spiel möglichst nur einmal vor

## 1.9.0 – 07.11.2026
- Neu: Nach der Auflösung den Song direkt **auf Spotify oder Deezer anhören**
- Platte lässt sich mit der Tastatur bedienen (Tab, dann Enter/Leertaste)
- Behoben: Fehlermeldung in der Konsole, wenn sich eine Vorschau nicht dekodieren ließ (der Song wurde schon vorher korrekt übersprungen)
- Behoben: Ungültige gespeicherte Einstellungen konnten die Startseite blockieren – sie werden jetzt auf Standard zurückgesetzt
- Behoben: „Ø Stufe“ in der Statistik im Zahlenformat der Sprache
- Billionärs-Liste wird kurz nach Mitternacht aktualisiert, damit die Tägliche Challenge den ganzen Tag für alle gleich bleibt

## 1.8.0 – 07.11.2026
- **Spotify-Import ist live:** Unter „Eigene Playlist“ einen Spotify-Link (Playlist oder Album, bis 100 Songs) einfügen – die Songs werden automatisch bei Deezer gefunden

## 1.7.1 – 07.11.2026
- Neu: „Alle Spiele“ in den Einstellungen führt zur Übersichtsseite **Jukebox** (ku3rb1s.github.io/jukebox – Musik-Bingo, Needle Drop und künftige Spiele)

## 1.7.0 – 07.11.2026
- Neu: **Sprachen** wie bei Musik-Bingo – Englisch, Französisch, Spanisch, Norwegisch (Einstellungen → Sprache, Voreinstellung: Sprache des Geräts). Zahlen und Sekunden im Format der Sprache
- Prüfskript `node scripts/check-lang.js` zeigt fehlende Übersetzungen

## 1.6.0 – 07.11.2026
- Neu: **Töne & Konfetti** – kurze Töne bei Treffer und Fehler, Konfetti bei Treffern in der ersten Stufe (abschaltbar unter Hilfen & Wiedergabe)
- Neu: **Deine Statistik** in den Einstellungen – Spiele, Trefferquote, Ø Stufe, Stärke, Werte je Kategorie, schnellste Treffer
- Neu: **Ergebnis als Bild teilen** (Story-Format mit Covern, Punkten und Emoji-Raster); am Handy direkt teilen, am PC als Bild speichern
- Billionärs Club aktualisiert sich jetzt monatlich automatisch (GitHub-Action)

## 1.5.1 – 07.11.2026
- Billionärs Club wieder in Gold
- Film & Serien: Kinosaal-Rot und Filmklappe als Icon; TikTok-Hits jetzt in TikTok-Cyan
- Neue Deutsche Welle: Welle statt Blitz als Icon

## 1.5.0 – 07.11.2026
- Kategorien aufgeräumt: Reiter (Jahrzehnte, International, Deutsch, Spezial) statt aller 22 Kategorien auf einmal, kompakte Kacheln
- Neu: Versionsnummer und „Neuerungen“ unten in den Einstellungen

## 1.4.1 – 07.11.2026
- Kategorie-Farben passend zum Inhalt (z. B. 80er Neon-Fuchsia, Hip-Hop Gold, NDW Neon-Gelb, TikTok-Rot); auf hellen Farben dunkle Icons

## 1.4.0 – 07.11.2026
- Einstellungen aufgeräumt: Übersicht mit 5 Bereichen und Unterseiten (Spielregeln, Hilfen & Wiedergabe, Design, Punkte, Daten & Musik)
- Klick auf die Regel-Pills unter dem Spielen-Knopf öffnet direkt die Spielregeln

## 1.3.0 – 07.11.2026
- Spotify-Playlists und -Alben als eigene Playlist (bis 100 Songs) – Songs werden automatisch bei Deezer zugeordnet. Braucht den Cloudflare Worker (siehe README)

## 1.2.0 – 07.11.2026
- 11 neue Kategorien: 70er, R&B, Rock, Latin, Deutsch-Pop, Schlager & Party, Neue Deutsche Welle, TikTok-Hits, Film & Serien, Disney, Eurovision
- **Deutschrap** als eigene Kategorie, getrennt von Hip-Hop & Rap

## 1.1.1 – 07.11.2026
- Doppelklick auf „Nächster Song“ (oder zweimal Leertaste) überspringt keinen Song mehr
- iPhone: Ton auch bei eingeschaltetem Lautlos-Schalter
- Tipp „Leicht“: Jahrzehnt/Genre werden nachgeladen statt „unbekannt“
- Challenge-Karte auf der Startseite aktualisiert sich nach dem Spielen
- Verständliche Meldungen bei ungültigen Playlists und wenn kein Song lädt

## 1.1.0 – 07.11.2026
- Neu: **Tägliche Challenge** – jeden Tag 5 Songs, für alle gleich, mit Serie, Teilen und Countdown
- Statistik zur Challenge: Ø Punkte, Serie, „Erkannt bei …“
- Schrift liegt in der App selbst statt bei Google Fonts; Hinweis zu Deezer und „Alle Daten löschen“

## 1.0.0 – 07.11.2026
- Neuer Name **Needle Drop** und Logo (Plattenspieler, Retro-Gold), neue Adresse ku3rb1s.github.io/needle-drop
- Klick auf die Platte stoppt den Song
- Regel-Pills unter dem Spielen-Knopf, Hinweis-Punkt an den Einstellungen

## 0.3.0 – 07.11.2026
- Startpunkt „Hook“ (lauteste Stelle), Snippet-Leiter wählbar (Entspannt, Klassisch, Profi), Modus „4 Antworten“
- Lautstärkeregler am PC, Logo führt zur Startseite, „Beenden“-Knopf im Spiel

## 0.2.0 – 07.11.2026
- Design wie Musik-Bingo: Platte mit Cover-Flip, Einstellungsmenü, sechs Farbthemen

## 0.1.0 – 07.11.2026
- Erster Prototyp: Snippet-Leiter 0,1–10 s mit Deezer-Vorschauen, Kategorien inkl. Billionärs Club, Suche mit Vorschlägen, Tipps, Punkte
