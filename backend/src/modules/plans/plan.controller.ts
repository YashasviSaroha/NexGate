import { Request, Response, NextFunction } from 'express';
import { planService } from './plan.service.js';

export class PlanController {
  async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await planService.listPlans(req.params.apiId);
      res.json({ success: true, data: plans });
    } catch (err) {
      next(err);
    }
  }

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await planService.createPlan(req.params.apiId, req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await planService.updatePlan(req.params.planId, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const planController = new PlanController();
