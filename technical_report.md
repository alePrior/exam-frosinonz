# ArtistScope - Report Tecnico

## Panoramica
ArtistScope è un'applicazione web interattiva che visualizza gli artisti più ascoltati su Last.fm e le loro connessioni. Il progetto utilizza la libreria p5.js per creare una visualizzazione dinamica e interattiva dei dati musicali.

## Struttura del Progetto

### File Principali
- `index.html`: Layout principale e gestione UI/UX
- `sketch.js`: Logica principale dell'applicazione e visualizzazione
- `seo_img.jpg`: Immagine per SEO e condivisione social

### Tecnologie Utilizzate
- p5.js per la visualizzazione e l'interattività
- Last.fm API per i dati musicali
- LocalStorage per la persistenza delle preferenze utente
- HTML5/CSS3 per layout e stile

## Componenti Principali

### Visualizzazione Dati
- Sistema di bolle interattive che rappresentano gli artisti
- Dimensione delle bolle proporzionale al numero di ascolti
- Connessioni visuali tra artisti simili
- Animazioni fluide per transizioni e interazioni

### Classi Principali
1. `Bubble`: Gestisce la visualizzazione e il comportamento delle bolle degli artisti
   - Collisioni fisiche
   - Animazioni di stato
   - Visualizzazione dei dati

2. `HeaderButtons`: Gestisce i controlli principali dell'interfaccia
   - Filtro per tag musicali
   - Navigazione tra viste

3. `ModeButton`: Gestisce la modalità di visualizzazione
   - Modalità isolamento
   - Modalità cumulativa

### Interattività
- Hover su bolle per informazioni dettagliate
- Click per esplorare artisti simili
- Sistema di filtri per genere musicale
- Modalità di visualizzazione switchabile

## Caratteristiche Tecniche

### API Integration
```javascript
const api_key = "262eda05c5e0a4265750d3cfb1611332";
```
Integrazione con tre endpoint principali di Last.fm:
- chart.getTopArtists
- tag.getTopTags
- artist.getSimilar

### Gestione Stati
- Persistenza dello stato del popup tramite LocalStorage
- Gestione dinamica delle connessioni tra artisti
- Sistema di cache per evitare richieste API duplicate

### Performance
- Ottimizzazione delle collisioni tra bolle
- Gestione efficiente delle animazioni
- Limitazione del numero di artisti simili visualizzati

### UI/UX
- Design responsivo
- Feedback visivo per le interazioni
- Sistema di guida utente integrato
- Animazioni fluide per migliorare l'esperienza

## Modalità di Visualizzazione

### Modalità Isolamento (Default)
- Mostra solo l'artista selezionato e i suoi collegamenti
- Focus sulla scoperta di artisti simili specifici

### Modalità Cumulativa
- Mantiene visibili tutti gli artisti esplorati
- Permette di scoprire connessioni tra diversi gruppi di artisti

## Gestione Dati

### Struttura Dati Artista
```javascript
{
  name: string,
  playcount: number,
  similarArtistsFetched: boolean,
  isLoading: boolean,
  isClicked: boolean
}
```

### Ottimizzazioni
- Caching dei dati degli artisti
- Limitazione del numero di artisti simili (max 5)
- Gestione asincrona delle richieste API

## Considerazioni sulla Sicurezza
- API key esposta (considerare l'uso di un proxy server in produzione)
- Validazione dei dati in ingresso
- Sanitizzazione dell'output HTML

## Possibili Miglioramenti Futuri
1. Implementazione di un backend per gestire le API key
2. Sistema di caching più robusto
3. Supporto per più servizi di streaming
4. Modalità offline con dati cachati
5. Esportazione delle connessioni scoperte
