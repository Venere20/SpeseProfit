# Installazione Android

## Installazione USB con doppio clic

Sul computer apri la cartella `SpeseProfit-App` e fai doppio clic su **Installa-SpeseProfit.cmd**. Il comando usa l'APK firmato gia preparato in `work/distribution`, ne controlla il digest, verifica che sia presente un solo telefono autorizzato e compatibile e lo installa con aggiornamento dei dati esistenti.

Prima di avviarlo:

1. Collega il telefono con un cavo che trasferisce dati e sblocca lo schermo.
2. Nella notifica USB scegli **Trasferimento file**, se disponibile.
3. Attiva **Debug USB** nelle **Opzioni sviluppatore**. Per mostrare queste opzioni, in genere si tocca sette volte **Numero build** nelle informazioni del telefono; il percorso preciso dipende dal modello.
4. Conferma **Consentire debug USB?** sul telefono per questo computer.
5. Fai doppio clic sul comando e attendi **SpeseProfit installata**. Se Android richiede un'ulteriore conferma, accettala sul telefono.
6. Apri **SpeseProfit**. Sblocca l’archivio con la password esistente; alla prima apertura creane uno protetto. Incassi e spese si inseriscono manualmente.

Il comando non disinstalla l'app, non azzera dati, non forza downgrade e non crea backup. Android verifica la firma durante l'installazione: se rifiuta un aggiornamento, conserva l'app esistente e fai verificare l'errore. Non disinstallare per superare il controllo, perche perderesti l'archivio locale.

Per reinstallare la stessa build o aggiornare con un APK gia preparato, ripeti il doppio clic. Dopo modifiche al codice occorre prima ricompilare e firmare la build standalone; il comando di installazione non ricompila automaticamente. Questa procedura usa Node.js e Android SDK gia presenti su questo computer.

Puoi disattivare Debug USB dopo l'installazione e riattivarlo quando serve un aggiornamento.

## Distribuzione del pacchetto

La distribuzione Wi-Fi tramite browser e QR HTTP è disattivata: non autentica il file durante la prima installazione. Usa il percorso USB descritto sopra. I vecchi QR e connection.json non sono più validi. Il comando storico serve-apk.mjs termina senza aprire una porta o pubblicare un file.

La build dedicata è autonoma da Expo Go: il bundle incluso permette di usare l’archivio senza computer acceso. Puoi attivare le integrazioni facoltative da Impostazioni > Automazioni Fineco. La build richiede Android ARM64, Android 7 o successivo.

## Prima prova sul telefono

- Crea il vault, inserisci un incasso e una spesa fittizi.
- Con sessione Subito, esci dall’app e rientra: deve richiedere la password e ritrovare i dati. Con un intervallo scelto, la password serve solo dopo la scadenza.
- Chiudi e riapri l'app: stesso risultato. Una password errata non deve aprire lo storico.
- In Sicurezza cambia password: dopo il blocco deve funzionare quella nuova e fallire quella precedente.
- Verifica il blocco dopo la durata scelta; con Subito, dopo due minuti senza attività in primo piano.
- Controlla che screenshot e anteprima delle schermate sensibili siano oscurati sul tuo telefono.
- Aggiungi il widget dalla schermata iniziale Android: deve mostrare soltanto stato e aggiornamento, senza cifre o dettagli.

Nessun backup, export o recupero: non disinstallare per aggiornare un archivio che vuoi conservare. Gli aggiornamenti devono usare la stessa firma locale. Password dimenticata o perdita del telefono possono rendere definitivamente inaccessibili i dati.

## Preparazione sul computer

La compilazione standalone esegue scripts/package-android.ps1, che firma e verifica work/distribution/SpeseProfit-0.1.0-arm64.apk. Anche la variante release di Android Studio usa la firma privata locale; debug resta separata con suffisso .dev. Vedi [Guida Android Studio](ANDROID_STUDIO.md).

Per installare usa Installa-SpeseProfit.cmd via USB: controlla il digest del file prima di comunicare con il telefono e usa un aggiornamento senza disinstallazione. Non sono previsti download di APK da browser né eccezioni agli errori di firma.
