const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets/branding');
const res = path.join(root, 'android/app/src/main/res');
(async () => {
  for (const name of ['icon', 'adaptive-foreground', 'adaptive-monochrome']) {
    await sharp(path.join(assets, name + '.svg')).png().toFile(path.join(assets, name + '.png'));
  }
  for (const [density, size] of [['mdpi',48], ['hdpi',72], ['xhdpi',96], ['xxhdpi',144], ['xxxhdpi',192]]) {
    const dir = path.join(res, 'mipmap-' + density);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(path.join(assets, 'icon.svg')).resize(size, size).webp({ lossless: true }).toFile(path.join(dir, 'ic_launcher.webp'));
    const circle = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
    await sharp(path.join(assets, 'icon.svg')).resize(size,size).composite([{ input: circle, blend: 'dest-in' }]).webp({ lossless:true }).toFile(path.join(dir, 'ic_launcher_round.webp'));
  }
  await sharp(path.join(assets, 'adaptive-foreground.svg')).png().toFile(path.join(res,'drawable/ic_launcher_foreground.png'));
  await sharp(path.join(assets, 'adaptive-monochrome.svg')).png().toFile(path.join(res,'drawable/ic_launcher_monochrome.png'));
  console.log('Icone SpeseProfit generate.');
})().catch(error => { console.error(error); process.exitCode = 1; });
