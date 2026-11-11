# SPESEPROFIT
## Documentazione completa UX/UI e guida all'implementazione visiva

**Identificativo:** SP-DS-001  
**Revisione:** 1.0 — 19 ottobre 2026  
**Piattaforma:** Android  
**Lingua dell'interfaccia:** Italiano  
**Tema principale:** Dark  
**Ambito:** Design dell'applicazione, interazioni, accessibilità e widget Android

---

# 00. Scopo e utilizzo del documento

Questo documento definisce come deve apparire e comportarsi l'interfaccia di SpeseProfit.

Deve consentire di ricostruire il progetto senza dover recuperare le singole conversazioni di progettazione. Include le schermate, i componenti visivi, i colori, le dimensioni, i testi, gli stati, le transizioni e l'ordine consigliato di realizzazione.

Non sostituisce la documentazione relativa a database, crittografia, sistema di cache, sincronizzazione o altre infrastrutture. L'implementazione qui descritta riguarda il livello visivo e l'interazione con l'utente.

### Come interpretare le specifiche

- **CONFERMATO:** decisione UX concordata durante la progettazione.
- **PROPOSTO:** dettaglio necessario per realizzare un'interfaccia coerente, ma non ancora approvato singolarmente.
- **DA DEFINIRE:** comportamento che richiede una decisione prima della finalizzazione.

Le dimensioni sono espresse in **dp** per gli elementi Android e in **sp** per il testo. Le misure non includono automaticamente le aree riservate alle barre di sistema.

---

# 01. Identità del prodotto

## 1.1 Cos'è SpeseProfit

SpeseProfit è un'app Android personale che permette di tenere sotto controllo le spese registrate manualmente, l'incasso totale della settimana e il bilancio del periodo.

La sua finalità è aiutare l'utente a rispondere rapidamente a tre domande:

1. Quanto ho incassato e speso questa settimana?
2. Quali spese ho registrato e quando?
3. Come stanno cambiando le mie spese nel tempo?

Un quarto obiettivo riguarda il widget Android: registrare rapidamente le spese abituali e visualizzare lo stato del bilancio senza esporre cifre sulla schermata Home del telefono.

## 1.2 Principi di design

**Semplicità.** Ogni schermata ha un obiettivo chiaro e non mostra informazioni superflue.

**Gerarchia.** Gli importi più importanti devono essere immediatamente riconoscibili. Informazioni secondarie hanno peso tipografico ridotto.

**Privacy.** Il widget non visualizza importi finanziari, descrizioni dettagliate o dati bancari.

**Coerenza.** Colori, icone, spaziature e comportamenti devono essere riutilizzati in tutte le schermate.

**Chiarezza degli stati.** L'interfaccia distingue sempre dati presenti, dati non ancora registrati, operazioni in attesa ed errori.

**Interazione veloce.** Le azioni più frequenti, come aggiungere una spesa e consultare i movimenti, richiedono pochi passaggi.

## 1.3 Vincoli di prodotto confermati

L'incasso viene registrato come **unico totale settimanale**. Un successivo inserimento per la stessa settimana sostituisce il precedente.

Le spese vengono registrate manualmente e possiedono una data specifica.

Le settimane iniziano lunedì e terminano domenica, usando il calendario italiano e il fuso Europe/Rome.

Una settimana senza incasso registrato è **Da completare**. Un incasso esplicitamente impostato a € 0,00 è invece un dato valido.

La connessione bancaria non fa parte delle funzioni attualmente disponibili: non devono comparire pulsanti o messaggi che facciano credere che le transazioni vengano importate automaticamente.

---

# 02. Design system

## 2.1 Palette colori

La palette definitiva è basata su blu notte, champagne e avorio.

| Token | Codice HEX | Utilizzo |
|---|---|---|
| `background.primary` | `#101C27` | Sfondo principale delle schermate |
| `background.brand` | `#182735` | Widget, aree istituzionali, superfici scure |
| `surface.card` | `#223543` | Card del riepilogo, calendario, blocchi informativi |
| `surface.input` | `#263947` | Campi, controlli, superfici di interazione |
| `surface.raised` | `#304653` | Bottom sheet e scorciatoie del widget |
| `navigation.background` | `#1B2D3B` | Barra di navigazione inferiore |
| `accent.primary` | `#CDBB98` | FAB, selezione, icone, evidenziazioni |
| `accent.secondary` | `#9C8665` | Dettagli secondari e accenti sobri |
| `text.primary` | `#F4EFE5` | Titoli, importi, testi principali |
| `text.secondary` | `#B9C4CD` | Etichette e descrizioni |
| `border.subtle` | `#405563` | Divisori e contorni |
| `status.positive` | `#A7D5BF` | Bilancio positivo |
| `status.negative` | `#E8A7A7` | Bilancio negativo |
| `status.warning` | `#EACB8C` | Incompleto, in attesa, da aggiornare |

**Regole obbligatorie**

Il testo principale sulle card scure usa `#F4EFE5`; il testo secondario usa `#B9C4CD`.

Il pulsante circolare champagne usa icona blu notte `#182735`, mai bianca.

Non usare champagne per ogni elemento: deve indicare selezione, azione primaria oppure un elemento importante.

Non utilizzare esclusivamente il colore per comunicare uno stato. Accompagnarlo sempre con un testo o un'icona.

Il testo di piccole dimensioni, le etichette champagne e i valori di stato devono superare una verifica di contrasto sul dispositivo effettivo. Le combinazioni della palette sono una base di progetto, non una certificazione di accessibilità.

## 2.2 Tipografia

**PROPOSTA DI IMPLEMENTAZIONE:** utilizzare **Roboto**, oppure Roboto Flex dove correttamente supportato, per coerenza con Android e buona leggibilità.

Non usare più famiglie tipografiche senza una motivazione precisa. Il logo mantiene la propria identità visiva e non determina il font dell'intera app.

| Stile | Dimensione | Peso | Utilizzo |
|---|---:|---|---|
| Titolo schermata | 26 sp | Semibold | Home, Movimenti, Analisi, Impostazioni |
| Titolo sezione | 18 sp | Semibold | Blocchi e sezioni principali |
| Titolo card | 16 sp | Medium | Riepilogo, grafici, widget |
| Importo principale | 30–32 sp | Semibold | Bilancio o totale principale |
| Importo secondario | 18–20 sp | Medium/Semibold | Entrate, uscite, importi di elenco |
| Corpo principale | 14–16 sp | Regular | Descrizioni e righe |
| Etichetta | 12–14 sp | Regular/Medium | Categoria, data, campo |
| Testo ausiliario | 12 sp | Regular | Aiuto, aggiornamento, stato |
| Etichetta bottom navigation | 10–11 sp | Medium | Nomi delle destinazioni |

Le dimensioni devono rispettare la scala dei caratteri impostata in Android. Evitare altezze rigide dove potrebbero troncare il testo.

Per gli importi, preferire cifre tabulari quando disponibili, così i valori risultano più stabili durante gli aggiornamenti.

## 2.3 Formattazione dei dati

Lingua: italiano.

Valuta: euro.

Esempi corretti: `€ 42,50`, `€ 1.284,00`, `€ 0,00`.

Per le righe di spesa si usa un segno negativo visibile: `−€ 42,50`.

Evitare cifre monetarie con punto decimale nel testo rivolto all'utente.

Date brevi: `19 ott 2026`.

Date estese: `19 ottobre 2026`.

Settimane: `19–25 ottobre 2026` oppure `28 set – 4 ott 2026`.

Non usare la parola **Profitto** come sinonimo di bilancio personale o di utile fiscale nei riepiloghi.

## 2.4 Sistema di spaziature

La progettazione utilizza una scala basata principalmente su multipli di 4 dp.

| Token | Dimensione | Esempio |
|---|---:|---|
| `space.1` | 4 dp | Distanza fra etichetta e valore |
| `space.2` | 8 dp | Distanza fra icona e testo compatto |
| `space.3` | 12 dp | Elementi vicini nella stessa card |
| `space.4` | 16 dp | Margine schermata, padding card |
| `space.5` | 20 dp | Distanze fra gruppi |
| `space.6` | 24 dp | Separazione fra sezioni importanti |
| `space.8` | 32 dp | Spaziature eccezionali |

**CONFERMATO:** mantenere la densità visiva adottata in Analisi v1.4.

Applicazione consigliata:

- Margine orizzontale principale: 16 dp.
- Distanza verticale tra card: 16 dp.
- Padding interno card: 16 dp.
- Distanza titolo card/contenuto: 12 dp.
- Distanza tra righe di una lista: 8–12 dp.
- Distanza tra campi di un modulo: 16 dp.

## 2.5 Angoli, bordi e superfici

