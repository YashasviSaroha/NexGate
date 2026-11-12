import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

const KEY_PATTERN = /ng_(live|test)_[a-f0-9]{8}_[a-f0-9]{48}/gi;
const BEARER_PATTERN = /bearer\s+[a-z0-9\-._~+/]+=*/gi;

export function sanitizeForModel(value: string): string {
  return value.replace(KEY_PATTERN, 'YOUR_API_KEY').replace(BEARER_PATTERN, 'Bearer YOUR_TOKEN').slice(0, 6000);
}

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new AppError('The assistant returned an unexpected response.', 502);
  }
}

function missingKey(): AppError {
  return new AppError('Gemini is not configured on the server.', 503);
}

function statusError(status: number): AppError {
  if (status === 429) return new AppError('Gemini quota is exhausted. Try again later.', 429);
  if (status >= 500) return new AppError('Gemini is temporarily unavailable.', 503);
  return new AppError('Gemini request failed.', 502);
}

export async function generateJson(prompt: string): Promise<unknown> {
  if (!env.GEMINI_API_KEY) throw missingKey();

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: sanitizeForModel(prompt) }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: env.GEMINI_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
    },
  });

  let lastError: AppError = statusError(502);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.GEMINI_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY,
          },
          body,
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        lastError = statusError(response.status);
        if (response.status !== 429 && response.status < 500) throw lastError;
        continue;
      }

      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
      if (!text) throw new AppError('Gemini returned an empty response.', 502);
      return parseModelJson(text);
    } catch (err) {
      if (err instanceof AppError) {
        lastError = err;
        if (err.statusCode < 500 && err.statusCode !== 429) throw err;
      } else if (err instanceof Error && err.name === 'AbortError') {
        lastError = new AppError('Gemini took too long to respond.', 504);
      } else {
        lastError = new AppError('Gemini request failed.', 502);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}
