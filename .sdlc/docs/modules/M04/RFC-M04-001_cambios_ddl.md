# 💡 RFC-M04-001 — Cambios Propuestos al Modelo de Datos de M04

> **Estado:** 🟢 **PARCIALMENTE APROBADO Y APLICADO (2026-10-21): C-1 y C-3 (opción A).** 🟡 **C-2 y C-4…C-9 siguen pendientes de decisión.** El DDL de `bd/` está bloqueado sin RFC (`ADR-006`, `ADR-007`): este RFC y la aprobación del Director Humano son el rastro que exige esa regla.
> **Origen:** petición expresa del Director Humano (2026-10-21) de proponer los cambios de DDL que resuelven las
> decisiones 4 (almacenamiento del RUT) y 5 (almacenamiento del NIT), más los cambios que se derivan de ellas.
> **Naturaleza del documento:** este RFC **no es entregable de Gate 1**. La regla de oro #1 del Product Manager le
> prohíbe especificar SQL, de modo que se redacta aquí, a petición del Director, como **insumo para Gate 2**. Quien lo
> formaliza, ajusta y ejecuta es el **Software Architect** en su turno; si al tomarlo contradice algo de lo aquí
> propuesto, **prevalece el criterio de turno** y se registra la discrepancia.
> **Convención aplicada:** [`GUIA_REFACTORIZACION_BD.md`](../../../../bd/docs/GUIA_REFACTORIZACION_BD.md) (idempotencia,
> `snake_case`, un índice por cada FK, `COMMENT ON`).

---

## 1. Diagnóstico

| # | Hallazgo verificado en el repositorio | Consecuencia |
| :---: | :--- | :--- |
| **D-1** | La tabla `usuario` no tiene dónde guardar el NIT ni los datos de la empresa: solo existen en `solicitud_empresa`. | El NIT *vigente* de una cuenta empresa no tiene hogar. `CA-CUE-09-05` ("actualizar el NIT de la cuenta") obliga a mutar una solicitud histórica y destruye la trazabilidad. |
| **D-2** | `solicitud_actualizacion_nit.documento_adjunto_url` es `TEXT NOT NULL`, y el seed apunta a `https://storage.pintuclic.co/...`. | El diseño original **presupone un almacenamiento de archivos que no existe** y no hay librería de subida en el backend. |
| **D-3** | Ninguna restricción impide dos solicitudes pendientes del mismo NIT, dos pendientes de la misma cuenta ni dos direcciones predeterminadas. | Las reglas `RN-CUE-14`, `RN-CUE-16` y `RN-CUE-21` dependerían solo del código, expuestas a condiciones de carrera. |
| **D-4** | `codigo_verificacion.codigo` es `VARCHAR(10)` y el seed guarda `'123456'` **en claro**. | Un token de recuperación en claro en la base equivale a una credencial. `RN-CUE-03` exige guardarlo derivado. |
| **D-5** | No hay dónde contar intentos fallidos de acceso. | `RN-CUE-07` no es implementable. |
| **D-6** | `usuario.correo` es `UNIQUE` pero distingue mayúsculas. | `Ana@x.co` y `ana@x.co` serían cuentas distintas, contra `RN-CUE-01`. |
| **D-7** | M17 devuelve `primerAccesoPendiente: true` al crear un empleado pero **no lo persiste** (una sola referencia en `empleados.service.ts:106`). | El cambio de clave forzoso (`CA-ADM-01-03`) no puede hacerse efectivo en el login de M04. |

---

## 2. Cambios Propuestos

### C-1 · Tabla `cuenta_empresa` *(resuelve la decisión 5 — dónde vive el NIT)*

Una fila por cuenta empresa **aprobada**, con el NIT **vigente** y los datos de la empresa. La renovación de NIT
actualiza esta fila; las solicitudes quedan como historial inmutable.

```sql
CREATE TABLE IF NOT EXISTS cuenta_empresa (
    id_usuario INT PRIMARY KEY,
    nit VARCHAR(30) NOT NULL,
    nombre_empresa VARCHAR(150) NOT NULL,
    nombre_representante VARCHAR(150) NOT NULL,
    correo_empresarial VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    id_solicitud_origen UUID,
    fecha_aprobacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_cuenta_empresa_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cuenta_empresa_solicitud FOREIGN KEY (id_solicitud_origen)
        REFERENCES solicitud_empresa (id_solicitud) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT uq_cuenta_empresa_nit UNIQUE (nit)
);
```

- **Relleno inicial (backfill):** una fila por cada `solicitud_empresa` con `estado = 'aprobada'` (en el seed actual:
  el usuario 4, `900555666-1`), con `ON CONFLICT DO NOTHING`.
