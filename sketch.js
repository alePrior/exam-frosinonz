const api_key = "262eda05c5e0a4265750d3cfb1611332";
const api_chart_gettopartists = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${api_key}&format=json`;
const api_tag_gettoptags = `https://ws.audioscrobbler.com/2.0/?method=tag.getTopTags&api_key=${api_key}&format=json`;

// Function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

let bubbles = [];
let topTags = [];
let artists = [];
let hoveredBubble = null;
let lastClickedBubble = null;
let connections = [];
let isIsolationMode = true; // true = isolation mode (default), false = cumulative mode
let hasFirstClick = false;

class Connection {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

     show() {
     stroke('#fff'); // White color for connections
     strokeWeight(2);
     line(this.source.x, this.source.y, this.target.x, this.target.y);
   }
}

// Funzione per formattare il numero di ascolti
function formatPlayCount(count) {
  if (count >= 1000000) {
    return Math.round(count / 1000000) + 'M';
  } else if (count >= 1000) {
    return Math.round(count / 1000) + 'K';
  }
  return count.toString();
}

class Bubble {
  constructor(x, y, r, name, playcount, isSimilar = false, parentBubble = null) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.name = name;
    this.playcount = playcount;
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.isSimilar = isSimilar;
    this.parentBubble = parentBubble;
         this.similarArtistsFetched = false; // Track if we've already fetched similar artists
     this.isLoading = false; // Track if we're loading
     this.loadingAngle = 0; // Track the loading angle
     this.isClicked = false; // Track if this bubble has been clicked
  }

  collide(other) {
    let dx = other.x - this.x;
    let dy = other.y - this.y;
    let distance = sqrt(dx * dx + dy * dy);
    let minDist = this.r + other.r;

    if (distance < minDist) {
      let angle = atan2(dy, dx);
      let targetX = this.x + cos(angle) * minDist;
      let targetY = this.y + sin(angle) * minDist;
      
      let ax = (targetX - other.x) * 0.05;
      let ay = (targetY - other.y) * 0.05;
      
      this.vx -= ax;
      this.vy -= ay;
      other.vx += ax;
      other.vy += ay;
    }
  }

  checkButtonCollision() {
    // Check collision with header buttons
    const headerButtonHeight = 50;
    if (this.y - this.r < headerButtonHeight) {
      this.y = headerButtonHeight + this.r;
      this.vy *= -0.8;
    }

    // Check collision with mode button
    const modeBtn = modeButton.getPosition();
    const modeBtnWidth = modeButton.width;
    const modeBtnHeight = modeButton.height;

    // Calculate the closest point on the button to the circle
    const closestX = constrain(this.x, modeBtn.x, modeBtn.x + modeBtnWidth);
    const closestY = constrain(this.y, modeBtn.y, modeBtn.y + modeBtnHeight);

    // Calculate the distance between the circle's center and the closest point
    const distanceX = this.x - closestX;
    const distanceY = this.y - closestY;
    const distance = sqrt(distanceX * distanceX + distanceY * distanceY);

    // If the distance is less than the circle's radius, there is a collision
    if (distance < this.r) {
      // Calculate the normal vector
      const nx = distanceX / distance;
      const ny = distanceY / distance;

      // Move the circle out of the button
      this.x = closestX + nx * this.r;
      this.y = closestY + ny * this.r;

      // Reflect the velocity vector
      const dotProduct = this.vx * nx + this.vy * ny;
      this.vx = (this.vx - 2 * dotProduct * nx) * 0.8;
      this.vy = (this.vy - 2 * dotProduct * ny) * 0.8;
    }
  }

  update(isHovered = false) {
    if (!isHovered) { // Only update movement if not hovered
      // Add uniform circular movement
      const angle = atan2(this.vy, this.vx);
      const newAngle = angle; // Leggera rotazione costante (aggiungi + 0.01 se la si vuole)
      const currentSpeed = sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = cos(newAngle) * currentSpeed;
      this.vy = sin(newAngle) * currentSpeed;

      // Enforce minimum velocity
      const minSpeed = 0.2;
      const speed = sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed < minSpeed) {
        this.vx = (this.vx / speed) * minSpeed;
        this.vy = (this.vy / speed) * minSpeed;
      }

      // Enforce maximum velocity
      const maxSpeed = 2;
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Bounce off walls
      if (this.x - this.r < 0 || this.x + this.r > width) {
        this.vx *= -0.8;
      }
      if (this.y - this.r < 0 || this.y + this.r > height) {
        this.vy *= -0.8;
      }

      // Keep inside canvas
      this.x = constrain(this.x, this.r, width - this.r);
      this.y = constrain(this.y, this.r, height - this.r);

      // Check collision with buttons
      this.checkButtonCollision();

      // Add gentle friction
      this.vx *= 0.995;
      this.vy *= 0.995;
    } else {
      // When hovered, gradually reduce velocity to zero
      this.vx *= 0.7;
      this.vy *= 0.7;
    }
  }

  contains(px, py) {
    let d = dist(px, py, this.x, this.y);
    return d < this.r;
  }



         show(isHighlighted = false) {
      push(); // Salva lo stato corrente
      
      // Aggiungiamo l'effetto ombra
      drawingContext.shadowBlur = 15;
      drawingContext.shadowColor = 'rgba(0, 0, 0, 0.5)';
      drawingContext.shadowOffsetX = 5;
      drawingContext.shadowOffsetY = 5;
      
      if (this.isClicked) {
        // Gradient per tutti gli artisti che sono stati cliccati
        stroke(255);
        strokeWeight(2);
        // Ensure coordinates are valid numbers
        const startX = isFinite(this.x) ? this.x : 0;
        const startY = isFinite(this.y - this.r) ? this.y - this.r : 0;
        const endX = isFinite(this.x) ? this.x : 0;
        const endY = isFinite(this.y + this.r) ? this.y + this.r : 0;
        
        const gradient = drawingContext.createLinearGradient(
          startX, startY,     // Punto di inizio (alto)
          endX, endY      // Punto di fine (basso)
        );
        
        // Aggiungiamo i colori del gradiente viola-rosa
        gradient.addColorStop(0, '#D48CC8');    // Rosa chiaro in alto
        gradient.addColorStop(1, '#7B1B7A');    // Viola scuro in basso
        
        drawingContext.fillStyle = gradient;
     } else {
       // Creiamo il gradiente per le bolle normali
       noStroke();
       // Ensure coordinates are valid numbers
       const startX = isFinite(this.x) ? this.x : 0;
       const startY = isFinite(this.y - this.r) ? this.y - this.r : 0;
       const endX = isFinite(this.x) ? this.x : 0;
       const endY = isFinite(this.y + this.r) ? this.y + this.r : 0;
       
       const gradient = drawingContext.createLinearGradient(
         startX, startY,     // Punto di inizio (alto)
         endX, endY      // Punto di fine (basso)
       );
       
       // Aggiungiamo i colori del gradiente
       gradient.addColorStop(0, '#4ADBB2');    // Verde acqua in alto
       gradient.addColorStop(1, '#1E8B99');    // Blu più scuro in basso
       
       drawingContext.fillStyle = gradient;
     }
     
           ellipse(this.x, this.y, this.r * 2);
      
      // Rimuoviamo l'ombra per il resto degli elementi
      drawingContext.shadowBlur = 0;
      drawingContext.shadowOffsetX = 0;
      drawingContext.shadowOffsetY = 0;
      
      pop(); // Ripristina lo stato precedente
    
    // Draw loading animation if needed
    if (this.isLoading) {
      push();
      translate(this.x, this.y);
      noFill();
      stroke(255);
      strokeWeight(3);
      strokeCap(SQUARE);
      
      // Draw rotating arc
      arc(0, 0, this.r * 2 + 10, this.r * 2 + 10, 
          this.loadingAngle, this.loadingAngle + HALF_PI);
      
      // Update loading angle
      this.loadingAngle += 0.1;
      pop();
    }
    
     // Draw play count inside bubble
     noStroke(); // Assicurati che non ci sia stroke per il testo
     fill(255); // White text
     textAlign(CENTER, CENTER);
     textSize(11);
     text(formatPlayCount(parseInt(this.playcount)), this.x, this.y);
     
     // Draw artist name below bubble
     noStroke(); // Assicurati che non ci sia stroke per il testo
     fill(255); // White text
     textAlign(CENTER, TOP);
     textSize(14);
     text(this.name, this.x, this.y + this.r + 5);
  }

  showTooltip() {
    const tooltipPadding = 10;
    const tooltipHeight = 60;
    const tooltipWidth = textWidth(this.name) + tooltipPadding * 2 + 100;
    
    // Position tooltip above the bubble
    let tooltipX = this.x;
    let tooltipY = this.y - this.r - tooltipHeight/2;
    
    // Keep tooltip inside canvas
    tooltipX = constrain(tooltipX, tooltipWidth/2, width - tooltipWidth/2);
    tooltipY = constrain(tooltipY, tooltipHeight, height - tooltipHeight);

    // Draw tooltip shadow
    fill(0, 20);
    noStroke();
    rect(tooltipX - tooltipWidth/2 + 2, tooltipY - tooltipHeight/2 + 2, 
         tooltipWidth, tooltipHeight, 5);

    // Draw tooltip background
    fill(255, 250);
    stroke(200);
    rect(tooltipX - tooltipWidth/2, tooltipY - tooltipHeight/2, 
         tooltipWidth, tooltipHeight, 5);

    // Draw text
    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(this.name, tooltipX, tooltipY - 10);
    
    // Draw playcount
    textSize(12);
    text(`Plays: ${parseInt(this.playcount).toLocaleString()}`, 
         tooltipX, tooltipY + 10);
  }
}

