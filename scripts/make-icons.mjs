/**
 * Regenerates the PWA / home-screen icons in public/.
 * Run: node scripts/make-icons.mjs   (sharp comes in with Next.js)
 */
import sharp from "sharp";
import { mkdirSync } from "fs";

const PURPLE = "#63459a";
const CREAM = "#f7f5f0";

const glyph = (size, inset) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${inset ? 0 : 112}" fill="${PURPLE}"/>
  <g transform="translate(0 ${inset ? 18 : 0}) scale(${inset ? 0.78 : 1}) translate(${inset ? 72 : 0} ${inset ? 60 : 0})">
    <text x="256" y="238" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Helvetica, Arial, sans-serif"
          font-size="176" font-weight="700" fill="${CREAM}" letter-spacing="-6">M×D</text>
    <rect x="120" y="292" width="272" height="7" rx="3.5" fill="${CREAM}" opacity="0.5"/>
    <g fill="${CREAM}" opacity="0.92">
      <circle cx="150" cy="352" r="17"/>
      <circle cx="214" cy="352" r="17"/>
      <circle cx="278" cy="352" r="17"/>
      <circle cx="342" cy="352" r="17"/>
    </g>
  </g>
</svg>`;

mkdirSync("public", { recursive: true });

const jobs = [
  ["public/icon-192.png", 192, false],
  ["public/icon-512.png", 512, false],
  ["public/icon-maskable-512.png", 512, true],
  ["public/apple-touch-icon.png", 180, false],
];

for (const [out, size, inset] of jobs) {
  await sharp(Buffer.from(glyph(size, inset))).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}
