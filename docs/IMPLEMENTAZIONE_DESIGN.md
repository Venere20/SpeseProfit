# Implementazione SpeseProfitDesign — SP-DS-001

> Distribuzione corrente aggiornata il 21 ottobre 2026 al versionCode 4: [Rimborsi e prestiti](RIMBORSI_PRESTITI.md). I risultati e l’hash del 19 ottobre riportati sotto si riferiscono alla precedente build del redesign.

Specifica letta integralmente: `docs/SPESEPROFIT_DESIGN.md`, revisione 1.0 del 19 ottobre 2026.

## Confronto con la versione precedente

| Area | Prima | Implementazione |
|---|---|---|
| Identità visiva | UI chiara verde, widget blu/champagne | Token condivisi scuri blu notte, champagne e avorio; campi, card, pulsanti e schermate secondarie adattati. |
| Navigazione | Settimana/Mese/Movimenti/Impostazioni | Cinque colonne: Home, Movimenti, + integrato, Analisi, Impostazioni. Mese resta disponibile da Analisi. |
| Home | Navigazione settimane e molte azioni | Solo settimana corrente Europe/Rome, entrate/spese/bilancio e cinque barre non interattive. |
| Analisi | Mensile/annuale già presenti | Nuova sezione Giorno/Settimana, data condivisa, mini calendario e fascia continua della settimana. |
| Analisi giorno | Controllo giornata odierna | Periodo selezionabile, totale registrato, numero movimenti e tre spese maggiori cliccabili. Nessun incasso/bilancio giornaliero inventato. |
| Analisi settimana | Riepilogo nella Home | Selezione storica, grafico Spese/Bilancio, cinque barre interattive, valori visibili, zero reale e negativi sotto l'asse. |
| Movimenti | Ricerca e modifica inline | Riga ricerca con filtro, elenco compatto con icone e dettaglio separato. Conservati filtri pagamento/periodo. |
| Dettaglio/modifica | Editing nella lista | Route `movimento.tsx`, `modifica-spesa.tsx`, editor condiviso con conferma uscita senza salvare. Cancellazione con conferma. |
| Aggiunta | Pulsanti nelle schermate | Bottom sheet modale sovrapposto con Spesa/Incasso, chiusura esterna e Indietro. Nessun salvataggio durante navigazione. |
| Nuova spesa | Descrizione obbligatoria, data dipendente da settimana | Data iniziale sempre oggi, categoria Alimentari, descrizione facoltativa, errori campo e importo positivo. Carta/contanti conservati. |
| Incasso | Selettore settimana tramite giorno | Totale corrente dal +, correzione storica da Analisi, sostituzione esplicita e zero distinto da dato assente. |
| Sicurezza visiva | Schermate funzionali precedenti | Logo, schermate password scure, controllo mostra/nascondi, errori e durata sessione. Nessuna biometria/passkey fittizia. |
| Widget configurazione | Tre riferimenti a modelli | Tre editor Categoria/Spesa frequente, nome distinto dalla descrizione privata, importo facoltativo, anteprima e conservazione dei valori al cambio categoria/tipo. |
| Widget Android | Griglia semplice senza conteggi per tile | Header, superfici arrotondate, icone, periodo e aggiornamento, badge per posizione e conteggio totale. |
| Widget pending | Debounce due secondi | Tocchi ripetuti validi, coda persistente e deduplicazione all'importazione conservate; conteggi derivati dal file durevole. |
| Dati esistenti | Formato registro 2 | Estensione opzionale `widgetShortcuts`; vecchi modelli e coda cifrata ancora leggibili. Nessun azzeramento richiesto. |

## Decisioni per i punti lasciati aperti dalla specifica

La richiesta di implementazione completa si applica al design, mantenendo le funzioni già autorizzate nella conversazione.

1. **Eliminazione:** già presente e richiesta dall'utente; mantenuta nel dettaglio con conferma esplicita. Non viene eliminata una funzione utile solo perché il documento la riportava ancora da definire.
2. **Incasso storico:** azione contestuale della settimana in Analisi e del dettaglio mensile. Il + apre sempre la settimana corrente.
3. **Categoria senza importo:** il tile apre una schermata Android minima protetta dalla cattura schermo. Chiede soltanto l’importo e, dopo conferma, cifra la richiesta con la chiave pubblica senza aprire il vault. Nessuna spesa zero o importo inventato; chiave privata sempre nell’archivio. L’attività non è esportata e non compare nei recenti.
4. **Descrizione facoltativa:** il modello dati continua a richiedere una descrizione leggibile; se il campo è vuoto viene usato il nome della categoria. Questo permette compatibilità con archivio, ricerca e vecchie versioni senza record anonimi.
5. **Mensile/annuale/confronto/accumulo/modelli:** conservati e resi accessibili dalle nuove sezioni; non rimossi dal redesign.
6. **Animazioni:** il foglio usa la breve transizione nativa; la disattiva quando Android richiede movimento ridotto. La navigazione usa gli stack e tab JavaScript di Expo Router e GestureHandlerRootView, evitando il conflitto dei container nativi riscontrato sul dispositivo virtuale.

