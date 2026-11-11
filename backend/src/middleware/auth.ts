import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { AuthenticatedUser } from '../types/index.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // 1. Try httpOnly cookie first (secure web browser flow)
  let token = req.cookies?.nexgate_token;

  // 2. Fall back to Authorization Bearer header (CLI/API flow)
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('Authentication required. No session or token found.');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (error) {
    throw new UnauthorizedError('Session expired or invalid token. Please log in again.');
  }
}
