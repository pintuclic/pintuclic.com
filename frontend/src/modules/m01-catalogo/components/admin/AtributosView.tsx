'use client';

import React, { useState } from 'react';
import { Select } from '@/core/components';
import { ACABADO_POR_DEFECTO } from '../../dtos/m01-catalogo.dto';
import { acabadosApi, basesApi, familiasColorApi, superficiesApi, tiposResinaApi } from '../../services/catalogo-api';
import { CatalogoSimpleView } from './CatalogoSimpleView';

type Atributo = 'superficies' | 'resinas' | 'acabados' | 'bases' | 'familias';

const OPCIONES: ReadonlyArray<{ value: Atributo; label: string }> = [
  { value: 'superficies', label: 'Superficies' },
  { value: 'resinas', label: 'Tipos de resina' },
  { value: 'acabados', label: 'Acabados' },
  { value: 'bases', label: 'Bases' },
  { value: 'familias', label: 'Familias de color' },
];

/** HU-CAT-12: los catálogos pequeños que describen un producto y sus colores. */
export const AtributosView: React.FC = () => {
  const [atributo, setAtributo] = useState<Atributo>('superficies');
  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select
          label="Catálogo"
          value={atributo}
          onChange={(e) => setAtributo(e.target.value as Atributo)}
          options={[...OPCIONES]}
        />
      </div>
      {atributo === 'superficies' && (
        <CatalogoSimpleView
          key={atributo}
          titulo="Superficies"
          articulo="la superficie"
          descripcion="Dónde se aplica un producto: muros, madera, metal… Sirve de filtro en la vitrina."
          listar={() => superficiesApi.listar()}
          obtenerId={(e) => e.idSuperficie}
          crear={superficiesApi.crear}
          editar={superficiesApi.editar}
          cambiarEstado={superficiesApi.cambiarEstado}
          impacto={superficiesApi.impacto}
        />
      )}
      {atributo === 'resinas' && (
        <CatalogoSimpleView
          key={atributo}
          titulo="Tipos de resina"
          articulo="el tipo de resina"
          descripcion="Vinílica, acrílica, alquídica… Va en la ficha de recubrimiento de cada pintura."
          listar={() => tiposResinaApi.listar()}
          obtenerId={(e) => e.idTipoResina}
          crear={tiposResinaApi.crear}
          editar={tiposResinaApi.editar}
          cambiarEstado={tiposResinaApi.cambiarEstado}
          impacto={tiposResinaApi.impacto}
        />
      )}
      {atributo === 'acabados' && (
        <CatalogoSimpleView
          key={atributo}
          titulo="Acabados"
          articulo="el acabado"
          descripcion={`Mate, satinado, brillante… ${ACABADO_POR_DEFECTO} es el acabado por defecto de los colores y no se puede desactivar.`}
          listar={() => acabadosApi.listar()}
          obtenerId={(e) => e.idAcabado}
          crear={acabadosApi.crear}
          editar={acabadosApi.editar}
          cambiarEstado={acabadosApi.cambiarEstado}
          impacto={acabadosApi.impacto}
          protegido={(e) => e.nombre.toLowerCase() === ACABADO_POR_DEFECTO.toLowerCase()}
        />
      )}
      {atributo === 'bases' && (
        <CatalogoSimpleView
          key={atributo}
          titulo="Bases"
          articulo="la base"
          descripcion="Tint, Deep, Pastel, Accent… Un color con base se ofrece en los productos entonables que la tengan."
          listar={() => basesApi.listar()}
          obtenerId={(e) => e.idBase}
          crear={basesApi.crear}
          editar={basesApi.editar}
          cambiarEstado={basesApi.cambiarEstado}
          impacto={basesApi.impacto}
        />
      )}
      {atributo === 'familias' && (
        <CatalogoSimpleView
          key={atributo}
          titulo="Familias de color"
          articulo="la familia de color"
          descripcion="Blancos, rojos, azules… Agrupan la carta de colores en el selector del cliente."
          listar={() => familiasColorApi.listar()}
          obtenerId={(e) => e.idFamiliaColor}
          crear={familiasColorApi.crear}
          editar={familiasColorApi.editar}
          cambiarEstado={familiasColorApi.cambiarEstado}
          impacto={familiasColorApi.impacto}
          conHexadecimal
        />
      )}
    </div>
  );
};
