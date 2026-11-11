# Firma locale sul PC

La chiave esistente rimane in work/signing/speseprofit-local.p12 e non viene rigenerata durante la migrazione. credentials.json contiene alias, versione 2 e un blob protetto con Windows DPAPI CurrentUser; la password non viene più memorizzata in chiaro. Cartella, keystore e credenziali consentono accesso soltanto all’utente Windows corrente e SYSTEM.

prepare-signing.ps1 senza opzioni restituisce solo percorso e alias. I chiamanti di firma richiedono esplicitamente -ForSigning; Gradle usa anche -Json e cattura il risultato senza stamparlo. La password viene passata a keytool/apksigner attraverso una variabile d’ambiente temporanea, mai come valore nella riga di comando. Gli errori JSON espongono soltanto categoria, tipo e nome del comando.

I vecchi credentials.json vengono migrati con sostituzione atomica. Errori, coppie incomplete e credenziali indecifrabili fermano la procedura senza sostituire la chiave. Non eliminare i file per superare un errore: una firma nuova non può aggiornare l’app autentica già installata.

Gradle, Android Studio e il confezionamento dell’APK devono operare con il medesimo utente e profilo Windows che ha protetto la credenziale. Copiare cartella e blob su un altro account non rende la credenziale disponibile. La protezione non difende da un processo già eseguito come quell’utente: si tratta del limite di custodia sul PC, distinto dalle chiavi dell’archivio Android. Le vecchie copie della password eventualmente già condivise o conservate fuori dalla cartella non sono state cercate o cancellate.

Test PC: tests/signing-security.test.ps1, eseguibile in Windows PowerShell 5 e PowerShell 7. Usa una cartella temporanea, password sintetiche e una chiave di prova separata; controlla migrazione, output pubblico, DPAPI, permessi, credenziali danneggiate, coppia incompleta, creazione e conservazione del keystore. Non utilizza il telefono o la chiave reale.
