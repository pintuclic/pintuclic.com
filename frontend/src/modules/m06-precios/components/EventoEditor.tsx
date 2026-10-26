'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Checkbox, Input, Select, Textarea } from '@/core/components';
import type { Evento } from '../dtos/m06-precios.dto';
import { DIAS_SEMANA, ETIQUETAS_TIPO_REFERENCIA, TIPOS_EXCLUSION, TIPOS_OBJETIVO } from '../services/etiquetas';
import {
  aCuerpoEvento,
  borradorDesdeEvento,
  borradorVacio,
  reglaVacia,
  type BorradorEvento,
  type BorradorRegla,
  type ObjetivoElegido,
} from '../services/formularios';
import { hoyBogota } from '../services/etiquetas';
import { leerErrorPrecios } from '../services/mensaje-error';
import { eventosApi } from '../services/precios-api';
import { SelectorReferencia } from './SelectorReferencia';
import { VistaPreviaEvento } from './VistaPreviaEvento';

export interface EventoEditorProps {
  /** Evento a editar; null crea uno nuevo. */
  evento: Evento | null;
  onCancelar: () => void;
  /** Recibe el texto con que la pantalla confirma lo que pasó. */
  onGuardado: (texto: string) => void;
}

interface ReglaFilaProps {
  regla: BorradorRegla;
  numero: number;
  puedeQuitar: boolean;
  onCambiar: (nueva: BorradorRegla) => void;
  onQuitar: () => void;
}

const ReglaFila: React.FC<ReglaFilaProps> = ({ regla, numero, puedeQuitar, onCambiar, onQuitar }) => (
  <fieldset className="space-y-3 rounded-card border border-neutral-light bg-neutral-white p-4">
    <legend className="px-1 font-title text-sm font-semibold text-corporate">Descuento {numero}</legend>
    <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
      <Select
        label="¿Qué entra en este descuento?"
        value={regla.tipoObjetivo}
        onChange={(e) => onCambiar({ ...regla, tipoObjetivo: e.target.value as ObjetivoElegido, objetivo: null })}
        options={[
          { value: 'todo', label: 'Todo el catálogo' },
          ...TIPOS_OBJETIVO.map((t) => ({ value: t, label: `Una ${ETIQUETAS_TIPO_REFERENCIA[t].toLowerCase()}` })),
        ]}
      />
      <Input
        label="Porcentaje"
        inputMode="decimal"
        value={regla.porcentaje}
        onChange={(e) => onCambiar({ ...regla, porcentaje: e.target.value })}
        helperText="Ej.: 15 o 12,5"
      />
    </div>
    {regla.tipoObjetivo !== 'todo' && (
      <SelectorReferencia
        key={regla.tipoObjetivo}
        etiqueta={`${ETIQUETAS_TIPO_REFERENCIA[regla.tipoObjetivo]} que recibe el descuento`}
        tipos={[regla.tipoObjetivo]}
        valor={regla.objetivo === null ? [] : [regla.objetivo]}
        maximo={1}
        onChange={(v) => onCambiar({ ...regla, objetivo: v[0] ?? null })}
      />
    )}
    <SelectorReferencia
      etiqueta="Excepciones de este descuento"
      ayuda="Lo que NO recibe este descuento: por ejemplo un producto de la línea, o un color."
      tipos={TIPOS_EXCLUSION}
      valor={regla.exclusiones}
      onChange={(v) => onCambiar({ ...regla, exclusiones: v })}
    />
    {puedeQuitar && (
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          onClick={onQuitar}
        >
          Quitar este descuento
        </Button>
      </div>
    )}
  </fieldset>
);

/**
 * Editor de un evento de descuento: calendario (fechas, días que se repiten, horas), uno o más descuentos con
 * su propio porcentaje y excepciones, y excepciones generales. Convierte el borrador al cuerpo del contrato
 * con `aCuerpoEvento`, que explica en español qué falta.
 */
