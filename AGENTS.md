# AGENTS.md — Pintu Clic

Plataforma e-commerce de pinturas (pintuclic.com). Equipo pequeño: 4 desarrolladores y 1 DevOps.
Flujo ágil: **sin gates, firmas ni roles de agente**. La calidad la dan el CI y la revisión cruzada de cada PR.

**Stack:** Backend Express 5 + Prisma 6 + Zod 4 + Vitest 3 + JWT + bcrypt (costo 12). Frontend Next.js 15 + React 19 + Tailwind 4 + Zustand 5 + React Hook Form.

## Cómo se trabaja

Cada módulo sigue **tres etapas, en este orden**. La única aprobación humana es la del contrato.

1. **Contrato, juntos.** Se escribe con el Tech Lead `contracts/m[xx]-nombre.contract.ts`: qué hace, qué NO hace,
   reglas, endpoints y esquemas Zod. **La voz de la verdad es el contrato**; la documentación de `docs/` es guía.
   Cuando el Tech Lead lo da por bueno, termina la etapa y **no se vuelve a pedir permiso para programar**.
2. **PR general (archivos compartidos).** Lo que el módulo necesita de fuera de su carpeta (BD, `schema.prisma`, seed,
   permisos, `app.routes.ts`, `core/`) va en **un PR pequeño aparte**, que se fusiona primero.
3. **El módulo completo, backend y frontend.** Con el contrato firmado y el PR general en `main`, se construye todo el
   módulo (código, pruebas y pantallas) en su rama `feature/m[xx]-nombre`, sin pausas de aprobación entre piezas.
   Se avanza por partes pequeñas (commits) y se abre el PR del módulo cuando está completo.

Durante la etapa 3 solo se detiene para preguntar si: (a) hay que cambiar código de **otro** módulo, (b) el contrato no
alcanza o se contradice, o (c) un dato depende del cliente y no está escrito. En (b) y (c) se propone el cambio al
contrato y se sigue con el resto. Al cerrar, se informa qué quedó hecho, qué se probó y qué falta; no se declara
"listo" lo que no se ejecutó.

El orden de módulos sigue [`RUTA_DEL_PROYECTO.md`](docs/00_SISTEMA/01_ARQUITECTURA/RUTA_DEL_PROYECTO.md) como guía:
si falta un predecesor, avisa al usuario y propone una alternativa; decide el Tech Lead.

## Antes de escribir código

1. Lee el contrato `contracts/m[xx]-nombre.contract.ts`. **El contrato es la especificación.**
   Si no existe, es la etapa 1: escríbelo con el usuario (qué hace, qué NO hace, reglas, endpoints y esquemas Zod).
2. Si existe, lee la spec en `docs/02_MODULOS_FUNCIONALES/` o `docs/01_TRANSVERSALES/` y los diagramas en
   `docs/assets/diagrams/M[XX]/`. Los diagramas siguen siendo contrato de flujo (estados, ramas, errores).
3. Lee [`backend/ARQUITECTURA.md`](backend/ARQUITECTURA.md) y [`frontend/ARQUITECTURA.md`](frontend/ARQUITECTURA.md).
4. Si algo depende del cliente y no está claro, anótalo como pregunta en el contrato y sigue con el resto.

## Reglas de código

- **Aislamiento:** el código de un módulo vive solo en `src/modules/m[xx]-nombre/` (backend y frontend), en minúsculas y kebab-case.
- **Archivos compartidos** (`prisma/schema.prisma`, `bd/sql/*`, seed, permisos, `app.routes.ts`, `core/`):
  van en un **PR pequeño aparte** y se avisa al equipo, para evitar conflictos. No los edites dentro del PR del módulo.
  Si necesitas cambiar código de OTRO módulo, detente y pregunta al usuario.
