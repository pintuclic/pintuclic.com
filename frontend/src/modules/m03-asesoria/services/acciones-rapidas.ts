/**
 * Los atajos que el asistente ofrece al abrirse (mockup VISTAS.pdf, pág. 11).
 *
 * Hay dos clases, y la diferencia NO es estética: es de contrato.
 *
 *  · `pregunta` escribe ese texto en el chat como si lo hubiera escrito la persona.
 *  · `enlace` lleva a otra pantalla sin pasar por la IA.
 *
 * Dos atajos del mockup —el pedido y las promociones— piden justo lo que las reglas duras
 * le prohíben al modelo: datos de órdenes, precios y descuentos (instrucciones.ts). Si se
 * mandaran al chat, la IA se negaría y la persona vería un atajo que no hace nada. Por eso
 * van como enlace a la pantalla que sí tiene ese dato.
 */

export type AccionRapida =
  | { id: string; icono: string; etiqueta: string; tipo: 'pregunta'; texto: string }
  | { id: string; icono: string; etiqueta: string; tipo: 'enlace'; href: string };

export const ACCIONES_RAPIDAS: readonly AccionRapida[] = [
  {
    id: 'buscar',
    icono: '🔍',
    etiqueta: 'Buscar productos',
    tipo: 'pregunta',
    texto: '¿Qué productos tienen para mi proyecto?',
  },
  {
    id: 'recomendar',
    icono: '🎨',
    etiqueta: 'Recomendar pintura',
    tipo: 'pregunta',
    texto: 'Necesito pintura para pintar una habitación',
  },
  {
    id: 'pedido',
    icono: '📦',
    etiqueta: 'Consultar mi pedido',
    tipo: 'enlace',
    href: '/perfil/pedidos',
  },
  {
    id: 'herramientas',
    icono: '🛠️',
    etiqueta: 'Herramientas recomendadas',
    tipo: 'pregunta',
    texto: '¿Qué herramientas necesito para pintar?',
  },
  {
    id: 'promociones',
    icono: '💰',
    etiqueta: 'Ver promociones',
    tipo: 'enlace',
    href: '/ofertas',
  },
] as const;
