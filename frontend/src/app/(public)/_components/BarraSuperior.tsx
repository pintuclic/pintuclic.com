'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/core/components';
import { obtenerCanal, obtenerHorario } from '@/modules/m15-atencion/services/atencion-api';
import { obtenerContactoPublico } from '@/modules/m16-contenido/services/contenido-api';
import { itemsBarraSuperior, type DatosBarraSuperior } from '../_data/barra-superior';

const SIN_DATOS: DatosBarraSuperior = { contacto: null, horario: null, canal: null };

/**
 * La franja azul de arriba con datos reales: horario y WhatsApp (M15) y teléfono y correo (M16). Mientras llegan, o si
 * alguno falla, muestra solo lo que sí se tiene (y siempre los enlaces a envíos y ayuda).
 */
export function BarraSuperior() {
  const [datos, setDatos] = useState<DatosBarraSuperior>(SIN_DATOS);

  useEffect(() => {
    let activo = true;
    void Promise.allSettled([obtenerContactoPublico(), obtenerHorario(), obtenerCanal()]).then(([contacto, horario, canal]) => {
      if (!activo) return;
      setDatos({
        contacto: contacto.status === 'fulfilled' ? contacto.value : null,
        horario: horario.status === 'fulfilled' ? horario.value : null,
        canal: canal.status === 'fulfilled' ? canal.value : null,
      });
    });
    return () => {
      activo = false;
    };
  }, []);

  return <Topbar items={itemsBarraSuperior(datos)} />;
}
