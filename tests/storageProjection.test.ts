import { describe, expect, it } from 'vitest';
import { projectNotesFromEvents } from '../services/storage/events';
import { NoteType, type AppEvent } from '../types';

describe('projectNotesFromEvents', () => {
  it('applies note events in order', () => {
    const note1 = {
      id: 'n1',
      content: 'Initial',
      type: NoteType.TRIGGER,
      createdAt: 1,
      updatedAt: 1,
      parentId: null
    };
    const note2 = {
      id: 'n2',
      content: 'Second',
      type: NoteType.EVIDENCE,
      createdAt: 2,
      updatedAt: 2,
      parentId: null
    };

    const events = [
      { id: 'e1', type: 'NOTE_CREATED', createdAt: 1, payload: { note: note1 } },
      { id: 'e2', type: 'NOTE_CREATED', createdAt: 2, payload: { note: note2 } },
      { id: 'e3', type: 'NOTE_UPDATED', createdAt: 3, payload: { id: 'n1', content: 'Updated', updatedAt: 3 } },
      {
        id: 'e4',
        type: 'NOTE_META_UPDATED',
        createdAt: 4,
        payload: {
          id: 'n2',
          updates: { type: NoteType.CLAIM, analysisPending: true },
          updatedAt: 4
        }
      },
      { id: 'e5', type: 'NOTE_TOUCHED', createdAt: 5, payload: { id: 'n1', updatedAt: 5 } },
      { id: 'e6', type: 'NOTE_DELETED', createdAt: 6, payload: { id: 'n1' } }
    ] satisfies AppEvent[];

    const projected = projectNotesFromEvents(events);
    expect(projected).toHaveLength(1);
    expect(projected[0].id).toBe('n2');
    expect(projected[0].type).toBe(NoteType.CLAIM);
    expect(projected[0].analysisPending).toBe(true);
    expect(projected[0].updatedAt).toBe(4);
  });
});
