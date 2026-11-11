> Aggiornamento sicurezza: consegna APK HTTP disattivata; usare la procedura USB. Le annotazioni Wi-Fi seguenti descrivono prove storiche.

# Stato implementazione — 19 ottobre 2026

## Widget rapido con coda cifrata — 19 ottobre

Widget Android 2×2: stato settimanale e tre pulsanti assegnabili ai modelli esistenti. Le impostazioni widget permettono di scegliere tre modelli diversi, lasciare slot vuoti, vedere il conteggio pendenti e, con conferma e sessione valida, eliminare le richieste non importate. Stessa configurazione per tutte le istanze. Un pulsante vuoto apre la configurazione. Le descrizioni scelte sono visibili sulla home, mai gli importi. Richieste in attesa comportano etichetta Ultimo saldo con conteggio, senza fingere che il saldo sia aggiornato.

Coda ibrida RSA-3072 OAEP SHA-256/MGF1 SHA-256 + AES-256-GCM, contesti autenticati distinti, chiave privata esclusivamente nella tabella SQLCipher widget_queue_keys del vault e mai inviata a JavaScript. Il widget possiede chiave pubblica e snapshot cifrati dei modelli. File cifrato persistente in noBackupFilesDir con AtomicFile e sincronizzazione su disco. Ogni richiesta conserva snapshot, UUID, istante e data Europe/Rome del tocco. Nessuna scadenza giornaliera; resiste a chiusura e riavvio. Receiver non esportato, PendingIntent espliciti/immutabili, verifica widget proprietario e lavoro fuori dal thread UI. Debounce di due secondi per slot, massimo 500 richieste/5 MiB, errori espliciti senza conferma di salvataggio quando il commit fallisce.

Importazione automatica solo dopo sblocco o ripresa valida. LedgerService valida tutto il lotto e salva spese + registro identificativi in un’unica scrittura prima dell’ack alla coda; un crash tra salvataggio e ack non duplica neppure spese poi cancellate. Il modello può essere modificato o eliminato senza cambiare gli snapshot già accodati. Categorie automatiche risolte dalle regole al momento dell’importazione. Errori mantengono la coda e lasciano accessibile lo storico. Reset dello storico elimina anche le richieste e la configurazione. Dati widget opzionali compatibili col ledger versione 2, esclusioni backup/trasferimento mantenute. Nessun collegamento bancario o permesso aggiuntivo. Guida e limiti in WIDGET_RAPIDO.md.

TypeScript, lint e 72 test applicativi superati, inclusi sette nuovi casi per idempotenza dopo interruzione/riapertura/cancellazione, data originale della domenica, snapshot, atomicità su errore, configurazione e compatibilità.

Verifica finale: 29 test Android superati in 102,686 secondi (13 archivio, 7 promemoria, 9 coda/widget), inclusi salvataggio da archivio bloccato, impossibilità di leggere la chiave privata da bloccato, snapshot dopo modifica, persistenza alla riapertura, cifratura/manomissione, identificativi obsoleti e doppi tocchi, errori reali di scrittura e pulizia, layout RemoteViews reale con anteprima PNG. Lettura di riscontro del file dopo commit prima della conferma. Build release finale riuscita in 2m32s, 634 task (57 eseguiti). APK versionCode 2 firmato con certificato originale; verificati bundle offline, SQLCipher, protezioni manifest, rimozione banner e assenza dei componenti di test. SHA256 339baa39ba89fba69c1b4271312defdfe21c58ad831ba1815fd6f0b0a5ea829c. Installazione e prova sul launcher del telefono personale lasciate all’utente tramite Installa-SpeseProfit.cmd.

## Interfaccia senza banner informativi — 19 ottobre

Rimossi sottotitoli descrittivi, spiegazioni ripetute e riquadri informativi da tutte le schermate; rimosse le schede descrittive sulle protezioni da Sicurezza e la scheda istruzioni dall’anteprima widget. Conservati dati e metadati dei movimenti, date e periodi, legende dei grafici/calendari, messaggi di errore, stati incompleti, conferme di cancellazione e avvertenza sull’assenza di recupero alla creazione archivio. Nessuna variazione a dati, calcoli, notifiche native o widget Android. La rimozione dei banner è inclusa anche nel successivo intervento sul widget rapido. TypeScript, lint e 65 test superati.

## Riepilogo, differenza accumulata e promemoria locale — 19 ottobre

