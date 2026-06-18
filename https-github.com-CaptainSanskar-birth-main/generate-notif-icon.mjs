import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const LOGO_PATH = '../Logo.png';
const RES_DIR = join(process.cwd(), 'android/app/src/main/res');

async function generateNotificationIcon() {
  const drawableDir = join(RES_DIR, 'drawable');
  mkdirSync(drawableDir, { recursive: true });

  // Create a white-on-transparent notification icon from the cake
  // First, extract just the white cake shape from the logo
  const size = 96; // High res source for notification icon

  await sharp(LOGO_PATH)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(drawableDir, 'ic_stat_icon_config_sample.png'));

  // Also create for drawable-v24
  const drawableV24Dir = join(RES_DIR, 'drawable-v24');
  mkdirSync(drawableV24Dir, { recursive: true });
  await sharp(LOGO_PATH)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(drawableV24Dir, 'ic_stat_icon_config_sample.png'));

  console.log('Notification icon generated successfully!');
}

generateNotificationIcon().catch(console.error);
