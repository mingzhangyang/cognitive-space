import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { CrosshairIcon, MinusIcon, PlusIcon } from './Icons';
import IconButton from './IconButton';

interface QuestionGraphProps {
  question: Note;
  notes: Note[];
  selectedNoteId?: string | null;
  onSelectNote?: (note: Note) => void;
}

interface GraphNode {
  id: string;
  note: Note;
  x: number;
  y: number;
  radius: number;
  color: string;
  stroke: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const QuestionGraph: React.FC<QuestionGraphProps> = ({
  question,
  notes,
  selectedNoteId,
  onSelectNote
}) => {
  const { t, theme } = useAppContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pointerStateRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    viewX: 0,
    viewY: 0,
    dragged: false,
    startedOnNode: false
  });
  const pressedNodeIdRef = useRef<string | null>(null);

  const idPrefix = useMemo(() => {
    const sanitized = String(question.id ?? '').replace(/[^a-zA-Z0-9]/g, '');
    return `qg-${sanitized.slice(0, 8) || 'graph'}`;
  }, [question.id]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const palette = useMemo(() => {
    if (theme === 'dark') {
      return {
        question: '#fbbf24',
        claim: '#60a5fa',
        evidence: '#34d399',
        trigger: '#a78bfa',
        other: '#94a3b8',
        line: '#334155',
        lineSoft: 'rgba(148, 163, 184, 0.25)',
        lineStrong: '#64748b'
      };
    }
    return {
      question: '#d97706',
      claim: '#2563eb',
      evidence: '#059669',
      trigger: '#7c3aed',
      other: '#9ca3af',
      line: '#e5e7eb',
      lineSoft: 'rgba(148, 163, 184, 0.2)',
      lineStrong: '#cbd5e1'
    };
  }, [theme]);

  const layout = useMemo(() => {
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

    const ringConfigs = [
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

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const target = event.target as Element | null;
    const startedOnNode = Boolean(target?.closest('[data-node]'));
    pointerStateRef.current = {
      isDown: true,
      startX: event.clientX,
      startY: event.clientY,
      viewX: view.x,
      viewY: view.y,
      dragged: false,
      startedOnNode
    };
    if (!startedOnNode) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointerStateRef.current.isDown) return;
    const dx = event.clientX - pointerStateRef.current.startX;
    const dy = event.clientY - pointerStateRef.current.startY;
    if (!pointerStateRef.current.dragged && Math.hypot(dx, dy) > 6) {
      pointerStateRef.current.dragged = true;
      pressedNodeIdRef.current = null;
      setIsDragging(true);
      if (pointerStateRef.current.startedOnNode) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    if (pointerStateRef.current.dragged) {
      setView((prev) => ({
        ...prev,
        x: pointerStateRef.current.viewX + dx,
        y: pointerStateRef.current.viewY + dy
      }));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointerStateRef.current.isDown) return;
    pointerStateRef.current.isDown = false;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    const pressedId = pressedNodeIdRef.current;
    if (pressedId && !pointerStateRef.current.dragged) {
      const pressedNode = layout.nodes.find((node) => node.id === pressedId);
      if (pressedNode && pressedNode.id !== question.id) {
        onSelectNote?.(pressedNode.note);
      }
    }
    pressedNodeIdRef.current = null;
    window.setTimeout(() => {
      pointerStateRef.current.dragged = false;
    }, 0);
  };

  const handleNodeHover = (event: React.MouseEvent, node: GraphNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setHoveredNode(node);
  };

  const clearHover = () => setHoveredNode(null);

  if (!size.width || !size.height || !layout) {
    return <div ref={containerRef} className="h-80 sm:h-[420px]" />;
  }

  const focusId = hoveredNode?.id ?? selectedNoteId ?? null;
  const showLegend = notes.length > 0;
  const legendItems = [
    { id: 'question', label: t('type_question'), color: palette.question },
    ...layout.rings
      .filter((ring) => ring.list.length > 0)
      .map((ring) => ({ id: ring.id, label: ring.label, color: ring.color }))
  ];
  const zoomIn = () => setView((prev) => ({ ...prev, scale: clamp(prev.scale + 0.15, 0.6, 2.4) }));
  const zoomOut = () => setView((prev) => ({ ...prev, scale: clamp(prev.scale - 0.15, 0.6, 2.4) }));
  const resetView = () => setView({ x: 0, y: 0, scale: 1 });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-80 sm:h-[420px] surface-panel overflow-hidden"
    >
      <svg
        width="100%"
        height="100%"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="touch-none cursor-move"
        role="img"
        aria-label={t('question_constellation')}
      >
        <defs>
          <filter
            id={`${idPrefix}-glow`}
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
            filterUnits="objectBoundingBox"
          >
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`translate(${view.x + layout.centerX * (1 - view.scale)}, ${view.y + layout.centerY * (1 - view.scale)}) scale(${view.scale})`}>
          {layout.rings
            .filter((ring) => ring.list.length > 0)
            .map((ring) => (
              <circle
                key={`orbit-${ring.id}`}
                cx={layout.centerX}
                cy={layout.centerY}
                r={ring.radius}
                fill="none"
                stroke={palette.lineSoft}
                strokeWidth={1}
                strokeDasharray="4 6"
                opacity={0.65}
                pointerEvents="none"
              />
            ))}

          {layout.nodes.length > 1 &&
            layout.nodes.slice(1).map((node) => {
              const isFocused = focusId === node.id;
              const isDimmed = focusId && focusId !== node.id;
              return (
                <line
                  key={`line-${node.id}`}
                  x1={layout.nodes[0]?.x ?? 0}
                  y1={layout.nodes[0]?.y ?? 0}
                  x2={node.x}
                  y2={node.y}
                  stroke={isFocused ? node.color : palette.line}
                  strokeWidth={isFocused ? 1.6 : 1}
                  strokeOpacity={isDimmed ? 0.2 : isFocused ? 0.75 : 0.45}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              );
            })}

          {layout.nodes.map((node) => {
            const isSelected = selectedNoteId === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const isQuestionNode = node.id === question.id;
            const isFocused = focusId === node.id;
            const isDimmed = focusId && !isFocused && !isQuestionNode;
            const displayRadius = node.radius * (isQuestionNode ? 1.08 : isFocused ? 1.25 : 1);
            return (
              <g
                key={node.id}
                data-node
                onMouseEnter={(event) => handleNodeHover(event, node)}
                onMouseMove={(event) => handleNodeHover(event, node)}
                onMouseLeave={clearHover}
                onPointerDown={() => {
                  pressedNodeIdRef.current = node.id;
                }}
                className={isQuestionNode ? 'cursor-default' : 'cursor-pointer'}
              >
                {(isSelected || isHovered || isQuestionNode) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={displayRadius + (isQuestionNode ? 12 : 8)}
                    fill={node.color}
                    opacity={isQuestionNode ? 0.12 : 0.14}
                    filter={isQuestionNode ? `url(#${idPrefix}-glow)` : undefined}
                  />
                )}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={displayRadius + 6}
                    fill="none"
                    stroke={palette.lineStrong}
                    strokeWidth={2}
                    strokeDasharray="3 4"
                    opacity={0.8}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={displayRadius}
                  fill={node.color}
                  stroke={node.stroke}
                  strokeWidth={isQuestionNode ? 1.5 : 1}
                  opacity={isDimmed ? 0.45 : 1}
                />
                {isQuestionNode && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={displayRadius - 6}
                    fill="rgba(255, 255, 255, 0.4)"
                    opacity={theme === 'dark' ? 0.15 : 0.35}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {notes.length === 0 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center text-caption">
          <span className="px-3 py-1 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/80 dark:bg-surface-dark/80 shadow-sm backdrop-blur-sm">
            {t('no_thoughts_here')}
          </span>
        </div>
      )}

      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        <div className="flex items-center gap-0.5 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/90 dark:bg-surface-dark/85 px-1 py-1 shadow-[var(--shadow-elev-1)] dark:shadow-[var(--shadow-elev-1-dark)] backdrop-blur-sm">
          <div className="hidden sm:flex items-center gap-1 pl-2.5 pr-1.5">
            <span className="text-[9px] uppercase tracking-[0.18em] font-medium text-muted-400 dark:text-muted-500 select-none">
              {t('zoom_label')}
            </span>
            <span className="min-w-[2.5rem] text-center text-[11px] font-semibold tabular-nums text-subtle dark:text-subtle-dark">
              {Math.round(view.scale * 100)}%
            </span>
          </div>
          <span className="hidden sm:block h-4 w-px bg-line/50 dark:bg-line-dark/50 mx-0.5" />
          <IconButton
            label={t('zoom_in')}
            onClick={zoomIn}
            sizeClassName="h-7 w-7"
            className="text-muted-500 dark:text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark active:scale-95 duration-150"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={t('zoom_out')}
            onClick={zoomOut}
            sizeClassName="h-7 w-7"
            className="text-muted-500 dark:text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark active:scale-95 duration-150"
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </IconButton>
          <span className="h-4 w-px bg-line/50 dark:bg-line-dark/50 mx-0.5" />
          <button
            type="button"
            onClick={resetView}
            className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full cursor-pointer text-muted-500 dark:text-muted-400 hover:text-ink dark:hover:text-ink-dark hover:bg-surface-hover dark:hover:bg-surface-hover-dark active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 dark:focus-visible:ring-accent-dark/30"
            aria-label={t('center_view')}
          >
            <CrosshairIcon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">{t('center_view')}</span>
          </button>
        </div>
      </div>

      {showLegend && (
        <div className="absolute left-3 bottom-3 flex flex-wrap gap-2 text-micro text-muted-500 dark:text-muted-400 pointer-events-none">
          {legendItems.map((item) => (
            <div
              key={`legend-${item.id}`}
              className="flex items-center gap-1.5 rounded-full border border-line/60 dark:border-line-dark/60 bg-surface/70 dark:bg-surface-dark/70 px-2 py-1 shadow-sm backdrop-blur-sm"
            >
              <span
                className="inline-flex h-2 w-2 rounded-full"
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 8px ${item.color}55`
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {hoveredNode && (
        <div
          className="absolute z-10 max-w-xs rounded-lg border border-line dark:border-line-dark bg-surface dark:bg-surface-dark shadow-lg p-3 text-caption-ink"
          style={{
            left: clamp(hoverPosition.x + 12, 8, Math.max(8, size.width - 260)),
            top: clamp(hoverPosition.y + 12, 8, Math.max(8, size.height - 120))
          }}
        >
          <div className="font-semibold mb-1">
            {hoveredNode.note.type === NoteType.QUESTION
              ? t('type_question')
              : t(`type_${hoveredNode.note.type}` as any)}
          </div>
          <div className="text-subtle dark:text-subtle-dark leading-relaxed">
            {hoveredNode.note.content.length > 100
              ? `${hoveredNode.note.content.slice(0, 100)}...`
              : hoveredNode.note.content}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGraph;
