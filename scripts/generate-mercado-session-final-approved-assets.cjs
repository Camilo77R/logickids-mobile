const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const BASE_DIR = path.join(ROOT, 'assets', 'images', 'mercado-inteligente', 'session-final');

const FAMILIAS = Object.freeze({
  banners: path.join(BASE_DIR, 'banners'),
  panels: path.join(BASE_DIR, 'panels'),
  buttons: path.join(BASE_DIR, 'buttons'),
  stars: path.join(BASE_DIR, 'stars'),
  icons: path.join(BASE_DIR, 'icons'),
  characters: path.join(BASE_DIR, 'characters'),
  effects: path.join(BASE_DIR, 'effects'),
});

const escapeXml = (valor) =>
  String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const crearSvg = ({ width, height, body, defs = '' }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow-soft" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="14" stdDeviation="8" flood-color="#43210f" flood-opacity=".28"/>
    </filter>
    <filter id="shadow-hard" x="-20%" y="-20%" width="150%" height="160%">
      <feDropShadow dx="0" dy="9" stdDeviation="0" flood-color="#6b3516" flood-opacity=".55"/>
      <feDropShadow dx="0" dy="16" stdDeviation="10" flood-color="#3d1f0d" flood-opacity=".18"/>
    </filter>
    <filter id="glow-gold" x="-45%" y="-45%" width="190%" height="190%">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#ffd94a" flood-opacity=".72"/>
      <feDropShadow dx="0" dy="7" stdDeviation="4" flood-color="#6b3516" flood-opacity=".24"/>
    </filter>
    ${defs}
  </defs>
  ${body}
</svg>`;

const guardarAsset = async ({ family, name, width, height, body, defs }) => {
  const dir = FAMILIAS[family];
  if (!dir) {
    throw new Error(`Familia de asset desconocida: ${family}`);
  }

  await fs.mkdir(dir, { recursive: true });
  const svg = crearSvg({ width, height, body, defs });
  const pngPath = path.join(dir, `${name}.png`);
  const webpPath = path.join(dir, `${name}.webp`);
  const buffer = Buffer.from(svg);

  await sharp(buffer).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(pngPath);
  await sharp(buffer).webp({ quality: 92, effort: 6 }).toFile(webpPath);

  const [pngStat, webpStat] = await Promise.all([fs.stat(pngPath), fs.stat(webpPath)]);

  return {
    family,
    name,
    width,
    height,
    files: {
      png: path.relative(ROOT, pngPath).replace(/\\/g, '/'),
      webp: path.relative(ROOT, webpPath).replace(/\\/g, '/'),
    },
    bytes: {
      png: pngStat.size,
      webp: webpStat.size,
    },
  };
};

const roundedRect = ({ x, y, width, height, radius, fill, stroke, strokeWidth = 0, filter = '' }) => `
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}"
    ${stroke ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : ''}
    ${filter ? `filter="${filter}"` : ''}/>
