import { Router } from 'express';
import { appController } from './app.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.js';
import {
  createAppSchema,
  updateAppSchema,
  generateKeySchema,
  subscribeSchema,
} from './app.schemas.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(attachOrgContext);

router.get('/', appController.listApps);
router.post('/', validate(createAppSchema), appController.createApp);
router.get('/:appId', appController.getApp);
router.put('/:appId', validate(updateAppSchema), appController.updateApp);
router.delete('/:appId', requireRole(['OWNER', 'ADMIN']), appController.deleteApp);

// Key operations
router.post('/:appId/keys', validate(generateKeySchema), appController.generateKey);
router.post('/:appId/keys/:keyId/revoke', appController.revokeKey);
router.post('/:appId/keys/:keyId/rotate', appController.rotateKey);

// Subscriptions
router.post('/:appId/subscriptions', validate(subscribeSchema), appController.subscribe);
router.delete('/:appId/subscriptions/:subId', appController.unsubscribe);

export default router;
