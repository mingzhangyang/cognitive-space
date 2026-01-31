import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, NoteType } from '../types';

const DB_NAME = 'cognitive_space_db';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';

interface CognitiveSpaceDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-type': NoteType;
      'by-parent': string | null;
      'by-updated': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<CognitiveSpaceDB>> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<CognitiveSpaceDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        let store: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          store = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        } else {
          store = transaction.objectStore(STORE_NOTES);
        }

        if (!store.indexNames.contains('by-type')) {
          store.createIndex('by-type', 'type');
        }
        if (!store.indexNames.contains('by-parent')) {
          store.createIndex('by-parent', 'parentId');
        }
        if (!store.indexNames.contains('by-updated')) {
          store.createIndex('by-updated', 'updatedAt');
        }
      }
    });
  }

  return dbPromise;
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const db = await getDb();
    return await db.getAll(STORE_NOTES);
  } catch (e) {
    console.error("Failed to load notes", e);
    return [];
  }
};

export const saveNote = async (note: Note): Promise<void> => {
  const db = await getDb();
  await db.put(STORE_NOTES, note);
};

export const getQuestions = async (): Promise<Note[]> => {
  const db = await getDb();
  return await db.getAllFromIndex(STORE_NOTES, 'by-type', NoteType.QUESTION);
};

export const getRelatedNotes = async (questionId: string): Promise<Note[]> => {
  const db = await getDb();
  return await db.getAllFromIndex(STORE_NOTES, 'by-parent', questionId);
};

export const getNoteById = async (id: string): Promise<Note | undefined> => {
  const db = await getDb();
  return await db.get(STORE_NOTES, id);
};

export const createNoteObject = (content: string): Note => {
  return {
    id: crypto.randomUUID(),
    content,
    type: NoteType.UNCATEGORIZED, // Default, updated by AI later
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentId: null
  };
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction(STORE_NOTES, 'readwrite');
  const store = tx.store;

  await store.delete(noteId);
  const childKeys = await store.index('by-parent').getAllKeys(noteId);
  for (const key of childKeys) {
    await store.delete(key);
  }

  await tx.done;
};

export const updateNoteContent = async (noteId: string, newContent: string): Promise<void> => {
  const db = await getDb();
  const note = await db.get(STORE_NOTES, noteId);
  if (note) {
    note.content = newContent;
    note.updatedAt = Date.now();
    await db.put(STORE_NOTES, note);
  }
};
