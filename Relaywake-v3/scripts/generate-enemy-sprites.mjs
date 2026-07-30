import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { deflateSync } from 'node:zlib';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const generatorPath = resolve(projectRoot, '..', 'monster-generator.html');
const defaultOutputDirectory = resolve(projectRoot, 'public/assets/enemies');
const sourceStartMarker = '/* ================= 몬스터 스프라이트 코어 (DOM 비의존) ================= */';
const sourceEndMarker = '/* ================= 화면 ================= */';
const animationPhases = [0, 1, 3, 4];

const enemySprites = [
  {
    id: 'crawler',
    file: 'alien.png',
    frameSize: 54,
    seed: 104729,
    overrides: {
      elem: 'bloom', hue: 106, sat: 42, rank: 'common', body: 'crawler',
      eyes: 'pair', mouth: 'fang', crown: 'frill', arms: 'claw', skin: 'spots',
      mat: 'chitin', aura: false,
    },
  },
  {
    id: 'crab',
    file: 'crab.png',
    frameSize: 56,
    seed: 130363,
    overrides: {
      elem: 'ember', hue: 14, sat: 62, rank: 'common', body: 'blob',
      eyes: 'pair', mouth: 'grin', crown: 'horns', arms: 'pincer', skin: 'plain',
      mat: 'chitin', aura: false,
    },
  },
  {
    id: 'brute',
    file: 'brute.png',
    frameSize: 58,
    seed: 155921,
    overrides: {
      elem: 'iron', hue: 208, sat: 12, rank: 'elite', body: 'hulk',
      eyes: 'visor', mouth: 'grin', crown: 'spikes', arms: 'stub', skin: 'cracks',
      mat: 'iron', aura: false,
    },
  },
  {
    id: 'wizard',
    file: 'wizard.png',
    frameSize: 56,
    seed: 196613,
    overrides: {
      elem: 'spirit', hue: 264, sat: 34, rank: 'common', body: 'wisp',
      eyes: 'triple', mouth: 'stitch', crown: 'halo', arms: 'tendril', skin: 'runes',
      mat: 'glass', aura: true,
    },
  },
  {
    id: 'nailhead',
    file: 'nailhead.png',
    frameSize: 56,
    seed: 262147,
    overrides: {
      elem: 'stone', hue: 26, sat: 18, rank: 'elite', body: 'shard',
      eyes: 'hollow', mouth: 'stitch', crown: 'spikes', arms: 'none', skin: 'cracks',
      mat: 'iron', aura: false,
    },
  },
  {
    id: 'gravity',
    file: 'gravity.png',
    frameSize: 58,
    seed: 327673,
    overrides: {
      elem: 'abyss', hue: 238, sat: 44, rank: 'elite', body: 'orb',
      eyes: 'single', mouth: 'tendril', crown: 'halo', arms: 'tendril', skin: 'runes',
      mat: 'glass', aura: true,
    },
  },
  {
    id: 'miniBoss',
    file: 'miniboss.png',
    frameSize: 54,
    seed: 393241,
    overrides: {
      elem: 'ember', hue: 14, sat: 62, rank: 'boss', body: 'maw',
      eyes: 'swarm', mouth: 'gape', crown: 'horns', arms: 'claw', skin: 'scales',
      mat: 'bone', aura: true,
    },
  },
  {
    id: 'finalBoss',
    file: 'boss.png',
    frameSize: 112,
    seed: 524287,
    overrides: {
      elem: 'abyss', hue: 238, sat: 44, rank: 'boss', body: 'coil',
      eyes: 'hollow', mouth: 'gape', crown: 'antler', arms: 'tendril', skin: 'runes',
      mat: 'glass', aura: true,
    },
  },
];

