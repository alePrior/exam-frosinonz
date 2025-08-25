# World Music Map - Progetto d'Esame
## Panoramica del Progetto

Questo progetto è un'applicazione web interattiva che visualizza artisti musicali e le loro connessioni utilizzando l'API di Last.fm. L'applicazione crea una rappresentazione visiva dinamica della scena musicale mondiale, permettendo agli utenti di esplorare le relazioni tra diversi artisti.

## Struttura dell'Applicazione

L'applicazione è strutturata in tre componenti principali:

1. **Interfaccia Utente**
   - Una visualizzazione principale con bolle interattive che rappresentano gli artisti
   - Un menu laterale con controlli e informazioni sui tag musicali
   - Un sistema di tooltip per mostrare informazioni dettagliate sugli artisti

2. **Modalità di Visualizzazione**
   - **Modalità Isolamento**: Mostra solo l'artista selezionato e i suoi artisti simili
   - **Modalità Cumulativa**: Permette di esplorare più artisti e le loro connessioni contemporaneamente

3. **Visualizzazione dei Dati**
   - Le dimensioni delle bolle rappresentano la popolarità dell'artista (numero di ascolti)
   - Le linee di connessione mostrano le relazioni tra artisti simili
   - I colori differenziano gli artisti principali da quelli correlati

## Integrazione con Last.fm API

L'applicazione utilizza diverse chiamate API di Last.fm per ottenere i dati necessari:

1. **Chart.getTopArtists**
   - Scopo: Ottenere la lista degli artisti più popolari
   - Dati restituiti: Nome artista e numero di ascolti
   - Utilizzo: Visualizzazione iniziale della mappa

2. **Tag.getTopTags**
   - Scopo: Recuperare i tag musicali più popolari
   - Dati restituiti: Nome del tag, conteggio e portata
   - Utilizzo: Menu laterale per il filtraggio degli artisti

3. **Artist.getSimilar**
   - Scopo: Trovare artisti simili a quello selezionato
   - Dati restituiti: Lista di artisti correlati
   - Utilizzo: Creazione delle connessioni tra artisti

4. **Artist.getInfo**
   - Scopo: Ottenere informazioni dettagliate su un artista
   - Dati restituiti: Statistiche dell'artista, incluso il numero di ascolti
   - Utilizzo: Popolamento dei tooltip e dimensionamento delle bolle

## Funzionalità Principali

1. **Esplorazione Interattiva**
   - Click su un artista per vedere artisti simili
   - Hover per visualizzare informazioni dettagliate
   - Animazioni fluide per una migliore esperienza utente

2. **Filtraggio per Tag**
   - Selezione di generi musicali specifici
   - Visualizzazione degli artisti più popolari per ogni tag
   - Aggiornamento dinamico della visualizzazione

3. **Gestione della Visualizzazione**
   - Switch tra modalità isolamento e cumulativa
   - Reset della visualizzazione
   - Adattamento automatico alle dimensioni dello schermo

## Aspetti Innovativi del Progetto

1. **Visualizzazione Dinamica**
   - Le bolle si muovono e interagiscono tra loro
   - Sistema di collisioni per evitare sovrapposizioni
   - Animazioni fluide per una migliore comprensione delle relazioni

2. **Design Responsivo**
   - Adattamento automatico alle dimensioni dello schermo
   - Layout ottimizzato per diverse risoluzioni
   - Interfaccia intuitiva e user-friendly

3. **Gestione Dati in Tempo Reale**
   - Caricamento asincrono dei dati
   - Aggiornamento dinamico delle visualizzazioni
   - Gestione efficiente delle richieste API

## Conclusioni

Questo progetto dimostra un'implementazione efficace di:
- Integrazione con API esterne (Last.fm)
- Visualizzazione interattiva di dati complessi
- Interfaccia utente intuitiva e responsive
- Gestione dinamica delle relazioni tra artisti musicali

L'applicazione offre un modo innovativo per esplorare e comprendere le connessioni nel mondo della musica, rendendo accessibili e visivamente accattivanti i dati forniti da Last.fm.
