import { Request, Response, NextFunction } from 'express';
import { gatewayService, STRIPPED_RESPONSE_HEADERS } from './gateway.service.js';

export class GatewayController {
  async handleProxy(req: Request, res: Response, next: NextFunction) {
    try {
      const { apiSlug, version } = req.params;
      const subPath = (req.params as any)[0] || '';

      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await gatewayService.handleGatewayRequest({
        apiSlug,
        version,
        subPath,
        method: req.method,
        headers: req.headers,
        query: req.query as Record<string, unknown>,
        body: req.body,
        clientIp,
      });

      // Pass forward response headers & RateLimit RFC standards
      res.setHeader('RateLimit-Limit', result.rateLimitInfo.limit);
      res.setHeader('RateLimit-Remaining', result.rateLimitInfo.remaining);
      res.setHeader('RateLimit-Reset', result.rateLimitInfo.resetSeconds);
      res.setHeader('X-Gateway-Latency', `${result.latencyMs}ms`);

      // Set upstream headers (excluding hop-by-hop)
      for (const [key, val] of Object.entries(result.headers)) {
        if (!STRIPPED_RESPONSE_HEADERS.includes(key.toLowerCase()) && val) {
          res.setHeader(key, val);
        }
      }

      res.status(result.statusCode).send(result.body);
    } catch (err) {
      next(err);
    }
  }
}

export const gatewayController = new GatewayController();
