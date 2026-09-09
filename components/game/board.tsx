/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Interactive SVG paths cannot use HTML button elements; keyboard and accessible names are provided. */
'use client';
import { useRef, type CSSProperties } from 'react';
import { direction, type Arrow, type Level, type Run } from '@/lib/game/engine';

export function Board({
  level,
  disabled = false,
  run,
  flying,
  bump,
  reducedMotion,
  onTap,
  directionWords,
  label,
  en,
}: {
  level: Level;
  disabled?: boolean;
  run: Run;
  flying: number[];
  bump: { id: number; blocked: number[]; serial: number } | null;
  reducedMotion: boolean;
  onTap: (id: number) => void;
  directionWords: string[];
  label: string;
  en: boolean;
}) {
  const gesture = useRef({ x: 0, y: 0, pointer: -1, cancelled: true });
  const unit = 40,
    pad = 42,
    extent = (level.size - 1) * unit + pad * 2;
  const xy = ([x, y]: number[]) => [x * unit + pad, y * unit + pad];
  function draw(a: Arrow) {
    const outgoing = flying.includes(a.id);
    if (run.removed.includes(a.id) && !outgoing) return null;
    const points = a.points.map(xy);
    const head = points.at(-1)!;
    const [dx, dy] = direction(a);
    const isBump = bump?.id === a.id;
    const highlighted = run.hint === a.id || bump?.blocked.includes(a.id);
    const travel = extent + points.length * unit;
    const length = (points.length - 1) * unit;
    const extended =
      outgoing || isBump
        ? [...points, [head[0] + dx * travel, head[1] + dy * travel]]
        : points;
    const path = extended
      .map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`)
      .join(' ');
    const headPath = `M ${head[0] - dx * 10 + dy * 8} ${head[1] - dy * 10 - dx * 8} L ${head[0]} ${head[1]} L ${head[0] - dx * 10 - dy * 8} ${head[1] - dy * 10 + dx * 8}`;
    const dirIndex = dx === 1 ? 0 : dy === 1 ? 1 : dx === -1 ? 2 : 3;
    const style = {
      '--travel': `${travel}px`,
      '--head-x': `${dx * travel}px`,
      '--head-y': `${dy * travel}px`,
      '--bump-x': `${dx * 7}px`,
      '--bump-y': `${dy * 7}px`,
    } as CSSProperties;
    return (
      <g
        key={`${a.id}-${isBump ? bump?.serial : 'stable'}`}
        className={`game-arrow ${outgoing ? 'escaping' : ''} ${isBump ? 'bumping' : ''} ${highlighted ? 'highlighted' : ''} ${reducedMotion ? 'quick-motion' : ''}`}
        style={style}
      >
        {highlighted && !outgoing && (
          <path className="arrow-glow" d={path} strokeWidth={20} fill="none" />
        )}
        <g
          className="arrow-visible"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path
            className="arrow-trail"
            d={path}
            strokeDasharray={
              outgoing || isBump ? `${length} ${travel + length}` : undefined
            }
          />
          <path className="arrow-head" d={headPath} />
        </g>
        {!outgoing && (
          <path
            className="arrow-hit"
            d={points
              .map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`)
              .join(' ')}
            strokeWidth={26}
            stroke="transparent"
            fill="none"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            role="button"
            aria-label={
              en
                ? `Arrow ${a.id + 1}, ${directionWords[dirIndex]}`
                : `箭头 ${a.id + 1}，向${directionWords[dirIndex]}`
            }
            onClick={() => {
              if (!disabled) onTap(a.id);
            }}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onTap(a.id);
              }
            }}
          />
        )}
      </g>
    );
  }
  return (
    <svg
      className="puzzle-board"
      viewBox={`0 0 ${extent} ${extent}`}
      aria-label={label}
      role="group"
      onPointerDownCapture={(e) => {
        gesture.current = {
          x: e.clientX,
          y: e.clientY,
          pointer: e.pointerId,
          cancelled: !e.isPrimary || e.button !== 0,
        };
      }}
      onPointerMoveCapture={(e) => {
        const g = gesture.current;
        if (
          e.pointerId !== g.pointer ||
          Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8
        )
          g.cancelled = true;
      }}
      onPointerUpCapture={(e) => {
        const g = gesture.current;
        if (
          e.pointerId !== g.pointer ||
          Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8
        )
          g.cancelled = true;
      }}
      onPointerCancelCapture={() => {
        gesture.current.cancelled = true;
      }}
      onClickCapture={(e) => {
        if (disabled || (e.detail !== 0 && gesture.current.cancelled)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <defs>
        <pattern
          id="grid-dots"
          x={pad}
          y={pad}
          width={unit}
          height={unit}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0} cy={0} r={1.5} fill="#ccd7e4" />
        </pattern>
      </defs>
      <rect
        x={pad - 3}
        y={pad - 3}
        width={(level.size - 1) * unit + 6}
        height={(level.size - 1) * unit + 6}
        fill="url(#grid-dots)"
      />
      {level.arrows.filter((a) => !flying.includes(a.id)).map(draw)}
      {level.arrows.filter((a) => flying.includes(a.id)).map(draw)}
    </svg>
  );
}
