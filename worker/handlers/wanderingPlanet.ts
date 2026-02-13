import { extractBigModelText, fetchWithTimeout } from '../aiClient';
import {
  API_TIMEOUT_MS,
  BIGMODEL_BASE_URL,
  CACHE_TTL_SECONDS,
  WANDERING_PLANET_MAX_CLUSTERS,
  DEFAULT_BIGMODEL_MODEL
} from '../constants';
import {
  buildCacheRequest,
  getCacheClient,
  getWanderingPlanetCacheKey,
  storeInCache,
  withCacheHitResponse
} from '../cache';
import { normalizeWanderingPlanetResult } from '../normalize';
import { buildWanderingPlanetPrompt } from '../prompts';
import type { BigModelResponse, WanderingPlanetAnalyzeRequest, Env } from '../types';
import { asRecord, jsonResponse, safeParseJson } from '../utils';

export async function handleWanderingPlanetAnalyze(
  request: Request,
  env: Env,
  ctx?: ExecutionContext
): Promise<Response> {
  if (!env.BIGMODEL_API_KEY) {
    return jsonResponse({ error: 'BIGMODEL_API_KEY is not configured' }, 500);
  }

  let body: WanderingPlanetAnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const language = body.language === 'zh' ? 'zh' : 'en';
  const maxClustersRaw = typeof body.maxClusters === 'number' ? body.maxClusters : 5;
  const maxClusters = Math.max(1, Math.min(WANDERING_PLANET_MAX_CLUSTERS, Math.round(maxClustersRaw)));

  const rawNotes = Array.isArray(body.notes) ? body.notes : [];
  const noteMap = new Map<string, { id: string; content: string; type?: string; createdAt?: number }>();
  for (const note of rawNotes) {
    if (!note || typeof note.id !== 'string' || typeof note.content !== 'string') continue;
    const content = note.content.trim();
    if (!content) continue;
    if (!noteMap.has(note.id)) {
      noteMap.set(note.id, {
        id: note.id,
        content,
        type: typeof note.type === 'string' ? note.type : undefined,
        createdAt: typeof note.createdAt === 'number' ? note.createdAt : undefined
      });
    }
  }
  const notes = Array.from(noteMap.values());
  if (notes.length < 2) {
    return jsonResponse({ suggestions: [] }, 200);
  }

  const existingQuestions = Array.isArray(body.existingQuestions) ? body.existingQuestions : [];
  const questionIds = existingQuestions
    .map((q) => (q && typeof q.id === 'string' ? q.id : ''))
    .filter(Boolean);
  const questionTitleById = new Map<string, string>();
  for (const q of existingQuestions) {
    if (!q || typeof q.id !== 'string' || typeof q.content !== 'string') continue;
    if (!questionTitleById.has(q.id)) {
      questionTitleById.set(q.id, q.content.trim());
    }
  }

  const cacheKey = await getWanderingPlanetCacheKey(
    language,
    maxClusters,
    notes,
    existingQuestions.filter(
      (q): q is { id: string; content: string } => typeof q?.id === 'string' && typeof q?.content === 'string'
    )
  );
  const cache = getCacheClient();
  const cacheRequest = buildCacheRequest(request, cacheKey);

  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    return withCacheHitResponse(cachedResponse);
  }

  const prompt = buildWanderingPlanetPrompt(notes, existingQuestions, language, maxClusters);
  const model = env.BIGMODEL_MODEL || env.MODEL_ID || DEFAULT_BIGMODEL_MODEL;
  const baseUrl = env.BIGMODEL_BASE_URL || BIGMODEL_BASE_URL;
  const validNoteIds = new Set(notes.map((note) => note.id));
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
    const parsedRecord = asRecord(parsed);
    if (!parsedRecord) {
      return jsonResponse({ suggestions: [] }, 200);
    }

    const normalized = normalizeWanderingPlanetResult(
      parsedRecord,
      validNoteIds,
      validQuestionIds,
      questionTitleById,
      maxClusters
    );

    const jsonRes = jsonResponse(normalized, 200);
    jsonRes.headers.set('X-Cache', 'MISS');
    jsonRes.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);

    storeInCache(cache, cacheRequest, jsonRes, ctx);

    return jsonRes;
  } catch {
    return jsonResponse({ suggestions: [] }, 200);
  }
}
