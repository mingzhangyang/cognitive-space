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
  classification: 'question' | 'claim' | 'evidence' | 'trigger';
  subType?: string;
  confidence: number;
  relatedQuestionId?: string | null;
  reasoning: string;
};

const BIGMODEL_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEFAULT_BIGMODEL_MODEL = 'glm-4.5-flash';
const CLASSIFICATIONS = new Set<AnalyzeResponse['classification']>([
  'question',
  'claim',
  'evidence',
  'trigger'
]);

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

  const prompt = buildPrompt(text, existingQuestions, language);
  const model = env.BIGMODEL_MODEL || env.MODEL_ID || DEFAULT_BIGMODEL_MODEL;
  const baseUrl = env.BIGMODEL_BASE_URL || BIGMODEL_BASE_URL;

  try {
    const response = await fetch(baseUrl, {
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse({ error: 'GLM request failed', details: errorText }, 502);
    }

    const data = (await response.json()) as BigModelResponse;
    const rawText = extractBigModelText(data);
    const parsed = safeParseJson(rawText);
    const normalized = normalizeResult(parsed);

    return jsonResponse(normalized, 200);
  } catch (error) {
    return jsonResponse({ error: 'GLM request failed', details: String(error) }, 502);
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
   - question: An inquiry or problem statement.
     - Subtypes: 'exploratory' (broad/vague), 'specific' (targeted).
   - claim: A statement of belief, argument, or hypothesis.
     - Subtypes: 'hypothesis' (tentative), 'opinion' (subjective), 'conclusion' (derived).
   - evidence: Data or experience supporting/refuting a claim.
     - Subtypes: 'fact' (verifiable), 'observation' (personal), 'anecdote' (story), 'citation' (reference).
   - trigger: Raw input, inspiration, or fragments.
     - Subtypes: 'quote', 'feeling', 'idea'.

2. Connect: Determine if this text strongly overlaps with one of the Living Questions.
   - If yes, provide the ID (even if the text itself is a question).
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

function normalizeResult(input: any): AnalyzeResponse {
  const classificationRaw = typeof input?.classification === 'string'
    ? input.classification.toLowerCase()
    : '';
  const classification = CLASSIFICATIONS.has(classificationRaw as AnalyzeResponse['classification'])
    ? (classificationRaw as AnalyzeResponse['classification'])
    : 'trigger';

  const confidenceRaw = typeof input?.confidence === 'number' ? input.confidence : 0.5;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));

  const relatedQuestionId =
    typeof input?.relatedQuestionId === 'string' ? input.relatedQuestionId : null;

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
