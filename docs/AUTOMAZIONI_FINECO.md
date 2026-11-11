# Automazioni Fineco — versione 7

## Attivazione
Apri Impostazioni > Automazioni Fineco nell'APK dedicato. Inserisci il mittente SMS esatto e l'intestatario del conto, quindi attiva la funzione: la data iniziale viene conservata e non viene letta la cronologia SMS. Consenti RECEIVE_SMS nel dialogo Android. Se il permesso non e disponibile la schermata lo indica come inattivo.

Collega Gmail in sola lettura. Per una build con una firma propria, abilita Gmail API nel tuo progetto Google Cloud e registra un client OAuth Android con il package della build e l'impronta SHA-1 del certificato di firma. Configura lo scope gmail.readonly. Con un progetto in modalità Testing, aggiungi gli account consentiti come utenti di prova. Autorizza l'accesso dal telefono.

## Funzionamento
- Gli avvisi ricevuti sono sigillati con RSA-OAEP e AES-GCM nella coda noBackup; la chiave privata resta in SQLCipher. Ricezione e sincronizzazione non sbloccano il vault.
- Dopo sblocco/ripresa, e all'arrivo di avvisi con app gia sbloccata, il servizio importa e conferma la coda solo dopo persistenza.
- Gli SMS di autorizzazione riportano importo ed esercente. Gli avvisi Gmail ricevuti registrano entrate da conto; quelli inviati distinguono eseguito da immesso/provvisorio. Importi zero o incompleti, valute diverse da EUR ed esiti non riconosciuti richiedono verifica.
- Rifiuti, annullamenti e possibili giroconti sono in Da verificare. Senza un riferimento univoco non si modifica automaticamente un altro movimento. La schermata propone un abbinamento da confermare.
- L'ID Gmail e per messaggio, non per conversazione. Il corpo uguale non basta a deduplicare due operazioni distinte. Gli identificativi consumati restano nel registro anche dopo eliminazione del movimento.
- Il totale manuale settimanale prevale sui bonifici ricevuti: 800 euro confermati non diventano 900 dopo un avviso da 100. Lo storico conserva il bonifico e viene segnalata la settimana da verificare. Questo vale anche nei report mensili e annuali; gli incassi settimanali mantengono l'attribuzione al mese del lunedi.
- Movimenti comprende anche entrate da conto; nel dettaglio e visibile la provenienza originale. La modifica permette importo, descrizione e classificazione.

## Limiti operativi
Gmail e controllata con rete disponibile ogni 15 minuti circa (Android puo ritardare), alla ripresa tramite recupero coda e con Sincronizza ora. Il worker recupera email successive all'attivazione tramite ricerche paginate con sovrapposizione temporale. Non invia, elimina, archivia o segna come lette email. Si richiede il solo scope gmail.readonly. I messaggi di prova del repository sono fittizi.

Un arresto forzato Android interrompe la ricezione fino alla riapertura. Gmail recupera i messaggi alla successiva sincronizzazione; gli SMS persi non vengono riletti nella prima versione. Il reset disattiva la configurazione locale e cancella coda e stato; una nuova attivazione riparte dalla nuova data. Non vengono cancellate email o l'account Google.

Il registro passa transazionalmente al formato 3. Non installare una vecchia versione per tornare al formato precedente: non comprende questi dati. La firma esistente e conservata.

## Verifiche
Log della sessione: nella cartella della chat SpeseProfit, file fineco-tests.log, fineco-native-build.log, fineco-release-final.log e fineco-android-retest.log. Distinguere compilazione riuscita, prove su emulatore e consenso reale sul telefono: il completamento di una fase non dimostra le altre. Nessuna installazione sul telefono personale viene effettuata automaticamente.


## Esito del 5 novembre 2026
- TypeScript ed ESLint superati.
- 124 test applicativi superati, zero errori.
- Modulo Android compilato; 36 prove strumentali superate sull'emulatore isolato Android 16, inclusa BankInboxTest (persistenza cifrata, deduplicazione, ack esplicito, reset e archivio formato 3).
- La prima esecuzione della suite aveva una prova notifiche fallita per il permesso mancante nel pacchetto fittizio. Dopo concessione dei permessi al solo APK di test, la suite completa ha concluso OK (36 tests), in 118,835 secondi.
- Progetto Google creato con autorizzazione dell'utente, Gmail API abilitata, client Android registrato e scope limitato a gmail.readonly. Un solo account personale ammesso come utente di prova; nessuna fatturazione collegata dalla procedura.
- Nessun telefono fisico era collegato. Non sono stati verificati consenso Gmail, concessione RECEIVE_SMS o un pagamento reale sul telefono. La procedura di aggiornamento non e stata eseguita sul telefono personale.

- APK finale: SpeseProfit-0.1.0-arm64.apk, versionCode 7, package it.speseprofit.personal, firma esistente verificata. SHA-256: 45d2e4b3c9591df70ffa289bd72a3247c70835cbd2ccb9d4a8fa9d05af7a5c57.
