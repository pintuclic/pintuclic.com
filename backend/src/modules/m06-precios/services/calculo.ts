import type {
  AvisoCalculo,
  Calculo,
  DescuentoAplicado,
  DescuentoEmpresaCalculo,
  LineaCalculada,
  MotivoCupon,
  MotivoNoVendible,
  PerfilComercial,
  ResultadoCupon,
  TipoValor,
} from '../dtos/m06-precios.dto';
import { aCentavos, aPuntosBasicos, dePesos, porcentajeDe, repartirProporcional } from './dinero';
import type { OfertaResuelta } from './motor-eventos';

/**
 * Cálculo de precios de un carrito (contrato de M06, R1–R17). Funciones PURAS: no leen base de datos
 * ni reloj. Todo en centavos enteros (R9). Los datos ya resueltos (precio base, oferta de cada línea,
 * tipo de cliente, cupón candidato) los junta `PreciosService`.
 */

export interface LineaParaCalcular {
  indice: number;
  idVariante: number;
  idColor: number | null;
  cantidad: number;
  vendible: boolean;
  motivoNoVendible: MotivoNoVendible | null;
  excluidoDeDescuentos: boolean;
  /** Precio unitario de M01; null si no es vendible. */
  precioBase: number | null;
  /** R3: precio pactado en una cotización. */
  precioAcordado: number | null;
  /** La mejor regla de evento que cubre la línea (R5–R7); null si ninguna. */
  oferta: OfertaResuelta | null;
}

export interface TipoClienteParaCalcular {
  idSubRolEmpresa: number;
  nombre: string;
  porcentaje: number;
  montoMinimoCompra: number;
  tope: number;
}

/** Resultado de validar el cupón contra la base (vigencia, usos, audiencia): lo previo al cálculo. */
export type CuponParaCalcular =
  | { codigo: string; valido: false; motivo: MotivoCupon }
  | {
      codigo: string;
      valido: true;
      idCupon: number;
      nombre: string;
      tipoValor: TipoValor;
      valor: number;
      montoMinimoCompra: number | null;
    };

export interface EntradaCalculo {
  lineas: readonly LineaParaCalcular[];
  perfil: PerfilComercial;
  /** Null si el cliente no es empresa o su tipo no existe / está inactivo (R10, R20). */
  tipoCliente: TipoClienteParaCalcular | null;
  cupon: CuponParaCalcular | null;
  /** Porcentaje de IVA (R16). */
  tasaIva: number;
  /** `comercial.umbral_sugerir_empresa`; null si no se pudo leer. */
  umbralSugerirEmpresa: number | null;
  /** Hay una sesión: el aviso de sugerir cuenta empresa solo es para clientes registrados (R12). */
  registrado: boolean;
  calculadoEn: Date;
}

interface Trabajo {
  linea: LineaParaCalcular;
  /** Los pasos de descuento solo corren si la línea puede recibirlos (R2, R3). */
  elegible: boolean;
  subtotalInicial: number;
  actual: number;
  descuentos: DescuentoAplicado[];
  porEvento: number;
  porEmpresa: number;
  porCupon: number;
}

function agregarDescuento(
  t: Trabajo,
  tipoOrigen: DescuentoAplicado['tipoOrigen'],
  idRegla: number,
  origen: string,
  porcentaje: number | null,
  importe: number,
): void {
  if (importe <= 0) return;
  t.descuentos.push({
    ordenAplicacion: t.descuentos.length + 1,
    tipoOrigen,
    idRegla,
    origen: origen.slice(0, 150),
    porcentaje,
    importe: dePesos(importe),
  });
  t.actual -= importe;
}

