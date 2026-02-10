import { describe, expect, it } from 'vitest';
import { NoteType } from '../types';
import { parseAppDataExport } from '../services/storageService';

describe('parseAppDataExport', () => {
  it('accepts a valid export payload', () => {
    const note = {
      id: 'n1',
      content: 'Test note',
      type: NoteType.QUESTION,
      createdAt: 1,
      updatedAt: 1,
      parentId: null
    };

    const payload = {
      version: 1,
      exportedAt: 2,
      db: { name: 'cognitive_space_db', version: 2 },
      notes: [note],
      events: [
        {
          id: 'e1',
          type: 'NOTE_CREATED',
          createdAt: 1,
          payload: { note }
        }
      ],
      meta: { lastEventAt: 1 }
    };

    const parsed = parseAppDataExport(payload);
    expect(parsed).not.toBeNull();
    expect(parsed?.notes.length).toBe(1);
  });

  it('rejects payloads with invalid notes', () => {
    const payload = {
      version: 1,
      exportedAt: 2,
      db: { name: 'cognitive_space_db', version: 2 },
      notes: [{ id: 'bad' }],
      events: [],
      meta: {}
    };

    expect(parseAppDataExport(payload)).toBeNull();
  });
});
