import { Router } from 'express';
import { orgController } from './org.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { attachOrgContext } from '../../middleware/orgContext.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validation.js';
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './org.schemas.js';

const router = Router();

// All organization routes require user authentication
router.use(authenticate);

router.get('/', orgController.listUserOrgs);
router.post('/', validate(createOrgSchema), orgController.createOrg);

// Tenant-scoped routes
router.get('/:orgId', attachOrgContext, orgController.getOrg);
router.put('/:orgId', attachOrgContext, requireRole(['OWNER', 'ADMIN']), validate(updateOrgSchema), orgController.updateOrg);

// Members
router.get('/:orgId/members', attachOrgContext, orgController.listMembers);
router.post('/:orgId/members/invite', attachOrgContext, requireRole(['OWNER', 'ADMIN']), validate(inviteMemberSchema), orgController.inviteMember);
router.put('/:orgId/members/:memberId', attachOrgContext, requireRole(['OWNER']), validate(updateMemberRoleSchema), orgController.updateMemberRole);
router.delete('/:orgId/members/:memberId', attachOrgContext, requireRole(['OWNER']), orgController.removeMember);

export default router;