| Elemento | Raggio |
|---|---:|
| Card standard | 16 dp |
| Bottom sheet, angoli superiori | 20–24 dp |
| Campo di input | 12 dp |
| Pulsante rettangolare | 12 dp |
| Contenitore icona | 10–12 dp |
| FAB | 50%, perfettamente circolare |
| Badge conteggio | Forma pill/circolare |
| Widget esterno | 20–24 dp circa |
| Riquadri interni widget | 14–16 dp |

Le superfici sono differenziate soprattutto dal colore, non da ombre marcate.

## 2.6 Iconografia

Utilizzare una sola famiglia coerente di icone vettoriali, ad esempio Lucide o equivalenti Material, mantenendo peso del tratto e proporzioni omogenei.

Misure:

- Icona navigazione: 24 dp.
- Icona in una riga: 20–24 dp.
- Icona nelle card: 24 dp.
- Icona principale widget: 22–24 dp.
- Icone ausiliarie: 16–18 dp.

Corrispondenze suggerite:

| Funzione | Icona |
|---|---|
| Home | `house` |
| Movimenti | `list` o `receipt-text` |
| Aggiungi | `plus` |
| Analisi | `chart-line` |
| Impostazioni | `settings-2` |
| Calendario | `calendar-days` |
| Alimentari | `shopping-basket` |
| Ristorazione | `coffee` |
| Trasporti | `car-front` |
| Carburante | `fuel` |
| Acquisti | `shopping-bag` |
| Sicurezza | `lock-keyhole` |
| Stato positivo | `trending-up` |
| Stato negativo | `trending-down` |
| Incompleto | `alert-circle` |
| In attesa | `clock-3` |

## 2.7 Pulsanti e campi

Tutti i controlli interattivi devono avere un'area di tocco di almeno 48 × 48 dp, salvo vincoli specifici del launcher del widget da verificare su Android.

Pulsante primario: sfondo champagne, testo blu notte, altezza consigliata 52 dp.

Pulsante secondario: sfondo `surface.input`, testo avorio.

Pulsante testuale: sfondo trasparente, testo champagne o avorio a seconda della gerarchia.

Campi di input: altezza minima 52–56 dp, superficie `#263947`, bordo sottile quando inattivi e accento champagne quando focalizzati.

Le etichette dei campi devono rimanere visibili. Il placeholder non è un sostituto dell'etichetta.

---

# 03. Struttura generale e navigazione

## 3.1 Mappa delle sezioni

La barra inferiore possiede esattamente cinque posizioni di uguale larghezza:

| Posizione | Contenuto | Comportamento |
|---|---|---|
| 1 | Home | Apre il riepilogo della settimana corrente |
| 2 | Movimenti | Apre l'elenco delle spese |
| 3 | `+` | Apre il bottom sheet di inserimento |
| 4 | Analisi | Apre la consultazione Giorno/Settimana |
| 5 | Impostazioni | Apre sicurezza, personalizzazione widget e informazioni |

**CONFERMATO:** il pulsante `+` è integrato nella terza colonna della barra, non rialzato sopra di essa.

## 3.2 Barra inferiore

Sfondo: `#1B2D3B`.

Altezza progettuale del contenuto: circa 68–72 dp, più il corretto inset inferiore di Android.

Cinque colonne di larghezza identica, indipendenti dalla lunghezza delle etichette.

Le quattro destinazioni tradizionali mostrano icona sopra e testo sotto, entrambi centrati.

Etichette complete: **Home**, **Movimenti**, **Analisi**, **Impostazioni**.

La destinazione selezionata usa champagne; le altre usano il testo secondario.

Il pulsante centrale:

- Diametro: 52–56 dp.
- Sfondo: `#CDBB98`.
- Icona `+`: 26–28 dp, `#182735`.
- Posizione: centro geometrico della terza colonna.
- Nessuna traslazione verticale.
- Nessuna etichetta visibile.
- Nome accessibile: `Aggiungi movimento`.

Verificare su telefoni stretti che le etichette non si sovrappongano. Se necessario, ridurre il font della barra a 10 sp, non alterare le cinque colonne.

## 3.3 Header delle schermate principali

Struttura:

1. Piccola denominazione `SPESEPROFIT`, in champagne, sopra il titolo.
2. Titolo della schermata, grande e avorio.
3. Eventuale icona contestuale allineata a destra.

Per le schermate secondarie usare una barra più semplice con:

- Freccia indietro a sinistra.
- Titolo centrale o immediatamente dopo la freccia.
- Eventuale azione di salvataggio o modifica a destra, soltanto quando serve.

**PROPOSTO:** nei moduli a schermo intero e nei dettagli, nascondere temporaneamente la bottom navigation per favorire concentrazione e spazio utile. Le quattro sezioni principali la mantengono sempre.

## 3.4 Safe area e scorrimento

L'interfaccia deve rispettare status bar, gesture bar, cutout e tastiera.

La barra inferiore non deve coprire l'ultima riga dei contenuti.

I moduli devono poter scorrere quando compare la tastiera.

Non collocare informazioni importanti sotto un FAB o all'interno di aree non accessibili.

---

# 04. Schermata Home

**Stato:** struttura confermata.

## 4.1 Scopo

Mostrare lo stato finanziario della **settimana corrente**, senza strumenti di navigazione temporale o filtri aggiuntivi.

La selezione delle settimane passate appartiene esclusivamente ad Analisi.

## 4.2 Ordine visivo dall'alto verso il basso

**Primo blocco: intestazione**

Titolo: `Panoramica`.

Sotto il titolo, etichetta: `Questa settimana`.

Periodo: per esempio `19–25 ottobre 2026`.

Il periodo è testuale, non un pulsante.

**Secondo blocco: card finanziaria principale**

Sfondo `#223543`, padding 16 dp, raggio 16 dp.

Ordine dei dati:

1. Etichetta `Entrate settimanali`.
2. Importo principale, 30–32 sp.
3. Divisore orizzontale.
4. Due colonne: `Spese` e `Bilancio`.

La card deve privilegiare la lettura dell'incasso e del bilancio, senza usare elementi decorativi inutili.

**Terzo blocco: andamento**

Titolo: `Andamento delle spese`.

Grafico a cinque barre verticali, corrispondenti alle cinque settimane più recenti.

Le barre normali usano blu-grigio; la settimana corrente champagne.

Etichette temporali sotto le barre. Il grafico Home è un riepilogo rapido, non un controllo per selezionare settimane.

La consultazione dettagliata avviene in Analisi.

## 4.3 Stati speciali

Se manca l'incasso settimanale:

- `Entrate settimanali`: `Da inserire`.
- `Bilancio`: `Da completare`.
- Testo ausiliario: `Manca l'incasso di questa settimana.`

Se l'incasso registrato è zero, visualizzare `€ 0,00`, non `Da inserire`.

Se le spese non risultano ancora registrate, usare una formulazione precisa: `Nessuna spesa registrata questa settimana`.

Non presentare lo zero come garanzia che l'utente non abbia sostenuto spese.

## 4.4 Interazioni

La schermata Home non presenta un calendario.

Il pulsante `+` nella bottom navigation avvia l'inserimento.

Il grafico Home non deve modificare il periodo visualizzato.

## 4.5 Criteri di accettazione

La settimana visualizzata è sempre quella corrente secondo Europe/Rome.

L'assenza di incasso non produce un bilancio numerico falso.

Le modifiche alle spese aggiornano i valori mostrati quando i dati dell'app sono disponibili.

I testi rimangono leggibili con dimensioni dei caratteri aumentate.

---

# 05. Schermata Movimenti

**Stato:** struttura v1.0 approvata.

## 5.1 Scopo

Consentire di cercare, filtrare e consultare le spese inserite manualmente.

## 5.2 Struttura verticale

**Header**

Titolo: `Movimenti`.

Nessuna icona di ricerca aggiuntiva nell'angolo superiore destro.

**Barra ricerca e filtro**

Una sola riga con:

- Campo di ricerca a sinistra, occupante tutto lo spazio disponibile.
- Icona filtro per categoria a destra.

Campo ricerca:

- Placeholder: `Cerca spesa...`
- Icona lente dentro il campo.
- Ricerca sulle descrizioni.
- Aggiornamento dei risultati durante la digitazione.
- Pulsante per cancellare la ricerca quando contiene testo.

Filtro:

- Icona `sliders-horizontal`.
- Area di tocco minima 48 dp.
- Apertura di menu o superficie di selezione.
- Opzioni: `Tutte` e le categorie configurate.
- Indicazione visiva del filtro attivo.
- Azione `Rimuovi filtro`.

**Lista**

Titolo sezione: `Spese recenti`.

Conteggio dei risultati, se utile, a destra.

Ordinamento: dalla data più recente alla più vecchia. A parità di data, mantenere un criterio stabile.

Ogni riga contiene:

1. Icona categoria a sinistra, dentro una superficie arrotondata.
2. Descrizione della spesa in avorio.
3. Categoria e data sotto la descrizione, in testo secondario.
4. Importo negativo allineato a destra.

