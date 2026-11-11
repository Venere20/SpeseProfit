# SpeseProfit

SpeseProfit è un'app Android in italiano per registrare spese, incassi settimanali, rimborsi e prestiti. Il registro è cifrato e risiede sul dispositivo. L'inserimento manuale funziona anche offline. Le automazioni Fineco sono facoltative e l'app elabora gli avvisi sul telefono, senza un server applicativo.

## Come si usa

1. Crea un archivio protetto con una password, oppure sblocca quello esistente.
2. In **Home** conferma il totale degli incassi della settimana, anche se è zero. Dal pulsante **+** aggiungi spese, rimborsi o prestiti. Le spese si possono classificare con categorie e regole locali.
3. In **Movimenti** cerca e filtra lo storico, apri il dettaglio e correggi le operazioni. In **Analisi** trovi i riepiloghi giornalieri, settimanali, mensili e annuali, il confronto tra mesi e il saldo accumulato.
4. In **Impostazioni** puoi configurare il promemoria serale e tre scorciatoie per registrare spese dal widget Android.

Il bilancio distingue un incasso confermato a zero da una settimana ancora da completare. Gli incassi settimanali vengono attribuiti al mese del lunedì di quella settimana.

## Automazioni Fineco

Apri **Impostazioni → Automazioni Fineco**. Imposta il mittente esatto mostrato dal telefono e consenti la ricezione degli SMS. Puoi collegare Gmail per leggere gli avvisi di bonifico con il permesso `gmail.readonly`. L'importazione riguarda i messaggi ricevuti dopo l'attivazione.

- **Carta via SMS.** L'app riconosce le autorizzazioni Fineco e registra come spesa l'importo in euro e il nome dell'esercente.
- **Bonifici via Gmail.** I bonifici in ingresso diventano entrate da conto. Quelli in uscita già immessi incidono sul saldo come provvisori. Rifiuti, annullamenti, possibili giroconti e altri casi ambigui si gestiscono in **Da verificare**.
- **Archivio bloccato.** Gli avvisi restano in una coda cifrata finché sblocchi l'archivio. L'app registra ogni avviso una sola volta e rimuove la copia in coda dopo il salvataggio.
- **Incasso settimanale.** Il totale manuale ha precedenza. Se hai confermato 800 € e arriva un bonifico da 100 €, il totale resta 800 €. Il bonifico compare nello storico e l'app segnala la settimana da verificare.

Gmail si sincronizza all'apertura, su richiesta e in background con un intervallo nominale di 15 minuti. Android può ritardare la sincronizzazione. Dopo un arresto forzato, Gmail recupera gli avvisi alla ripresa, mentre gli SMS persi richiedono registrazione manuale. Una build con una firma diversa richiede una configurazione OAuth Android associata alla nuova firma. [Configurazione e limiti](docs/AUTOMAZIONI_FINECO.md)

## Tecnologie e struttura

| Percorso | Responsabilità e tecnologie |
| --- | --- |
| `app/`, `src/ui/` | Schermate in React Native e TypeScript, navigazione con Expo Router. |
| `src/domain/` | Regole di bilancio, categorie, riconoscimento degli avvisi Fineco, migrazione e validazione del registro. Gli importi sono gestiti in centesimi. |
| `src/application/`, `src/ports/` | Operazioni sul registro e interfacce per persistenza e funzioni del dispositivo. |
| `src/adapters/native/`, `modules/speseprofit-native/` | Integrazione TypeScript e Kotlin tramite Expo Modules. SQLCipher per l'archivio, Argon2id e Android Keystore per la protezione delle chiavi. |
| `modules/speseprofit-native/` | Ricezione SMS, OAuth con Google Play Services, Gmail API in sola lettura, sincronizzazione con WorkManager, widget e notifiche Android. |
| `plugins/`, `scripts/` | Configurazione Expo Prebuild, compilazione Gradle, firma e installazione Android. |
| `tests/` | Test applicativi con il test runner di Node.js e TSX. I test strumentali Android sono nel modulo Kotlin. |

Il registro usa il formato 3. Le migrazioni dai formati precedenti avvengono al primo sblocco. Un aggiornamento dell'app installata richiede lo stesso package Android e la stessa chiave di firma.

## Sviluppo e installazione

L'app richiede una build Android dedicata per utilizzare l'archivio e le integrazioni native. Per la compilazione su Windows servono Node.js 24, JDK 17, Android SDK 36, Build Tools 36.0.0, NDK 27.1.12297006 e CMake 3.22.1. Configura `JAVA_HOME` e `ANDROID_HOME` per l'ambiente locale.

```powershell
npm ci
npm run check
npm run prebuild:android
.\scripts\build-android.ps1 -Target standalone -Architecture arm64-v8a
```

`npm run check` esegue TypeScript, ESLint e i test applicativi. La compilazione crea l'APK firmato in `work/distribution/`. Su Windows puoi usare **Installa-SpeseProfit.cmd** per installarlo via USB. Per aggiornare un'installazione esistente, conserva la firma originale in locale e installa l'APK sopra la versione precedente. La disinstallazione cancella l'archivio locale.

- [Compilazione e sviluppo con Android Studio](docs/ANDROID_STUDIO.md)
- [Installazione via USB](docs/INSTALLAZIONE_ANDROID.md)
- [Archivio protetto](docs/ARCHIVIO_PROTETTO.md)
- [Widget e inserimento rapido](docs/WIDGET_RAPIDO.md)
- [Rimborsi e prestiti](docs/RIMBORSI_PRESTITI.md)
