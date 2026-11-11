# Criteri della password

Creazione e cambio usano NFC e contano punti di codice Unicode: da 16 a 128. Gli spazi rimangono parte della password; nessun trim nella derivazione. Il confronto con i valori vietati ignora maiuscole e spazi Unicode periferici, includendo U+001C–001F e U+FEFF. Blocchi ripetuti lunghi da 1 a 8 caratteri sono rifiutati, incluse nuove righe. Le password esistenti sono ancora verificate senza applicare retroattivamente i nuovi criteri.

La matrice sintetica condivisa è tests/fixtures/password-policy.tsv, codificata base64 per preservare Unicode e spazi; non contiene credenziali reali. La stessa matrice è eseguita da Node e JUnit.
