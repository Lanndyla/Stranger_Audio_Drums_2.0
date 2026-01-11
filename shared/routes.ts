import { z } from 'zod';
import { insertPatternSchema, patterns } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  patterns: {
    list: {
      method: 'GET' as const,
      path: '/api/patterns',
      responses: {
        200: z.array(z.custom<typeof patterns.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patterns/:id',
      responses: {
        200: z.custom<typeof patterns.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/patterns',
      input: insertPatternSchema,
      responses: {
        201: z.custom<typeof patterns.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/patterns/:id',
      input: insertPatternSchema.partial(),
      responses: {
        200: z.custom<typeof patterns.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/patterns/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/patterns/generate',
      input: z.object({
        style: z.string(),
        bpm: z.number().min(60).max(240),
        type: z.enum(["Groove", "Fill", "Breakdown", "Intro", "Blast Beat"]),
      }),
      responses: {
        200: z.object({
          grid: z.array(z.object({
            step: z.number(),
            drum: z.string(), // "kick", "snare", "hihat_closed", "hihat_open", "tom_1", "crash", "ride"
            velocity: z.number().min(0).max(127)
          })),
          suggestedName: z.string()
        }),
        500: errorSchemas.internal,
      },
    },
    exportMidi: {
      method: 'POST' as const,
      path: '/api/patterns/export-midi',
      input: z.object({
        bpm: z.number(),
        grid: z.array(z.object({
          step: z.number(),
          drum: z.string(),
          velocity: z.number()
        }))
      }),
      responses: {
        200: z.any(), // File stream
      }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
