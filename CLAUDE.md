# Pintu Clic — contexto para Claude

Las reglas del proyecto están en [AGENTS.md](./AGENTS.md) y rigen aquí por completo. Este archivo solo indica por dónde empezar.

## Al iniciar cualquier sesión (antes de preguntar nada al usuario)

1. Lee `.sdlc/.workflow/current_state.json`. Ahí está dónde vamos: `fase_activa`, `gate_activo`, `estado`, `rol_en_turno`, `modulo_en_curso`, `bloqueos` y `nota_de_contexto`.
2. Respeta la fase: en `FASE_1_PRD` y `FASE_2_ARQUITECTURA` no se escribe código de negocio (ver AGENTS.md). Si `estado` es `ESPERANDO_APROBACION_HUMANA`, detente y pide la firma.
3. Si necesitas más detalle del módulo en curso, mira `.sdlc/docs/modules/M[XX]/` y el `WORKLOG.md` del rol en turno en `.sdlc/multiAgents/`.
4. No pidas al usuario que te explique el proyecto ni qué archivos leer: la respuesta está en los pasos anteriores. Pregunta solo lo que esos archivos no resuelvan.

## Trabajo en paralelo

Otros agentes (por ejemplo backend) pueden estar editando el repo al mismo tiempo. Archivos sin versionar dentro del módulo en curso suelen ser trabajo suyo, no algo huérfano. Verifica con `current_state.json` antes de opinar o de tocarlos.

## Al cerrar una sesión

Si hubo avances, recuerda al usuario guardar el contexto con `/ecc:ck` (acción `save`). `current_state.json` sigue siendo la fuente de verdad; ck solo guarda notas personales entre sesiones.
