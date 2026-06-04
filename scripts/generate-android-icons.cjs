const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const VIEWBOX = 1024;
const VECTOR_VIEWBOX = 108;
const repoRoot = path.resolve(__dirname, '..');
const assetRoot = path.join(repoRoot, 'assets', 'icon');
const resRoot = path.join(repoRoot, 'android', 'app', 'src', 'main', 'res');

const palette = {
  background: '#0F766E',
  foreground: '#F8FAFC',
  surface: '#CCFBF1',
  surfaceLight: '#ECFEFF',
  ink: '#134E4A',
  chart: '#14B8A6',
  coin: '#F59E0B',
  coinLight: '#FEF3C7',
  check: '#FFFBEB',
};

const shapes = [
  { type: 'roundedRect', x: 306, y: 226, width: 416, height: 312, radius: 54, fill: palette.surface },
  { type: 'roundedRect', x: 386, y: 316, width: 224, height: 28, radius: 14, fill: palette.ink },
  { type: 'roundedRect', x: 386, y: 372, width: 160, height: 28, radius: 14, fill: palette.ink },
  { type: 'roundedRect', x: 238, y: 392, width: 548, height: 348, radius: 90, fill: palette.foreground },
  { type: 'roundedRect', x: 278, y: 472, width: 430, height: 188, radius: 48, fill: palette.surfaceLight },
  { type: 'roundedRect', x: 330, y: 575, width: 40, height: 78, radius: 20, fill: palette.chart },
  { type: 'roundedRect', x: 400, y: 530, width: 40, height: 123, radius: 20, fill: palette.chart },
  { type: 'roundedRect', x: 470, y: 486, width: 40, height: 167, radius: 20, fill: palette.chart },
  { type: 'circle', cx: 704, cy: 560, radius: 74, fill: palette.coin },
  { type: 'circle', cx: 704, cy: 560, radius: 34, fill: palette.coinLight },
  { type: 'line', x1: 664, y1: 558, x2: 694, y2: 588, width: 30, stroke: palette.check },
  { type: 'line', x1: 694, y1: 588, x2: 748, y2: 520, width: 30, stroke: palette.check },
];

const densities = [
  ['mipmap-mdpi', 48],
  ['mipmap-hdpi', 72],
  ['mipmap-xhdpi', 96],
  ['mipmap-xxhdpi', 144],
  ['mipmap-xxxhdpi', 192],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseColor(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1,
  };
}

function createSurface(size) {
  return { size, data: new Uint8ClampedArray(size * size * 4) };
}

function fillSurface(surface, fill) {
  const color = parseColor(fill);
  for (let index = 0; index < surface.data.length; index += 4) {
    surface.data[index] = color.r;
    surface.data[index + 1] = color.g;
    surface.data[index + 2] = color.b;
    surface.data[index + 3] = Math.round(color.a * 255);
  }
}

