import { extractBigModelText, fetchWithTimeout } from '../aiClient';
import {
  API_TIMEOUT_MS,
  BIGMODEL_BASE_URL,
  CACHE_TTL_SECONDS,
  DEFAULT_BIGMODEL_MODEL
} from '../constants';
import {
  buildCacheRequest,
  getAnalyzeCacheKey,
  getCacheClient,
  storeInCache,
  withCacheHitResponse
} from '../cache';
import { normalizeResult } from '../normalize';
import { buildPrompt, heuristicClassify } from '../prompts';
import type { AnalyzeRequest, BigModelResponse, Env } from '../types';
import { jsonResponse, safeParseJson } from '../utils';

export async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  if (!env.BIGMODEL_API_KEY) {
    return jsonResponse({ error: 'BIGMODEL_API_KEY is not configured' }, 500);
  }

  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const text = (body.text || '').trim();
  if (!text) {
    return jsonResponse({ error: 'text is required' }, 400);
  }

  const language = body.language === 'zh' ? 'zh' : 'en';
  const existingQuestions = Array.isArray(body.existingQuestions) ? body.existingQuestions : [];
  const questionIds = existingQuestions.map((q) => q.id);

  const cacheKey = getAnalyzeCacheKey(text, language, questionIds);
  const cache = getCacheClient();
  const cacheRequest = buildCacheRequest(request, cacheKey);

  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    return withCacheHitResponse(cachedResponse);
  }

  const prompt = buildPrompt(text, existingQuestions, language);
  const model = env.BIGMODEL_MODEL || env.MODEL_ID || DEFAULT_BIGMODEL_MODEL;
  const baseUrl = env.BIGMODEL_BASE_URL || BIGMODEL_BASE_URL;

  const validQuestionIds = new Set(questionIds);

  try {
    const response = await fetchWithTimeout(
      baseUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.BIGMODEL_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      },
      API_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({ error: 'GLM request failed', details: errorText }, 502);
    }

    const data = (await response.json()) as BigModelResponse;
    const rawText = extractBigModelText(data);
    const parsed = safeParseJson(rawText);
    const normalized = normalizeResult(parsed, validQuestionIds);

    const jsonRes = jsonResponse(normalized, 200);
    jsonRes.headers.set('X-Cache', 'MISS');
    jsonRes.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);

    storeInCache(cache, cacheRequest, jsonRes);

    return jsonRes;
  } catch {
    const fallback = heuristicClassify(text);
    return jsonResponse(fallback, 200);
  }
}
