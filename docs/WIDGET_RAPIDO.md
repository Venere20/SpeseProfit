# Widget a quattro riquadri — design SP-DS-001

## Uso

1. Vai in **Impostazioni → Personalizza widget** e scegli una delle tre posizioni.
2. Scegli **Categoria** o **Spesa frequente**. Per una spesa frequente imposta un nome breve distinto dalla descrizione privata. Categoria, importo e descrizione restano modificabili; cambiare categoria non cancella importo o descrizione.
3. Salva la configurazione e aggiungi/ridimensiona il widget sulla home Android. La griglia interna 2×2 richiede indicativamente 4×3–4 celle del launcher.
4. Se è configurato un importo valido, un tocco aggiunge una richiesta cifrata. La conferma compare solo dopo la scrittura durevole; il contatore della posizione aumenta e il tile resta riutilizzabile.
5. Senza importo il tile apre una schermata Android minima protetta: dopo conferma dell’importo la richiesta passa nella coda cifrata, senza aprire il vault e senza spese zero.
6. Le richieste cifrate vengono importate al successivo sblocco/ripresa valida, con data originale e deduplicazione. Solo dopo salvataggio riuscito sono rimosse dalla coda.

Il widget espone stato del bilancio, periodo, aggiornamento, nomi brevi e contatori; non importi o descrizioni dettagliate. Durante pending mostra l'ultimo stato conosciuto, senza presentarlo come già aggiornato. Al cambio settimana diventa Da aggiornare se manca uno snapshot del nuovo periodo.

La nuova configurazione è opzionale nel registro formato 2: modelli e richieste delle versioni precedenti restano compatibili. I conteggi per posizione sono derivati dal file persistente; le vecchie richieste prive di posizione restano comprese nel totale e vengono importate normalmente.

## Protezione dei dati
La chiave privata RSA-3072 è salvata esclusivamente in una tabella SQLCipher del vault, accessibile soltanto con una sessione valida. Non viene restituita a JavaScript, inserita nelle preferenze del widget o conservata in un Keystore accessibile a prescindere dalla password dell’archivio. Il componente Android può usare la chiave pubblica mentre il vault è bloccato per aggiungere richieste senza poterle decifrare.

Il modello viene cifrato alla pubblicazione dei pulsanti; la richiesta contiene quel modello cifrato più identificativo UUID, data e istante del tocco e viene nuovamente cifrata. Cifratura ibrida con AES-256-GCM e RSA-OAEP SHA-256/MGF1 SHA-256, con contesti distinti per modelli e richieste. File persistente in noBackupFilesDir, sostituito atomicamente, sincronizzato su disco e riletto prima della conferma. Le preferenze pubblicate contengono etichette, chiave pubblica, modelli cifrati e token dei pulsanti; nessuna somma in chiaro. Nessun servizio esterno o collegamento bancario. Le impostazioni continuano a escludere backup e trasferimento.

## Importazione e interruzioni
L’app decifra con sessione valida, valida l’intero lotto, applica le regole locali alle categorie automatiche, aggiunge spese e identificativi importati in un’unica scrittura del ledger. Conferma alla coda solo dopo salvataggio riuscito. Se il processo termina prima dell’ack, gli identificativi persistenti impediscono duplicazioni al successivo sblocco, anche se una spesa importata viene poi cancellata manualmente. Errori di lettura, integrità o salvataggio lasciano le richieste in attesa e non impediscono l’accesso allo storico: la configurazione widget mostra lo stato da verificare. Il pulsante Blocca e sblocca per riprovare ripete il protocollo completo.

Snapshot: descrizione, importo, metodo e scelta di categoria del modello restano quelli pubblicati quando si tocca il widget. Modificare o cancellare successivamente un modello non cambia le richieste già accodate. Se la categoria è Automatica, la risoluzione usa le regole locali al momento dell’importazione. La data originale resta associata alla settimana corretta anche dopo mezzanotte o il passaggio alla settimana successiva.

## Limiti e correzioni
Massimo 500 richieste pendenti e 5 MiB per coda; raggiunto il limite non vengono accettate nuove richieste.I tocchi ripetuti restano consentiti; ogni conferma valida produce una richiesta distinta. Un pulsante riferito a una configurazione ormai superata viene rifiutato invece di registrare un modello diverso. Il receiver non è esportato; le azioni usano PendingIntent espliciti e immutabili e verificano che il widget appartenga a SpeseProfit. Il lavoro del receiver avviene fuori dal thread UI tramite goAsync.

Le richieste sopravvivono a chiusura e riavvio, senza scadenza giornaliera. Disinstallazione, cancellazione dati, reset dello storico o perdita del dispositivo possono eliminarle definitivamente. L’eliminazione delle sole richieste richiede conferma nella configurazione widget e una sessione valida. Le spese già importate si correggono o eliminano in Movimenti. Chi può premere i pulsanti della home può aggiungere spese ai modelli scelti: questa è la capacità esplicitamente concessa al widget. Il widget non legge il vault bloccato e non ricalcola il saldo prima dello sblocco.


## Verifica storica della versione precedente
72 test applicativi e 29 test Android superati. Anteprima generata dal layout RemoteViews reale con dati di prova; nessun dato del telefono personale utilizzato. Build Android con versionCode 2, firma locale originale e bundle offline. Verifica sul launcher del telefono personale da effettuare dopo aggiornamento e assegnazione dei modelli. Nessuna installazione automatica sul telefono eseguita.

Riferimenti tecnici: https://developer.android.com/privacy-and-security/cryptography e https://developer.android.com/develop/ui/views/appwidgets/advanced.

## Verifiche del redesign
Vedi [implementazione e collaudo](IMPLEMENTAZIONE_DESIGN.md). Il redesign usa versionCode 3.
