import { Router } from 'express';
import { planController } from './plan.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.js';
import { createPlanSchema, updatePlanSchema } from './plan.schemas.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(attachOrgContext);

router.get('/:apiId/plans', planController.listPlans);
router.post('/:apiId/plans', requireRole(['OWNER', 'ADMIN']), validate(createPlanSchema), planController.createPlan);
router.put('/:apiId/plans/:planId', requireRole(['OWNER', 'ADMIN']), validate(updatePlanSchema), planController.updatePlan);

export default router;
