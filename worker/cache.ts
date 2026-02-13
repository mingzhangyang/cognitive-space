import { hashString } from './utils';

export async function getAnalyzeCacheKey(
  text: string,
  language: string,
  existingQuestions: Array<{ id: string; content: string }>
): Promise<string> {
  const sortedQuestions = [...existingQuestions].sort((a, b) => a.id.localeCompare(b.id));
  const raw = JSON.stringify({
    version: 4,
    language,
    text,
    existingQuestions: sortedQuestions
  });
  return `analyze:${await hashString(raw)}`;
}

export async function getWanderingPlanetCacheKey(
  language: string,
  maxClusters: number,
  notes: Array<{ id: string; content: string; type?: string }>,
  existingQuestions: Array<{ id: string; content: string }>
): Promise<string> {
  const sortedNotes = [...notes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedQuestions = [...existingQuestions].sort((a, b) => a.id.localeCompare(b.id));
  const raw = JSON.stringify({
    version: 4,
    language,
    maxClusters,
    notes: sortedNotes.map((note) => ({
      id: note.id,
      content: note.content,
      type: note.type ?? ''
    })),
    existingQuestions: sortedQuestions
  });
  return `wp:${await hashString(raw)}`;
}

export function getCacheClient(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

export function buildCacheRequest(request: Request, cacheKey: string): Request {
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/cache/${encodeURIComponent(cacheKey)}`;
  return new Request(cacheUrl.toString());
}

export function withCacheHitResponse(cachedResponse: Response): Response {
  const response = new Response(cachedResponse.body, cachedResponse);
  response.headers.set('X-Cache', 'HIT');
  return response;
}

export function storeInCache(
  cache: Cache,
  cacheRequest: Request,
  response: Response,
  ctx?: ExecutionContext
): void {
  const responseToCache = response.clone();
  const putPromise = cache.put(cacheRequest, responseToCache);
  if (ctx?.waitUntil) {
    ctx.waitUntil(putPromise.catch(() => {
      // Ignore cache put errors
    }));
  } else {
    putPromise.catch(() => {
      // Ignore cache put errors
    });
  }
}