Riepilogo in Settimana con incasso positivo, nessun incasso/zero esplicitamente confermato o dato da compilare. Pulsante dedicato in Incasso con conferma prima di sostituire il precedente valore con zero. Confronto delle uscite con settimana precedente intera per periodi conclusi o con gli stessi giorni per quella corrente; se il periodo precedente è vuoto non inventa un confronto. I totali correnti escludono movimenti con data futura.

Differenza accumulata raggiungibile da Settimana e Impostazioni: totale delle entrate incluse e incassi settimanali meno uscite incluse, dall’inizio delle registrazioni o da una settimana selezionata con calendario. Periodo salvato nell’archivio, elenco settimanale con progressivo, indicazione della settimana in corso e delle settimane senza incasso compilato, comprese quelle senza movimenti. Zero confermato è completo. Esclude trasferimenti, operazioni escluse e registrazioni future. Non rappresenta il saldo Fineco o tutto il patrimonio.

Promemoria serale disattivato per impostazione iniziale. Orario 0–23/0–59 nel fuso Europe/Rome, permesso Android notifiche richiesto solo su azione dell’utente, canale generico senza importi, descrizioni o azioni che aprono direttamente dati protetti. Il tocco apre giornata attraverso la normale schermata di blocco. Conferma Giornata completata consentita anche senza spese; può essere revocata, senza modificare gli incassi settimanali. Massimo una notifica al giorno: un giorno già notificato non viene nuovamente sollecitato. Conferma prima dell’orario annulla l’avviso di oggi. Android può ritardare l’avviso; dopo arresto forzato occorre riaprire l’app.

Componente Android nativo con AlarmManager inexact e PendingIntent immutabili, receiver non esportato, ripristino dopo boot, aggiornamento applicazione e modifica orologio/fuso. Nessun SCHEDULE_EXACT_ALARM, servizio permanente o collegamento bancario. Impostazioni e giornate confermate nell’archivio SQLCipher come campi opzionali della versione 2, compatibile con archivi precedenti; vecchi dati demo conservati secondo la migrazione esistente. Una copia operativa minima esterna contiene solo abilitazione, orario, giorno completato corrente, ultimo giorno notificato e metadati di programmazione, mai chiavi, movimenti o somme: serve al receiver senza sbloccare il vault. Coperta dalle esclusioni di backup e trasferimento del progetto. La sincronizzazione avviene dopo la scrittura nativa riuscita e alla lettura dopo sblocco; fallimenti di programmazione sono visibili nelle impostazioni e non invalidano una scrittura contabile riuscita. Reset cancella anche preferenze e completamenti e disattiva il promemoria.

TypeScript, lint e 65 test applicativi superati. Sull’emulatore isolato Android 16 superati 20 test nativi in 118,134 secondi: 13 dell’archivio e 7 del promemoria (notifica reale con testo generico, annullamento dopo completamento, controllo duplicati e risposte obsolete, cambio ora legale/solare Europe/Rome, orari invalidi, reset e sola metadata operativa). Build release riuscita in 4m24s, 634 task (90 eseguiti). APK firmato con certificato originale, bundle offline e nuove schermate verificati, SQLCipher presente, backup/trasferimento e HTTP disabilitati, receiver non esportato, nessun permesso per sveglie esatte e nessuna classe test nell’APK. SHA256 31c9a1b18c8c1e744815fa796687d796c8f1b5022b954bf41866e6fec2c940e0. Nessuna installazione sul telefono personale eseguita; prova finale dell’interfaccia e del tocco della notifica da effettuare sul telefono dopo aggiornamento.

## Ricerca nei movimenti — 18 ottobre

Ricerca locale nello storico per descrizione e nome categoria, con parole combinate senza distinzione di maiuscole o accenti. Storico completo come apertura predefinita, filtro settimana selezionata o intervallo inclusivo dal/al tramite calendario, categoria e pagamento Carta/Contanti combinabili. Azzeramento di query e filtri, conteggio risultati e paginazione a gruppi di venti. Gli incassi settimanali non sono movimenti e restano consultabili nella sezione Settimana. Intervalli invertiti o date non valide mostrano un errore e nessun risultato. Nessun invio di ricerche o dati alla rete; nessuna modifica al formato dell’archivio. Filtri mantenuti tornando dalla modifica di una spesa.

