import { useCallback, useState } from 'react';
import { Note } from '../../types';

interface WanderingPlanetSelectionOptions {
  sortedWanderingPlanet: Note[];
  onClearEditing: () => void;
}

export const useWanderingPlanetSelection = ({
  sortedWanderingPlanet,
  onClearEditing
}: WanderingPlanetSelectionOptions) => {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLinkOpen, setBatchLinkOpen] = useState(false);
  const [batchPromoteConfirm, setBatchPromoteConfirm] = useState(false);

  const exitSelectMode = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  }, []);

  const toggleSelectMode = useCallback(() => {
    if (isSelectMode) {
      exitSelectMode();
    } else {
      onClearEditing();
      setIsSelectMode(true);
    }
  }, [exitSelectMode, isSelectMode, onClearEditing]);

  const toggleSelect = useCallback((noteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === sortedWanderingPlanet.length
        ? new Set()
        : new Set(sortedWanderingPlanet.map((note) => note.id))
    );
  }, [sortedWanderingPlanet]);

  const handleBatchLink = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBatchLinkOpen(true);
  }, [selectedIds]);

  return {
    isSelectMode,
    selectedIds,
    batchLinkOpen,
    batchPromoteConfirm,
    setSelectedIds,
    setBatchLinkOpen,
    setBatchPromoteConfirm,
    toggleSelectMode,
    toggleSelect,
    toggleSelectAll,
    handleBatchLink,
    exitSelectMode
  };
};