`;

const starPath = 'M128 18l31 63 70 10-51 50 12 70-62-33-62 33 12-70-51-50 70-10Z';

const crearEstrella = ({ active }) => guardarAsset({
  family: 'stars',
  name: active ? 'session-final-star-active-premium' : 'session-final-star-inactive-premium',
  width: 320,
  height: 320,
  defs: `
    <linearGradient id="star-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${active ? '#fffba8' : '#f4f0df'}"/>
      <stop offset=".38" stop-color="${active ? '#ffd84e' : '#c9c4b5'}"/>
      <stop offset=".72" stop-color="${active ? '#ffb02f' : '#9f9a90'}"/>
      <stop offset="1" stop-color="${active ? '#e27b18' : '#716d68'}"/>
    </linearGradient>
    <radialGradient id="star-shine" cx="34%" cy="25%" r="68%">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".98"/>
      <stop offset=".36" stop-color="#fffdf0" stop-opacity=".42"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="star-inner" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="0" flood-color="#7a3d14" flood-opacity=".62"/>
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="${active ? '#ffe65c' : '#ffffff'}" flood-opacity="${active ? '.68' : '.16'}"/>
    </filter>`,
  body: `
    <g transform="translate(32 28) scale(1.02)">
      <path d="${starPath}" fill="#7b3d13" opacity=".28" transform="translate(0 16)"/>
      <path d="${starPath}" fill="url(#star-fill)" stroke="${active ? '#8b4816' : '#6b6762'}" stroke-width="15" stroke-linejoin="round" filter="url(#star-inner)"/>
      <path d="M128 42l21 45 50 8-37 35 9 51-43-23-43 23 9-51-37-35 50-8Z" fill="none" stroke="${active ? '#fff0a0' : '#ece7d8'}" stroke-width="7" stroke-linejoin="round" opacity="${active ? '.72' : '.4'}"/>
      <path d="${starPath}" fill="url(#star-shine)" opacity="${active ? '.92' : '.28'}"/>
      ${active ? `
        <circle cx="107" cy="119" r="8" fill="#653011"/>
        <circle cx="151" cy="119" r="8" fill="#653011"/>
        <path d="M105 145c16 18 34 18 50 0" fill="none" stroke="#653011" stroke-width="10" stroke-linecap="round"/>
        <circle cx="93" cy="84" r="13" fill="#ffffff" opacity=".42"/>
      ` : `
        <path d="M105 145c16 15 34 15 50 0" fill="none" stroke="#68645d" stroke-width="9" stroke-linecap="round" opacity=".42"/>
      `}
    </g>
  `,
});
const crearBanner = () => guardarAsset({
  family: 'banners',
  name: 'session-final-banner-premium',
  width: 1220,
  height: 210,
  defs: `
    <linearGradient id="banner-green" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#b8f45c"/>
      <stop offset=".45" stop-color="#66d741"/>
      <stop offset="1" stop-color="#199f39"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#c87836"/>
      <stop offset="1" stop-color="#6f3519"/>
    </linearGradient>`,
  body: `
    <path d="M132 42H42L92 132H168Z" fill="url(#wood)" stroke="#5c2a13" stroke-width="10" filter="url(#shadow-soft)"/>
    <path d="M1088 42h90l-50 90h-76Z" fill="url(#wood)" stroke="#5c2a13" stroke-width="10" filter="url(#shadow-soft)"/>
    <path d="M180 12h860c45 0 75 29 75 68v50c0 39-30 68-75 68H180c-45 0-75-29-75-68V80c0-39 30-68 75-68Z"
      fill="url(#banner-green)" stroke="#277331" stroke-width="12" filter="url(#shadow-hard)"/>
    <path d="M176 28h868c24 0 43 17 43 37v20H133V65c0-20 19-37 43-37Z" fill="#dcff80" opacity=".42"/>
    <path d="M135 142h950" stroke="#0d7d2f" stroke-width="8" stroke-linecap="round" opacity=".45"/>
  `,
});

const crearPanelResumen = () => guardarAsset({
  family: 'panels',
  name: 'session-final-summary-card-premium',
  width: 1120,
  height: 270,
  defs: `
    <linearGradient id="panel-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff8dc"/>
      <stop offset=".56" stop-color="#ffe0a5"/>
      <stop offset="1" stop-color="#ffc06f"/>
    </linearGradient>`,
  body: `
    ${roundedRect({ x: 18, y: 10, width: 1084, height: 238, radius: 34, fill: 'url(#panel-fill)', stroke: '#6d3618', strokeWidth: 10, filter: 'url(#shadow-hard)' })}
    <rect x="24" y="22" width="1072" height="56" rx="28" fill="#ffffff" opacity=".32"/>
    <line x1="375" y1="48" x2="375" y2="222" stroke="#8c562c" stroke-width="4" opacity=".36"/>
    <line x1="745" y1="48" x2="745" y2="222" stroke="#8c562c" stroke-width="4" opacity=".36"/>
  `,
});

const crearGloboMensaje = () => guardarAsset({
  family: 'panels',
  name: 'session-final-message-bubble-premium',
  width: 780,
  height: 150,
  defs: `
    <linearGradient id="bubble-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fffefa"/>
      <stop offset="1" stop-color="#fff0cc"/>
    </linearGradient>`,
  body: `
    ${roundedRect({ x: 16, y: 12, width: 700, height: 112, radius: 24, fill: 'url(#bubble-fill)', stroke: '#76401e', strokeWidth: 8, filter: 'url(#shadow-hard)' })}
    <path d="M706 54l52 24-52 24Z" fill="#fff0cc" stroke="#76401e" stroke-width="8" stroke-linejoin="round"/>
    <rect x="36" y="30" width="650" height="26" rx="13" fill="#ffffff" opacity=".42"/>
  `,
});

const crearBoton = ({ familyName, name, blue }) => guardarAsset({
  family: 'buttons',
  name,
  width: blue ? 540 : 440,
  height: 145,
  defs: `
    <linearGradient id="button-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${blue ? '#7ef2ff' : '#b7f66f'}"/>
      <stop offset=".52" stop-color="${blue ? '#19b9f6' : '#65d64a'}"/>
      <stop offset="1" stop-color="${blue ? '#0b7dca' : '#229a39'}"/>
    </linearGradient>`,
  body: `
    ${roundedRect({ x: 18, y: 10, width: blue ? 504 : 404, height: 112, radius: 26, fill: 'url(#button-fill)', stroke: blue ? '#1e6f93' : '#2d7a35', strokeWidth: 10, filter: 'url(#shadow-hard)' })}
    <rect x="36" y="24" width="${blue ? 468 : 368}" height="34" rx="17" fill="#ffffff" opacity=".32"/>
    <path d="M46 100h${blue ? 448 : 348}" stroke="${blue ? '#055f9b' : '#1f7b2e'}" stroke-width="8" stroke-linecap="round" opacity=".42"/>
  `,
});

const crearIcono = ({ name, body }) => guardarAsset({
  family: 'icons',
  name,
  width: 160,
  height: 160,
  body,
});

const crearIconos = async () => Promise.all([
  crearIcono({
    name: 'session-final-check-premium',
    body: `
      <circle cx="80" cy="80" r="58" fill="#55cf54" stroke="#20762f" stroke-width="12" filter="url(#shadow-soft)"/>
      <path d="M49 80l22 23 43-49" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  }),
  crearIcono({
    name: 'session-final-home-premium',
    body: `
      <circle cx="80" cy="80" r="64" fill="#17aef1" stroke="#0a6f9e" stroke-width="10" filter="url(#shadow-soft)"/>
      <path d="M39 80l41-35 41 35" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M51 78v47h58V78" fill="#ffffff"/>
      <rect x="71" y="96" width="18" height="29" rx="4" fill="#17aef1"/>
    `,
  }),
  crearIcono({
    name: 'session-final-history-premium',
    body: `
      <circle cx="80" cy="80" r="64" fill="#62d75a" stroke="#267f32" stroke-width="10" filter="url(#shadow-soft)"/>
      <rect x="50" y="39" width="60" height="82" rx="9" fill="#fffbe6" stroke="#267f32" stroke-width="8"/>
      <path d="M64 63h31M64 81h31M64 99h23" stroke="#267f32" stroke-width="8" stroke-linecap="round"/>
    `,
  }),
  crearIcono({
    name: 'session-final-trophy-mini-premium',
    body: `
      <circle cx="80" cy="80" r="64" fill="#ffd24b" stroke="#965018" stroke-width="10" filter="url(#glow-gold)"/>
      <path d="M55 45h50c1 38-10 62-25 62S54 83 55 45Z" fill="#fff078" stroke="#965018" stroke-width="8"/>
      <path d="M55 59c-24-13-23 36 3 32M105 59c24-13 23 36-3 32" fill="none" stroke="#965018" stroke-width="8" stroke-linecap="round"/>
      <rect x="68" y="105" width="24" height="16" fill="#e78a20"/>
      <rect x="54" y="118" width="52" height="18" rx="7" fill="#e78a20" stroke="#965018" stroke-width="7"/>
    `,
  }),
]);


