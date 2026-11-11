import { Router } from 'express';
import { gatewayController } from './gateway.controller.js';

const router = Router();

// Matches both /gateway/:apiSlug/:version and /gateway/:apiSlug/:version/*
router.all('/:apiSlug/:version', gatewayController.handleProxy);
router.all('/:apiSlug/:version/*', gatewayController.handleProxy);

export default router;
