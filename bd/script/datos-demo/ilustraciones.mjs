/**
 * Ilustraciones de los productos de demostración: SVG sencillos (sin texto, para no depender de tipografías) que se
 * convierten a WebP con fondo transparente. El fondo transparente importa: la tarjeta del catálogo pinta detrás la
 * muestra del color del producto.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const requireBackend = createRequire(path.resolve(aqui, '../../../backend/package.json'));
const sharp = requireBackend('sharp');

const lado = 640;

function oscurecer(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const defs = (id, base) => `
  <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="${oscurecer(base, 0.78)}"/><stop offset="0.35" stop-color="${base}"/>
    <stop offset="0.65" stop-color="${oscurecer(base, 1.08)}"/><stop offset="1" stop-color="${oscurecer(base, 0.7)}"/>
  </linearGradient>`;

const sombra = (cx, y, rx) => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${Math.round(rx * 0.1)}" fill="#000" opacity="0.16"/>`;

/** Lata o cubeta de pintura: cuerpo metálico, tapa y una banda de color. */
function lata({ acento, alta = false, asa = true }) {
  const ancho = alta ? 300 : 340;
  const x = (800 - ancho) / 2;
  const top = alta ? 190 : 250;
  const bottom = 690;
  const alto = bottom - top;
  return `
  <defs>${defs('m', '#B9BEC4')}${defs('t', '#8F959B')}${defs('c', acento)}</defs>
  ${sombra(400, bottom + 8, ancho / 2 + 10)}
  ${asa ? `<path d="M${x + 14} ${top + 12} C ${x + 14} ${top - 120}, ${x + ancho - 14} ${top - 120}, ${x + ancho - 14} ${top + 12}" fill="none" stroke="#6C7278" stroke-width="12" stroke-linecap="round"/>` : ''}
  <rect x="${x}" y="${top}" width="${ancho}" height="${alto}" rx="22" fill="url(#m)"/>
  <rect x="${x - 6}" y="${top - 8}" width="${ancho + 12}" height="34" rx="12" fill="url(#t)"/>
  <rect x="${x - 6}" y="${bottom - 26}" width="${ancho + 12}" height="34" rx="12" fill="url(#t)"/>
  <rect x="${x + 6}" y="${top + alto * 0.30}" width="${ancho - 12}" height="${alto * 0.42}" fill="url(#c)"/>
  <rect x="${x + 6}" y="${top + alto * 0.30}" width="${ancho - 12}" height="10" fill="#fff" opacity="0.35"/>
  <circle cx="400" cy="${top + alto * 0.51}" r="${ancho * 0.17}" fill="#fff" opacity="0.92"/>
  <circle cx="400" cy="${top + alto * 0.51}" r="${ancho * 0.11}" fill="${acento}"/>
  <rect x="${x + 40}" y="${top + 36}" width="${ancho * 0.3}" height="14" rx="7" fill="#fff" opacity="0.4"/>`;
}

function botella({ acento }) {
  return `
  <defs>${defs('m', '#E9EDF0')}${defs('c', acento)}</defs>
  ${sombra(400, 700, 150)}
  <rect x="360" y="140" width="80" height="70" rx="12" fill="${oscurecer(acento, 0.7)}"/>
  <path d="M330 220 C 330 190, 470 190, 470 220 L 520 300 L 520 690 Q 520 706 504 706 L 296 706 Q 280 706 280 690 L 280 300 Z" fill="url(#m)"/>
  <rect x="280" y="380" width="240" height="230" fill="url(#c)"/>
  <circle cx="400" cy="495" r="52" fill="#fff" opacity="0.92"/><circle cx="400" cy="495" r="32" fill="${acento}"/>`;
}

function aerosol({ acento }) {
  return `
  <defs>${defs('m', '#C9CED3')}${defs('c', acento)}</defs>
  ${sombra(400, 706, 120)}
  <rect x="352" y="90" width="96" height="50" rx="10" fill="#2C3136"/><rect x="384" y="62" width="32" height="34" rx="6" fill="#2C3136"/>
  <path d="M300 170 Q 300 140 330 140 L 470 140 Q 500 140 500 170 L 500 700 Q 500 712 488 712 L 312 712 Q 300 712 300 700 Z" fill="url(#m)"/>
  <rect x="300" y="300" width="200" height="300" fill="url(#c)"/>
  <circle cx="400" cy="450" r="58" fill="#fff" opacity="0.92"/><circle cx="400" cy="450" r="36" fill="${acento}"/>
  <rect x="318" y="170" width="22" height="500" rx="11" fill="#fff" opacity="0.28"/>`;
}