const crearTarjetaJugador = () => guardarAsset({
  family: 'characters',
  name: 'session-final-player-card-premium',
  width: 360,
  height: 420,
  defs: `
    <linearGradient id="player-card" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#f4ffff"/>
      <stop offset=".58" stop-color="#fff8dc"/>
      <stop offset="1" stop-color="#f3c16e"/>
    </linearGradient>
    <linearGradient id="avatar-bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#95ecff"/>
      <stop offset="1" stop-color="#ddffff"/>
    </linearGradient>
    <linearGradient id="skin" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#ffd5a2"/>
      <stop offset="1" stop-color="#e99362"/>
    </linearGradient>`,
  body: `
    ${roundedRect({ x: 30, y: 18, width: 260, height: 330, radius: 34, fill: 'url(#player-card)', stroke: '#7a4320', strokeWidth: 12, filter: 'url(#shadow-hard)' })}
    <rect x="58" y="44" width="204" height="202" rx="38" fill="url(#avatar-bg)" stroke="#f2c84c" stroke-width="10"/>
    <circle cx="160" cy="153" r="56" fill="url(#skin)" stroke="#8b4a22" stroke-width="7"/>
    <path d="M101 126c10-45 64-60 105-23 10 9 13 28 5 43-24-23-59-25-103-6-8-2-11-8-7-14Z" fill="#61331d"/>
    <path d="M117 97c24-35 74-31 96 5-31-10-61-8-96 10Z" fill="#4f2a1a" opacity=".96"/>
    <circle cx="139" cy="157" r="7" fill="#4a2618"/>
    <circle cx="182" cy="157" r="7" fill="#4a2618"/>
    <path d="M140 184c16 16 34 16 50 0" fill="none" stroke="#873b24" stroke-width="8" stroke-linecap="round"/>
    <path d="M116 218c22-18 66-18 88 0" fill="#54c3dc"/>
    <circle cx="274" cy="45" r="39" fill="#ffd24b" stroke="#995719" stroke-width="9" filter="url(#glow-gold)"/>
    <path d="M274 23l8 17 19 3-14 13 3 19-16-9-16 9 3-19-14-13 19-3Z" fill="#fff6a6" stroke="#9a5416" stroke-width="4" stroke-linejoin="round"/>
    <rect x="72" y="272" width="176" height="18" rx="9" fill="#ffffff" opacity=".42"/>
  `,
});

