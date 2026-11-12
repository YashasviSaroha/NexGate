import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isJtiBlacklisted } from '../config/redis.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AuthenticatedUser } from '../types/index.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token = req.cookies?.nexgate_token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    next(new UnauthorizedError('Authentication required. No session or token found.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser & { jti?: string };
    if (decoded.jti && (await isJtiBlacklisted(decoded.jti))) {
      next(new UnauthorizedError('Session has been revoked. Please log in again.'));
      return;
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      demo: decoded.demo === true || decoded.email === env.DEMO_USER_EMAIL,
    };
    next();
  } catch {
    next(new UnauthorizedError('Session expired or invalid token. Please log in again.'));
  }
}
