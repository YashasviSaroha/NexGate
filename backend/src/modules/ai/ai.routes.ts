import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { aiService } from './ai.service.js';

const apiIdSchema = z.object({
  body: z.object({ apiId: z.string().uuid() }),
});

const logSchema = z.object({
  body: z.object({ requestLogId: z.string().uuid() }),
});

const orgSchema = z.object({
  body: z.object({ organizationId: z.string().uuid() }),
});

const router = Router();
router.use(authenticate);

router.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.usage(req.user!.id, req.user!.demo === true);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/documentation', validate(apiIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.documentation(req.user!.id, req.user!.demo === true, req.body.apiId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/explain', validate(logSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.explain(req.user!.id, req.user!.demo === true, req.body.requestLogId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/insights', validate(orgSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.insights(req.user!.id, req.user!.demo === true, req.body.organizationId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/examples', validate(apiIdSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await aiService.examples(req.user!.id, req.user!.demo === true, req.body.apiId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