function cartucho({ acento }) {
  return `
  <defs>${defs('m', '#E4E7EA')}${defs('c', acento)}</defs>
  ${sombra(400, 690, 220)}
  <path d="M150 500 L 150 440 L 520 440 L 600 400 L 600 540 L 520 500 Z" fill="${oscurecer(acento, 0.8)}"/>
  <rect x="170" y="380" width="330" height="180" rx="20" fill="url(#m)"/>
  <rect x="170" y="440" width="330" height="60" fill="url(#c)"/>
  <path d="M600 400 L 680 440 L 600 480 Z" fill="${acento}"/>
  <circle cx="335" cy="470" r="22" fill="#fff" opacity="0.9"/>`;
}

function brocha({ acento, ancho = 150 }) {
  const x = 400 - ancho / 2;
  return `
  <defs>${defs('m', '#A9AFB5')}</defs>
  ${sombra(400, 706, ancho)}
  <path d="M${400 - 26} 90 Q ${400 - 40} 200 ${400 - 28} 330 L ${400 + 28} 330 Q ${400 + 40} 200 ${400 + 26} 90 Q 400 60 ${400 - 26} 90 Z" fill="${acento}"/>
  <rect x="${x}" y="330" width="${ancho}" height="120" rx="10" fill="url(#m)"/>
  <rect x="${x}" y="350" width="${ancho}" height="8" fill="#fff" opacity="0.4"/>
  <path d="M${x + 6} 450 L ${x + ancho - 6} 450 L ${x + ancho - 14} 690 L ${x + 14} 690 Z" fill="#E9D8B2"/>
  ${Array.from({ length: 9 }, (_, i) => `<line x1="${x + 20 + i * ((ancho - 40) / 8)}" y1="470" x2="${x + 24 + i * ((ancho - 48) / 8)}" y2="680" stroke="#C9B27E" stroke-width="3" opacity="0.6"/>`).join('')}`;
}

function rodillo({ acento, mini = false }) {
  const largo = mini ? 230 : 380;
  const x = 400 - largo / 2;
  const y = mini ? 330 : 190;
  return `
  <defs>${defs('r', '#F2EFE6')}</defs>
  ${sombra(400, 706, 150)}
  <path d="M${x + largo + 20} ${y + 55} L ${x + largo + 60} ${y + 55} Q ${x + largo + 90} ${y + 55} ${x + largo + 90} ${y + 100} L ${x + largo + 90} ${y + 190} L 410 ${y + 190}" fill="none" stroke="#6C7278" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="385" y="${y + 190}" width="30" height="${mini ? 190 : 330}" rx="12" fill="${acento}"/>
  <rect x="${x}" y="${y}" width="${largo}" height="110" rx="46" fill="url(#r)"/>
  <rect x="${x + 20}" y="${y + 14}" width="${largo - 40}" height="12" rx="6" fill="#fff" opacity="0.7"/>
  ${Array.from({ length: Math.floor(largo / 22) }, (_, i) => `<line x1="${x + 26 + i * 22}" y1="${y + 36}" x2="${x + 26 + i * 22}" y2="${y + 96}" stroke="#D4CEBC" stroke-width="3"/>`).join('')}
  <rect x="${x - 14}" y="${y + 40}" width="22" height="30" rx="8" fill="#6C7278"/>`;
}

function bandeja({ acento }) {
  return `
  <defs>${defs('c', acento)}</defs>
  ${sombra(400, 640, 260)}
  <path d="M120 300 L 680 300 L 600 600 L 200 600 Z" fill="url(#c)"/>
  <path d="M200 600 L 600 600 L 590 640 L 210 640 Z" fill="${oscurecer(acento, 0.7)}"/>
  <path d="M190 350 L 610 350 L 570 540 L 230 540 Z" fill="${oscurecer(acento, 0.82)}"/>
  ${Array.from({ length: 6 }, (_, i) => `<line x1="${230 + i * 14}" y1="${540 - i * 25}" x2="${570 - i * 14}" y2="${540 - i * 25}" stroke="${oscurecer(acento, 0.68)}" stroke-width="5"/>`).join('')}`;
}

