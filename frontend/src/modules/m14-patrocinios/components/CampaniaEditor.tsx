'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Input, Textarea } from '@/core/components';
import { MAXIMO_OBJETIVOS_CAMPANIA, type Campania } from '../dtos/m14-patrocinios.dto';
import { AYUDA_UBICACION, ETIQUETAS_UBICACION, UBICACIONES, hoyBogota } from '../services/etiquetas';
import {
  aCuerpoCampania,
  borradorDesdeCampania,
  borradorVacio,
  type BorradorCampania,
} from '../services/formularios';
import { leerErrorPatrocinios } from '../services/mensaje-error';
import { campaniasApi } from '../services/patrocinios-api';
import { ProductosCubiertosModal } from './ProductosCubiertosModal';
import { SelectorObjetivos } from './SelectorObjetivos';

export interface CampaniaEditorProps {
  /** Campaña a editar; null crea una nueva. */
  campania: Campania | null;
  onCancelar: () => void;
  /** Recibe el texto con que la pantalla confirma lo que pasó. */
  onGuardado: (texto: string) => void;
}

/**
 * Editor de una campaña de patrocinio: nombre, qué se patrocina (productos, líneas o marcas), vigencia, prioridad y
 * dónde se muestra. Convierte el borrador al cuerpo del contrato con `aCuerpoCampania`, que explica en español qué falta.
 */
export const CampaniaEditor: React.FC<CampaniaEditorProps> = ({ campania, onCancelar, onGuardado }) => {
  const [b, setB] = useState<BorradorCampania>(() =>
    campania === null ? borradorVacio(hoyBogota()) : borradorDesdeCampania(campania),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const cuerpo = useMemo(() => aCuerpoCampania(b), [b]);
  // Estable mientras no cambien los objetivos: la vista previa no debe volver a pedirse en cada tecla.
  const origenVistaPrevia = useMemo(
    () => ({ tipo: 'borrador' as const, objetivos: b.objetivos.map((o) => ({ tipo: o.tipo, id: o.id })) }),
    [b.objetivos],
  );

  const cambiar = (parcial: Partial<BorradorCampania>): void => setB((previo) => ({ ...previo, ...parcial }));
  const alternarUbicacion = (u: BorradorCampania['ubicaciones'][number]): void =>
    cambiar({ ubicaciones: b.ubicaciones.includes(u) ? b.ubicaciones.filter((x) => x !== u) : [...b.ubicaciones, u] });

  const guardar = async (): Promise<void> => {
    setError(null);
    if (!cuerpo.ok) {
      setError(cuerpo.mensaje);
      return;
    }
    setGuardando(true);
    try {
      const guardada =
        campania === null
          ? await campaniasApi.crear(cuerpo.valor)
          : await campaniasApi.actualizar(campania.idCampania, cuerpo.valor);
      onGuardado(
        campania === null ? `Campaña "${guardada.nombre}" creada.` : `Campaña "${guardada.nombre}" guardada.`,
      );
    } catch (err: unknown) {
      setError(leerErrorPatrocinios(err, 'No se pudo guardar la campaña.').message);
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
      aria-label={campania === null ? 'Nueva campaña' : `Editar campaña ${campania.nombre}`}
    >
      <div>
        <h2 className="font-title text-lg font-semibold text-corporate">
          {campania === null ? 'Nueva campaña de patrocinio' : 'Editar campaña'}
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          Los productos patrocinados salen por delante con la etiqueta «Patrocinado». La campaña termina sola el día
          siguiente a su fecha fin; no hay que apagarla. El nombre es interno: el cliente no lo ve.
        </p>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}

      <section className="space-y-3">
        <Input
          label="Nombre de la campaña"
          value={b.nombre}
          onChange={(e) => cambiar({ nombre: e.target.value })}
          helperText='Ej.: "Pintuco · Verano 2026".'
        />
        <Textarea
          label="Descripción (opcional)"
          rows={2}
          value={b.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
        />
      </section>

      <section className="rounded-card border border-neutral-light p-4">
        <SelectorObjetivos
          valor={b.objetivos}
          onChange={(objetivos) => cambiar({ objetivos })}
          maximo={MAXIMO_OBJETIVOS_CAMPANIA}
        />
      </section>

      <fieldset className="space-y-3 rounded-card border border-neutral-light p-4">
        <legend className="px-1 font-title text-sm font-semibold text-corporate">Cuándo y con qué fuerza</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Desde (fecha)"
            type="date"
            value={b.fechaInicio}
            onChange={(e) => cambiar({ fechaInicio: e.target.value })}
          />
          <Input
            label="Hasta (fecha)"
            type="date"
            value={b.fechaFin}
            onChange={(e) => cambiar({ fechaFin: e.target.value })}
            helperText="Incluida. Toda campaña termina."
          />
          <Input
            label="Prioridad (0 a 100)"
            inputMode="numeric"
            value={b.prioridad}
            onChange={(e) => cambiar({ prioridad: e.target.value })}
            helperText="Si un producto está en varias campañas, gana la de mayor prioridad."
          />
        </div>
      </fieldset>

      <fieldset className="space-y-2 rounded-card border border-neutral-light p-4">
        <legend className="px-1 font-title text-sm font-semibold text-corporate">Dónde se muestra</legend>
        {UBICACIONES.map((u) => (
          <div key={u}>
            <Checkbox
              label={ETIQUETAS_UBICACION[u]}
              checked={b.ubicaciones.includes(u)}
              onChange={() => alternarUbicacion(u)}
            />
            <p className="ml-7 font-sans text-xs text-neutral-medium">{AYUDA_UBICACION[u]}</p>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-light pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={b.objetivos.length === 0}
          onClick={() => setVistaPrevia(true)}
        >
          Ver qué productos cubre
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary-action" isLoading={guardando}>
          {campania === null ? 'Crear campaña' : 'Guardar cambios'}
        </Button>
      </div>

      {vistaPrevia && (
        <ProductosCubiertosModal
          origen={origenVistaPrevia}
          titulo={b.nombre.trim() === '' ? 'Borrador' : b.nombre}
          onClose={() => setVistaPrevia(false)}
        />
      )}
    </form>
  );
};
