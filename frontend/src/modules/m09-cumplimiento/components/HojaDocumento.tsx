import type { HojaPreparacion } from '../dtos/m09-cumplimiento.dto';
import { ETIQUETA_ESTADO, formatearFechaHora } from '@/modules/m08-ordenes/services/presentacion';

/** HU-CUM-06 · La hoja que se lleva a la bodega: qué recoger de cada línea. Nunca trae importes ni datos de pago. */
export function HojaDocumento({ hoja }: { hoja: HojaPreparacion }) {
  return (
    <article className="hoja-imprimible mx-auto w-full max-w-[210mm] rounded-card bg-neutral-white p-6 shadow-card print:shadow-none" aria-labelledby="hoja-titulo">
      <header className="border-b border-neutral-light pb-3">
        <h1 id="hoja-titulo" className="font-title text-xl font-bold text-neutral-black">
          Hoja de preparación
        </h1>
        <p className="mt-1 font-title text-base font-semibold text-corporate">Pedido {hoja.codigo}</p>
        <p className="mt-1 text-sm text-neutral-dark">
          Generada el <time dateTime={hoja.generadaEn}>{formatearFechaHora(hoja.generadaEn)}</time> · El pedido estaba{' '}
          <strong>{ETIQUETA_ESTADO[hoja.estado].toLowerCase()}</strong>
        </p>
      </header>

      <table className="mt-4 w-full border-collapse text-left text-sm">
        <caption className="sr-only">Productos del pedido {hoja.codigo} para recoger en bodega</caption>
        <thead>
          <tr className="border-b border-neutral-dark text-xs uppercase text-neutral-medium">
            <th scope="col" className="w-8 py-2 pr-2">
              <span className="sr-only">Recogido</span>
            </th>
            <th scope="col" className="py-2 pr-2">Producto</th>
            <th scope="col" className="py-2 pr-2">Presentación</th>
            <th scope="col" className="py-2 pr-2 text-right">Cant.</th>
            <th scope="col" className="py-2">Base a usar</th>
          </tr>
        </thead>
        <tbody>
          {hoja.lineas.map((linea) => (
            <tr key={linea.numeroLinea} className="border-b border-neutral-light align-top">
              <td className="py-2 pr-2">
                <span className="inline-block h-4 w-4 rounded-sm border-2 border-neutral-dark" aria-hidden="true" />
              </td>
              <td className="py-2 pr-2 font-medium text-neutral-black">
                {linea.nombreProducto}
                {linea.colorSolicitado && <span className="block text-xs font-normal text-neutral-dark">Color: {linea.colorSolicitado}</span>}
              </td>
              <td className="py-2 pr-2 text-neutral-dark">{linea.varianteCopia}</td>
              <td className="py-2 pr-2 text-right font-semibold text-neutral-black">{linea.cantidad}</td>
              <td className="py-2 text-neutral-dark">{linea.baseConsumida ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-xs text-neutral-medium">
        Esta hoja muestra el pedido tal como estaba al generarla. Si cambió después, vuelva a generarla.
      </p>
    </article>
  );
}