- **Alternativa A — columnas nullable en `usuario`:** descartada. `usuario` es una tabla compartida por M20 y M17 y
  la mayoría de sus filas (clientes particulares y empleados) tendría esas columnas vacías.
- **Alternativa B — no cambiar nada y mutar la solicitud:** descartada. Destruye el historial que exige `RN-CUE-23`.
- **Bonus verificado:** la ficha ATDD de M17 contempla *búsqueda de clientes por NIT*; hoy no tiene a qué columna
  apuntar. Esta tabla se la daría.

### C-2 · Unicidad de solicitudes pendientes *(RN-CUE-14, RN-CUE-19)*

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_empresa_nit_pendiente
    ON solicitud_empresa (nit) WHERE estado = 'pendiente';
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_empresa_usuario_pendiente
    ON solicitud_empresa (id_usuario) WHERE estado = 'pendiente';
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_nit_usuario_pendiente
    ON solicitud_actualizacion_nit (id_usuario) WHERE estado = 'pendiente';
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_nit_nuevo_pendiente
    ON solicitud_actualizacion_nit (nit_nuevo) WHERE estado = 'pendiente';
```

- Son **parciales** a propósito: un NIT cuya solicitud fue rechazada debe poder volver a presentarse (`DP-10`), y el
  NIT aprobado ya queda protegido por `uq_cuenta_empresa_nit`.
- **Límite que ningún índice cubre:** un registro pendiente del NIT X frente a una renovación pendiente hacia el mismo
  X, o frente a una `cuenta_empresa`, cruza tablas. Se resuelve en el servicio dentro de una transacción con
  `pg_advisory_xact_lock(hashtext(nit))`. Se declara aquí para que el Arquitecto no lo dé por cubierto.
- **Formato del NIT:** **sin `CHECK` de formato** en BD hasta que el Product Owner lo fije; el contrato Zod lo
  normalizará. Un `CHECK` prematuro rechazaría RUT legítimos.

### C-3 · Almacenamiento del RUT *(resuelve la decisión 4)*

Tres opciones. **Recomiendo la A.**

| | **A — En la base (recomendada)** | B — Disco del servidor | C — Almacenamiento de objetos |
| :--- | :--- | :--- | :--- |
| **Qué es** | Tabla `documento_soporte` con el archivo en `BYTEA` | Archivo en un volumen; la BD guarda la ruta | Bucket privado S3-compatible con URL firmadas |
| **Infraestructura nueva** | **Ninguna** | Volumen persistente + copia de seguridad aparte | Bucket, credenciales, dependencia `@aws-sdk` |
| **Dominio** | Backend/Arquitecto | **DevOps** (reservado) | **DevOps** (reservado) |
| **Consistencia con la BD** | Transaccional: solicitud y archivo se crean o fallan juntos | Puede quedar archivo huérfano o ruta rota | Ídem |
| **Copias de seguridad** | Las de la BD | Hay que añadirlas | Las del proveedor |
| **Escala** | Suficiente: el volumen es bajo (renovaciones de NIT) | Media | Alta |
| **Riesgo principal** | Crecimiento de la BD | Estado en el servidor: rompe despliegues sin estado | Alcance de DevOps y dependencia nueva |

**Por qué A:** el tope de 5 MB y la rareza del trámite (una renovación por empresa y por periodo fiscal) dejan el
peor caso en el orden de unos pocos GB; no obliga a tocar infraestructura —que este rol tiene prohibida— y el RUT
(dato sensible, `RN-CUE-20`) queda detrás de la autorización de la aplicación.

**Pero se aísla tras un puerto** (`AlmacenDocumentosPort`, mismo patrón que `AuditoriaPort`): si DevOps provee
almacenamiento de objetos más adelante, se sustituye el adaptador sin tocar los servicios.

```sql
CREATE TABLE IF NOT EXISTS documento_soporte (
    id_documento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_original VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamano_bytes INT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    contenido BYTEA NOT NULL,
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_documento_tamano CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880),
    CONSTRAINT ck_documento_mime CHECK (tipo_mime IN ('application/pdf', 'image/jpeg', 'image/png'))
);

ALTER TABLE solicitud_actualizacion_nit
    ADD COLUMN IF NOT EXISTS id_documento UUID
        REFERENCES documento_soporte (id_documento) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_solicitud_nit_documento ON solicitud_actualizacion_nit (id_documento);
