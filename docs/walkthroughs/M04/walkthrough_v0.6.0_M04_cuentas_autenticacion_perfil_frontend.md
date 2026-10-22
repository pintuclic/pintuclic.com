# WALKTHROUGH DE IMPLEMENTACIÓN — M04 · Cuentas, Autenticación y Perfil (Frontend)

> 📌 **Módulo:** `M04 — Cuentas, Autenticación y Perfil` (Ola 3, salto de ola autorizado el 2026-10-21)
> 🏷️ **Capa:** Frontend (Next.js 15 + React 19 + Tailwind CSS 4 + Zustand 5 + React Hook Form + Zod 4) · 🎯 **Fase:** 3B · **Gate:** 3B — revisión visual del Director Humano

## 1. Metadatos
* **Versión:** `v0.6.0` · **Fecha:** 22/10/2026
* **Autor / Responsable:** DanExl24 (@DanExl24) — con asistencia de un agente de IA
* **Fuentes de verdad:** `docs/assets/mockups/VISTAS.pdf` págs. 3–6 (modal de registro) · `ESPECIFICACION_TECNICA_UI_UX.md` §4.2 (modales con franja de marca), §2 y §6 · `.sdlc/docs/modules/M04/` (spec, HU, ATDD) · API real del backend v0.4.2.
* **Alcance pedido por el Director:** "si, hazlo. y el frontend que falta, derivalo por funciones y diseño del proyecto, ya que parece que no tengo mas mockups." Solo el registro tiene mockup; login, recuperación, primer acceso, perfil y panel de empresas se **derivaron** de ese modal y del sistema de diseño.

### Decisiones aprobadas por el Director antes de construir
1. Registro según el mockup; login, recuperación y primer acceso derivados del mismo modal.
2. Empresa sin paso de OTP: **Datos → ¡Solicitud enviada!** (el administrador valida la empresa al aprobarla).
3. Botón principal en azul `action` (`#0877E8`), no el azul marino del mockup (UI Spec, rector supremo).
4. Stepper con el diseño de las págs. 3–5.
5. Un solo campo de contraseña con mostrar/ocultar en el registro (sin confirmación).
6. Casilla de Términos **solo en el cliente**: el backend no guarda el consentimiento (queda documentado).
7. "Continuar con Google" visible pero **deshabilitado**, con "Próximamente".

## 2. Historias de usuario cubiertas

| HU | Vista | Estado |
| :--- | :--- | :---: |
| `HU-CUE-01` Registro de persona natural con OTP | Modal y `/registro`: Datos → Verificación (OTP de 6 casillas, reenvío con espera de 30 s) → ¡Cuenta creada! | ✅ |
| `HU-CUE-02` Acceso con Google | Botón visible y deshabilitado (decisión 7) | ⏸️ Aplazada |
| `HU-CUE-03` Registro de empresa | Pestaña "Empresa": Datos → ¡Solicitud enviada! | ✅ |
| `HU-CUE-04` Inicio de sesión y primer acceso | Modal y `/login` (`?destino=`); cambio obligatorio de la contraseña temporal | ✅ |
| `HU-CUE-05` Recuperación de contraseña | Solicitud con mensaje uniforme (anti-enumeración) y `/restablecer-contrasena?token=` sin auto-login (RN-CUE-09) | ✅ |
| `HU-CUE-06` Perfil (06-A datos y contraseña, 06-B correo, 06-C ascenso) | `/perfil`: Mis datos, Seguridad, Cuenta empresa | ✅ |
| `HU-CUE-07` Direcciones | `/perfil` → Direcciones: alta, edición, eliminación, predeterminada, máximo 10, ubicación opcional | ✅ (ver §7) |
| `HU-CUE-08` Unicidad de cuentas | Regla del backend; la vista muestra su error sin revelar el tipo de cuenta | ✅ |
| `HU-CUE-09` Dictamen de solicitudes de empresa | `/admin/empresas`: listas filtrables, detalle, aprobar/rechazar con la regla de motivo, descarga del RUT | ✅ |
| `HU-CUE-10` Renovación de NIT | `/perfil` → Cuenta empresa: NIT nuevo + RUT (PDF/JPG/PNG ≤ 5 MB, SHA-256) y estado | ✅ (ver §7) |

Extra derivado de la API existente: **cerrar sesión** y **desactivar la cuenta** (con contraseña) en `/perfil` → Sesión y cuenta.

## 3. Arquitectura

