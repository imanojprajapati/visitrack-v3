const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const imageSizes = {
  events: { width: 800, height: 600 },
  features: { width: 600, height: 400 },
  clients: { width: 200, height: 100 },
};

const images = {
  events: [
    'tech-conference.jpg',
    'marketing-summit.jpg',
    'startup-expo.jpg',
    'event1.jpg',
    'event2.jpg',
    'event3.jpg',
    'event4.jpg',
  ],
  features: [
    'registration.jpg',
    'analytics.jpg',
    'checkin.jpg',
  ],
  clients: [
    'google.png',
    'amazon.png',
    'apple.png',
    'microsoft.png',
  ],
};

function generatePlaceholderImage(width, height, text) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);

  // Text
  ctx.fillStyle = '#6b7280';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return canvas.toBuffer('image/png');
}

function createPlaceholderImages() {
  Object.entries(images).forEach(([category, files]) => {
    const dir = path.join(__dirname, '..', 'public', 'images', category);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    files.forEach(file => {
      const { width, height } = imageSizes[category];
      const text = file.split('.')[0].replace(/-/g, ' ');
      const buffer = generatePlaceholderImage(width, height, text);
      fs.writeFileSync(path.join(dir, file), buffer);
    });
  });
}

createPlaceholderImages(); 