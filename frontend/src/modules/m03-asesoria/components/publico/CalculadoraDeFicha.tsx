'use client';

import { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Modal } from '@/core/components';
import type { CalculadoraProducto } from '../../interfaces/asesoria.interface';
import { obtenerCalculadoraDeProducto } from '../../services/asesoria-api';
import { esSinCalculadora } from '../../services/mensaje-error';
import { CalculadoraPintura } from './CalculadoraPintura';

export interface CalculadoraDeFichaProps {
  idProducto: number;
  /**
   * La presentación que la persona ya eligió en la ficha. La calculadora abre en ella para
   * no hacerle elegir dos veces lo mismo.
   */
  idVarianteElegida?: number | null;
}

/**
 * HU-ASE-02 — La calculadora en la ficha de producto (mockup VISTAS.pdf, pág. 10): un botón
 * bajo las presentaciones que abre la calculadora en un diálogo.
 *
 * **Por qué vive en M03 y no en M01.** Quien decide si un producto tiene calculadora es la
 * regla K1 del contrato (rendimiento registrado y al menos una presentación de volumen), y
 * esa regla es de M03. Si M01 la reprodujera para decidir si pinta el botón, habría dos
 * copias de la misma regla y acabarían separándose. Así M01 monta este componente y ya: si
 * el producto no cumple, aquí no se dibuja NADA, ni el botón (RF-ASE-02-07, CA-ASE-02-07).
 *
 * Por eso se piden los datos al montar y no al abrir: hay que saber si el botón existe. Los
 * mismos datos se le pasan luego a la calculadora, así que abrir el diálogo no cuesta otra
 * petición.
 */
export function CalculadoraDeFicha({ idProducto, idVarianteElegida = null }: CalculadoraDeFichaProps) {
  const [datos, setDatos] = useState<CalculadoraProducto | null>(null);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    setAbierta(false);

    obtenerCalculadoraDeProducto(idProducto)
      .then((respuesta) => {
        if (vigente) setDatos(respuesta);
      })
      .catch((err: unknown) => {
        // Un producto sin calculadora no es un fallo: es el caso normal de media tienda.
        // Cualquier otro error tampoco se anuncia aquí; esto es un añadido de la ficha y
        // un aviso rojo junto al botón de comprar asustaría sin que haya nada que hacer.
        if (!esSinCalculadora(err) && vigente) setDatos(null);
      });

    return () => {
      vigente = false;
    };
  }, [idProducto]);

  if (datos === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-btn border border-neutral-light bg-neutral-white px-4 py-3 font-title text-sm font-semibold text-neutral-dark transition-colors hover:border-action/50 hover:bg-subaction/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50"
      >
        <span>Calcula cuánta pintura necesitas</span>
        <Calculator className="h-5 w-5 shrink-0 text-neutral-medium" aria-hidden="true" />
      </button>

      <Modal
        isOpen={abierta}
        onClose={() => setAbierta(false)}
        title="Calculadora de pintura"
        subtitle="Te ayudamos a calcular la cantidad de pintura que necesitas para tu proyecto."
        size="xl"
      >
        <CalculadoraPintura
          idProducto={idProducto}
          datosIniciales={datos}
          idVarianteInicial={idVarianteElegida}
          incrustada
          mostrarNombre={false}
        />
      </Modal>
    </>
  );
}
