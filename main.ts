// news-image-20261125 — "Sum up 25 November's world news in one image".
//
// A Node 22 program (standard library only, no network at runtime) that draws
// a 1024x1024 front page for Wednesday 25 November 2026 and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png). Every pixel is drawn
// by this file: a small bitmap font, flat colour blocks and simple shapes.
// The output is fully deterministic: same input, same bytes, every run.
//
// The seven stories (all verified against Reuters / AP / Xinhua, 25 Nov 2026):
//   1. Two tankers hit mines in the Strait of Hormuz (Iran says)
//   2. Houthis claim a strike on Saudi Arabia's Ras Tanura refinery
//   3. Wall Street whiplash: Nasdaq -4.6% intraday, ends -0.6%
//   4. Pakistan's first astronaut docks at China's Tiangong station
//   5. Trump unveils new tariffs on 14 trading partners
//   6. RSF drone strikes kill 19 civilians in Sudan's Blue Nile
//   7. Bangladesh raises the garment wage 36% to 17,000 taka
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------
const PAPER = [246, 241, 229];
const PANEL = [255, 253, 246];
const INK = [20, 20, 20];
const NAVY = [15, 42, 74];
const NAVY_DARK = [10, 28, 50];
const RED = [192, 57, 43];
const RED_DARK = [146, 43, 33];
const ORANGE = [230, 126, 34];
const FLAME = [243, 156, 18];
const GOLD = [212, 160, 23];
const GREEN = [30, 125, 50];
const GREEN_DARK = [20, 90, 50];
const TEAL = [20, 85, 110];
const TEAL_DARK = [13, 58, 74];
const SKY = [188, 216, 232];
const SKY_DUSK = [232, 180, 120];
const GREY = [107, 114, 128];
const GREY_LIGHT = [180, 186, 194];
const WHITE = [255, 255, 255];
const CREAM = [255, 209, 102];
const STEEL = [28, 39, 51];

// ---------------------------------------------------------------------------
// Canvas: one RGB buffer, 1024 x 1024
// ---------------------------------------------------------------------------
const img = new Uint8Array(W * H * 3);

function px(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
}

function fill(x, y, w, h, c) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let j = y0; j < y1; j++) {
    let i = (j * W + x0) * 3;
    for (let k = x0; k < x1; k++) {
      img[i] = c[0];
      img[i + 1] = c[1];
      img[i + 2] = c[2];
      i += 3;
    }
  }
}

function hline(x0, x1, y, c) {
  for (let x = x0; x <= x1; x++) px(x, y, c);
}

function vline(x, y0, y1, c) {
  for (let y = y0; y <= y1; y++) px(x, y, c);
}

// Bresenham line.
function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function thickLine(x0, y0, x1, y1, t, c) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const half = Math.floor(t / 2);
  for (let o = -half; o <= half; o++) {
    line(
      Math.round(x0 + nx * o),
      Math.round(y0 + ny * o),
      Math.round(x1 + nx * o),
      Math.round(y1 + ny * o),
      c,
    );
  }
}

function disc(cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) px(cx + x, cy + y, c);
  }
}

function ring(cx, cy, r, c) {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}

// Filled triangle by scanline.
function tri(x0, y0, x1, y1, x2, y2, c) {
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    const edges = [
      [x0, y0, x1, y1],
      [x1, y1, x2, y2],
      [x2, y2, x0, y0],
    ];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const a = Math.ceil(Math.min(...xs));
      const b = Math.floor(Math.max(...xs));
      for (let x = a; x <= b; x++) px(x, y, c);
    }
  }
}

function frame(x, y, w, h, t, c) {
  fill(x, y, w, t, c);
  fill(x, y + h - t, w, t, c);
  fill(x, y, t, h, c);
  fill(x + w - t, y, t, h, c);
}

// ---------------------------------------------------------------------------
// PNG encoding (pure node:zlib, deterministic: filter 0 on every row)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Bitmap font: 5x7 glyphs, drawn scaled by an integer factor.
// Only the characters the front page needs are defined; anything else is blank.
// ---------------------------------------------------------------------------
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['01100', '01100', '00000', '01100', '01100', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '=': ['00000', '00000', '01110', '00000', '01110', '00000', '00000'],
  '|': ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
};