function cinta({ acento }) {
  return `
  <defs>${defs('c', acento)}</defs>
  ${sombra(400, 640, 220)}
  <circle cx="400" cy="420" r="230" fill="url(#c)"/>
  <circle cx="400" cy="420" r="230" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="10"/>
  <circle cx="400" cy="420" r="115" fill="#E6D3A8"/><circle cx="400" cy="420" r="98" fill="#fff" opacity="0.96"/>
  <circle cx="400" cy="420" r="230" fill="none" stroke="${oscurecer(acento, 0.75)}" stroke-width="4"/>
  <path d="M570 560 L 690 640 L 600 650 Z" fill="${acento}"/>`;
}

function lija({ acento }) {
  return `
  ${sombra(400, 690, 220)}
  <rect x="190" y="150" width="420" height="540" rx="14" fill="${acento}"/>
  <rect x="190" y="150" width="420" height="120" rx="14" fill="${oscurecer(acento, 0.75)}"/>
  <rect x="215" y="300" width="370" height="360" rx="6" fill="#B5864A"/>
  ${Array.from({ length: 140 }, (_, i) => `<circle cx="${225 + ((i * 53) % 350)}" cy="${312 + ((i * 97) % 336)}" r="${2 + (i % 3)}" fill="${i % 2 ? '#8E6535' : '#D3A76A'}"/>`).join('')}`;
}

function espatula({ acento }) {
  return `
  <defs>${defs('m', '#C3C8CD')}</defs>
  ${sombra(400, 706, 130)}
  <path d="M290 90 L 510 90 L 540 340 L 260 340 Z" fill="url(#m)"/>
  <rect x="285" y="340" width="230" height="40" rx="10" fill="#8E949A"/>
  <rect x="352" y="380" width="96" height="310" rx="40" fill="${acento}"/>
  <rect x="372" y="420" width="12" height="220" rx="6" fill="#fff" opacity="0.3"/>`;
}

function extension({ acento }) {
  return `
  <defs>${defs('m', '#B7BCC2')}${defs('c', acento)}</defs>
  ${sombra(400, 706, 100)}
  <rect x="368" y="80" width="64" height="150" rx="14" fill="${oscurecer(acento, 0.75)}"/>
  <rect x="384" y="210" width="32" height="500" rx="10" fill="url(#m)"/>
  <rect x="368" y="330" width="64" height="26" rx="8" fill="url(#c)"/>
  <rect x="368" y="480" width="64" height="26" rx="8" fill="url(#c)"/>
  <rect x="360" y="560" width="80" height="140" rx="30" fill="${acento}"/>`;
}

const FORMAS = { lata, cubeta: (o) => lata({ ...o, alta: false }), lataAlta: (o) => lata({ ...o, alta: true }), botella, aerosol, cartucho, brocha, rodillo, bandeja, cinta, lija, espatula, extension };

/** WebP cuadrado con fondo transparente. */
export async function ilustracion(forma, opciones) {
  const dibujo = FORMAS[forma];
  if (dibujo === undefined) throw new Error(`Forma de ilustración desconocida: ${forma}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">${dibujo(opciones)}</svg>`;
  return sharp(Buffer.from(svg)).resize(lado, lado).webp({ quality: 84, alphaQuality: 90 }).toBuffer();
}

/** Logotipo de marca de demostración: una pastilla de color con una gota, en PNG. */
export async function logotipo(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120"><rect width="320" height="120" rx="24" fill="${color}"/><path d="M60 24 C 40 56, 34 70, 60 92 C 86 70, 80 56, 60 24 Z" fill="#fff"/><rect x="108" y="46" width="170" height="14" rx="7" fill="#fff" opacity="0.95"/><rect x="108" y="70" width="110" height="10" rx="5" fill="#fff" opacity="0.6"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
