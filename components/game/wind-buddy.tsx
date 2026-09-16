import { mascotSpace } from '@/lib/game/mascot-space';
import type { Level } from '@/lib/game/engine';
export function WindBuddy({
  level,
  flying,
}: {
  level: Level;
  flying: boolean;
}) {
  const space = mascotSpace(level);
  if (!space) return null;
  const size = (space.side - 1) * 40 * 0.76,
    cx = (space.x + (space.side - 1) / 2) * 40 + 42,
    cy = (space.y + (space.side - 1) / 2) * 40 + 42;
  return (
    <g
      className={`wind-buddy ${flying ? 'wind-buddy-flying' : ''}`}
      transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 120})`}
      pointerEvents="none"
      aria-hidden="true"
    >
      <ellipse cx={60} cy={105} rx={31} ry={5} fill="#7a9c9620" />
      <path
        d="M47 96 L43 103 Q43 107 54 105 L58 97 M67 97 L68 105 Q79 108 78 102 L74 94"
        fill="#719687"
      />
      <path
        d="M40 31 Q20 13 27 8 Q42 9 48 29 M73 27 Q75 8 94 10 Q94 24 81 33"
        fill="#acc7af"
        stroke="#648c78"
        strokeWidth={1.5}
      />
      <path
        d="M28 56 Q19 43 33 35 Q35 22 50 26 Q62 15 73 28 Q89 25 91 40 Q104 45 96 59 L91 85 Q84 101 61 100 Q34 101 29 86 Z"
        fill="#faf4e2"
        stroke="#92afa0"
        strokeWidth={2}
      />
      <path d="M30 67 Q58 79 93 64 L91 75 Q70 86 31 77 Z" fill="#729b88" />
      <path
        d="M82 74 Q102 82 99 93 L86 90 L91 100 Q76 94 76 79"
        fill="#729b88"
        stroke="#5e8876"
        strokeWidth={1}
      />
      <path
        d="M38 85 Q43 90 48 86 M31 61 Q23 64 23 73 M94 60 Q103 63 102 70"
        fill="none"
        stroke="#92afa0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <g className="buddy-eyes" fill="#456b60">
        <ellipse cx={47} cy={51} rx={2.7} ry={3.6} />
        <ellipse cx={74} cy={51} rx={2.7} ry={3.6} />
      </g>
      <ellipse cx={38} cy={58} rx={5} ry={3} fill="#e8b19b" opacity={0.5} />
      <ellipse cx={83} cy={58} rx={5} ry={3} fill="#e8b19b" opacity={0.5} />
      <path
        d="M56 57 Q61 63 66 57"
        fill="none"
        stroke="#68897b"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M44 37 Q50 32 55 35"
        fill="none"
        stroke="white"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}
