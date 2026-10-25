'use client';

import React, { useState } from 'react';
import { Alert, Button, Modal } from '@/core/components';
import type { Categoria, Subcategoria } from '../../dtos/m01-catalogo.dto';
import { subcategoriasApi } from '../../services/catalogo-api';
import { leerErrorCatalogo } from '../../services/mensaje-error';
import { SelectorBuscable } from './campos';

export interface ComplementariosSubcategoriaModalProps {
  subcategoria: Subcategoria;
  /** Categorías activas entre las que se puede elegir. */
  categorias: readonly Categoria[];
  onClose: () => void;
  onGuardado: (texto: string) => void;
}

/**
 * Entrega 3 (D6): categoría de la que se sugieren productos complementarios en la ficha de los productos
 * de esta subcategoría. Un producto puede fijar la suya y esa manda.
 */
export const ComplementariosSubcategoriaModal: React.FC<ComplementariosSubcategoriaModalProps> = ({
  subcategoria,
  categorias,
  onClose,
  onGuardado,
}) => {
  const [valor, setValor] = useState(
    subcategoria.idCategoriaComplementaria === null ? '' : String(subcategoria.idCategoriaComplementaria),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      await subcategoriasApi.editar(subcategoria.idSubcategoria, {
        idCategoriaComplementaria: valor === '' ? null : Number(valor),
      });
      onGuardado(`Categoría complementaria de ${subcategoria.nombre} actualizada.`);
      onClose();
    } catch (err: unknown) {
      setError(leerErrorCatalogo(err, 'No se pudo guardar.').message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen
      closeOnOutsideClick={false}
      onClose={onClose}
      title="Productos complementarios"
      subtitle={subcategoria.nombre}
      size="md"
    >
      <div className="space-y-4 py-2">
        {error !== null && <Alert variant="error">{error}</Alert>}
        <p className="font-sans text-sm text-neutral-dark">
          En la ficha de los productos de esta subcategoría se sugieren hasta 4 productos de la categoría que elija, con
          los patrocinados primero. Si un producto tiene su propia categoría complementaria, esa manda.
        </p>
        <SelectorBuscable
          label="Categoría de la que se sugieren"
          value={valor}
          onChange={setValor}
          options={categorias.map((c) => ({ value: String(c.idCategoria), label: c.nombre }))}
          textoSinElegir="Ninguna (solo patrocinados)"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary-action" isLoading={guardando} onClick={() => void guardar()}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
