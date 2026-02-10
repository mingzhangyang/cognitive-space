import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDarkMatterCount, getDarkMatterPage, getQuestions } from '../../services/storageService';
import { Note } from '../../types';

export const useDarkMatterData = () => {
  const [darkMatter, setDarkMatter] = useState<Note[]>([]);
  const [darkMatterCount, setDarkMatterCount] = useState(0);
  const [questions, setQuestions] = useState<Note[]>([]);
  const [analysisNotes, setAnalysisNotes] = useState<Note[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const aiRevealThreshold = 4;
  const pageSize = 25;

  const noteById = useMemo(() => {
    const map = new Map<string, Note>();
    darkMatter.forEach((note) => map.set(note.id, note));
    analysisNotes.forEach((note) => {
      if (!map.has(note.id)) map.set(note.id, note);
    });
    return map;
  }, [darkMatter, analysisNotes]);

  const sortedDarkMatter = useMemo(() => {
    if (sortOrder === 'newest') return darkMatter;
    return [...darkMatter].sort((a, b) => a.createdAt - b.createdAt);
  }, [darkMatter, sortOrder]);

  const loadInitial = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const [page, qs, totalCount] = await Promise.all([
        getDarkMatterPage(pageSize),
        getQuestions(),
        getDarkMatterCount()
      ]);
      setDarkMatter(page.notes);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setDarkMatterCount(totalCount);
      setQuestions(qs.sort((a, b) => b.updatedAt - a.updatedAt));
    } finally {
      setIsLoadingMore(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || nextCursor === null) return;
    setIsLoadingMore(true);
    try {
      const page = await getDarkMatterPage(pageSize, nextCursor);
      setDarkMatter((prev) => {
        const existingIds = new Set(prev.map((note) => note.id));
        const merged = [...prev];
        for (const note of page.notes) {
          if (!existingIds.has(note.id)) merged.push(note);
        }
        return merged;
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor, pageSize]);

  const removeAnalysisNotes = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setAnalysisNotes((prev) => {
      if (prev.length === 0) return prev;
      const idSet = new Set(ids);
      return prev.filter((note) => !idSet.has(note.id));
    });
  }, []);

  const setQuestionsSorted = useCallback((nextQuestions: Note[]) => {
    setQuestions(nextQuestions.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const updateDarkMatterOptimistic = useCallback((noteId: string, content: string, updatedAt: number) => {
    setDarkMatter((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, content, updatedAt } : note))
    );
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    darkMatter,
    darkMatterCount,
    questions,
    analysisNotes,
    isLoadingMore,
    hasMore,
    sortOrder,
    noteById,
    sortedDarkMatter,
    aiRevealThreshold,
    loadInitial,
    loadMore,
    setAnalysisNotes,
    setQuestionsSorted,
    removeAnalysisNotes,
    updateDarkMatterOptimistic,
    toggleSortOrder
  };
};