function charWidth(scale) {
  return 6 * scale;
}

function textWidth(s, scale) {
  return s.length * charWidth(scale) - scale;
}

function drawChar(ch, x, y, scale, c) {
  const g = FONT[ch] || FONT[' '];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === '1') fill(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}

function drawText(s, x, y, scale, c) {
  const up = String(s).toUpperCase();
  let cx = x;
  for (const ch of up) {
    drawChar(ch, cx, y, scale, c);
    cx += charWidth(scale);
  }
  return cx - x;
}

function wrapText(s, maxW, scale) {
  const words = String(s).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t, scale) <= maxW) {
      cur = t;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function para(s, x, y, maxW, scale, c, lineH) {
  const lines = wrapText(s, maxW, scale);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x, y + i * lineH, scale, c);
  return y + lines.length * lineH;
}

// Kicker chip: coloured bar with white label text.
function kicker(x, y, label, bg) {
  const w = textWidth(label, 2) + 16;
  fill(x, y, w, 22, bg);
  drawText(label, x + 8, y + 4, 2, WHITE);
  return w;
}

// ---------------------------------------------------------------------------
// Masthead
// ---------------------------------------------------------------------------
function drawMasthead() {
  fill(0, 0, W, 84, NAVY);
  fill(0, 84, W, 4, GOLD);
  drawText('THE WORLD TODAY - ONE DAY IN ONE IMAGE', 24, 10, 2, WHITE);
  drawText('WEDNESDAY, 25 NOVEMBER 2026', 24, 30, 4, WHITE);
  drawText(
    'HORMUZ | SAUDI REFINERY | WALL STREET | TIANGONG | TARIFFS | SUDAN | BANGLADESH',
    24,
    64,
    2,
    CREAM,
  );
}

// ---------------------------------------------------------------------------
// Panel 1 — LEAD: two tankers hit mines in the Strait of Hormuz
// ---------------------------------------------------------------------------
function drawLead() {
  const x = 16;
  const y = 92;
  const w = 992;
  const h = 260;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 6, RED);

  // Kicker
  kicker(x + 16, y + 14, 'LEAD | MIDDLE EAST', RED);

  // Headline, two lines at scale 4
  drawText('2 TANKERS HIT MINES', x + 16, y + 46, 4, INK);
  drawText('IN HORMUZ', x + 16, y + 82, 4, INK);

  // Sub-text, scale 2
  para(
    'Iran says 2 tankers struck mines and caught fire on an unauthorised route; Iran claims 2 US drones downed; US tells citizens: leave Iran now.',
    x + 16,
    y + 126,
    560,
    2,
    INK,
    18,
  );

  // Stat line
  drawText('2 TANKERS  |  0 CASUALTIES REPORTED', x + 16, y + 204, 2, RED_DARK);

  // Alert strip
  fill(x + 16, y + 228, 560, 24, ORANGE);
  drawText('US TELLS ITS CITIZENS: LEAVE IRAN NOW', x + 28, y + 233, 2, WHITE);

  // --- Visual: burning tanker in the strait, right side ---
  const vx = x + 600;
  const vw = 376;
  const vy = y + 14;
  const vh = 232;
  fill(vx, vy, vw, vh, SKY);
  // sun haze
  disc(vx + 320, vy + 34, 22, CREAM);
  // distant headland
  fill(vx, vy + 108, 120, 14, GREY);
  fill(vx + 280, vy + 100, 96, 22, GREY);
  // sea
  fill(vx, vy + 122, vw, vh - 122, TEAL);
  hline(vx, vx + vw - 1, vy + 122, WHITE);
  hline(vx + 20, vx + 140, vy + 150, [255, 255, 255]);
  hline(vx + 200, vx + 340, vy + 168, [255, 255, 255]);
  // tanker hull
  fill(vx + 30, vy + 150, 300, 30, STEEL);
  tri(vx + 330, vy + 150, vx + 366, vy + 165, vx + 330, vy + 180, STEEL);
  // superstructure + funnel
  fill(vx + 250, vy + 118, 48, 32, [220, 224, 228]);
  fill(vx + 262, vy + 104, 24, 14, RED);
  // deck containers
  fill(vx + 60, vy + 132, 40, 18, ORANGE);
  fill(vx + 110, vy + 132, 40, 18, GOLD);
  fill(vx + 160, vy + 132, 40, 18, [90, 140, 90]);
  // flames licking from the hull
  tri(vx + 70, vy + 150, vx + 84, vy + 108, vx + 98, vy + 150, FLAME);
  tri(vx + 96, vy + 150, vx + 112, vy + 118, vx + 128, vy + 150, ORANGE);
  tri(vx + 180, vy + 150, vx + 194, vy + 116, vx + 208, vy + 150, FLAME);
  tri(vx + 206, vy + 150, vx + 220, vy + 124, vx + 234, vy + 150, ORANGE);
  // smoke plume
  disc(vx + 92, vy + 96, 26, GREY);
  disc(vx + 108, vy + 66, 32, GREY_LIGHT);
  disc(vx + 96, vy + 36, 26, GREY);
  disc(vx + 200, vy + 100, 20, GREY);
  disc(vx + 212, vy + 74, 24, GREY_LIGHT);
  // naval mines in the water
  mine(vx + 40, vy + 200);
  mine(vx + 330, vy + 206);
  mine(vx + 250, vy + 216);
}

