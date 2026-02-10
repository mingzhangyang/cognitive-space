import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWanderingPlanetCount, getWanderingPlanetPage, getQuestions } from '../../services/storageService';
import { Note } from '../../types';

export const useWanderingPlanetData = () => {
  const [wanderingPlanet, setWanderingPlanet] = useState<Note[]>([]);
  const [wanderingPlanetCount, setWanderingPlanetCount] = useState(0);
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
    wanderingPlanet.forEach((note) => map.set(note.id, note));
    analysisNotes.forEach((note) => {
      if (!map.has(note.id)) map.set(note.id, note);
    });
    return map;
  }, [wanderingPlanet, analysisNotes]);

  const sortedWanderingPlanet = useMemo(() => {
    if (sortOrder === 'newest') return wanderingPlanet;
    return [...wanderingPlanet].sort((a, b) => a.createdAt - b.createdAt);
  }, [wanderingPlanet, sortOrder]);

  const loadInitial = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const [page, qs, totalCount] = await Promise.all([
        getWanderingPlanetPage(pageSize),
        getQuestions(),
        getWanderingPlanetCount()
      ]);
      setWanderingPlanet(page.notes);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setWanderingPlanetCount(totalCount);
      setQuestions(qs.sort((a, b) => b.updatedAt - a.updatedAt));
    } finally {
      setIsLoadingMore(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || nextCursor === null) return;
    setIsLoadingMore(true);
    try {
      const page = await getWanderingPlanetPage(pageSize, nextCursor);
      setWanderingPlanet((prev) => {
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

  const updateWanderingPlanetOptimistic = useCallback((noteId: string, content: string, updatedAt: number) => {
    setWanderingPlanet((prev) =>
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
    wanderingPlanet,
    wanderingPlanetCount,
    questions,
    analysisNotes,
    isLoadingMore,
    hasMore,
    sortOrder,
    noteById,
    sortedWanderingPlanet,
    aiRevealThreshold,
    loadInitial,
    loadMore,
    setAnalysisNotes,
    setQuestionsSorted,
    removeAnalysisNotes,
    updateWanderingPlanetOptimistic,
    toggleSortOrder
  };
};
