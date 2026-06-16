const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const [, , inputPath, outputPngPath, outputWebpPath, widthArg] = process.argv;

if (!inputPath || !outputPngPath || !outputWebpPath) {
  console.error(
    'Uso: node scripts/prepare-mercado-chroma-asset.cjs <input> <output.png> <output.webp> [width]'
  );
  process.exit(1);
}

const targetWidth = Number(widthArg) || 520;

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function removeGreenChroma(data, channels) {
  for (let index = 0; index < data.length; index += channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const greenDominance = green - Math.max(red, blue);
    const isHardGreen = green > 145 && greenDominance > 62;
    const isSoftGreenEdge = green > 110 && greenDominance > 32;

    if (isHardGreen) {
      data[index + 3] = 0;
      continue;
    }

    if (isSoftGreenEdge) {
      data[index + 3] = Math.max(0, data[index + 3] - greenDominance * 4);
    }

    if (green > red && green > blue) {
      data[index + 1] = Math.max(red, blue);
    }
  }
}

async function main() {
  ensureParent(outputPngPath);
  ensureParent(outputWebpPath);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.from(data);

  removeGreenChroma(output, info.channels);

  await sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 1,
    })
    .resize({ width: targetWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPngPath);

  await sharp(outputPngPath)
    .webp({ quality: 92, effort: 6 })
    .toFile(outputWebpPath);

  console.log(`Prepared ${outputPngPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
