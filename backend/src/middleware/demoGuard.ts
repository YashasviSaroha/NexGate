import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isAllowedMutation(path: string): boolean {
  if (path === '/api/v1/auth/login') return true;
  if (path === '/api/v1/auth/register') return true;
  if (path === '/api/v1/auth/logout') return true;
  if (path === '/api/v1/auth/demo') return true;
  if (path === '/api/v1/auth/forgot-password') return true;
  if (path === '/api/v1/auth/reset-password') return true;
  if (path === '/api/v1/demo/reset') return true;
  if (path.startsWith('/api/v1/ai')) return true;
  if (path.startsWith('/gateway')) return true;
  if (path.startsWith('/mock-upstream')) return true;
  return false;
}

/**
 * Demo sessions may read the showcase workspace and call the sandbox gateway.
 * Creating APIs, keys, webhooks, or organization settings is rejected here,
 * before the route handler runs.
 */
export function denyDemoMutation(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || isAllowedMutation(req.path)) {
    next();
    return;
  }

  const header = req.headers.authorization;
  const token =
    req.cookies?.nexgate_token || (header?.startsWith('Bearer ') ? header.slice(7) : undefined);

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { demo?: boolean; email?: string };
    const isDemo = decoded.demo === true || decoded.email === env.DEMO_USER_EMAIL;
    if (isDemo) {
      next(
        new ForbiddenError(
          'Demo workspace is read-only. Create an account to publish APIs, manage keys, or change organization settings.'
        )
      );
      return;
    }
  } catch {
    // A bad token is rejected by authenticate on protected routes.
  }

  next();
}
