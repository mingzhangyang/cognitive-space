import { describe, expect, it } from 'vitest';
import { normalizeResult } from '../worker';

describe('normalizeResult', () => {
  it('suppresses low-confidence classifications', () => {
    const result = normalizeResult(
      {
        classification: 'claim',
        confidenceLabel: 'loose',
        reasoning: 'low confidence'
      },
      new Set()
    );

    expect(result.classification).toBe('uncategorized');
    expect(result.subType).toBeUndefined();
  });

  it('drops invalid relatedQuestionId', () => {
    const result = normalizeResult(
      {
        classification: 'claim',
        confidenceLabel: 'likely',
        relatedQuestionId: 'q2'
      },
      new Set(['q1'])
    );

    expect(result.relatedQuestionId).toBeNull();
  });

  it('coerces numeric confidence into labels', () => {
    const result = normalizeResult(
      {
        classification: 'evidence',
        confidence: 0.8
      },
      new Set()
    );

    expect(result.confidenceLabel).toBe('likely');
  });

  it('defaults to uncategorized on malformed input', () => {
    const result = normalizeResult('not-json', new Set(['q1']));

    expect(result.classification).toBe('uncategorized');
    expect(result.relatedQuestionId).toBeNull();
  });

  it('trims relatedQuestionId before validation', () => {
    const result = normalizeResult(
      {
        classification: 'claim',
        confidenceLabel: 'likely',
        relatedQuestionId: '  q1  '
      },
      new Set(['q1'])
    );

    expect(result.relatedQuestionId).toBe('q1');
  });
});
