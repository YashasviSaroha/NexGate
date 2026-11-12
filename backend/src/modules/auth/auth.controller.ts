import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { ensureDemoWorkspace } from '../demo/demo.service.js';

const COOKIE_NAME = 'nexgate_token';

const production = process.env.NODE_ENV === 'production';

function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
  });
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      setAuthCookie(res, result.token);
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          organization: result.organization,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      setAuthCookie(res, result.token);
      res.json({
        success: true,
        data: {
          user: result.user,
          organizations: result.organizations,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const bearer = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;
      await authService.revokeSession(req.cookies?.nexgate_token || bearer);
      clearAuthCookie(res);
      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (err) {
      next(err);
    }
  }

  async demo(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await ensureDemoWorkspace();
      const token = authService.issueDemoToken(workspace.user);
      setAuthCookie(res, token);
      res.json({
        success: true,
        data: {
          user: { ...workspace.user, demo: true },
          organizations: [workspace.organization],
          sandboxKey: workspace.sandboxKey,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json({
        success: true,
        data: { ...user, demo: req.user?.demo === true },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await authService.updateProfile(req.user!.id, req.body);
      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
