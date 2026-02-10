import type { IDBPDatabase } from 'idb';
import { Note, NoteEvent, NoteType } from '../../types';
import { normalizeSubType } from '../../utils/subtypes';
import { withDb } from './db';
import { appendEvent, ensureProjection, markProjectionUpToDate } from './events';
import { emitNoteEvent } from './noteEvents';
import { STORE_NOTES } from './constants';
import { CognitiveSpaceDB } from './schema';

export interface DarkMatterPage {
  notes: Note[];
  nextCursor: number | null;
  hasMore: boolean;
}

export interface QuestionConstellationStats {
  questionId: string;
  relatedCount: number;
  claimCount: number;
  evidenceCount: number;
  triggerCount: number;
  lastUpdatedAt: number | null;
}

const touchNoteUpdatedAt = async (
  db: IDBPDatabase<CognitiveSpaceDB>,
  noteId: string
): Promise<void> => {
  const note = await db.get(STORE_NOTES, noteId);
  if (!note) return;
  const updatedAt = Date.now();
  const event: NoteEvent = {
    id: crypto.randomUUID(),
    type: 'NOTE_TOUCHED',
    createdAt: updatedAt,
    payload: { id: noteId, updatedAt }
  };
  await appendEvent(db, event);
  note.updatedAt = updatedAt;
  await db.put(STORE_NOTES, note);
  emitNoteEvent({ id: noteId, kind: 'touched' });
};

export const getNotes = async (): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      return await db.getAll(STORE_NOTES);
    },
    'Failed to load notes'
  );
};

export const saveNote = async (note: Note): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const event: NoteEvent = {
        id: crypto.randomUUID(),
        type: 'NOTE_CREATED',
        createdAt: note.createdAt,
        payload: { note }
      };
      await appendEvent(db, event);
      await db.put(STORE_NOTES, note);
      if (note.parentId) {
        await touchNoteUpdatedAt(db, note.parentId);
      }
      await markProjectionUpToDate(db);
      emitNoteEvent({ id: note.id, kind: 'created' });
    },
    'Failed to save note'
  );
};

export const getQuestions = async (): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      const questions = await db.getAllFromIndex(STORE_NOTES, 'by-type', NoteType.QUESTION);
      return questions.filter((note) => !note.parentId);
    },
    'Failed to load questions'
  );
};

export const getRelatedNotes = async (questionId: string): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      return await db.getAllFromIndex(STORE_NOTES, 'by-parent', questionId);
    },
    'Failed to load related notes'
  );
};

export const getNoteById = async (id: string): Promise<Note | undefined> => {
  return await withDb(
    undefined,
    async (db) => {
      await ensureProjection(db);
      return await db.get(STORE_NOTES, id);
    },
    'Failed to load note'
  );
};

export const createNoteObject = (content: string): Note => {
  return {
    id: crypto.randomUUID(),
    content,
    type: NoteType.UNCATEGORIZED,
    analysisPending: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: null
  };
};

export const deleteNote = async (noteId: string): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const childNotes = await db.getAllFromIndex(STORE_NOTES, 'by-parent', noteId);
      const idsToDelete = [noteId, ...childNotes.map((note) => note.id)];
      const deletedAt = Date.now();

      for (const id of idsToDelete) {
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_DELETED',
          createdAt: deletedAt,
          payload: { id }
        };
        await appendEvent(db, event);
      }

      const tx = db.transaction(STORE_NOTES, 'readwrite');
      for (const id of idsToDelete) {
        await tx.store.delete(id);
      }
      await tx.done;
      await markProjectionUpToDate(db);
      for (const id of idsToDelete) {
        emitNoteEvent({ id, kind: 'deleted' });
      }
    },
    'Failed to delete note'
  );
};

