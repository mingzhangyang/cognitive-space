import { describe, expect, it } from 'vitest';
import { normalizeEventSubTypeInPlace, normalizeNoteSubTypeInPlace } from '../services/storage/normalize';
import { NoteType } from '../types';

describe('subType normalization', () => {
  it('normalizes note subType aliases', () => {
    const note = {
      id: 'n1',
      content: 'Test',
      type: NoteType.CLAIM,
      createdAt: 1,
      updatedAt: 1,
      parentId: null,
      subType: '观点'
    };

    const changed = normalizeNoteSubTypeInPlace(note);
    expect(changed).toBe(true);
    expect(note.subType).toBe('opinion');
  });

  it('normalizes event subType updates', () => {
    const event = {
      id: 'e1',
      type: 'NOTE_META_UPDATED',
      createdAt: 1,
      payload: {
        id: 'n1',
        updates: { subType: '结论' },
        updatedAt: 1
      }
    } as const;

    const changed = normalizeEventSubTypeInPlace(event);
    expect(changed).toBe(true);
    expect(event.payload.updates.subType).toBe('conclusion');
  });
});