export function calcularCarrito(entrada: EntradaCalculo): Calculo {
  const trabajos: Trabajo[] = entrada.lineas.map((linea) => {
    const vendible = linea.vendible && (linea.precioAcordado !== null || linea.precioBase !== null);
    const unitario = vendible ? aCentavos(linea.precioAcordado ?? linea.precioBase ?? 0) : 0;
    const subtotal = unitario * linea.cantidad;
    return {
      linea,
      elegible: vendible && linea.precioAcordado === null && !linea.excluidoDeDescuentos,
      subtotalInicial: subtotal,
      actual: subtotal,
      descuentos: [],
      porEvento: 0,
      porEmpresa: 0,
      porCupon: 0,
    };
  });
  const vendibles = trabajos.filter(
    (t) => t.linea.vendible && (t.linea.precioAcordado !== null || t.linea.precioBase !== null),
  );

  // Paso 1 · evento (R1, R5–R7)
  for (const t of vendibles) {
    const o = t.linea.oferta;
    if (!t.elegible || o === null) continue;
    const importe = porcentajeDe(t.actual, aPuntosBasicos(o.porcentaje));
    agregarDescuento(t, 'evento', o.idEvento, o.nombreEvento, o.porcentaje, importe);
    t.porEvento = importe;
  }
  const totalTrasEventos = vendibles.reduce((suma, t) => suma + t.actual, 0);

  // Paso 2 · descuento de empresa (R10, R11)
  const elegiblesEmpresa = vendibles.filter((t) => t.elegible && t.actual > 0);
  let empresa: DescuentoEmpresaCalculo | null = null;
  const avisos: AvisoCalculo[] = [];
  if (entrada.tipoCliente !== null) {
    const tc = entrada.tipoCliente;
    const minimo = aCentavos(tc.montoMinimoCompra);
    const cumpleMinimo = totalTrasEventos >= minimo;
    const aplicado = cumpleMinimo && elegiblesEmpresa.length > 0;
    let totalEmpresa = 0;
    if (aplicado) {
      const bp = aPuntosBasicos(tc.porcentaje);
      let ahorros = elegiblesEmpresa.map((t) => porcentajeDe(t.actual, bp));
      const suma = ahorros.reduce((a, b) => a + b, 0);
      const tope = aCentavos(tc.tope);
      const recortado = tope > 0 && suma > tope;
      if (recortado) ahorros = repartirProporcional(tope, ahorros);
      elegiblesEmpresa.forEach((t, i) => {
        const ahorro = ahorros[i] ?? 0;
        // Con tope el importe ya no es "porcentaje × base": no se informa un porcentaje que no cuadra.
        agregarDescuento(
          t,
          'empresa',
          tc.idSubRolEmpresa,
          `Descuento empresa · ${tc.nombre}`,
          recortado ? null : tc.porcentaje,
          ahorro,
        );
        t.porEmpresa = ahorro;
        totalEmpresa += ahorro;
      });
    }
    empresa = {
      idSubRolEmpresa: tc.idSubRolEmpresa,
      tipo: tc.nombre,
      porcentaje: tc.porcentaje,
      montoMinimoCompra: tc.montoMinimoCompra,
      totalCarrito: dePesos(totalTrasEventos),
      aplicado,
      faltante: cumpleMinimo ? null : dePesos(minimo - totalTrasEventos),
      descuento: dePesos(totalEmpresa),
    };
    // R12 (a): solo avisa si realmente habría algo a lo que aplicar el descuento.
    if (!cumpleMinimo && elegiblesEmpresa.length > 0) {
      avisos.push({
        tipo: 'empresa_falta_monto',
        tipoCliente: tc.nombre,
        porcentaje: tc.porcentaje,
        montoMinimo: tc.montoMinimoCompra,
        faltante: dePesos(minimo - totalTrasEventos),
      });
    }
  }

  // Paso 3 · cupón (R13, R14)
  let cupon: ResultadoCupon | null = null;
  if (entrada.cupon !== null) {
    const c = entrada.cupon;
    if (!c.valido) {
      cupon = rechazoCupon(c.codigo, c.motivo, null);
    } else {
      const elegibles = vendibles.filter((t) => t.elegible && t.actual > 0);
      const sumaElegible = elegibles.reduce((suma, t) => suma + t.actual, 0);
      if (elegibles.length === 0) {
        cupon = rechazoCupon(c.codigo, 'sin_lineas_elegibles', null);
      } else if (c.montoMinimoCompra !== null && sumaElegible < aCentavos(c.montoMinimoCompra)) {
        cupon = rechazoCupon(c.codigo, 'monto_minimo_no_alcanzado', c.montoMinimoCompra);
      } else {
        const origen = `Cupón ${c.codigo}`;
        let total = 0;
        if (c.tipoValor === 'porcentaje') {
          const bp = aPuntosBasicos(c.valor);
          for (const t of elegibles) {
            const importe = porcentajeDe(t.actual, bp);
            agregarDescuento(t, 'cupon', c.idCupon, origen, c.valor, importe);
            t.porCupon = importe;
            total += importe;
          }
        } else {
          const reparto = repartirProporcional(
            Math.min(aCentavos(c.valor), sumaElegible),
            elegibles.map((t) => t.actual),
          );
          elegibles.forEach((t, i) => {
            const importe = reparto[i] ?? 0;
            agregarDescuento(t, 'cupon', c.idCupon, origen, null, importe);
            t.porCupon = importe;
            total += importe;
          });
        }
        cupon = {
          codigo: c.codigo,
          aplicado: true,
          motivoRechazo: null,
          montoMinimo: null,
          descuento: dePesos(total),
          idCupon: c.idCupon,
        };
      }
    }
  }

  // R12 (b): invitación a pedir la cuenta empresa
  if (
    entrada.perfil.tipo === 'particular' &&
    entrada.registrado &&
    entrada.umbralSugerirEmpresa !== null &&
    totalTrasEventos > 0 &&
    totalTrasEventos >= aCentavos(entrada.umbralSugerirEmpresa)
  ) {
    avisos.push({ tipo: 'sugerir_cuenta_empresa', umbral: entrada.umbralSugerirEmpresa });
  }

  // Totales e IVA (R16)
  const subtotalInicial = vendibles.reduce((s, t) => s + t.subtotalInicial, 0);
  const porEventos = vendibles.reduce((s, t) => s + t.porEvento, 0);
  const porEmpresa = vendibles.reduce((s, t) => s + t.porEmpresa, 0);
  const porCupon = vendibles.reduce((s, t) => s + t.porCupon, 0);
  const total = subtotalInicial - porEventos - porEmpresa - porCupon;
  const base = Number(
    (BigInt(total) * 10000n + BigInt(Math.floor((10000 + aPuntosBasicos(entrada.tasaIva)) / 2))) /
      BigInt(10000 + aPuntosBasicos(entrada.tasaIva)),
  );

  const lineas: LineaCalculada[] = trabajos.map((t) => lineaCalculada(t));

  return {
    lineas,
    cupon,
    empresa,
    avisos,
    resumen: {
      subtotalInicial: dePesos(subtotalInicial),
      descuentoEventos: dePesos(porEventos),
      descuentoEmpresa: dePesos(porEmpresa),
      descuentoCupon: dePesos(porCupon),
      descuentoTotal: dePesos(porEventos + porEmpresa + porCupon),
      total: dePesos(total),
      tasaIva: entrada.tasaIva,
      baseSinImpuesto: dePesos(base),
      importeIva: dePesos(total - base),
    },
    perfil: entrada.perfil,
    calculadoEn: entrada.calculadoEn.toISOString(),
  };
}

