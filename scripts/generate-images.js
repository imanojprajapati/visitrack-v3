const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const images = {
  logo: { width: 200, height: 200, text: 'Visitrack' },
  events: [
    { name: 'tech-conference.jpg', width: 800, height: 600, text: 'Tech Conference' },
    { name: 'marketing-summit.jpg', width: 800, height: 600, text: 'Marketing Summit' },
    { name: 'startup-expo.jpg', width: 800, height: 600, text: 'Startup Expo' },
    { name: 'event1.jpg', width: 800, height: 600, text: 'Event 1' },
    { name: 'event2.jpg', width: 800, height: 600, text: 'Event 2' },
    { name: 'event3.jpg', width: 800, height: 600, text: 'Event 3' },
    { name: 'event4.jpg', width: 800, height: 600, text: 'Event 4' },
  ],
  features: [
    { name: 'registration.jpg', width: 600, height: 400, text: 'Registration' },
    { name: 'analytics.jpg', width: 600, height: 400, text: 'Analytics' },
    { name: 'checkin.jpg', width: 600, height: 400, text: 'Check-in' },
  ],
  clients: [
    { name: 'google.png', width: 200, height: 100, text: 'Google' },
    { name: 'amazon.png', width: 200, height: 100, text: 'Amazon' },
    { name: 'apple.png', width: 200, height: 100, text: 'Apple' },
    { name: 'microsoft.png', width: 200, height: 100, text: 'Microsoft' },
  ],
};

function generateImage(width, height, text) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toBuffer('image/png');
}

function createImages() {
  // Create logo
  const logoDir = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
  }
  const logoBuffer = generateImage(images.logo.width, images.logo.height, images.logo.text);
  fs.writeFileSync(path.join(logoDir, 'logo.png'), logoBuffer);

  // Create event images
  const eventsDir = path.join(logoDir, 'events');
  if (!fs.existsSync(eventsDir)) {
    fs.mkdirSync(eventsDir, { recursive: true });
  }
  images.events.forEach(event => {
    const buffer = generateImage(event.width, event.height, event.text);
    fs.writeFileSync(path.join(eventsDir, event.name), buffer);
  });

  // Create feature images
  const featuresDir = path.join(logoDir, 'features');
  if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
  }
  images.features.forEach(feature => {
    const buffer = generateImage(feature.width, feature.height, feature.text);
    fs.writeFileSync(path.join(featuresDir, feature.name), buffer);
  });

  // Create client images
  const clientsDir = path.join(logoDir, 'clients');
  if (!fs.existsSync(clientsDir)) {
    fs.mkdirSync(clientsDir, { recursive: true });
  }
  images.clients.forEach(client => {
    const buffer = generateImage(client.width, client.height, client.text);
    fs.writeFileSync(path.join(clientsDir, client.name), buffer);
  });
}

createImages(); 