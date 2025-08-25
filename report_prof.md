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
- possibilità di ritornare alla visualizzazione iniziale (comando nel menù laterale)
- ✅ clic su un artista -> nascondi/preserva collegamenti precedenti (comando nel menù laterale)

Inizierei anche a pensare un po' all'interfaccia generale, giusto per tenere conto di quello che dovrà essere presente nella schermata, compreso il link alla relazione di progetto. Per semplificarvi un po' la vita con la programmazione, potreste prendere in considerazione la possibilità di suddividere il codice in più file [https://codesthesia.net/pagg/concetti/suddividere-il-codice/]. Il codice di sketch.js potrebbe fare solo da "regista" complessivo mentre i singoli file potrebbero contenere classi o gruppi di funzioni dello stesso tipo.

- suddivisione del codice in più file