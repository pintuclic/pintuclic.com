import { z } from 'zod';

/**
 * ============================================================================
 * CONTRATO DE API REST: Módulo de Muestra (Template)
 * ============================================================================
 * Regla de Oro #1: Cero código sin contrato previo.
 * Regla de Oro #4: Mandato Zero ANY Innegociable.
 */

// Esquema de Creación / Petición (Request)
export const createSampleRequestSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  category: z.enum(['CORE', 'OPERATIONS', 'BILLING', 'REPORTS']),
  isActive: z.boolean().default(true),
});

export type CreateSampleRequest = z.infer<typeof createSampleRequestSchema>;

// Esquema de Entidad Individual (Entity)
export const sampleEntitySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SampleEntity = z.infer<typeof sampleEntitySchema>;

// Envelope Canónico: Respuesta Exitosa (Response)
export const sampleResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: sampleEntitySchema,
});

export type SampleResponseEnvelope = z.infer<typeof sampleResponseEnvelopeSchema>;

// Envelope Canónico: Lista Paginada (List Response)
export const sampleListResponseEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(sampleEntitySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type SampleListResponseEnvelope = z.infer<typeof sampleListResponseEnvelopeSchema>;
