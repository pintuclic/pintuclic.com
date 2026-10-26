'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save, Send, X } from 'lucide-react';
import { AdminPageHeader, Alert, Button, Checkbox, Input, Modal, Skeleton, Textarea } from '@/core/components';
import { formatCOP } from '@/core/utils/moneda';
import { ESTADOS_EDITABLES, type CotizacionDetalle } from '../dtos/m21-cotizaciones.dto';
import {
  editorFormSchema,
  rechazoAdminFormSchema,
  type EditorFormData,
  type RechazoAdminFormData,
} from '../dtos/formularios.dto';
import { cotizacionesApi, mensajeDeError } from '../services/cotizaciones-api';
import { cuerpoDelEditor, faltanPrecios, totalEnPantalla, valoresDelEditor } from '../services/editor';
import { fechaCorta, porcentajeDescuento, precioDesdePorcentaje } from '../services/textos-cotizaciones';
import { EstadoCotizacionBadge, TablaLineas, Totales } from './comunes';

/** /admin/cotizaciones/:id: revisar, ajustar (R5), enviar (R6) o rechazar (R7). */
export function CotizacionAdminView({ idCotizacion }: { idCotizacion: number }) {
  const [c, setC] = useState<CotizacionDetalle | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState<'guardar' | 'enviar' | null>(null);
  const [rechazando, setRechazando] = useState(false);
  /** Lo que se escribe en "% desc." por línea; si no hay nada, se muestra el % del precio acordado. */
  const [porcentajes, setPorcentajes] = useState<Record<number, string>>({});

  const editor = useForm<EditorFormData>({ resolver: zodResolver(editorFormSchema), defaultValues: { lineas: [], nota: '', fechaVencimiento: '' } });
  const { fields } = useFieldArray({ control: editor.control, name: 'lineas', keyName: 'clave' });
  const valores = useWatch({ control: editor.control });
  const rechazo = useForm<RechazoAdminFormData>({ resolver: zodResolver(rechazoAdminFormSchema), defaultValues: { motivo: '' } });

  const cargar = (d: CotizacionDetalle): void => {
    setC(d);
    setPorcentajes({});
    editor.reset(valoresDelEditor(d));
  };

  useEffect(() => {
    let vigente = true;
    cotizacionesApi
      .obtenerAdmin(idCotizacion)
      .then((d) => vigente && cargar(d))
      .catch(() => vigente && setNoDisponible(true));
    return () => {
      vigente = false;
    };
    // `cargar` solo usa setters estables y `reset`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCotizacion]);

  const guardar = editor.handleSubmit(async (datos) => {
    setOcupado('guardar');
    setMensaje(null);
    try {
      cargar(await cotizacionesApi.actualizar(idCotizacion, cuerpoDelEditor(datos)));
      setMensaje({ tipo: 'success', texto: 'Cambios guardados. El cliente todavía no los ve: falta enviarla.' });
    } catch (err: unknown) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No fue posible guardar los cambios.') });
    } finally {
      setOcupado(null);
    }
  });

  const enviar = editor.handleSubmit(async (datos) => {
    if (faltanPrecios(datos)) {
      setMensaje({ tipo: 'error', texto: 'Pon el precio acordado de cada producto antes de enviar.' });
      return;
    }
    setOcupado('enviar');
    setMensaje(null);
    try {
      await cotizacionesApi.actualizar(idCotizacion, cuerpoDelEditor(datos));
      cargar(await cotizacionesApi.enviar(idCotizacion));
      setMensaje({ tipo: 'success', texto: 'Cotización enviada al cliente.' });
    } catch (err: unknown) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No fue posible enviar la cotización.') });
    } finally {
      setOcupado(null);
    }
  });

  const rechazar = rechazo.handleSubmit(async (datos) => {
    setMensaje(null);
    try {
      cargar(await cotizacionesApi.rechazarComoAdmin(idCotizacion, datos.motivo));
      setRechazando(false);
      setMensaje({ tipo: 'success', texto: 'Cotización rechazada.' });
    } catch (err: unknown) {
      setRechazando(false);
      setMensaje({ tipo: 'error', texto: mensajeDeError(err, 'No fue posible rechazarla.') });
    }
  });

  if (noDisponible) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Cotización no disponible" subtitle="No existe o no tienes permiso para verla." />
        <Link href="/admin/cotizaciones" className="font-title text-sm font-medium text-action hover:text-action-hover">
          Volver a las cotizaciones
        </Link>
      </div>
    );
  }
  if (c === null) return <Skeleton className="h-96" />;

  const editable = ESTADOS_EDITABLES.includes(c.estado);
  const total = totalEnPantalla({ lineas: valores.lineas?.map((l) => ({ idLinea: l?.idLinea ?? 0, incluida: l?.incluida ?? true, cantidad: l?.cantidad ?? '', precio: l?.precio ?? '' })) ?? [], nota: '', fechaVencimiento: '' });

  return (
    <div className="space-y-6">
      <Link href="/admin/cotizaciones" className="inline-flex items-center gap-1 font-title text-sm font-medium text-action hover:text-action-hover">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Cotizaciones
      </Link>
      <AdminPageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Cotización {c.codigo}
            <EstadoCotizacionBadge estado={c.estado} />
          </span>
        }
        subtitle={`Pedida el ${fechaCorta(c.fechaCreacion)}${c.fechaEnvio === null ? '' : ` · Enviada el ${fechaCorta(c.fechaEnvio)}`}${
          c.fechaVencimiento === null ? '' : ` · Vence el ${fechaCorta(c.fechaVencimiento)}`
        }`}
      />

      <div aria-live="polite">{mensaje !== null && <Alert variant={mensaje.tipo}>{mensaje.texto}</Alert>}</div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
          <h2 className="font-title text-sm font-bold text-corporate">Cliente</h2>
          {c.cliente === null ? (
            <p className="mt-2 text-sm text-neutral-medium">La cuenta ya no existe.</p>
          ) : (
            <p className="mt-2 text-sm text-neutral-dark">
              <span className="font-semibold text-neutral-black">{c.cliente.nombre}</span>
              <br />
              {c.cliente.correo} · {c.cliente.tipo === 'empresa' ? 'Cuenta empresa' : 'Cuenta personal'}
            </p>
          )}
        </section>
        <section className="rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
          <h2 className="font-title text-sm font-bold text-corporate">Comentario del cliente</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-neutral-dark">{c.comentarioCliente ?? 'Sin comentario.'}</p>
          {c.motivoRechazo !== null && (
            <p className="mt-2 text-sm text-danger-hover">
              <span className="font-semibold">Motivo del rechazo: </span>
              {c.motivoRechazo}
            </p>
          )}
        </section>
      </div>

      {!editable ? (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <TablaLineas cotizacion={c} />
          <aside className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
            <Totales cotizacion={c} />
            {c.notaParaCliente !== null && <p className="text-sm text-neutral-dark"><span className="font-semibold">Nota enviada: </span>{c.notaParaCliente}</p>}
            {c.estado === 'enviada' && (
              <Button variant="danger" fullWidth leftIcon={<X aria-hidden className="h-4 w-4" />} onClick={() => setRechazando(true)}>
                Rechazar cotización
              </Button>
            )}
          </aside>
        </div>
      ) : (
        <form noValidate className="space-y-6" onSubmit={(e) => void guardar(e)}>
          <div className="overflow-x-auto rounded-card border border-neutral-light/70 bg-neutral-white shadow-card">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">Ajustar precios y cantidades</caption>
              <thead className="bg-neutral-lightest text-left text-xs uppercase tracking-wide text-neutral-medium">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Incluir</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Cantidad</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Referencia</th>
                  <th scope="col" className="px-4 py-3 font-semibold">% desc.</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Precio acordado</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light">
                {fields.map((f, i) => {
                  const linea = c.lineas.find((l) => l.idLinea === f.idLinea);
                  if (linea === undefined) return null;
                  const actual = valores.lineas?.[i];
                  const incluida = actual?.incluida ?? true;
                  const precioTexto = actual?.precio ?? '';
                  const precio = precioTexto.trim() === '' ? null : Number(precioTexto);
                  const cantidad = Number(actual?.cantidad ?? 0);
                  const errores = editor.formState.errors.lineas?.[i];
                  return (
                    <tr key={f.clave} className={incluida ? '' : 'bg-neutral-lightest opacity-60'}>
                      <td className="px-4 py-3 align-top">
                        <Checkbox
                          aria-label={`Incluir ${linea.producto.nombre}`}
                          checked={incluida}
                          onChange={(e) => editor.setValue(`lineas.${i}.incluida`, e.target.checked, { shouldDirty: true })}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-neutral-black">{linea.producto.nombre}</p>
                        <p className="text-xs text-neutral-medium">
                          {[linea.producto.marca, linea.producto.medida, linea.producto.color?.nombre ?? null, linea.producto.sku]
                            .filter((v) => v !== null)
                            .join(' · ')}
                        </p>
                      </td>
                      <td className="w-28 px-4 py-3 align-top">
                        <Input
                          id={`cantidad-${linea.idLinea}`}
                          aria-label={`Cantidad de ${linea.producto.nombre}`}
                          inputMode="numeric"
                          disabled={!incluida}
                          {...editor.register(`lineas.${i}.cantidad`)}
                          {...(errores?.cantidad?.message === undefined ? {} : { error: errores.cantidad.message })}
                        />
                      </td>
                      <td className="px-4 py-3 text-right align-top text-neutral-medium">{formatCOP(linea.precioReferencia)}</td>
                      <td className="w-28 px-4 py-3 align-top">
                        <Input
                          id={`descuento-${linea.idLinea}`}
                          aria-label={`Porcentaje de descuento de ${linea.producto.nombre}`}
                          inputMode="decimal"
                          disabled={!incluida}
                          placeholder="%"
                          value={
                            porcentajes[linea.idLinea] ??
                            (precio === null || !Number.isFinite(precio) ? '' : String(porcentajeDescuento(linea.precioReferencia, precio)))
                          }
                          onChange={(e) => {
                            // El precio y el subtotal se calculan mientras se escribe el %.
                            const texto = e.target.value;
                            setPorcentajes((p) => ({ ...p, [linea.idLinea]: texto }));
                            const nuevo = precioDesdePorcentaje(linea.precioReferencia, texto);
                            if (nuevo !== null) {
                              editor.setValue(`lineas.${i}.precio`, String(nuevo), { shouldDirty: true, shouldValidate: true });
                            }
                          }}
                        />
                      </td>
                      <td className="w-40 px-4 py-3 align-top">
                        <Input
                          id={`precio-${linea.idLinea}`}
                          aria-label={`Precio acordado de ${linea.producto.nombre}`}
                          inputMode="decimal"
                          disabled={!incluida}
                          placeholder="Sin precio"
                          {...editor.register(`lineas.${i}.precio`, {
                            // Si se escribe el precio a mano, el % se vuelve a calcular desde ese precio.
                            onChange: () =>
                              setPorcentajes((p) => {
                                const resto = { ...p };
                                delete resto[linea.idLinea];
                                return resto;
                              }),
                          })}
                          {...(errores?.precio?.message === undefined ? {} : { error: errores.precio.message })}
                        />
                      </td>
                      <td className="px-4 py-3 text-right align-top font-semibold text-neutral-black">
                        {incluida && precio !== null && Number.isFinite(cantidad) ? formatCOP(precio * cantidad) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {editor.formState.errors.lineas?.root?.message !== undefined && (
            <Alert variant="error">{editor.formState.errors.lineas.root.message}</Alert>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
              <Textarea
                id="nota-cliente"
                label="Nota para el cliente (opcional)"
                rows={3}
                placeholder="Ej.: precio especial por volumen, incluye entrega en Cali…"
                {...editor.register('nota')}
                {...(editor.formState.errors.nota?.message === undefined ? {} : { error: editor.formState.errors.nota.message })}
              />
              <Input
                id="fecha-vencimiento"
                type="date"
                label="Vigente hasta (opcional)"
                helperText="Si la dejas vacía, se usa el plazo de la configuración general al enviarla."
                {...editor.register('fechaVencimiento')}
                {...(editor.formState.errors.fechaVencimiento?.message === undefined
                  ? {}
                  : { error: editor.formState.errors.fechaVencimiento.message })}
              />
            </div>
            <aside className="space-y-4 rounded-card border border-neutral-light/70 bg-neutral-white p-5 shadow-card">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-dark">Total con precios del carrito</dt>
                  <dd className="text-neutral-black">{formatCOP(c.totalReferencia)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-neutral-light pt-2">
                  <dt className="font-title font-bold text-neutral-black">Total acordado</dt>
                  <dd className="font-title text-xl font-bold text-corporate">{total === null ? '—' : formatCOP(total)}</dd>
                </div>
              </dl>
              <Button type="submit" variant="outline" fullWidth isLoading={ocupado === 'guardar'} disabled={ocupado !== null} leftIcon={<Save aria-hidden className="h-4 w-4" />}>
                Guardar cambios
              </Button>
              <Button
                type="button"
                variant="primary-conversion"
                fullWidth
                isLoading={ocupado === 'enviar'}
                disabled={ocupado !== null}
                onClick={() => void enviar()}
                leftIcon={<Send aria-hidden className="h-4 w-4" />}
              >
                Enviar al cliente
              </Button>
              {/* Fondo gris fijo (el que el botón fantasma solo muestra al pasar el mouse). */}
              <div className="rounded-btn bg-neutral-light/60">
                <Button type="button" variant="ghost" fullWidth disabled={ocupado !== null} onClick={() => setRechazando(true)} leftIcon={<X aria-hidden className="h-4 w-4" />}>
                  Rechazar
                </Button>
              </div>
            </aside>
          </div>
        </form>
      )}

      <Modal isOpen={rechazando} onClose={() => setRechazando(false)} title={`Rechazar ${c.codigo}`} size="md">
        <form noValidate className="space-y-4 py-2" onSubmit={(e) => void rechazar(e)}>
          <Textarea
            id="motivo-rechazo-admin"
            label="Motivo (lo verá el cliente)"
            rows={3}
            {...rechazo.register('motivo')}
            {...(rechazo.formState.errors.motivo?.message === undefined ? {} : { error: rechazo.formState.errors.motivo.message })}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setRechazando(false)}>
              Volver
            </Button>
            <Button type="submit" variant="danger" isLoading={rechazo.formState.isSubmitting}>
              Rechazar cotización
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
