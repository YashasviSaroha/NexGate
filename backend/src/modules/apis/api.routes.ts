import { Router } from 'express';
import { apiController } from './api.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.js';
import {
  createApiSchema,
  updateApiSchema,
  createEndpointSchema,
  createVersionSchema,
} from './api.schemas.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(attachOrgContext);

router.get('/', apiController.listApis);
router.post('/', requireRole(['OWNER', 'ADMIN', 'MEMBER']), validate(createApiSchema), apiController.createApi);
router.get('/:apiId', apiController.getApi);
router.put('/:apiId', requireRole(['OWNER', 'ADMIN']), validate(updateApiSchema), apiController.updateApi);
router.delete('/:apiId', requireRole(['OWNER', 'ADMIN']), apiController.deleteApi);

// Versions and Endpoints
router.post('/:apiId/versions', requireRole(['OWNER', 'ADMIN']), validate(createVersionSchema), apiController.createVersion);
router.post('/:apiId/versions/:versionId/endpoints', requireRole(['OWNER', 'ADMIN']), validate(createEndpointSchema), apiController.createEndpoint);

export default router;
