const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BASE_DIR = path.join(ROOT, 'assets', 'images', 'mercado-inteligente', 'session-final');
const SOURCE = path.join(BASE_DIR, 'sources', 'session-final-screen3-reference-official.png');
const OUT_DIR = path.join(BASE_DIR, 'reference-crops');

const families = ['backgrounds', 'banners', 'characters', 'awards', 'stars', 'panels', 'buttons', 'effects'];

const crops = [
  {
    family: 'backgrounds',
    name: 'screen3-official-full-reference',
    rect: { x: 0, y: 0, width: 1408, height: 768 },
    note: 'Referencia completa aprobada; conserva marco y composicion original.',
  },
  {
    family: 'backgrounds',
    name: 'screen3-game-viewport-reference',
    rect: { x: 72, y: 35, width: 1262, height: 675 },
    note: 'Viewport visual aproximado sin gran parte del marco blanco externo.',
  },
  {
    family: 'banners',
    name: 'session-final-banner-reference-crop',
    rect: { x: 360, y: 28, width: 705, height: 130 },
    note: 'Banner superior real con texto incrustado; usar como referencia visual o fondo temporal, no como texto dinamico final.',
    hasBakedText: true,
  },
  {
    family: 'characters',
    name: 'session-final-player-card-reference-crop',
    rect: { x: 86, y: 46, width: 205, height: 178 },
    note: 'Tarjeta real de jugador con avatar y nivel incrustados; requiere variante nino/nina o marco limpio para runtime dinamico.',
    hasBakedText: true,
  },
  {
    family: 'characters',
    name: 'session-final-diploma-reference-crop',
    rect: { x: 302, y: 185, width: 315, height: 175 },
    note: 'Diploma y medallon reales desde referencia oficial.',
    hasBakedText: true,
  },
  {
    family: 'awards',
    name: 'session-final-trophy-reference-crop',
    rect: { x: 590, y: 120, width: 330, height: 250 },
    note: 'Trofeo central real desde referencia oficial, con numero incrustado.',
    hasBakedText: true,
  },
  {
    family: 'awards',
    name: 'session-final-celebration-cluster-reference-crop',
    rect: { x: 295, y: 118, width: 890, height: 250 },
    note: 'Cluster completo: diploma, trofeo y estrellas. Util para comparacion pixel-perfect.',
    hasBakedText: true,
  },
  {
    family: 'stars',
    name: 'session-final-stars-group-reference-crop',
    rect: { x: 850, y: 190, width: 335, height: 170 },
    note: 'Grupo real de estrellas de la pantalla final.',
  },
  {
    family: 'stars',
    name: 'session-final-star-active-01-reference-crop',
    rect: { x: 855, y: 220, width: 112, height: 112 },
    note: 'Estrella activa recortada de la referencia oficial.',
  },
  {
    family: 'stars',
    name: 'session-final-star-active-02-reference-crop',
    rect: { x: 940, y: 205, width: 125, height: 125 },
    note: 'Segunda estrella activa recortada de la referencia oficial.',
  },
  {
    family: 'stars',
    name: 'session-final-star-inactive-reference-crop',
    rect: { x: 1040, y: 240, width: 105, height: 105 },
    note: 'Estrella inactiva recortada de la referencia oficial.',
  },
  {
    family: 'panels',
    name: 'session-final-summary-panel-reference-crop',
    rect: { x: 360, y: 358, width: 690, height: 205 },
    note: 'Panel de resumen real con textos incrustados; sirve como referencia de proporciones.',
    hasBakedText: true,
  },
  {
    family: 'panels',
    name: 'session-final-message-bubble-reference-crop',
    rect: { x: 448, y: 585, width: 555, height: 108 },
    note: 'Globo de mensaje real con texto incrustado; runtime debe conservar texto dinamico.',
    hasBakedText: true,
  },
  {
    family: 'buttons',
    name: 'session-final-history-button-reference-crop',
    rect: { x: 108, y: 600, width: 250, height: 100 },
    note: 'Boton historial real con texto incrustado; referencia para tamano/color/sombra.',
    hasBakedText: true,
  },
  {
    family: 'buttons',
    name: 'session-final-return-button-reference-crop',
    rect: { x: 1018, y: 580, width: 335, height: 120 },
    note: 'Boton volver al tablero real con texto incrustado; referencia para tamano/color/sombra.',
    hasBakedText: true,
  },
  {
    family: 'effects',
    name: 'session-final-confetti-reference-full-crop',
    rect: { x: 72, y: 35, width: 1262, height: 675 },
    note: 'Capa de referencia con confeti visible; no es overlay transparente.',
    hasBackground: true,
  },
];

