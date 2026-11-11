> Documento storico, precedente alla rimozione della demo del 17 ottobre 2026. Per il funzionamento attuale leggi README.md e STATO_IMPLEMENTAZIONE.md. Non è presente un collegamento bancario.

# Primo piano di implementazione

Aggiornamento 15 ottobre 2026: primo incremento Expo Go funzionante secondo la prova dell'utente. Vault nativo e flusso UI implementati; 19 test applicativi e 8 test del vault su emulatore Android 16 superati. APK standalone ARM64 compilato, firmato privatamente e verificato; download locale senza USB pronto. Integrazione Fineco e prove complete sul telefono restano aperte. Dettagli in [Stato](STATO_IMPLEMENTAZIONE.md) e [Archivio protetto](ARCHIVIO_PROTETTO.md). Le fasi sotto descrivono anche i criteri ancora da verificare.

## Risultato previsto

Primo incremento: prototipo Android eseguibile in Expo Go con dati fittizi, incasso settimanale, spese, categorie, riepilogo e anteprima widget. In parallelo al percorso di sviluppo, verifiche native mirate prima di ammettere dati reali.

Versione personale reale: stessa UI in development build e poi APK release, con vault protetto da password, Fineco in lettura e widget Android. Non definire il prototipo Expo Go “sicuro per il conto reale”.

## Fase 0 — Fattibilità bancaria e nativa

1. Identificare SDK Expo stabile compatibile con Expo Go e fissare versioni/lockfile. Documentare versione minima Android e requisiti JDK/Android SDK.
2. Preparare una development build Android minima con un modulo Expo Kotlin. Compilazione locale su Windows con Android Studio/JDK; nessun servizio cloud a pagamento richiesto.
3. Provare Argon2id, chiave non esportabile Keystore, SQLCipher e chiusura del vault al background, usando soli dati fittizi. Pin delle librerie mantenute dopo verifica compatibilità/licenze.
4. Provare un AppWidgetProvider che mostra solo stati fittizi; ripetere prebuild per verificare la riproducibilità dei plugin.
5. Verificare su sandbox Enable Banking firma, callback, `state`, paginazione e chiusura sessione.
6. Prima di collegare Fineco: utente registra il servizio con il proprio account e autorizza personalmente in banca. Verificare restricted mode gratuito, registrazione della chiave pubblica generata sul dispositivo e callback senza backend a pagamento.
7. Prova sul solo conto EUR selezionato: importare alcuni acquisti contabilizzati, riconciliare con Fineco e ripetere sync per individuare ID stabili, eventuali limiti e accrediti/versamenti.

**Uscita:** breve rapporto di fattibilità con esito di ogni prova, versioni fissate e limiti. Se Fineco, costo zero o callback non funzionano, completare il prototipo demo e segnalare il blocco della versione reale. Nessun fallback silenzioso a file, notifiche o servizi a pagamento.

## Fase 1 — Primo incremento Expo Go

### Fondazione

- Bootstrap Expo Router/TypeScript e lint/typecheck, senza analytics o SDK bancari contenenti segreti.
- Separare dominio, casi d'uso e adapter come in ARCHITETTURA.md.
- Implementare adapter demo SQLite e banca simulata con scenario standard, errori, duplicati e dati arrivati in ritardo.
- Database demo separato dal reale; nessuna migrazione del demo al vault. Proteggere la scelta adapter: Expo Go abilita soltanto demo, release reale non permette fallback demo.

### Schermate

1. **Benvenuto/demo:** spiega dati fittizi e limiti, nessuna richiesta di credenziali reali.
2. **Home settimanale:** selezione settimana, entrate, uscite, saldo e stato incasso; storico navigabile.
3. **Incasso:** totale settimanale, modifica, validazione importo non negativo, zero esplicito.
4. **Spesa contanti:** importo positivo, data, descrizione e categoria.
5. **Movimenti:** elenco paginato, filtro periodo/categoria, modifica classificazione, trasferimento/esclusione.
6. **Categorie:** elenco iniziale e personalizzazioni, regola facoltativa per movimenti simili futuri.
7. **Collegamento:** solo simulazione di connessione, sync e disconnessione.
8. **Sicurezza:** dimostrazione del flusso password, chiaramente etichettata; nessun backup/export.
9. **Anteprima widget:** stesso contratto di snapshot della versione nativa, senza importi.

### Test del primo incremento

