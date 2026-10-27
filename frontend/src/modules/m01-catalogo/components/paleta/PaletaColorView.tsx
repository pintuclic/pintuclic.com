'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Container } from '@/core/components';
import type { ColorPaleta, FamiliaPaleta, MarcaPaleta } from '../../dtos/m01-catalogo-paleta.dto';
import { paletaDesdeUrl, paletaAUrl, type EstadoPaleta } from '../../services/filtros-paleta';
import { paletaApi } from '../../services/paleta-api';
import { AbanicoColores } from './AbanicoColores';
import { CombinadorColores } from './CombinadorColores';
import { FiltroPaleta } from './FiltroPaleta';
import { OndaColor } from './OndaColor';
import { ProductosDelColor } from './ProductosDelColor';

const POR_PAGINA = 48;
const ID_PRODUCTOS = 'productos-del-color';

/**
 * Página «Paleta de color» (contrato M01 · entrega 4). La primera pantalla es el abanico, que ocupa todo el alto visible;
 * al elegir un color aparece la onda que baja a los productos, y debajo quedan el combinador y los productos.
 */
export const PaletaColorView: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const estado = paletaDesdeUrl(params);
  const claveFiltro = `${estado.familia ?? ''}|${estado.idMarca ?? ''}|${estado.q}`;

  const [colores, setColores] = useState<ColorPaleta[]>([]);
  const [total, setTotal] = useState(0);
  const [familias, setFamilias] = useState<FamiliaPaleta[]>([]);
  const [marcas, setMarcas] = useState<MarcaPaleta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pagina = useRef(1);
  const generacion = useRef(0);
  const [texto, setTexto] = useState(estado.q);
  const [elegido, setElegido] = useState<ColorPaleta | null>(null);

  const ir = useCallback(
    (nuevo: EstadoPaleta): void => {
      router.replace(`${pathname}${paletaAUrl(nuevo)}`, { scroll: false });
    },
    [router, pathname],
  );

  // Escribir en el buscador espera un momento antes de cambiar el filtro.
  useEffect(() => {
    if (texto.trim() === estado.q.trim()) return;
    const t = setTimeout(() => ir({ ...estado, q: texto }), 350);
    return () => clearTimeout(t);
  }, [texto, estado, ir]);

  // P4: la primera página de cada filtro; las demás las pide el abanico al acercarse al final.
  useEffect(() => {
    const mia = ++generacion.current;
    pagina.current = 1;
    setCargando(true);
    setError(null);
    paletaApi
      .colores({ familia: estado.familia ?? undefined, idMarca: estado.idMarca ?? undefined, q: estado.q, pagina: 1, limite: POR_PAGINA })
      .then((r) => {
        if (mia !== generacion.current) return;
        setColores(r.colores);
        setTotal(r.paginacion.total);
        setFamilias(r.familias);
        setMarcas(r.marcas);
      })
      .catch(() => mia === generacion.current && setError('No se pudieron cargar los colores. Intenta de nuevo.'))
      .finally(() => mia === generacion.current && setCargando(false));
    // La clave del filtro resume los valores que importan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFiltro]);

  const cargarMas = useCallback((): void => {
    if (cargandoMas || colores.length >= total) return;
    const mia = generacion.current;
    const siguiente = pagina.current + 1;
    setCargandoMas(true);
    paletaApi
      .colores({ familia: estado.familia ?? undefined, idMarca: estado.idMarca ?? undefined, q: estado.q, pagina: siguiente, limite: POR_PAGINA })
      .then((r) => {
        if (mia !== generacion.current) return;
        pagina.current = siguiente;
        setColores((previos) => {
          const ya = new Set(previos.map((c) => c.idColor));
          return [...previos, ...r.colores.filter((c) => !ya.has(c.idColor))];
        });
      })
      .catch(() => undefined)
      .finally(() => mia === generacion.current && setCargandoMas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoMas, colores.length, total, claveFiltro]);

  // El color de la dirección (P5): está en la lista o se pide solo; si ya no se ofrece se ignora.
  const idEnUrl = estado.color;
  useEffect(() => {
    if (idEnUrl === null) {
      setElegido(null);
      return;
    }
    const enLista = colores.find((c) => c.idColor === idEnUrl);
    if (enLista !== undefined) {
      setElegido(enLista);
      return;
    }
    if (cargando) return;
    let vigente = true;
    paletaApi
      .armonias(idEnUrl)
      .then((r) => vigente && setElegido(r.color))
      .catch(() => {
        if (!vigente) return;
        setElegido(null);
        ir({ ...paletaDesdeUrl(params), color: null });
      });
    return () => {
      vigente = false;
    };
    // `ir` y `params` cambian en cada navegación y no deben repetir la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEnUrl, colores, cargando]);

  /**
   * En pantallas bajas (celular) la onda queda debajo del borde: tras elegir, la página baja lo justo para que se vea
   * entera con su botón. Espera a que termine la entrada de la onda; la medida real manda, no el tamaño del aparato.
   */
  const mostrarOnda = useCallback((): void => {
    window.setTimeout(() => {
      const onda = document.querySelector('[data-testid="onda-color"]');
      if (onda === null) return;
      const exceso = onda.getBoundingClientRect().bottom - window.innerHeight;
      if (exceso <= 0) return;
      const menos = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollBy({ top: exceso + 8, behavior: menos ? 'auto' : 'smooth' });
    }, 600);
  }, []);

  const elegirEnAbanico = useCallback(
    (c: ColorPaleta): void => {
      ir({ ...paletaDesdeUrl(params), color: c.idColor });
      mostrarOnda();
    },
    [ir, params, mostrarOnda],
  );

  // P8: un color sugerido por una armonía; si no está en el abanico actual, el filtro pasa a su familia.
  const elegirDesdeCombinador = (c: ColorPaleta): void => {
    const actual = paletaDesdeUrl(params);
    if (colores.some((x) => x.idColor === c.idColor)) {
      ir({ ...actual, color: c.idColor });
      return;
    }
    setTexto('');
    ir({ familia: c.idFamiliaColor, idMarca: null, q: '', color: c.idColor });
  };

  const limpiar = (): void => {
    setTexto('');
    ir({ familia: null, idMarca: null, q: '', color: estado.color });
  };

  const bajarAProductos = (): void => {
    const destino = document.getElementById(ID_PRODUCTOS);
    if (destino === null) return;
    const menos = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    destino.scrollIntoView({ behavior: menos ? 'auto' : 'smooth', block: 'start' });
    destino.focus({ preventScroll: true });
  };

  return (
    <div className="bg-neutral-white">
      {/* Primera pantalla: título y filtro arriba y el abanico ocupando el resto del alto visible (P14c). */}
      <div className="flex min-h-[calc(100svh-6.5rem)] flex-col bg-gradient-to-b from-subaction/40 via-neutral-white to-neutral-lightest lg:min-h-[calc(100svh-7.75rem)]">
        <Container className="space-y-2 pt-3 [@media(max-height:500px)]:pt-2">
          <FiltroPaleta
            titulo={
              <>
                <h1 className="font-title text-2xl font-bold text-corporate sm:text-3xl [@media(max-height:500px)]:sr-only">Paleta de color</h1>
                <p className="hidden font-sans text-xs text-neutral-medium sm:block sm:text-sm [@media(max-height:500px)]:hidden">Desliza el abanico, elige un color y mira los productos que se entregan en él.</p>
              </>
            }
            familias={familias}
            marcas={marcas}
            familia={estado.familia}
            idMarca={estado.idMarca}
            texto={texto}
            onFamilia={(familia) => ir({ ...estado, familia })}
            onMarca={(idMarca) => ir({ ...estado, idMarca })}
            onTexto={setTexto}
          />
          {error !== null && <Alert variant="error">{error}</Alert>}
        </Container>

        <section aria-label="Abanico de colores" className="relative isolate mt-1 min-h-[340px] flex-1 sm:min-h-[440px] [@media(max-height:500px)]:min-h-[300px]" data-testid="escenario-abanico">
          <AbanicoColores
            className="absolute inset-0"
            colores={colores}
            total={total}
            cargando={cargando}
            cargandoMas={cargandoMas}
            elegidoId={elegido?.idColor ?? null}
            onElegir={elegirEnAbanico}
            onNecesitaMas={cargarMas}
            claveFiltro={claveFiltro}
            onLimpiarFiltro={limpiar}
          />
          <OndaColor color={elegido} destinoId={ID_PRODUCTOS} onVerProductos={bajarAProductos} />
        </section>
      </div>

      <Container className="space-y-8 py-8">
        <CombinadorColores color={elegido} onElegir={elegirDesdeCombinador} />
        <ProductosDelColor color={elegido} id={ID_PRODUCTOS} />
      </Container>
    </div>
  );
};