Esempio:

`[icona] Supermercato                   −€ 42,50`  
`         Alimentari · 15 ott 2026`

## 5.3 Dimensioni della riga

Contenitore icona: 40–44 dp.

Icona: 20–22 dp.

Spazio tra icona e descrizione: 12 dp.

Descrizione: 14–16 sp medium.

Categoria/data: 12 sp.

Importo: 14–16 sp medium.

Altezza: dinamica, con minimo consigliato 64–72 dp.

Un divisore sottile può separare le righe, evitando card individuali troppo pesanti.

## 5.4 Interazioni

Toccando qualsiasi punto della riga si apre **Dettaglio movimento**.

Non utilizzare editing inline nella lista.

Ricerca e filtro possono essere attivi contemporaneamente.

Il ritorno dal dettaglio deve conservare, quando possibile, query, filtro e posizione di scorrimento.

## 5.5 Stati vuoti

Lista senza movimenti:

`Nessuna spesa registrata`  
`Le spese che aggiungerai compariranno qui.`

Ricerca senza risultati:

`Nessun movimento trovato`  
`Prova un'altra ricerca o rimuovi i filtri.`

Azione: `Azzera filtri`.

Errore di lettura:

`Impossibile caricare i movimenti`  
Azione: `Riprova`.

Non mescolare dati dimostrativi e dati reali.

---

# 06. Schermata Dettaglio movimento

**Stato:** schermata dedicata confermata; misure e testi proposti.

## 6.1 Struttura

Header:

- Freccia indietro.
- Titolo `Dettaglio movimento`.

Card principale:

- Icona categoria centrata in alto oppure allineata al contenuto.
- Importo grande, per esempio `−€ 42,50`.
- Descrizione: `Supermercato`.
- Divisore.
- Riga `Categoria`.
- Riga `Data`.
- Riga `Origine`, valorizzata `Inserimento manuale`.

Azione primaria: `Modifica movimento`.

## 6.2 Interazione

Il pulsante Modifica apre una schermata dedicata con i campi già valorizzati.

Al ritorno, il dettaglio mostra i valori aggiornati.

**DA DEFINIRE:** eventuale comando `Elimina spesa`, con conferma prima dell'eliminazione. Non aggiungerlo senza approvazione.

---

# 07. Schermata Modifica spesa

## 7.1 Struttura

Header: `Modifica spesa`.

Campi in ordine:

1. `Importo (€)`.
2. `Categoria`.
3. `Descrizione (facoltativa)`.
4. `Data`.

Bottone principale in fondo: `Salva modifiche`.

Gli input sono inizializzati con i valori del movimento esistente.

## 7.2 Stati

Pulsante disabilitato se l'importo è invalido.

Errori sotto i rispettivi campi, non soltanto in un messaggio generale.

Se l'utente tenta di uscire dopo aver modificato i dati senza salvarli, **PROPOSTO** mostrare una conferma:

`Vuoi uscire senza salvare?`  
Azioni: `Continua a modificare`, `Esci`.

Al salvataggio:

`Movimento aggiornato`.

Il dettaglio è aggiornato e resta coerente con la lista.

---

# 08. Pulsante + e bottom sheet

**Stato:** comportamento confermato.

## 8.1 Attivazione

Tocco sul cerchio champagne integrato nella barra inferiore.

## 8.2 Aspetto

Apertura di un **vero bottom sheet sovrapposto**, non di un pannello aggiunto in fondo al contenuto.

Overlay scuro semitrasparente sullo sfondo.

Superficie del sheet: `#304653`.

Angoli superiori: 20–24 dp.

Piccola maniglia orizzontale nella parte superiore.

Titolo: `Cosa vuoi aggiungere?`

Due righe grandi:

**Aggiungi spesa**  
Sottotitolo: `Registra un'uscita manuale`

**Aggiungi incasso**  
Sottotitolo: `Aggiorna il totale settimanale`

Ogni riga ha un'icona champagne e una freccia a destra.

## 8.3 Comportamento

Tocco sulla prima opzione → modulo Nuova spesa.

Tocco sulla seconda → modulo Incasso settimanale.

Tocco fuori dal sheet → chiusura.

Pulsante Indietro Android → chiusura.

Apertura e chiusura con animazione breve, circa 180–240 ms, nel rispetto di eventuali preferenze di movimento ridotto.

Non salvare nulla quando l'utente seleziona una delle due opzioni.

---

# 09. Schermata Nuova spesa

**Stato:** campi principali confermati.

## 9.1 Obiettivo

Registrare una spesa manuale velocemente e con il minimo numero di campi.

## 9.2 Struttura

Header: `Nuova spesa`.

Card modulo:

**Importo (€)**

- Campo obbligatorio.
- Tastiera numerica/decimale.
- Placeholder `0,00`.
- Importo maggiore di zero.
- Massimo due cifre decimali nella normale interfaccia.

**Categoria**

- Campo obbligatorio.
- Selettore con icona e nome.
- Prima categoria proposta: `Alimentari`.

**Descrizione (facoltativa)**

- Testo libero.
- Placeholder: `Es. Supermercato`.

**Data**

- Predefinita: data odierna.
- Modificabile.
- Formato visibile italiano.

Pulsante principale: `Salva spesa`.

## 9.3 Regola importante della data

Una nuova spesa avviata dal `+` usa **oggi**, non la data o la settimana che l'utente stava consultando in Analisi.

Questo evita registrazioni involontarie in periodi storici.

## 9.4 Conferme

Importo mancante: `Inserisci un importo.`

Importo non valido: `Inserisci un importo valido maggiore di zero.`

Categoria assente: `Seleziona una categoria.`

Salvataggio riuscito: `Spesa aggiunta`.

Errore: `Non è stato possibile salvare la spesa. Riprova.`

Il salvataggio è un'azione esplicita. Nessun inserimento automatico mentre l'utente scrive.

## 9.5 Categorie iniziali

- Alimentari
- Ristorazione
- Trasporti
- Casa e utenze
- Salute
- Acquisti
- Svago
- Altre spese

L'ordine delle categorie può essere ottimizzato successivamente in base all'uso, ma va mantenuto stabile durante la prima implementazione.

---

# 10. Schermata Incasso settimanale

**Stato:** logica confermata, presentazione proposta.

## 10.1 Obiettivo

Registrare il **totale incassato in una settimana**, senza chiedere di specificare i singoli giorni lavorati.

## 10.2 Struttura

Header: `Incasso settimanale`.

Card informativa:

`Settimana corrente`  
`19–25 ottobre 2026`

Campo:

`Totale incassato (€)`

Pulsante principale:

`Salva totale settimanale`

Quando esiste già un incasso:

`Totale attualmente registrato: € 600,00`

Testo esplicativo sotto il campo:

`Il nuovo importo sostituirà il totale precedente della settimana.`

In questo stato il pulsante può diventare `Aggiorna totale`.

## 10.3 Stati

L'importo `0` è valido e registrabile.

Campo vuoto non significa zero.

Una settimana priva di record resta `Da completare`.

Non chiedere all'utente di suddividere il totale nei tre giorni lavorativi.

## 10.4 Modifica dello storico

**DA DEFINIRE COME NAVIGAZIONE:** il modo più coerente per correggere l'incasso di una settimana passata è un'azione contestuale nella relativa Analisi settimanale, non un selettore storico aggiunto alla Home.

La progettazione definitiva di questa azione richiede conferma prima dell'implementazione.

---

# 11. Analisi: struttura condivisa

**Stato:** separazione Giorno/Settimana confermata.

## 11.1 Layout

Dall'alto:

1. Header `Analisi`.
2. Segmented control `Giorno | Settimana`.
3. Card selettore della data o settimana.
4. Eventuale mini calendario espanso.
5. Contenuto specifico della modalità.

La modalità attiva usa evidenziazione champagne.

Il cambio di modalità conserva la data selezionata.

## 11.2 Significato delle modalità

**Giorno:** analizza le spese effettivamente registrate in una data.

**Settimana:** mostra incasso aggregato, spese, bilancio e andamento.

Non visualizzare un incasso giornaliero ricavato artificialmente dal totale settimanale.

---

# 12. Mini calendario Analisi

**Stato:** comportamento e fascia champagne confermati.

## 12.1 Card compatta

Quando il calendario è chiuso, appare una card orizzontale con:

- Icona calendario a sinistra.
- Etichetta `Giorno selezionato` oppure `Settimana selezionata`.
- Data o intervallo in avorio.
- Chevron a destra.

Esempi:

Modalità Giorno: `15 ottobre 2026`.

Modalità Settimana: `12–18 ottobre 2026`.

Toccando la card, compare **immediatamente il mini calendario mensile**, senza aprire prima un altro selettore di data.

## 12.2 Calendario espanso

Sfondo: `#223543`.

Padding: 16 dp.

