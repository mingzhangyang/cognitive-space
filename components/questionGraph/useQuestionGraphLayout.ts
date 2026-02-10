import { useMemo } from 'react';
import { Note, NoteType } from '../../types';

export interface GraphNode {
  id: string;
  note: Note;
  x: number;
  y: number;
  radius: number;
  color: string;
  stroke: string;
}

interface GraphRingConfig {
  id: NoteType;
  label: string;
  list: Note[];
  radius: number;
  color: string;
  size: number;
}

export interface GraphLayout {
  centerX: number;
  centerY: number;
  minDim: number;
  baseRadius: number;
  ringGap: number;
  maxRadius: number;
  nodes: GraphNode[];
  rings: GraphRingConfig[];
}

export interface GraphPalette {
  question: string;
  claim: string;
  evidence: string;
  trigger: string;
  other: string;
  line: string;
  lineSoft: string;
  lineStrong: string;
  inner: string;
}

export interface GraphLegendItem {
  id: string;
  label: string;
  color: string;
}

interface GraphSize {
  width: number;
  height: number;
}

interface UseQuestionGraphLayoutArgs {
  theme: 'light' | 'dark';
  t: (key: string) => string;
  question: Note;
  notes: Note[];
  size: GraphSize;
}

export const useQuestionGraphLayout = ({
  theme,
  t,
  question,
  notes,
  size
}: UseQuestionGraphLayoutArgs) => {
  const idPrefix = useMemo(() => {
    const sanitized = String(question.id ?? '').replace(/[^a-zA-Z0-9]/g, '');
    return `qg-${sanitized.slice(0, 8) || 'graph'}`;
  }, [question.id]);

  const palette = useMemo<GraphPalette>(() => {
    const pick = (light: string, dark: string) =>
      theme === 'dark' ? `var(${dark})` : `var(${light})`;

    return {
      question: pick('--color-warning', '--color-warning-dark'),
      claim: pick('--color-note-claim', '--color-note-claim-dark'),
      evidence: pick('--color-note-evidence', '--color-note-evidence-dark'),
      trigger: pick('--color-note-trigger', '--color-note-trigger-dark'),
      other: pick('--color-muted-400', '--color-muted-500'),
      line: pick('--color-line', '--color-line-dark'),
      lineSoft: pick('--color-line-soft', '--color-line-dark'),
      lineStrong: pick('--color-line-muted', '--color-line-strong-dark'),
      inner: pick('--color-surface', '--color-surface-dark')
    };
  }, [theme]);

  const layout = useMemo<GraphLayout | null>(() => {
    if (!size.width || !size.height) return null;

    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const minDim = Math.min(size.width, size.height);
    const baseRadius = Math.max(90, minDim * 0.22);
    const ringGap = Math.max(55, minDim * 0.12);
    const maxRadius = minDim / 2 - 28;

    const claimNotes = notes.filter((note) => note.type === NoteType.CLAIM);
    const evidenceNotes = notes.filter((note) => note.type === NoteType.EVIDENCE);
    const triggerNotes = notes.filter((note) => note.type === NoteType.TRIGGER);
    const otherNotes = notes.filter(
      (note) =>
        ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(note.type)
    );

    const ringConfigs: GraphRingConfig[] = [
      {
        id: NoteType.CLAIM,
        label: t('type_claim'),
        list: claimNotes,
        radius: Math.min(baseRadius, maxRadius),
        color: palette.claim,
        size: 12
      },
      {
        id: NoteType.EVIDENCE,
        label: t('type_evidence'),
        list: evidenceNotes,
        radius: Math.min(baseRadius + ringGap, maxRadius),
        color: palette.evidence,
        size: 10
      },
      {
        id: NoteType.TRIGGER,
        label: t('type_trigger'),
        list: triggerNotes,
        radius: Math.min(baseRadius + ringGap * 2, maxRadius),
        color: palette.trigger,
        size: 9
      },
      {
        id: NoteType.UNCATEGORIZED,
        label: t('type_uncategorized'),
        list: otherNotes,
        radius: Math.min(baseRadius + ringGap * 3, maxRadius),
        color: palette.other,
        size: 8
      }
    ];

    const ringNodes: GraphNode[] = [];
    ringConfigs.forEach((ring, ringIndex) => {
      const count = ring.list.length;
      if (!count) return;
      const angleStep = (Math.PI * 2) / count;
      const startAngle = (Math.PI / 6) * ringIndex;
      ring.list.forEach((note, index) => {
        const angle = startAngle + angleStep * index;
        ringNodes.push({
          id: note.id,
          note,
          x: centerX + Math.cos(angle) * ring.radius,
          y: centerY + Math.sin(angle) * ring.radius,
          radius: ring.size,
          color: ring.color,
          stroke: palette.line
        });
      });
    });

    const questionNode: GraphNode = {
      id: question.id,
      note: question,
      x: centerX,
      y: centerY,
      radius: 18,
      color: palette.question,
      stroke: palette.line
    };

    return {
      centerX,
      centerY,
      minDim,
      baseRadius,
      ringGap,
      maxRadius,
      nodes: [questionNode, ...ringNodes],
      rings: ringConfigs
    };
  }, [notes, palette, question, size.height, size.width, t]);

  const legendItems = useMemo<GraphLegendItem[]>(() => {
    if (!layout) return [];
    return [
      { id: 'question', label: t('type_question'), color: palette.question },
      ...layout.rings
        .filter((ring) => ring.list.length > 0)
        .map((ring) => ({ id: ring.id, label: ring.label, color: ring.color }))
    ];
  }, [layout, palette.question, t]);

  return {
    idPrefix,
    palette,
    layout,
    legendItems,
    showLegend: notes.length > 0
  };
};