```

- **Garantía de base de datos:** el documento se inserta **primero** y la solicitud lo referencia; así cada solicitud
  tiene un RUT por construcción (`RF-CUE-10-02`), no solo por código. Tras el relleno, `id_documento` pasa a
  `NOT NULL` y `documento_adjunto_url` se **deprecia** (`DROP NOT NULL` ahora, `DROP COLUMN` en una entrega posterior).
- **Seed:** la fila de ejemplo se reemplaza por un documento mínimo en `documento_soporte`.
- **Los listados nunca seleccionan `contenido`** (`RN-CUE-20`): lo impone el repositorio con columnas explícitas.
- **No incluido:** análisis antivirus. Es infraestructura; se recomienda a DevOps.
- **Implementado (2026-10-21) con una variación:** en lugar de pasar `id_documento` a `NOT NULL` —imposible mientras existan solicitudes anteriores que solo tienen URL—, se aplicó el `CHECK` transitorio `ck_solicitud_nit_adjunto (id_documento IS NOT NULL OR documento_adjunto_url IS NOT NULL)`. La garantía de base de datos se mantiene y pasará a `NOT NULL` al retirar la columna URL.

### C-4 · Direcciones: predeterminada única y sin duplicados *(RN-CUE-21)*

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_direccion_predeterminada_unica
    ON direccion_cliente (id_usuario) WHERE es_predeterminada;
CREATE UNIQUE INDEX IF NOT EXISTS uq_direccion_no_duplicada
    ON direccion_cliente (id_usuario, lower(direccion), lower(barrio), lower(coalesce(apartamento_casa, '')));
```

- Un índice único parcial **no puede ser diferible**: cambiar de predeterminada exige, en **una transacción**, retirar
  primero la condición a la anterior y concederla después. Se declara en `03_FLUJO_Y_ESTADOS.md` §8.
- La normalización de espacios y tildes se hace en el servicio; el índice solo cubre mayúsculas.
- El límite de **10 por cuenta** se aplica en el servicio (no es expresable como restricción de columna).
- El seed actual **no entra en conflicto** (verificado: un solo predeterminado por usuario y direcciones distintas).

### C-5 · Códigos de verificación derivados *(RN-CUE-03)*

```sql
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'codigo_verificacion' AND column_name = 'codigo') THEN
        ALTER TABLE codigo_verificacion RENAME COLUMN codigo TO codigo_hash;
    END IF;
END $$;
ALTER TABLE codigo_verificacion ALTER COLUMN codigo_hash TYPE VARCHAR(255);
```

- **Honestidad sobre el alcance de la protección:** para el **enlace de recuperación** (un token aleatorio de alta
  entropía) guardarlo derivado es **esencial**: en claro, quien lea la tabla restablece cualquier contraseña. Para un
  **código numérico de 6 dígitos** el derivado solo ofrece una defensa en profundidad limitada (hay un millón de
  combinaciones); la protección real es la vigencia corta y el límite de intentos. El Arquitecto elige el mecanismo
  (p. ej. HMAC con secreto del servidor).
- El seed (`'123456'`) debe reemplazarse por el derivado de un valor de prueba documentado.
- La **limpieza de códigos vencidos** (hoy solo existe `idx_codigo_expiracion`) es un diseño de Gate 2.

### C-6 · Tabla `control_intento_acceso` *(RN-CUE-07)*

```sql
CREATE TABLE IF NOT EXISTS control_intento_acceso (
    correo VARCHAR(150) PRIMARY KEY,
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,
    fecha_ultimo_intento TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_control_intentos_no_negativo CHECK (intentos_fallidos >= 0)
);
CREATE INDEX IF NOT EXISTS idx_control_intento_bloqueo ON control_intento_acceso (bloqueado_hasta);
```

- **Por qué por correo y no columnas en `usuario`:** si el contador viviera en `usuario`, un correo **inexistente**
  nunca se restringiría y la diferencia delataría qué cuentas existen, contra `RN-CUE-06`. Con una tabla indexada por
  el correo, el comportamiento es idéntico exista o no la cuenta.
- **Riesgo inherente, declarado:** cualquier restricción por intentos permite que un tercero bloquee temporalmente a un
  usuario enviando fallos adrede. Se acota con la duración corta (15 min). El control por IP queda fuera de alcance.
- Requiere limpieza periódica de filas antiguas (diseño de Gate 2).

### C-7 · Unicidad de correo sin distinguir mayúsculas *(RN-CUE-01)*

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_correo_lower ON usuario (lower(correo));
```

- Compatible con el seed (todos los correos están en minúsculas). El `UNIQUE` actual se mantiene.
- **Toca la tabla `usuario`**, compartida con M20 y M17.

### C-8 · Marca de cambio de clave pendiente *(CA-ADM-01-03 de M17, F-17)*

```sql
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cambio_contrasena_pendiente BOOLEAN NOT NULL DEFAULT false;
```

- El login de M04 la lee para abrir una sesión limitada a fijar la contraseña definitiva.
- Es retrocompatible (`DEFAULT false`). **Pero** para que tenga efecto M17 debe ponerla en `true` al crear un
  empleado: ese cambio vive en `empleados.service.ts` de M17 y **requiere aprobación expresa por la Directiva #3**.
  Esta propuesta solo cubre la columna.

### C-9 · Permiso `empresas.validar` *(DP-09, F-15)*

No es DDL sino **dato maestro del seed** (Directiva #10), pero se incluye porque `HU-CUE-09` no se puede asegurar sin él:

```sql
INSERT INTO permisos (id_permiso, nombre, descripcion, estado) VALUES
    (21, 'empresas.validar', 'Aprobar o rechazar solicitudes de cuenta empresa, ascenso y renovación de NIT', 'activo')