Raggio: 16 dp.

Header calendario:

- Freccia mese precedente.
- Nome mese e anno, ad esempio `Ottobre 2026`.
- Freccia mese successivo.

Sette colonne, da lunedì a domenica.

Intestazioni: `L M M G V S D`.

Altezza consigliata di ciascuna cella: almeno 40 dp, con area di tocco adeguata.

## 12.3 Fascia champagne uniforme

La settimana attiva viene rappresentata da un'unica fascia `#CDBB98`, continua da lunedì a domenica.

Non devono esserci spazi tra le celle che interrompano visivamente la fascia.

Arrotondare solo gli estremi della settimana: lunedì a sinistra, domenica a destra.

Il numero dei giorni selezionati usa `#182735`.

Il **giorno attivo** rimane distinguibile tramite un piccolo indicatore scuro o una sottile marcatura interna.

L'indicatore del giorno non deve essere confuso con i puntini rimossi dal grafico settimanale: svolge una funzione diversa.

## 12.4 Settimane a cavallo di due mesi

La settimana deve mantenere sempre il significato lunedì–domenica, anche quando attraversa il confine tra mesi.

Visualizzare i giorni appartenenti al mese precedente o successivo in tonalità secondaria.

Se la settimana selezionata attraversa due righe o due schermate mensili, mantenere il significato del periodo senza simulare una fascia geometrica impossibile.

## 12.5 Comportamento della selezione

In modalità Giorno, toccare una data cambia il riepilogo giornaliero.

In modalità Settimana, toccare un giorno seleziona la settimana corrispondente ma **non cambia automaticamente modalità**.

Dopo la scelta, il calendario si chiude e la card compatta mostra il nuovo periodo.

Quando si passa da Giorno a Settimana o viceversa, la data di riferimento viene conservata.

---

# 13. Analisi — Modalità Giorno

**Stato:** contenuti approvati.

## 13.1 Obiettivo

Rispondere alla domanda: `Quali spese ho registrato in questa giornata?`

## 13.2 Struttura verticale

**Card 1 — Riepilogo giornaliero**

Titolo: `Riepilogo giornaliero`.

Dato principale:

`Totale spese del giorno`  
`€ 82,50`

Divisore.

Dato secondario:

`Numero di movimenti`  
`3`

**Card 2 — Spese più importanti**

Titolo: `Le 3 spese più alte`.

Mostrare fino a tre righe ordinate per importo decrescente.

Ogni riga contiene:

- Icona della categoria.
- Descrizione.
- Categoria.
- Importo.

Esempio:

`Supermercato` — `Alimentari` — `−€ 42,50`.

`Carburante` — `Trasporti` — `−€ 35,00`.

`Colazione` — `Ristorazione` — `−€ 5,00`.

## 13.3 Comportamento

Il titolo resta `Le 3 spese più alte` anche se quel giorno ci sono soltanto una o due spese, salvo futura ottimizzazione del microcopy.

Toccando una riga si apre il dettaglio del relativo movimento.

Non replicare l'elenco completo dei movimenti: quello resta nella sezione Movimenti.

## 13.4 Stato senza registrazioni

Totale visualizzato: `€ 0,00` come somma delle spese **registrate**, non come dichiarazione che non si sia speso nulla.

Numero movimenti: `0`.

Card inferiore:

`Nessuna spesa registrata in questo giorno.`

## 13.5 Dati che non vanno mostrati

Nessun incasso giornaliero.

Nessun bilancio netto giornaliero.

Nessun confronto con il giorno precedente.

Nessuna categoria dominante.

Queste funzioni non sono state approvate e non fanno parte dell'attuale versione del design.

---

# 14. Analisi — Modalità Settimana

**Stato:** contenuti e controllo del grafico confermati.

## 14.1 Card riepilogo

Titolo: `Riepilogo settimanale`.

Prima riga con due colonne:

`Entrate` e relativo importo.

`Spese` e relativo importo.

Divisore.

Dato principale:

`Bilancio settimanale` e relativo importo.

Se l'incasso manca:

`Entrate`: `Da inserire`.

`Bilancio settimanale`: `Da completare`.

Non mostrare un risultato calcolato assumendo automaticamente zero entrate.

## 14.2 Card grafico

Titolo: `Andamento settimanale`.

Sottotitolo o informazione secondaria: `5 settimane`.

Segmented control:

`Spese | Bilancio`.

Il grafico usa cinque barre.

Sopra ogni barra è sempre visibile il valore corrispondente.

La barra selezionata usa champagne.

Le altre barre usano blu-grigio.

Le etichette sotto le barre mostrano la data iniziale della settimana.

Non mostrare puntini di selezione sotto le barre.

## 14.3 Selezione delle settimane

L'intera area di ciascuna barra deve essere interattiva.

Toccando una barra:

1. La barra viene evidenziata.
2. La settimana attiva cambia.
3. Il riepilogo si aggiorna.
4. La card del periodo selezionato cambia.
5. La modalità rimane Settimana.

Per rendere coerente un calendario selezionato storicamente, **PROPOSTO** far visualizzare al grafico una finestra di cinque settimane che comprenda quella attualmente scelta.

## 14.4 Grafico del bilancio

La modalità Bilancio deve avere un asse zero reale.

Valori positivi: barre sopra l'asse zero.

Valori negativi: barre sotto l'asse zero.

Valore zero: indicazione sullo zero, distinguibile da dato assente.

Bilancio incompleto: `—`, con spiegazione accessibile `Bilancio da completare`.

Non usare valori assoluti per simulare l'altezza delle barre negative.

## 14.5 Etichette dei valori

Sempre presenti.

Nei grafici compatti è accettabile arrotondare all'euro, ad esempio `285 €`.

Nel riepilogo usare sempre il valore completo: `€ 284,50`.

Per l'accessibilità, l'etichetta parlata della barra deve contenere il valore completo.

Se le etichette si sovrappongono su telefoni stretti, prevedere scorrimento orizzontale del grafico o una distribuzione alternativa, senza rimuovere le etichette richieste.

---

# 15. Schermata Impostazioni

**Stato:** contenuti essenziali confermati, disposizione proposta.

## 15.1 Layout

Header: `Impostazioni`.

Prima card: **Sicurezza**.

Seconda card: **Personalizzazione**.

Terza card: **Informazioni**.

## 15.2 Sezione Sicurezza

Riga `Cambia password`.

Sottotitolo: `Modifica la password del vault`.

Riga `Blocca applicazione`.

Sottotitolo: `Richiedi nuovamente lo sblocco`.

Ogni riga ha icona a sinistra e chevron a destra.

## 15.3 Sezione Personalizzazione

Riga principale:

`Personalizza widget`

Sottotitolo:

`Configura le tre scorciatoie rapide`.

Azione: apertura della schermata di configurazione del widget.

Questa funzionalità è confermata.

## 15.4 Sezione Informazioni

Riga:

`Informazioni sull'app`.

Mostrare almeno nome e versione visibile dell'app.

Non inserire una sezione bancaria operativa finché la funzione non è effettivamente disponibile.

---

# 16. Sicurezza — Schermate visive

## 16.1 Prima configurazione password

**PROPOSTA DI LAYOUT**, da integrare con i vincoli effettivi del sistema di sicurezza.

Sfondo blu notte.

Logo centrato sopra.

Titolo: `Proteggi SpeseProfit`.

Descrizione: `Imposta una password per accedere ai tuoi dati finanziari.`

Campi:

`Nuova password`.

`Conferma password`.

Controllo per mostrare/nascondere la password.

Azione primaria:

`Crea archivio protetto`.

Messaggi di errore chiari e associati al campo.

Non promettere funzioni di recupero password non disponibili.

## 16.2 Sblocco applicazione

Logo SpeseProfit.

Titolo: `Bentornato`.

Testo: `Inserisci la password per accedere ai tuoi dati.`

Campo `Password`.

Pulsante `Sblocca`.

Errore:

`Password non corretta. Riprova.`

Per eventuali tentativi temporaneamente limitati, mostrare il tempo d'attesa previsto senza suggerire che sia un blocco permanente.

Non aggiungere accesso biometrico o passkey finché non sono stati approvati e implementati.

## 16.3 Cambio password

Titolo: `Cambia password`.

Campi:

`Password attuale`.

`Nuova password`.

`Conferma nuova password`.

Pulsante:

`Aggiorna password`.

Conferma:

`Password aggiornata`.

---

# 17. Widget Android — Specifica visiva definitiva di progetto

**Stato:** layout quadripartito e personalizzazione confermati.

## 17.1 Scopo

Mostrare lo stato del bilancio settimanale e fornire tre scorciatoie rapide per registrare spese.

Il widget deve rimanere coerente con il design di SpeseProfit, ma non deve mostrare le informazioni dettagliate custodite all'interno dell'app.

## 17.2 Dimensioni

