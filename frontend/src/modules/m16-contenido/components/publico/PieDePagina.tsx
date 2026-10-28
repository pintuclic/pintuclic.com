'use client';

import { useEffect, useState } from 'react';
import { Footer, type FooterProps } from '@/core/components';
import type { ContactoPublico } from '../../dtos/m16-contenido.dto';
import { contactoParaPie } from '../../services/contacto-pie';
import { obtenerContactoPublico } from '../../services/contenido-api';

/**
 * Pie de la tienda con el contacto y las redes reales (M16 · HU-CON-05). El resto del pie (enlaces, pagos, marca) viene
 * del contenido del sitio. Si la ficha no carga, el pie se ve completo pero sin la columna de contacto ni redes.
 */
export function PieDePagina(props: Omit<FooterProps, 'contact' | 'socials'>) {
  const [contacto, setContacto] = useState<ContactoPublico | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerContactoPublico()
      .then((c) => {
        if (activo) setContacto(c);
      })
      .catch(() => {
        // Sin contacto no se inventa nada: el pie sigue sin esa columna.
      });
    return () => {
      activo = false;
    };
  }, []);

  return <Footer {...props} {...contactoParaPie(contacto)} />;
}
