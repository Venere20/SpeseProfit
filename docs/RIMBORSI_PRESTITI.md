# Rimborsi e prestiti

Implementazione del 21 ottobre 2026, Android versionCode 4.

## Accesso

Il pulsante **+** offre Aggiungi rimborso e Registra prestito. La pagina **Rimborsi e prestiti** è raggiungibile dalla Home e dalle impostazioni. Dal dettaglio di una spesa si può aprire un rimborso già collegato.

## Rimborsi ricevuti

Importo, data effettiva, metodo carta/conto o contanti, descrizione facoltativa. Il collegamento a una spesa è facoltativo per permettere rimborsi di acquisti non registrati. Sono supportati più rimborsi parziali sulla stessa spesa, fino al suo importo. Ogni rimborso è modificabile ed eliminabile con conferma.

Il bilancio del periodo è **incassi + rimborsi ricevuti − spese**. I rimborsi appaiono come voce separata, senza aumentare gli incassi da lavoro e senza cambiare retroattivamente il periodo della spesa. Le spese e le classifiche per categoria conservano gli importi originari: sono lordi dei rimborsi. Settimana, mese, anno, confronto, accumulo e stato del widget usano la stessa regola. Una settimana con incasso mancante resta incompleta: il rimborso non conferma automaticamente incasso zero.

Una spesa con rimborsi collegati deve restare inclusa, non può essere ridotta sotto il totale già rimborsato né spostata dopo le date dei rimborsi. Per eliminarla occorre prima eliminare i rimborsi collegati. Non è una gestione di richieste di rimborso attese: qui si registrano somme già ricevute.

## Prestiti

Due direzioni: **Ho prestato** e **Ho ricevuto un prestito**. Ogni voce contiene persona, capitale, data, metodo, nota e scadenza facoltativa. Il riepilogo distingue quanto devi ricevere e quanto devi restituire, con evidenza delle scadenze superate. Ricerca per persona/nota e filtri Tutti/Aperti/Chiusi.

Le restituzioni possono essere parziali o totali, con data, importo, metodo e nota. Sono modificabili ed eliminabili; il residuo e lo stato aperto/chiuso si ricalcolano, senza un flag manuale che possa diventare incoerente. Non si possono inserire somme superiori al residuo, date precedenti al prestito o registrazioni future. La direzione non è invertibile dopo la prima restituzione. L’eliminazione di un prestito confermata elimina anche il relativo storico delle restituzioni.

**Prestiti e restituzioni sono separati dal bilancio economico di incassi e spese.** Il denaro prestato non diventa un costo e quello restituito non diventa un nuovo guadagno. Il riepilogo della Home mostra i crediti/debiti ancora aperti; non è una ricostruzione del saldo bancario o della liquidità disponibile.

## Archivio e protezioni

Stesso archivio SQLCipher e stessa password/sessione. Nessun nuovo permesso, accesso alla rubrica, collegamento bancario, servizio remoto o backup. Nomi e note non vengono pubblicati nel widget né nelle notifiche. Nessun dato dimostrativo inserito nell’app distribuita.

Il registro resta formato 2 con estensione opzionale `loans`; le transazioni rimborso hanno `kind: refund` e `refundFor` facoltativo. Gli archivi precedenti si aprono senza azzeramenti. I vecchi movimenti positivi nella categoria refund sono presentati separatamente dagli altri incassi, mantenendo invariato il saldo. Usare la nuova versione per conservare i nuovi campi: le versioni precedenti non conoscono i prestiti.

Le scritture sono serializzate e diventano visibili soltanto dopo il salvataggio riuscito. Questo protegge anche da due restituzioni/rimborsi simultanei che supererebbero l’importo dovuto. Il reset elimina anche prestiti e rimborsi.

## Mappa dei file

| File | Funzioni |
|---|---|
| `src/domain/model.ts` | `Loan`, `LoanRepayment`, `Transaction.kind/refundFor`, `LedgerState.loans`, `WeeklySummary.refunds` |
| `src/domain/credits.ts` | `cleanLoan`, `cleanRepayment`, `validateLoans`, `loanRepaid`, `loanRemaining`, `cleanRefund`, `refundedCents`, `validateRefundLinks`, `creditOverview` |
| `src/application/ledgerService.ts` | `saveRefund`, `deleteRefund`, `saveLoan`, `saveRepayment`, `deleteRepayment`, `deleteLoan`; protezioni in modifica/cancellazione spesa |
| `src/domain/migration.ts` | `loadLedger`: carica e valida le estensioni senza distruggere dati |
| `src/domain/ledger.ts` | `isRefund`, `summary`, `widgetSnapshot`: rimborsi separati dagli incassi |
| `src/domain/monthly.ts`, `reports.ts`, `progress.ts` | Totali, confronti e accumulo coerenti |
| `src/ui/CreditForms.tsx` | `RefundForm`, `LoanForm`, `RepaymentForm`, `useCreditForm`: campi, selettore calendario, salvataggio e conferma uscita |
| `app/rimborsi-prestiti.tsx` | `Credits`, `LoanCard`: riepiloghi, ricerca, residui, storico, filtri e cancellazione prestito |
| `app/rimborso.tsx`, `prestito.tsx`, `restituzione.tsx` | Route di inserimento e modifica |
| `app/movimento.tsx` | Rimborso collegato alla spesa e vincoli di eliminazione |
| `src/ui/finance.tsx`, schermate mese/anno/confronto/accumulo | Voce esplicita Rimborsi ricevuti nei riepiloghi |
| `tests/credits.test.ts` | Dieci casi su calcoli, concorrenza, limiti, riapertura e scritture fallite |

## Verifica

TypeScript, lint e suite applicativa: **90 test superati**, di cui 10 nuovi. Il test mensile preesistente è aggiornato alla separazione dei rimborsi dagli altri incassi; il saldo atteso resta identico. Anche il percorso Android completo è superato: **1 test in 185,104 secondi**, con rimborso collegato, prestito da 100 €, restituzione da 25 €, residuo di 75 €, blocco/sblocco e cancellazione di rimborso e restituzione. Riapertura corretta dell’archivio protetto verificata. Log: `work/credits-ui-tests.log`.

## Distribuzione

APK firmato con la chiave locale esistente, stesso package `it.speseprofit.personal`, versionCode **4**. Percorso `work/distribution/SpeseProfit-0.1.0-arm64.apk`. SHA256 `8672bd3a3279f3ac2c57f8450095d0ed7dbf42d198344f9a532df6cec384d2ec`. Bundle offline e SQLCipher ARM64 verificati; fixture di test e materiale di firma assenti. Installare come aggiornamento senza disinstallare. Il telefono personale non è stato modificato.

Sono state salvate 21 schermate di dati fittizi in `docs/verification/credits/design-verification/`; riepilogo macchina in `docs/verification/credits/results.json`. Il collaudo usa una variante con librerie estratte per la traduzione ARM sull’emulatore x86_64; l’APK distribuito usa il confezionamento standard. Restano da provare sul telefono personale il launcher e TalkBack. I moduli crittografici nativi non sono stati modificati da questa funzionalità.
