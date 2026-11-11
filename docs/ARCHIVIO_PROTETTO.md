# Archivio protetto — 17 ottobre 2026

La build Android dedicata usa esclusivamente l’archivio SQLCipher protetto. Le funzioni demo sono rimosse; incassi e spese, con carta o contanti, si inseriscono manualmente. Nessun collegamento bancario.

## Utilizzo

Alla prima apertura scegli «Crea archivio protetto», imposta e conferma una password da 16 a 128 caratteri e conferma l'assenza di recupero. Sono ammessi spazi e Unicode; password comuni e ripetizioni prevedibili vengono rifiutate. La password pubblica demo non è ammessa.

L'archivio parte vuoto: nessun trasferimento automatico dei dati demo in chiaro. All'avvio di un nuovo processo viene richiesta la password; i ritorni entro la durata scelta possono riprendere una sessione ancora valida. Da Sicurezza puoi cambiarla conoscendo quella attuale. Il reset dello storico conserva la password.

Da Impostazioni > Password e archivio protetto > Quando richiedere la password puoi scegliere Subito, 1, 5, 15 o 30 minuti senza attivita. Subito resta il valore iniziale: blocco al background e dopo due minuti senza attivita in primo piano. Con un intervallo scelto, passare ad altre app o spegnere lo schermo mantiene temporaneamente la chiave soltanto nella memoria nativa, senza salvare la password. La durata scelta viene conservata; il diritto a riprendere la sessione non viene scritto su disco.

Quando lasci l'app, lo stato mostrato viene eliminato e i vecchi ticket vengono invalidati. Al ritorno, il componente nativo verifica la scadenza, emette un ticket nuovo e rilegge il database prima di mostrare i dati. Il tempo nativo usa [elapsedRealtime di Android](https://developer.android.com/reference/android/os/SystemClock#elapsedRealtime()), che include il sonno del dispositivo e non dipende dalla data impostata sul telefono.

Blocca adesso e il cambio password annullano subito la possibilita di ripresa. Chiusura forzata, riavvio o terminazione del processo da parte di Android richiedono la password anche se la durata scelta non e ancora trascorsa. Alla scadenza il componente nativo chiude il database e azzera il buffer della chiave; il controllo nativo nega comunque l'accesso prima di riusare una sessione scaduta, anche se il dispositivo ha sospeso i timer.

Non esistono backup, esportazione o recupero. Password dimenticata, disinstallazione, perdita del telefono o della chiave del dispositivo possono rendere definitivamente inaccessibile lo storico.

## Aggiornamento del registro

Il formato 2 conserva gli inserimenti manuali, categorie, regole e incassi. I vecchi movimenti bancari simulati non vengono più mostrati né conteggiati; restano come record inerti nello stesso archivio cifrato per evitare perdite irreversibili nella migrazione. Nessun file esterno di backup e nessuna API per ripristinare operazioni simulate. Scrittura transazionale prima di mostrare il saldo; in caso di errore l’accesso resta bloccato. Password e chiavi non vengono cambiate.

Il widget usa solo stato, settimana e data di calcolo, senza importi o credenziali. Gli snapshot della banca simulata vengono ignorati. La settimana successiva mostra “Da aggiornare” finché l’app non viene riaperta e sbloccata.

## Modelli per inserimento rapido

I modelli sono conservati nel campo facoltativo expenseTemplates dello stesso registro cifrato versione 2: descrizione, importo in centesimi, categoria e metodo di pagamento. Nessun salvataggio in preferenze pubbliche, URL o widget; i collegamenti interni contengono solo l’identificativo del modello. La data di oggi viene preparata all’apertura del modulo, senza registrare una spesa. I registri precedenti senza modelli sono compatibili. Modificare o eliminare un modello non cambia i movimenti già salvati. Il reset completo cancella anche i modelli.

## Protezione implementata

- Chiave casuale del database di 32 byte, utilizzata soltanto nel codice Android; nessuna chiave del database inviata a JavaScript.
- Argon2id v1.3 con salt casuale di 16 byte, memoria 19 MiB, due iterazioni e parallelismo uno. Il formato versione 1 identifica questi parametri fissi. La durata va ancora misurata sul telefono dell'utente.
- La chiave derivata dalla password protegge la chiave del database con AES-GCM. Un secondo involucro AES-GCM usa una chiave AES-256 non esportabile di Android Keystore, associata all'installazione. Non si assume che ogni telefono offra protezione hardware StrongBox.
- Contenitore della chiave scritto atomicamente nella cartella esclusa dai backup. Database interno SQLCipher con un record JSON versione 2 (lettura della versione 1 per la migrazione), massimo 16 MiB, scritture in transazione e parametri SQL associati.
- Cambio password con nuovo salt e sostituzione atomica del contenitore; il database mantiene la sua chiave casuale.
- Dopo cinque password errate, attesa iniziale di 30 secondi, crescente fino a 15 minuti. Stato conservato dopo riavvio del componente; nessuna cancellazione automatica dello storico.
- Invalidazione immediata dei vecchi ticket al background; eventuale sessione mantenuta solo per la durata scelta e soltanto in memoria nativa. Timer e controllo nativi della scadenza anche senza JavaScript. Chiusura del database e azzeramento del buffer della chiave alla scadenza o al blocco manuale.
- Database o contenitore alterati: apertura negata senza ricreare o cancellare automaticamente l'archivio esistente.
- Esclusioni Android per backup cloud e trasferimento dispositivo, aggiornamenti OTA disabilitati, protezione schermate Android e widget senza importi.

