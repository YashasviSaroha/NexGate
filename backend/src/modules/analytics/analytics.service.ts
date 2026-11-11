import { prisma } from '../../config/database.js';

export class AnalyticsService {
  async getDashboardKpis(orgId: string, timeRangeHours = 24) {
    const sinceDate = new Date(Date.now() - timeRangeHours * 3600000);

    const logs = await prisma.requestLog.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: sinceDate },
      },
      select: {
        statusCode: true,
        latencyMs: true,
        createdAt: true,
      },
    });

    const totalRequests = logs.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalLatency = 0;

    for (const log of logs) {
      if (log.statusCode >= 200 && log.statusCode < 400) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
      totalLatency += log.latencyMs;
    }

    const avgLatency = totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0;
    const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgLatencyMs: avgLatency,
      successRate,
      timeRangeHours,
    };
  }

  async getTrafficTimeseries(orgId: string, timeRangeHours = 24) {
    const sinceDate = new Date(Date.now() - timeRangeHours * 3600000);

    const logs = await prisma.requestLog.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: sinceDate },
      },
      select: {
        statusCode: true,
        latencyMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket into hourly intervals
    const buckets: Record<string, { timestamp: string; requests: number; errors: number; avgLatency: number; totalLat: number }> = {};

    for (const log of logs) {
      const hourKey = new Date(log.createdAt).toISOString().slice(0, 13) + ':00:00Z';
      if (!buckets[hourKey]) {
        buckets[hourKey] = {
          timestamp: hourKey,
          requests: 0,
          errors: 0,
          avgLatency: 0,
          totalLat: 0,
        };
      }

      buckets[hourKey].requests++;
      if (log.statusCode >= 400) {
        buckets[hourKey].errors++;
      }
      buckets[hourKey].totalLat += log.latencyMs;
    }

    const series = Object.values(buckets).map((b) => ({
      timestamp: b.timestamp,
      requests: b.requests,
      errors: b.errors,
      avgLatency: Math.round(b.totalLat / b.requests),
    }));

    return series;
  }

  async getApiBreakdown(orgId: string) {
    const apis = await prisma.api.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: { requestLogs: true },
        },
      },
    });

    return apis.map((a) => ({
      apiId: a.id,
      name: a.name,
      slug: a.slug,
      requestCount: a._count.requestLogs,
    }));
  }

  async getAppBreakdown(orgId: string) {
    const apps = await prisma.application.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      include: {
        _count: {
          select: { requestLogs: true },
        },
      },
      orderBy: { requestLogs: { _count: 'desc' } },
      take: 10,
    });

    return apps.map((app) => ({
      appId: app.id,
      name: app.name,
      requestCount: app._count.requestLogs,
    }));
  }

  async getErrorDistribution(orgId: string) {
    const logs = await prisma.requestLog.groupBy({
      by: ['statusCode'],
      where: {
        organizationId: orgId,
        statusCode: { gte: 400 },
      },
      _count: {
        statusCode: true,
      },
    });

    return logs.map((l) => ({
      statusCode: l.statusCode,
      count: l._count.statusCode,
    }));
  }
}

export const analyticsService = new AnalyticsService();