Build release riuscita in 1m38s; APK firmato con certificato originale e ricerca verificata nel bundle. Controlli di confezionamento su bundle offline, SQLCipher e protezioni manifest superati. Installazione sul telefono lasciata all’utente. TypeScript, lint e 58 test superati, con quattro test di ricerca per accenti e parole combinate, filtri incrociati, estremi delle date, date errate, ordinamento, archivi vuoti, movimenti esclusi e assenza di mutazioni.

## Icona blu notte e champagne — 18 ottobre

Integrata l’icona scelta dal kit allegato: portafoglio con SP e foglie, punto sulla chiusura senza ±. Sorgenti vettoriali e PNG in assets/branding, riferimenti in app.config.js per conservare l’icona dopo rigenerazione Android. Fallback launcher WebP nelle cinque densità, adaptive icon Android 8+ e monochrome Android 13+ con stesso posizionamento del foreground. Script riproducibile scripts/generate-brand-icons.cjs; nessuna dipendenza runtime aggiunta. Controllate le anteprime circolari delle risorse effettivamente generate. Nessuna variazione ai dati, alla crittografia o alle schermate.

Build release riuscita in 3m08s (532 task, 41 eseguiti); risorse launcher verificate nell’APK con aapt2. Firma originale confermata, bundle offline, SQLCipher e protezioni manifest verificati dal confezionamento. SHA256 ed28881ac253f570a9edf8f6b76f72380a8b0b5658a2619ece4f7095cd5d6b7d. Nessuna installazione sul telefono eseguita; installazione manuale con Installa-SpeseProfit.cmd.

## Inserimento rapido — 17 ottobre

Modelli personali con descrizione, importo positivo in centesimi, categoria fissa oppure automatica, carta o contanti. Nessun modello viene aggiunto automaticamente. Creazione, modifica e cancellazione da Inserimento rapido, raggiungibile dalla settimana, dalle impostazioni e dal modulo della nuova spesa. Nella settimana sono esposti i primi quattro modelli; tutti sono disponibili nella pagina dedicata.

Usa modello apre una nuova spesa con i valori salvati e la data di oggi nel fuso Europe/Rome, anche se era selezionata una settimana passata. Ogni campo è modificabile prima di Salva spesa. Preparare il modulo, creare o modificare un modello non genera movimenti. Il salvataggio della spesa è protetto dalle pressioni ripetute sullo stesso modulo. La cancellazione di un modello richiede conferma e non modifica le spese già registrate.

Modelli nel campo facoltativo expenseTemplates del registro versione 2, salvato attraverso lo stesso archivio SQLCipher e la stessa sessione protetta. Archivi precedenti senza il campo continuano a essere letti; il caricamento conserva e valida i modelli esistenti invece di scartarli. Modelli malformati o con identificativi duplicati bloccano il caricamento senza cancellare dati. Scritture serializzate e pubblicazione soltanto dopo persistenza riuscita. Nessuna nuova copia esterna, backup, esportazione o credenziale. Il reset completo elimina anche i modelli, come indicato nella conferma.

TypeScript, lint e 54 test applicativi superati, inclusi otto nuovi test su persistenza dopo riapertura, preparazione senza registrazione, data italiana, modifica dei campi, compatibilità dei registri, categorie automatiche, validazione e duplicati, errore di scrittura, eliminazione senza modificare lo storico e reset. Nessuna modifica al componente crittografico nativo. Build release riuscita in 1m26s (532 task, 24 eseguiti). APK firmato e verificato con bundle offline, SQLCipher e protezioni manifest presenti; verificati i comandi dell’inserimento rapido nel bundle. Certificato originale conservato. Digest aggiornato in verification/android-release-SHA256SUMS.txt. Installazione e prova dell’interfaccia sul telefono lasciate all’utente tramite Installa-SpeseProfit.cmd.

## Vista annuale e confronto tra mesi — 17 ottobre

Due sezioni accessibili da Mese: Vista annuale e Confronta due mesi. La vista annuale permette di selezionare l’anno, mostra entrate, uscite e saldo dei mesi già iniziati, un grafico dei dodici saldi e il dettaglio mensile. I mesi futuri sono indicati e non entrano nei totali. Mesi senza registrazioni sono distinti dai pareggi e i risultati con incassi mancanti sono segnalati come parziali. Toccando un mese si apre il calendario corrispondente, con parametri di navigazione validati.

