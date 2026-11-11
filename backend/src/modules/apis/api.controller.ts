import { Request, Response, NextFunction } from 'express';
import { apiService } from './api.service.js';

export class ApiController {
  async listApis(req: Request, res: Response, next: NextFunction) {
    try {
      const apis = await apiService.listApis(req.params.orgId);
      res.json({ success: true, data: apis });
    } catch (err) {
      next(err);
    }
  }

  async getApi(req: Request, res: Response, next: NextFunction) {
    try {
      const api = await apiService.getApiById(req.params.orgId, req.params.apiId);
      res.json({ success: true, data: api });
    } catch (err) {
      next(err);
    }
  }

  async createApi(req: Request, res: Response, next: NextFunction) {
    try {
      const api = await apiService.createApi(req.params.orgId, req.body);
      res.status(201).json({ success: true, data: api });
    } catch (err) {
      next(err);
    }
  }

  async updateApi(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await apiService.updateApi(req.params.orgId, req.params.apiId, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async deleteApi(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await apiService.deleteApi(req.params.orgId, req.params.apiId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async createVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const version = await apiService.createVersion(req.params.orgId, req.params.apiId, req.body);
      res.status(201).json({ success: true, data: version });
    } catch (err) {
      next(err);
    }
  }

  async createEndpoint(req: Request, res: Response, next: NextFunction) {
    try {
      const endpoint = await apiService.createEndpoint(
        req.params.orgId,
        req.params.apiId,
        req.params.versionId,
        req.body
      );
      res.status(201).json({ success: true, data: endpoint });
    } catch (err) {
      next(err);
    }
  }
}

export const apiController = new ApiController();
