'use client';

import React, { useCallback, useState } from 'react';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Button } from '@/core/components';
import type { Categoria, Subcategoria } from '../../dtos/m01-catalogo.dto';
import type { FormFamiliaColor } from '../../dtos/formularios.dto';
import { useCargar } from '../../hooks/useCargar';
import { categoriasApi, subcategoriasApi } from '../../services/catalogo-api';
import { aCuerpoSimple } from '../../services/formularios';
import { AvisoAccion, Cargando, EstadoBadge, MensajeVacio, ModalDesactivar, reactivar, type Aviso } from './comunes';
import { FormularioSimple } from './CatalogoSimpleView';

type Objetivo =
  | { tipo: 'categoria'; id: number; nombre: string }
  | { tipo: 'subcategoria'; id: number; nombre: string };

type Edicion =
  | { tipo: 'categoria'; id: number | null; inicial: FormFamiliaColor }
  | { tipo: 'subcategoria'; id: number | null; idCategoria: number; inicial: FormFamiliaColor };

const formVacio = (): FormFamiliaColor => ({ nombre: '', orden: '', hexadecimal: '#' });
const formDe = (e: { nombre: string; orden: number }): FormFamiliaColor => ({
  nombre: e.nombre,
  orden: String(e.orden),
  hexadecimal: '#',
});

/** HU-CAT-01: categorías y subcategorías (dos niveles, sin más). */
export const ClasificacionView: React.FC = () => {
  const cargador = useCallback(() => categoriasApi.listar(), []);
  const { datos, cargando, error, recargar } = useCargar(cargador, 'No se pudieron cargar las categorías.');
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [aDesactivar, setADesactivar] = useState<Objetivo | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const guardar = async (valores: FormFamiliaColor) => {
    if (edicion === null) return;
    const cuerpo = aCuerpoSimple(valores);
    if (edicion.tipo === 'categoria') {
      if (edicion.id === null) await categoriasApi.crear({ orden: 0, ...cuerpo });
      else await categoriasApi.editar(edicion.id, cuerpo);
    } else if (edicion.id === null) {
      await subcategoriasApi.crear(edicion.idCategoria, { orden: 0, ...cuerpo });
    } else {
      await subcategoriasApi.editar(edicion.id, cuerpo);
    }
    setAviso({ tipo: 'success', texto: 'Cambios guardados.' });
    recargar();
  };

  const reactivarObjetivo = (tipo: Objetivo['tipo'], id: number, nombre: string) =>
    void reactivar(
      () =>
        tipo === 'categoria'
          ? categoriasApi.cambiarEstado(id, { estado: 'activo', confirmar: false })
          : subcategoriasApi.cambiarEstado(id, { estado: 'activo', confirmar: false }),
      () => {
        setAviso({ tipo: 'success', texto: `Se reactivó ${nombre}.` });
        recargar();
      },
      (texto) => setAviso({ tipo: 'error', texto }),
    );

  const fila = (item: Categoria | Subcategoria, tipo: Objetivo['tipo'], id: number, onEditar: () => void) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2 font-sans text-sm text-neutral-black">
        {item.nombre}
        <EstadoBadge estado={item.estado} />
      </span>
      <span className="flex gap-1">
        <Button variant="ghost" size="sm" aria-label={`Editar ${item.nombre}`} onClick={onEditar}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        {item.estado === 'activo' ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Desactivar ${item.nombre}`}
            onClick={() => setADesactivar({ tipo, id, nombre: item.nombre })}
          >
            <Power className="h-4 w-4 text-danger" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Reactivar ${item.nombre}`}
            onClick={() => reactivarObjetivo(tipo, id, item.nombre)}
          >
            <RotateCcw className="h-4 w-4 text-conversion" aria-hidden="true" />
          </Button>
        )}
      </span>
    </div>
  );

  return (
    <section aria-labelledby="titulo-clasificacion" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-clasificacion" className="font-title text-lg font-semibold text-corporate">
            Categorías y subcategorías
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Dos niveles. Cada producto pertenece a una subcategoría; las categorías sin productos visibles no se
            muestran al público.
          </p>
        </div>
        <Button
          variant="primary-action"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setEdicion({ tipo: 'categoria', id: null, inicial: formVacio() })}
        >
          Nueva categoría
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      {error !== null && <Alert variant="error">{error}</Alert>}
      {cargando && datos === null && <Cargando />}
      {datos !== null && datos.length === 0 && <MensajeVacio>Aún no hay categorías.</MensajeVacio>}

      <ul className="space-y-3">
        {datos?.map((c) => (
          <li key={c.idCategoria} className="rounded-card border border-neutral-light bg-neutral-white p-4">
            {fila(c, 'categoria', c.idCategoria, () =>
              setEdicion({ tipo: 'categoria', id: c.idCategoria, inicial: formDe(c) }),
            )}
            <ul className="mt-3 space-y-2 border-l-2 border-subaction pl-4">
              {c.subcategorias.map((s) => (
                <li key={s.idSubcategoria}>
                  {fila(s, 'subcategoria', s.idSubcategoria, () =>
                    setEdicion({
                      tipo: 'subcategoria',
                      id: s.idSubcategoria,
                      idCategoria: c.idCategoria,
                      inicial: formDe(s),
                    }),
                  )}
                </li>
              ))}
              <li>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={c.estado !== 'activo'}
                  leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                  onClick={() =>
                    setEdicion({ tipo: 'subcategoria', id: null, idCategoria: c.idCategoria, inicial: formVacio() })
                  }
                >
                  Agregar subcategoría
                </Button>
              </li>
            </ul>
          </li>
        ))}
      </ul>

      {edicion !== null && (
        <FormularioSimple
          titulo={`${edicion.id === null ? 'Nueva' : 'Editar'} ${edicion.tipo === 'categoria' ? 'categoría' : 'subcategoría'}`}
          conHexadecimal={false}
          inicial={edicion.inicial}
          onGuardar={guardar}
          onClose={() => setEdicion(null)}
        />
      )}
      <ModalDesactivar
        objetivo={aDesactivar}
        queEs={aDesactivar?.tipo === 'categoria' ? 'la categoría' : 'la subcategoría'}
        obtenerImpacto={(id) =>
          aDesactivar?.tipo === 'subcategoria' ? subcategoriasApi.impacto(id) : categoriasApi.impacto(id)
        }
        desactivar={(id, confirmar) =>
          aDesactivar?.tipo === 'subcategoria'
            ? subcategoriasApi.cambiarEstado(id, { estado: 'inactivo', confirmar })
            : categoriasApi.cambiarEstado(id, { estado: 'inactivo', confirmar })
        }
        onClose={() => setADesactivar(null)}
        onHecho={() => {
          setAviso({ tipo: 'success', texto: `Se desactivó ${aDesactivar?.nombre ?? ''}.` });
          recargar();
        }}
      />
    </section>
  );
};
