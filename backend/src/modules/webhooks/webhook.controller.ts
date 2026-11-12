import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { generateRandomToken } from '../../utils/crypto.js';
import { validateUpstreamUrl } from '../../utils/ssrf.js';
import { NotFoundError } from '../../utils/errors.js';

function previewSecret(secret: string): string {
  return `${secret.slice(0, 12)}••••`;
}

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
      res.json({
        success: true,
        data: webhooks.map((webhook) => ({ ...webhook, secret: previewSecret(webhook.secret) })),
      });
    } catch (err) {
      next(err);
    }
  }

  async createWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { url, events } = req.body;
      await validateUpstreamUrl(url);
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
      const existing = await prisma.webhook.findFirst({
        where: { id: req.params.webhookId, organizationId: req.params.orgId },
      });
      if (!existing) throw new NotFoundError('Webhook not found.');

      await prisma.webhook.delete({
        where: { id: existing.id },
      });
      res.json({ success: true, data: { message: 'Webhook deleted.' } });
    } catch (err) {
      next(err);
    }
  }

  async listDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.webhookId, organizationId: req.params.orgId },
      });
      if (!webhook) throw new NotFoundError('Webhook not found.');

      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookId: webhook.id },
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
