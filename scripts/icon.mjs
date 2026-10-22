import { deflateSync } from 'node:zlib';

const table = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc(data) {
  let value = 0xffffffff;
  for (const byte of data) value = (value >>> 8) ^ table[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const header = Buffer.alloc(4); header.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc(Buffer.concat([name, data])));
  return Buffer.concat([header, name, data, checksum]);
}
export function makeIcon(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      const nx = (x + .5) / size, ny = (y + .5) / size;
      const distance = Math.abs(nx - .5) + Math.abs(ny - .47);
      const border = distance > .235 && distance < .267;
      const core = Math.abs(nx - .5) < .025 && ny > .365 && ny < .575;
      const orb = (nx - .5) ** 2 + (ny - .72) ** 2 < .018 ** 2;
      const color = border || core ? [237, 235, 211] : orb ? [208, 179, 117] : [34 + ny * 10, 78 + ny * 18, 62 + ny * 12];
      for (let c = 0; c < 3; c++) raw[row + 1 + x * 3 + c] = Math.round(color[c]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
