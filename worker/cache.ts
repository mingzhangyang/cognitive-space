import { hashString } from './utils';

export function getAnalyzeCacheKey(text: string, language: string, questionIds: string[]): string {
  const sortedIds = [...questionIds].sort().join(',');
  const raw = `analyze:v2:${language}:${sortedIds}:${text}`;
  return raw;
}

export function getWanderingPlanetCacheKey(
  language: string,
  maxClusters: number,
  notes: Array<{ id: string; content: string }>,
  existingQuestions: Array<{ id: string; content: string }>
): string {
  const sortedNotes = [...notes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedQuestions = [...existingQuestions].sort((a, b) => a.id.localeCompare(b.id));

  const noteDigest = sortedNotes
    .map((note) => `${note.id}:${note.content.length}:${hashString(note.content)}`)
    .join('|');
  const questionDigest = sortedQuestions
    .map((q) => `${q.id}:${q.content.length}:${hashString(q.content)}`)
    .join('|');

  const raw = `wandering-planet:v2:${language}:${maxClusters}:notes:${noteDigest}:questions:${questionDigest}`;
  return `wp:${hashString(raw)}`;
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

export function storeInCache(cache: Cache, cacheRequest: Request, response: Response): void {
  const responseToCache = response.clone();
  cache.put(cacheRequest, responseToCache).catch(() => {
    // Ignore cache put errors
  });
}
