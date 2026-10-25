import type { Metadata } from 'next';
import { CentroAyudaFaqView } from '@/modules/m16-contenido/components/publico/CentroAyudaFaqView';
import { ContactoYHorarioView } from '@/modules/m15-atencion/components/publico/ContactoYHorarioView';

export const metadata: Metadata = {
  title: 'Centro de Ayuda y Preguntas Frecuentes — Pintu Clic',
  description:
    'Respuestas a las preguntas frecuentes sobre compras, colores entonados, envíos y cuentas empresa en Pintu Clic, con el horario de atención y el contacto directo con un asesor.',
};

/**
 * Las preguntas frecuentes las sirve M16, dueño del contenido. Debajo, M15 suma
 * el contacto con el equipo: formulario, horario de atención y WhatsApp.
 */
export default function CentroDeAyudaPage() {
  return (
    <>
      <CentroAyudaFaqView />
      <ContactoYHorarioView />
    </>
  );
}
