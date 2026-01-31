import { Note, NoteType } from '../types';

const STORAGE_KEY = 'cognitive_space_v1';

export const getNotes = (): Note[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load notes", e);
    return [];
  }
};

export const saveNote = (note: Note): void => {
  const notes = getNotes();
  const existingIndex = notes.findIndex(n => n.id === note.id);

  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

export const getQuestions = (): Note[] => {
  return getNotes().filter(n => n.type === NoteType.QUESTION);
};

export const getRelatedNotes = (questionId: string): Note[] => {
  return getNotes().filter(n => n.parentId === questionId);
};

export const getNoteById = (id: string): Note | undefined => {
  return getNotes().find(n => n.id === id);
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

export const deleteNote = (noteId: string): void => {
  const notes = getNotes();
  // Filter out the note itself
  let remaining = notes.filter(n => n.id !== noteId);
  // If the deleted note was a question, also remove orphaned children
  remaining = remaining.filter(n => n.parentId !== noteId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
};

export const updateNoteContent = (noteId: string, newContent: string): void => {
  const notes = getNotes();
  const note = notes.find(n => n.id === noteId);
  if (note) {
    note.content = newContent;
    note.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }
};