function blendPixel(surface, x, y, color) {
  if (x < 0 || y < 0 || x >= surface.size || y >= surface.size) return;

  const index = (y * surface.size + x) * 4;
  const sourceAlpha = color.a;
  const targetAlpha = surface.data[index + 3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outAlpha === 0) return;

  surface.data[index] = Math.round((color.r * sourceAlpha + surface.data[index] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  surface.data[index + 1] = Math.round((color.g * sourceAlpha + surface.data[index + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  surface.data[index + 2] = Math.round((color.b * sourceAlpha + surface.data[index + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  surface.data[index + 3] = Math.round(outAlpha * 255);
}

function drawRoundedRect(surface, shape, scale) {
  const color = parseColor(shape.fill);
  const x = shape.x * scale;
  const y = shape.y * scale;
  const width = shape.width * scale;
  const height = shape.height * scale;
  const radius = shape.radius * scale;
  const minX = Math.floor(x);
  const maxX = Math.ceil(x + width);
  const minY = Math.floor(y);
  const maxY = Math.ceil(y + height);

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      const innerX = Math.max(x + radius, Math.min(cx, x + width - radius));
      const innerY = Math.max(y + radius, Math.min(cy, y + height - radius));
      const dx = cx - innerX;
      const dy = cy - innerY;

      if (dx * dx + dy * dy <= radius * radius) {
        blendPixel(surface, px, py, color);
      }
    }
  }
}

function drawCircle(surface, shape, scale) {
  const color = parseColor(shape.fill);
  const cx = shape.cx * scale;
  const cy = shape.cy * scale;
  const radius = shape.radius * scale;
  const radiusSquared = radius * radius;
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      if (dx * dx + dy * dy <= radiusSquared) {
        blendPixel(surface, px, py, color);
      }
    }
  }
}

function drawLine(surface, shape, scale) {
  const color = parseColor(shape.stroke);
  const x1 = shape.x1 * scale;
  const y1 = shape.y1 * scale;
  const x2 = shape.x2 * scale;
  const y2 = shape.y2 * scale;
  const radius = (shape.width * scale) / 2;
  const minX = Math.floor(Math.min(x1, x2) - radius);
  const maxX = Math.ceil(Math.max(x1, x2) + radius);
  const minY = Math.floor(Math.min(y1, y2) - radius);
  const maxY = Math.ceil(Math.max(y1, y2) + radius);
  const lineDx = x2 - x1;
  const lineDy = y2 - y1;
  const lineLengthSquared = lineDx * lineDx + lineDy * lineDy;

  for (let py = minY; py < maxY; py += 1) {
    for (let px = minX; px < maxX; px += 1) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      const t = Math.max(0, Math.min(1, ((cx - x1) * lineDx + (cy - y1) * lineDy) / lineLengthSquared));
      const nearestX = x1 + t * lineDx;
      const nearestY = y1 + t * lineDy;
      const dx = cx - nearestX;
      const dy = cy - nearestY;

      if (dx * dx + dy * dy <= radius * radius) {
        blendPixel(surface, px, py, color);
      }
    }
  }
}

function drawShapes(surface, scale) {
  for (const shape of shapes) {
    if (shape.type === 'roundedRect') drawRoundedRect(surface, shape, scale);
    if (shape.type === 'circle') drawCircle(surface, shape, scale);
    if (shape.type === 'line') drawLine(surface, shape, scale);
  }
}

function downsample(surface, targetSize, factor) {
  const out = new Uint8ClampedArray(targetSize * targetSize * 4);

  for (let y = 0; y < targetSize; y += 1) {
    for (let x = 0; x < targetSize; x += 1) {
      let alphaSum = 0;
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;

      for (let sy = 0; sy < factor; sy += 1) {
        for (let sx = 0; sx < factor; sx += 1) {
          const sourceIndex = ((y * factor + sy) * surface.size + (x * factor + sx)) * 4;
          const alpha = surface.data[sourceIndex + 3] / 255;
          alphaSum += alpha;
          redSum += surface.data[sourceIndex] * alpha;
          greenSum += surface.data[sourceIndex + 1] * alpha;
          blueSum += surface.data[sourceIndex + 2] * alpha;
        }
      }

      const samples = factor * factor;
      const alpha = alphaSum / samples;
      const targetIndex = (y * targetSize + x) * 4;
      out[targetIndex] = alphaSum > 0 ? Math.round(redSum / alphaSum) : 0;
      out[targetIndex + 1] = alphaSum > 0 ? Math.round(greenSum / alphaSum) : 0;
      out[targetIndex + 2] = alphaSum > 0 ? Math.round(blueSum / alphaSum) : 0;
      out[targetIndex + 3] = Math.round(alpha * 255);
    }
  }

  return out;
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(filePath, width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.subarray(y * width * 4, (y + 1) * width * 4)).copy(raw, rowStart + 1);
  }

  fs.writeFileSync(
    filePath,
    Buffer.concat([
      signature,
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      pngChunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

function drawIconPng(filePath, size, mode, antialias = 4) {
  const highSize = size * antialias;
  const surface = createSurface(highSize);
  const scale = highSize / VIEWBOX;

  if (mode === 'square') {
    fillSurface(surface, palette.background);
  }

  if (mode === 'round') {
    drawCircle(surface, { cx: 512, cy: 512, radius: 512, fill: palette.background }, scale);
  }

  drawShapes(surface, scale);
  writePng(filePath, size, size, downsample(surface, size, antialias));
}

function drawBackgroundPng(filePath, size) {
  const surface = createSurface(size);
  fillSurface(surface, palette.background);
  writePng(filePath, size, size, surface.data);
}

function trimNumber(value) {
  return Number(value.toFixed(3)).toString();
}

function toVector(value) {
  return trimNumber((value / VIEWBOX) * VECTOR_VIEWBOX);
}

function roundedRectPath(shape) {
  const x = Number(toVector(shape.x));
  const y = Number(toVector(shape.y));
  const width = Number(toVector(shape.width));
  const height = Number(toVector(shape.height));
  const radius = Number(toVector(shape.radius));
  const right = x + width;
  const bottom = y + height;
  const k = 0.55228475;

  return [
    `M${trimNumber(x + radius)},${trimNumber(y)}`,
    `H${trimNumber(right - radius)}`,
    `C${trimNumber(right - radius + k * radius)},${trimNumber(y)} ${trimNumber(right)},${trimNumber(y + radius - k * radius)} ${trimNumber(right)},${trimNumber(y + radius)}`,
    `V${trimNumber(bottom - radius)}`,
    `C${trimNumber(right)},${trimNumber(bottom - radius + k * radius)} ${trimNumber(right - radius + k * radius)},${trimNumber(bottom)} ${trimNumber(right - radius)},${trimNumber(bottom)}`,
    `H${trimNumber(x + radius)}`,
    `C${trimNumber(x + radius - k * radius)},${trimNumber(bottom)} ${trimNumber(x)},${trimNumber(bottom - radius + k * radius)} ${trimNumber(x)},${trimNumber(bottom - radius)}`,
    `V${trimNumber(y + radius)}`,
    `C${trimNumber(x)},${trimNumber(y + radius - k * radius)} ${trimNumber(x + radius - k * radius)},${trimNumber(y)} ${trimNumber(x + radius)},${trimNumber(y)}`,
    'Z',
  ].join(' ');
}

function circlePath(shape) {
  const cx = Number(toVector(shape.cx));
  const cy = Number(toVector(shape.cy));
  const radius = Number(toVector(shape.radius));
  const k = 0.55228475;

  return [
    `M${trimNumber(cx)},${trimNumber(cy - radius)}`,
    `C${trimNumber(cx + k * radius)},${trimNumber(cy - radius)} ${trimNumber(cx + radius)},${trimNumber(cy - k * radius)} ${trimNumber(cx + radius)},${trimNumber(cy)}`,
    `C${trimNumber(cx + radius)},${trimNumber(cy + k * radius)} ${trimNumber(cx + k * radius)},${trimNumber(cy + radius)} ${trimNumber(cx)},${trimNumber(cy + radius)}`,
    `C${trimNumber(cx - k * radius)},${trimNumber(cy + radius)} ${trimNumber(cx - radius)},${trimNumber(cy + k * radius)} ${trimNumber(cx - radius)},${trimNumber(cy)}`,
    `C${trimNumber(cx - radius)},${trimNumber(cy - k * radius)} ${trimNumber(cx - k * radius)},${trimNumber(cy - radius)} ${trimNumber(cx)},${trimNumber(cy - radius)}`,
    'Z',
  ].join(' ');
}

function vectorShape(shape) {
  if (shape.type === 'line') {
    return `    <path android:pathData="M${toVector(shape.x1)},${toVector(shape.y1)} L${toVector(shape.x2)},${toVector(shape.y2)}" android:strokeColor="${shape.stroke}" android:strokeWidth="${toVector(shape.width)}" android:strokeLineCap="round" />`;
  }

  const pathData = shape.type === 'circle' ? circlePath(shape) : roundedRectPath(shape);
  return `    <path android:fillColor="${shape.fill}" android:fillType="nonZero" android:pathData="${pathData}" />`;
}

function svgShape(shape) {
  if (shape.type === 'roundedRect') {
    return `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.radius}" fill="${shape.fill}" />`;
  }

  if (shape.type === 'circle') {
    return `  <circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.radius}" fill="${shape.fill}" />`;
  }

  return `  <line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.stroke}" stroke-width="${shape.width}" stroke-linecap="round" />`;
}

function writeVectorDrawable(filePath) {
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
    '    android:width="108dp"',
    '    android:height="108dp"',
    '    android:viewportWidth="108"',
    '    android:viewportHeight="108">',
    ...shapes.map(vectorShape),
    '</vector>',
    '',
  ].join('\n');

  fs.writeFileSync(filePath, xml);
}

function writeAdaptiveIcon(filePath) {
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
    '    <background android:drawable="@color/ic_launcher_background" />',
    '    <foreground android:drawable="@drawable/ic_launcher_foreground" />',
    '</adaptive-icon>',
    '',
  ].join('\n');

  fs.writeFileSync(filePath, xml);
}

function writeSourceSvgs() {
  const foreground = shapes.map(svgShape).join('\n');

  fs.writeFileSync(
    path.join(assetRoot, 'icon.svg'),
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">',
      `  <rect width="1024" height="1024" fill="${palette.background}" />`,
      foreground,
      '</svg>',
      '',
    ].join('\n'),
  );

  fs.writeFileSync(
    path.join(assetRoot, 'icon-foreground.svg'),
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">',
      foreground,
      '</svg>',
      '',
    ].join('\n'),
  );

  fs.writeFileSync(
    path.join(assetRoot, 'icon-background.svg'),
    [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">',
      `  <rect width="1024" height="1024" fill="${palette.background}" />`,
      '</svg>',
      '',
    ].join('\n'),
  );
}

function writeAndroidXml() {
  ensureDir(path.join(resRoot, 'drawable'));
  ensureDir(path.join(resRoot, 'drawable-v24'));
  ensureDir(path.join(resRoot, 'values'));
  ensureDir(path.join(resRoot, 'mipmap-anydpi-v26'));

  writeVectorDrawable(path.join(resRoot, 'drawable', 'ic_launcher_foreground.xml'));
  writeVectorDrawable(path.join(resRoot, 'drawable-v24', 'ic_launcher_foreground.xml'));
  writeAdaptiveIcon(path.join(resRoot, 'mipmap-anydpi-v26', 'ic_launcher.xml'));
  writeAdaptiveIcon(path.join(resRoot, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'));

  fs.writeFileSync(
    path.join(resRoot, 'values', 'ic_launcher_background.xml'),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<resources>',
      `    <color name="ic_launcher_background">${palette.background}</color>`,
      '</resources>',
      '',
    ].join('\n'),
  );
}

function writeAndroidPngs() {
  for (const [dirName, size] of densities) {
    const dir = path.join(resRoot, dirName);
    ensureDir(dir);
    drawIconPng(path.join(dir, 'ic_launcher.png'), size, 'square');
    drawIconPng(path.join(dir, 'ic_launcher_round.png'), size, 'round');
    drawIconPng(path.join(dir, 'ic_launcher_foreground.png'), size, 'transparent');
  }
}

function main() {
  ensureDir(assetRoot);
  writeSourceSvgs();
  drawIconPng(path.join(assetRoot, 'icon.png'), 1024, 'square', 2);
  drawIconPng(path.join(assetRoot, 'icon-foreground.png'), 1024, 'transparent', 2);
  drawBackgroundPng(path.join(assetRoot, 'icon-background.png'), 1024);
  writeAndroidXml();
  writeAndroidPngs();

  console.log('Generated Android launcher icons and source assets.');
}

main();
