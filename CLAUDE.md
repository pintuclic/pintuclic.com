# Pintu Clic — contexto para Claude

Las reglas están en [AGENTS.md](./AGENTS.md) y rigen por completo.

## Al iniciar una sesión (antes de preguntar nada)

1. Mira la rama actual y su módulo (`feature/m[xx]-nombre`).
2. Lee el contrato del módulo en `contracts/` y, si existe, su spec en `docs/02_MODULOS_FUNCIONALES/`.
3. No pidas al usuario que te explique el proyecto: la respuesta está en AGENTS.md, el contrato y los docs.
   Pregunta solo lo que esos archivos no resuelvan.

## Flujo de un módulo (detalle en AGENTS.md)

Contrato juntos → PR general de archivos compartidos → módulo completo (backend y frontend).
**Una vez el contrato está dado por bueno, empieza a programar sin pedir más permisos.** No esperes aprobación entre
el backend y el frontend ni entre partes del módulo. Detente solo si necesitas tocar otro módulo, si el contrato no
alcanza, o si un dato del cliente no está escrito.

## Trabajo en paralelo

Otros compañeros editan otros módulos al mismo tiempo. No toques código fuera del módulo de la rama.
Los cambios en archivos compartidos van en un PR pequeño aparte (ver AGENTS.md).

## Al terminar

Corre los checks de AGENTS.md y deja el PR listo con su descripción corta. Informa con honestidad qué quedó hecho,
qué se probó de verdad y qué falta: no digas que algo está listo si no lo ejecutaste.
