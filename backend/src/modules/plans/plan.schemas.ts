import { z } from 'zod';

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    tier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).default('FREE'),
    requestsPerMinute: z.number().int().positive().default(60),
    dailyQuota: z.number().int().positive().default(1000),
    monthlyQuota: z.number().int().positive().default(30000),
    price: z.number().nonnegative().default(0),
    billingInterval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
    features: z.array(z.string()).optional(),
  }),
});

export const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    tier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
    requestsPerMinute: z.number().int().positive().optional(),
    dailyQuota: z.number().int().positive().optional(),
    monthlyQuota: z.number().int().positive().optional(),
    price: z.number().nonnegative().optional(),
    features: z.array(z.string()).optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  }),
});
