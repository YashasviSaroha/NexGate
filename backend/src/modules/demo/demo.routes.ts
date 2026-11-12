import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { ForbiddenError } from '../../utils/errors.js';
import { env } from '../../config/env.js';
import { resetDemoTraffic } from './demo.service.js';

const router = Router();

router.post('/reset', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.demo !== true && req.user?.email !== env.DEMO_USER_EMAIL) {
      throw new ForbiddenError('Demo reset is only available inside the demo workspace.');
    }
    const data = await resetDemoTraffic(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
