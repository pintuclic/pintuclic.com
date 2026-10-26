import type { ActualizarCotizacionRequest, CotizacionDetalle } from '../dtos/m21-cotizaciones.dto';
import type { EditorFormData } from '../dtos/formularios.dto';

/** Valores iniciales del editor a partir de la cotización (los números pasan a texto para los inputs). */
export function valoresDelEditor(c: CotizacionDetalle): EditorFormData {
  return {
    lineas: c.lineas.map((l) => ({
      idLinea: l.idLinea,
      incluida: true,
      cantidad: String(l.cantidad),
      precio: l.precioAcordado === null ? '' : String(l.precioAcordado),
    })),
    nota: c.notaParaCliente ?? '',
    fechaVencimiento: c.fechaVencimiento ?? '',
  };
}

/** El cuerpo del PUT (R5): las líneas desmarcadas no viajan, y por eso se quitan. */
export function cuerpoDelEditor(f: EditorFormData): ActualizarCotizacionRequest {
  return {
    lineas: f.lineas
      .filter((l) => l.incluida)
      .map((l) => ({
        idLinea: l.idLinea,
        cantidad: Number(l.cantidad),
        precioAcordado: l.precio.trim() === '' ? null : Number(l.precio),
      })),
    notaParaCliente: f.nota.trim() === '' ? null : f.nota.trim(),
    fechaVencimiento: f.fechaVencimiento === '' ? null : f.fechaVencimiento,
  };
}

/** R6: para enviar, cada línea que queda debe tener precio. */
export function faltanPrecios(f: EditorFormData): boolean {
  return f.lineas.some((l) => l.incluida && l.precio.trim() === '');
}

/** Total acordado que verá el cliente, calculado en pantalla mientras se edita (informativo). */
export function totalEnPantalla(f: EditorFormData): number | null {
  const incluidas = f.lineas.filter((l) => l.incluida);
  if (incluidas.some((l) => l.precio.trim() === '' || !/^\d+$/.test(l.cantidad.trim()))) return null;
  const total = incluidas.reduce((s, l) => s + Math.round(Number(l.precio) * Number(l.cantidad) * 100) / 100, 0);
  return Math.round(total * 100) / 100;
}
