import config from './config.json';
const api_chart_gettopartists = `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${config.API_KEY}&format=json`;

function setup() {
  createCanvas(400, 400);
  background(220);
  ellipse(width / 2, height / 2, 100, 100);
}
