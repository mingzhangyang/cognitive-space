import { getNotes } from './storageService';
import { Language } from '../contexts/AppContext';
import { translations } from '../contexts/translations';
import { Note, NoteType } from '../types';

const SESSION_KEY_PREFIX = 'cs_footer_line_v1';
const USER_LINE_PROBABILITY = 0.3;
const MAX_USER_CANDIDATES = 24;
const MIN_WORDS = 4;
const MAX_WORDS = 20;
const MIN_ZH_CHARS = 6;
const MAX_ZH_CHARS = 40;
const MAX_COMMAs = 2;
const MAX_EXCLAMATIONS = 1;

const DEFAULT_LINES: Record<Language, string[]> = {
  en: [
    translations.en.footer_line_1,
    translations.en.footer_line_2,
    translations.en.footer_line_3,
    translations.en.footer_line_4,
    translations.en.footer_line_5,
    translations.en.footer_line_6,
    translations.en.footer_line_7,
    translations.en.footer_line_8,
    translations.en.footer_line_9,
    translations.en.footer_line_10,
  ],
  zh: [
    translations.zh.footer_line_1,
    translations.zh.footer_line_2,
    translations.zh.footer_line_3,
    translations.zh.footer_line_4,
    translations.zh.footer_line_5,
    translations.zh.footer_line_6,
    translations.zh.footer_line_7,
    translations.zh.footer_line_8,
    translations.zh.footer_line_9,
    translations.zh.footer_line_10,
  ]
};

const MEANING_WORDS = new Set([
  'meaning',
  'unfurl',
  'quiet',
  'becoming',
  'memory',
  'light',
  'time',
  'breath',
  'still',
  'trace',
  'echo',
  'root',
  'wonder',
  'pattern',
  'clarity',
  'sense',
  'question',
  'path',
  'center',
  'silence'
]);

const VERB_WORDS = new Set([
  'is',
  'are',
  'was',
  'be',
  'become',
  'becomes',
  'remain',
  'remains',
  'hold',
  'holds',
  'gather',
  'gathers',
  'unfurl',
  'unfurls'
]);

const ZH_MEANING_WORDS = [
  '意义',
  '纹理',
  '舒展',
  '安静',
  '静',
  '光',
  '时间',
  '呼吸',
  '回声',
  '根',
  '疑虑',
  '线索',
  '中心',
  '清晰',
  '耐心',
  '碎片',
  '路径',
  '沉默',
  '证据',
  '图样',
  '问题'
];

const ZH_VERB_WORDS = [
  '是',
  '成',
  '成为',
  '化为',
  '让',
  '使',
  '会',
  '将',
  '仍',
  '照亮',
  '聚拢',
  '倾斜',
  '显露'
];

const PROFANITY = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'dick',
  'cunt'
];

const urlPattern = /(https?:\/\/|www\.)/i;
const emailPattern = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const phonePattern = /\b\+?\d[\d\s\-()]{7,}\b/;
const cjkPattern = /[\u4e00-\u9fff]/;

const normalizeLine = (line: string): string => line.replace(/\s+/g, ' ').trim();

const countWords = (line: string): number => {
  const words = line.trim().split(/\s+/).filter(Boolean);
  return words.length;
};

const countZhChars = (line: string): number => {
  const chars = line.match(/[\u4e00-\u9fff]/g) ?? [];
  return chars.length;
};

const hasTooMuchPunctuation = (line: string): boolean => {
  const commaCount = (line.match(/[，,]/g) ?? []).length;
  const exclamationCount = (line.match(/[！!]/g) ?? []).length;
  if (commaCount > MAX_COMMAs) return true;
  if (exclamationCount > MAX_EXCLAMATIONS) return true;
  return false;
};

const hasBannedPattern = (line: string): boolean => {
  if (urlPattern.test(line)) return true;
  if (emailPattern.test(line)) return true;
  if (phonePattern.test(line)) return true;
  const lowered = line.toLowerCase();
  return PROFANITY.some((word) => lowered.includes(word));
};

