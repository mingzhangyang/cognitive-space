import { hashString } from './utils';

export function getAnalyzeCacheKey(
  text: string,
  language: string,
  existingQuestions: Array<{ id: string; content: string }>
): string {
  const sortedQuestions = [...existingQuestions].sort((a, b) => a.id.localeCompare(b.id));
  const questionDigest = sortedQuestions
    .map((q) => `${q.id}:${q.content.length}:${hashString(q.content)}`)
    .join('|');
  const raw = `analyze:v3:${language}:text:${text.length}:${hashString(text)}:questions:${questionDigest}`;
  return `analyze:${hashString(raw)}`;
}

export function getWanderingPlanetCacheKey(
  language: string,
  maxClusters: number,
  notes: Array<{ id: string; content: string; type?: string }>,
  existingQuestions: Array<{ id: string; content: string }>
): string {
  const sortedNotes = [...notes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedQuestions = [...existingQuestions].sort((a, b) => a.id.localeCompare(b.id));

  const noteDigest = sortedNotes
    .map((note) => `${note.id}:${note.content.length}:${hashString(note.content)}:${note.type ?? ''}`)
    .join('|');
  const questionDigest = sortedQuestions
    .map((q) => `${q.id}:${q.content.length}:${hashString(q.content)}`)
    .join('|');

  const raw = `wandering-planet:v3:${language}:${maxClusters}:notes:${noteDigest}:questions:${questionDigest}`;
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
