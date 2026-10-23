# 💡 RFC-M17-001 — Tabla de Parámetros de Configuración General

> **Estado:** 🟢 **TABLA APROBADA Y APLICADA (2026-10-21)** · 🟡 **CAMBIO EN EL CÓDIGO DE M17 PENDIENTE** (ver §5).
> **Módulo propietario:** `M17 — Administración, Empleados y Permisos` (`HU-ADM-05`, `HU-ADM-07`).
> **Origen:** pregunta del Director Humano (*"¿qué tendría la tabla de parámetros?"*) y su aprobación posterior
> (*"dale, hagamoslo, haz la tabla, y redacta el RFC"*), el 2026-10-21.
> **Por qué es un RFC:** `ADR-006` y `ADR-007` declaran que el DDL de `bd/` está **bloqueado sin RFC**. Este documento
> y la aprobación del Director son ese rastro. Cumple además el punto 4 de `ADR-007`, que dejó prometido sustituir el
> almacén en memoria *"cuando el Product Owner apruebe la tabla relacional de configuración"*.
> **Quién lo redacta y quién decide:** redactado desde el rol de Arquitecto a petición del Director. Aplicar el cambio de
> código de M17 (§5) corresponde al equipo de M17.
> **Versión de BD:** 2.9 / esquema 4.1 — `bd/sql/schema_pintuclic.sql`, `seed_pintuclic.sql` y `bd/docs/`.

---

## 1. Diagnóstico

| # | Hallazgo verificado en el repositorio | Consecuencia |
| :---: | :--- | :--- |
| **D-1** | El catálogo vive en un `Map` en memoria (`AlmacenConfiguracionMemoria`, `configuracion.repository.ts`). | Un cambio del administrador **se pierde al reiniciar el servidor**. `ADR-007` lo aceptó como transitorio. |
| **D-2** | Esos 10 parámetros están escritos como un array de datos en TypeScript. | Choca con la Directiva #10 (los datos iniciales viven solo en `bd/sql/seed_pintuclic.sql`). |
| **D-3** | M20 lee las ventanas de sesión de variables de entorno (`ParametrosSeguridadEnv`) y su puerto dice que *"se sustituirá por la tabla de parámetros de M17"*. | Sin tabla, `RF-SEG-02-07` (vigencias configurables desde el panel) no se puede cumplir. |
| **D-4** | `ConfiguracionPort.actualizar(clave, nuevoValor)` **no recibe al actor**; el `ConfiguracionPort` original de `ADR-007` sí incluía `idAdmin`. | No se puede registrar quién modificó un parámetro. |
| **D-5** | El rango de `auth.complejidad_minima_contrasena` era **8–32**, pero M20 fija el mínimo de contraseña en **12**. | ✅ **Resuelto el 2026-10-21** (ver §9): el rango es 12–32 y una prueba lo ata al mínimo real de M20. |

---

## 2. Cambio Aplicado (DDL, versión 2.9)

### 2.1. Estructura

```sql
CREATE TABLE IF NOT EXISTS parametro_sistema (
    id_parametro SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,            -- 'auth.intentos_fallidos_bloqueo'
    area enum_area_parametro NOT NULL,             -- autenticacion | comunicaciones | comercial
    tipo_dato enum_tipo_dato_parametro NOT NULL,   -- numero | texto | booleano
    descripcion TEXT NOT NULL,
    valor JSONB NOT NULL,
    valor_por_defecto JSONB NOT NULL,
    rango_minimo NUMERIC(14, 2),
    rango_maximo NUMERIC(14, 2),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    id_usuario_actualizo INT REFERENCES usuario (id_usuario) ON DELETE SET NULL
);
```

Más dos tipos enumerados nuevos (`enum_area_parametro`, `enum_tipo_dato_parametro`) y el índice
`idx_parametro_sistema_usuario` sobre la FK. El texto completo, con sus `COMMENT ON`, está en `schema_pintuclic.sql` (§ 9C).

### 2.2. Qué impone la base de datos (y qué requisito cumple cada restricción)

| Restricción | Garantiza | Requisito |
| :--- | :--- | :--- |
| `NOT NULL` en `valor` y `valor_por_defecto` | Un parámetro nunca queda sin valor | `RF-ADM-05-05` |
| `ck_parametro_tipo_valor` / `ck_parametro_tipo_defecto` | El tipo JSON (`number`, `string`, `boolean`) coincide con `tipo_dato`. También rechaza el `null` de JSON | `RF-ADM-05-06` |
| `ck_parametro_valor_en_rango` / `ck_parametro_defecto_en_rango` | Un valor numérico queda dentro de `[rango_minimo, rango_maximo]`, ambos inclusivos; `NULL` = sin límite | `RF-ADM-05-05/06` |
| `ck_parametro_rango_orden` / `ck_parametro_rango_solo_numero` | El mínimo no supera al máximo; solo un parámetro numérico tiene rango | Coherencia |
| `ck_parametro_clave` | Clave en minúsculas con prefijo de área (`auth.x`) | Convención |
| `UNIQUE (clave)` | Una sola fila por parámetro | `RF-ADM-07-01` |
| `fk_parametro_usuario` (`ON DELETE SET NULL`) | Borrar al administrador no destruye el valor | Integridad |