Confronto con due selettori indipendenti, anche tra anni diversi. Se uno dei mesi è in corso, Periodo equivalente usa lo stesso numero di giorni in entrambi, limitato al mese più corto; la schermata mostra le date esatte. I mesi conclusi si confrontano per intero. Mesi interi permette di vedere i totali registrati del calendario completo, con avviso se uno è ancora in corso. Le settimane e i movimenti successivi alla fine del periodo equivalente non vengono conteggiati.

Entrate e uscite mostrano importi dei due periodi, differenza in euro e percentuale rispetto al riferimento. Con base zero la percentuale non è calcolata; zero contro zero è invariato. Il saldo mostra la differenza in euro e indica miglioramento o peggioramento, evitando percentuali ambigue sui saldi negativi. Confronto per categoria ordinato per variazione assoluta, includendo categorie presenti in un solo periodo. Gli incassi restano attribuiti al lunedì: il numero di settimane può differire tra periodi con lo stesso numero di giorni, come dichiarato nell’interfaccia.

TypeScript, lint e 46 test applicativi superati, compresi sette nuovi test per annualità, confine dicembre/gennaio, mesi futuri, periodi equivalenti, bisestili, percentuali a zero, categorie nuove o assenti e ricalcolo dopo modifica/cancellazione. Nessuna variazione al formato del registro o alla crittografia. Build release riuscita in 2m42s (532 task, 24 eseguiti). APK firmato e verificato con bundle offline, SQLCipher e protezioni manifest presenti; nuove schermate annuale e confronto verificate nel bundle. Certificato originale conservato. Digest aggiornato in verification/android-release-SHA256SUMS.txt. Installazione e prova dell’interfaccia sul telefono lasciate all’utente tramite Installa-SpeseProfit.cmd.

L’inserimento rapido è stato solo chiarito: un eventuale modello Caffè da 1,20 euro precompilerebbe i campi prima della conferma. Non è stato aggiunto come parte delle due sezioni richieste.

## Calendario del bilancio mensile — 17 ottobre

Sezione separata nella scheda Mese. Calendario italiano da lunedì a domenica, navigazione tra mesi, evidenza del giorno corrente e segno a fine riga per il risultato dell’intera settimana. + positivo, − negativo, = in pareggio soltanto dopo la conclusione della domenica nel fuso Europe/Rome; ? se manca il totale degli incassi; … per la settimana corrente e · per quelle future. Toccando una riga si apre il riepilogo della settimana e si può inserire o modificare il suo incasso.

Riepilogo mensile con entrate, uscite totali e saldo espresso come profitto, negativo o pari, indicazione del mese in corso e avviso per gli incassi mancanti delle settimane già iniziate. Classifica delle categorie in fondo alla pagina, ordinata per spesa decrescente, con importi in centesimi e percentuale sulle uscite incluse del mese. Nessuna spesa significa classifica vuota, senza divisioni per zero.

Gli incassi settimanali non hanno una ripartizione giornaliera: ogni totale appartiene una sola volta al mese del suo lunedì. Le spese seguono la data del pagamento. Una riga del calendario può includere giorni dei mesi vicini: il segno descrive tutta la settimana e non si somma direttamente per ottenere il saldo mensile. Regola spiegata nella schermata. Trasferimenti e movimenti esclusi non incidono sui totali. Modifiche e cancellazioni ricalcolano anche mese e classifica.

TypeScript, lint e 39 test applicativi superati, inclusi sei nuovi test per totali, classifica, percentuali, mesi confinanti, sei stati del calendario, chiusura settimanale nel fuso italiano, incasso zero o assente, mesi da quattro a sei righe, anno bisestile e cambio anno, ricalcolo dopo modifica/cancellazione. Nessuna modifica al formato del registro o al modulo crittografico nativo. Build release riuscita in 2m04s (532 task, 24 eseguiti). APK firmato e verificato con bundle offline, SQLCipher e protezioni manifest presenti; verificate nel bundle le nuove schermate del mese. Certificato originale conservato. Digest in verification/android-release-SHA256SUMS.txt. Installazione e prova dell’interfaccia sul telefono lasciate all’utente tramite Installa-SpeseProfit.cmd.

## Modifica completa e cancellazione delle spese — 17 ottobre

