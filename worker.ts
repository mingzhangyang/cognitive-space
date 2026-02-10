import type { Env } from './worker/types';
import { handleAnalyze } from './worker/handlers/analyze';
import { handleDarkMatterAnalyze } from './worker/handlers/darkMatter';

export { normalizeDarkMatterResult, normalizeResult } from './worker/normalize';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/analyze') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleAnalyze(request, env);
    }

    if (url.pathname === '/api/dark-matter/analyze') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleDarkMatterAnalyze(request, env);
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;

      const acceptsHtml = request.headers.get('Accept')?.includes('text/html');
      if (request.method === 'GET' && acceptsHtml) {
        const indexUrl = new URL('/index.html', url);
        return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }

      return assetResponse;
    }

    return new Response('Not Found', { status: 404 });
  }
} satisfies ExportedHandler<Env>;