Il widget ha **quattro sezioni visive disposte in una griglia interna 2 × 2**.

Questo non significa che occupi soltanto 2 × 2 celle del launcher Android.

Per ottenere quattro quadranti leggibili, progettare una dimensione indicativa di **4 colonne per 3–4 righe Android**, da validare su launcher reali.

Raggio esterno: circa 22 dp.

Padding esterno: circa 12 dp.

Gap fra quadranti: circa 8 dp.

Raggio dei quadranti: circa 14 dp.

Sfondo widget: `#182735`.

## 17.3 Posizioni fisse

| Quadrante | Posizione | Contenuto |
|---|---|---|
| 1 | Alto sinistra | Bilancio |
| 2 | Alto destra | Scorciatoia 1 |
| 3 | Basso sinistra | Scorciatoia 2 |
| 4 | Basso destra | Scorciatoia 3 |

Il quadrante Bilancio non è sostituibile da una spesa.

Gli altri tre sono configurabili dentro l'app.

## 17.4 Header widget

In alto:

- Piccola icona del logo SpeseProfit.
- Testo `SpeseProfit` in champagne.
- Eventuale piccola icona di sicurezza a destra.

Non riprodurre il logo completo a una dimensione che ne comprometta la leggibilità.

## 17.5 Quadrante Bilancio

Sfondo: `#263947`.

Contenuto:

1. Icona stato.
2. Etichetta `Bilancio`.
3. Stato testuale.
4. Settimana di riferimento.
5. Ultimo aggiornamento.

Esempio:

`Bilancio`  
`Positivo`  
`19–25 ott`  
`Agg. 10:30`

Non mostrare nessun importo.

## 17.6 Stati possibili

| Stato | Icona | Colore | Testo |
|---|---|---|---|
| Positivo | Freccia crescente | Verde tenue | `Positivo` |
| Negativo | Freccia decrescente | Rosso tenue | `Negativo` |
| In pareggio | Uguale | Champagne | `In pareggio` |
| Mancanza incasso | Avviso | Giallo tenue | `Da completare` |
| Informazioni non aggiornate | Aggiorna/orologio | Giallo tenue | `Da aggiornare` |

La data e l'orario devono riferirsi chiaramente all'ultimo stato calcolato, non alla promessa di una disponibilità in tempo reale.

Se cambia la settimana e i dati del nuovo periodo non sono aggiornati, non mostrare il vecchio stato come se appartenesse alla nuova settimana.

---

# 18. Widget — Le tre scorciatoie

## 18.1 Tipi ammessi

Ogni quadrante può essere configurato come:

**Tipo A — Categoria**

Mostra una categoria di spesa, come Alimentari o Acquisti.

**Tipo B — Spesa frequente**

Mostra una spesa abituale configurata dall'utente, associata a una categoria e, quando disponibile, a un importo e una descrizione preimpostati.

## 18.2 Configurazione iniziale suggerita

Posizione 2: `Alimentari` — Categoria.

Posizione 3: `Carburante` — Spesa frequente associata a Trasporti.

Posizione 4: `Acquisti` — Categoria.

La prima configurazione può partire anche dalle tre categorie `Alimentari`, `Trasporti`, `Acquisti` e permettere successivamente di trasformare Trasporti in una spesa frequente Carburante.

## 18.3 Aspetto dei quadranti

Sfondo: `#304653`.

In alto a sinistra: icona categoria o spesa frequente, color champagne.

In alto a destra: eventuale contatore pending.

In basso:

- Nome breve della scorciatoia, avorio.
- Tipologia `Categoria` o `Spesa frequente`, in testo secondario.
- Stato `+ Spesa rapida` oppure `N in attesa`.

Non visualizzare importo predefinito o descrizione finanziaria.

## 18.4 Conteggio in attesa

Ogni tocco valido incrementa il numero di inserimenti in attesa associati alla scorciatoia.

Il contatore:

- Compare in alto a destra.
- Usa sfondo champagne.
- Usa testo blu notte.
- È piccolo, ma leggibile.
- Non copre l'icona.
- Non disabilita la scorciatoia.

Esempio:

`Alimentari` — `3 in attesa`.

`Carburante` — `2 in attesa`.

`Acquisti` — `1 in attesa`.

Sotto la griglia, se lo spazio è sufficiente, mostrare:

`6 spese in attesa`.

## 18.5 Interazione ripetuta

**CONFERMATO:** la stessa scorciatoia resta disponibile anche quando contiene operazioni in attesa.

Non oscurare il riquadro.

Non cambiare l'icona principale con un lucchetto.

Non sostituire il pulsante con uno stato disabilitato.

È possibile toccare ripetutamente lo stesso riquadro.

La variazione del contatore comunica l'effetto dell'azione.

L'interfaccia non deve chiamare `Registrata` una spesa che si trova ancora nello stato `In attesa`.

## 18.6 Privacy

Sul widget si possono mostrare:

- Stato del bilancio.
- Settimana.
- Ora dell'ultimo aggiornamento.
- Nome generico o breve nome configurato della scorciatoia.
- Numero di inserimenti in attesa.

Non mostrare:

- Importi.
- Descrizioni dettagliate delle transazioni.
- Saldi numerici.
- Dati bancari.
- Password o identificativi sensibili.

**PROPOSTO:** prevedere in futuro una modalità con etichette ancora più generiche per le spese frequenti, qualora il nome scelto dall'utente riveli informazioni personali.

---

# 19. Impostazioni → Personalizza widget

**Stato:** funzione confermata.

## 19.1 Accesso

Percorso:

`Impostazioni → Personalizza widget`.

## 19.2 Layout della schermata

Header con freccia indietro.

Titolo: `Personalizza widget`.

Descrizione:

`Scegli cosa mostrare nelle tre scorciatoie della schermata Home Android.`

Subito sotto: tre piccoli riquadri, uno per ogni scorciatoia.

Ogni riquadro contiene:

- Numero di posizione.
- Icona.
- Nome della scorciatoia.
- Evidenziazione champagne se selezionato.

Sotto si trova la card di modifica della scorciatoia attiva.

## 19.3 Selettore Tipo

Segmented control:

`Categoria | Spesa frequente`.

Il tipo selezionato determina i campi visualizzati.

## 19.4 Configurazione Categoria

Campi:

`Categoria`.

Selettore contenente le categorie disponibili.

Descrizione:

`La scorciatoia utilizza questa categoria per l'inserimento rapido delle spese.`

Se esistono dati precompilati conservati da una configurazione precedente, non cancellarli automaticamente.

## 19.5 Configurazione Spesa frequente

Campi nell'ordine:

1. `Nome della spesa frequente`.
2. `Categoria`.
3. `Importo preimpostato (€)`.
4. `Descrizione preimpostata (facoltativa)`.

Esempio illustrativo:

Nome: `Carburante`.

Categoria: `Trasporti`.

Importo: `40,00`.

Descrizione: `Rifornimento auto`.

Il nome serve a identificare la scorciatoia; la descrizione è il testo preparato per il movimento.

I valori di esempio non devono essere automaticamente inseriti come spese reali.

## 19.6 Conservazione dei valori

**CONFERMATO:** quando l'utente cambia categoria, gli eventuali importi e descrizioni già impostati rimangono conservati e modificabili.

È consigliabile preservare anche i dati di una spesa frequente quando l'utente passa temporaneamente dalla modalità Spesa frequente alla modalità Categoria e poi torna indietro.

Il cambio di tipologia non deve distruggere silenziosamente le informazioni.

## 19.7 Azioni

Pulsante principale:

`Salva configurazione`.

Azione facoltativa:

`Anteprima widget`.

La schermata di anteprima riproduce i quattro quadranti con le nuove etichette.

Conferma:

`Widget aggiornato`.

Errore:

`Non è stato possibile aggiornare la configurazione.`

## 19.8 Regole di validazione

La categoria deve essere presente.

Il nome della spesa frequente non deve essere vuoto.

Un importo predefinito, quando specificato, deve essere valido.

La descrizione è facoltativa.

L'interfaccia deve segnalare i campi problematici prima di consentire il salvataggio.

---

# 20. Caso UX ancora da definire: categoria senza importo

Questo è l'unico comportamento di inserimento rapido che non può essere specificato con completezza senza una decisione aggiuntiva.

Una spesa richiede un importo. Una scorciatoia configurata soltanto come `Alimentari` potrebbe non avere un importo preimpostato.

Non è corretto creare silenziosamente una spesa di valore zero oppure inventare un importo.

**PROPOSTA UX:**

- **Spesa frequente con importo valido:** tocco rapido, incremento del conteggio `In attesa`.
- **Categoria con importo già configurato:** stesso comportamento rapido.
- **Categoria senza importo:** apertura di un'interfaccia minima per specificare l'importo; soltanto dopo la conferma la spesa passa a `In attesa`.

Questo mantiene il principio di inserimento rapido, ma evita operazioni prive di un importo attendibile.

