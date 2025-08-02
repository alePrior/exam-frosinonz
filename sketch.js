const api_key = "262eda05c5e0a4265750d3cfb1611332";
const api_chart_gettopartists = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${api_key}&format=json`;

let bubbles = [];
let artists = [];
let hoveredBubble = null;

class Bubble {
  constructor(x, y, r, name, playcount) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.name = name;
    this.playcount = playcount;
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
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

    // Add some friction
    this.vx *= 0.99;
    this.vy *= 0.99;
  }

  contains(px, py) {
    let d = dist(px, py, this.x, this.y);
    return d < this.r;
  }

  show() {
    noStroke();
    fill(255, 150);
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
    fill(255, 250 * 0.8); // bianco con leggera trasparenza (~80% opaco)
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

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (artists.length > 0) {
    createBubbles(); // Recreate bubbles with new canvas dimensions
  }
}

function draw() {
  background('#1c2128');
  
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
    
    bubbles[i].show();
  }

  // Draw tooltip for hovered bubble
  if (hoveredBubble) {
    hoveredBubble.showTooltip();
    cursor(HAND);
  } else {
    cursor(ARROW);
  }
}