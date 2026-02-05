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

type DarkMatterAnalyzeRequest = {
  language?: 'en' | 'zh';
  notes?: Array<{
    id: string;
    content: string;
    type?: 'claim' | 'evidence' | 'trigger' | 'uncategorized';
    createdAt?: number;
  }>;
  existingQuestions?: Array<{ id: string; content: string }>;
  maxClusters?: number;
};

type DarkMatterSuggestion = {
  id: string;
  kind: 'new_question' | 'existing_question';
  title: string;
  existingQuestionId?: string;
  noteIds: string[];
  confidence: number;
  reasoning: string;
};

type DarkMatterAnalyzeResponse = {
  suggestions: DarkMatterSuggestion[];
};

const BIGMODEL_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_BIGMODEL_MODEL = 'glm-4.7-flash';
const API_TIMEOUT_MS = 15000; // 15 second timeout for AI requests
const CACHE_TTL_SECONDS = 3600; // Cache responses for 1 hour
const DARK_MATTER_MAX_CLUSTERS = 6;
const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.55;
const RELATION_CONFIDENCE_THRESHOLD = 0.7;
const DARK_MATTER_CONFIDENCE_THRESHOLD = 0.6;
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

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function getDarkMatterCacheKey(
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

  const raw = `dark-matter:${language}:${maxClusters}:notes:${noteDigest}:questions:${questionDigest}`;
  return `dm:${hashString(raw)}`;
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

    if (url.pathname === '/api/dark-matter/analyze') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }
      return handleDarkMatterAnalyze(request, env);
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

async function handleDarkMatterAnalyze(request: Request, env: Env): Promise<Response> {
  if (!env.BIGMODEL_API_KEY) {
    return jsonResponse({ error: 'BIGMODEL_API_KEY is not configured' }, 500);
  }

  let body: DarkMatterAnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const language = body.language === 'zh' ? 'zh' : 'en';
  const maxClustersRaw = typeof body.maxClusters === 'number' ? body.maxClusters : 5;
  const maxClusters = Math.max(1, Math.min(DARK_MATTER_MAX_CLUSTERS, Math.round(maxClustersRaw)));

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

  // Check cache first
  const cacheKey = getDarkMatterCacheKey(
    language,
    maxClusters,
    notes,
    existingQuestions.filter(
      (q): q is { id: string; content: string } => typeof q?.id === 'string' && typeof q?.content === 'string'
    )
  );
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = `/cache/${encodeURIComponent(cacheKey)}`;
  const cacheRequest = new Request(cacheUrl.toString());

  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    const response = new Response(cachedResponse.body, cachedResponse);
    response.headers.set('X-Cache', 'HIT');
    return response;
  }

  const prompt = buildDarkMatterPrompt(notes, existingQuestions, language, maxClusters);
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
    const normalized = normalizeDarkMatterResult(
      parsed,
      validNoteIds,
      validQuestionIds,
      questionTitleById,
      maxClusters
    );

    const jsonRes = jsonResponse(normalized, 200);
    jsonRes.headers.set('X-Cache', 'MISS');
    jsonRes.headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}`);

    const responseToCache = jsonRes.clone();
    cache.put(cacheRequest, responseToCache).catch(() => {
      // Ignore cache put errors
    });

    return jsonRes;
  } catch (error) {
    return jsonResponse({ suggestions: [] }, 200);
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
   - uncategorized: Ambiguous, mixed, or not clear enough to classify.
   Guardrail: Avoid forcing structure. If you are not confident, use 'uncategorized' with low confidence.

2. Connect: Determine if this text strongly overlaps with one of the Living Questions.
   - Only provide an ID if the overlap is strong (confidence >= 0.7).
   - Otherwise return null.

3. Confidence: Assign a confidence score (0.0 to 1.0) based on how clear the intent is.

${langInstruction}

Return JSON only with keys: classification, subType, confidence, relatedQuestionId, reasoning.
Classification must be one of: 'question', 'claim', 'evidence', 'trigger', 'uncategorized'.
Reasoning should be phrased as a suggestion so the user can decide whether to accept it.
`.trim();
}