async function fetchSimilarArtists(artistName, parentBubble) {
  const api_url = `https://ws.audioscrobbler.com/2.0/?method=artist.getSimilar&artist=${encodeURIComponent(artistName)}&api_key=${api_key}&format=json`;
  
  try {
    const response = await fetch(api_url);
    const data = await response.json();
    
    if (data.similarartists && data.similarartists.artist) {
      // Take only the first 5 similar artists to avoid overcrowding
      const similarArtists = data.similarartists.artist.slice(0, 5);
      
      // Get all playcounts first to find the max for scaling
      const similarArtistsInfo = [];
      for (const artist of similarArtists) {
        const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(artist.name)}&api_key=${api_key}&format=json`;
        try {
          const infoResponse = await fetch(infoUrl);
          const infoData = await infoResponse.json();
          const playcount = parseInt(infoData.artist?.stats?.playcount || 0);
          similarArtistsInfo.push({ ...artist, playcount });
        } catch (infoError) {
          console.error('Error fetching artist info:', infoError);
          similarArtistsInfo.push({ ...artist, playcount: 0 });
        }
      }

      // Find max playcount among similar artists
      const maxPlaycount = Math.max(...similarArtistsInfo.map(a => a.playcount));

      // Create bubbles with scaled radius or connect to existing ones
      for (const artist of similarArtistsInfo) {
        // Check if this artist already exists
        const existingBubble = bubbles.find(b => b.name === artist.name);
        
                 if (existingBubble) {
           // Se l'artista esiste già
           // Prima creiamo la connessione con l'artista parent se non esiste
           const connectionWithParentExists = connections.some(
             c => (c.source === parentBubble && c.target === existingBubble) ||
                  (c.source === existingBubble && c.target === parentBubble)
           );
           if (!connectionWithParentExists) {
             connections.push(new Connection(parentBubble, existingBubble));
           }

           // Poi controlliamo le connessioni con gli altri artisti simili di questo gruppo
           similarArtistsInfo.forEach(otherArtist => {
             const otherBubble = bubbles.find(b => b.name === otherArtist.name);
             if (otherBubble && otherBubble !== existingBubble) {
               const connectionExists = connections.some(
                 c => (c.source === existingBubble && c.target === otherBubble) ||
                      (c.source === otherBubble && c.target === existingBubble)
               );
               if (!connectionExists) {
                 connections.push(new Connection(existingBubble, otherBubble));
               }
             }
           });
         } else {
          // Create new bubble if doesn't exist
          const radius = map(artist.playcount, 0, maxPlaycount, 20, 60);
          const angle = random(TWO_PI);
          const distance = parentBubble.r + radius + 50;
          const x = parentBubble.x + cos(angle) * distance;
          const y = parentBubble.y + sin(angle) * distance;
          
          const newBubble = new Bubble(x, y, radius, artist.name, artist.playcount, true, parentBubble);
          bubbles.push(newBubble);
          connections.push(new Connection(parentBubble, newBubble));
        }
      }
    }
  } catch (error) {
    console.error('Error fetching similar artists:', error);
  }
}

async function fetchTopTags() {
  try {
    const response = await fetch(api_tag_gettoptags);
    const data = await response.json();
    topTags = data.toptags.tag;
  } catch (error) {
    console.error('Error fetching top tags:', error);
  }
}

async function fetchArtistInfo(artistName) {
  try {
    const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=${encodeURIComponent(artistName)}&api_key=${api_key}&format=json`;
    const response = await fetch(infoUrl);
    const data = await response.json();
    return data.artist?.stats?.playcount || "0";
  } catch (error) {
    console.error('Error fetching artist info:', error);
    return "0";
  }
}

async function fetchArtists() {
  try {
    const tagParam = getUrlParameter('tag');
    // Update title based on tag parameter
    currentViewTitle = tagParam ? `Top artisti con tag ${tagParam}` : "Top artisti ascoltati";
    let apiUrl;
    
    if (tagParam) {
      // If tag parameter exists, use tag.getTopArtists
      apiUrl = `https://ws.audioscrobbler.com/2.0/?method=tag.getTopArtists&tag=${encodeURIComponent(tagParam)}&api_key=${api_key}&format=json`;
    } else {
      // Otherwise use chart.getTopArtists
      apiUrl = api_chart_gettopartists;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();
    
    // Handle different response structures
    if (tagParam) {
      const tagArtists = data.topartists.artist;
      // We need to fetch playcount for each artist when using tag.getTopArtists
      artists = await Promise.all(
        tagArtists.map(async (artist) => {
          const playcount = await fetchArtistInfo(artist.name);
          return {
            ...artist,
            playcount: playcount
          };
        })
      );
    } else {
      artists = data.artists.artist;
    }
    
    createBubbles();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function createBubbles() {
  bubbles = []; // Clear existing bubbles
  connections = []; // Clear existing connections
  // Find max playcount for scaling
  const maxPlaycount = Math.max(...artists.map(a => parseInt(a.playcount)));
  
  // Create bubbles for each artist
  artists.forEach(artist => {
    const radius = map(parseInt(artist.playcount), 0, maxPlaycount, 20, 80);
    const x = random(radius, width - radius);
    const y = random(radius, height - radius);
    bubbles.push(new Bubble(x, y, radius, artist.name, artist.playcount));
  });
}

class HeaderButtons {
  constructor() {
    this.buttonHeight = 50; // Height of buttons
    this.buttonWidth = 200; // Width of buttons
    this.buttonMargin = 0; // No margin from viewport edge
    this.isHoveringArtists = false;
    this.isHoveringTags = false;
    this.showTagDropdown = false;
    this.hoveredTagIndex = -1;
    this.dropdownHeight = 300;
    this.dropdownWidth = 200;
    this.caretSize = 8; // Size of the caret indicator
    this.isTagMode = getUrlParameter('tag') !== ''; // Check if we're in tag mode
  }

  formatCount(count) {
    if (count >= 1000000) {
      return Math.round(count / 1000000) + 'M';
    } else if (count >= 1000) {
      return Math.round(count / 1000) + 'K';
    }
    return count.toString();
  }

  checkButtons(px, py) {
    // Tags button bounds (first button)
    this.isHoveringTags = px >= 0 && 
                         px <= this.buttonWidth &&
                         py >= 0 && 
                         py <= this.buttonHeight;

    // Artists button bounds (second button)
    const artistsButtonX = this.buttonWidth + this.buttonMargin;
    this.isHoveringArtists = px >= artistsButtonX && 
                            px <= artistsButtonX + this.buttonWidth &&
                            py >= 0 && 
                            py <= this.buttonHeight;

    // Check dropdown hovering
    this.hoveredTagIndex = -1;
    if (this.showTagDropdown && topTags.length > 0) {
      const dropdownX = 0;
      const dropdownY = this.buttonHeight + 5;
      
      // Aggiorno la larghezza del dropdown per corrispondere al pulsante
      this.dropdownWidth = this.buttonWidth;
      
      if (px >= dropdownX && px <= dropdownX + this.dropdownWidth &&
          py >= dropdownY && py <= dropdownY + this.dropdownHeight) {
        const relativeY = py - dropdownY - 10;
        if (relativeY >= 0) {
          const index = Math.floor(relativeY / 25);
          if (index >= 0 && index < Math.min(Math.floor(this.dropdownHeight / 25), topTags.length)) {
            this.hoveredTagIndex = index;
            return true;
          }
        }
      }
    }

    return this.isHoveringArtists || this.isHoveringTags;
  }

  handleClick(px, py) {
    if (this.isHoveringArtists) {
      // Reset to show top artists
      bubbles = [];
      connections = [];
      hasFirstClick = false;
      lastClickedBubble = null;
      this.showTagDropdown = false;
      window.location.href = window.location.pathname; // Remove query parameters
      return true;
    } else if (this.isHoveringTags) {
      // Toggle tag dropdown
      this.showTagDropdown = !this.showTagDropdown;
      return true;
    } else if (this.showTagDropdown && this.hoveredTagIndex >= 0 && this.hoveredTagIndex < topTags.length) {
      // Handle tag click
      const tag = topTags[this.hoveredTagIndex];
      this.showTagDropdown = false;
      window.location.href = `${window.location.pathname}?tag=${encodeURIComponent(tag.name)}`;
      return true;
    }
    
    // Close dropdown if clicking outside
    if (this.showTagDropdown) {
      this.showTagDropdown = false;
      return true;
    }
    
    return false;
  }

    showButtons() {
     // Tags button (first)
     if (this.isTagMode) {
       // Active state - white background
       fill('#fff');
       noStroke();
       rect(0, 0, this.buttonWidth, this.buttonHeight, 0);
       
       // Black text
       fill(0);
     } else {
       // Inactive state - red background
       fill(this.isHoveringTags ? color(224, 49, 66, 220) : '#e03142');
       noStroke();
       rect(0, 0, this.buttonWidth, this.buttonHeight, 0);
       
       // White text
       fill(255);
     }
     
     // Tags button text
     textAlign(CENTER, CENTER);
     textSize(14);
     textStyle(BOLD);
     text('Top 50 tag', this.buttonWidth/2 - 10, this.buttonHeight/2);
     
     // Draw caret
     const caretX = this.buttonWidth - 20;
     const caretY = this.buttonHeight/2;
     // Caret color matches text color
     if (this.showTagDropdown) {
       // Caret up
       triangle(
         caretX - this.caretSize/2, caretY + this.caretSize/2,
         caretX, caretY - this.caretSize/2,
         caretX + this.caretSize/2, caretY + this.caretSize/2
       );
     } else {
       // Caret down
       triangle(
         caretX - this.caretSize/2, caretY - this.caretSize/2,
         caretX, caretY + this.caretSize/2,
         caretX + this.caretSize/2, caretY - this.caretSize/2
       );
     }

     // Artists button (second)
     const artistsButtonX = this.buttonWidth + this.buttonMargin;
     if (!this.isTagMode) {
       // Active state - white background
       fill('#fff');
       noStroke();
       rect(artistsButtonX, 0, this.buttonWidth, this.buttonHeight, 0);
       
       // Black text
       fill(0);
     } else {
       // Inactive state - red background
       fill(this.isHoveringArtists ? color(224, 49, 66, 220) : '#e03142');
       noStroke();
       rect(artistsButtonX, 0, this.buttonWidth, this.buttonHeight, 0);
       
       // White text
       fill(255);
     }
     
     textStyle(BOLD);
     textSize(14);
     text('Top 50 artisti', artistsButtonX + this.buttonWidth/2, this.buttonHeight/2);
    
    // Draw status text to the right of buttons
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(24);
    textStyle(BOLD);
    text(currentViewTitle, artistsButtonX + this.buttonWidth + 20, this.buttonHeight/2);
  }

  showDropdown() {
    if (this.showTagDropdown && topTags.length > 0) {
      const dropdownX = 0;
      const dropdownY = this.buttonHeight + 5;
      
      // Dropdown shadow
      fill(0, 0, 0, 30);
      noStroke();
      rect(dropdownX + 3, dropdownY + 3, this.dropdownWidth, this.dropdownHeight, 0);
      
      // Dropdown background
      fill(255, 250);
      stroke(220);
      strokeWeight(1);
      rect(dropdownX, dropdownY, this.dropdownWidth, this.dropdownHeight, 0);
      
      // Dropdown items
      const maxItems = Math.min(Math.floor(this.dropdownHeight / 25), topTags.length);
      for (let i = 0; i < maxItems; i++) {
        const tag = topTags[i];
        const itemY = dropdownY + 10 + i * 25;
        
        // Highlight hovered item
        if (i === this.hoveredTagIndex) {
          fill(231, 76, 60, 100);
          noStroke();
          rect(dropdownX, itemY - 10, this.dropdownWidth, 25);
        }
        
        // Tag name
        fill(50);
        textAlign(LEFT, CENTER);
        textSize(12);
        textStyle(NORMAL);
        text(tag.name, dropdownX + 10, itemY);
        
        // Count
        textAlign(RIGHT, CENTER);
        textStyle(BOLD);
        fill(120);
        text(this.formatCount(parseInt(tag.count)), dropdownX + this.dropdownWidth - 10, itemY);
      }
    }
  }
}

class ModeButton {
  constructor() {
    this.width = 200;
    this.height = 50;
    this.margin = 0;
    this.isHovered = false;
    this.labelText = "Apertura multipla";
  }

  getPosition() {
    return {
      x: windowWidth - this.width - this.margin,
      y: windowHeight - this.height - this.margin
    };
  }

  contains(px, py) {
    const pos = this.getPosition();
    return px >= pos.x && px <= pos.x + this.width &&
           py >= pos.y && py <= pos.y + this.height;
  }

  checkHover(px, py) {
    this.isHovered = this.contains(px, py);
    return this.isHovered;
  }

  handleClick(px, py) {
    if (this.contains(px, py)) {
      isIsolationMode = !isIsolationMode;
      return true;
    }
    return false;
  }

  show() {
    const pos = this.getPosition();
    
    // Set button style based on mode
    if (!isIsolationMode) {
      // Active state - red background
      fill(this.isHovered ? color(224, 49, 66, 220) : '#e03142');
      noStroke();
      rect(pos.x, pos.y, this.width, this.height, 0);
      
      // White text
      fill(255);
    } else {
      // Inactive state - semi-transparent white background
      fill(255, 127); // 50% opacity white
      noStroke();
      rect(pos.x, pos.y, this.width, this.height, 0);
      
      // Black text
      fill(0);
    }
    
    // Draw text
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text(this.labelText, pos.x + this.width/2, pos.y + this.height/2);
  }
}

let headerButtons;
let modeButton;
let currentViewTitle = "Top artisti ascoltati";

function setup() {
  // Create canvas the full size of the viewport
  createCanvas(windowWidth, windowHeight);
  // Set font to Titillium Web
  textFont('Titillium Web');
  // Initialize UI components
  headerButtons = new HeaderButtons();
  modeButton = new ModeButton();
  // Initialize window variable for communication with HTML
  window.isIsolationMode = isIsolationMode;
  // Fetch both artists and tags
  fetchTopTags();
  fetchArtists();
}

function mousePressed() {
  // First check if we clicked on the mode button
  if (modeButton.handleClick(mouseX, mouseY)) {
    return; // Click was handled by mode button
  }
  
  // Then check if we clicked on the header buttons
  if (headerButtons.handleClick(mouseX, mouseY)) {
    return; // Click was handled by header buttons
  }
  
  // Check if we clicked on a bubble
  for (let bubble of bubbles) {
    if (bubble.contains(mouseX, mouseY)) {
      // Only fetch similar artists if we haven't already
      if (!bubble.similarArtistsFetched) {
        // Update title
        currentViewTitle = `Artisti simili a ${bubble.name}`;
        
                 // Handle clicks based on mode
         if (isIsolationMode) {
           // In isolation mode, remove all except the clicked bubble
           bubbles = bubbles.filter(b => b === bubble);
           connections = [];
         }
         // In cumulative mode (apertura multipla), keep all bubbles
         hasFirstClick = true;
        
        // Store the current bubbles and connections before fetching
        const currentBubbles = isIsolationMode ? [bubble] : [...bubbles];
        const currentConnections = isIsolationMode ? [] : [...connections];
        
        // Start loading animation
        bubble.isLoading = true;
        
        // After fetching completes, merge with existing if in cumulative mode
        fetchSimilarArtists(bubble.name, bubble).then(() => {
          if (!isIsolationMode && hasFirstClick) {
            // Ensure we don't lose the previous bubbles and connections
            bubbles = [...currentBubbles, ...bubbles.filter(b => !currentBubbles.includes(b))];
            connections = [...currentConnections, ...connections];
          }
          // Stop loading animation
          bubble.isLoading = false;
        });
        
                 bubble.similarArtistsFetched = true; // Mark as fetched
         bubble.isClicked = true; // Mark this bubble as clicked
         lastClickedBubble = bubble; // Update last clicked bubble (manteniamo questo per altre funzionalità)
      }
      break;
    }
  }
}

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (artists.length > 0) {
    createBubbles(); // Recreate bubbles with new canvas dimensions
  }
}

function draw() {
  // Sync isolation mode with window variable
  window.isIsolationMode = isIsolationMode;
  background('#1c2838');
  
  // Check button interactions
  headerButtons.checkButtons(mouseX, mouseY);
  
  // Find connected bubbles if there's a hovered bubble
  let connectedBubbles = new Set();
  if (hoveredBubble) {
    connections.forEach(conn => {
      if (conn.source === hoveredBubble) {
        connectedBubbles.add(conn.target);
      } else if (conn.target === hoveredBubble) {
        connectedBubbles.add(conn.source);
      }
    });
  }

  // Draw connections first so they appear behind bubbles
  for (let connection of connections) {
    // Highlight connections if they involve the hovered bubble
         if (hoveredBubble && 
         (connection.source === hoveredBubble || connection.target === hoveredBubble)) {
       stroke('#D48CC8'); // Rosa chiaro come il gradiente delle bolle cliccate
       strokeWeight(2);
     } else {
       stroke(255); // Bianco pieno per le altre connessioni
       strokeWeight(1);
    }
    line(connection.source.x, connection.source.y, 
         connection.target.x, connection.target.y);
  }
  
  // Update hoveredBubble
  hoveredBubble = null;
  // Check bubbles in reverse order to detect top-most bubble first
  for (let i = bubbles.length - 1; i >= 0; i--) {
    if (bubbles[i].contains(mouseX, mouseY)) {
      hoveredBubble = bubbles[i];
      break;
    }
  }

     // Update and show all bubbles
   for (let i = 0; i < bubbles.length; i++) {
     // Pass whether this bubble is being hovered
     const isHovered = bubbles[i] === hoveredBubble;
     bubbles[i].update(isHovered);
     
     // Check collisions with other bubbles only if not hovered
     if (!isHovered) {
       for (let j = i + 1; j < bubbles.length; j++) {
         bubbles[i].collide(bubbles[j]);
       }
     }
    
    // Determine if this bubble should be highlighted
    const isHighlighted = hoveredBubble && 
                         (bubbles[i] === hoveredBubble || 
                          connectedBubbles.has(bubbles[i]));
    
    bubbles[i].show(isHighlighted);
  }

  // Draw tooltip for hovered bubble
  if (hoveredBubble) {
    hoveredBubble.showTooltip();
    // Show pointer cursor only if we haven't fetched similar artists yet
    cursor(hoveredBubble.similarArtistsFetched ? ARROW : HAND);
  } else {
    // Check if hovering over header buttons
    if (headerButtons.checkButtons(mouseX, mouseY)) {
      cursor(HAND);
    } else {
      cursor(ARROW);
    }
  }
  
  // Draw UI elements on top of everything
  // First the header buttons
  headerButtons.showButtons();
  
  // Then the mode button
  modeButton.checkHover(mouseX, mouseY);
  modeButton.show();
  
  // Finally the dropdown menu
  headerButtons.showDropdown();
  
  // Update cursor for button hover
  if ((modeButton.isHovered || headerButtons.checkButtons(mouseX, mouseY)) && !hoveredBubble) {
    cursor(HAND);
  }
}