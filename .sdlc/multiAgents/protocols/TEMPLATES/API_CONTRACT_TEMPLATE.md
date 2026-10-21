# 🔌 PLANTILLA: Contrato de Especificación de API

> **Módulo:** `[XX_nombre_modulo]`  
> **Autor:** Software Architect Lead  
> **Consumidores:** Backend Lead Engineer & Frontend Lead Engineer  
> **Estado:** [BORRADOR / APROBADO]

---

## 1. Definición del Endpoint: `[METODO] /api/v1/[recurso]`

- **Descripción:** [Propósito y alcance del endpoint]
- **Autenticación Requerida:** Sí (JWT Bearer con extracción segura de tenant)
- **Roles Autorizados:** `['admin_general', 'operador']`

### A. Parámetros de Entrada (Request)
- **Path Params:**
  - `id` (UUIDv4, requerido): Identificador único del recurso.
- **Query Params:**
  - `includeDetails` (boolean, opcional, default: false).
  - `limit` (number, opcional, default: 20, max: 100).
- **Request Body (Esquema Zod):**
  ```typescript
  import { z } from 'zod';

  export const createItemRequestSchema = z.object({
    code: z.string().min(3).max(50),
    title: z.string().min(1).max(200),
    amount: z.number().positive(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  });

  export type CreateItemRequest = z.infer<typeof createItemRequestSchema>;
  ```

### B. Respuestas Esperadas (Responses)
- **200 OK / 201 Created (Envelope Canónico):**
  ```typescript
  export const itemResponseSchema = z.object({
    id: z.string().uuid(),
    code: z.string(),
    title: z.string(),
    amount: z.number(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  export const apiItemResponseSchema = z.object({
    success: z.literal(true),
    data: itemResponseSchema,
  });

  export type ApiItemResponse = z.infer<typeof apiItemResponseSchema>;
  ```

- **Errores Específicos:**
  - **400 Bad Request:** Formato o payload inválido según validador Zod perimetral.
  - **401 Unauthorized:** Token JWT ausente, inválido o expirado.
  - **403 Forbidden:** El usuario no posee el rol requerido o intenta cruzar fronteras de tenant (Anti-IDOR).
  - **404 Not Found:** El recurso solicitado no existe.
  - **409 Conflict:** Violación de regla de negocio inmutable o colisión de estado.
  - **422 Unprocessable Entity:** Violación semántica de dominio.
