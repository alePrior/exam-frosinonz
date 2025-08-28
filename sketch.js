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
    this.isLoading = false; // Track if we're loading
    this.loadingAngle = 0; // Track the loading angle
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
      if (this.x - this.r < 0 || this.x + this.r > width) {
        this.vx *= -0.8;
      }
      if (this.y - this.r < 0 || this.y + this.r > height) {
        this.vy *= -0.8;
      }

      // Keep inside canvas
      this.x = constrain(this.x, this.r, width - this.r);
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



  show(isHighlighted = false) {
    // Draw the bubble fill
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
    const x = random(radius, width - radius);
    const y = random(radius, height - radius);
    bubbles.push(new Bubble(x, y, radius, artist.name, artist.playcount));
  });
}

class HeaderButtons {
  constructor() {
    this.padding = 20;
    this.buttonHeight = 40;
    this.buttonWidth = 150;
    this.buttonMargin = 10;
    this.isHoveringArtists = false;
    this.isHoveringTags = false;
    this.showTagDropdown = false;
    this.hoveredTagIndex = -1;
    this.dropdownHeight = 300;
    this.dropdownWidth = 200;
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
    // Artists button bounds
    this.isHoveringArtists = px >= this.padding && 
                            px <= this.padding + this.buttonWidth &&
                            py >= this.padding && 
                            py <= this.padding + this.buttonHeight;

    // Tags button bounds
    const tagsButtonX = this.padding + this.buttonWidth + this.buttonMargin;
    this.isHoveringTags = px >= tagsButtonX && 
                         px <= tagsButtonX + this.buttonWidth &&
                         py >= this.padding && 
                         py <= this.padding + this.buttonHeight;

    // Check dropdown hovering
    this.hoveredTagIndex = -1;
    if (this.showTagDropdown && topTags.length > 0) {
      const dropdownX = tagsButtonX;
      const dropdownY = this.padding + this.buttonHeight + 5;
      
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

  show() {
    // Artists button
    fill(this.isHoveringArtists ? '#45a049' : '#4CAF50');
    noStroke();
    rect(this.padding, this.padding, this.buttonWidth, this.buttonHeight, 5);
    
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('Top 50 artisti', this.padding + this.buttonWidth/2, this.padding + this.buttonHeight/2);

    // Tags button
    const tagsButtonX = this.padding + this.buttonWidth + this.buttonMargin;
    fill(this.isHoveringTags ? '#357abd' : '#2196F3');
    rect(tagsButtonX, this.padding, this.buttonWidth, this.buttonHeight, 5);
    
    fill(255);
    text('Top 50 tag', tagsButtonX + this.buttonWidth/2, this.padding + this.buttonHeight/2);

    // Draw dropdown if visible
    if (this.showTagDropdown && topTags.length > 0) {
      const dropdownX = tagsButtonX;
      const dropdownY = this.padding + this.buttonHeight + 5;
      
      // Dropdown background
      fill(255, 250);
      stroke(200);
      strokeWeight(1);
      rect(dropdownX, dropdownY, this.dropdownWidth, this.dropdownHeight, 5);
      
      // Dropdown items
      const maxItems = Math.min(Math.floor(this.dropdownHeight / 25), topTags.length);
      for (let i = 0; i < maxItems; i++) {
        const tag = topTags[i];
        const itemY = dropdownY + 10 + i * 25;
        
        // Highlight hovered item
        if (i === this.hoveredTagIndex) {
          fill(100, 150, 255, 100);
          noStroke();
          rect(dropdownX + 5, itemY - 10, this.dropdownWidth - 10, 25, 3);
        }
        
        // Tag name
        fill(0);
        textAlign(LEFT, CENTER);
        textSize(12);
        text(tag.name, dropdownX + 10, itemY);
        
        // Count
        textAlign(RIGHT, CENTER);
        text(this.formatCount(parseInt(tag.count)), dropdownX + this.dropdownWidth - 10, itemY);
      }
    }
  }
}

class ModeCheckbox {
  constructor() {
    this.size = 20;
    this.padding = 15;
    this.isHovered = false;
    this.labelText = "apertura multipla";
  }

  getPosition() {
    return {
      x: windowWidth - this.padding - this.size - textWidth(this.labelText) - 10,
      y: windowHeight - this.padding - this.size
    };
  }

  contains(px, py) {
    const pos = this.getPosition();
    const totalWidth = this.size + 10 + textWidth(this.labelText);
    return px >= pos.x && px <= pos.x + totalWidth &&
           py >= pos.y && py <= pos.y + this.size;
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
    
    // Draw checkbox background
    fill(255);
    stroke(150);
    strokeWeight(2);
    rect(pos.x, pos.y, this.size, this.size, 3);
    
    // Draw checkmark if in cumulative mode (not isolation mode)
    if (!isIsolationMode) {
      noFill();
      stroke(50, 150, 50);
      strokeWeight(3);
      strokeCap(ROUND);
      // Draw checkmark
      line(pos.x + 4, pos.y + this.size/2, 
           pos.x + this.size/2, pos.y + this.size - 4);
      line(pos.x + this.size/2, pos.y + this.size - 4, 
           pos.x + this.size - 4, pos.y + 4);
    }
    
    // Draw label
    fill(255);
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(14);
    text(this.labelText, pos.x + this.size + 10, pos.y + this.size/2);
    
    // Show hover effect
    if (this.isHovered) {
      fill(255, 255, 255, 50);
      noStroke();
      rect(pos.x - 5, pos.y - 5, this.size + 10 + textWidth(this.labelText) + 10, this.size + 10, 5);
    }
  }
}

let headerButtons;
let modeCheckbox;
let currentViewTitle = "Top artisti ascoltati";

function setup() {
  // Create canvas the full size of the viewport
  createCanvas(windowWidth, windowHeight);
  // Initialize header buttons and checkbox
  headerButtons = new HeaderButtons();
  modeCheckbox = new ModeCheckbox();
  // Initialize window variable for communication with HTML
  window.isIsolationMode = isIsolationMode;
  // Fetch both artists and tags
  fetchTopTags();
  fetchArtists();
}

function mousePressed() {
  // First check if we clicked on the checkbox
  if (modeCheckbox.handleClick(mouseX, mouseY)) {
    return; // Click was handled by checkbox
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
        lastClickedBubble = bubble; // Update last clicked bubble
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
  background('#1c2128');
  
  // Draw header buttons
  headerButtons.checkButtons(mouseX, mouseY);
  headerButtons.show();
  
  // Draw title
  fill(255);
  textAlign(LEFT, TOP);
  textSize(24);
  text(currentViewTitle, 20, 90);
  
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
  
  // Draw checkbox in bottom right (outside of translation)
  modeCheckbox.checkHover(mouseX, mouseY);
  modeCheckbox.show();
  
  // Update cursor for checkbox hover
  if (modeCheckbox.isHovered && !hoveredBubble) {
    cursor(HAND);
  }
}