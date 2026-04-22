// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(process.cwd(), 'public', 'icon-source.png'); // place your high-res logo here
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const size of sizes) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(SOURCE).resize(size, size).toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }
  console.log('All icons generated!');
}

generate().catch(console.error);