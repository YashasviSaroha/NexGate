import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  demo?: boolean;
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  userRole: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      organization?: OrganizationContext;
      requestId?: string;
    }
  }
}