**DA APPROVARE:** il comportamento esatto della scorciatoia Categoria senza importo.

La scelta è intenzionalmente separata dal sistema di cache e dalla logica di persistenza, che non sono oggetto di questo documento.

---

# 21. Logo e icona Android

## 21.1 Identità esistente

Il logo di SpeseProfit comprende il riferimento a un portafoglio, le lettere `SP` e un elemento di crescita rappresentato da foglie.

I colori principali devono rimanere coerenti con blu notte e champagne.

## 21.2 Utilizzo

**Splash e prima apertura:** versione estesa o completa del marchio, centrata.

**Header app:** denominazione `SPESEPROFIT` e titolo della schermata, senza ripetere continuamente il logo completo.

**Widget:** versione ridotta e riconoscibile del simbolo.

**Icona launcher Android:** versione semplificata adatta alle maschere delle icone adattive Android.

## 21.3 Regole di produzione

Creare un asset vettoriale principale.

Preparare foreground e background per adaptive icon.

Evitare dettagli troppo sottili che scompaiono nelle piccole dimensioni.

Verificare il logo su sfondo chiaro e scuro.

Non modificare il significato del logo senza approvazione.

---

# 22. Microcopy: dizionario delle scritte

Questi testi costituiscono il vocabolario principale dell'interfaccia.

| Posizione | Testo |
|---|---|
| Home titolo | `Panoramica` |
| Home periodo | `Questa settimana` |
| Home entrate | `Entrate settimanali` |
| Home uscite | `Spese` |
| Home bilancio | `Bilancio` |
| Home grafico | `Andamento delle spese` |
| Movimenti titolo | `Movimenti` |
| Movimenti ricerca | `Cerca spesa...` |
| Movimenti lista | `Spese recenti` |
| Filtro predefinito | `Tutte` |
| Dettaglio titolo | `Dettaglio movimento` |
| Dettaglio azione | `Modifica movimento` |
| Modifica titolo | `Modifica spesa` |
| Modifica azione | `Salva modifiche` |
| Bottom sheet titolo | `Cosa vuoi aggiungere?` |
| Bottom sheet 1 | `Aggiungi spesa` |
| Bottom sheet 2 | `Aggiungi incasso` |
| Nuova spesa titolo | `Nuova spesa` |
| Nuova spesa azione | `Salva spesa` |
| Incasso titolo | `Incasso settimanale` |
| Analisi titolo | `Analisi` |
| Analisi tab 1 | `Giorno` |
| Analisi tab 2 | `Settimana` |
| Analisi card giorno | `Riepilogo giornaliero` |
| Analisi spese giorno | `Totale spese del giorno` |
| Analisi conteggio | `Numero di movimenti` |
| Analisi top tre | `Le 3 spese più alte` |
| Analisi card settimana | `Riepilogo settimanale` |
| Analisi saldo | `Bilancio settimanale` |
| Analisi grafico | `Andamento settimanale` |
| Grafico tab 1 | `Spese` |
| Grafico tab 2 | `Bilancio` |
| Stato incompleto | `Da completare` |
| Impostazioni titolo | `Impostazioni` |
| Impostazioni widget | `Personalizza widget` |
| Widget attivo | `+ Spesa rapida` |
| Widget pending | `In attesa` |
| Widget aggiornamento | `Agg. 10:30` |
| Widget configurazione salva | `Salva configurazione` |

Usare la stessa terminologia in tutte le schermate.

In particolare, non alternare senza criterio `Incassi`, `Entrate`, `Guadagni` e `Profitto`.

Nel riepilogo finanziario utilizzare **Entrate**; nell'azione manuale mantenere **Aggiungi incasso**, come deciso.

---

# 23. Stati trasversali dell'interfaccia

## 23.1 Caricamento

Quando i dati non sono ancora disponibili, evitare di mostrare temporaneamente `€ 0,00`.

Preferire uno skeleton o un indicatore di caricamento con ingombro stabile.

Il contenuto non deve saltare verticalmente quando compare il valore.

## 23.2 Errore

Il messaggio deve rispondere a tre domande:

- Che cosa non ha funzionato?
- I dati precedenti sono ancora disponibili?
- Che cosa può fare l'utente?

Esempio:

`Non è stato possibile caricare il riepilogo.`  
`Riprova`.

## 23.3 Dato mancante

Distinguere:

`Nessuna spesa registrata`.

`Incasso da inserire`.

`Bilancio da completare`.

`Dati da aggiornare`.

`Spesa in attesa`.

Non usare uno stesso trattino o zero per rappresentare tutte queste condizioni.

## 23.4 Conferme

Le conferme di un'operazione devono comparire vicino al contesto o tramite messaggio discreto.

Evitarne l'accumulo.

Non chiedere conferma per semplici operazioni di navigazione.

Richiedere una conferma esplicita per azioni distruttive, quando previste.

## 23.5 Stato pending widget

Il conteggio pending non equivale al numero di spese definitivamente elaborate.

Dopo l'apertura dell'app, il design deve distinguere aggiornamento completato da eventuale impossibilità di aggiornare.

Un contatore non deve scomparire facendo credere che tutto sia stato acquisito se non è stata ricevuta una conferma attendibile.

---

# 24. Accessibilità e usabilità

## 24.1 Controlli

Area di tocco consigliata: almeno 48 × 48 dp.

Ogni icona puramente interattiva deve avere un nome accessibile.

Esempi:

`Apri calendario`.

`Filtra per categoria`.

`Aggiungi movimento`.

`Seleziona settimana dal 12 al 18 ottobre`.

`Aggiungi spesa rapida Alimentari`.

## 24.2 Colori

Le informazioni positive, negative o incomplete devono avere icona e testo oltre al colore.

Il champagne usato come selezione deve mantenere contrasto sufficiente con testo blu notte.

## 24.3 Grafici

Ogni barra deve poter essere descritta da un lettore di schermo.

Esempio:

`Settimana dal 12 al 18 ottobre 2026. Spese registrate: 284 euro e 50 centesimi. Settimana selezionata.`

Il valore completo deve rimanere accessibile anche se l'etichetta grafica è arrotondata.

## 24.4 Testo ingrandito

Le card devono aumentare in altezza quando necessario.

Evitare di troncare importi e parole importanti.

Nelle righe dei movimenti, consentire alla descrizione di occupare più di una riga.

## 24.5 Riduzione del movimento

Animazioni brevi e funzionali.

Rispettare le preferenze di Android relative alla riduzione delle animazioni.

## 24.6 Tastiera

Il salvataggio deve rimanere raggiungibile quando è aperta la tastiera.

I campi di importo devono usare un input numerico appropriato per la lingua italiana.

L'interfaccia deve gestire correttamente la virgola decimale.

---

# 25. Struttura consigliata dei componenti UI

Questa struttura è indicativa per Expo Router / React Native / TypeScript e riguarda soltanto l'organizzazione delle interfacce.

## 25.1 Componenti condivisi

| Componente | Responsabilità |
|---|---|
| `AppScreen` | Sfondo, safe area, scorrimento |
| `ScreenHeader` | Titolo e intestazione delle schermate |
| `BottomNavigation` | Cinque colonne, FAB integrato |
| `PrimaryButton` | Pulsante champagne |
| `SecondaryButton` | Pulsante secondario |
| `AppCard` | Superficie e padding standard |
| `MoneyText` | Tipografia e formattazione visiva degli importi |
| `CategoryIcon` | Icona coerente per categoria |
| `TransactionRow` | Riga movimento riutilizzabile |
| `SearchWithFilter` | Ricerca descrizione e filtro categoria |
| `WeekSummaryCard` | Entrate, spese, bilancio |
| `DaySummaryCard` | Spese del giorno e numero movimenti |
| `TopExpenseList` | Tre spese maggiori |
| `MiniWeekCalendar` | Calendario con fascia continua |
| `WeeklyBarChart` | Barre con selezione e valori |
| `QuickAddSheet` | Menu Aggiungi spesa/incasso |
| `FormField` | Etichetta, input, errore |
| `EmptyState` | Stati vuoti coerenti |
| `StatusMessage` | Conferme ed errori |
| `WidgetShortcutEditor` | Configurazione singola scorciatoia |
| `WidgetPreview` | Anteprima visiva del widget dentro l'app |

## 25.2 Proprietà concettuali importanti

`TransactionRow`: identificativo, descrizione, categoria, data, importo, callback di apertura.

`MiniWeekCalendar`: data selezionata, mese visibile, stato aperto, callback selezione data.

`WeeklyBarChart`: elenco settimane, modalità Spese/Bilancio, settimana selezionata, callback selezione.

`WidgetShortcutEditor`: tipo, categoria, nome, importo, descrizione, errori, callback di modifica.

`WidgetPreview`: stato bilancio, periodo, ultimo aggiornamento, tre configurazioni, conteggi pending.

