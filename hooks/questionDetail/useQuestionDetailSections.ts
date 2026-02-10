import { useCallback, useRef, useState } from 'react';
import { Note } from '../../types';

export const useQuestionDetailSections = () => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [sectionOrder, setSectionOrder] = useState<Record<string, string[]>>({});
  const dragItem = useRef<{ noteId: string; sectionKey: string } | null>(null);
  const dragOverItem = useRef<{ noteId: string; sectionKey: string } | null>(null);

  const getOrderedNotes = useCallback((sectionKey: string, notes: Note[]): Note[] => {
    const order = sectionOrder[sectionKey];
    if (!order) return notes;
    const noteMap = new Map(notes.map((note) => [note.id, note]));
    const ordered: Note[] = [];
    for (const noteId of order) {
      const note = noteMap.get(noteId);
      if (note) {
        ordered.push(note);
        noteMap.delete(noteId);
      }
    }
    for (const note of noteMap.values()) ordered.push(note);
    return ordered;
  }, [sectionOrder]);

  const handleDragStart = useCallback((noteId: string, sectionKey: string) => {
    dragItem.current = { noteId, sectionKey };
  }, []);

  const handleDragEnter = useCallback((noteId: string, sectionKey: string) => {
    dragOverItem.current = { noteId, sectionKey };
  }, []);

  const handleDragEnd = useCallback((sectionKey: string, notes: Note[]) => {
    if (!dragItem.current || !dragOverItem.current) return;
    if (dragItem.current.sectionKey !== dragOverItem.current.sectionKey) return;
    const ordered = getOrderedNotes(sectionKey, notes).map((note) => note.id);
    const fromIndex = ordered.indexOf(dragItem.current.noteId);
    const toIndex = ordered.indexOf(dragOverItem.current.noteId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setSectionOrder((prev) => ({ ...prev, [sectionKey]: next }));
    dragItem.current = null;
    dragOverItem.current = null;
  }, [getOrderedNotes]);

  return {
    collapsedSections,
    sectionOrder,
    setSectionOrder,
    toggleSection,
    getOrderedNotes,
    handleDragStart,
    handleDragEnter,
    handleDragEnd
  };
};
