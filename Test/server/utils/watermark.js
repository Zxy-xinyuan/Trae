const sharp = require('sharp');
const path = require('path');

async function addWatermark(imagePath, studioName) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const watermarkText = `${timestamp}  ${studioName}`;

  const metadata = await sharp(imagePath).metadata();
  const { width, height } = metadata;

  const fontSize = Math.max(Math.round(Math.min(width, height) * 0.04), 16);

  const svgWatermark = Buffer.from(`
    <svg width="${width}" height="${height}">
      <style>
        .watermark { font-size: ${fontSize}px; fill: rgba(255, 255, 255, 0.5); font-family: sans-serif; }
      </style>
      <rect x="${width - (watermarkText.length * fontSize * 0.6) - 30}"
            y="${height - fontSize - 30}"
            width="${watermarkText.length * fontSize * 0.6 + 20}"
            height="${fontSize + 16}"
            rx="4" fill="rgba(0,0,0,0.3)" />
      <text x="${width - 20}" y="${height - 16}"
            class="watermark" text-anchor="end">${watermarkText}</text>
    </svg>
  `);

  const ext = path.extname(imagePath);
  const baseName = path.basename(imagePath, ext);
  const dirName = path.dirname(imagePath);
  const outputPath = path.join(dirName, `watermarked_${baseName}${ext}`);

  await sharp(imagePath)
    .composite([{ input: svgWatermark, top: 0, left: 0 }])
    .toFile(outputPath);

  return outputPath;
}

module.exports = { addWatermark };
