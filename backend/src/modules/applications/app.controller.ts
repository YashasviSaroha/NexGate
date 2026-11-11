import { Request, Response, NextFunction } from 'express';
import { appService } from './app.service.js';

export class AppController {
  async listApps(req: Request, res: Response, next: NextFunction) {
    try {
      const apps = await appService.listApps(req.params.orgId);
      res.json({ success: true, data: apps });
    } catch (err) {
      next(err);
    }
  }

  async getApp(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await appService.getAppById(req.params.orgId, req.params.appId);
      res.json({ success: true, data: app });
    } catch (err) {
      next(err);
    }
  }

  async createApp(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await appService.createApp(req.params.orgId, req.user!.id, req.body);
      res.status(201).json({ success: true, data: app });
    } catch (err) {
      next(err);
    }
  }

  async updateApp(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await appService.updateApp(req.params.orgId, req.params.appId, req.body);
      res.json({ success: true, data: app });
    } catch (err) {
      next(err);
    }
  }

  async deleteApp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appService.deleteApp(req.params.orgId, req.params.appId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async generateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const keyData = await appService.generateKey(req.params.orgId, req.params.appId, req.body);
      res.status(201).json({ success: true, data: keyData });
    } catch (err) {
      next(err);
    }
  }

  async revokeKey(req: Request, res: Response, next: NextFunction) {
    try {
      const revoked = await appService.revokeKey(req.params.orgId, req.params.appId, req.params.keyId);
      res.json({ success: true, data: revoked });
    } catch (err) {
      next(err);
    }
  }

  async rotateKey(req: Request, res: Response, next: NextFunction) {
    try {
      const rotated = await appService.rotateKey(req.params.orgId, req.params.appId, req.params.keyId);
      res.status(201).json({ success: true, data: rotated });
    } catch (err) {
      next(err);
    }
  }

  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const sub = await appService.subscribe(req.params.orgId, req.params.appId, req.body);
      res.status(201).json({ success: true, data: sub });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appService.unsubscribe(req.params.orgId, req.params.appId, req.params.subId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const appController = new AppController();
