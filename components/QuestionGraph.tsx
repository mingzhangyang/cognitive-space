import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Note, NoteType } from '../types';
import { useAppContext } from '../contexts/AppContext';

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
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

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
        other: '#6b7280',
        line: '#374151'
      };
    }
    return {
      question: '#d97706',
      claim: '#2563eb',
      evidence: '#059669',
      trigger: '#7c3aed',
      other: '#9ca3af',
      line: '#e5e7eb'
    };
  }, [theme]);

  const nodes = useMemo<GraphNode[]>(() => {
    if (!size.width || !size.height) return [];

    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const minDim = Math.min(size.width, size.height);
    const baseRadius = Math.max(90, minDim * 0.22);
    const ringGap = Math.max(55, minDim * 0.12);
    const maxRadius = minDim / 2 - 24;

    const claimNotes = notes.filter((note) => note.type === NoteType.CLAIM);
    const evidenceNotes = notes.filter((note) => note.type === NoteType.EVIDENCE);
    const triggerNotes = notes.filter((note) => note.type === NoteType.TRIGGER);
    const otherNotes = notes.filter(
      (note) =>
        ![NoteType.CLAIM, NoteType.EVIDENCE, NoteType.TRIGGER].includes(note.type)
    );

    const rings = [
      { list: claimNotes, radius: baseRadius, color: palette.claim, size: 11 },
      { list: evidenceNotes, radius: baseRadius + ringGap, color: palette.evidence, size: 9 },
      { list: triggerNotes, radius: baseRadius + ringGap * 2, color: palette.trigger, size: 8 },
      { list: otherNotes, radius: baseRadius + ringGap * 3, color: palette.other, size: 7 }
    ];

    const ringNodes: GraphNode[] = [];
    rings.forEach((ring, ringIndex) => {
      const count = ring.list.length;
      if (!count) return;
      const radius = Math.min(ring.radius, maxRadius);
      const angleStep = (Math.PI * 2) / count;
      const startAngle = (Math.PI / 6) * ringIndex;
      ring.list.forEach((note, index) => {
        const angle = startAngle + angleStep * index;
        ringNodes.push({
          id: note.id,
          note,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
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
      radius: 16,
      color: palette.question,
      stroke: palette.line
    };

    return [questionNode, ...ringNodes];
  }, [notes, palette, question, size.height, size.width]);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    if (target.closest('[data-node]')) return;
    isPanningRef.current = true;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanningRef.current) return;
    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    setView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY * -0.0015;
    setView((prev) => ({
      ...prev,
      scale: clamp(prev.scale + delta, 0.6, 2.4)
    }));
  };

  const handleNodeHover = (event: React.MouseEvent, node: GraphNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    setHoveredNode(node);
  };

  const clearHover = () => setHoveredNode(null);

  if (!size.width || !size.height) {
    return <div ref={containerRef} className="h-[320px] sm:h-[420px]" />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[320px] sm:h-[420px] surface-panel overflow-hidden"
    >
      <svg
        width="100%"
        height="100%"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="touch-none"
      >
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.scale})`}>
          {nodes.length > 1 && nodes.slice(1).map((node) => (
            <line
              key={`line-${node.id}`}
              x1={nodes[0]?.x ?? 0}
              y1={nodes[0]?.y ?? 0}
              x2={node.x}
              y2={node.y}
              stroke={palette.line}
              strokeWidth={1}
            />
          ))}

          {nodes.map((node) => {
            const isSelected = selectedNoteId === node.id;
            const isQuestionNode = node.id === question.id;
            return (
              <g
                key={node.id}
                data-node
                onMouseEnter={(event) => handleNodeHover(event, node)}
                onMouseMove={(event) => handleNodeHover(event, node)}
                onMouseLeave={clearHover}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isQuestionNode) onSelectNote?.(node.note);
                }}
                className={isQuestionNode ? 'cursor-default' : 'cursor-pointer'}
              >
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius + 6}
                    fill="none"
                    stroke={palette.line}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={node.color}
                  stroke={node.stroke}
                  strokeWidth={1}
                />
              </g>
            );
          })}
        </g>
      </svg>

      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-caption">
          {t('no_thoughts_here')}
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