const scoreCandidateEn = (line: string): number => {
  const words = line.toLowerCase().match(/[a-z']+/g) ?? [];
  let score = 0;
  if (words.some((word) => MEANING_WORDS.has(word))) score += 2;
  if (words.some((word) => VERB_WORDS.has(word))) score += 1;
  if (/\d/.test(line)) score -= 1;
  if ((line.match(/[，,]/g) ?? []).length > 1) score -= 1;
  if ((line.match(/[！!]/g) ?? []).length > 0) score -= 1;
  return score;
};

const scoreCandidateZh = (line: string): number => {
  let score = 0;
  if (ZH_MEANING_WORDS.some((word) => line.includes(word))) score += 2;
  if (ZH_VERB_WORDS.some((word) => line.includes(word))) score += 1;
  if (/\d/.test(line)) score -= 1;
  if ((line.match(/[，,]/g) ?? []).length > 1) score -= 1;
  if ((line.match(/[！!]/g) ?? []).length > 0) score -= 1;
  return score;
};

const isLikelyZh = (line: string): boolean => cjkPattern.test(line);

const isCandidateEligibleEn = (line: string): boolean => {
  if (!line) return false;
  if (isLikelyZh(line)) return false;
  const wordCount = countWords(line);
  if (wordCount < MIN_WORDS || wordCount > MAX_WORDS) return false;
  if (line.length > 140) return false;
  if (hasTooMuchPunctuation(line)) return false;
  if (hasBannedPattern(line)) return false;
  return scoreCandidateEn(line) >= 1;
};

const isCandidateEligibleZh = (line: string): boolean => {
  if (!line) return false;
  if (!isLikelyZh(line)) return false;
  const charCount = countZhChars(line);
  if (charCount < MIN_ZH_CHARS || charCount > MAX_ZH_CHARS) return false;
  if (hasTooMuchPunctuation(line)) return false;
  if (hasBannedPattern(line)) return false;
  return scoreCandidateZh(line) >= 2;
};

const isCandidateEligible = (line: string, language: Language): boolean => {
  return language === 'zh' ? isCandidateEligibleZh(line) : isCandidateEligibleEn(line);
};

const scoreCandidate = (line: string, language: Language): number => {
  return language === 'zh' ? scoreCandidateZh(line) : scoreCandidateEn(line);
};

const extractCandidateLines = (notes: Note[]): string[] => {
  const candidates: string[] = [];
  for (const note of notes) {
    const content = note.content?.trim();
    if (!content) continue;
    const matches = content.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [];
    for (const match of matches) {
      const line = normalizeLine(match);
      if (line) candidates.push(line);
    }
  }
  return candidates;
};

const sample = <T,>(items: T[]): T => {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
};

const buildUserPool = (notes: Note[], language: Language): string[] => {
  const eligibleNotes = notes.filter((note) => note.type !== NoteType.QUESTION);
  const seen = new Set<string>();
  const scored: Array<{ line: string; score: number }> = [];
  for (const line of extractCandidateLines(eligibleNotes)) {
    const normalized = normalizeLine(line);
    if (seen.has(normalized.toLowerCase())) continue;
    if (!isCandidateEligible(normalized, language)) continue;
    seen.add(normalized.toLowerCase());
    scored.push({ line: normalized, score: scoreCandidate(normalized, language) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_USER_CANDIDATES).map((item) => item.line);
};

const resolveFallback = (language: Language): string => {
  const defaults = DEFAULT_LINES[language];
  if (defaults && defaults.length > 0) return defaults[0];
  return DEFAULT_LINES.en[0];
};

export const getSessionFooterLine = async (language: Language): Promise<string> => {
  if (typeof window === 'undefined') return resolveFallback(language);
  const sessionKey = `${SESSION_KEY_PREFIX}_${language}`;
  const cached = window.sessionStorage.getItem(sessionKey);
  if (cached) return cached;

  const defaults = DEFAULT_LINES[language] ?? DEFAULT_LINES.en;
  let chosen = sample(defaults);

  try {
    const notes = await getNotes();
    const userPool = buildUserPool(notes, language);
    if (userPool.length > 0 && Math.random() < USER_LINE_PROBABILITY) {
      chosen = sample(userPool);
    }
  } catch (error) {
    console.warn('Footer line selection failed:', error);
  }

  window.sessionStorage.setItem(sessionKey, chosen);
  return chosen;
};
