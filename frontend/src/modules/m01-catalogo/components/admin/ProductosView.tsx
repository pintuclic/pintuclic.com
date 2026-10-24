'use client';

import React, { useCallback, useState } from 'react';
import { Eye, EyeOff, ListPlus, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Alert, Badge, Button, Input, Select } from '@/core/components';
import type { ClaseColor, ProductoResumen } from '../../dtos/m01-catalogo-productos.dto';
import { useCargar, useRetardo } from '../../hooks/useCargar';
import { useReferencias } from '../../hooks/useReferencias';
import { productosApi } from '../../services/catalogo-api';
import { leerErrorCatalogo } from '../../services/mensaje-error';
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
import { ProductoFormModal } from './ProductoFormModal';
import { VariantesModal } from './VariantesModal';

const CLASES: Record<ClaseColor, string> = {
  entonable: 'Entonable',
  colores_fijos: 'Colores fijos',
  sin_color: 'Sin color',
};

/** HU-CAT-02, HU-CAT-03, HU-CAT-09: listado de productos con publicación, variantes y estado. */
export const ProductosView: React.FC = () => {
  const { referencias, error: errorRef } = useReferencias();
  const [idMarca, setIdMarca] = useState('');
  const [idSubcategoria, setIdSubcategoria] = useState('');
  const [clase, setClase] = useState('');
  const [estado, setEstado] = useState('activo');
  const [publicado, setPublicado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const termino = useRetardo(busqueda);
  const cargador = useCallback(
    () =>
      productosApi.listar({
        idMarca: idMarca === '' ? undefined : Number(idMarca),
        idSubcategoria: idSubcategoria === '' ? undefined : Number(idSubcategoria),
        claseColor: clase,
        estado,
        publicado,
        busqueda: termino,
        pagina,
        limite: 15,
      }),
    [idMarca, idSubcategoria, clase, estado, publicado, termino, pagina],
  );
  const lista = useCargar(cargador, 'No se pudieron cargar los productos.');
  const [formulario, setFormulario] = useState<{ idProducto: number | null } | null>(null);
  const [variantes, setVariantes] = useState<number | null>(null);
  const [aDesactivar, setADesactivar] = useState<ProductoResumen | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const exito = (texto: string) => setAviso({ tipo: 'success', texto });
  const filtro =
    <T,>(fijar: (v: T) => void) =>
    (v: T) => {
      fijar(v);
      setPagina(1);
    };

  const publicar = async (p: ProductoResumen, valor: boolean) => {
    try {
      await productosApi.publicar(p.idProducto, valor);
      exito(valor ? `${p.nombre} ya se muestra al público.` : `${p.nombre} dejó de mostrarse al público.`);
      lista.recargar();
    } catch (err: unknown) {
      setAviso({ tipo: 'error', texto: leerErrorCatalogo(err, 'No se pudo cambiar la publicación.').message });
    }
  };

  const subcategorias = (referencias?.categorias ?? []).flatMap((c) =>
    c.subcategorias.map((s) => ({ value: String(s.idSubcategoria), label: `${c.nombre} › ${s.nombre}` })),
  );

  return (
    <section aria-labelledby="titulo-productos" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-productos" className="font-title text-lg font-semibold text-corporate">
            Productos
          </h2>
          <p className="font-sans text-sm text-neutral-medium">
            Un producto se publica cuando tiene al menos una variante activa. La clase de color se calcula sola.
          </p>
        </div>
        <Button
          variant="primary-action"
          disabled={referencias === null}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setFormulario({ idProducto: null })}
        >
          Nuevo producto
        </Button>
      </div>

      <AvisoAccion aviso={aviso} onCerrar={cerrarAviso} />
      {errorRef !== null && <Alert variant="error">{errorRef}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Buscar por nombre" value={busqueda} onChange={(e) => filtro(setBusqueda)(e.target.value)} />
        <Select
          label="Marca"
          value={idMarca}
          onChange={(e) => filtro(setIdMarca)(e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...(referencias?.marcas ?? []).map((m) => ({ value: String(m.idMarca), label: m.nombre })),
          ]}
        />
        <Select
          label="Subcategoría"
          value={idSubcategoria}
          onChange={(e) => filtro(setIdSubcategoria)(e.target.value)}
          options={[{ value: '', label: 'Todas' }, ...subcategorias]}
        />
        <Select
          label="Clase de color"
          value={clase}
          onChange={(e) => filtro(setClase)(e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...(Object.keys(CLASES) as ClaseColor[]).map((c) => ({ value: c, label: CLASES[c] })),
          ]}
        />
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
          label="Publicación"
          value={publicado}
          onChange={(e) => filtro(setPublicado)(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Publicados' },
            { value: 'false', label: 'Sin publicar' },
          ]}
        />
      </div>

      {lista.error !== null && <Alert variant="error">{lista.error}</Alert>}
      {lista.cargando && lista.datos === null && <Cargando />}
      {lista.datos !== null && lista.datos.items.length === 0 && (
        <MensajeVacio>No hay productos con esos filtros.</MensajeVacio>
      )}
      {lista.datos !== null && lista.datos.items.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-neutral-light bg-neutral-white">
          <table className="w-full min-w-[760px] text-left font-sans text-sm">
            <caption className="sr-only">Productos</caption>
            <thead className="bg-neutral-lightest text-xs uppercase tracking-wide text-neutral-medium">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Producto
                </th>
                <th scope="col" className="px-4 py-3">
                  Clasificación
                </th>
                <th scope="col" className="px-4 py-3">
                  Color
                </th>
                <th scope="col" className="px-4 py-3">
                  Variantes
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
              {lista.datos.items.map((p) => (
                <tr key={p.idProducto}>
                  <td className="px-4 py-3">
                    <span className="block text-neutral-black">{p.nombre}</span>
                    <span className="block text-xs text-neutral-medium">
                      {p.marca}
                      {p.linea !== null && ` · ${p.linea}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-dark">
                    {p.categoria} › {p.subcategoria}
                  </td>
                  <td className="px-4 py-3">{CLASES[p.claseColor]}</td>
                  <td className="px-4 py-3">{p.variantesActivas}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1">
                      <EstadoBadge estado={p.estado} />
                      <Badge variant={p.publicado ? 'action' : 'neutral'}>
                        {p.publicado ? 'Publicado' : 'Sin publicar'}
                      </Badge>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Variantes de ${p.nombre}`}
                        onClick={() => setVariantes(p.idProducto)}
                      >
                        <ListPlus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar ${p.nombre}`}
                        onClick={() => setFormulario({ idProducto: p.idProducto })}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={p.publicado ? `Despublicar ${p.nombre}` : `Publicar ${p.nombre}`}
                        onClick={() => void publicar(p, !p.publicado)}
                      >
                        {p.publicado ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4 text-action" aria-hidden="true" />
                        )}
                      </Button>
                      {p.estado === 'activo' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Desactivar ${p.nombre}`}
                          onClick={() => setADesactivar(p)}
                        >
                          <Power className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Reactivar ${p.nombre}`}
                          onClick={() =>
                            void reactivar(
                              () => productosApi.cambiarEstado(p.idProducto, { estado: 'activo', confirmar: false }),
                              () => {
                                exito(`Se reactivó ${p.nombre}.`);
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

      {formulario !== null && referencias !== null && (
        <ProductoFormModal
          idProducto={formulario.idProducto}
          referencias={referencias}
          idMarcaInicial={idMarca}
          onClose={() => setFormulario(null)}
          onGuardado={(texto, idNuevo) => {
            exito(texto);
            lista.recargar();
            if (formulario.idProducto === null) setVariantes(idNuevo);
          }}
        />
      )}
      {variantes !== null && referencias !== null && (
        <VariantesModal
          idProducto={variantes}
          referencias={referencias}
          onClose={() => setVariantes(null)}
          onCambio={lista.recargar}
        />
      )}
      <ModalDesactivar
        objetivo={aDesactivar === null ? null : { id: aDesactivar.idProducto, nombre: aDesactivar.nombre }}
        queEs="el producto"
        obtenerImpacto={productosApi.impacto}
        desactivar={(id, confirmar) => productosApi.cambiarEstado(id, { estado: 'inactivo', confirmar })}
        onClose={() => setADesactivar(null)}
        onHecho={() => {
          exito('Producto desactivado. Sus órdenes anteriores no se afectan.');
          lista.recargar();
        }}
      />
    </section>
  );
};