export const updateNoteContent = async (noteId: string, newContent: string): Promise<void> => {
  await withDb<void>(
    undefined,
    async (db) => {
      const note = await db.get(STORE_NOTES, noteId);
      if (note) {
        const updatedAt = Date.now();
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_UPDATED',
          createdAt: updatedAt,
          payload: { id: noteId, content: newContent, updatedAt }
        };
        await appendEvent(db, event);
        note.content = newContent;
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        if (note.parentId) {
          await touchNoteUpdatedAt(db, note.parentId);
        }
        await markProjectionUpToDate(db);
        emitNoteEvent({ id: noteId, kind: 'updated' });
      }
    },
    'Failed to update note content'
  );
};

export const updateNoteMeta = async (
  noteId: string,
  updates: Pick<
    Partial<Note>,
    'parentId' | 'type' | 'subType' | 'confidence' | 'confidenceLabel' | 'analysisPending'
  >
): Promise<void> => {
  const normalizedUpdates = {
    ...updates,
    ...(typeof updates.subType === 'string' ? { subType: normalizeSubType(updates.subType) } : {})
  };
  await withDb<void>(
    undefined,
    async (db) => {
      const note = await db.get(STORE_NOTES, noteId);
      if (note) {
        const updatedAt = Date.now();
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_META_UPDATED',
          createdAt: updatedAt,
          payload: { id: noteId, updates: normalizedUpdates, updatedAt }
        };
        await appendEvent(db, event);
        if (typeof normalizedUpdates.parentId !== 'undefined') note.parentId = normalizedUpdates.parentId;
        if (typeof normalizedUpdates.type !== 'undefined') note.type = normalizedUpdates.type;
        if (typeof normalizedUpdates.subType !== 'undefined') note.subType = normalizedUpdates.subType;
        if (typeof normalizedUpdates.confidence !== 'undefined') note.confidence = normalizedUpdates.confidence;
        if (typeof normalizedUpdates.confidenceLabel !== 'undefined') {
          note.confidenceLabel = normalizedUpdates.confidenceLabel;
        }
        if (typeof normalizedUpdates.analysisPending !== 'undefined') {
          note.analysisPending = normalizedUpdates.analysisPending;
        }
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        const newParentId =
          typeof normalizedUpdates.parentId !== 'undefined' ? normalizedUpdates.parentId : note.parentId;
        if (newParentId) {
          await touchNoteUpdatedAt(db, newParentId);
        }
        await markProjectionUpToDate(db);
        emitNoteEvent({ id: noteId, kind: 'meta_updated' });
      }
    },
    'Failed to update note metadata'
  );
};

export const demoteQuestion = async (
  questionId: string,
  targetType: NoteType,
  options?: { relinkQuestionId?: string | null; includeSelf?: boolean }
): Promise<void> => {
  if (targetType === NoteType.QUESTION) return;
  const relinkQuestionId = options?.relinkQuestionId ?? null;
  const includeSelf = options?.includeSelf ?? false;
  const nextParentId = relinkQuestionId ?? null;
  await withDb<void>(
    undefined,
    async (db) => {
      const relatedNotes = await db.getAllFromIndex(STORE_NOTES, 'by-parent', questionId);
      const allNotes: { id: string; updates: Pick<Partial<Note>, 'parentId' | 'type'> }[] = [
        { id: questionId, updates: { type: targetType, parentId: includeSelf ? nextParentId : null } },
        ...relatedNotes.map((n) => ({ id: n.id, updates: { parentId: nextParentId } }))
      ];
      for (const { id, updates } of allNotes) {
        const note = id === questionId ? await db.get(STORE_NOTES, id) : relatedNotes.find((n) => n.id === id);
        if (!note) continue;
        const updatedAt = Date.now();
        const event: NoteEvent = {
          id: crypto.randomUUID(),
          type: 'NOTE_META_UPDATED',
          createdAt: updatedAt,
          payload: { id, updates, updatedAt }
        };
        await appendEvent(db, event);
        if (typeof updates.parentId !== 'undefined') note.parentId = updates.parentId;
        if (typeof updates.type !== 'undefined') note.type = updates.type;
        note.updatedAt = updatedAt;
        await db.put(STORE_NOTES, note);
        if (note.parentId) {
          await touchNoteUpdatedAt(db, note.parentId);
        }
        emitNoteEvent({ id, kind: 'meta_updated' });
      }
      await markProjectionUpToDate(db);
    },
    'Failed to demote question'
  );
};