In Movimenti, toccare una spesa apre una schermata dedicata con titolo/descrizione, importo, calendario per la data, carta/contanti, categoria manuale/automatica, inclusione/trasferimento/esclusione e regola facoltativa per i movimenti futuri. Annulla modifiche conserva i dati precedenti. Dopo il salvataggio viene mostrata la settimana della data scelta, con filtri di ricerca e categoria azzerati per rendere visibile la spesa aggiornata.

Elimina spesa apre una conferma con descrizione, importo e data salvati; Elimina definitivamente rimuove solo la spesa selezionata. Incassi, altre operazioni e regole restano invariati. Nessuna cancellazione automatica e nessun annullamento dopo la conferma.

Scritture serializzate nel registro cifrato prima di pubblicare le modifiche. Modifica della spesa e regola facoltativa sono un unico salvataggio. In caso di errore rimangono i dati precedenti. Saldo settimanale, categorie e widget vengono ricalcolati dallo stato salvato. L’identità della spesa resta invariata; la creazione evita collisioni di identificativi dopo eliminazioni nello stesso millisecondo.

TypeScript, lint e 33 test applicativi superati: sei nuovi test coprono tutti i campi, passaggio tra settimane, riapertura, categoria e regola atomiche, dati non validi, cancellazione e ricalcolo del widget, errore di scrittura e identificativi dopo eliminazioni. Nessuna modifica al modulo nativo o al formato dell’archivio. Build release riuscita in 1m18s (532 task, 24 eseguiti). APK firmato e verificato con bundle offline, SQLCipher e protezioni manifest presenti. Verificata nel bundle la presenza dei nuovi comandi di modifica e cancellazione. Digest aggiornato in verification/android-release-SHA256SUMS.txt. Installazione e prova dell’interfaccia sul telefono lasciate all’utente tramite Installa-SpeseProfit.cmd.

## Rimozione delle funzioni demo — 17 ottobre

Applicazione esclusivamente manuale e protetta: rimossi accesso con password pubblica, archivio SQLite demo, generatori bancari, schermata banca, sincronizzazioni simulate e prova crittografica nell’interfaccia. Nessun collegamento bancario aggiunto. Expo Go e browser mostrano la necessità della build Android dedicata.

Spese con carta o contanti, categoria automatica basata su descrizione e regole oppure scelta manuale. Restano calendario, totale degli incassi settimanali, categorie, storico, classificazioni, password e durata della sessione. Il saldo comprende soltanto le operazioni registrate manualmente. Widget senza importi, indipendente dalle sincronizzazioni bancarie; alla nuova settimana richiede la riapertura dell’app. Gli snapshot precedenti della banca simulata sono ignorati.

Migrazione dal registro versione 1 alla 2 dopo lo sblocco: incassi, spese manuali, categorie e regole preservati. I record bancari fittizi sono esclusi da storico operativo e saldi, ma conservati come dati inerti nello stesso archivio cifrato per evitare una cancellazione irreversibile. Nessuna esportazione o copia dei dati dell’utente. Nessuna variazione alle chiavi di cifratura o firma. Scrittura transazionale della migrazione prima di mostrare i dati; errore di scrittura blocca l’apertura.

Copia verificata dei soli sorgenti precedenti in work/before-manual-only, senza archivi o chiavi. TypeScript, lint e 27 test applicativi superati, compresa migrazione senza perdita dei dati manuali e rifiuto dei formati sconosciuti. Tredici test nativi superati sull’emulatore isolato Android 16 in 157.767 secondi: compresi passaggio al registro manuale, riapertura con la password originale, rifiuto del formato futuro senza alterare i dati e scadenza reale della sessione in background. Rapporto in verification/android-native-manual-tests.txt. Prima build release e pacchetto dei test riusciti in 3m28s (634 task, 77 eseguiti). Correzione finale del widget per usare la settimana Europe/Rome anche al cambio dell’ora; build finale release riuscita in 2m43s (532 task, 43 eseguiti). APK nuovamente firmato e verificato: bundle offline, SQLCipher, manifest senza backup/HTTP e assenza delle precedenti schermate demo e della classe VaultProbe. Certificato identico alla consegna precedente. Digest aggiornato in verification/android-release-SHA256SUMS.txt. Emulatore arrestato e profilo temporaneo rimosso. Nessuna installazione sul telefono eseguita.

Installazione lasciata all’utente tramite Installa-SpeseProfit.cmd. Le sezioni successive descrivono interventi precedenti: i riferimenti alla demo non descrivono il comportamento attuale.

