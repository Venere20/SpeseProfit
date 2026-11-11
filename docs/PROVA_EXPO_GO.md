> Documento storico, precedente alla rimozione della demo del 17 ottobre 2026. Per il funzionamento attuale leggi README.md e STATO_IMPLEMENTAZIONE.md. Non è presente un collegamento bancario.

# Prova sul telefono Android con Expo Go

La demo usa soltanto dati fittizi. Non inserire credenziali Fineco, password personali o dati finanziari reali: l’archivio demo non è cifrato. Backup e trasferimento di Expo Go dipendono dall’app ospitante, non dalle regole del futuro APK.

## Aprire la demo

1. Collega computer e telefono alla stessa rete Wi-Fi. Il computer deve restare acceso con il server Expo in esecuzione.
2. Apri Expo Go su Android e seleziona la scansione del QR fornito in chat o nel terminale.
3. In alternativa inserisci manualmente l’indirizzo `exp://...` fornito insieme al QR. L’indirizzo può cambiare se cambi rete.
4. Attendi il primo caricamento e premi **Prova con la password demo iniziale**.

Il progetto richiede Expo Go compatibile con SDK 57. Se Expo Go segnala una versione incompatibile, annota il messaggio: non modificare password o permessi del telefono per tentare di risolverlo.

## Un caso di prova completo

1. Inserisci **800 €** come incasso della settimana.
2. Apri il collegamento alla **banca demo**, collegala e importa i movimenti fittizi: **250 €** di spese.
3. Torna alla settimana e aggiungi una spesa in contanti di **50 €**, per esempio «Mercato demo», categoria Alimentari.
4. Il saldo atteso è **+500 €**, con entrate 800 € e uscite 300 €.
5. Ripeti l’importazione: il saldo deve restare +500 € e i movimenti non devono raddoppiare.
6. In Impostazioni → Anteprima widget deve comparire **Positivo**, con la data dell’ultimo aggiornamento e senza importi.

## Protezione e limiti da verificare

- Lascia l’app e riaprila: deve tornare alla schermata di accesso demo. Lo stesso avviene dopo due minuti di inattività.
- Su Android prova uno screenshot dell’app e controlla l’anteprima nelle app recenti: la cattura deve risultare bloccata o oscurata secondo il comportamento del telefono. La protezione non rende cifrato il database.
- In Expo Go vedi un’anteprima del widget all’interno dell’app. Non puoi aggiungere il widget SpeseProfit alla home Android da Expo Go.
- La password demo modificata vale fino alla chiusura del processo. Non usare una password personale.

## Se non si collega

Verifica la stessa rete Wi-Fi e l’indirizzo riportato nel QR. Reti ospiti/aziendali possono impedire la comunicazione tra dispositivi. Non disattivare il firewall: comunica il messaggio visualizzato per individuare la causa. Non è stato configurato un tunnel pubblico.

Per riavviare dal computer: apri il progetto ed esegui `npm start -- --go --lan --port 8081`. Per generare un nuovo QR immagine con il server attivo: `node scripts/expo-go-qr.mjs`.