function buildDarkMatterPrompt(
  notes: Array<{ id: string; content: string; type?: string; createdAt?: number }>,
  existingQuestions: Array<{ id: string; content: string }>,
  language: 'en' | 'zh',
  maxClusters: number
): string {
  const noteContext = notes
    .map((note) => {
      const type = note.type ? `type:${note.type}` : 'type:unknown';
      const preview = note.content.replace(/\s+/g, ' ').slice(0, 200);
      return `ID:${note.id} | ${type} | "${preview}"`;
    })
    .join('\n');

  const questionsContext = existingQuestions
    .map((q) => `ID:${q.id} | "${q.content.substring(0, 120)}..."`)
    .join('\n');

  const langInstruction =
    language === 'zh'
      ? "Return 'title' and 'reasoning' in Chinese (Simplified)."
      : "Return 'title' and 'reasoning' in English.";

  return `
You are a cognitive assistant. These are "dark matter" notes: they are unlinked fragments.

Your task: suggest gentle groupings only when semantic overlap is clear. If there are no strong groupings, return an empty list.

Constraints:
- Each note ID appears in at most one suggestion.
- Only include suggestions with 2 or more notes.
- Maximum suggestions: ${maxClusters}.
- If a suggestion matches an existing question, set kind="existing_question" and include existingQuestionId.
- If it's a new question proposal, set kind="new_question".
- Use only provided note IDs and question IDs.
- If you're not confident, do not suggest a grouping.

Dark Matter Notes:
${noteContext}

Existing Questions:
${questionsContext || 'No existing questions.'}

${langInstruction}

Return JSON only with this shape:
{
  "suggestions": [
    {
      "id": "s1",
      "kind": "new_question" | "existing_question",
      "title": "string",
      "existingQuestionId": "optional string when kind is existing_question",
      "noteIds": ["note-id-1", "note-id-2"],
      "confidence": 0.0-1.0,
      "reasoning": "short"
    }
  ]
}
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

  const shouldSuppressClassification = confidence < CLASSIFICATION_CONFIDENCE_THRESHOLD;
  const finalClassification = shouldSuppressClassification ? 'uncategorized' : classification;

  // Validate relatedQuestionId - only accept if it exists in the provided questions
  let relatedQuestionId: string | null = null;
  if (
    confidence >= RELATION_CONFIDENCE_THRESHOLD &&
    finalClassification !== 'trigger' &&
    finalClassification !== 'uncategorized' &&
    typeof input?.relatedQuestionId === 'string' &&
    input.relatedQuestionId
  ) {
    if (validQuestionIds.has(input.relatedQuestionId)) {
      relatedQuestionId = input.relatedQuestionId;
    }
    // If the AI returned an invalid ID, silently ignore it
  }

  const reasoning = typeof input?.reasoning === 'string' && input.reasoning.trim()
    ? input.reasoning
    : 'Analyzed by GLM';

  return {
    classification: finalClassification,
    subType:
      finalClassification === 'uncategorized'
        ? undefined
        : typeof input?.subType === 'string'
          ? input.subType
          : undefined,
    confidence,
    relatedQuestionId,
    reasoning
  };
}

export function normalizeDarkMatterResult(
  input: any,
  validNoteIds: Set<string>,
  validQuestionIds: Set<string>,
  questionTitleById: Map<string, string>,
  maxClusters: number
): DarkMatterAnalyzeResponse {
  const rawSuggestions = Array.isArray(input?.suggestions) ? input.suggestions : [];
  const suggestions: DarkMatterSuggestion[] = [];
  const usedNoteIds = new Set<string>();

  for (let i = 0; i < rawSuggestions.length; i++) {
    if (suggestions.length >= maxClusters) break;
    const suggestion = rawSuggestions[i];
    if (!suggestion) continue;

    const kindRaw = typeof suggestion.kind === 'string' ? suggestion.kind : '';
    const kind =
      kindRaw === 'new_question' || kindRaw === 'existing_question'
        ? (kindRaw as DarkMatterSuggestion['kind'])
        : null;
    if (!kind) continue;

    let existingQuestionId: string | undefined;
    if (kind === 'existing_question') {
      if (typeof suggestion.existingQuestionId === 'string' && validQuestionIds.has(suggestion.existingQuestionId)) {
        existingQuestionId = suggestion.existingQuestionId;
      } else {
        continue;
      }
    }

    const titleRaw = typeof suggestion.title === 'string' ? suggestion.title.trim() : '';
    const title = titleRaw || (existingQuestionId ? questionTitleById.get(existingQuestionId) || '' : '');
    if (!title) continue;

    const noteIdsRaw = Array.isArray(suggestion.noteIds) ? suggestion.noteIds : [];
    const uniqueNoteIds: string[] = [];
    const seenNoteIds = new Set<string>();
    for (const id of noteIdsRaw) {
      if (typeof id !== 'string') continue;
      if (seenNoteIds.has(id)) continue;
      seenNoteIds.add(id);
      uniqueNoteIds.push(id);
    }
    const filteredNoteIds = uniqueNoteIds.filter(
      (id) => validNoteIds.has(id) && !usedNoteIds.has(id)
    );
    if (filteredNoteIds.length < 2) continue;

    filteredNoteIds.forEach((id) => usedNoteIds.add(id));

    const confidenceRaw = typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.5;
    const confidence = Math.max(0, Math.min(1, confidenceRaw));
    if (confidence < DARK_MATTER_CONFIDENCE_THRESHOLD) continue;
    const reasoning =
      typeof suggestion.reasoning === 'string' && suggestion.reasoning.trim()
        ? suggestion.reasoning.trim()
        : 'Suggested by analysis.';

    const id =
      typeof suggestion.id === 'string' && suggestion.id.trim()
        ? suggestion.id.trim()
        : `s${suggestions.length + 1}`;

    suggestions.push({
      id,
      kind,
      title,
      existingQuestionId,
      noteIds: filteredNoteIds,
      confidence,
      reasoning
    });
  }

  return { suggestions };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
