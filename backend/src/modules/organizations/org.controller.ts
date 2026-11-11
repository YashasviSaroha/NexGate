import { Request, Response, NextFunction } from 'express';
import { orgService } from './org.service.js';

export class OrgController {
  async listUserOrgs(req: Request, res: Response, next: NextFunction) {
    try {
      const orgs = await orgService.listUserOrgs(req.user!.id);
      res.json({ success: true, data: orgs });
    } catch (err) {
      next(err);
    }
  }

  async createOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await orgService.createOrg(req.user!.id, req.body);
      res.status(201).json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  async getOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await orgService.getOrgById(req.params.orgId);
      res.json({ success: true, data: org });
    } catch (err) {
      next(err);
    }
  }

  async updateOrg(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await orgService.updateOrg(req.params.orgId, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await orgService.listMembers(req.params.orgId);
      res.json({ success: true, data: members });
    } catch (err) {
      next(err);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await orgService.inviteMember(req.params.orgId, req.body);
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await orgService.updateMemberRole(
        req.params.orgId,
        req.params.memberId,
        req.body.role
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orgService.removeMember(req.params.orgId, req.params.memberId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const orgController = new OrgController();
