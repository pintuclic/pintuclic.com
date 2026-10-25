'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Boxes, Eye, EyeOff, Images, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Badge, Button, Input, Select } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import type { Combo } from '../../dtos/m01-catalogo-entrega3.dto';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { useReferencias } from '../../hooks/useReferencias';
import { combosApi, productosApi } from '../../services/catalogo-api';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { ComboFormModal } from './ComboFormModal';
import {
  AvisoAccion,
  Cargando,
  EstadoBadge,
  MensajeVacio,
  ModalDesactivar,
  Paginador,
  reactivar,
  type Aviso,
} from './comunes';
import { ImagenesModal } from './ImagenesModal';

/** HU-CAT-13: combos. Estado, publicación e imágenes son las de cualquier producto; la existencia, la de Inventario. */
export const CombosView: React.FC = () => {
  const { referencias, error: errorRef } = useReferencias();
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('activo');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const lista = useCargar(
    useCallback(
      () => combosApi.listar({ busqueda: termino, estado, disponibilidad, pagina, limite: 15 }),
      [termino, estado, disponibilidad, pagina],
    ),
    'No se pudieron cargar los combos.',
  );
  const [formulario, setFormulario] = useState<{ combo: Combo | null } | null>(null);
  const [imagenes, setImagenes] = useState<number | null>(null);
  const [aDesactivar, setADesactivar] = useState<Combo | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const exito = (texto: string) => setAviso({ tipo: 'success', texto });
  const filtro =
    <T,>(fijar: (v: T) => void) =>
    (v: T) => {
      fijar(v);
      setPagina(1);
    };

  const publicar = async (c: Combo, valor: boolean) => {
    try {
      await productosApi.publicar(c.idProducto, valor);
      exito(valor ? `${c.nombre} ya se muestra al público.` : `${c.nombre} dejó de mostrarse al público.`);
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: leerErrorCatalogo(err, 'No se pudo cambiar la publicación.').message });
    }
  };

  return (
    <section aria-labelledby="titulo-combos" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-combos" className="font-title text-lg font-semibold text-corporate">
            Combos
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Paquetes a precio propio. A diferencia de los demás productos, un combo no se puede comprar si no tiene
            existencia: ajústela en{' '}
            <Link href="/admin/inventario" className="font-medium text-action hover:text-action-hover">
              Inventario
            </Link>
            .
          </p>
        </div>
        <Button
          variant="primary-action"
          disabled={referencias === null}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setFormulario({ combo: null })}
        >
          Nuevo combo
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      {errorRef !== null && <Alert variant="error">{errorRef}</Alert>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Buscar por nombre o SKU" value={busqueda} onChange={(e) => filtro(setBusqueda)(e.target.value)} />
        <Select
          label="Estado"
          value={estado}
          onChange={(e) => filtro(setEstado)(e.target.value)}
          options={[
            { value: 'activo', label: 'Activos' },
            { value: 'inactivo', label: 'Inactivos' },
            { value: '', label: 'Todos' },
          ]}
        />
        <Select
          label="Existencia"
          value={disponibilidad}
          onChange={(e) => filtro(setDisponibilidad)(e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            { value: 'disponible', label: 'Con existencia' },
            { value: 'agotado', label: 'Agotados' },
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>No hay combos con esos filtros.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
          <table className="w-full min-w-[760px] text-left font-sans text-sm">
            <caption className="sr-only">Combos</caption>
            <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Combo
                </th>
                <th scope="col" className="px-4 py-3">
                  SKU
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Precio
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Existencia
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light">
              {lista.datos.items.map((c) => (
                <tr key={c.idProducto}>
                  <td className="px-4 py-3">
                    <span className="block text-neutral-black">{c.nombre}</span>
                    <span className="block text-xs text-neutral-medium">
                      {c.marca} · {c.subcategoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-dark">{c.sku}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCOP(c.precio)}
                    {c.excluidoDeDescuentos && (
                      <span className="block text-xs text-neutral-medium">Sin descuentos</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2">
                      {c.disponibilidad === 'agotado' && <Badge variant="danger">Agotado</Badge>}
                      <span className="font-title font-semibold text-neutral-black">
                        {c.existenciaReferencial.toLocaleString('es-CO')}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1">
                      <EstadoBadge estado={c.estado} />
                      <Badge variant={c.publicado ? 'action' : 'neutral'}>
                        {c.publicado ? 'Publicado' : 'Sin publicar'}
                      </Badge>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Imágenes de ${c.nombre}`}
                        onClick={() => setImagenes(c.idProducto)}
                      >
                        <Images className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${c.nombre}`}
                        onClick={() => setFormulario({ combo: c })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={c.publicado ? `Despublicar ${c.nombre}` : `Publicar ${c.nombre}`}
                        onClick={() => void publicar(c, !c.publicado)}
                      >
                        {c.publicado ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4 text-action" aria-hidden="true" />
                        )}
                      </Button>
                      {c.estado === 'activo' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Desactivar ${c.nombre}`}
                          onClick={() => setADesactivar(c)}
                        >
                          <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Reactivar ${c.nombre}`}
                          onClick={() =>
                            void reactivar(
                              () => productosApi.cambiarEstado(c.idProducto, { estado: 'activo', confirmar: false }),
                              () => {
                                exito(`Se reactivó ${c.nombre}.`);
                                lista.recargar();
                              },
                              (texto) => setAviso({ tipo: 'error', texto }),
                            )
                          }
                        >
                          <RotateCcw className="h-4 w-4 text-conversion" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.datos !== null && <Paginador paginacion={lista.datos.paginacion} onCambiar={setPagina} />}

      {lista.datos !== null && lista.datos.items.length === 0 && estado === 'activo' && termino === '' && (
        <p className="flex items-center gap-2 font-sans text-xs text-neutral-medium">
          <Boxes className="h-4 w-4" aria-hidden="true" />
          Un combo se registra con nombre, imagen, precio y existencia; no hace falta declarar de qué se compone.
        </p>
      )}

      {formulario !== null && referencias !== null && (
        <ComboFormModal
          combo={formulario.combo}
          referencias={referencias}
          onClose={() => setFormulario(null)}
          onGuardado={(texto, idProducto) => {
            exito(texto);
            lista.recargar();
            if (formulario.combo === null) setImagenes(idProducto);
          }}
        />
      )}
      {imagenes !== null && (
        <ImagenesModal idProducto={imagenes} onClose={() => setImagenes(null)} onCambio={lista.recargar} />
      )}
      <ModalDesactivar
        objetivo={aDesactivar === null ? null : { id: aDesactivar.idProducto, nombre: aDesactivar.nombre }}
        queEs="el combo"
        obtenerImpacto={productosApi.impacto}
        desactivar={(id, confirmar) => productosApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setADesactivar(null)}
        onHecho={() => {
          exito('Combo desactivado. Sus órdenes anteriores no se afectan.');
          lista.recargar();
        }}
      />
    </section>
  );
};
