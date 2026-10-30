import type { DestinoEnvio } from '../dtos/m10-entrega.dto';

const SEPARADOR = ' · ';

/** Valor de un segmento «Clave: valor» del texto, o null si no está. */
function segmento(segmentos: readonly string[], clave: string): string | null {
  const prefijo = `${clave}: `;
  const hallado = segmentos.find((s) => s.startsWith(prefijo));
  const valor = hallado?.slice(prefijo.length).trim();
  return valor ? valor : null;
}

/**
 * M07 · R14 guarda la dirección como "<dirección>, <barrio>, <apto> · Recibe: <nombre>, <teléfono>" y, si se
 * capturaron (P1), le añade " · Municipio: <m>" y " · Departamento: <d>". Se separa lo que se puede; lo que no, queda
 * como texto en `direccion` y los demás campos en null. Nada se adivina.
 */
export function destinoDesdeTexto(texto: string): DestinoEnvio {
  const segmentos = texto.split(SEPARADOR);
  const lugar = segmentos[0] ?? '';
  const recibe = segmento(segmentos, 'Recibe') ?? '';
  const partesLugar = lugar.split(',').map((p) => p.trim()).filter(Boolean);
  const partesRecibe = recibe.split(',').map((p) => p.trim()).filter(Boolean);

  const separado = partesLugar.length >= 2 && recibe !== '';
  return {
    direccion: separado ? (partesLugar[0] ?? texto).slice(0, 255) : texto.slice(0, 255),
    barrio: separado ? (partesLugar[1] ?? null) : null,
    complemento: separado ? (partesLugar[2] ?? null) : null,
    municipio: segmento(segmentos, 'Municipio')?.slice(0, 100) ?? null,
    departamento: segmento(segmentos, 'Departamento')?.slice(0, 100) ?? null,
    nombreRecibe: partesRecibe[0]?.slice(0, 150) ?? null,
    telefonoRecibe: partesRecibe[1]?.slice(0, 20) ?? null,
  };
}
