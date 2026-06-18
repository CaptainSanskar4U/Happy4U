import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const LOGO_PATH = '../Logo.png';
const RES_DIR = join(process.cwd(), 'android/app/src/main/res');

const densities = [
  { name: 'mdpi', launcher: 48, foreground: 108 },
  { name: 'hdpi', launcher: 72, foreground: 162 },
  { name: 'xhdpi', launcher: 96, foreground: 216 },
  { name: 'xxhdpi', launcher: 144, foreground: 324 },
  { name: 'xxxhdpi', launcher: 192, foreground: 432 },
];

async function generateIcons() {
  for (const density of densities) {
    const mipmapDir = join(RES_DIR, `mipmap-${density.name}`);
    mkdirSync(mipmapDir, { recursive: true });

    // ic_launcher.png (square, no padding)
    await sharp(LOGO_PATH)
      .resize(density.launcher, density.launcher, { fit: 'cover' })
      .png()
      .toFile(join(mipmapDir, 'ic_launcher.png'));

    // ic_launcher_round.png (circular)
    const roundSize = density.launcher;
    const roundBuffer = await sharp(LOGO_PATH)
      .resize(roundSize, roundSize, { fit: 'cover' })
      .png()
      .toBuffer();

    // Create circular mask
    const svgCircle = `<svg width="${roundSize}" height="${roundSize}"><circle cx="${roundSize/2}" cy="${roundSize/2}" r="${roundSize/2}" fill="white"/></svg>`;
    const mask = Buffer.from(svgCircle);

    await sharp({
      create: {
        width: roundSize,
        height: roundSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        { input: roundBuffer, blend: 'dest-in' }
      ])
      .png()
      .toFile(join(mipmapDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (adaptive icon foreground, 432x432 at xxxhdpi, scaled proportionally)
    // The foreground should have padding (about 25% from each edge) for adaptive icon safe zone
    const fgSize = density.foreground;
    const innerSize = Math.round(fgSize * 0.667); // ~66.7% of total for safe zone
    const offset = Math.round((fgSize - innerSize) / 2);

    const resizedForeground = await sharp(LOGO_PATH)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Create transparent canvas and place icon centered
    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        { input: resizedForeground, left: offset, top: offset }
      ])
      .png()
      .toFile(join(mipmapDir, 'ic_launcher_foreground.png'));

    console.log(`Generated icons for ${density.name}: launcher=${density.launcher}px, foreground=${density.foreground}px`);
  }

  console.log('All Android icons generated successfully!');
}

generateIcons().catch(console.error);