- **TypeScript estricto, cero `any`.**
- **Backend:** Prisma tipado (cero SQL concatenado), Zod en `body`, `query` y `params`, repositorios con el singleton de `core/db/client.ts`.
- **Frontend:** componentes de `frontend/src/core/components/` (Core Kit); colores solo de `frontend/src/core/theme/colors.ts`
  (ver [`GUIA_COLORES.md`](frontend/src/core/theme/GUIA_COLORES.md)); esquemas Zod en `dtos/`, nunca inline en `.tsx`;
  formularios con React Hook Form + `zodResolver`. La fuente del diseño es [`ESPECIFICACION_TECNICA_UI_UX.md`](docs/00_SISTEMA/01_ARQUITECTURA/ESPECIFICACION_TECNICA_UI_UX.md)
  y el Core Kit. Los mockups de `docs/assets/mockups/` son solo una mini guía visual: están hechos a la ligera.
  **Nunca agregues funciones, botones o secciones porque aparecen en un mockup.** Lo que se construye es lo que
  el contrato del módulo define; si un mockup muestra algo fuera de él (carrito, calculadora, asesoría de color…),
  pertenece a otro módulo y se deja fuera.
  **Textos de la interfaz:** describen lo que el usuario puede hacer, nunca el desarrollo (sin códigos de historia
  de usuario, reglas, decisiones ni referencias al contrato). Las descripciones se conservan; la jerga interna no.
  **Navegación didáctica:** donde una pantalla muestra algo que tiene elementos relacionados en otra (una marca y sus
  productos, una categoría y sus productos…), ofrece un enlace "Ver …" que abre esa lista ya filtrada. Los filtros viajan
  en la URL y la lista destino tiene el filtro correspondiente.
  **Selectores nuevos:** todo selector nuevo con más de unas pocas opciones lleva buscador (lista desplegable con
  búsqueda). Si dos selectores se relacionan (categoría y subcategoría), filtran uno al otro.
  **Obligatorios:** un campo requerido se valida en el formulario con un mensaje que diga qué falta; nunca se deja
  llegar un error genérico de validación.
- **Datos iniciales:** solo en `bd/sql/seed_pintuclic.sql` (`npm run db:seed`, ver [`GUIA_MOCKS_Y_DATOS_PRUEBA.md`](bd/docs/GUIA_MOCKS_Y_DATOS_PRUEBA.md)). Prohibido sembrar desde código.
- **Interfaces:** `interfaces/` solo tipos, cero runtime.

## Seguridad

- Autorización siempre en el servidor, también en los `GET`. Permisos atómicos por empleado, resueltos en cada petición.
- Sin permiso → 404 opaco `RECURSO_NO_DISPONIBLE` (ADR-003), idéntico al de un recurso inexistente: no revela si existe ni el nombre del permiso.
- Nunca devolver contraseñas, hashes, trazas ni SQL. Payloads mínimos.
- Contraseñas con bcrypt costo 12. Sesión en cookie `HttpOnly`.
- Detalle: [`CHECKLIST_CIERRE_MODULOS.md`](docs/00_SISTEMA/03_PLANTILLAS_Y_CHECKLISTS/CHECKLIST_CIERRE_MODULOS.md) y `docs/01_TRANSVERSALES/POLITICAS/`.

## Antes de cada commit y PR

En `backend/` y `frontend/`: `npm run lint -- --max-warnings=0`, `npm run check:types`, `npm run check:no-any`, `npm test`.
En la raíz: `npm run test:contracts`. Es lo mismo que corre el CI.

## Commits y PR

- Commit: `tipo(scope): descripcion`, minúsculas e imperativo. Scope = carpeta del módulo (`m13-inventario`).
  Tipos y scopes: [`GUIA_GIT_COMMITS_Y_PUSH.md`](docs/00_SISTEMA/02_GUIAS_Y_ESTANDARES/GUIA_GIT_COMMITS_Y_PUSH.md).
  `feat` solo si entrega funcionalidad real (cita la HU); estructura, contratos sin implementar y configuración son `chore` o `docs`.
- Nunca `push --force` a `main`. Todo entra por PR.
- PR: título `tipo(scope): descripcion` (sin versión); descripción de máximo 10 líneas (qué hace, qué tocó fuera del módulo, cómo se probó).
- Un compañero revisa; CI en verde y 1 aprobación para fusionar. El tag de versión lo crea `release.yml`.
- **Un PR fusionado está terminado.** No se le agregan commits: los PR se fusionan rápido y lo que se empuje después a su
  rama se pierde. Todo cambio posterior sale de `main` en una rama nueva con su PR nuevo. Antes de dar una rama por
  entregada, comprueba que `origin/main` ya contiene lo que se prometió.
- Backend, frontend y QA no editan `.github/workflows/`, `docker-compose.yml`, `Dockerfile*` ni `.env.example`: es dominio del DevOps.

## Ya no existen

Gates, firmas del "Director Humano", `current_state.json`, PRD/ATDD/QA por módulo, walkthroughs obligatorios, `docs/reviews/`, bitácoras por rol.
Los documentos históricos que los mencionan (`docs/walkthroughs/`, `docs/CHANGELOG.md`, `bd/docs/`) se conservan solo como historia.