Le password attraversano il bridge per sbloccare l'archivio e i dati decifrati sono presenti nell'interfaccia durante l'uso. Non si promettono cancellazione perfetta delle stringhe JavaScript, protezione assoluta su telefoni compromessi o resistenza a ripristini manuali di file e orologio del dispositivo. Il limite dei tentativi non sostituisce la robustezza della password.

## Verifiche

Tredici test strumentali superati sull'emulatore isolato Android 16: database cifrato e password errata, cambio password persistente, contenitore alterato, blocco al background, ritardo persistente, creazione senza sovrascrittura, scadenza nativa senza JavaScript e database alterato conservato byte per byte. Aggiunti ripresa con ticket nuovo e rifiuto delle operazioni precedenti, blocco manuale anche prima della chiusura asincrona, preferenza persistente senza autenticazione dopo il riavvio del componente, durate alterate rifiutate e scadenza reale di un minuto in background senza JavaScript con chiave rimossa dalla memoria.

Verificato inoltre l’aggiornamento del registro da versione 1 a 2 nello stesso archivio, con successiva riapertura usando la password originale; un formato futuro viene rifiutato senza alterare il contenuto. Rapporto aggiornato in verification/android-native-manual-tests.txt (13 test, 157.767 secondi).

I test usano soltanto dati fittizi e archivi con nomi dedicati. Non verificano ancora il flusso completo sul telefono, screenshot/anteprime, widget dopo riavvio, trasferimenti OEM o tempi Argon2id sul dispositivo reale. I 27 test applicativi coprono anche calendario, finestre di sessione e limiti di scadenza, oltre a contabilità manuale, migrazione dei dati precedenti, persistenza, widget e invalidazione del servizio dopo il blocco.

## Compilazione personale senza servizi cloud

Richiede JDK 17, Android SDK/NDK e dipendenze installate:

```powershell
.\scripts\build-android.ps1 -Target standalone -Architecture arm64-v8a
```

La variante release incorpora il bundle JavaScript e usa una firma locale privata generata alla prima compilazione. Materiale di firma in `work/signing`, escluso dal controllo versione: non condividerlo insieme all'APK. La stessa firma serve per installare aggiornamenti senza disinstallare. Non è un backup dello storico e non recupera password o chiavi del vault.

Il profilo limita memoria e parallelismo. Su questo Windows utilizza Ninja locale, una copia locale dei prefab React Native e cartelle C++ generate sotto `%USERPROFILE%/spb`, senza modifiche al registro o al Ninja dell'SDK.

Per ripetere i test nativi su un emulatore di prova:

```powershell
$env:ANDROID_SERIAL = 'emulator-5580'
.\scripts\build-android.ps1 -Target test -Architecture x86_64
```

Expo Go e browser non offrono più una modalità demo: mostrano che serve la build Android dedicata. Il vecchio database in chiaro non viene aperto né importato.



## Promemoria locale — 19 ottobre 2026
Le nuove preferenze (periodo accumulato, orario del promemoria e giornate completate) sono campi opzionali del ledger cifrato versione 2. Non viene aggiunto un backup. Solo i metadati operativi necessari al promemoria (abilitazione, ora/minuti, giorno completato corrente/ultimo avviso, prossimo allarme ed esito) sono replicati in SharedPreferences private, escluse da backup/trasferimento. Il receiver non apre il vault e non conosce incassi, movimenti o chiavi. Niente azioni di conferma o modifica contabile dalla notifica: l’accesso alla giornata passa dal normale blocco dell’app. Ogni scrittura riuscita e lettura autenticata riallinea il promemoria; il reset elimina le preferenze del ledger e disabilita l’allarme. Nessuna nuova dipendenza nativa. Notifiche runtime e RECEIVE_BOOT_COMPLETED sono i soli nuovi permessi. Test nativi della versione: 20 superati sull’emulatore isolato, di cui sette per il promemoria.


## Widget rapido cifrato — 19 ottobre 2026
La nuova tabella widget_queue_keys risiede nello stesso database SQLCipher. Contiene chiave pubblica e privata RSA-3072; il metodo nativo che la legge richiede una sessione valida. Nessuna chiave privata passa a JavaScript o al receiver del widget. I modelli pubblicati vengono sigillati e il receiver può soltanto aggiungere richieste cifrate con la chiave pubblica, in un file AtomicFile dentro noBackupFilesDir. Etichette dei tre modelli e conteggio in attesa sono intenzionalmente visibili sulla home; somme e contenuto delle richieste non lo sono. Non viene mantenuta disponibile la chiave del vault ad app bloccata.

Al successivo sblocco l’importazione salva in modo atomico spese e identificativi nel ledger prima dell’ack. Un’interruzione non produce duplicati alla riapertura. Richieste con problemi di integrità non vengono cancellate automaticamente e non bloccano lo storico; si gestiscono nella sezione Widget. In caso di fallimento della pulizia dopo un reset del ledger, il salvataggio già riuscito non viene presentato come fallito e le richieste residue non vengono reimportate in uno storico senza configurazione widget. Il reset esplicito e la cancellazione della coda restano azioni distruttive confermate. APK Android con versionCode 2 per impedire un normale aggiornamento con i precedenti APK versione 1, che non conservano i nuovi metadati di idempotenza. La guida completa è WIDGET_RAPIDO.md.
