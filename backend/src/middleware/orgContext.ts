import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AppError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export async function attachOrgContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const orgId = req.params.orgId || req.headers['x-organization-id'];

  if (!orgId || typeof orgId !== 'string') {
    return next();
  }

  if (!req.user) {
    throw new UnauthorizedError('Authentication required to access organization.');
  }

  // Tenant isolation check: ensure user is an ACTIVE member of this organization
  try {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: req.user.id,
        status: 'ACTIVE',
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this organization.');
    }

    req.organization = {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      userRole: membership.role,
    };

    next();
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string };
    if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
      throw new AppError('Database is unavailable.', 503);
    }
    throw err;
  }
}
