// Quick script to generate PWA icons as SVG-based PNGs
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icon for each size
sizes.forEach(size => {
  const padding = Math.round(size * 0.15);
  const fontSize = Math.round(size * 0.35);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#0a0a0a"/>
  <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" rx="${Math.round(size * 0.1)}" fill="none" stroke="#5bbfb5" stroke-width="${Math.max(2, Math.round(size * 0.03))}"/>
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#5bbfb5">CS</text>
</svg>`;

  // Save as SVG (browsers can use SVG icons, and we'll also reference them)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Generated icon-${size}x${size}.svg`);
});

// Also create a favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
  <text x="16" y="22" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="14" fill="#5bbfb5">CS</text>
</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), faviconSvg);
console.log('Generated favicon.svg');

console.log('\nDone! Icons generated as SVG files.');
console.log('For production, convert these to PNG using a tool like sharp or an online converter.');
