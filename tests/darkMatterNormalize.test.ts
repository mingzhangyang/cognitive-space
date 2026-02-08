import { describe, expect, it } from 'vitest';
import { normalizeDarkMatterResult } from '../worker';

describe('normalizeDarkMatterResult', () => {
  it('drops invalid notes and enforces minimum size', () => {
    const result = normalizeDarkMatterResult(
      {
        suggestions: [
          {
            id: 's1',
            kind: 'new_question',
            title: 'Focus habits',
            noteIds: ['n1', 'n2', 'bad'],
            confidenceLabel: 'likely',
            reasoning: 'Overlap'
          },
          {
            id: 's2',
            kind: 'new_question',
            title: 'Single note',
            noteIds: ['n3'],
            confidenceLabel: 'loose',
            reasoning: 'Too small'
          }
        ]
      },
      new Set(['n1', 'n2', 'n3']),
      new Set([]),
      new Map(),
      5
    );

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].noteIds).toEqual(['n1', 'n2']);
  });

  it('requires valid existing question id and fills title from map', () => {
    const result = normalizeDarkMatterResult(
      {
        suggestions: [
          {
            id: 's1',
            kind: 'existing_question',
            title: '',
            existingQuestionId: 'q1',
            noteIds: ['n1', 'n2'],
            confidenceLabel: 'likely',
            reasoning: 'Match'
          },
          {
            id: 's2',
            kind: 'existing_question',
            title: 'Invalid',
            existingQuestionId: 'q2',
            noteIds: ['n3', 'n4'],
            confidenceLabel: 'possible',
            reasoning: 'Bad id'
          }
        ]
      },
      new Set(['n1', 'n2', 'n3', 'n4']),
      new Set(['q1']),
      new Map([['q1', 'Existing Q']]),
      5
    );

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].title).toBe('Existing Q');
  });

  it('prevents notes from appearing in multiple suggestions', () => {
    const result = normalizeDarkMatterResult(
      {
        suggestions: [
          {
            id: 's1',
            kind: 'new_question',
            title: 'Cluster A',
            noteIds: ['n1', 'n2'],
            confidenceLabel: 'likely',
            reasoning: 'A'
          },
          {
            id: 's2',
            kind: 'new_question',
            title: 'Cluster B',
            noteIds: ['n2', 'n3'],
            confidenceLabel: 'likely',
            reasoning: 'B'
          }
        ]
      },
      new Set(['n1', 'n2', 'n3']),
      new Set([]),
      new Map(),
      5
    );

    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].noteIds).toEqual(['n1', 'n2']);
  });
});