## Durata della sessione — 17 ottobre

Aggiunto selettore in Impostazioni > Password e archivio protetto: Subito, 1, 5, 15 o 30 minuti senza attivita. Subito conserva il comportamento iniziale. Il tempo scelto vale anche in background e a schermo spento; blocco manuale, cambio password, arresto del processo e riavvio richiedono nuovamente la password.

La preferenza viene salvata nei dati privati esclusi dai backup. Nessuna password o nuova credenziale di ripresa su disco: la chiave puo restare soltanto nella memoria nativa per la durata autorizzata. Tutti i vecchi ticket sono invalidati al background; la ripresa riceve un ticket nuovo e rilegge il database. I risultati tardivi non ripubblicano lo stato precedente. Le versioni native precedenti continuano a riconoscere il loro archivio protetto, senza ripiego alla demo se manca la nuova API.

Verifiche: TypeScript e lint superati; 26 test applicativi e 12 test nativi superati su emulatore isolato Android 16 (88.068 secondi, inclusa scadenza reale di un minuto in background). Build release e pacchetto dei test riusciti in 6m13s, 634 task. APK firmato con la chiave originale e verificato con bundle offline, SQLCipher e protezioni manifest presenti. Digest aggiornato in verification/android-release-SHA256SUMS.txt.

Installazione e prova della nuova impostazione sul telefono lasciate all'utente. Prova consigliata: scegliere 1 minuto, tornare entro 20 secondi senza password, poi lasciare l'app per oltre 70 secondi e verificare che chieda la password; ripetere con Blocca adesso e con una chiusura forzata.
## Calendario per incassi e spese — 17 ottobre

Campo data a selezione con calendario italiano, lunedi-domenica, navigazione dei mesi, giorno corrente evidenziato e pulsante Seleziona oggi. La tastiera si chiude quando si apre il calendario. Componente integrato nella stessa schermata protetta, senza nuove dipendenze o permessi.

La data della spesa viene salvata nel movimento. Per gli incassi il giorno individua la settimana del totale: scegliendo una settimana diversa viene caricato il suo incasso esistente, se presente. La schermata chiarisce che il salvataggio sostituisce il totale settimanale. Dopo il salvataggio il riepilogo mostra la settimana selezionata.

TypeScript, lint e 22 test superati, compresi calendario, anno bisestile, cambio anno e cambio ora. Build release superata in 2m52s, 532 task (24 eseguiti, 508 aggiornati). APK firmato e verificato con la chiave originale, bundle offline e SQLCipher presenti. SHA256 aggiornato: `154557bc95cf3cee8389a0942e2f4af9e771092807d13c2d0a6395daa32b71e3`.

Installazione lasciata all'utente tramite Installa-SpeseProfit.cmd. Il nuovo calendario non e stato verificato nell'interfaccia del telefono da Codex.
## Correzione avvio Android — 17 ottobre

Riprodotti sul telefono due problemi distinti: la build debug cercava un bundle offline perche il React host usava il BuildConfig della libreria anziche quello dell'app; la release si arrestava all'inizializzazione di expo-screen-capture per il permesso DETECT_SCREEN_CAPTURE eliminato dal manifest.

React host configurato esplicitamente con `useDevSupport = BuildConfig.DEBUG`, esclusione del permesso rimossa mantenendo il blocco screenshot e le esclusioni di accesso ai file. Modifiche persistenti nel plugin Expo e verificate dopo prebuild. Nome release: SpeseProfit; nuove build debug: SpeseProfit Dev.

TypeScript, lint e 19 test applicativi superati. Unione delle risorse debug verificata con successo (:app:mergeDebugResources, 84 task, 2m05s). Nuova build completa release riuscita: 532 task, 29m46s. APK offline, SQLCipher, manifest senza backup/HTTP, assenza di firma debug e firma privata originale verificati dal programma di preparazione. SHA256 della consegna per la correzione di avvio: `82ba532eb8aa7161101239942becab8bdde146b456037def45da972969853e26`.

L'utente ha installato manualmente l'aggiornamento e ha confermato il superamento di tutte le prove proposte sul telefono: avvio autonomo, archivio, saldi, categorie, blocco, password e widget. Conferma manuale dell'utente, senza automatizzare operazioni sui suoi dati.
## Android Studio

