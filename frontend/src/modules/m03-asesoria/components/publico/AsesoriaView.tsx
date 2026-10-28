'use client';

import { useState } from 'react';
import { Container, SegmentedTabs } from '@/core/components';
import { AsistenteView } from './AsistenteView';
import { CalculadoraGeneralView } from './CalculadoraGeneralView';
import { CuestionarioGuiadoView } from './CuestionarioGuiadoView';

type Seccion = 'asistida' | 'calculadora' | 'asistente';

/**
 * Las dos herramientas de asesoría sin IA: la búsqueda asistida (HU-ASE-01) y la calculadora
 * general (HU-ASE-02). Va aparte de la página para que esta pueda declarar su `metadata`,
 * que un componente de cliente no puede exportar.
 */
export function AsesoriaView() {
  const [seccion, setSeccion] = useState<Seccion>('asistida');

  return (
    <Container>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="font-title text-2xl font-semibold text-neutral-dark sm:text-3xl">
            Te ayudamos a elegir
          </h1>
          <p className="font-sans text-sm text-neutral-medium sm:text-base">
            Responde unas pocas preguntas y te mostramos las pinturas que sirven para tu proyecto,
            o calcula cuánta pintura necesitas.
          </p>
        </header>

        <SegmentedTabs
          value={seccion}
          onChange={setSeccion}
          ariaLabel="Secciones de asesoría"
          panelId="panel-asesoria"
          idPrefix="tab-asesoria"
          options={[
            { value: 'asistida', label: 'Qué pintura necesito' },
            { value: 'calculadora', label: 'Cuánta pintura necesito' },
            { value: 'asistente', label: 'Preguntar al asistente' },
          ]}
        />

        <div id="panel-asesoria" role="tabpanel">
          {seccion === 'asistida' && <CuestionarioGuiadoView />}
          {seccion === 'calculadora' && <CalculadoraGeneralView />}
          {seccion === 'asistente' && <AsistenteView />}
        </div>
      </div>
    </Container>
  );
}
