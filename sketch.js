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
let effectiveWidth; // width available for bubbles (windowWidth - menuWidth)

class Connection {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  show() {
    stroke(150, 150, 255, 100);
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
      if (this.x - this.r < 0 || this.x + this.r > effectiveWidth) {
        this.vx *= -0.8;
      }
      if (this.y - this.r < 0 || this.y + this.r > height) {
        this.vy *= -0.8;
      }

      // Keep inside canvas
      this.x = constrain(this.x, this.r, effectiveWidth - this.r);
      this.y = constrain(this.y, this.r, height - this.r);

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

  containsWithOffset(px, py, offsetX) {
    let d = dist(px - offsetX, py, this.x, this.y);
    return d < this.r;
  }

  show(isHighlighted = false) {
    noStroke();
    // Different color and opacity based on highlight state and if it's the last clicked bubble
    if (this === lastClickedBubble) {
      fill('#ff5c58'); // Bright red for last clicked bubble
    } else if (isHighlighted) {
      if (this.isSimilar) {
        fill(150, 150, 255); // Solid light blue for highlighted similar artists
      } else {
        fill(255, 100, 100); // Solid red for highlighted main artist
      }
    } else {
      if (this.isSimilar) {
        fill(150, 150, 255, 150); // Semi-transparent light blue for similar artists
      } else {
        fill(255, 150); // Semi-transparent white for main artists
      }
    }
    ellipse(this.x, this.y, this.r * 2);
    
    // Draw play count inside bubble
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(11);
    text(formatPlayCount(parseInt(this.playcount)), this.x, this.y);
    
    // Draw artist name below bubble
    fill(255); // Colore bianco per il testo
    textAlign(CENTER, TOP);
    textSize(14); // Dimensione fissa del font
    text(this.name, this.x, this.y + this.r + 5); // 5 pixel di spazio tra la bolla e il testo
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
          // If already exists, just create a connection if not already connected
          const connectionExists = connections.some(
            c => (c.source === parentBubble && c.target === existingBubble) ||
                 (c.source === existingBubble && c.target === parentBubble)
          );
          if (!connectionExists) {
            connections.push(new Connection(parentBubble, existingBubble));
          }
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
    const x = random(radius, effectiveWidth - radius);
    const y = random(radius, height - radius);
    bubbles.push(new Bubble(x, y, radius, artist.name, artist.playcount));
  });
}

class SideMenu {
  constructor() {
    this.width = 300;  // Increased width to accommodate the table
    this.padding = 20;
    this.buttonHeight = 40;
    this.buttonMargin = 10;
    this.isHoveringMode = false;
    this.isHoveringReset = false;
    this.tableTop = this.padding * 2 + this.buttonHeight * 2 + this.buttonMargin;
    this.rowHeight = 30;
    this.hoveredTagIndex = -1;  // Track which tag is being hovered
  }

  contains(px, py) {
    return px >= 0 && px <= this.width && py >= 0 && py <= height;
  }

  checkButtons(px, py) {
    // Mode button bounds
    const modeButtonY = this.padding;
    this.isHoveringMode = px >= this.padding && 
                         px <= this.width - this.padding &&
                         py >= modeButtonY && 
                         py <= modeButtonY + this.buttonHeight;

    // Reset button bounds
    const resetButtonY = modeButtonY + this.buttonHeight + this.buttonMargin;
    this.isHoveringReset = px >= this.padding && 
                          px <= this.width - this.padding &&
                          py >= resetButtonY && 
                          py <= resetButtonY + this.buttonHeight;

    // Check tag hovering
    this.hoveredTagIndex = -1;
    if (topTags.length > 0 && 
        px >= this.padding && 
        px <= this.width - this.padding - 160) {  // Only the tag name area is clickable
      const relativeY = py - this.tableTop - this.rowHeight;
      if (relativeY >= 0) {
        const index = Math.floor(relativeY / this.rowHeight);
        if (index >= 0 && index < Math.min(20, topTags.length)) {
          this.hoveredTagIndex = index;
          return true;
        }
      }
    }

    return this.isHoveringMode || this.isHoveringReset;
  }