export const EventoEditor: React.FC<EventoEditorProps> = ({ evento, onCancelar, onGuardado }) => {
  const [b, setB] = useState<BorradorEvento>(() =>
    evento === null ? borradorVacio(hoyBogota()) : borradorDesdeEvento(evento),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const cuerpo = useMemo(() => aCuerpoEvento(b), [b]);

  const cambiar = (parcial: Partial<BorradorEvento>): void => setB((previo) => ({ ...previo, ...parcial }));
  const cambiarRegla = (clave: string, nueva: BorradorRegla): void =>
    setB((previo) => ({ ...previo, reglas: previo.reglas.map((r) => (r.clave === clave ? nueva : r)) }));
  const alternarDia = (dia: number): void =>
    cambiar({
      diasSemana: b.diasSemana.includes(dia) ? b.diasSemana.filter((d) => d !== dia) : [...b.diasSemana, dia],
    });

  const guardar = async (): Promise<void> => {
    setError(null);
    if (!cuerpo.ok) {
      setError(cuerpo.mensaje);
      return;
    }
    setGuardando(true);
    try {
      const guardado =
        evento === null
          ? await eventosApi.crear(cuerpo.valor)
          : await eventosApi.actualizar(evento.idEvento, cuerpo.valor);
      onGuardado(evento === null ? `Evento "${guardado.nombre}" creado.` : `Evento "${guardado.nombre}" guardado.`);
    } catch (err: unknown) {
      setError(leerErrorPrecios(err, 'No se pudo guardar el evento.').message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
      noValidate
      className="space-y-5"
      aria-label={evento === null ? 'Nuevo evento' : `Editar evento ${evento.nombre}`}
    >
      <div>
        <h2 className="font-title text-lg font-semibold text-corporate">
          {evento === null ? 'Nuevo evento' : 'Editar evento'}
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          El nombre se muestra a los clientes y queda en el detalle de cada orden. Editar un evento en curso cambia los
          precios desde ya; las órdenes ya creadas no cambian.
        </p>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      <section className="space-y-3">
        <Input
          label="Nombre del evento"
          value={b.nombre}
          onChange={(e) => cambiar({ nombre: e.target.value })}
          helperText='Ej.: "Miércoles de color".'
        />
        <Textarea
          label="Descripción (opcional)"
          rows={2}
          value={b.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
        />
      </section>

      <fieldset className="space-y-3 rounded-card border border-neutral-light p-4">
        <legend className="px-1 font-title text-sm font-semibold text-corporate">Cuándo</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Desde (fecha)"
            type="date"
            value={b.fechaInicio}
            onChange={(e) => cambiar({ fechaInicio: e.target.value })}
          />
          <Input
            label="Hasta (fecha, opcional)"
            type="date"
            value={b.fechaFin}
            onChange={(e) => cambiar({ fechaFin: e.target.value })}
            helperText="Vacío = sin fecha de fin. Para un solo día, la misma fecha."
          />
        </div>
        <div>
          <p className="mb-1 font-sans text-sm font-medium text-neutral-dark">Se repite los días</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1" role="group" aria-label="Días de la semana">
            {DIAS_SEMANA.map((d) => (
              <Checkbox
                key={d.valor}
                label={d.largo}
                checked={b.diasSemana.includes(d.valor)}
                onChange={() => alternarDia(d.valor)}
              />
            ))}
          </div>
          <p className="mt-1 font-sans text-xs text-neutral-medium">
            Sin marcar ninguno, aplica todos los días del rango.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Desde la hora (opcional)"
            type="time"
            value={b.horaInicio}
            onChange={(e) => cambiar({ horaInicio: e.target.value })}
          />
          <Input
            label="Hasta la hora (opcional)"
            type="time"
            value={b.horaFin}
            onChange={(e) => cambiar({ horaFin: e.target.value })}
            helperText="Hora de Colombia. Sin horas, aplica todo el día."
          />
        </div>
      </fieldset>

      <section className="space-y-3" aria-label="Descuentos del evento">
        <div>
          <h3 className="font-title text-base font-semibold text-corporate">Descuentos</h3>
          <p className="font-sans text-sm text-neutral-medium">
            Cada descuento tiene su propio porcentaje. Si un producto entra en varios, recibe el mayor: no se suman.
          </p>
        </div>
        {b.reglas.map((r, i) => (
          <ReglaFila
            key={r.clave}
            regla={r}
            numero={i + 1}
            puedeQuitar={b.reglas.length > 1}
            onCambiar={(nueva) => cambiarRegla(r.clave, nueva)}
            onQuitar={() => cambiar({ reglas: b.reglas.filter((x) => x.clave !== r.clave) })}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => cambiar({ reglas: [...b.reglas, reglaVacia()] })}
        >
          Agregar otro descuento
        </Button>
      </section>

      <section className="rounded-card border border-neutral-light p-4">
        <SelectorReferencia
          etiqueta="Excepciones de todo el evento"
          ayuda='Lo que ningún descuento de este evento toca. Ej.: la familia de color "Blancos".'
          tipos={TIPOS_EXCLUSION}
          valor={b.exclusiones}
          onChange={(v) => cambiar({ exclusiones: v })}
        />
      </section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-light pt-4">
        <Button type="button" variant="outline" disabled={!cuerpo.ok} onClick={() => setVistaPrevia(true)}>
          Ver qué productos entran
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary-action" isLoading={guardando}>
          {evento === null ? 'Crear evento' : 'Guardar cambios'}
        </Button>
      </div>

      {vistaPrevia && cuerpo.ok && <VistaPreviaEvento cuerpo={cuerpo.valor} onClose={() => setVistaPrevia(false)} />}
    </form>
  );
};
