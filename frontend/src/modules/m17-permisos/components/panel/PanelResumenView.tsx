'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, ClipboardList, Megaphone, Percent, ShoppingCart, Users, Wallet } from 'lucide-react';
import { AdminPageHeader, AdminStatCard, Alert, Button, SegmentedTabs, Skeleton } from '@/core/components';
import { useAuthStore } from '@/core/store/authStore';
import type { ResumenPanel } from '../../dtos/m17-panel-resumen.dto';
import { obtenerResumenPanel } from '../../services/panel-resumen.service';
import { formatoEntero, formatoPesosCorto, formatoPorcentaje, variacion } from '../../services/panel-formato';
import { AccesosPanel } from './AccesosPanel';
import { BloqueCifras, type CifraBloque } from './BloqueCifras';
import { EstadosCotizaciones } from './EstadosCotizaciones';
import { GraficoCotizaciones } from './GraficoCotizaciones';
import { PendientesPanel } from './PendientesPanel';
import { SeccionPanel } from './SeccionPanel';
import { TopProductos } from './TopProductos';

type Periodo = 'd7' | 'd30' | 'd90';
const DIAS: Record<Periodo, 7 | 30 | 90> = { d7: 7, d30: 30, d90: 90 };
const OPCIONES = [
  { value: 'd7', label: '7 días' },
  { value: 'd30', label: '30 días' },
  { value: 'd90', label: '90 días' },
] as const satisfies ReadonlyArray<{ value: Periodo; label: string }>;

interface Estado {
  datos: ResumenPanel | null;
  cargando: boolean;
  error: string | null;
}

function fechaDeHoy(): string {
  const texto = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Pantalla de inicio del panel (contrato M17 · resumen): cifras reales, lo pendiente y atajos, según los permisos de cada persona. */
export const PanelResumenView: React.FC = () => {
  const usuario = useAuthStore((s) => s.usuario);
  const primerNombre = usuario?.nombre?.trim().split(/\s+/)[0] || 'equipo';
  const [periodo, setPeriodo] = useState<Periodo>('d30');
  const [estado, setEstado] = useState<Estado>({ datos: null, cargando: true, error: null });
  const [intento, setIntento] = useState(0);
  const hoy = useMemo(fechaDeHoy, []);

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    obtenerResumenPanel(DIAS[periodo])
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: null }))
      .catch(() => vigente && setEstado((e) => ({ ...e, cargando: false, error: 'No se pudo cargar el resumen. Intenta de nuevo.' })));
    return () => {
      vigente = false;
    };
  }, [periodo, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  const { datos } = estado;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={`¡Hola, ${primerNombre}!`}
        subtitle="Esto es lo que está pasando hoy en la tienda."
        metaPrimary={hoy}
        actions={
          <div className="mb-2 w-full sm:w-[260px]">
            <SegmentedTabs options={OPCIONES} value={periodo} onChange={setPeriodo} ariaLabel="Periodo de las cifras" panelId="panel-resumen" idPrefix="periodo-resumen" />
          </div>
        }
      />

      <div id="panel-resumen" role="tabpanel" aria-labelledby={`periodo-resumen-tab-${periodo}`} aria-busy={estado.cargando} className="space-y-8">
        {estado.error !== null && (
          <Alert variant="error">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{estado.error}</span>
              <Button variant="outline" size="sm" onClick={reintentar}>
                Reintentar
              </Button>
            </div>
          </Alert>
        )}

        {datos === null ? (
          estado.error === null && <CargandoResumen />
        ) : (
          <ContenidoResumen datos={datos} refrescando={estado.cargando} />
        )}
      </div>
    </div>
  );
};