function mine(cx, cy) {
  disc(cx, cy, 8, INK);
  line(cx - 12, cy, cx + 12, cy, INK);
  line(cx, cy - 12, cx, cy + 12, INK);
  line(cx - 9, cy - 9, cx + 9, cy + 9, INK);
  line(cx - 9, cy + 9, cx + 9, cy - 9, INK);
  disc(cx, cy, 3, GREY_LIGHT);
}

// ---------------------------------------------------------------------------
// Panel 2 — Houthis claim a strike on Saudi Arabia's Ras Tanura refinery
// ---------------------------------------------------------------------------
function drawRasTanura() {
  const x = 16;
  const y = 360;
  const w = 486;
  const h = 224;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 5, ORANGE);

  kicker(x + 12, y + 12, 'SAUDI ARABIA | OIL', ORANGE);
  drawText('HOUTHIS CLAIM STRIKE ON', x + 12, y + 42, 3, INK);
  drawText("SAUDI'S BIGGEST REFINERY", x + 12, y + 68, 3, INK);
  para(
    'Ras Tanura, 550,000 bpd; 4 drones shot down; Brent $94.61, +3.5%.',
    x + 12,
    y + 100,
    462,
    2,
    INK,
    18,
  );

  // Big Brent price
  drawText('BRENT', x + 12, y + 140, 2, GREY);
  drawText('$94.61', x + 12, y + 158, 4, GREEN_DARK);
  tri(x + 190, y + 184, x + 202, y + 162, x + 214, y + 184, GREEN);
  drawText('+3.5%', x + 224, y + 162, 3, GREEN);

  // Refinery silhouette band along the bottom
  const by = y + 196;
  fill(x + 2, by, w - 4, 26, NAVY_DARK);
  fill(x + 330, by - 18, 10, 44, NAVY_DARK);
  fill(x + 348, by - 12, 8, 38, NAVY_DARK);
  fill(x + 380, by - 24, 12, 50, NAVY_DARK);
  fill(x + 400, by - 8, 60, 34, NAVY_DARK);
  disc(x + 336, by - 24, 7, GREY);
  disc(x + 386, by - 30, 8, GREY_LIGHT);
  tri(x + 416, by - 8, x + 424, by - 22, x + 432, by - 8, FLAME);
  drawText('RAS TANURA - 550,000 BPD', x + 12, by + 6, 2, WHITE);
}