const crearDiplomaPremium = () => guardarAsset({
  family: 'characters',
  name: 'session-final-diploma-premium',
  width: 560,
  height: 340,
  defs: `
    <linearGradient id="diploma-paper" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#f2fdff"/>
      <stop offset="1" stop-color="#d2f4fb"/>
    </linearGradient>
    <linearGradient id="diploma-avatar" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#9bedff"/>
      <stop offset="1" stop-color="#dffeff"/>
    </linearGradient>`,
  body: `
    <g transform="translate(152 58) rotate(-7)">
      <path d="M24 28h270l66 47v162H24Z" fill="url(#diploma-paper)" stroke="#4195b4" stroke-width="14" filter="url(#shadow-soft)"/>
      <path d="M294 28v47h66Z" fill="#bfeef7" stroke="#4195b4" stroke-width="8"/>
      <text x="73" y="93" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="28" font-weight="900" fill="#5b3019" transform="rotate(-2 73 93)">DIPLOMA DE</text>
      <text x="73" y="127" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="25" font-weight="900" fill="#5b3019" transform="rotate(-2 73 127)">COMPRADOR</text>
      <text x="73" y="160" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="25" font-weight="900" fill="#5b3019" transform="rotate(-2 73 160)">INTELIGENTE</text>
      <path d="M76 185h122M76 208h152" stroke="#79a9b8" stroke-width="7" stroke-linecap="round" stroke-dasharray="12 10"/>
      <circle cx="316" cy="205" r="38" fill="#f6c344" stroke="#9b5717" stroke-width="10"/>
      <path d="M300 205l13 14 28-32" fill="none" stroke="#fff8c8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <g transform="translate(24 74) rotate(-7)">
      <circle cx="98" cy="98" r="86" fill="url(#diploma-avatar)" stroke="#2c8ca8" stroke-width="12" filter="url(#shadow-soft)"/>
      <circle cx="98" cy="108" r="40" fill="#f2ad7b" stroke="#864922" stroke-width="6"/>
      <path d="M58 90c9-32 47-43 78-17 8 7 10 21 4 32-18-17-44-18-77-5-7-2-8-6-5-10Z" fill="#5d311d"/>
      <circle cx="84" cy="111" r="5" fill="#472718"/>
      <circle cx="112" cy="111" r="5" fill="#472718"/>
      <path d="M84 130c10 11 22 11 33 0" fill="none" stroke="#863b24" stroke-width="6" stroke-linecap="round"/>
      <path d="M42 -8l21 11 17-17 8 23 25-1-15 20 15 20-25-1-8 23-17-17-21 11 4-24-23-12 23-12Z" fill="#ffd047" stroke="#9a5416" stroke-width="7"/>
    </g>
  `,
});
const crearConfeti = () => {
  const colores = ['#ffdb3e', '#48d467', '#21c7ee', '#ff6e66', '#c964f4', '#ffa43b'];
  const piezas = Array.from({ length: 72 }, (_, indice) => {
    const x = (indice * 137) % 1880;
    const y = (indice * 89) % 980;
    const color = colores[indice % colores.length];
    const rotacion = (indice * 23) % 180;
    if (indice % 7 === 0) {
      return `<circle cx="${x}" cy="${y}" r="13" fill="#f7c13d" stroke="#9b5716" stroke-width="4" opacity=".95"/>`;
    }
    return `<rect x="${x}" y="${y}" width="13" height="48" rx="7" fill="${color}" transform="rotate(${rotacion} ${x} ${y})" opacity=".92"/>`;
  }).join('');

  return guardarAsset({
    family: 'effects',
    name: 'session-final-confetti-premium-overlay',
    width: 1920,
    height: 1080,
    body: piezas,
  });
};

