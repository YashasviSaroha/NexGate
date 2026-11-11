import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(attachOrgContext);

router.get('/overview', analyticsController.getOverview);
router.get('/timeseries', analyticsController.getTimeseries);
router.get('/apis', analyticsController.getApis);
router.get('/applications', analyticsController.getApplications);
router.get('/errors', analyticsController.getErrors);

export default router;
