import { z } from 'zod';

export const createApiSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens')
      .optional(),
    description: z.string().optional(),
    upstreamBaseUrl: z.string().url('Must be a valid HTTP/HTTPS URL'),
    initialVersion: z.string().default('v1'),
    openApiSpec: z.record(z.unknown()).optional(),
  }),
});

export const updateApiSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    upstreamBaseUrl: z.string().url().optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'DEPRECATED', 'DISABLED']).optional(),
    openApiSpec: z.record(z.unknown()).optional(),
  }),
});

export const createEndpointSchema = z.object({
  body: z.object({
    path: z.string().startsWith('/', 'Path must start with /'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']).default('GET'),
    description: z.string().optional(),
    requestSchema: z.record(z.unknown()).optional(),
    responseSchema: z.record(z.unknown()).optional(),
    isActive: z.boolean().default(true),
  }),
});

export const createVersionSchema = z.object({
  body: z.object({
    version: z.string().min(1, 'Version label required (e.g. v1, v2)'),
    basePath: z.string().default(''),
  }),
});
