import { Router } from 'express';
import { webhookController } from './webhook.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';
import { requireRole } from '../../middleware/rbac.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(attachOrgContext);

router.get('/', webhookController.listWebhooks);
router.post('/', requireRole(['OWNER', 'ADMIN']), webhookController.createWebhook);
router.delete('/:webhookId', requireRole(['OWNER', 'ADMIN']), webhookController.deleteWebhook);
router.get('/:webhookId/deliveries', webhookController.listDeliveries);

export default router;