> **Detalle técnico:** las comprobaciones de rango usan `CASE WHEN`, porque PostgreSQL **no garantiza** el orden de
> evaluación de `AND`/`OR`; sin el `CASE`, convertir a número un valor de texto podría fallar con un error de conversión
> en vez de con una restricción violada.

### 2.3. Seed
Las **10 filas** salen del catálogo real de M17, leído por script y no transcrito a mano. Idénticas a las actuales:

| Clave | Área | Valor | Rango |
| :--- | :--- | :---: | :---: |
| `auth.vigencia_codigo_registro_minutos` | autenticacion | 15 | 5–60 |
| `auth.intentos_codigo_registro` | autenticacion | 3 | 1–10 |
| `auth.complejidad_minima_contrasena` | autenticacion | 12 | 12–32 *(alineado con M20, §9)* |
| `auth.vigencia_enlace_recuperacion_minutos` | autenticacion | 30 | 10–120 |
| `auth.intentos_fallidos_bloqueo` | autenticacion | 5 | 3–10 |
| `auth.duracion_bloqueo_minutos` | autenticacion | 15 | 5–1440 |
| `comms.reintentos_envio_transaccional` | comunicaciones | 3 | 1–5 |
| `comercial.iva_porcentaje` | comercial | 19 | 0–50 |
| `comercial.costo_envio_base` | comercial | 15000 | ≥ 0 |
| `comercial.umbral_envio_gratis` | comercial | 200000 | ≥ 0 |

`ON CONFLICT (clave) DO NOTHING`: **re-ejecutar el seed no pisa** un valor que un administrador ya cambió.

---

## 3. Decisión de Diseño: cómo guardar el valor

El tipo del valor varía (hoy los 10 son numéricos, pero el contrato admite texto y booleano).

| | **A — `JSONB` (adoptada)** | B — Columnas tipadas | C — `TEXT` |
| :--- | :--- | :--- | :--- |
| **Columnas para valor y defecto** | 2 | 6 (`valor_numero/texto/booleano` × 2) | 2 |
| **La BD impone el tipo** | ✅ con `jsonb_typeof` | ✅ | ⚠️ solo con casts frágiles |
| **La BD impone el rango** | ✅ | ✅ | ⚠️ con casts frágiles |
| **Parámetro nuevo sin DDL** | ✅ | ✅ | ✅ |
| **Costo** | Prisma devuelve `Json`: hay que acotarlo con Zod | Verboso | Pierde la validación en BD |
| **Precedente en el repo** | `codigo_verificacion.datos_temporales` | — | — |

**Por qué A:** da la validación de B con un tercio de las columnas, y el tipo `Json` de Prisma se estrecha con el mismo
esquema Zod que M17 ya usa.

---

## 4. Verificación (PostgreSQL 18.6, clúster desechable, 2026-10-21)

| Prueba | Resultado |
| :--- | :--- |
| Instalación limpia: esquema y seed, dos pasadas cada uno, `ON_ERROR_STOP=1` | ✅ Código 0; 52 tablas; 21 enums; 10 parámetros |
| Actualización de una base en v4.0, dos pasadas | ✅ Código 0; mismo estado final |
| Actualización de una base creada con el esquema 3.9 (cadena 3.9 → 4.0 → 4.1), dos pasadas | ✅ Código 0; mismo estado final |
| **15 valores inválidos**: bajo el mínimo, sobre el máximo, texto/booleano/JSON `null`/SQL `NULL` en un parámetro numérico, negativo sin tope, defecto fuera de rango, clave duplicada / con mayúsculas / sin prefijo, rango inverso, rango en un parámetro de texto, área inexistente, actualizador inexistente | ✅ Los 15 rechazados por la restricción prevista |
| **Límites exactos** 3 y 10 (rango 3–10); 99.999.999 en un parámetro sin tope; restaurar el valor por defecto | ✅ Aceptados |
| **Parámetros nuevos de texto y booleano**, insertados sin modificar el DDL | ✅ Aceptados |
| Borrar al administrador que modificó un valor | ✅ El valor se conserva y `id_usuario_actualizo` pasa a `NULL` |

---

## 5. Plan de Cambio en M17 (**NO aplicado**)

La tabla existe, pero **M17 sigue leyendo de memoria** hasta que se haga esto. Nada se rompe mientras tanto: el seed
es idéntico al catálogo actual.

1. **Modelo Prisma:** añadir `ParametroSistema` (`valor` y `valorPorDefecto` como `Json`) a `backend/prisma/schema.prisma`.
   Es un archivo **compartido** con M20 y M04: aplica la Directiva #3.
2. **Repositorio:** una implementación Prisma de `ConfiguracionPort` que sustituya a `AlmacenConfiguracionMemoria`.
   `ADR-007` prometió que **ningún llamador cambia**.
3. **Puerto:** `actualizar` debe recibir al administrador (`idAdmin`) para llenar `id_usuario_actualizo` (D-4). Es el único
   cambio de firma; afecta al servicio y a sus pruebas.
