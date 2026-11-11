import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      throw new UnauthorizedError('Organization context is required for role validation.');
    }

    if (!allowedRoles.includes(req.organization.userRole)) {
      throw new ForbiddenError(
        `Insufficient permissions. Requires one of: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
}