const ensureDirs = async () => {
  await Promise.all(families.map((family) => fs.mkdir(path.join(OUT_DIR, family), { recursive: true })));
};

const saveCrop = async (crop, sourceMeta) => {
  const outputFamily = path.join(OUT_DIR, crop.family);
  const safeRect = {
    left: Math.max(0, crop.rect.x),
    top: Math.max(0, crop.rect.y),
    width: Math.min(crop.rect.width, sourceMeta.width - crop.rect.x),
    height: Math.min(crop.rect.height, sourceMeta.height - crop.rect.y),
  };

  const pngPath = path.join(outputFamily, `${crop.name}.png`);
  const webpPath = path.join(outputFamily, `${crop.name}.webp`);
  const png2xPath = path.join(outputFamily, `${crop.name}@2x.png`);
  const webp2xPath = path.join(outputFamily, `${crop.name}@2x.webp`);

  const base = sharp(SOURCE).extract(safeRect);
  await base.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(pngPath);
  await base.clone().webp({ quality: 92, effort: 6 }).toFile(webpPath);
  await base.clone().resize({ width: safeRect.width * 2, height: safeRect.height * 2, kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(png2xPath);
  await base.clone().resize({ width: safeRect.width * 2, height: safeRect.height * 2, kernel: sharp.kernel.lanczos3 }).webp({ quality: 92, effort: 6 }).toFile(webp2xPath);

  const [pngStat, webpStat, png2xStat, webp2xStat] = await Promise.all([
    fs.stat(pngPath),
    fs.stat(webpPath),
    fs.stat(png2xPath),
    fs.stat(webp2xPath),
  ]);

  return {
    family: crop.family,
    name: crop.name,
    rect: crop.rect,
    width: safeRect.width,
    height: safeRect.height,
    hasBakedText: Boolean(crop.hasBakedText),
    hasBackground: Boolean(crop.hasBackground),
    note: crop.note,
    files: {
      png: path.relative(ROOT, pngPath).replace(/\\/g, '/'),
      webp: path.relative(ROOT, webpPath).replace(/\\/g, '/'),
      png2x: path.relative(ROOT, png2xPath).replace(/\\/g, '/'),
      webp2x: path.relative(ROOT, webp2xPath).replace(/\\/g, '/'),
    },
    bytes: {
      png: pngStat.size,
      webp: webpStat.size,
      png2x: png2xStat.size,
      webp2x: webp2xStat.size,
    },
  };
};

const main = async () => {
  const metadata = await sharp(SOURCE).metadata();
  await ensureDirs();
  const assets = [];
  for (const crop of crops) {
    assets.push(await saveCrop(crop, metadata));
  }

  const manifestPath = path.join(OUT_DIR, 'session-final-reference-crops.manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'assets/images/mercado-inteligente/session-final/sources/session-final-screen3-reference-official.png',
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    note: 'Recortes reales desde pantalla 3 oficial. Los recortes con hasBakedText=true son referencia visual, no deben reemplazar texto dinamico sin limpiar primero.',
    assets,
  }, null, 2)}\n`);

  console.log(`Mercado session-final reference crops: ${assets.length}`);
  console.log(path.relative(ROOT, manifestPath).replace(/\\/g, '/'));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
