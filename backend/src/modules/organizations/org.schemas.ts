import { z } from 'zod';

export const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    slug: z
      .string()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
      .optional(),
  }),
});

export const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'DEVELOPER']).default('DEVELOPER'),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'DEVELOPER']),
  }),
});
