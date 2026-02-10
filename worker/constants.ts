import type { AnalyzeResponse } from './types';

export const BIGMODEL_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
export const DEFAULT_BIGMODEL_MODEL = 'glm-4.7-flashx';
export const API_TIMEOUT_MS = 45000; // 45 second timeout for AI requests
export const CACHE_TTL_SECONDS = 3600; // Cache responses for 1 hour
export const DARK_MATTER_MAX_CLUSTERS = 6;
export const CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.55;
export const RELATION_CONFIDENCE_THRESHOLD = 0.7;
export const DARK_MATTER_CONFIDENCE_THRESHOLD = 0.6;
export const CLASSIFICATIONS = new Set<AnalyzeResponse['classification']>([
  'question',
  'claim',
  'evidence',
  'trigger',
  'uncategorized'
]);