### Rutas (`frontend/src/app/`)
| Ruta | Comportamiento |
| :--- | :--- |
| `(public)/login`, `/registro`, `/recuperar-contrasena` | Página completa (enlace directo, recarga, redirección del middleware) dentro de `AuthCard` |
| `(public)/@modal/(.)login`, `(.)registro` | **Rutas interceptadas**: desde cualquier página pública el acceso se abre en **modal** sobre la página actual; cerrar = `router.back()` |
| `(public)/@modal/page.tsx`, `[...catchAll]/page.tsx`, `default.tsx` | Devuelven `null` para cerrar el modal al navegar a cualquier otra ruta (el slot no se queda "pegado") |
| `(public)/restablecer-contrasena` | Lee `?token=` en el servidor; `noindex` y `referrer: no-referrer` (token de un solo uso) |
| `(public)/perfil` | `?seccion=datos|seguridad|direcciones|empresa|cuenta` validado en el servidor |
| `admin/empresas` | Bajo el `AdminLayout` de M17 (sin modificarlo) |

El middleware de M20 ya protegía `/perfil` y `/admin` y redirige a `/login?destino=…`, que el login respeta.

### Sesión (ADR-005)
* `SesionBootstrap` (en el layout público) pregunta `GET /cuentas/perfil` al cargar: la cookie `HttpOnly` no es legible desde la página. Un 401 = visitante.
* El `Header` del Core lee `useAuthStore`: con sesión muestra el primer nombre y lleva a `/perfil` (`cuentaDeEncabezado`, función pura probada).
* `destinoSeguro` solo acepta rutas internas: rechaza `//dominio`, `\\`, rutas sin `/` y las del propio flujo de acceso (evita bucles al volver).
* Cambiar la contraseña desde el perfil y desactivar la cuenta limpian la sesión local; el backend ya invalida todas las sesiones (DP-16).

