const sharp = require('sharp');
const fs = require('fs');

async function main() {
  const svg = fs.readFileSync('public/favicon.svg');

  // 192x192
  const bg192 = await sharp({
    create: { width: 192, height: 192, channels: 4, background: { r: 102, g: 126, b: 234, alpha: 1 } }
  }).composite([{
    input: await sharp(svg).resize(160, 160).png().toBuffer(),
    gravity: 'center'
  }]).png().toFile('public/icon-192x192.png');
  console.log('192x192 done');

  // 512x512
  const bg512 = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 102, g: 126, b: 234, alpha: 1 } }
  }).composite([{
    input: await sharp(svg).resize(420, 420).png().toBuffer(),
    gravity: 'center'
  }]).png().toFile('public/icon-512x512.png');
  console.log('512x512 done');
}

main().catch(console.error);
