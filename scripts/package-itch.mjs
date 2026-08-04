import { deflateRawSync } from 'node:zlib';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const buildDirectory = resolve(projectRoot, 'dist');
const outputPath = resolve(projectRoot, 'itch', 'relaywake-itch.zip');
const maximumFiles = 1_000;
const maximumUncompressedBytes = 500 * 1024 * 1024;

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function createCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crcTable = createCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function localHeader(entry) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(entry.time, 10);
  header.writeUInt16LE(entry.date, 12);
  header.writeUInt32LE(entry.crc, 14);
  header.writeUInt32LE(entry.compressed.length, 18);
  header.writeUInt32LE(entry.source.length, 22);
  header.writeUInt16LE(entry.name.length, 26);
  return header;
}

function centralHeader(entry) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(0x0314, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(entry.time, 12);
  header.writeUInt16LE(entry.date, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.compressed.length, 20);
  header.writeUInt32LE(entry.source.length, 24);
  header.writeUInt16LE(entry.name.length, 28);
  header.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  header.writeUInt32LE(entry.offset, 42);
  return header;
}

function endRecord(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  return record;
}

const paths = walkFiles(buildDirectory).sort();
const names = paths.map((path) => relative(buildDirectory, path).split(sep).join('/'));
if (!names.includes('index.html')) throw new Error('The itch build must contain index.html at ZIP root.');
if (paths.length > maximumFiles) throw new Error(`The itch build contains ${paths.length} files; maximum is ${maximumFiles}.`);

const totalBytes = paths.reduce((total, path) => total + statSync(path).size, 0);
if (totalBytes > maximumUncompressedBytes) {
  throw new Error(`The itch build is ${totalBytes} bytes uncompressed; maximum is ${maximumUncompressedBytes}.`);
}

const indexHtml = readFileSync(resolve(buildDirectory, 'index.html'), 'utf8');
if (/\b(?:src|href)=["']\/(?!\/)/i.test(indexHtml)) {
  throw new Error('The itch build index.html still contains a root-absolute asset URL.');
}

let offset = 0;
const entries = paths.map((path, index) => {
  const source = readFileSync(path);
  const name = Buffer.from(names[index], 'utf8');
  const { date, time } = dosDateTime(statSync(path).mtime);
  const entry = {
    source,
    name,
    date,
    time,
    crc: crc32(source),
    compressed: deflateRawSync(source, { level: 9 }),
    offset,
  };
  offset += 30 + name.length + entry.compressed.length;
  return entry;
});

const localParts = entries.flatMap((entry) => [localHeader(entry), entry.name, entry.compressed]);
const centralParts = entries.flatMap((entry) => [centralHeader(entry), entry.name]);
const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
const archive = Buffer.concat([
  ...localParts,
  ...centralParts,
  endRecord(entries.length, centralSize, offset),
]);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, archive);
process.stdout.write(
  `Created ${relative(projectRoot, outputPath)} with ${entries.length} files (${totalBytes} bytes uncompressed).\n`,
);