4. **Retirar el array** del repositorio (D-2). El contrato conserva solo la enumeración de claves.
5. **Caché corta en el adaptador:** M20 lee estos valores en cada inicio de sesión, y la consulta en memoria era de
   < 1 ms. Se propone una caché de vida breve (del orden de 30 s, **a validar**) invalidada al actualizar.
6. **Pruebas:** adaptar `configuracion.service.test.ts` y añadir una prueba de integración contra la base real, que es
   lo único que verifica los rangos de las restricciones.
7. **Fuera de este cambio:** sustituir `ParametrosSeguridadEnv` de M20 (D-3). Bastaría añadir filas `auth.*` nuevas,
   sin DDL, pero es trabajo de M20.

---

## 6. Límites y Riesgos Declarados

- **`fecha_actualizacion` la mantiene la base** (ver §9): un disparador la mueve cuando cambia `valor`. Lo que la base **no** puede
  saber es quién cambió el valor: `id_usuario_actualizo` debe fijarlo la aplicación.
- **Solo se guarda el último autor.** El historial completo de cambios corresponde a la auditoría de `HU-SEG-04`, aplazada
  por el Product Owner. No se creó una tabla de historial.
- **El seed no evoluciona filas existentes.** Con `ON CONFLICT DO NOTHING`, cambiar la descripción o el rango de un
  parámetro ya sembrado exige una migración explícita (`UPDATE`); editar el seed no basta.
- **Última escritura gana.** No hay control de concurrencia optimista: dos administradores que editan a la vez se pisan.
- **Varias instancias del servidor:** con la caché del punto 5, un cambio tarda hasta su vida útil en propagarse.
- **D-5 resuelto** (ver §9). Queda una observación: M20 **no lee** este parámetro, su mínimo de 12 está fijo en `contrasenaSchema`. El
  parámetro hoy no gobierna nada fuera del catálogo; M04 sí lo usará (`RN-CUE-04`).
- **Irretroactividad comercial (`RN-ADM-16`):** ya está cubierta sin esta tabla, porque `orden` conserva copia del IVA
  aplicado (`tasa_iva`, versión 3.9).

---

## 7. Archivos

| Archivo | Estado |
| :--- | :--- |
| `bd/sql/schema_pintuclic.sql` (v4.1), `bd/sql/seed_pintuclic.sql` (v4.1) | ✅ Modificados |
| `bd/docs/DOCUMENTACION_BASE_DATOS.md`, `WALKTHROUGH_DATABASE.md`, `CHANGELOG_DATABASE.md` (versión 2.9) | ✅ Actualizados |
| `backend/prisma/schema.prisma` | ⏳ **No tocado** (compartido, §5.1) |
| `backend/src/modules/m17-permisos/**` | ⏳ **No tocado** (§5) |

---

## 8. Decisión

**Aprobado por el Director Humano el 2026-10-21** (tabla y RFC). Pendiente de su equipo: el cambio de código de M17 (§5).

---

## 9. Revisión del 2026-10-21 (misma jornada, antes de cualquier commit)

Tras el RFC se corrigieron, a petición del Director Humano, los defectos que el propio RFC declaraba. Se incorporan a la versión 2.9 en lugar de abrir otra, porque aún no se ha publicado.

| Cambio | Qué se hizo | Verificación |
| :--- | :--- | :--- |
| **`fecha_actualizacion` automática** | Función `fn_parametro_sistema_fecha()` y disparador `trg_parametro_sistema_fecha` (`BEFORE UPDATE`): fijan `now()` solo cuando cambia `valor`. Son los **primeros** del esquema; la convención quedó en `GUIA_REFACTORIZACION_BD.md` | Descripción, rango y reescritura del mismo valor no la mueven; cambiar el valor sí; al restaurar todos al defecto avanzan 2 de 10 |
| **D-5: rango 12–32** | `rangoMinimo` pasa de 8 a 12 en el catálogo de M17 (**archivo de M17, modificado con autorización del Director**) y en el seed. El seed corrige también bases ya sembradas, sin pisar valores legítimos | Límites 11/33 rechazados y 12/32 aceptados en la base; base con rango viejo y valor 10 → mínimo 12 y valor 12 |
| **Prueba que impide la divergencia** | Dos pruebas en `configuracion.service.test.ts`: una fija el comportamiento 11/12/33 y otra **deduce el mínimo real de `contrasenaSchema` de M20** y exige que el catálogo coincida | Con el defecto reintroducido (rango 8) las 2 **fallan**; las 5 anteriores no lo detectaban. Suite 70/70, `tsc` y ESLint en cero |
| **Limpieza** | Se elimina la definición duplicada de `presentacion` del DDL | `pg_dump --schema-only`: el esquema no cambia |

**Observación nueva:** `auth.complejidad_minima_contrasena` hoy **no gobierna nada**: M20 valida con un `.min(12)` fijo y no consulta el parámetro. Si el administrador lo sube a 20, nada cambia. Conectarlo es trabajo de M20 y M04, y **queda fuera de este RFC**.