const CargandoResumen: React.FC = () => (
  <div className="space-y-6" aria-hidden="true">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Skeleton className="h-64 w-full lg:col-span-2" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

interface Kpi {
  clave: string;
  label: string;
  value: string;
  trendText?: string;
  trendSubtext?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconBgColor: string;
}

/** Las cuatro cifras grandes: lo de ventas si la persona lo ve; si no, lo más útil de lo que sí ve. */
function cifrasGrandes(d: ResumenPanel): Kpi[] {
  const kpis: Kpi[] = [];
  const { negocio, carritos, catalogo, descuentos, patrocinios, personas } = d;
  if (negocio !== null) {
    const v = (c: typeof negocio.cotizaciones) => variacion(c);
    kpis.push(
      {
        clave: 'cotizaciones',
        label: 'Cotizaciones recibidas',
        value: formatoEntero(negocio.cotizaciones.actual),
        trendText: v(negocio.cotizaciones).texto,
        trendType: v(negocio.cotizaciones).tipo,
        trendSubtext: 'frente al periodo anterior',
        icon: <ClipboardList className="h-5 w-5" />,
        iconBgColor: 'bg-highlight/25 text-neutral-black',
      },
      {
        clave: 'valor-cotizado',
        label: 'Valor cotizado',
        value: formatoPesosCorto(negocio.valorCotizado.actual),
        trendText: v(negocio.valorCotizado).texto,
        trendType: v(negocio.valorCotizado).tipo,
        trendSubtext: 'frente al periodo anterior',
        icon: <Wallet className="h-5 w-5" />,
        iconBgColor: 'bg-subaction text-action',
      },
      {
        clave: 'valor-aprobado',
        label: 'Valor aceptado',
        value: formatoPesosCorto(negocio.valorAprobado.actual),
        trendText: negocio.tasaAprobacion === null ? 'Sin cotizaciones resueltas' : `${formatoPorcentaje(negocio.tasaAprobacion)} de aceptación`,
        trendType: negocio.tasaAprobacion === null ? 'neutral' : negocio.tasaAprobacion >= 50 ? 'positive' : 'neutral',
        icon: <Wallet className="h-5 w-5" />,
        iconBgColor: 'bg-conversion/15 text-conversion-hover',
      },
    );
  }
  if (carritos !== null) {
    kpis.push({
      clave: 'carritos',
      label: 'Carritos con productos',
      value: formatoEntero(carritos.activos),
      trendText: `${formatoEntero(carritos.unidades)} ${carritos.unidades === 1 ? 'unidad' : 'unidades'}`,
      trendSubtext: 'activos en la última semana',
      trendType: 'neutral',
      icon: <ShoppingCart className="h-5 w-5" />,
      iconBgColor: 'bg-subaction text-corporate',
    });
  }
  if (catalogo !== null) {
    kpis.push(
      {
        clave: 'productos',
        label: 'Productos activos',
        value: formatoEntero(catalogo.productosActivos),
        trendText: `${formatoEntero(catalogo.variantesActivas)} presentaciones`,
        trendType: 'neutral',
        icon: <Boxes className="h-5 w-5" />,
        iconBgColor: 'bg-subaction text-action',
      },
      {
        clave: 'agotadas',
        label: 'Presentaciones agotadas',
        value: formatoEntero(catalogo.variantesAgotadas),
        trendText: `${formatoEntero(catalogo.variantesExistenciaBaja)} con existencia baja`,
        trendType: catalogo.variantesAgotadas > 0 ? 'negative' : 'positive',
        icon: <Boxes className="h-5 w-5" />,
        iconBgColor: 'bg-danger/10 text-danger',
      },
    );
  }
  if (descuentos !== null) {
    const u = variacion(descuentos.usosCupon);
    kpis.push({
      clave: 'cupones',
      label: 'Cupones usados',
      value: formatoEntero(descuentos.usosCupon.actual),
      trendText: u.texto,
      trendType: u.tipo,
      trendSubtext: `${formatoPesosCorto(descuentos.descuentoOtorgado.actual)} en descuentos`,
      icon: <Percent className="h-5 w-5" />,
      iconBgColor: 'bg-danger/10 text-danger',
    });
  }
  if (patrocinios !== null) {
    const c = variacion(patrocinios.clics);
    kpis.push({
      clave: 'clics',
      label: 'Clics en publicidad',
      value: formatoEntero(patrocinios.clics.actual),
      trendText: c.texto,
      trendType: c.tipo,
      trendSubtext: 'frente al periodo anterior',
      icon: <Megaphone className="h-5 w-5" />,
      iconBgColor: 'bg-subaction text-corporate',
    });
  }
  if (personas !== null) {
    kpis.push({
      clave: 'clientes',
      label: 'Clientes activos',
      value: formatoEntero(personas.clientesNaturales + personas.clientesEmpresa),
      trendText: `${formatoEntero(personas.clientesEmpresa)} empresas`,
      trendType: 'neutral',
      icon: <Users className="h-5 w-5" />,
      iconBgColor: 'bg-highlight/25 text-neutral-black',
    });
  }
  return kpis.slice(0, 4);
}

const ContenidoResumen: React.FC<{ datos: ResumenPanel; refrescando: boolean }> = ({ datos, refrescando }) => {
  const { negocio, catalogo, descuentos, patrocinios, personas } = datos;
  const kpis = cifrasGrandes(datos);

  const bloques: Array<React.ReactNode> = [];
  if (catalogo !== null) {
    const cifras: CifraBloque[] = [
      { etiqueta: 'Productos activos', valor: formatoEntero(catalogo.productosActivos), href: '/admin/catalogo' },
      { etiqueta: 'Presentaciones activas', valor: formatoEntero(catalogo.variantesActivas), href: '/admin/catalogo' },
      { etiqueta: 'Agotadas', valor: formatoEntero(catalogo.variantesAgotadas), alerta: catalogo.variantesAgotadas > 0, href: '/admin/inventario' },
      { etiqueta: `Con existencia baja`, valor: formatoEntero(catalogo.variantesExistenciaBaja), alerta: catalogo.variantesExistenciaBaja > 0, href: '/admin/inventario' },
    ];
    bloques.push(<BloqueCifras key="catalogo" id="bloque-catalogo" titulo="Catálogo e inventario" icono={<Boxes className="h-5 w-5" />} colorIcono="bg-subaction text-action" cifras={cifras} />);
  }
  if (descuentos !== null) {
    const cifras: CifraBloque[] = [
      { etiqueta: 'Eventos de descuento vigentes', valor: formatoEntero(descuentos.eventosVigentes), href: '/admin/promociones' },
      { etiqueta: 'Cupones vigentes', valor: formatoEntero(descuentos.cuponesVigentes), href: '/admin/promociones' },
      { etiqueta: 'Cupones usados', valor: formatoEntero(descuentos.usosCupon.actual), variacion: variacion(descuentos.usosCupon) },
      { etiqueta: 'Descuento otorgado', valor: formatoPesosCorto(descuentos.descuentoOtorgado.actual), variacion: variacion(descuentos.descuentoOtorgado) },
    ];
    bloques.push(<BloqueCifras key="descuentos" id="bloque-descuentos" titulo="Promociones" icono={<Percent className="h-5 w-5" />} colorIcono="bg-danger/10 text-danger" cifras={cifras} />);
  }
  if (patrocinios !== null) {
    const cifras: CifraBloque[] = [
      { etiqueta: 'Campañas vigentes', valor: formatoEntero(patrocinios.campaniasVigentes), href: '/admin/patrocinios' },
      { etiqueta: 'Anuncios activos', valor: formatoEntero(patrocinios.anunciosActivos), href: '/admin/patrocinios' },
      { etiqueta: 'Veces mostrados', valor: formatoEntero(patrocinios.impresiones.actual), variacion: variacion(patrocinios.impresiones) },
      { etiqueta: 'Clics', valor: formatoEntero(patrocinios.clics.actual), variacion: variacion(patrocinios.clics) },
      { etiqueta: 'Clics por cada 100 veces mostrado', valor: patrocinios.ctr === null ? '—' : formatoPorcentaje(patrocinios.ctr).replace(' %', '') },
    ];
    bloques.push(<BloqueCifras key="patrocinios" id="bloque-patrocinios" titulo="Publicidad" icono={<Megaphone className="h-5 w-5" />} colorIcono="bg-subaction text-corporate" cifras={cifras} />);
  }
  if (personas !== null) {
    const cifras: CifraBloque[] = [
      { etiqueta: 'Clientes (personas)', valor: formatoEntero(personas.clientesNaturales), href: '/admin/clientes' },
      { etiqueta: 'Clientes (empresas)', valor: formatoEntero(personas.clientesEmpresa), href: '/admin/clientes' },
      { etiqueta: 'Colaboradores activos', valor: formatoEntero(personas.colaboradores), href: '/admin/empleados' },
    ];
    bloques.push(<BloqueCifras key="personas" id="bloque-personas" titulo="Clientes y equipo" icono={<Users className="h-5 w-5" />} colorIcono="bg-highlight/25 text-neutral-black" cifras={cifras} />);
  }

  return (
    <div className={`space-y-8 transition-opacity ${refrescando ? 'opacity-60' : ''}`}>
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(({ clave, ...kpi }) => (
            <AdminStatCard key={clave} {...kpi} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {negocio !== null && (
          <SeccionPanel
            id="seccion-serie"
            titulo="Cotizaciones por día"
            descripcion={`Las cotizaciones que llegaron en los últimos ${datos.dias} días. Hoy va en verde.`}
            enlace={{ texto: 'Ver cotizaciones', href: '/admin/cotizaciones' }}
            className="lg:col-span-2"
          >
            <GraficoCotizaciones serie={negocio.serie} />
          </SeccionPanel>
        )}
        <SeccionPanel
          id="seccion-pendientes"
          titulo="Requiere tu atención"
          descripcion="Lo que está esperando una respuesta del equipo."
          // En el celular lo que hay que atender va antes que el gráfico.
          className={negocio === null ? 'lg:col-span-3' : 'order-first lg:order-none'}
        >
          <PendientesPanel pendientes={datos.pendientes} />
        </SeccionPanel>
      </div>

      {negocio !== null && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SeccionPanel id="seccion-estados" titulo="Cómo van las cotizaciones" descripcion="El estado en que están las del periodo.">
            <EstadosCotizaciones porEstado={negocio.porEstado} tasaAprobacion={negocio.tasaAprobacion} />
          </SeccionPanel>
          <SeccionPanel id="seccion-top" titulo="Lo que más se cotiza" descripcion="Productos con más unidades en las cotizaciones del periodo.">
            <TopProductos productos={negocio.topProductos} />
          </SeccionPanel>
        </div>
      )}

      {bloques.length > 0 && <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{bloques}</div>}

      {datos.accesos.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-title text-lg font-bold text-corporate">Accesos rápidos</h2>
          <AccesosPanel accesos={datos.accesos} />
        </div>
      )}
    </div>
  );
};