- 80000 centesimi di incasso − 25000 di carta − 5000 contanti = 50000.
- Incasso sostituito senza sommare due volte; zero registrato distinto da incasso mancante.
- Prelievi/versamenti marcati trasferimento non modificano il risultato.
- Stesse transazioni importate due volte non duplicate; due acquisti identici con ID diversi preservati.
- Regole automatiche non sovrascrivono correzioni manuali.
- Passaggi domenica/lunedì, cambio ora Europe/Rome e movimenti contabili tardivi.
- Errore sync lascia dati e ultimo timestamp riuscito intatti.
- Widget positivo/negativo/pari/incompleto/scaduto coerente con home.
- Provare schermate su telefono Android in Expo Go; documentare solo verifiche effettivamente eseguite.

**Uscita:** progetto avviabile con `npx expo start`, istruzioni QR per Expo Go, dati demo riproducibili e test dominio/adapter superati. Non comprende conto reale, cifratura verificata o widget installabile.

## Fase 2 — Vault e password nella development build

- Implementare modulo nativo e adapter reale senza chiavi nel JS. Schema e migrazioni versionati nel vault.
- Password minimo 16 caratteri, lista locale di password vietate e Argon2id con parametri calibrati; nessuna biometria/passkey nella prima modalità implementata.
- Proteggere chiave SQLCipher con chiave derivata da password, cifratura autenticata e Keystore; cambio password ricifra il contenitore della chiave, non tutto lo storico.
- Blocco su background/schermo spento/inattività; chiusura database e azzeramento UI anche durante sync.
- Ritardo crescente ai tentativi errati, nessun reset remoto e nessuna cancellazione automatica.
- Escludere database, credenziali e snapshot da backup/cloud/device transfer; applicare protezione screenshot/anteprime e log senza segreti.

**Verifiche:** database illeggibile senza chiave; password errata/tampering respinti; vecchia password non apre dopo cambio; processo terminato torna bloccato; reinstallazione senza ripristino; assenza di segreti in bundle APK, repository e log. Nessuna funzione export o recupero disponibile.

## Fase 3 — Collegamento Fineco

- Attivare il client reale solo dopo l'esito positivo della fase 0 e il vault verificato.
- Login nel browser; callback monouso con scadenza e password richiesta al rientro; non salvare URL di callback nei log.
- Importazione conto EUR, paginazione, transazioni atomiche, deduplicazione, conservazione delle classificazioni manuali e finestra di rilettura.
- Categorizzazione locale; permettere la correzione dei versamenti che rappresentano incassi già inseriti.
- Sync solo da app sbloccata, ultimo aggiornamento esplicito, errori recuperabili e rinnovo consenso.
- Disconnessione con esito remoto visibile; nessuna chiamata per pagamenti.

**Verifiche:** riconciliazione con movimenti Fineco del periodo; due sync identici; perdita rete durante importazione; consenso scaduto; callback contraffatta/ripetuta; app in background; revoca remota fallita. Mai dichiarare importato un periodo incompleto senza indicarlo.

## Fase 4 — Widget Android e APK personale

- Implementare widget nativo che usa soltanto snapshot senza importi; nessun accesso al database o alla banca.
- Mostrare testo oltre al colore: Positivo, Negativo, In pareggio, Da completare, Da aggiornare.
- Ultimo aggiornamento visibile; limite di freschezza 24 ore e gestione nuova settimana senza mostrare il segno precedente.
- Tocco apre lo sblocco. Reset pulisce snapshot e storico; disconnessione invalida lo stato aggiornato.
- Preparare APK release firmato con bundle incluso e aggiornamenti OTA disabilitati. Chiave di firma fuori repository.

**Verifiche:** widget dopo riavvio telefono/processo terminato, cambio settimana e resize; nessun dato finanziario nel payload; backup/trasferimento sul dispositivo dell'utente; differenze tra development e release; nessun debug/menu demo nell'APK reale.

## Ordine e criteri di completamento

Iniziare dalla fase 0 per evitare una UI completa con collegamento irrealizzabile; la fase 1 resta utile anche se emergono blocchi. Successivamente 2 → 3 → 4, senza dati reali nel prototipo Expo Go.

La versione reale è pronta soltanto con: accesso gratuito Fineco provato, password/vault verificati, importazione riconciliata, widget senza importi, backup esclusi per quanto verificabile sul telefono e APK release testato. Niente tempi o promessa di sicurezza assoluta prima delle prove native.
