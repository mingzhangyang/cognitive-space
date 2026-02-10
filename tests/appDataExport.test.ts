import { describe, expect, it } from 'vitest';
import { NoteType } from '../types';
import { parseAppDataExport } from '../services/storageService';

describe('parseAppDataExport', () => {
  const baseNote = {
    id: 'n1',
    content: 'Test note',
    type: NoteType.QUESTION,
    createdAt: 1,
    updatedAt: 1,
    parentId: null
  };

  const basePayload = (overrides: Partial<Record<string, unknown>> = {}) => ({
    version: 1,
    exportedAt: 2,
    db: { name: 'cognitive_space_db', version: 2 },
    notes: [baseNote],
    events: [
      {
        id: 'e1',
        type: 'NOTE_CREATED',
        createdAt: 1,
        payload: { note: baseNote }
      }
    ],
    meta: { lastEventAt: 1 },
    ...overrides
  });

  it('accepts a valid export payload', () => {
    const parsed = parseAppDataExport(basePayload());
    expect(parsed).not.toBeNull();
    expect(parsed?.notes.length).toBe(1);
  });

  it('rejects payloads with invalid notes', () => {
    const payload = basePayload({ notes: [{ id: 'bad' }], events: [], meta: {} });

    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid events', () => {
    const payload = basePayload({
      events: [
        {
          id: 'e1',
          type: 'NOTE_CREATED',
          createdAt: 1,
          payload: { note: { id: 'bad' } }
        }
      ],
      meta: {}
    });

    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('filters meta to numeric values', () => {
    const parsed = parseAppDataExport(basePayload({ meta: { lastEventAt: 2, bad: 'nope' } }));
    expect(parsed?.meta).toEqual({ lastEventAt: 2 });
  });

  it('accepts telemetry events', () => {
    const payload = basePayload({
      events: [
        {
          id: 'e1',
          type: 'NOTE_CREATED',
          createdAt: 1,
          payload: { note: baseNote }
        },
        {
          id: 'e2',
          type: 'AI_DARK_MATTER_ANALYSIS_REQUESTED',
          createdAt: 2,
          payload: { noteCount: 3, questionCount: 1 }
        },
        {
          id: 'e3',
          type: 'AI_DARK_MATTER_SUGGESTION_APPLIED',
          createdAt: 3,
          payload: { kind: 'new_question', noteCount: 2, suggestionId: 's1' }
        }
      ]
    });

    expect(parseAppDataExport(payload)).not.toBeNull();
  });

  it('rejects telemetry events with invalid payloads', () => {
    const payload = basePayload({
      events: [
        {
          id: 'e1',
          type: 'AI_DARK_MATTER_ANALYSIS_REQUESTED',
          createdAt: 2,
          payload: { noteCount: 'bad', questionCount: 1 }
        }
      ],
      notes: [],
      meta: {}
    });

    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid export version', () => {
    expect(parseAppDataExport(basePayload({ version: 2 }))).toBeNull();
  });

  it('rejects payloads with invalid db shape', () => {
    const payload = basePayload({ db: { name: 123, version: 'bad' } });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid note fields', () => {
    const payload = basePayload({
      notes: [
        {
          ...baseNote,
          parentId: 123
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with empty note ids', () => {
    const payload = basePayload({
      notes: [
        {
          ...baseNote,
          id: '   '
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with duplicate note ids', () => {
    const payload = basePayload({
      notes: [
        baseNote,
        {
          ...baseNote,
          content: 'Another',
          updatedAt: 2
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with duplicate event ids', () => {
    const payload = basePayload({
      events: [
        {
          id: 'e1',
          type: 'NOTE_CREATED',
          createdAt: 1,
          payload: { note: baseNote }
        },
        {
          id: 'e1',
          type: 'NOTE_TOUCHED',
          createdAt: 2,
          payload: { id: 'n1', updatedAt: 2 }
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid confidence label', () => {
    const payload = basePayload({
      notes: [
        {
          ...baseNote,
          confidenceLabel: 'sure'
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid analysisPending type', () => {
    const payload = basePayload({
      notes: [
        {
          ...baseNote,
          analysisPending: 'yes'
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid note type', () => {
    const payload = basePayload({
      notes: [
        {
          ...baseNote,
          type: 'bad'
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid note meta updates', () => {
    const payload = basePayload({
      events: [
        {
          id: 'e1',
          type: 'NOTE_META_UPDATED',
          createdAt: 1,
          payload: {
            id: 'n1',
            updates: { confidenceLabel: 'sure' },
            updatedAt: 1
          }
        }
      ]
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });

  it('rejects payloads with invalid telemetry kind', () => {
    const payload = basePayload({
      notes: [],
      events: [
        {
          id: 'e1',
          type: 'AI_DARK_MATTER_SUGGESTION_APPLIED',
          createdAt: 1,
          payload: { kind: 'maybe', noteCount: 2 }
        }
      ],
      meta: {}
    });
    expect(parseAppDataExport(payload)).toBeNull();
  });
});
