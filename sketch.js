const api_key = "262eda05c5e0a4265750d3cfb1611332";
const api_chart_gettopartists = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${api_key}&format=json`;

let bubbles = [];
let artists = [];
let hoveredBubble = null;
let connections = [];

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

  update() {
    // Add small random movement
    this.vx += random(-0.05, 0.05);
    this.vy += random(-0.05, 0.05);

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
  }

  contains(px, py) {
    let d = dist(px, py, this.x, this.y);
    return d < this.r;
  }

  show(isHighlighted = false) {
    noStroke();
    // Different color and opacity based on highlight state
    if (isHighlighted) {
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
    
    // Draw artist name inside bubble
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(this.r * 0.2);
    text(this.name, this.x, this.y);
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
    const x = random(radius, width - radius);
    const y = random(radius, height - radius);
    bubbles.push(new Bubble(x, y, radius, artist.name, artist.playcount));
  });
}

function setup() {
  // Create canvas the size of the viewport
  createCanvas(windowWidth, windowHeight);
  fetchArtists();
}

function mousePressed() {
  // Check if we clicked on a bubble
  for (let bubble of bubbles) {
    if (bubble.contains(mouseX, mouseY)) {
      // Remove existing similar artists and connections for this bubble
      bubbles = bubbles.filter(b => b.parentBubble !== bubble);
      connections = connections.filter(c => c.source !== bubble);
      
      fetchSimilarArtists(bubble.name, bubble);
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
  background('#1c2128');
  
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
    bubbles[i].update();
    
    // Check collisions with other bubbles
    for (let j = i + 1; j < bubbles.length; j++) {
      bubbles[i].collide(bubbles[j]);
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
    cursor(HAND);
  } else {
    cursor(ARROW);
  }
}