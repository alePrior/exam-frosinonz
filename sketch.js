const api_key = "262eda05c5e0a4265750d3cfb1611332";
const api_chart_gettopartists = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${api_key}&format=json`;
const api_tag_gettoptags = `https://ws.audioscrobbler.com/2.0/?method=tag.getTopTags&api_key=${api_key}&format=json`;

let bubbles = [];
let artists = [];
let hoveredBubble = null;
let lastClickedBubble = null;
let connections = [];
let isIsolationMode = true; // true = isolation mode (default), false = cumulative mode
let hasFirstClick = false;
let effectiveWidth; // width available for bubbles (windowWidth - menuWidth)
let topTags = []; // Store top tags data

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

async function fetchArtists() {
  try {
    const response = await fetch(api_chart_gettopartists);
    const data = await response.json();
    artists = data.artists.artist;
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
    this.width = 300; // Increased width to accommodate the table
    this.padding = 20;
    this.buttonHeight = 40;
    this.buttonMargin = 20; // Increased margin between elements
    this.isHoveringMode = false;
    this.isHoveringReset = false;
    this.rowHeight = 30; // Height of each table row
    
    // Calculate tableStartY based on buttons position
    const modeButtonY = this.padding;
    const resetButtonY = modeButtonY + this.buttonHeight + this.buttonMargin;
    this.tableStartY = resetButtonY + this.buttonHeight + this.buttonMargin * 2; // Added extra margin after buttons
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
      fetchArtists();
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
    text('Reset Visualizzazione',
         this.width / 2, resetButtonY + this.buttonHeight / 2);

    // Draw Top Tags table
    this.showTopTagsTable();
  }

  showTopTagsTable() {
    // Table title
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('Top Tags', this.width / 2, this.tableStartY - 10);

    // Table header
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(14);
    const headerY = this.tableStartY + 20; // Moved header down to accommodate title
    text('Tag', this.padding, headerY);
    text('Count', this.width/2 - 20, headerY);
    text('Reach', this.width - 80, headerY);

    // Draw separator line
    stroke(255, 100);
    line(this.padding, headerY + 15, this.width - this.padding, headerY + 15);

    // Table content
    noStroke();
    textSize(12);
    let y = headerY + 30;
    
    for (let tag of topTags) {
      // Tag name
      fill(255);
      text(tag.name, this.padding, y);
      
      // Count
      text(formatPlayCount(tag.count), this.width/2 - 20, y);
      
      // Reach
      text(formatPlayCount(tag.reach), this.width - 80, y);
      
      y += this.rowHeight;
      
      // Break if we're running out of space
      if (y > height - this.padding) break;
    }
  }
}

let sideMenu;

function setup() {
  // Create canvas the size of the viewport minus the menu width
  createCanvas(windowWidth, windowHeight);
  // Initialize menu
  sideMenu = new SideMenu();
  // Calculate effective width
  effectiveWidth = windowWidth - sideMenu.width;
  // Initialize window variable for communication with HTML
  window.isIsolationMode = isIsolationMode;
  // Fetch both artists and top tags
  fetchArtists();
  fetchTopTags();
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