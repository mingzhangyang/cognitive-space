import React, { useEffect, useRef, useState } from 'react';
import { Note } from '../types';
import { useAppContext } from '../contexts/AppContext';
import QuestionGraphControls from './questionGraph/QuestionGraphControls';
import QuestionGraphLegend from './questionGraph/QuestionGraphLegend';
import QuestionGraphTooltip from './questionGraph/QuestionGraphTooltip';
import { useQuestionGraphLayout, type GraphNode } from './questionGraph/useQuestionGraphLayout';
import { getTypeLabel } from '../utils/notes';

interface QuestionGraphProps {
  question: Note;
  notes: Note[];
  selectedNoteId?: string | null;
  onSelectNote?: (note: Note) => void;
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

  const { idPrefix, palette, layout, legendItems, showLegend } = useQuestionGraphLayout({
    theme,
    t,
    question,
    notes,
    size
  });

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
                  fill={palette.inner}
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

      <QuestionGraphControls
        scale={view.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        t={t}
      />

      {showLegend && <QuestionGraphLegend items={legendItems} />}

      {hoveredNode && (
        <QuestionGraphTooltip
          title={getTypeLabel(hoveredNode.note.type, t)}
          content={
            hoveredNode.note.content.length > 100
              ? `${hoveredNode.note.content.slice(0, 100)}...`
              : hoveredNode.note.content
          }
          style={{
            left: clamp(hoverPosition.x + 12, 8, Math.max(8, size.width - 260)),
            top: clamp(hoverPosition.y + 12, 8, Math.max(8, size.height - 120))
          }}
        />
      )}
    </div>
  );
};

export default QuestionGraph;
