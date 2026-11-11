import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { generateRandomToken } from '../../utils/crypto.js';
import { NotFoundError } from '../../utils/errors.js';

export class WebhookController {
  async listWebhooks(req: Request, res: Response, next: NextFunction) {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: { organizationId: req.params.orgId },
        include: {
          _count: { select: { deliveries: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: webhooks });
    } catch (err) {
      next(err);
    }
  }

  async createWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, events } = req.body;
      const secret = `whsec_${generateRandomToken(24)}`;

      const webhook = await prisma.webhook.create({
        data: {
          organizationId: req.params.orgId,
          url,
          events: events || ['api.created', 'key.revoked', 'quota.warning'],
          secret,
          status: 'ACTIVE',
        },
      });

      res.status(201).json({ success: true, data: webhook });
    } catch (err) {
      next(err);
    }
  }

  async deleteWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.webhook.delete({
        where: { id: req.params.webhookId },
      });
      res.json({ success: true, data: { message: 'Webhook deleted.' } });
    } catch (err) {
      next(err);
    }
  }

  async listDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookId: req.params.webhookId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: deliveries });
    } catch (err) {
      next(err);
    }
  }
}

export const webhookController = new WebhookController();