Corretto l'errore di analisi C++ `unable to read PCH file ... cmake_pch.hxx.pch`: il profilo Windows disabilita le intestazioni precompilate solo in debug, evitando la dipendenza da file non ancora costruiti durante la sincronizzazione IDE. Rigenerazione CMake di Expo, Reanimated, Worklets e app superata (56 task, 3m13s); libreria Worklets compilata. Controllate 260 unita di compilazione senza riferimenti PCH e preprocessore eseguito con successo su un sorgente per modulo. L'utente deve ancora sincronizzare l'IDE; nessuna nuova build completa APK eseguita per questa correzione.

Aggiunto `Apri-Android-Studio.cmd` e preparazione dei percorsi SDK/JDK locali. Il progetto Gradle sotto `android` applica direttamente il profilo Windows e i limiti di memoria; non dipende piu da init script o variabili SPESEPROFIT della console. Plugin Expo riproducibile per rigenerazione dei file Android. Configurazione Gradle standard verificata con successo (`help`); build completa `:app:assembleRelease :app:processDebugMainManifest` superata: 568 task, 26 minuti e 3 secondi per la prima compilazione del nuovo profilo. Non e stata automatizzata l'interfaccia di Android Studio o l'installazione sul telefono.

Release firmata con la stessa chiave privata locale dell'APK personale; nessun ripiego alla firma debug quando manca la chiave. La variante debug ha application ID separato `it.speseprofit.personal.dev`. [Guida Android Studio](ANDROID_STUDIO.md).

Ricevuta una traccia di eccezione EDT nel componente Gradle dell'IDE durante chiusura/cambio progetto e annullamento della sincronizzazione. Il comando di apertura ora rileva Android Studio gia avviato e mostra il percorso da aprire in una nuova finestra, evitando un cambio automatico del progetto. Verificati sintassi del comando e rilevamento del processo; la ripresa del flusso nell'interfaccia richiede conferma sul computer. Nessuna modifica al vault o all'APK per questo intervento.

Verificato l'APK diretto Gradle prima della preparazione della consegna: certificato privato `CN=SpeseProfit Local`, digest del certificato identico alla prima installazione e firma APK v2 valida. [Evidenza firma diretta](verification/android-studio-release-signature.txt). Verificati anche manifest release con backup/HTTP disabilitati e manifest debug con package `.dev`. Consegna in `work/distribution` rigenerata e verificata con SQLCipher e bundle offline presenti, senza flag debug o segreti di firma nel bundle; digest aggiornato in [SHA256SUMS](verification/android-release-SHA256SUMS.txt).

## Funzioni disponibili

Incassi settimanali manuali, spese contanti, categorie e regole, storico, correzioni e trasferimenti. Contabilità in centesimi, settimane Europe/Rome lunedì–domenica, salvataggio prima dell'aggiornamento UI e deduplica tramite ID bancario. L'utente ha confermato il funzionamento della demo Expo Go sul telefono.

La banca è simulata: importa 250 € di spese fittizie, ignora movimenti in attesa e permette errori e registrazioni tardive. Nessun collegamento a Fineco, nessuna credenziale bancaria richiesta, nessun servizio a pagamento attivato.

## Archivio protetto implementato

Build Android dedicata: SQLCipher, password persistente, Argon2id, involucro AES-GCM e chiave Android Keystore non esportabile. Le chiavi del database restano native. Creazione separata senza importare il database demo, cambio password atomico, ritardi crescenti ai tentativi errati, blocco nativo al background e dopo due minuti senza attività. Lo stato UI viene eliminato e le vecchie operazioni non possono ripubblicarlo dopo il blocco.

Nessun backup, export o recupero. Archivi danneggiati rifiutati senza cancellazione o sostituzione automatica. Dettagli e limiti: [Archivio protetto](ARCHIVIO_PROTETTO.md).

Expo Go continua a usare esclusivamente SQLite demo in chiaro e password dimostrativa. Il modulo protetto non viene presentato come disponibile in Expo Go. Anche la build cifrata mantiene banca ed etichette demo durante le prove.

## Verifiche effettive

