'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Input, Select } from '@/core/components';
import type { Calculo, ReferenciaCatalogo, SimularRequest } from '../dtos/m06-precios.dto';
import { useCargar } from '../hooks/useCargar';
import { aInstanteBogota } from '../services/etiquetas';
import { nuevaClave } from '../services/formularios';
import { leerErrorPrecios } from '../services/mensaje-error';
import { parsearEntero } from '../services/numeros';
import { simuladorApi, tiposClienteApi } from '../services/precios-api';
import { DesgloseCalculo } from './DesgloseCalculo';
import { SelectorReferencia } from './SelectorReferencia';

interface LineaSimulada {
  clave: string;
  variante: ReferenciaCatalogo | null;
  cantidad: string;
}

const lineaNueva = (): LineaSimulada => ({ clave: nuevaClave(), variante: null, cantidad: '1' });

/**
 * Simulador de precios (D12): calcula un carrito inventado para un tipo de cliente y un momento cualquiera,
 * sin guardar nada. Sirve para comprobar un evento o un descuento antes de publicarlo.
 */
export const SimuladorView: React.FC = () => {
  const tipos = useCargar(
    useCallback(() => tiposClienteApi.listar(), []),
    'No se pudieron cargar los tipos de cliente.',
  );
  const [lineas, setLineas] = useState<LineaSimulada[]>([lineaNueva()]);
  const [perfil, setPerfil] = useState('particular');
  const [idUsuario, setIdUsuario] = useState('');
  const [momento, setMomento] = useState('');
  const [cupon, setCupon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [resultado, setResultado] = useState<{ calculo: Calculo; nombres: Map<number, string> } | null>(null);

  const opcionesPerfil = useMemo(
    () => [
      { value: 'particular', label: 'Cliente particular' },
      { value: 'empresa-sin-tipo', label: 'Cuenta empresa sin tipo asignado' },
      ...(tipos.datos ?? [])
        .filter((t) => t.estado === 'activo')
        .map((t) => ({ value: `empresa-${t.idSubRolEmpresa}`, label: `Cuenta empresa · ${t.nombre}` })),
    ],
    [tipos.datos],
  );

  const cambiarLinea = (clave: string, parcial: Partial<LineaSimulada>): void =>
    setLineas((previo) => previo.map((l) => (l.clave === clave ? { ...l, ...parcial } : l)));

  const simular = async (): Promise<void> => {
    setError(null);
    const pedidas: SimularRequest['lineas'] = [];
    for (const [i, l] of lineas.entries()) {
      const cantidad = parsearEntero(l.cantidad);
      if (l.variante === null) return setError(`Línea ${i + 1}: elija una variante.`);
      if (cantidad === null || cantidad < 1)
        return setError(`Línea ${i + 1}: la cantidad debe ser un número entero de 1 en adelante.`);
      pedidas.push({ idVariante: l.variante.id, cantidad });
    }
    const usuario = idUsuario.trim() === '' ? null : parsearEntero(idUsuario);
    if (idUsuario.trim() !== '' && (usuario === null || usuario < 1))
      return setError('El id de usuario debe ser un número entero positivo.');
    const instante = momento === '' ? null : aInstanteBogota(momento);
    if (momento !== '' && instante === null) return setError('La fecha y hora no son válidas.');

    const cuerpo: SimularRequest = {
      lineas: pedidas,
      perfil:
        perfil === 'particular'
          ? { tipo: 'particular', idSubRolEmpresa: null }
          : {
              tipo: 'empresa',
              idSubRolEmpresa: perfil === 'empresa-sin-tipo' ? null : Number(perfil.replace('empresa-', '')),
            },
      ...(cupon.trim() === '' ? {} : { codigoCupon: cupon.trim() }),
      ...(usuario === null ? {} : { idUsuario: usuario }),
      ...(instante === null ? {} : { momento: instante }),
    };
    setCalculando(true);
    try {
      const calculo = await simuladorApi.simular(cuerpo);
      setResultado({
        calculo,
        nombres: new Map(
          lineas.flatMap((l) => (l.variante === null ? [] : [[l.variante.id, l.variante.nombre] as const])),
        ),
      });
    } catch (err: unknown) {
      setError(leerErrorPrecios(err, 'No se pudo simular el cálculo.').message);
    } finally {
      setCalculando(false);
    }
  };

  return (
    <section aria-labelledby="titulo-simulador" className="space-y-4">
      <div>
        <h2 id="titulo-simulador" className="font-title text-lg font-semibold text-corporate">
          Simulador
        </h2>
        <p className="font-sans text-sm text-neutral-medium">
          Arme un carrito de ejemplo y vea qué precio pagaría cada tipo de cliente en la fecha que elija. No guarda
          nada.
        </p>
      </div>

      {error !== null && <Alert variant="error">{error}</Alert>}
      {tipos.error !== null && <Alert variant="error">{tipos.error}</Alert>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void simular();
        }}
        noValidate
        className="space-y-4"
      >
        <div className="space-y-3">
          {lineas.map((l, i) => (
            <fieldset key={l.clave} className="space-y-2 rounded-card border border-neutral-light bg-neutral-white p-4">
              <legend className="px-1 font-title text-sm font-semibold text-corporate">Línea {i + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <SelectorReferencia
                  etiqueta="Variante"
                  tipos={['variante']}
                  valor={l.variante === null ? [] : [l.variante]}
                  maximo={1}
                  onChange={(v) => cambiarLinea(l.clave, { variante: v[0] ?? null })}
                />
                <Input
                  label="Cantidad"
                  inputMode="numeric"
                  value={l.cantidad}
                  onChange={(e) => cambiarLinea(l.clave, { cantidad: e.target.value })}
                />
              </div>
              {lineas.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setLineas(lineas.filter((x) => x.clave !== l.clave))}
                  >
                    Quitar línea
                  </Button>
                </div>
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setLineas([...lineas, lineaNueva()])}
          >
            Agregar otra línea
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="¿Quién compra?"
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            options={opcionesPerfil}
          />
          <Input label="Código de cupón (opcional)" value={cupon} onChange={(e) => setCupon(e.target.value)} />
          <Input
            label="Fecha y hora (opcional)"
            type="datetime-local"
            value={momento}
            onChange={(e) => setMomento(e.target.value)}
            helperText="Hora de Colombia. Vacío = ahora."
          />
          <Input
            label="Id de usuario (opcional)"
            inputMode="numeric"
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value)}
            helperText="Para probar el límite de usos de un cupón y la invitación a pedir cuenta empresa (cliente registrado)."
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary-action" isLoading={calculando}>
            Simular
          </Button>
        </div>
      </form>

      {resultado !== null && <DesgloseCalculo calculo={resultado.calculo} nombres={resultado.nombres} />}
    </section>
  );
};
