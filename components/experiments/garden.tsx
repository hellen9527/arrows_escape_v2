'use client';
import { useEffect, useState } from 'react';
export function GardenSwitch({ en = false }: { en?: boolean }) {
  const [garden, setGarden] = useState(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const value =
          localStorage.getItem('arrow-escape:experiment:garden:theme') !==
          'original';
        setGarden(value);
        document.documentElement.dataset.garden = String(value);
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function toggle() {
    const next = !garden;
    setGarden(next);
    document.documentElement.dataset.garden = String(next);
    try {
      localStorage.setItem(
        'arrow-escape:experiment:garden:theme',
        next ? 'garden' : 'original',
      );
    } catch {}
  }
  return (
    <button
      className="garden-switch"
      onClick={toggle}
      aria-pressed={garden}
      aria-label={en ? 'Toggle garden appearance' : '切换林间与原版外观'}
    >
      <span className={garden ? 'selected' : ''}>{en ? 'Garden' : '林间'}</span>
      <span className={!garden ? 'selected' : ''}>
        {en ? 'Original' : '原版'}
      </span>
    </button>
  );
}
export function Botanical() {
  return (
    <div className="garden-botanical" aria-hidden="true">
      <svg viewBox="0 0 280 190" fill="none">
        <circle cx="140" cy="94" r="74" fill="#e9e6d5" />
        <circle
          cx="140"
          cy="94"
          r="62"
          stroke="#c6ccba"
          strokeDasharray="2 6"
        />
        <path
          d="M 84 167 Q 144 119 151 22 M 154 147 Q 161 91 215 46 M 139 124 Q 98 102 54 46"
          stroke="#6d8466"
          strokeWidth="2"
        />
        {[
          [149, 40, -20],
          [144, 65, 150],
          [135, 94, -18],
          [113, 121, 150],
          [177, 87, 35],
          [195, 64, -140],
          [101, 92, -60],
          [76, 65, 110],
        ].map(([x, y, r], i) => (
          <path
            key={i}
            d="M 0 0 Q -30 -5 -33 -34 Q -5 -30 0 0 Z"
            transform={`translate(${x} ${y}) rotate(${r})`}
            fill={i % 2 ? '#899b72' : '#536e51'}
            opacity={i % 3 === 0 ? 0.7 : 1}
          />
        ))}
        <path
          d="M 145 133 L 159 147 L 145 161 M 114 147 H 158"
          stroke="#bb8750"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="214" cy="122" r="3" fill="#bb8750" />
        <circle cx="65" cy="119" r="2" fill="#bb8750" />
      </svg>
      <span>A QUIET PLACE TO FIND YOUR WAY</span>
    </div>
  );
}