const main = async () => {
  const assets = [];

  assets.push(await crearBanner());
  assets.push(await crearTarjetaJugador());
  assets.push(await crearDiplomaPremium());
  assets.push(await crearPanelResumen());
  assets.push(await crearGloboMensaje());
  assets.push(await crearBoton({
    name: 'session-final-history-button-premium',
    blue: false,
  }));
  assets.push(await crearBoton({
    name: 'session-final-return-button-premium',
    blue: true,
  }));
  assets.push(await crearEstrella({ active: true }));
  assets.push(await crearEstrella({ active: false }));
  assets.push(...await crearIconos());
  assets.push(await crearConfeti());

  const manifestPath = path.join(BASE_DIR, 'session-final-approved-assets.manifest.json');
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      note: 'Assets raster aprobados generados de forma determinista. Runtime consume PNG/WebP, no SVG incrustado.',
      officialReference: {
        original: 'sources/session-final-screen3-reference-original.jpeg',
        png: 'sources/session-final-screen3-reference-official.png',
        webp: 'sources/session-final-screen3-reference-official.webp',
        meta: 'sources/session-final-screen3-reference.meta.json',
      },
      sourceStandard: 'awards/session-final-trophy-premium.png',
      assets,
    }, null, 2)}\n`,
  );

  console.log(`Mercado session-final approved assets: ${assets.length}`);
  console.log(path.relative(ROOT, manifestPath).replace(/\\/g, '/'));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});