## File nuovi principali

- `src/domain/analysis.ts`: riepilogo giornaliero e finestra di cinque settimane.
- `src/domain/shortcuts.ts`: validazione configurazioni e adattamento dei vecchi modelli.
- `src/ui/Icon.tsx`, `assets/ui/`, `scripts/generate-ui-icons.cjs`: famiglia locale di icone, sorgenti SVG e raster per Android.
- `src/ui/finance.tsx`: riepiloghi, importi, righe movimento e grafico.
- `src/ui/MiniWeekCalendar.tsx`, `src/ui/CategoryPicker.tsx`, `src/ui/ExpenseEditor.tsx`, `src/ui/useToday.ts`: componenti condivisi.
- `app/(tabs)/analisi.tsx`, `app/movimento.tsx`, `app/modifica-spesa.tsx`, `app/sessione.tsx`: nuove route; `app/mese.tsx` spostata fuori dai tab.
- `tests/design.test.ts`: prove dominio, configurazione e compatibilità.
- `android/app/src/androidTest/java/it/speseprofit/personal/DesignUiTest.kt`: percorso UI con dati fittizi, solo emulatore e archivio inizialmente assente.
- `scripts/design-ui.init.gradle`: configurazione dedicata per compilare la prova UI release; non necessaria alla distribuzione.

## Sicurezza e dati

Vault, password, chiavi, scadenza nativa, cifratura coda, conferma dopo salvataggio e identificativi anti-duplicazione restano attivi. Il nuovo campo è compatibile con archivi formato 2. I nomi brevi e i conteggi sono visibili sul widget; importi e descrizioni preimpostate restano sigillati. Nessun collegamento bancario, backup o recupero aggiunto.

VersionCode Android portato a 3. Gli aggiornamenti devono mantenere package e firma e avvenire senza disinstallazione. Le prove su emulatore non intervengono sul telefono personale.

## Collaudo

I risultati conclusivi e gli eventuali limiti di verifica sono riportati in fondo al documento al termine delle prove. La checklist UX della specifica rimane riferimento per le verifiche fisiche su più launcher, TalkBack e caratteri ingranditi.

## Risultati verificati — 19 ottobre 2026

- `npm run check`: TypeScript, lint e **80 test superati** (`work/design-check.log`).
- Suite Android completa: **35 test superati in 128,439 secondi**, su emulatore isolato (`work/design-native-final-tests.log`). Comprende password errata/manomissione, sessione e scadenza senza JavaScript, notifiche generiche, coda cifrata a vault bloccato, importi facoltativi, tocchi ripetuti, deduplicazione e RemoteViews effettive.
- APK release ARM64 compilato offline e firmato con la chiave locale esistente, package `it.speseprofit.personal`, versionCode **3**. Bundle incluso, SQLCipher presente, backup e traffico HTTP non cifrato disattivati, materiale di firma e fixture UI assenti dal pacchetto.
- Distribuzione: `work/distribution/SpeseProfit-0.1.0-arm64.apk`; SHA256 `71c6b2e999dea31913cc5c409ef873cad49b0f03819ddeaadfbb507b510d2104`.
- Otto combinazioni testo/sfondo misurate: contrasto minimo **5,25:1**. È una verifica dei token, non una certificazione completa di accessibilità.
- Anteprima widget ricavata dalle RemoteViews Android e 14 schermate dell’app con dati esclusivamente fittizi: `docs/verification/design/`.
- Percorso UI completo: **1 test superato in 104,444 secondi** (`work/design-ui-tests.log`). Inserimento, passaggio Giorno/Settimana, dettaglio, modifica importo con verifica del valore, impostazioni, configurazione del widget, attività importo con FLAG_SECURE, coda persistente prima dello sblocco e importazione dopo lo sblocco. Home verificata a 360/412/450 dp; prova con font Android al 130%.

Il collaudo UI usa una variante con le librerie estratte per compatibilità con la traduzione ARM dell’emulatore x86_64. L’APK distribuito usa il confezionamento standard; codice applicativo e protezioni sono gli stessi. Il test UI è in un APK separato e rifiuta dispositivi fisici o un archivio preesistente.

Non sono stati effettuati installazioni o reset sul telefono personale. Restano da verificare sul dispositivo reale la resa sul launcher utilizzato, un secondo launcher, TalkBack e i diversi sistemi di navigazione Android; nessun feedback esterno viene dichiarato come già raccolto.