  handleClick(px, py) {
    if (this.isHoveringMode) {
      isIsolationMode = !isIsolationMode;
      return true;
    } else if (this.isHoveringReset) {
      // Reset the application state
      bubbles = [];
      connections = [];
      hasFirstClick = false;
      lastClickedBubble = null;
      window.location.href = window.location.pathname; // Remove query parameters
      return true;
    } else if (this.hoveredTagIndex >= 0 && this.hoveredTagIndex < topTags.length) {
      // Handle tag click
      const tag = topTags[this.hoveredTagIndex];
      window.location.href = `${window.location.pathname}?tag=${encodeURIComponent(tag.name)}`;
      return true;
    }
    return false;
  }

  show() {
    // Draw menu background
    noStroke();
    fill('#333333');
    rect(0, 0, this.width, height);

    // Mode toggle button
    const modeButtonY = this.padding;
    fill(this.isHoveringMode ? '#45a049' : '#4CAF50');
    rect(this.padding, modeButtonY, 
         this.width - this.padding * 2, this.buttonHeight, 4);
    
    // Mode button text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Modalità: ' + (isIsolationMode ? 'Isolamento' : 'Cumulativa'),
         this.width / 2, modeButtonY + this.buttonHeight / 2);

    // Reset button
    const resetButtonY = modeButtonY + this.buttonHeight + this.buttonMargin;
    fill(this.isHoveringReset ? '#d44937' : '#e74c3c');
    rect(this.padding, resetButtonY, 
         this.width - this.padding * 2, this.buttonHeight, 4);
    
    // Reset button text
    fill(255);
    text('Mostra Artisti Top',
         this.width / 2, resetButtonY + this.buttonHeight / 2);

    // Draw tags table
    if (topTags.length > 0) {
      // Get current tag from URL
      const currentTag = getUrlParameter('tag');

      // Table header
      fill(255);
      textAlign(LEFT, CENTER);
      textSize(14);
      text('Tag', this.padding, this.tableTop);
      textAlign(RIGHT, CENTER);
      text('Count', this.width - this.padding - 80, this.tableTop);
      text('Reach', this.width - this.padding, this.tableTop);

      // Table rows
      for (let i = 0; i < Math.min(20, topTags.length); i++) {
        const tag = topTags[i];
        const y = this.tableTop + (i + 1) * this.rowHeight;
        
        // Alternate row background
        if (i % 2 === 0) {
          fill(255, 255, 255, 20);
          noStroke();
          rect(this.padding, y - this.rowHeight/2, 
               this.width - this.padding * 2, this.rowHeight);
        }
        
        // Tag data
        fill(255);
        textAlign(LEFT, CENTER);
        
        // Highlight conditions
        const isCurrentTag = currentTag && tag.name.toLowerCase() === currentTag.toLowerCase();
        const isHovered = i === this.hoveredTagIndex;
        
        // Apply highlighting
        if (isCurrentTag) {
          // Selected tag gets a distinctive background
          fill('#2196F3');  // Blue background for selected tag
          noStroke();
          rect(this.padding, y - this.rowHeight/2, 
               this.width - this.padding * 2, this.rowHeight);
          fill(255);  // White text for selected tag
        }
        if (isHovered) {
          fill('#4CAF50');  // Green text for hover
          cursor(HAND);
        }
        
        text(tag.name, this.padding, y);
        fill(isCurrentTag ? 255 : 255);  // Keep text white if selected
        textAlign(RIGHT, CENTER);
        text(tag.count.toLocaleString(), this.width - this.padding - 80, y);
        text(tag.reach.toLocaleString(), this.width - this.padding, y);
      }
    }
  }
}

let sideMenu;
let currentViewTitle = "Top artisti ascoltati";