// ---------------------------------------------------------------------------
// Panel 3 — Wall Street whiplash
// ---------------------------------------------------------------------------
function drawMarkets() {
  const x = 522;
  const y = 360;
  const w = 486;
  const h = 224;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 5, NAVY);

  kicker(x + 12, y + 12, 'WALL STREET', NAVY);
  drawText('WALL STREET WHIPLASH:', x + 12, y + 42, 3, INK);
  drawText('NASDAQ -4.6%, ENDS -0.6%', x + 12, y + 68, 3, INK);
  para(
    'S&P -0.25% to 7,182.78, Dow +0.33% to 50,182.95; Nvidia -3.9% to $149.30; PCE +3.8% y/y.',
    x + 12,
    y + 100,
    462,
    2,
    INK,
    18,
  );

  // Chart: steep plunge, then a partial recovery (V shape)
  const cx = x + 12;
  const cy = y + 158;
  const cw = 462;
  const ch = 56;
  fill(cx, cy, cw, ch, [244, 246, 248]);
  frame(cx, cy, cw, ch, 1, GREY_LIGHT);
  // grid
  hline(cx, cx + cw - 1, cy + 28, GREY_LIGHT);
  // the line: open high, plunge to -4.6%, recover to -0.6%
  thickLine(cx + 4, cy + 8, cx + 150, cy + 50, 3, RED);
  thickLine(cx + 150, cy + 50, cx + 300, cy + 34, 3, RED);
  thickLine(cx + 300, cy + 34, cx + 458, cy + 22, 3, GREEN);
  drawText('CLOSE -0.6%', cx + 330, cy + 6, 2, GREEN_DARK);
}

// ---------------------------------------------------------------------------
// Panel 4 — Pakistan's first astronaut docks at Tiangong
// ---------------------------------------------------------------------------
function drawShenzhou() {
  const x = 16;
  const y = 592;
  const w = 486;
  const h = 184;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 5, NAVY);

  kicker(x + 12, y + 12, 'SPACE | CHINA', NAVY);
  drawText("PAKISTAN'S FIRST ASTRONAUT", x + 12, y + 42, 3, INK);
  drawText('DOCKS AT TIANGONG', x + 12, y + 68, 3, INK);
  para(
    'Shenzhou-24, launch to docking in 3.5 hours; Ali stays about a week, returns on Shenzhou-23.',
    x + 12,
    y + 100,
    462,
    2,
    INK,
    18,
  );

  // Night-sky band: rocket, station, flags
  const by = y + 152;
  fill(x + 2, by, w - 4, 30, NAVY_DARK);
  // stars
  const stars = [
    [40, 6], [90, 14], [140, 4], [210, 12], [260, 6], [300, 16], [330, 8],
  ];
  for (const [sx, sy] of stars) disc(x + sx, by + sy, 2, WHITE);
  // space station module
  fill(x + 404, by + 10, 64, 10, GREY_LIGHT);
  fill(x + 396, by + 12, 8, 6, GREY_LIGHT);
  fill(x + 468, by + 12, 8, 6, GREY_LIGHT);
  // rocket
  fill(x + 376, by + 4, 10, 20, WHITE);
  tri(x + 376, by + 4, x + 386, by + 4, x + 381, by - 6, WHITE);
  tri(x + 376, by + 20, x + 382, by + 28, x + 386, by + 20, FLAME);
  // flags: China (red) and Pakistan (green) side by side
  fill(x + 12, by + 6, 22, 14, RED);
  disc(x + 18, by + 11, 2, GOLD);
  disc(x + 24, by + 9, 1, GOLD);
  fill(x + 40, by + 6, 22, 14, GREEN);
  disc(x + 48, by + 13, 4, WHITE);
  disc(x + 51, by + 13, 3, GREEN);
  drawText('FIRST FOREIGN ASTRONAUT', x + 72, by + 9, 2, WHITE);
}

// ---------------------------------------------------------------------------
// Panel 5 — Trump hits 14 partners with new tariffs
// ---------------------------------------------------------------------------
function drawTariffs() {
  const x = 522;
  const y = 592;
  const w = 486;
  const h = 184;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 5, RED);

  kicker(x + 12, y + 12, 'TRADE | TARIFFS', RED);
  drawText('TRUMP HITS 14 PARTNERS', x + 12, y + 42, 3, INK);
  drawText('WITH NEW TARIFFS', x + 12, y + 68, 3, INK);
  para(
    'China 20% (40% if truce fails); hearing 25 Jan 2027. Vietnam 20%/35%, India 17%/25%; 18% SE Asia; 15% EU, Japan, Korea; Singapore 10%.',
    x + 12,
    y + 100,
    462,
    2,
    INK,
    16,
  );

  // Ship strip along the bottom: rate range + container ship
  const by = y + 166;
  fill(x + 2, by, w - 4, 16, TEAL);
  drawText('20-40%', x + 12, by + 1, 2, WHITE);
  // ship hull
  fill(x + 110, by + 9, 340, 7, STEEL);
  tri(x + 450, by + 9, x + 470, by + 12, x + 450, by + 16, STEEL);
  // stacked containers
  const cols = [ORANGE, GOLD, [90, 140, 90], RED, TEAL_DARK, ORANGE];
  for (let i = 0; i < 6; i++) fill(x + 118 + i * 52, by + 1, 46, 8, cols[i]);
  // bridge
  fill(x + 436, by + 2, 22, 14, WHITE);
}