### Módulo `frontend/src/modules/m04-cuentas/`
```
dtos/m04-cuentas.dto.ts          (ajustado: registro sin confirmar + aceptaTerminos, empresa, desactivar)
interfaces/api.interfaces.ts     (formas reales de la API v0.4.2; solo tipos)
services/cuentas.service.ts      (23 llamadas: registro, OTP, sesión, recuperación, perfil, correo, direcciones, empresa)
services/admin-empresas.service.ts (listas, detalle, dictamen, descarga del RUT como Blob)
services/errores.ts              (aErrorCuentas: mensajes propios para credenciales, bloqueo, 404 opaco y sesión expirada)
components/auth/                 LoginForm, RegistroFlow, RecuperarForm, RestablecerForm, PrimerAccesoForm,
                                 AuthPanel, AuthModal, AuthCard, BotonGoogle, utilidades.ts
components/sesion/               SesionBootstrap
components/perfil/               PerfilView, DatosSection, SeguridadSection, DireccionesSection, DireccionForm,
                                 EmpresaSection, CuentaSection, SeccionPerfil, archivo-rut.ts, secciones.ts
components/admin/                EmpresasAdminView, SolicitudesTab, RenovacionesTab, DictamenPanel,
                                 ElementosAdmin, formato.ts
tests/                           utilidades.test.ts, componentes.test.tsx (+ dtos.test.ts existente)
```
Todos los formularios usan `react-hook-form` + `zodResolver` con los DTO del módulo (Directiva #12); ningún esquema inline.

## 4. Core Kit ampliado (autorizado por el Director)
| Nuevo | Propósito |
| :--- | :--- |
| `forms/PasswordInput` | Campo de contraseña con mostrar/ocultar (`aria-pressed`) |
| `forms/OtpInput` | 6 casillas: avance automático, retroceso, flechas, pegar el código, `autocomplete="one-time-code"` |
| `forms/FileInput` | Selector de un archivo con la superficie de los campos; nombre accesible tomado del rótulo |
| `feedback/Alert` | `success · info · warning · error · timer`; `role="alert"` solo en errores |
| `navigation/Stepper` | Pasos del mockup: completados en verde con check, actual en azul corporativo |
| `navigation/SegmentedTabs` | Tablist accesible (Natural/Empresa, Solicitudes/Renovaciones) con flechas del teclado |
| `navigation/SectionNav` | Secciones de una vista: fila deslizable en móvil (mantiene la activa a la vista), columna en escritorio |
| `buttons/TextButton` | Acción con apariencia de enlace en línea ("Crear cuenta", "Reenviar código") |

| Modificado (compatible hacia atrás) | Cambio |
| :--- | :--- |
| `forms/Input` | Prop opcional `endAdornment` (ícono accionable a la derecha) |
| `layout/Header` | Lee la sesión de `useAuthStore` (nombre + `/perfil`); exporta `cuentaDeEncabezado` |

La auditoría `audit:core-kit` detectó en la primera pasada 6 `<button>` crudos en el módulo; se crearon `TextButton` y `SectionNav` y quedó en **0 violaciones**.

## 5. Decisiones de diseño derivadas (para revisar en el Gate)
1. **Login, recuperación y primer acceso** comparten cabecera, campos y franja de marca del modal de registro; solo cambian título y subtítulo.
2. **Paso final del registro:** todos los pasos quedan completados (check verde), no "Listo" como paso en curso.
3. **Perfil** con navegación lateral de 5 secciones (fila deslizable en móvil). Correo y NIT se muestran como texto de solo lectura (no como campo) con la indicación de cómo cambiarlos.
4. **Cambio de correo:** en el paso del código se muestra el correo nuevo completo (lo acaba de escribir el usuario); en el registro sí se enmascara (`a•••@correo.com`, mockup pág. 5).
5. **Direcciones:** la primera se anuncia como predeterminada sin casilla; las acciones de cada tarjeta llevan nombre accesible con la dirección.
6. **Panel de empresas:** mismo lenguaje visual que las vistas de M17 (tarjetas, tabla, insignias de estado); el motivo de rechazo es obligatorio (≥ 10) solo en registros (RN-CUE-17) y opcional en ascensos y renovaciones.
7. **Sin permiso** `empresas.validar` el backend responde 404 opaco y la vista dice "No tienes acceso a esta sección", sin distinguir "no existe".

## 6. Verificación

| Puerta | Resultado |
| :--- | :---: |
| `npm run build` (incluye `check:no-any`) | ✅ 17 rutas · 0 `any` en 154 archivos |
| `npx tsc --noEmit` · `npm run lint` · `npm run lint:a11y` | ✅ 0 errores · 0 avisos |
| `audit:core-kit` (Directiva #13) | ✅ 0 violaciones |
| `audit:a11y` (WCAG 2.1 AA) | ✅ Aprobado · 0 violaciones · 4 advertencias heurísticas (ver §7) |
| `audit:zod` · `verify:state` | ✅ |
| Vitest frontend | ✅ 14/14 suites · **136/136** (+33: utilidades, RUT, render en servidor de los formularios y del Core nuevo) |

### Navegador real (Chrome, servidor de producción, 1920 px y móvil 390 px)
**No había backend disponible** (sin `backend/.env` ni credenciales de base de datos). Los flujos se recorrieron de punta a punta con una **API simulada dentro de la página** (se reemplazó `XMLHttpRequest`, que axios usa en cada petición) que reproduce los contratos y códigos de error del backend v0.4.2. Recorridos verificados:

* Login en **modal sobre la landing**: credenciales incorrectas → mensaje genérico; correctas → el modal se cierra y el header saluda "Ana · Mi perfil".
* Registro natural: validaciones de los 5 campos y de Términos → OTP (escrito con el teclado y pegado) → código incorrecto con su error → ¡Cuenta creada! → "Volver al inicio" cierra el modal.
* Registro de empresa: Datos → ¡Solicitud enviada! (stepper de 2 pasos).
* Primer acceso con contraseña temporal; recuperación con mensaje uniforme; `/perfil` sin sesión → `/login?destino=/perfil` en página completa.
* Perfil: datos; cambio de correo con OTP; dos direcciones con una sola predeterminada; **ubicación del dispositivo emulada** (4.6097, -74.0817) agregada como coordenadas; ascenso a empresa (validación y estado "en revisión"); cuenta empresa con renovación de NIT: 5 MB + 1 byte rechazado y un PDF válido enviado con **SHA-256 idéntico** al que calcula Node (`createHash('sha256')`, como el backend); cierre de sesión.
* Panel `/admin/empresas`: rechazo de un registro con motivo corto bloqueado ("…al menos 10 caracteres") y con motivo válido aceptado; aprobación de un ascenso; filtros por estado; renovación con descarga del RUT como archivo con su nombre original.
* Móvil 390 px: sin desborde horizontal (se corrigió una grilla del perfil que medía 772 px).

Correcciones hechas durante la revisión: placeholder `••••••••` del login (parecía un valor escrito), título del panel descentrado, stepper con el paso 2 desplazado, paso final como "en curso", correo y NIT como campos editables de apariencia, desborde en móvil y sección activa fuera de vista.

## 7. Limitaciones y pendientes (declarados, sin sobre-afirmar)
1. **Integración real pendiente:** nada se probó contra el backend ni PostgreSQL; la API simulada no sustituye la prueba de integración del Gate 4.
2. **Fuera del módulo:** el límite JSON y la barra lateral de M17 se resolvieron con la aprobación del Director (ver §11). Sigue pendiente:
   * `frontend/next.config.ts`: el *rewrite* `/api/:path*` → `http://backend:3000/:path*` **pierde el prefijo `/api`**, pero el backend monta sus rutas en `/api/v1`. Tal como está, las peticiones del navegador a `/api/v1/…` llegarían a `/v1/…` (404). Hay que alinear destino o prefijo con la configuración de DevOps.
3. `HU-CUE-02` (Google) aplazada; por lo mismo no se muestra la advertencia de DP-12 al pedir el ascenso (el perfil no expone si hay Google vinculado).
4. `CA-CUE-07-04`: la ubicación agrega **coordenadas**, pero no autocompleta dirección y barrio porque no hay proveedor de geocodificación inversa; el usuario los escribe. Las coordenadas solo se envían si guarda la dirección.
5. Consentimiento de Términos solo en el cliente (decisión 6).
6. Renovaciones en el panel muestran "Cuenta #id": la API no devuelve el nombre de la empresa en ese listado.
7. Los textos que prometen avisos por correo dependen de M18 (aún sin construir).
8. El header se pinta como visitante en el HTML del servidor y se actualiza al hidratar la sesión (parpadeo breve; la cookie `HttpOnly` no se puede leer en el servidor sin consultar la API).
9. `audit:a11y` deja 4 advertencias heurísticas ("input sin id"): en `FileInput` el `<input>` sí tiene `id` y nombre por `aria-labelledby`; las otras dos son de `OtpInput` y de un archivo de prueba.
10. Durante la revisión con clics simulados el enlace "Saltar al contenido" (FP-01) apareció visible porque recibió el foco; usa `focus:` en lugar de `focus-visible:`. Conviene revisarlo con teclado real en el Gate.
11. Sin `jsdom`/Testing Library en el proyecto: la interacción se verificó en navegador, no con pruebas automatizadas de DOM.

## 8. Políticas transversales (CHECKLIST_CIERRE_MODULOS)
* **HU-CUE-08 Unicidad:** la vista no decide; muestra el mensaje del backend (`409 CORREO_YA_REGISTRADO`; la HU lo llama `REGISTRO_CONFLICTO`, parte del catálogo de códigos divergente ya elevado en v0.4.1) sin revelar el tipo de cuenta.
* **HU-ADM-03 Control en servidor:** ninguna vista decide permisos; el panel interpreta el 404 opaco como "sin acceso". El middleware solo comprueba la existencia de la cookie (usabilidad).
* **HU-SEG-06 Datos sensibles:** no se guarda ningún token en el cliente (ADR-005); el `tokenCambio` del primer acceso vive solo en memoria del componente; el token de restablecimiento no se indexa ni se filtra por Referer.

## 9. Dependencias externas
* **Depende de:** backend M04 v0.4.2 (contratos usados tal cual), M20 (middleware y `apiClient`), M17 (`AdminLayout`, permiso `empresas.validar`), M18 (correos de OTP y avisos).
* **Habilita:** "Mi cuenta" real en la cabecera para FP-01; direcciones para checkout (M07) y la identidad de cliente para carrito y órdenes (M05, M08).

## 10. Archivos
```
frontend/src/app/(public)/layout.tsx                      (slot @modal + SesionBootstrap)
frontend/src/app/(public)/{login,registro,recuperar-contrasena,restablecer-contrasena,perfil}/page.tsx
frontend/src/app/(public)/@modal/{default.tsx,page.tsx,(.)login/page.tsx,(.)registro/page.tsx,[...catchAll]/page.tsx}
frontend/src/app/admin/empresas/page.tsx
frontend/src/modules/m04-cuentas/**                        (ver §3)
frontend/src/core/components/forms/{PasswordInput,OtpInput,FileInput,Input}.tsx
frontend/src/core/components/feedback/Alert.tsx
frontend/src/core/components/navigation/{Stepper,SegmentedTabs,SectionNav}.tsx
frontend/src/core/components/buttons/TextButton.tsx
frontend/src/core/components/layout/Header.tsx · frontend/src/core/components/index.ts
docs/qa/{a11y,core-kit}-audit-summary.json                 (regenerados por las auditorías)
```

## 11. Ajustes autorizados al aprobar el Gate 3B
El Director aprobó la revisión visual ("apruebo tu frontend") y, antes del commit, autorizó: "te doy permiso de corregir el limite JSON y la barra lateral del admin (recordemos que el M17 no tenia ni idea de este modulo, asi que no hizo esa ruta)".

| Cambio | Detalle |
| :--- | :--- |
| **Límite JSON por ruta** · `backend/src/core/middlewares/cuerpoJson.middleware.ts` (nuevo) · `backend/src/index.ts` | El límite global de 100 kb se conserva para toda la API. Solo `POST /api/v1/cuentas/empresas/renovacion-nit` acepta hasta **7 MB** (un RUT de 5 MB ocupa ~6,7 MB en base64); el tamaño exacto del documento lo sigue validando el DTO (`tamanoBytes` ≤ 5 MB). Un cuerpo que excede el límite responde **413** (`CUERPO_DEMASIADO_GRANDE`, o `DOCUMENTO_RUT_INVALIDO` en esa ruta) en lugar del 500 genérico de antes. Se mantuvo el estilo de respuesta en línea de M04 sin ampliar el catálogo de códigos de M20. |
| **Barra lateral del admin** · `frontend/src/modules/m17-permisos/components/AdminLayout.tsx` | Entrada **"Empresas"** → `/admin/empresas` (ícono `Building2`, entre Clientes y Configuración) y título "Validación de Empresas" en el breadcrumb. Verificado en navegador: la entrada queda activa con `aria-current="page"`. |

**Verificación:** backend `tsc` 0 · ESLint 0/0 · 0 `any` (104 archivos) · Vitest **199/199** (+6: 100 kb aceptado y 200 kb → 413; base64 de 5 MB exactos aceptado en la ruta del RUT, también con barra final; > 7 MB → 413; JSON mal formado sigue al manejador global). Frontend `next build` ✅ · `tsc` · ESLint · `lint:a11y` · `audit:core-kit` · `audit:a11y` en verde · Vitest 136/136.

**Nota:** la ruta multipart del controlador (`req.file`) no tiene `multer` instalado; el RUT llega siempre en base64, por eso el ajuste se hizo en el parser JSON.

## 12. Integración de `main` (DevOps)
Se integró `origin/main` (Docker Compose, SMTP con Brevo/Mailpit, Google OAuth, Dockerfiles con pnpm y actualizaciones de dependabot) sin conflictos de archivos.

**Rotura detectada y corregida:** dependabot sube `lucide-react` de 0.525 a `^1.58` (el `pnpm-lock.yaml` que usa el Dockerfile resuelve **1.60.0**). La v1 elimina los íconos de marca y el `Footer` del Core importaba `Facebook`, `Instagram` y `Youtube`: el build de Docker habría fallado. Se revisaron los 73 íconos distintos que usaba el frontend contra el paquete 1.60.0; solo faltaban esos tres. Se reemplazaron por `core/components/layout/IconosMarca.tsx` (trazos de Simple Icons 16.35.0, CC0-1.0, copiados sin modificar). `dotenv` 17 → 18 es compatible: `dotenv/config` sigue publicándose en CommonJS.

**Verificación con las versiones de producción instaladas** (`lucide-react` 1.60.0 y `dotenv` 18.0.8, con `--no-save`): `next build` ✅ · frontend `tsc`, ESLint y `lint:a11y` limpios · Vitest 136/136 · backend `tsc` y ESLint limpios · Vitest 199/199 · `audit:core-kit` y `audit:a11y` aprobados · footer revisado en el navegador.

### Pendiente para DevOps (no se tocó)
1. **URL de la API.** El cliente usa `NEXT_PUBLIC_API_URL ?? '/api/v1'` como base y el backend monta sus rutas en `/api/v1`, pero la configuración de `main` no conserva ese prefijo:
   * `docker-compose.yml` compila el frontend con `NEXT_PUBLIC_API_URL=/api`: las peticiones salen a `/api/cuentas/…` (sin `/v1`) y el *rewrite* de `next.config.ts` (`/api/:path*` → `${NEXT_PUBLIC_API_URL}/:path*`, resuelto en el build) apunta a sí mismo.
   * `frontend/.env.example` propone `NEXT_PUBLIC_API_URL=http://localhost:3000`: las peticiones irían a `http://localhost:3000/cuentas/…`, también sin `/api/v1`.
   * Propuesta: dejar la base del cliente en `/api/v1` (mismo origen, la cookie `HttpOnly` viaja sin CORS) y que el *rewrite* use una variable solo de servidor, p. ej. `/api/:path*` → `${BACKEND_URL ?? 'http://backend:3000'}/api/:path*`. Requiere tocar `next.config.ts`, `docker-compose.yml` y `.env.example`.
2. **Lockfiles del frontend:** `package.json` pide `lucide-react ^1.58`, pero `package-lock.json` sigue fijando 0.525 (solo se actualizó `pnpm-lock.yaml`). `npm ci` fallaría por desincronía; conviene elegir un único gestor (el Dockerfile usa pnpm) y retirar o regenerar el otro lockfile.
