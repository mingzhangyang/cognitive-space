interface Env {
  BIGMODEL_API_KEY: string;
  BIGMODEL_MODEL?: string;
  MODEL_ID?: string;
  BIGMODEL_BASE_URL?: string;
  ASSETS: Fetcher;
}

type AnalyzeRequest = {
  text?: string;
  language?: 'en' | 'zh';
  existingQuestions?: Array<{ id: string; content: string }>;
};

type AnalyzeResponse = {
  classification: 'question' | 'claim' | 'evidence' | 'trigger' | 'uncategorized';
  subType?: string;
  confidence: number;
  relatedQuestionId?: string | null;
  reasoning: string;
};

const BIGMODEL_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_BIGMODEL_MODEL = 'glm-4.5-flash';
const API_TIMEOUT_MS = 15000; // 15 second timeout for AI requests
const CACHE_TTL_SECONDS = 3600; // Cache responses for 1 hour
const CLASSIFICATIONS = new Set<AnalyzeResponse['classification']>([
  'question',
  'claim',
  'evidence',
  'trigger',
  'uncategorized'
]);

/**
 * Generate a cache key from the analysis request
 */
function getCacheKey(text: string, language: string, questionIds: string[]): string {
  // Sort question IDs for consistent cache keys
  const sortedIds = [...questionIds].sort().join(',');
  // Simple hash-like key (for Cloudflare Cache API)
  const raw = `analyze:${language}:${sortedIds}:${text}`;
  return raw;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/analyze') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }
      return handleAnalyze(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
} satisfies ExportedHandler<Env>;

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
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
  const questionIds = existingQuestions.map(q => q.id);

  // Check cache first (Cloudflare Workers Cache API)
  const cacheKey = getCacheKey(text, language, questionIds);
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/cache/${encodeURIComponent(cacheKey)}`;
  const cacheRequest = new Request(cacheUrl.toString());
  
  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    // Return cached response with cache hit header
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set('X-Cache', 'HIT');
    return response;
  }

  const prompt = buildPrompt(text, existingQuestions, language);
  const model = env.BIGMODEL_MODEL || env.MODEL_ID || DEFAULT_BIGMODEL_MODEL;
  const baseUrl = env.BIGMODEL_BASE_URL || BIGMODEL_BASE_URL;

  // Collect valid question IDs for validation
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

    // Cache the successful response
    const jsonRes = jsonResponse(normalized, 200);
    jsonRes.headers.set('X-Cache', 'MISS');
    jsonRes.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);
    
    // Store in cache (non-blocking)
    const responseToCache = jsonRes.clone();
    cache.put(cacheRequest, responseToCache).catch(() => {
      // Ignore cache put errors
    });

    return jsonRes;
  } catch (error) {
    // AI failed - use heuristic fallback
    const fallback = heuristicClassify(text);
    return jsonResponse(fallback, 200);
  }
}

function buildPrompt(
  text: string,
  existingQuestions: Array<{ id: string; content: string }>,
  language: 'en' | 'zh'
): string {
  const questionsContext = existingQuestions
    .map((q) => `ID: ${q.id} | Content: "${q.content.substring(0, 100)}..."`)
    .join('\n');

  const langInstruction =
    language === 'zh'
      ? "Provide the 'reasoning' and 'subType' in Chinese (Simplified)."
      : "Provide the 'reasoning' and 'subType' in English.";

  return `
You are a cognitive assistant helping to externalize thought.

Here is a new piece of text written by the user:
"${text}"

Here is a list of "Living Questions" the user is currently pondering:
${questionsContext || 'No existing questions.'}

Your task is to analyze the cognitive role of this text.

1. Classify the text (use lowercase labels):
   - question: A "gravity center" - something that occupies mental space and attracts related thoughts.
     This includes but is NOT limited to literal questions. Recognize these as 'question':
       • Inquiries: "Why does X happen?", "What is the meaning of...?"
       • Goals/Aspirations: "I want to learn Japanese", "I hope to become..."
       • Concerns/Worries: "I'm worried about my health", "What if I fail?"
       • Open pursuits: "Building a personal knowledge system", "Exploring minimalism"
       • Dilemmas: "Should I change careers?", "Stay or leave?"
       • Life themes: "Finding balance", "Understanding myself better"
     Key criterion: Does this represent an OPEN-ENDED pursuit that could attract related thoughts over time?
     (Note: Simple tasks like "buy milk" are NOT questions - they are triggers at best.)
     - Subtypes: 'exploratory' (broad/vague), 'specific' (targeted), 'goal' (aspiration), 'concern' (worry), 'dilemma' (choice).
   - claim: A statement of belief, argument, or hypothesis - a position the user has taken.
     - Subtypes: 'hypothesis' (tentative), 'opinion' (subjective), 'conclusion' (derived).
   - evidence: Data or experience supporting/refuting a claim.
     - Subtypes: 'fact' (verifiable), 'observation' (personal), 'anecdote' (story), 'citation' (reference).
   - trigger: Raw input, inspiration, fragments, or simple notes that don't fit above categories.
     - Subtypes: 'quote', 'feeling', 'idea', 'note'.

2. Connect: Determine if this text strongly overlaps with one of the Living Questions.
   - If yes, provide the ID (even if the text itself is a question - it might be a sub-question or rephrasing).
   - If it's a new topic entirely, return null.

3. Confidence: Assign a confidence score (0.0 to 1.0) based on how clear the intent is.

${langInstruction}

Return JSON only with keys: classification, subType, confidence, relatedQuestionId, reasoning.
Classification must be one of: 'question', 'claim', 'evidence', 'trigger'.
`.trim();
}

interface BigModelResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<string | { text?: string }>;
    };
  }>;
  error?: string | { message?: string };
}

function extractBigModelText(data: BigModelResponse | null): string {
  if (!data) return '';
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function safeParseJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * Heuristic classification when AI is unavailable
 */
function heuristicClassify(text: string): AnalyzeResponse {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  
  // Question patterns
  const endsWithQuestion = trimmed.endsWith('?');
  const startsWithQuestionWord = /^(what|why|how|when|where|who|which|is|are|do|does|can|could|should|would|will)/i.test(trimmed);
  const hasGoalPattern = /^i (want|need|hope|wish|plan|intend|aim|aspire) to/i.test(trimmed);
  const hasWorryPattern = /^i('m| am) (worried|concerned|anxious|unsure|confused) about/i.test(trimmed);
  const zhQuestionPattern = /[？吗呢么]$/.test(trimmed) || /^(为什么|怎么|如何|什么|哪|谁|是否)/.test(trimmed);
  const zhGoalPattern = /^我(想|要|希望|打算|计划)/.test(trimmed);
  const zhWorryPattern = /^我(担心|担忧|害怕|纠结|困惑)/.test(trimmed);
  
  if (endsWithQuestion || startsWithQuestionWord || hasGoalPattern || hasWorryPattern || zhQuestionPattern || zhGoalPattern || zhWorryPattern) {
    let subType = 'exploratory';
    if (hasGoalPattern || zhGoalPattern) subType = 'goal';
    else if (hasWorryPattern || zhWorryPattern) subType = 'concern';
    else if (endsWithQuestion || zhQuestionPattern) subType = 'specific';
    
    return {
      classification: 'question',
      subType,
      confidence: 0.6,
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }
  
  // Claim patterns - statements of belief
  const claimPatterns = /^(i (think|believe|feel|argue|conclude)|in my (view|opinion)|it seems|clearly|obviously|therefore|thus|我(认为|觉得|相信)|显然|因此)/i.test(trimmed);
  if (claimPatterns) {
    return {
      classification: 'claim',
      subType: 'opinion',
      confidence: 0.5,
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }
  
  // Evidence patterns - facts, data, citations
  const evidencePatterns = /^(according to|research shows|studies (show|suggest)|data (shows|indicates)|i (read|heard|saw|noticed)|".*".*said|[0-9]+%|根据|研究表明|数据显示)/i.test(trimmed);
  if (evidencePatterns) {
    return {
      classification: 'evidence',
      subType: 'observation',
      confidence: 0.5,
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }
  
  // Default to trigger for fragments
  return {
    classification: 'trigger',
    subType: 'idea',
    confidence: 0.3,
    relatedQuestionId: null,
    reasoning: 'Classified as trigger by default (AI unavailable).'
  };
}

function normalizeResult(input: any, validQuestionIds: Set<string>): AnalyzeResponse {
  const classificationRaw = typeof input?.classification === 'string'
    ? input.classification.toLowerCase()
    : '';
  const classification = CLASSIFICATIONS.has(classificationRaw as AnalyzeResponse['classification'])
    ? (classificationRaw as AnalyzeResponse['classification'])
    : 'trigger';

  const confidenceRaw = typeof input?.confidence === 'number' ? input.confidence : 0.5;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));

  // Validate relatedQuestionId - only accept if it exists in the provided questions
  let relatedQuestionId: string | null = null;
  if (typeof input?.relatedQuestionId === 'string' && input.relatedQuestionId) {
    if (validQuestionIds.has(input.relatedQuestionId)) {
      relatedQuestionId = input.relatedQuestionId;
    }
    // If the AI returned an invalid ID, silently ignore it
  }

  const reasoning = typeof input?.reasoning === 'string' && input.reasoning.trim()
    ? input.reasoning
    : 'Analyzed by GLM';

  return {
    classification,
    subType: typeof input?.subType === 'string' ? input.subType : undefined,
    confidence,
    relatedQuestionId,
    reasoning
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
