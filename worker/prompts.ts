import type { AnalyzeResponse, Language } from './types';

export function buildPrompt(
  text: string,
  existingQuestions: Array<{ id: string; content: string }>,
  language: Language
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
     - Subtypes: 'hypothesis' (tentative), 'opinion' (subjective), 'conclusion' (derived),
       'assumption' (premise), 'principle' (rule), 'prediction' (future), 'preference' (personal),
       'diagnosis' (interpretation), 'proposal' (advocacy).
   - evidence: Data or experience supporting/refuting a claim.
     - Subtypes: 'fact' (verifiable), 'observation' (personal), 'anecdote' (story), 'citation' (reference),
       'statistic' (quantitative), 'log' (record), 'case' (example).
   - trigger: Raw input, inspiration, fragments, or simple notes that don't fit above categories.
     - Subtypes: 'quote' (line), 'feeling' (emotion), 'idea' (rough thought), 'note' (misc),
       'inspiration' (creative spark), 'image' (visual), 'memory' (recollection), 'task' (simple to-do),
       'fragment' (fragment), 'material' (raw material), 'metaphor' (metaphor), 'scene' (scene).
   - uncategorized: Ambiguous, mixed, or not clear enough to classify.
   Guardrail: Avoid forcing structure. If you are not confident, use 'uncategorized' with confidenceLabel="loose".

2. Connect: Determine if this text strongly overlaps with one of the Living Questions.
   - Only provide an ID if the overlap is strong and confidenceLabel="likely".
   - Otherwise return null.

3. ConfidenceLabel: Choose one of "likely", "possible", "loose" based on how clear the intent is.

${langInstruction}

Return JSON only with keys: classification, subType, confidenceLabel, relatedQuestionId, reasoning.
Classification must be one of: 'question', 'claim', 'evidence', 'trigger', 'uncategorized'.
Reasoning should be phrased as a suggestion so the user can decide whether to accept it.
`.trim();
}

export function buildWanderingPlanetPrompt(
  notes: Array<{ id: string; content: string; type?: string; createdAt?: number }>,
  existingQuestions: Array<{ id: string; content: string }>,
  language: Language,
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
You are a cognitive assistant. These are "Wandering Planet" notes: they are unlinked fragments.

Your task: suggest gentle groupings only when semantic overlap is clear. If there are no strong groupings, return an empty list.

Constraints:
- Each note ID appears in at most one suggestion.
- Only include suggestions with 2 or more notes.
- Maximum suggestions: ${maxClusters}.
- If a suggestion matches an existing question, set kind="existing_question" and include existingQuestionId.
- If it's a new question proposal, set kind="new_question".
- Use only provided note IDs and question IDs.
- If you're not confident, do not suggest a grouping.

Wandering Planet Notes:
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
      "confidenceLabel": "likely" | "possible" | "loose",
      "reasoning": "short"
    }
  ]
}
`.trim();
}

export function heuristicClassify(text: string): AnalyzeResponse {
  const trimmed = text.trim();

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
      confidenceLabel: 'possible',
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
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  const claimPrediction = /^(i (will|am going to)|it (will|would) |likely |probably |预测|预判|可能会|将会)/i.test(trimmed);
  if (claimPrediction) {
    return {
      classification: 'claim',
      subType: 'prediction',
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  const claimPreference = /^(i (prefer|like|dislike|would rather)|my preference|我(更喜欢|更倾向|偏好|不喜欢))/i.test(trimmed);
  if (claimPreference) {
    return {
      classification: 'claim',
      subType: 'preference',
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  const claimProposal = /^(we should|we need to|let's|i suggest|建议|应该|不如|可以先)/i.test(trimmed);
  if (claimProposal) {
    return {
      classification: 'claim',
      subType: 'proposal',
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  const claimAssumption = /^(assume|suppose|assuming|if we assume|前提是|假定)/i.test(trimmed);
  if (claimAssumption) {
    return {
      classification: 'claim',
      subType: 'assumption',
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  const claimPrinciple = /^(principle|rule|准则|原则|规律)/i.test(trimmed);
  if (claimPrinciple) {
    return {
      classification: 'claim',
      subType: 'principle',
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  const claimDiagnosis = /^(this means|this indicates|this suggests|this implies|原因是|这说明|这表明|意味着)/i.test(trimmed);
  if (claimDiagnosis) {
    return {
      classification: 'claim',
      subType: 'diagnosis',
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  // Evidence patterns - facts, data, citations
  const evidencePatterns = /^(according to|research shows|studies (show|suggest)|data (shows|indicates)|i (read|heard|saw|noticed)|".*".*said|[0-9]+%|根据|研究表明|数据显示)/i.test(trimmed);
  if (evidencePatterns) {
    const evidenceStatistic = /([0-9]+%|statistic|statistics|统计)/i.test(trimmed);
    const evidenceLog = /(log|logs|日志|记录)/i.test(trimmed);
    const evidenceCase = /(case study|case|案例|个案)/i.test(trimmed);
    let subType: string = 'observation';
    if (evidenceStatistic) subType = 'statistic';
    else if (evidenceLog) subType = 'log';
    else if (evidenceCase) subType = 'case';
    return {
      classification: 'evidence',
      subType,
      confidenceLabel: 'possible',
      relatedQuestionId: null,
      reasoning: 'Classified by heuristic pattern matching (AI unavailable).'
    };
  }

  // Default to trigger for fragments
  return {
    classification: 'trigger',
    subType: 'idea',
    confidenceLabel: 'loose',
    relatedQuestionId: null,
    reasoning: 'Classified as trigger by default (AI unavailable).'
  };
}