I componenti grafici ricevono dati già preparati; non devono contenere regole finanziarie proprie.

---

# 26. Mappa indicativa delle schermate

I nomi delle route seguenti sono **proposti**. Devono essere adattati alla struttura del repository esistente senza duplicare route già presenti.

| Route concettuale | Schermata |
|---|---|
| `/(tabs)/index` | Home |
| `/(tabs)/movimenti` | Movimenti |
| `/(tabs)/analisi` | Analisi |
| `/(tabs)/impostazioni` | Impostazioni |
| `/nuova-spesa` | Nuova spesa |
| `/incasso-settimanale` | Incasso settimanale |
| `/movimenti/[id]` | Dettaglio movimento |
| `/movimenti/[id]/modifica` | Modifica spesa |
| `/impostazioni/widget` | Personalizza widget |
| `/sicurezza/sblocco` | Sblocco |
| `/sicurezza/prima-configurazione` | Prima configurazione |
| `/sicurezza/cambia-password` | Cambio password |

Il bottom sheet è un componente di navigazione sovrapposto, non una quinta schermata di contenuto.

Il widget Android è una superficie separata dall'app React Native, pur condividendone token visivi e terminologia.

---

# 27. Guida all'implementazione UI passo dopo passo

Questa sezione definisce un ordine di lavoro concreto per realizzare il design riducendo rework e incoerenze.

## Fase 1 — Preparazione del progetto visivo

**Passaggio 1.** Individuare nel repository esistente le schermate e i componenti già implementati.

**Passaggio 2.** Creare una directory dedicata ai token visivi, per esempio `src/ui/theme/`.

**Passaggio 3.** Definire i colori con i nomi indicati nella sezione 02. Non ripetere codici HEX arbitrari in ogni schermata.

**Passaggio 4.** Definire tipografia, spaziature, raggi, altezze e icone condivise.

**Passaggio 5.** Preparare un dispositivo o simulatore con larghezza ridotta, uno standard e uno con testo ingrandito.

**Verifica:** una modifica a un token deve poter aggiornare più componenti senza interventi manuali.

## Fase 2 — Componenti di base

**Passaggio 6.** Implementare `AppScreen`, con sfondo `#101C27` e gestione degli inset Android.

**Passaggio 7.** Implementare `AppCard` con sfondo `#223543`, padding 16 dp e raggio 16 dp.

**Passaggio 8.** Implementare i pulsanti primari, secondari e iconici.

**Passaggio 9.** Implementare campi di input e selettori con messaggi di errore.

**Passaggio 10.** Implementare `MoneyText` con formattazione italiana.

**Verifica:** nessun componente deve richiedere stili duplicati per ottenere un aspetto identico.

## Fase 3 — Navigazione generale

**Passaggio 11.** Creare le quattro destinazioni di contenuto della bottom navigation.

**Passaggio 12.** Implementare le cinque colonne di uguale larghezza.

**Passaggio 13.** Inserire il pulsante champagne al centro della terza posizione.

**Passaggio 14.** Collegare Home, Movimenti, Analisi e Impostazioni.

**Passaggio 15.** Definire il comportamento di ritorno dalle schermate secondarie.

**Verifica:** il pulsante centrale non appare rialzato e le etichette sono leggibili.

## Fase 4 — Home

**Passaggio 16.** Implementare l'header.

**Passaggio 17.** Inserire la sola settimana corrente come informazione testuale.

**Passaggio 18.** Creare la card Entrate/Spese/Bilancio.

**Passaggio 19.** Implementare gli stati Da inserire e Da completare.

**Passaggio 20.** Creare il piccolo grafico delle ultime cinque settimane.

**Verifica:** non deve esserci alcun selettore temporale sulla Home.

## Fase 5 — Movimenti

**Passaggio 21.** Creare la riga di ricerca unificata con il pulsante filtro categoria.

**Passaggio 22.** Implementare l'elenco cronologico.

**Passaggio 23.** Creare `TransactionRow` con iconografia, descrizione, categoria, data e importo.

**Passaggio 24.** Collegare il tocco dell'intera riga alla schermata Dettaglio.

**Passaggio 25.** Gestire ricerca vuota, filtro attivo e assenza di risultati.

**Verifica:** non deve comparire un secondo pulsante di ricerca nell'header.

## Fase 6 — Dettaglio e modifica

**Passaggio 26.** Realizzare il dettaglio come schermata dedicata.

**Passaggio 27.** Definire una gerarchia chiara per importo, descrizione, categoria e data.

**Passaggio 28.** Implementare l'azione Modifica.

**Passaggio 29.** Riutilizzare gli input standard nel modulo di modifica.

**Passaggio 30.** Implementare validazioni e conferma visiva.

**Verifica:** la lista deve riflettere correttamente il movimento modificato.

## Fase 7 — Bottom sheet di aggiunta

**Passaggio 31.** Implementare un foglio modale reale, con overlay.

**Passaggio 32.** Creare le due azioni Spesa e Incasso.

**Passaggio 33.** Aggiungere le modalità di chiusura tocco esterno, pulsante Indietro ed eventuale swipe.

**Passaggio 34.** Collegare ciascuna azione al modulo corretto.

**Verifica:** il bottom sheet deve stare sopra l'interfaccia, senza spingere le card.

## Fase 8 — Nuova spesa

**Passaggio 35.** Creare i campi Importo, Categoria, Descrizione, Data.

**Passaggio 36.** Impostare la data odierna.

**Passaggio 37.** Gestire tastiera numerica, virgola e validazione.

**Passaggio 38.** Aggiungere il pulsante di salvataggio e il feedback.

**Passaggio 39.** Provare la schermata con tastiera aperta e testo ingrandito.

**Verifica:** una settimana storica selezionata in Analisi non deve cambiare la data iniziale della nuova spesa.

## Fase 9 — Incasso settimanale

**Passaggio 40.** Creare la card con l'intervallo della settimana corrente.

**Passaggio 41.** Mostrare il valore esistente, se presente.

**Passaggio 42.** Indicare che l'aggiornamento sostituisce il totale precedente.

**Passaggio 43.** Consentire esplicitamente l'inserimento di zero.

**Passaggio 44.** Preparare il testo di conferma del salvataggio.

**Verifica:** la UI deve distinguere zero registrato e assenza di incasso.

## Fase 10 — Calendario Analisi

**Passaggio 45.** Creare una card compatta selezionabile.

**Passaggio 46.** Aprire il mini calendario direttamente sotto la card.

**Passaggio 47.** Realizzare la griglia lunedì–domenica.

**Passaggio 48.** Disegnare la fascia champagne senza interruzioni tra i giorni.

**Passaggio 49.** Marcare distintamente il giorno attivo.

**Passaggio 50.** Gestire i cambi mese e le settimane a cavallo del mese.

**Passaggio 51.** Chiudere il calendario dopo la scelta.

**Verifica:** il cambio Giorno/Settimana non deve resettare la data.

## Fase 11 — Analisi Giorno

**Passaggio 52.** Creare la card Totale spese.

**Passaggio 53.** Inserire Numero di movimenti.

**Passaggio 54.** Ordinare e visualizzare le tre spese maggiori.

**Passaggio 55.** Rendere cliccabili le righe delle tre spese.

**Passaggio 56.** Gestire le giornate senza registrazioni.

**Verifica:** non mostrare incassi o bilanci giornalieri derivati da dati settimanali.

## Fase 12 — Analisi Settimana

**Passaggio 57.** Creare la card Entrate/Spese/Bilancio.

**Passaggio 58.** Creare il segmented control Spese/Bilancio.

**Passaggio 59.** Disegnare cinque barre, evidenziando quella selezionata.

**Passaggio 60.** Mostrare le etichette dei valori sopra le barre.

**Passaggio 61.** Rendere interattiva l'area delle barre.

**Passaggio 62.** Aggiornare card riepilogo, settimana e grafico alla selezione.

**Passaggio 63.** Disegnare correttamente i valori negativi rispetto allo zero.

**Passaggio 64.** Verificare la leggibilità delle etichette su schermi piccoli.

**Verifica:** nessun bilancio incompleto viene rappresentato come zero.

## Fase 13 — Impostazioni e sicurezza visiva

**Passaggio 65.** Organizzare le sezioni Sicurezza, Personalizzazione e Informazioni.

**Passaggio 66.** Aggiungere le schermate di sblocco, prima configurazione e cambio password, usando i componenti già creati.

**Passaggio 67.** Inserire `Personalizza widget`.

**Verifica:** nessuna voce suggerisce funzionalità bancarie attualmente non disponibili.

## Fase 14 — Personalizzazione widget

**Passaggio 68.** Creare tre selettori di posizione.

**Passaggio 69.** Creare il controllo Categoria/Spesa frequente.

**Passaggio 70.** Implementare i rispettivi moduli.