function rechazoCupon(codigo: string, motivo: MotivoCupon, montoMinimo: number | null): ResultadoCupon {
  return { codigo, aplicado: false, motivoRechazo: motivo, montoMinimo, descuento: 0, idCupon: null };
}

function lineaCalculada(t: Trabajo): LineaCalculada {
  const l = t.linea;
  const precioado = l.vendible && (l.precioAcordado !== null || l.precioBase !== null);
  if (!precioado) {
    return {
      indice: l.indice,
      idVariante: l.idVariante,
      idColor: l.idColor,
      cantidad: l.cantidad,
      vendible: false,
      motivoNoVendible: l.motivoNoVendible,
      excluidoDeDescuentos: l.excluidoDeDescuentos,
      precioAcordado: false,
      precioInicial: null,
      subtotalInicial: null,
      descuentos: [],
      descuentoTotal: null,
      subtotal: null,
      precioUnitarioFinal: null,
    };
  }
  const descuentoTotal = t.subtotalInicial - t.actual;
  return {
    indice: l.indice,
    idVariante: l.idVariante,
    idColor: l.idColor,
    cantidad: l.cantidad,
    vendible: true,
    motivoNoVendible: null,
    excluidoDeDescuentos: l.excluidoDeDescuentos,
    precioAcordado: l.precioAcordado !== null,
    precioInicial: l.precioAcordado ?? l.precioBase,
    subtotalInicial: dePesos(t.subtotalInicial),
    descuentos: t.descuentos,
    descuentoTotal: dePesos(descuentoTotal),
    subtotal: dePesos(t.actual),
    precioUnitarioFinal: dePesos(Math.round(t.actual / l.cantidad)),
  };
}
