import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service.js';

export class AnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const hours = parseInt(String(req.query.hours || '24'), 10);
      const data = await analyticsService.getDashboardKpis(req.params.orgId, hours);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getTimeseries(req: Request, res: Response, next: NextFunction) {
    try {
      const hours = parseInt(String(req.query.hours || '24'), 10);
      const data = await analyticsService.getTrafficTimeseries(req.params.orgId, hours);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getApis(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getApiBreakdown(req.params.orgId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getAppBreakdown(req.params.orgId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getErrors(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getErrorDistribution(req.params.orgId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
