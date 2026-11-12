import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import orgRoutes from './modules/organizations/org.routes.js';
import apiRoutes from './modules/apis/api.routes.js';
import appRoutes from './modules/applications/app.routes.js';
import planRoutes from './modules/plans/plan.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import requestLogRoutes from './modules/requestlogs/requestlog.routes.js';
import webhookRoutes from './modules/webhooks/webhook.routes.js';
import gatewayRoutes from './modules/gateway/gateway.routes.js';
import mockRoutes from './modules/mock/mock.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import demoRoutes from './modules/demo/demo.routes.js';
import { denyDemoMutation } from './middleware/demoGuard.js';
import { testDbConnection } from './config/database.js';

const app = express();

// Security & utility middleware
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Organization-Id'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: env.GATEWAY_MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Attach Request ID
app.use((req, res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.get('/', (_req, res) => {
  res.json({
    product: 'NexGate',
    status: 'up',
    health: '/health',
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'NexGate',
    tagline: 'API Infrastructure, Simplified.',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (req, res) => {
  const database = await testDbConnection();
  res.status(database ? 200 : 503).json({
    status: database ? 'ready' : 'unavailable',
    database: database ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
});

app.use(denyDemoMutation);

// Mount Modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/demo', demoRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/organizations', orgRoutes);
app.use('/api/v1/organizations/:orgId/apis', apiRoutes);
app.use('/api/v1/organizations/:orgId/applications', appRoutes);
app.use('/api/v1/organizations/:orgId/plans', planRoutes);
app.use('/api/v1/organizations/:orgId/analytics', analyticsRoutes);
app.use('/api/v1/organizations/:orgId/request-logs', requestLogRoutes);
app.use('/api/v1/organizations/:orgId/webhooks', webhookRoutes);

// Core Gateway Route: /gateway/:apiSlug/:version/*
app.use('/gateway', gatewayRoutes);

// Mock Upstream Service for testing & playground verification
app.use('/mock-upstream', mockRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