| Verifica | Esito |
|---|---|
| TypeScript e lint finali | Superati, nessun errore o avviso |
| Test applicativi | 26 superati (inclusi calendario e durata della sessione): contabilità, deduplica, persistenza, widget, backup e invalidazione del servizio dopo il blocco |
| Test nativi del vault | 12 superati, inclusa scadenza in background, zero errori/fallimenti, emulatore isolato Android 16 |
| Password errata / cambio password | Verificati, incluso nuovo componente dopo cambio password |
| Manomissione contenitore / database | Apertura rifiutata; database esistente conservato |
| Background e inattività | Sessione invalidata; timer nativo chiude database e rilascia chiave senza JavaScript |
| Ritardo ai tentativi errati | Persistente dopo riavvio del componente |
| Creazione su archivio presente | Rifiutata senza sovrascrittura |
| Demo Expo Go | Funzionamento confermato dall'utente |
| Vault completo sul telefono | Da provare dopo installazione APK |
| Fineco reale | Non collegata |

Risultato nativo conservato in [XML di verifica](verification/protected-vault-android16.xml). I test usano solo archivi fittizi isolati e non leggono dati dell'utente. L'emulatore di prova viene chiuso dopo i test per liberare risorse.

## Build e distribuzione

Build standalone ARM64 completata con successo (532 task, prima compilazione 20 minuti e 29 secondi). APK consegnato: `work/distribution/SpeseProfit-0.1.0-arm64.apk`, 46.725.143 byte, versione 0.1.0, Android minimo 7/API 24, target API 36. Bundle JavaScript incluso e libreria SQLCipher ARM64 presente.

Pacchetto firmato con chiave privata locale RSA 3072: verifica firme APK v2/v3 superata, certificato `CN=SpeseProfit Local`; nessun flag application-debuggable. Nel pacchetto verificati backup e traffico HTTP disabilitati, aggiornamenti OTA disabilitati e assenza dei permessi overlay/vibrazione/archivio condiviso/media. Nessun file di firma privato incluso; password di firma assente dal bundle. Evidenze in [firma](verification/android-release-signature.txt), [manifest](verification/android-release-manifest.txt) e [digest APK](verification/android-release-SHA256SUMS.txt).

Download Wi-Fi locale del solo APK attivato per quattro ore tramite percorso casuale. Verificati HTTP 200, dimensione e digest SHA-256 identici al file; gli altri percorsi rispondono 404. QR in `work/distribution/install-qr.png`. Il telefono deve ancora eseguire la prova del flusso UI completo: i test strumentali del vault verificano il componente nativo, non sostituiscono tale prova. [Istruzioni di installazione](INSTALLAZIONE_ANDROID.md).

Il profilo Windows riduce memoria e parallelismo, usa Ninja locale, prefab copiati nella cartella di lavoro e staging C++ generato sotto `%USERPROFILE%/spb`. Nessuna modifica alle impostazioni di sistema. La consegna viene firmata e controllata da `scripts/package-android.ps1`. Con la nuova configurazione Android Studio anche `app-release.apk` usa la firma privata disponibile; i vecchi APK intermedi del template erano firmati con la chiave debug.

## Widget e privacy

Widget nativo implementato: riceve solo settimana, stato, aggiornamento e data del calcolo. Nessun importo o descrizione; non apre database né banca. Mostra «Da aggiornare» dopo 24 ore o cambio settimana quando Android lo ridisegna. Aggiornamenti periodici richiesti ogni 30 minuti, possibili ritardi del sistema. Prove dopo riavvio, ridimensionamento e cambio settimana sul telefono ancora da completare.

Backup cloud e trasferimento dispositivo esclusi dalla configurazione Android; OTA disabilitati. Permessi archivio condiviso/media bloccati. Protezione schermate Android implementata con apertura UI subordinata al successo, da verificare effettivamente sul telefono. Queste impostazioni non modificano l'app ospitante Expo Go.

## Lavoro rimanente

1. Installare sul telefono l'APK firmato già verificato tramite rete locale, senza USB.
2. Provare sul telefono creazione, riapertura dopo chiusura, cambio password, background, inattività, screenshot/anteprima e widget.
3. Verificare tempi Argon2id e comportamento backup/trasferimenti del produttore. Nessuna promessa di protezione universale su dispositivi compromessi.
4. Valutare aggiornamenti delle dipendenze prima di una release per dati reali: ultimo audit npm 25 segnalazioni aggregate (18 high, 7 moderate), comprese dipendenze transitive della toolchain. Nessuna correzione forzata incompatibile applicata.
5. Verificare accesso personale gratuito al provider e conto Fineco, poi implementare e riconciliare importazione reale. L'utente autorizza personalmente in banca, senza password o OTP nella chat.