export const getDarkMatterPage = async (
  limit: number,
  cursorUpdatedAt?: number
): Promise<DarkMatterPage> => {
  return await withDb(
    { notes: [], nextCursor: null, hasMore: false },
    async (db) => {
      await ensureProjection(db);
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const index = tx.store.index('by-updated');
      const range = typeof cursorUpdatedAt === 'number'
        ? IDBKeyRange.upperBound(cursorUpdatedAt)
        : undefined;
      let cursor = await index.openCursor(range, 'prev');
      const notes: Note[] = [];
      let lastIncludedUpdatedAt: number | null = null;
      let hasMore = false;

      const isDarkMatterNote = (note: Note) =>
        note.type !== NoteType.QUESTION && (note.parentId === null || note.parentId === undefined);

      while (cursor) {
        if (isDarkMatterNote(cursor.value)) {
          notes.push(cursor.value);
          lastIncludedUpdatedAt = cursor.value.updatedAt;
          if (notes.length >= limit) {
            cursor = await cursor.continue();
            while (cursor) {
              if (isDarkMatterNote(cursor.value)) {
                hasMore = true;
                break;
              }
              cursor = await cursor.continue();
            }
            break;
          }
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return { notes, nextCursor: lastIncludedUpdatedAt, hasMore };
    },
    'Failed to load dark matter page'
  );
};

export const getDarkMatterCount = async (): Promise<number> => {
  return await withDb(
    0,
    async (db) => {
      await ensureProjection(db);
      const tx = db.transaction(STORE_NOTES, 'readonly');

      const totalCount = await tx.store.count();
      const withParentCount = await tx.store.index('by-parent').count();
      const orphanCount = totalCount - withParentCount;

      let orphanQuestions = 0;
      let cursor = await tx.store.index('by-type').openCursor(NoteType.QUESTION);
      while (cursor) {
        const note = cursor.value;
        if (note.parentId === null || note.parentId === undefined) {
          orphanQuestions++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return orphanCount - orphanQuestions;
    },
    'Failed to count dark matter'
  );
};

export const getDarkMatter = async (): Promise<Note[]> => {
  return await withDb(
    [],
    async (db) => {
      await ensureProjection(db);
      const allNotes = await db.getAll(STORE_NOTES);
      return allNotes.filter(
        (note) =>
          note.type !== NoteType.QUESTION &&
          (note.parentId === null || note.parentId === undefined)
      );
    },
    'Failed to load dark matter'
  );
};

export const getQuestionConstellationStats = async (
  questionId: string
): Promise<QuestionConstellationStats> => {
  return await withDb(
    {
      questionId,
      relatedCount: 0,
      claimCount: 0,
      evidenceCount: 0,
      triggerCount: 0,
      lastUpdatedAt: null
    },
    async (db) => {
      await ensureProjection(db);
      const related = await db.getAllFromIndex(STORE_NOTES, 'by-parent', questionId);
      const lastUpdatedAt = related.length
        ? Math.max(...related.map((note) => note.updatedAt))
        : null;

      return {
        questionId,
        relatedCount: related.length,
        claimCount: related.filter((note) => note.type === NoteType.CLAIM).length,
        evidenceCount: related.filter((note) => note.type === NoteType.EVIDENCE).length,
        triggerCount: related.filter((note) => note.type === NoteType.TRIGGER).length,
        lastUpdatedAt
      };
    },
    'Failed to load question constellation stats'
  );
};
