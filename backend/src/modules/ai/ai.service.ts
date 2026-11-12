import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { redisClient } from '../../config/redis.js';
import { ForbiddenError, NotFoundError, AppError } from '../../utils/errors.js';
import { generateJson, sanitizeForModel } from './gemini.js';

const memoryQuota = new Map<string, { count: number; failures: number }>();

const docsSchema = z.object({
  summary: z.string().min(1),
  endpoints: z.array(
    z.object({
      method: z.string(),
      path: z.string(),
      description: z.string(),
      parameters: z.string(),
      example: z.string(),
    })
  ),
});

const explainSchema = z.object({
  hypotheses: z.array(z.string()),
  steps: z.array(z.string()),
});

const insightsSchema = z.object({
  summary: z.string().min(1),
  patterns: z.array(z.string()),
  suggestions: z.array(z.string()),
});

async function consumeQuota(userId: string, demo: boolean) {
  const limit = demo ? env.DEMO_DAILY_AI_LIMIT : env.USER_DAILY_AI_LIMIT;
  const day = new Date().toISOString().slice(0, 10);
  const key = `ai:${demo ? 'demo' : 'user'}:${userId}:${day}`;

  if (redisClient && redisClient.status === 'ready') {
    const used = await redisClient.incr(key);
    if (used === 1) await redisClient.expire(key, 60 * 60 * 36);
    if (used > limit) {
      throw new AppError('AI request limit reached for today.', 429);
    }
    return { used, limit };
  }

  const current = memoryQuota.get(key) || { count: 0, failures: 0 };
  current.count += 1;
  memoryQuota.set(key, current);
  if (current.count > limit) throw new AppError('AI request limit reached for today.', 429);
  return { used: current.count, limit };
}

async function recordFailure(userId: string, demo: boolean) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `ai-fail:${demo ? 'demo' : 'user'}:${userId}:${day}`;
  if (redisClient && redisClient.status === 'ready') {
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, 60 * 60 * 36);
    return;
  }
  const current = memoryQuota.get(key) || { count: 0, failures: 0 };
  current.failures += 1;
  memoryQuota.set(key, current);
}

async function requireMembership(userId: string, organizationId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId, status: 'ACTIVE' },
  });
  if (!membership) throw new ForbiddenError('You do not have access to this organization.');
}

export class AiService {
  async usage(userId: string, demo: boolean) {
    const limit = demo ? env.DEMO_DAILY_AI_LIMIT : env.USER_DAILY_AI_LIMIT;
    const day = new Date().toISOString().slice(0, 10);
    const key = `ai:${demo ? 'demo' : 'user'}:${userId}:${day}`;
    const failKey = `ai-fail:${demo ? 'demo' : 'user'}:${userId}:${day}`;
    let used = 0;
    let failures = 0;

    if (redisClient && redisClient.status === 'ready') {
      used = Number((await redisClient.get(key)) || 0);
      failures = Number((await redisClient.get(failKey)) || 0);
    } else {
      used = memoryQuota.get(key)?.count || 0;
      failures = memoryQuota.get(failKey)?.failures || 0;
    }

    return { used, limit, failures, remaining: Math.max(0, limit - used), demo };
  }

  async documentation(userId: string, demo: boolean, apiId: string) {
    const quota = await consumeQuota(userId, demo);
    try {
      const api = await prisma.api.findUnique({
        where: { id: apiId },
        include: { endpoints: { select: { method: true, path: true, description: true } } },
      });
      if (!api) throw new NotFoundError('API not found.');
      await requireMembership(userId, api.organizationId);

      const metadata = sanitizeForModel(
        JSON.stringify({
          name: api.name,
          description: api.description,
          endpoints: api.endpoints,
        })
      );
      const raw = await generateJson(
        `You write API documentation. Use only this metadata:\n${metadata}\n` +
          `Return JSON with summary (string) and endpoints (array of method, path, description, parameters, example). ` +
          `Examples must use the placeholder YOUR_API_KEY. Do not invent credentials or upstream hosts.`
      );
      return { ...docsSchema.parse(raw), quota, apiId: api.id };
    } catch (err) {
      await recordFailure(userId, demo);
      throw err;
    }
  }