**Passaggio 71.** Conservare importo e descrizione durante il cambio categoria.

**Passaggio 72.** Creare l'anteprima visuale a quattro quadranti.

**Passaggio 73.** Preparare messaggi di salvataggio ed errore.

**Verifica:** la personalizzazione è interamente raggiungibile dalle Impostazioni dell'app.

## Fase 15 — Widget Android visivo

**Passaggio 74.** Preparare una risorsa visiva nativa Android conforme alle capacità del sistema widget utilizzato.

**Passaggio 75.** Riprodurre contenitore blu notte, header e griglia interna 2 × 2.

**Passaggio 76.** Disegnare il quadrante Bilancio e i cinque stati previsti.

**Passaggio 77.** Disegnare i tre quadranti personalizzabili.

**Passaggio 78.** Prevedere il contatore per ciascuna scorciatoia.

**Passaggio 79.** Consentire ripetuti tocchi senza bloccare il riquadro.

**Passaggio 80.** Realizzare la variante visiva con conteggi pending e totale complessivo.

**Passaggio 81.** Testare le dimensioni su launcher Android differenti.

**Verifica:** importi e descrizioni finanziarie non devono comparire sulla Home Android.

## Fase 16 — Stati e rifiniture

**Passaggio 82.** Implementare loading, empty, error, success e pending con componenti condivisi.

**Passaggio 83.** Verificare che i messaggi usino sempre lo stesso vocabolario.

**Passaggio 84.** Testare il contrasto effettivo dei testi.

**Passaggio 85.** Testare ingrandimento del testo e TalkBack.

**Passaggio 86.** Verificare il comportamento con tastiera e insets Android.

**Passaggio 87.** Testare l'intero percorso dall'aggiunta della spesa alla sua comparsa in Movimenti e Analisi.

---

# 28. Checklist di collaudo UX

La seguente checklist definisce i comportamenti da verificare prima dell'approvazione del design.

| ID | Scenario | Esito atteso |
|---|---|---|
| UX-01 | Apertura Home | Mostra settimana corrente |
| UX-02 | Incasso assente | Bilancio Da completare |
| UX-03 | Incasso pari a zero registrato | Mostra € 0,00 |
| UX-04 | Tocco sul + | Bottom sheet sovrapposto |
| UX-05 | Apertura Nuova spesa | Data predefinita oggi |
| UX-06 | Inserimento importo invalido | Errore sotto il campo |
| UX-07 | Ricerca per descrizione | Filtra i movimenti |
| UX-08 | Filtro categoria | Filtra senza duplicare la ricerca |
| UX-09 | Tocco su un movimento | Apre dettaglio dedicato |
| UX-10 | Modifica di una spesa | Aggiorna dettaglio e lista |
| UX-11 | Apertura Analisi | Controllo Giorno/Settimana visibile |
| UX-12 | Apertura mini calendario | Mostra direttamente calendario |
| UX-13 | Selezione settimana | Fascia champagne uniforme |
| UX-14 | Selezione giorno | Giorno distinguibile |
| UX-15 | Cambio modalità Analisi | Conserva data |
| UX-16 | Giorno senza movimenti | Stato vuoto corretto |
| UX-17 | Giorno con cinque spese | Mostra le tre più alte |
| UX-18 | Grafico Spese | Importi sempre visibili |
| UX-19 | Tocco su barra | Aggiorna settimana |
| UX-20 | Bilancio negativo | Barra sotto zero |
| UX-21 | Bilancio incompleto | Nessuna falsa barra a zero |
| UX-22 | Widget normale | Quattro quadranti leggibili |
| UX-23 | Widget con tre pending | Contatore 3, tile attivo |
| UX-24 | Nuovo tocco sullo stesso tile | Contatore aumenta |
| UX-25 | Cambio categoria nel configuratore | Importo e descrizione conservati |
| UX-26 | Widget sulla schermata Home | Nessun importo visibile |
| UX-27 | Settimana cambiata senza aggiornamento | Stato non presentato come attuale |
| UX-28 | Testo Android ingrandito | Contenuti ancora leggibili |

---

# 29. Schermi e dispositivi da usare per i test

Testare almeno:

**Telefono stretto:** larghezza logica vicina a 360 dp.

**Telefono standard:** larghezza logica intorno a 393–412 dp.

**Telefono più grande:** larghezza superiore a 430 dp.

Testare inoltre:

- Modalità caratteri aumentati.
- Tastiera aperta.
- Navigazione tramite gesture.
- Navigazione Android a tre pulsanti.
- Testo e importi lunghi.
- Widget su almeno due launcher, se disponibili.
- Widget in stato normale, incompleto, negativo e pending.
- Settimane a cavallo del mese e dell'anno.

Le misure progettuali vanno adattate ai risultati del test; non bisogna deformare i contenuti per forzarli all'interno di un layout statico.

---

# 30. Aspetti da mantenere fuori dal design attuale

Non introdurre senza una nuova decisione di prodotto:

- Incassi giornalieri.
- Bilancio netto giornaliero.
- Connessione Fineco visibile come attiva.
- Importazioni bancarie simulate come dati reali.
- Funzioni di analisi per categorie non approvate.
- Confronti automatici giorno precedente.
- Dashboard eccessivamente complesse.
- Pubblicità o elementi promozionali.
- Backup o ripristino presentati come disponibili.
- Autorizzazioni biometriche presentate come già supportate.
- Pulsanti di cancellazione dei movimenti senza definizione del relativo flusso.

Il principio da mantenere è: **non aggiungere un elemento soltanto perché tecnicamente possibile**.

---

# 31. Registro decisioni

| Area | Decisione | Stato |
|---|---|---|
| Brand | Blu notte/champagne, logo SpeseProfit | Confermato |
| Barra inferiore | Cinque colonne, + integrato | Confermato |
| Home | Solo settimana corrente | Confermato |
| Movimenti | Ricerca, filtro, elenco e dettaglio | Confermato |
| Spese | Inserimento manuale | Confermato |
| Incassi | Totale settimanale sostitutivo | Confermato |
| Analisi | Due modalità Giorno/Settimana | Confermato |
| Analisi Giorno | Spese, conteggio, top tre | Confermato |
| Analisi Settimana | Entrate, spese, bilancio, grafico | Confermato |
| Calendario | Mini calendario e fascia uniforme | Confermato |
| Grafico | Barre selezionabili, importi visibili | Confermato |
| Widget | Quattro quadranti, layout 2 × 2 | Confermato |
| Widget | Bilancio senza importi | Confermato |
| Widget | Tre scorciatoie configurabili | Confermato |
| Widget | Categoria o spesa frequente | Confermato |
| Widget | Riutilizzo durante pending | Confermato |
| Widget | Contatore pending | Confermato |
| Configurazione | Dall'interno dell'app | Confermato |
| Configurazione | Conservare importo/descrizione | Confermato |
| Font e dimensioni esatte | Roboto e scala qui definita | Proposto |
| Altezza e raggi definitivi | Token di questa specifica | Proposto |
| Editing incasso storico | Azione contestuale in Analisi | Da definire |
| Categoria widget priva di importo | Inserimento minimo prima del pending | Da approvare |
| Eliminazione delle spese | Flusso con conferma | Da definire |

---

# 32. Criterio di completamento del design

Il design di SpeseProfit può essere considerato pronto per l'implementazione quando:

1. Le schermate principali condividono realmente colori, font, spaziature e componenti.
2. Tutte le interazioni hanno una destinazione chiara.
3. Stati mancanti e incompleti non producono dati fuorvianti.
4. Il widget protegge i dati sensibili e rende comprensibile lo stato pending.
5. Le schermate rimangono utilizzabili su dispositivi Android di varie dimensioni.
6. La checklist UX è stata provata con dati realistici ma non sensibili.
7. I comportamenti indicati come Da definire sono risolti prima di essere implementati.
8. È stato raccolto almeno un feedback esterno su leggibilità e chiarezza delle interazioni.

---

# 33. Sintesi finale del progetto

SpeseProfit deve apparire come un'app finanziaria personale sobria, elegante e immediata.

**Home** comunica il risultato della settimana corrente.

**Movimenti** consente di cercare, filtrare, consultare e modificare le spese manuali.

**Il pulsante +** offre un accesso rapido all'inserimento di spese e incasso settimanale.

**Analisi** permette di passare dalla vista dettagliata di un singolo giorno alla visione complessiva delle settimane.

**Impostazioni** raccoglie sicurezza, informazioni e personalizzazione del widget.

**Il widget Android** mostra lo stato del bilancio senza importi e offre tre scorciatoie riutilizzabili, con contatori delle spese in attesa.

L'obiettivo finale non è visualizzare il maggior numero possibile di dati, ma permettere all'utente di comprendere rapidamente la propria situazione e registrare le spese con il minimo sforzo.

**Fine del documento — SP-DS-001, revisione 1.0.**
