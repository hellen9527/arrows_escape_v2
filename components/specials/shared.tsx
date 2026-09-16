/* oxlint-disable next/no-html-link-for-pages -- Vinext Link RSC navigation fails in the production preview; native links reliably restore saved progress. */
'use client';
import { useEffect, useState } from 'react';
import { Wind, Sparkles } from 'lucide-react';
import {
  SPECIAL_KEY,
  SKIN_KEY,
  invitation,
  restoreSpecials,
  type SpecialSave,
} from '@/lib/specials/engine';
export function readSpecialSave(): SpecialSave {
  try {
    return restoreSpecials(
      JSON.parse(localStorage.getItem(SPECIAL_KEY) ?? 'null'),
    );
  } catch {
    return restoreSpecials(null);
  }
}
export function markInvitation(after: number) {
  try {
    const save = readSpecialSave(),
      l = invitation(after, save.seen);
    if (l)
      localStorage.setItem(
        SPECIAL_KEY,
        JSON.stringify({ ...save, seen: [...save.seen, l.id] }),
      );
  } catch {
    /* Mainline never depends on optional bonus storage. */
  }
}
export function SpecialLink({ en = false }: { en?: boolean }) {
  return (
    <a href="/specials" className="special-link">
      <Sparkles size={17} />
      {en ? 'Detours' : '奇遇'}
    </a>
  );
}
export function SpecialInvitation({
  after,
  en,
}: {
  after: number;
  en: boolean;
}) {
  const [loaded, setLoaded] = useState(false),
    [seen, setSeen] = useState<number[]>([]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSeen(readSpecialSave().seen);
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const l = invitation(after, seen);
  if (!loaded || !l) return null;
  return (
    <div className="special-invitation">
      <span>{en ? 'A LITTLE DETOUR · OPTIONAL' : '途中奇遇 · 可以跳过'}</span>
      <strong>
        {en
          ? {
              breeze: 'A little tailwind',
              giant: 'A long-tailed kite',
              match: 'A gathering of three',
            }[l.kind]
          : l.title}
      </strong>
      <p>
        {en
          ? 'Try a different puzzle, then return to your journey.'
          : '换个方式解一局，再继续你的旅程。'}
      </p>
      <a
        href={`/specials?stage=${l.id}`}
        onClick={() => {
          markInvitation(after);
          setSeen([...seen, l.id]);
        }}
      >
        {en ? 'Take a look' : '去看看'} ↗
      </a>
    </div>
  );
}
export function SkinSwitch({ en = false }: { en?: boolean }) {
  const [skin, setSkin] = useState('kite');
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let value = 'kite';
      try {
        if (localStorage.getItem(SKIN_KEY) === 'line') value = 'line';
      } catch {
        /* Optional preference. */
      }
      document.documentElement.dataset.arrowSkin = value;
      setSkin(value);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <button
      className="skin-switch"
      aria-pressed={skin === 'kite'}
      onClick={() => {
        const value = skin === 'kite' ? 'line' : 'kite';
        setSkin(value);
        document.documentElement.dataset.arrowSkin = value;
        try {
          localStorage.setItem(SKIN_KEY, value);
        } catch {
          /* Optional preference. */
        }
      }}
    >
      <Wind size={16} />
      {en
        ? skin === 'kite'
          ? 'Kite style'
          : 'Line style'
        : skin === 'kite'
          ? '风筝线'
          : '简线'}
    </button>
  );
}