  async explain(userId: string, demo: boolean, requestLogId: string) {
    const quota = await consumeQuota(userId, demo);
    try {
      const log = await prisma.requestLog.findUnique({
        where: { id: requestLogId },
        include: { api: { select: { name: true } } },
      });
      if (!log) throw new NotFoundError('Request log not found.');
      await requireMembership(userId, log.organizationId);

      const confirmed = [
        `HTTP method is ${log.method}.`,
        `Path is ${log.path}.`,
        `Status code is ${log.statusCode}.`,
        `Recorded latency is ${log.latencyMs} ms.`,
        log.api?.name ? `API name is ${log.api.name}.` : 'No API name is stored on this log.',
        log.errorCategory === 'demo-sample'
          ? 'This row is labeled sample history, not a live request from the current session.'
          : 'This row is a stored gateway log. The request body is not stored.',
      ];

      const raw = await generateJson(
        `Explain this failed or notable API call. Confirmed facts:\n${confirmed.join('\n')}\n` +
          `Return JSON with hypotheses (string array) and steps (string array). ` +
          `Hypotheses must be guesses, not stated as facts. Do not request or include secrets.`
      );
      const parsed = explainSchema.parse(raw);
      return { confirmed, hypotheses: parsed.hypotheses, steps: parsed.steps, quota };
    } catch (err) {
      await recordFailure(userId, demo);
      throw err;
    }
  }

  async insights(userId: string, demo: boolean, organizationId: string) {
    const quota = await consumeQuota(userId, demo);
    try {
      await requireMembership(userId, organizationId);
      const since = new Date(Date.now() - 24 * 3600000);
      const logs = await prisma.requestLog.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { path: true, statusCode: true, latencyMs: true, errorCategory: true },
      });

      const byPath = new Map<string, { requests: number; errors: number; latency: number }>();
      for (const log of logs) {
        const row = byPath.get(log.path) || { requests: 0, errors: 0, latency: 0 };
        row.requests += 1;
        row.latency += log.latencyMs;
        if (log.statusCode >= 400) row.errors += 1;
        byPath.set(log.path, row);
      }

      const endpoints = [...byPath.entries()].map(([path, row]) => ({
        path,
        requests: row.requests,
        errors: row.errors,
        avgLatencyMs: Math.round(row.latency / row.requests),
      }));
      const sampleCount = logs.filter((log) => log.errorCategory === 'demo-sample').length;
      const metrics = {
        windowHours: 24,
        totalRequests: logs.length,
        sampleRows: sampleCount,
        liveRows: logs.length - sampleCount,
        endpoints,
      };

      const raw = await generateJson(
        `Summarize these aggregated API metrics. Do not invent numbers.\n${JSON.stringify(metrics)}\n` +
          `Return JSON with summary (string), patterns (string array), and suggestions (string array). ` +
          `Say when a figure includes sample history.`
      );
      return { ...insightsSchema.parse(raw), metrics, quota };
    } catch (err) {
      await recordFailure(userId, demo);
      throw err;
    }
  }

  async examples(userId: string, demo: boolean, apiId: string) {
    const api = await prisma.api.findUnique({
      where: { id: apiId },
      include: {
        endpoints: { select: { method: true, path: true, description: true }, take: 5 },
        versions: { select: { version: true }, take: 1 },
      },
    });
    if (!api) throw new NotFoundError('API not found.');
    await requireMembership(userId, api.organizationId);

    const version = api.versions[0]?.version || 'v1';
    const endpoint = api.endpoints[0];
    const path = endpoint?.path || '/';
    const method = endpoint?.method || 'GET';
    const url = `${env.BACKEND_URL.replace(/\/$/, '')}/gateway/${api.slug}/${version}${path}`;
    const curl = `curl -X ${method} "${url}" \\\n  -H "X-API-Key: YOUR_API_KEY"`;
    const javascript =
      `const response = await fetch("${url}", {\n` +
      `  method: "${method}",\n` +
      `  headers: { "X-API-Key": "YOUR_API_KEY" },\n` +
      `});\nconst data = await response.json();`;
    const python =
      `import requests\n\nresponse = requests.${method.toLowerCase()}(\n` +
      `    "${url}",\n    headers={"X-API-Key": "YOUR_API_KEY"},\n)\nprint(response.json())`;

    let notes = 'Examples use a placeholder credential. Replace YOUR_API_KEY with a key from your application.';
    let quota = null as { used: number; limit: number } | null;
    if (env.GEMINI_API_KEY) {
      quota = await consumeQuota(userId, demo);
      try {
        const raw = await generateJson(
          `Given this API name "${sanitizeForModel(api.name)}" and this curl:\n${curl}\n` +
            `Return JSON { "notes": string } with one short integration note. Do not include real secrets.`
        );
        const parsed = z.object({ notes: z.string().min(1) }).parse(raw);
        notes = parsed.notes;
      } catch (err) {
        await recordFailure(userId, demo);
        notes = 'Local examples are shown because the assistant could not add a note.';
        if (err instanceof AppError && err.statusCode === 429) throw err;
      }
    }

    return { curl, javascript, python, notes, quota, generatedBy: quota ? 'gemini+local' : 'local' };
  }
}

export const aiService = new AiService();
