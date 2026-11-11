import { z } from 'zod';

export const createAppSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
  }),
});

export const updateAppSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  }),
});

export const generateKeySchema = z.object({
  body: z.object({
    environment: z.enum(['LIVE', 'TEST']).default('LIVE'),
    scopes: z.array(z.string()).optional(),
    expiresInDays: z.number().int().positive().optional(),
  }),
});

export const subscribeSchema = z.object({
  body: z.object({
    apiId: z.string().uuid('Invalid API ID'),
    apiPlanId: z.string().uuid('Invalid Plan ID'),
  }),
});