function parseArguments(argv) {
  let outputDirectory = defaultOutputDirectory;
  let check = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check') {
      check = true;
      continue;
    }
    if (argument === '--output-dir') {
      const value = argv[index + 1];
      if (!value) throw new Error('--output-dir requires a path.');
      outputDirectory = resolve(process.cwd(), value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return { check, outputDirectory };
}

function loadGeneratorCore() {
  const html = readFileSync(generatorPath, 'utf8');
  const start = html.indexOf(sourceStartMarker);
  const end = html.indexOf(sourceEndMarker);
  if (start < 0 || end <= start) {
    throw new Error(`Could not locate the DOM-independent monster core in ${generatorPath}.`);
  }

  const source = html.slice(start, end);
  const context = {};
  runInNewContext(
    `${source}\nglobalThis.__relaywakeMonsterCore = { makeSpec, makePalette, buildGrid };`,
    context,
    { filename: generatorPath },
  );

  return {
    ...context.__relaywakeMonsterCore,
    sourceHash: createHash('sha256').update(html).digest('hex'),
  };
}

function colorToRgba(color) {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length !== 6) throw new Error(`Unsupported hex color: ${color}`);
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      255,
    ];
  }

  const match = color.match(
    /^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)%\s*,\s*(-?\d+(?:\.\d+)?)%\s*\)$/,
  );
  if (!match) throw new Error(`Unsupported color: ${color}`);

  const hue = (((Number(match[1]) % 360) + 360) % 360) / 360;
  const saturation = Math.max(0, Math.min(1, Number(match[2]) / 100));
  const lightness = Math.max(0, Math.min(1, Number(match[3]) / 100));
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue * 6;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, second];
  else if (section < 2) [red, green] = [second, chroma];
  else if (section < 3) [green, blue] = [chroma, second];
  else if (section < 4) [green, blue] = [second, chroma];
  else if (section < 5) [red, blue] = [second, chroma];
  else [red, blue] = [chroma, second];

  const offset = lightness - chroma / 2;
  return [
    Math.round((red + offset) * 255),
    Math.round((green + offset) * 255),
    Math.round((blue + offset) * 255),
    255,
  ];
}

function renderSheet(core, definition) {
  const specification = core.makeSpec(definition.seed, definition.overrides);
  const palette = Object.fromEntries(
    Object.entries(core.makePalette(specification)).map(([key, color]) => [
      key,
      colorToRgba(color),
    ]),
  );
  const grids = animationPhases.map((phase) => core.buildGrid(specification, { ph: phase }));
  const sourceHeight = grids[0].length;
  const sourceWidth = grids[0][0].length;
  const width = definition.frameSize * grids.length;
  const height = definition.frameSize;
  const pixels = Buffer.alloc(width * height * 4);

  for (let frame = 0; frame < grids.length; frame += 1) {
    const grid = grids[frame];
    for (let y = 0; y < height; y += 1) {
      const sourceY = Math.min(
        sourceHeight - 1,
        Math.floor(((y + 0.5) * sourceHeight) / height),
      );
      for (let x = 0; x < definition.frameSize; x += 1) {
        const sourceX = Math.min(
          sourceWidth - 1,
          Math.floor(((x + 0.5) * sourceWidth) / definition.frameSize),
        );
        const paletteKey = grid[sourceY][sourceX];
        if (!paletteKey) continue;
        const color = palette[paletteKey];
        const output = (y * width + frame * definition.frameSize + x) * 4;
        pixels[output] = color[0];
        pixels[output + 1] = color[1];
        pixels[output + 2] = color[2];
        pixels[output + 3] = color[3];
      }
    }
  }

  return encodePng(width, height, pixels);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const scanline = y * (stride + 1);
    scanlines[scanline] = 0;
    pixels.copy(scanlines, scanline + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return chunk;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function generate() {
  if (!existsSync(generatorPath)) {
    throw new Error(`Monster generator not found at ${generatorPath}.`);
  }

  const options = parseArguments(process.argv.slice(2));
  const core = loadGeneratorCore();
  if (!options.check) mkdirSync(options.outputDirectory, { recursive: true });

  const mismatches = [];
  for (const definition of enemySprites) {
    const bytes = renderSheet(core, definition);
    const destination = resolve(options.outputDirectory, definition.file);
    if (options.check) {
      if (!existsSync(destination) || !readFileSync(destination).equals(bytes)) {
        mismatches.push(definition.file);
      }
      continue;
    }
    writeFileSync(destination, bytes);
    process.stdout.write(
      `${definition.id}: ${definition.frameSize * 4}x${definition.frameSize}`
        + ` seed=${definition.seed} -> ${destination}\n`,
    );
  }

  if (mismatches.length > 0) {
    throw new Error(`Generated enemy assets are stale: ${mismatches.join(', ')}`);
  }
  if (options.check) {
    process.stdout.write(
      `Enemy assets match monster-generator.html sha256 ${core.sourceHash}.\n`,
    );
  }
}

generate();