// ---------------------------------------------------------------------------
// Panel 6 — 19 killed in RSF drone strikes in Sudan
// ---------------------------------------------------------------------------
function drawSudan() {
  const x = 16;
  const y = 784;
  const w = 486;
  const h = 184;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 5, [90, 60, 40]);

  kicker(x + 12, y + 12, 'SUDAN | BLUE NILE', [90, 60, 40]);
  drawText('19 KILLED IN RSF DRONE', x + 12, y + 42, 3, INK);
  drawText('STRIKES IN SUDAN', x + 12, y + 68, 3, INK);
  para(
    'Rights group says 19 dead in Blue Nile: Damazin homes hit, dam targeted.',
    x + 12,
    y + 100,
    462,
    2,
    INK,
    18,
  );

  // Stat line + drones over a dusk dam
  drawText('19 KILLED, 20 WOUNDED', x + 12, y + 140, 2, RED_DARK);
  const by = y + 162;
  fill(x + 2, by, w - 4, 20, SKY_DUSK);
  // dam wall
  fill(x + 300, by + 4, 180, 16, GREY);
  fill(x + 300, by, 12, 20, GREY);
  // river
  fill(x + 2, by + 16, w - 4, 4, TEAL);
  // three drones
  drone(x + 340, by + 6);
  drone(x + 400, by + 10);
  drone(x + 452, by + 5);
  drawText('TOLL REPORTED WEDNESDAY', x + 12, by + 4, 2, INK);
}

function drone(cx, cy) {
  fill(cx - 8, cy - 2, 16, 4, INK);
  fill(cx - 2, cy - 8, 4, 16, INK);
  disc(cx - 9, cy - 8, 3, GREY);
  disc(cx + 9, cy - 8, 3, GREY);
  disc(cx - 9, cy + 8, 3, GREY);
  disc(cx + 9, cy + 8, 3, GREY);
}

// ---------------------------------------------------------------------------
// Panel 7 — Bangladesh garment wage +36% to 17,000 taka
// ---------------------------------------------------------------------------
function drawBangladesh() {
  const x = 522;
  const y = 784;
  const w = 486;
  const h = 184;
  fill(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  fill(x, y, w, 5, GREEN);

  kicker(x + 12, y + 12, 'BANGLADESH', GREEN);
  drawText('BANGLADESH GARMENT WAGE', x + 12, y + 42, 3, INK);
  drawText('+36% TO 17,000 TAKA', x + 12, y + 68, 3, INK);
  para(
    'After weeks of protests; workers wanted 18,000 taka.',
    x + 12,
    y + 100,
    462,
    2,
    INK,
    18,
  );

  // Big rise + pay-slip strip
  drawText('+36%', x + 12, y + 128, 5, GREEN_DARK);
  drawText('17,000 TAKA / MONTH', x + 150, y + 134, 2, INK);
  drawText('FROM 12,500 TAKA', x + 150, y + 154, 2, GREY);
  // pay slip
  fill(x + 380, y + 128, 92, 40, WHITE);
  frame(x + 380, y + 128, 92, 40, 1, INK);
  drawText('PAY SLIP', x + 388, y + 134, 2, INK);
  drawText('17,000', x + 388, y + 152, 2, GREEN_DARK);
}

// ---------------------------------------------------------------------------
// Footer + main
// ---------------------------------------------------------------------------
function drawFooter() {
  const line =
    'SOURCES: REUTERS, AP, XINHUA - 25 NOV 2026 | CLAIMS ATTRIBUTED AS REPORTED | NEWS-IMAGE-20261125';
  const w = textWidth(line, 1);
  drawText(line, Math.floor((W - w) / 2), 996, 1, GREY);
}

function main() {
  fill(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();
  drawRasTanura();
  drawMarkets();
  drawShenzhou();
  drawTariffs();
  drawSudan();
  drawBangladesh();
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}

main();
