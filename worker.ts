import type { Env } from './worker/types';
import { handleAnalyze } from './worker/handlers/analyze';
import { handleWanderingPlanetAnalyze } from './worker/handlers/wanderingPlanet';

export { normalizeWanderingPlanetResult, normalizeResult } from './worker/normalize';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
      return handleAnalyze(request, env, ctx);
    }

    if (url.pathname === '/api/wandering-planet/analyze') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleWanderingPlanetAnalyze(request, env, ctx);
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