ON CONFLICT (id_permiso) DO NOTHING;
INSERT INTO asignacion_permiso (id_rol, id_permiso) VALUES (1, 21) ON CONFLICT (id_rol, id_permiso) DO NOTHING;
```

- El catálogo de permisos es de M17: la Directiva #3 aplica. Además el contrato Zod de M17 puede enumerar las claves
  de permiso; el Arquitecto debe revisarlo.

---

## 3. Archivos que Tocaría la Aprobación (todos en Gate 2)

| Archivo | Cambio |
| :--- | :--- |
| `bd/sql/schema_pintuclic.sql` | C-1 a C-8 |
| `bd/sql/seed_pintuclic.sql` | Relleno de `cuenta_empresa`; documento de ejemplo; OTP derivado; permiso `empresas.validar` |
| `backend/prisma/schema.prisma` | Modelos y enums de M04 *(archivo compartido: Directiva #3)* |
| `bd/docs/WALKTHROUGH_DATABASE.md`, `CHANGELOG_DATABASE.md`, `DOCUMENTACION_BASE_DATOS.md` | Walkthrough y registro del cambio de esquema |

> *(Corregido el 2026-10-21)* `GUIA_REFACTORIZACION_BD.md` ya sincroniza con **Prisma** (`backend/prisma/schema.prisma`), no con Kysely.

---

## 4. Decisión Solicitada

Marca una opción por cambio. Si apruebas "en bloque", los que figuran como *recomendados* quedan aprobados y C-3 en su
opción A.

| Cambio | Resuelve | Mi recomendación | Aprobar | Rechazar | Ajustar |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **C-1** `cuenta_empresa` | **Decisión 5** (NIT) | ✅ Aprobar | ☑ **Aprobado y aplicado (2026-10-21)** | ☐ | ☐ |
| **C-2** Unicidad de pendientes | `RN-CUE-14/19` | ✅ Aprobar | ☐ | ☐ | ☐ |
| **C-3** Almacenamiento del RUT | **Decisión 4** | ✅ **Opción A** (en BD tras un puerto) | ☑ **Opción A, aprobada y aplicada (2026-10-21)** | ☐ | ☐ |
| **C-4** Direcciones | `RN-CUE-21` | ✅ Aprobar | ☐ | ☐ | ☐ |
| **C-5** Códigos derivados | `RN-CUE-03` | ✅ Aprobar | ☐ | ☐ | ☐ |
| **C-6** `control_intento_acceso` | `RN-CUE-07` | ✅ Aprobar | ☐ | ☐ | ☐ |
| **C-7** Correo sin mayúsculas | `RN-CUE-01` | ✅ Aprobar | ☐ | ☐ | ☐ |
| **C-8** Marca de cambio de clave | `F-17` | ✅ Aprobar la columna; el cambio en M17 se pide aparte | ☐ | ☐ | ☐ |
| **C-9** Permiso `empresas.validar` | `DP-09` | ✅ Aprobar | ☐ | ☐ | ☐ |

**Pregunta de decisión para el Director Humano:** ¿apruebas los cambios C-1 a C-9 tal como se recomiendan, o quieres
decidir alguno por separado? En particular, **C-3** es una decisión de arquitectura con alternativas reales y merece
tu criterio explícito.

### Estado de aplicación (2026-10-21)
- **Aplicados** en `bd/sql/schema_pintuclic.sql` (v4.0) y `seed_pintuclic.sql`: **C-1** y **C-3 opción A**, con la variación señalada en C-3. Documentados como versión **2.8** en `bd/docs/`. Validados contra PostgreSQL 18.6 en instalación limpia y en actualización de una base 3.9.
- **Interpretación registrada:** la instrucción del Director fue *"crear la tabla cuenta_empresa con sus columnas, opción A"*. Se entendió como C-1 y C-3 opción A (sus decisiones 5 y 4). Si la intención fue solo C-1, C-3 se revierte retirando `documento_soporte` y `id_documento`.
- **No aplicados, pendientes de decisión:** C-2, C-4, C-5, C-6, C-7, C-8 y C-9.
- **No tocado:** `backend/prisma/schema.prisma` (archivo compartido, Directiva #3): lo formaliza el Arquitecto en Gate 2.
