const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function generateHeroImage() {
  const width = 1920;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a365d');
  gradient.addColorStop(1, '#2d3748');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add event-themed elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 10 + 5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Join Our Next Event', width / 2, height / 2 - 50);
  
  ctx.font = '36px Arial';
  ctx.fillText('Experience Innovation & Networking', width / 2, height / 2 + 50);

  // Add decorative elements
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 100 + 50;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Save the image
  const dir = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  fs.writeFileSync(path.join(dir, 'hero-banner.jpg'), buffer);
}

generateHeroImage(); 