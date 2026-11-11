import { Router } from 'express';
import { requestLogController } from './requestlog.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(attachOrgContext);

router.get('/', requestLogController.listLogs);
router.get('/:logId', requestLogController.getLogDetail);

export default router;
