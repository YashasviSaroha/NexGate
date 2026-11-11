import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { parsePagination, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError } from '../../utils/errors.js';

export class RequestLogController {
  async listLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId } = req.params;
      const pagination = parsePagination(req.query);

      const where: any = { organizationId: orgId };

      if (req.query.apiId) where.apiId = String(req.query.apiId);
      if (req.query.applicationId) where.applicationId = String(req.query.applicationId);
      if (req.query.method) where.method = String(req.query.method).toUpperCase();

      if (req.query.statusCode) {
        where.statusCode = parseInt(String(req.query.statusCode), 10);
      } else if (req.query.statusCategory === 'error') {
        where.statusCode = { gte: 400 };
      } else if (req.query.statusCategory === 'success') {
        where.statusCode = { lt: 400 };
      }

      if (req.query.search) {
        where.path = { contains: String(req.query.search), mode: 'insensitive' };
      }

      const [logs, total] = await Promise.all([
        prisma.requestLog.findMany({
          where,
          include: {
            api: { select: { id: true, name: true, slug: true } },
            application: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
        }),
        prisma.requestLog.count({ where }),
      ]);

      res.json({
        success: true,
        ...formatPaginatedResponse(logs, total, pagination),
      });
    } catch (err) {
      next(err);
    }
  }

  async getLogDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId, logId } = req.params;
      const log = await prisma.requestLog.findFirst({
        where: { id: logId, organizationId: orgId },
        include: {
          api: true,
          application: true,
          apiVersion: true,
        },
      });

      if (!log) throw new NotFoundError('Request log not found.');
      res.json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  }
}

export const requestLogController = new RequestLogController();
