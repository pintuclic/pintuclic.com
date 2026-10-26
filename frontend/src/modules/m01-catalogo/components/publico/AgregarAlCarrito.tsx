'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Alert, Button, IconButton, Input } from '@/core/components';
import { agregarAlCarrito, mensajeErrorCarrito } from '../../services/carrito-publico';

const CANTIDAD_MAXIMA = 9_999;

export interface AgregarAlCarritoProps {
  idVariante: number | null;
  idColor: number | null;
  /** El producto se vende con color: hay que elegirlo antes de agregar. */
  requiereColor: boolean;
  /** Combo agotado o presentación no vendible. */
  bloqueado: boolean;
}

/** Cantidad y "Agregar al carrito" de la ficha (M05 · P3). */
export function AgregarAlCarrito({ idVariante, idColor, requiereColor, bloqueado }: AgregarAlCarritoProps) {
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const faltaColor = requiereColor && idColor === null;
  const deshabilitado = bloqueado || idVariante === null || faltaColor || enviando;

  const cambiar = (valor: number): void => {
    setResultado(null);
    setCantidad(Math.min(CANTIDAD_MAXIMA, Math.max(1, Number.isFinite(valor) ? Math.trunc(valor) : 1)));
  };

  const agregar = async (): Promise<void> => {
    if (idVariante === null) return;
    setEnviando(true);
    setResultado(null);
    try {
      await agregarAlCarrito(idVariante, idColor, cantidad);
      setResultado({ ok: true, mensaje: `Agregaste ${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} al carrito.` });
    } catch (err: unknown) {
      setResultado({ ok: false, mensaje: mensajeErrorCarrito(err) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton
            aria-label="Restar una unidad"
            variant="ghost"
            size="sm"
            disabled={cantidad <= 1 || enviando}
            onClick={() => cambiar(cantidad - 1)}
          >
            <Minus aria-hidden className="h-4 w-4" />
          </IconButton>
          <div className="w-20">
            <Input
              id="cantidad-ficha"
              aria-label="Cantidad"
              inputMode="numeric"
              value={String(cantidad)}
              disabled={enviando}
              onChange={(e) => cambiar(Number(e.target.value))}
              className="text-center"
            />
          </div>
          <IconButton
            aria-label="Sumar una unidad"
            variant="ghost"
            size="sm"
            disabled={cantidad >= CANTIDAD_MAXIMA || enviando}
            onClick={() => cambiar(cantidad + 1)}
          >
            <Plus aria-hidden className="h-4 w-4" />
          </IconButton>
        </div>
        <Button
          variant="primary-conversion"
          leftIcon={<ShoppingCart aria-hidden className="h-5 w-5" />}
          isLoading={enviando}
          disabled={deshabilitado}
          onClick={() => void agregar()}
        >
          Agregar al carrito
        </Button>
      </div>

      {faltaColor && !bloqueado && <p className="text-sm text-neutral-medium">Elige un color para agregarlo al carrito.</p>}

      {resultado !== null &&
        (resultado.ok ? (
          <Alert variant="success">
            {resultado.mensaje}{' '}
            <Link href="/carrito" className="font-semibold text-action underline hover:text-action-hover">
              Ver carrito
            </Link>
          </Alert>
        ) : (
          <Alert variant="error">{resultado.mensaje}</Alert>
        ))}
    </div>
  );
}