function setup() {
  // Create canvas the size of the viewport minus the menu width
  createCanvas(windowWidth, windowHeight);
  // Initialize menu
  sideMenu = new SideMenu();
  // Calculate effective width
  effectiveWidth = windowWidth - sideMenu.width;
  // Initialize window variable for communication with HTML
  window.isIsolationMode = isIsolationMode;
  // Fetch both artists and tags
  fetchTopTags();
  fetchArtists();
}

function mousePressed() {
  // First check if we clicked on the menu
  if (sideMenu.contains(mouseX, mouseY)) {
    if (sideMenu.handleClick(mouseX, mouseY)) {
      return; // Click was handled by menu
    }
  }

  // Adjust mouseX to account for menu offset when checking bubbles
  const adjustedMouseX = mouseX - sideMenu.width;
  
  // Check if we clicked on a bubble
  for (let bubble of bubbles) {
    if (bubble.contains(adjustedMouseX, mouseY)) {
      // Only fetch similar artists if we haven't already
      if (!bubble.similarArtistsFetched) {
        // Update title
        currentViewTitle = `Artisti simili a ${bubble.name}`;
        
        // Handle first click - remove default bubbles
        if (!hasFirstClick) {
          // First click always removes default bubbles
          bubbles = bubbles.filter(b => b === bubble);
          connections = [];
          hasFirstClick = true;
        } 
        // Handle subsequent clicks based on mode
        else if (isIsolationMode) {
          // In isolation mode, remove all except the clicked bubble
          bubbles = bubbles.filter(b => b === bubble);
          connections = [];
        }
        // In cumulative mode, we don't filter any bubbles or connections
        
        // Store the current bubbles and connections before fetching
        const currentBubbles = isIsolationMode ? [bubble] : [...bubbles];
        const currentConnections = isIsolationMode ? [] : [...connections];
        
        // After fetching completes, merge with existing if in cumulative mode
        fetchSimilarArtists(bubble.name, bubble).then(() => {
          if (!isIsolationMode && hasFirstClick) {
            // Ensure we don't lose the previous bubbles and connections
            bubbles = [...currentBubbles, ...bubbles.filter(b => !currentBubbles.includes(b))];
            connections = [...currentConnections, ...connections];
          }
        });
        
        bubble.similarArtistsFetched = true; // Mark as fetched
        lastClickedBubble = bubble; // Update last clicked bubble
      }
      break;
    }
  }
}

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  effectiveWidth = windowWidth - sideMenu.width;
  if (artists.length > 0) {
    createBubbles(); // Recreate bubbles with new canvas dimensions
  }
}

function draw() {
  // Sync isolation mode with window variable
  window.isIsolationMode = isIsolationMode;
  background('#1c2128');
  
  // Draw menu first
  push();
  sideMenu.show();
  pop();
  
  // Translate everything else to account for menu width
  push();
  translate(sideMenu.width, 0);
  
  // Draw title
  fill(255);
  textAlign(LEFT, TOP);
  textSize(24);
  text(currentViewTitle, 20, 20);
  
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
      stroke(150, 150, 255); // Solid color for highlighted connections
      strokeWeight(3);
    } else {
      stroke(150, 150, 255, 100); // Semi-transparent for normal connections
      strokeWeight(2);
    }
    line(connection.source.x, connection.source.y, 
         connection.target.x, connection.target.y);
  }
  
  // Update hoveredBubble
  hoveredBubble = null;
  // Check bubbles in reverse order to detect top-most bubble first
  if (!sideMenu.contains(mouseX, mouseY)) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      if (bubbles[i].containsWithOffset(mouseX, mouseY, sideMenu.width)) {
        hoveredBubble = bubbles[i];
        break;
      }
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
    // Check if hovering over menu buttons
    if (sideMenu.contains(mouseX, mouseY)) {
      if (sideMenu.checkButtons(mouseX, mouseY)) {
        cursor(HAND);
      } else {
        cursor(ARROW);
      }
    } else {
      cursor(ARROW);
    }
  }
  
  // End translation for main content
  pop();
}