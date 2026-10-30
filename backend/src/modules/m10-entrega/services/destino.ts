import type { DestinoEnvio } from '../dtos/m10-entrega.dto';

const SEPARADOR_RECIBE = ' · Recibe: ';

/**
 * M07 · R14 guarda la dirección como "<dirección>, <barrio>, <apto> · Recibe: <nombre>, <teléfono>". Se separa
 * lo que se puede; lo que no, queda como texto en `direccion` y los demás campos en null. Municipio y departamento
 * siempre son null hasta que M04/M07 los capturen (P1): no se adivinan.
 */
export function destinoDesdeTexto(texto: string): DestinoEnvio {
  const [lugar = '', recibe = ''] = texto.split(SEPARADOR_RECIBE);
  const partesLugar = lugar.split(',').map((p) => p.trim()).filter(Boolean);
  const partesRecibe = recibe.split(',').map((p) => p.trim()).filter(Boolean);

  const separado = partesLugar.length >= 2 && recibe !== '';
  return {
    direccion: separado ? (partesLugar[0] ?? texto).slice(0, 255) : texto.slice(0, 255),
    barrio: separado ? (partesLugar[1] ?? null) : null,
    complemento: separado ? (partesLugar[2] ?? null) : null,
    municipio: null,
    departamento: null,
    nombreRecibe: partesRecibe[0]?.slice(0, 150) ?? null,
    telefonoRecibe: partesRecibe[1]?.slice(0, 20) ?? null,
  };
}
