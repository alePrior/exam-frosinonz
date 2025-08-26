# luglio 2025

Ciao Francesca e Filippo, vedo che il progetto inizia a prendere corpo. Provo quindi a segnalarvi un po' di cose che, secondo me, sarebbe meglio sistemare o considerare.

I menu, o caselle di selezione, possono effettivamente aiutare a compiere qualche sorta di filtraggio dei dati, ad esempio per anno o periodi "storici", o anche solo a modificare la visualizzazione... tenendo comunque conto che sarebbe utile scegliere anche fra "temi grafici" che aiutino a mettere in evidenza aspetti diversi. Tecnicamente, i controlli (menu, caselle di selezione, ecc,) potreste farli in HTML usando le istruzioni di p5.js che permettono di aggiungere e controllare gli elementi della pagina [https://p5js.org/reference/#DOM]. Visto che controllarne lo stile grafico potrebbe essere un po' complicato, senza conoscere bene il linguaggio dei CSS, vi consiglio di usare una delle librerie per p5.js [https://p5js.org/libraries/directory/#ui].

- interfaccia con menu e caselle di selezione (considerare temi grafici x i vari aspetti)
- interfaccia possibile con HTML, CSS o p5js

to do:
- ✅ menu laterale
- menu con temi grafici
- filtri (vedere API per sapere i filtri)

Il fatto che i nomi abbiano dimensioni proporzionali alla quantità di ascolti è apprezzabile, ma i nomi illeggibili sarebbero sempre da evitare. Potreste stabilire una dimensione minima dei font sotto la quale non andare o potreste usare un font piccolo, ma leggibile, per tutti... tanto ci sono già le dimensioni dei cerchi a indicare le proporzioni degli ascolti. Anche se non è il massimo, i nomi degli artisti, per evitare che escano da un cerchio eventualmente troppo piccolo, potrebbero andare a capo. Al limite, effetto finale permettendo, i "nodi" potrebbe avere una forma rettangolare orizzontale, con lo stesso rapporto larghezza/altezza, ma sempre di dimensioni diverse. Oppure potrebbe essere solo la larghezza a cambiare, ma temo il rischio dell'effetto Shanghai (inteso come gioco).

- ottimizzare font su nomi artisti

to do:
- ✅ nomi artisti sotto bolle
- ✅ num ascolti dentro le bolle
- ✅ dimensioni font uguali

Quando si seleziona un nuovo artista, eviterei di lasciare i collegamenti dell'artista precedente. Mi sembra che si crei solo più confusione ma, se c'è una motivazione che non ho colto, è meglio prevedere la possibilità di azzerare la visualizzazione di tutte le relazioni. Forse ha senso permettere di approfondire le sotto-relazioni ma potrebbe essere comunque utile azzerare le connessioni precedenti almeno quando si clicca su un artista che non è collegato a quello precedente. Oppure, alla selezione di un artista, si potrebbero far sparire direttamente tutti i nodi non connessi, in modo da costringere a cliccare comunque su un artista collegato, in questo modo si eviterebbe anche di avere di mezzo elementi che non riguardano più l'approfondimento che si sta facendo. Poi si dovrebbe avere lo stesso la possibilità di tornare alla situazione iniziale. Sarebbe interessante far capire anche il tipo di relazione che lega gli altri artisti a quello selezionato. Mi viene in mente la visualizzazione di una parola chiave sulle linee viola ma non so se è così facile... avere sempre delle parole chiave tanto esplicative.

- interfaccia con collegamenti e azzeramento

to do:
- ✅ clic su un artista -> mostra i suoi collegamenti, nascondi gli altri artisti di default (bolle grigie)
- ✅ possibilità di ritornare alla visualizzazione iniziale (comando nel menù laterale)
- ✅ clic su un artista -> nascondi/preserva collegamenti precedenti (comando nel menù laterale)

Inizierei anche a pensare un po' all'interfaccia generale, giusto per tenere conto di quello che dovrà essere presente nella schermata, compreso il link alla relazione di progetto. Per semplificarvi un po' la vita con la programmazione, potreste prendere in considerazione la possibilità di suddividere il codice in più file [https://codesthesia.net/pagg/concetti/suddividere-il-codice/]. Il codice di sketch.js potrebbe fare solo da "regista" complessivo mentre i singoli file potrebbero contenere classi o gruppi di funzioni dello stesso tipo.

- suddivisione del codice in più file

# 26 agosto 2025

Ciao Francesca (e Filippo), mi sembra che la modalità "Isolamento" sia più chiara ma va bene anche la possibilità di scegliere quella "Cumulativa". Forse userei termini diversi perché non sono così intuitivi. Soprattutto "Isolamento" ci ho messo un po' a capire a cosa si riferiva, prima di leggere la spiegazione del commento. Forse è meglio qualcosa come "Parziale", "Solo corrente", ecc., oppure il pulsante potrebbe diventare una checkbox (o qualcosa di simile) che attiva o disattiva l'accumulazione delle correlazioni.
- TODO:
  - Valutare la sostituzione dei termini "Isolamento" e "Cumulativa" con nomi più intuitivi (es. "Parziale", "Solo corrente", ecc.)
  - Considerare la trasformazione del pulsante in una checkbox o altro controllo che attivi/disattivi l'accumulazione delle correlazioni

Fra l'altro, la selezione della modalità non sembra funzionare perché non si ha nessun feedback visivo nella mappa. Ovviamente non ha senso aggiungere artisti a caso se si passa da "Isolamento" a "Cumulativo" ma si potrebbero togliere gli artisti precedenti nel passaggio contrario. Anche nel primo caso bisognerebbe prevedere comunque un feedback minimo, ad esempio qualche variante grafica che tenga conto della possibile compresenza di molti elementi grafici sovrapposti.      
- TODO:
  - Implementare un feedback visivo nella mappa quando si cambia modalità
  - Gestire la rimozione degli artisti precedenti quando si passa da "Cumulativo" a "Isolamento"
  - Prevedere una variante grafica che segnali la compresenza di molti elementi sovrapposti

Per il resto non riesco a esprimermi su molto altro perché vedo che il pulsante "Mostra Artisti Top" e le singole voci sottostanti portano a un "Not found". Potrei solo consigliarvi di rendere attiva l'intera riga di ogni singolo artista anziché la sola area del nome... a meno che non vogliate rendere cliccabili anche gli altri due valori numerici. 
- TODO:
  - ✅ Correggere il problema del "Not found" per il pulsante "Mostra Artisti Top" e le voci degli artisti
  - Rendere cliccabile l'intera riga di ogni artista (o valutare se rendere cliccabili anche i valori numerici)

Visti i tempi, vi consiglierei di iniziare a pensare anche all'interfaccia complessiva. Per non impazzire con la riscrittura del codice, l'interfaccia potrebbe anche essere "disegnata" con Illustrator (o altro software) prima di implementarla concretamente nello sketch. Si potrebbe iniziare a pensare a una grafica e, soprattutto, a una tipografia meno anonima. Anche le gerarchie visive andrebbero riviste perché ora gli elementi più importanti sono i due tasti verde e rosso saturi. La visualizzazione vera e propria diventa importante solo quando si seleziona un artista... ma sempre un po' meno dei pulsanti. Io poi eviterei di mettere elementi secondari in alto a sinistra, il punto in cui noi occidentali iniziamo a leggere i testi e, inconsciamente, anche le immagini... ma questa è forse una considerazione, in parte, soggettiva.
Il progetto dell'interfaccia può essere utile anche per capire cosa ci deve finire dentro, ad esempio il pulsante per l'apertura della relazione di progetto o altro.
- TODO:
  - Progettare l'interfaccia complessiva, anche solo come bozza grafica (es. Illustrator)
  - Scegliere una tipografia più caratterizzante
  - Rivedere le gerarchie visive degli elementi (es. pulsanti vs visualizzazione)
  - Evitare di posizionare elementi secondari in alto a sinistra
  - Definire cosa deve essere presente nell'interfaccia (es. pulsante per la relazione di progetto)

Ho poi notato un ritardo, a volte anche di più secondi, nell'apparizione degli artisti correlati. Da quello che ho visto, sommariamente, nel codice, mi sembra che facciate caricare ogni volta il file JSON. Se le informazioni non cambiano così frequentemente, è meglio caricarle una sola volta in un array che occuperà più spazio in RAM ma permetterà di ottenere più velocemente le informazioni. Al limite si può prevedere un aggiornamento ogni tanto. 
Delle ottimizzazioni sarebbe meglio occuparsi alla fine ma, sempre visti i tempi, potrebbe essere meglio iniziare a pensarci già ora.
> ⚠️ Il preload dei dati rischia di saturare le richieste API bloccando le richieste. Suggerimento: animazione di loading al click di un artista.
- TODO:
  - Ottimizzare il caricamento dei dati: caricare i JSON una sola volta e memorizzarli in un array
  - Prevedere un meccanismo di aggiornamento periodico dei dati se necessario
  - Iniziare a pianificare le ottimizzazioni delle performance

PS: Le scadenze per le consegne le ho segnalate poco fa sul canale Teams del corso... rimanendo un po' stupito anch'io di quanto siano ravvicinate.