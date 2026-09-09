export type Arrow = { id: number; points: number[][] };
export type Campaign = 'classic' | 'challenge';
export type Level = {
  id: number;
  size: number;
  arrows: Arrow[];
  campaign?: Campaign;
};
export type Run = {
  level: number;
  removed: number[];
  mistakes: number;
  hints: number;
  hint: number | null;
};
import { makeLevel, levelCount } from './levels.ts';

export const lives = (level: Level, run: Run) =>
  level.campaign === 'challenge' && level.id > 3
    ? Math.max(0, 3 - run.mistakes)
    : null;
export const failed = (level: Level, run: Run) => lives(level, run) === 0;

export function direction(a: Arrow): number[] {
  const p = a.points.at(-1)!;
  const q = a.points.at(-2)!;
  return [p[0] - q[0], p[1] - q[1]];
}
export function blockers(
  level: Level,
  removed: number[],
  id: number,
): number[] {
  const arrow = level.arrows.find((a) => a.id === id);
  if (!arrow || removed.includes(id)) return [];
  const [dx, dy] = direction(arrow);
  const [hx, hy] = arrow.points.at(-1)!;
  return level.arrows
    .filter(
      (a) =>
        a.id !== id &&
        !removed.includes(a.id) &&
        a.points.some(([x, y]) =>
          dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0,
        ),
    )
    .map((a) => a.id);
}
export const newRun = (level: number): Run => ({
  level,
  removed: [],
  mistakes: 0,
  hints: 0,
  hint: null,
});
export type Action =
  | { type: 'tap'; id: number }
  | { type: 'undo' }
  | { type: 'hint' };
export function act(level: Level, r: Run, action: Action): Run {
  if (failed(level, r) || r.removed.length === level.arrows.length) return r;
  if (action.type === 'undo')
    return r.removed.length
      ? { ...r, removed: r.removed.slice(0, -1), hint: null }
      : r;
  if (action.type === 'hint') {
    if (r.hint !== null && !r.removed.includes(r.hint)) return r;
    if (level.campaign === 'challenge' && r.hints >= 2) return r;
    const free = level.arrows.filter(
      (a) =>
        !r.removed.includes(a.id) && !blockers(level, r.removed, a.id).length,
    );
    // Prefer the move releasing the most other arrows.
    free.sort(
      (a, b) =>
        level.arrows.filter((x) =>
          blockers(level, r.removed, x.id).includes(b.id),
        ).length -
        level.arrows.filter((x) =>
          blockers(level, r.removed, x.id).includes(a.id),
        ).length,
    );
    return free.length ? { ...r, hints: r.hints + 1, hint: free[0].id } : r;
  }
  if (
    !level.arrows.some((a) => a.id === action.id) ||
    r.removed.includes(action.id)
  )
    return r;
  if (blockers(level, r.removed, action.id).length)
    return { ...r, mistakes: r.mistakes + 1 };
  return {
    ...r,
    removed: [...r.removed, action.id],
    hint: r.hint === action.id ? null : r.hint,
  };
}
export const stars = (r: Run) =>
  r.mistakes === 0 && r.hints === 0
    ? 3
    : r.mistakes <= 3 && r.hints <= 2
      ? 2
      : 1;
export const defaultProgress = (campaign: Campaign = 'classic') => ({
  version: 1,
  campaign,
  unlocked: 1,
  best: {} as Record<string, number>,
  run: newRun(1),
  sound: true,
  reducedMotion: false,
  language: 'zh' as 'zh' | 'en',
});
export type Progress = ReturnType<typeof defaultProgress>;
export function finishLevel(p: Progress): Progress {
  const l = makeLevel(p.run.level, p.campaign);
  if (failed(l, p.run) || p.run.removed.length !== l.arrows.length) return p;
  return {
    ...p,
    unlocked: Math.max(
      p.unlocked,
      Math.min(levelCount(p.campaign), p.run.level + 1),
    ),
    best: {
      ...p.best,
      [p.run.level]: Math.max(p.best[p.run.level] || 0, stars(p.run)),
    },
  };
}
export function restoreProgress(
  raw: string | null,
  campaign: Campaign = 'classic',
): Progress {
  const p = defaultProgress(campaign);
  const count = levelCount(campaign);
  try {
    const s = JSON.parse(raw || 'null');
    if (!s || s.version !== 1 || (s.campaign || 'classic') !== campaign)
      return p;
    p.sound = typeof s.sound === 'boolean' ? s.sound : true;
    p.reducedMotion = s.reducedMotion === true;
    p.language = s.language === 'en' ? 'en' : 'zh';
    if (s.best && typeof s.best === 'object')
      for (const [k, v] of Object.entries(s.best)) {
        if (
          Number.isInteger(+k) &&
          +k >= 1 &&
          +k <= count &&
          typeof v === 'number' &&
          Number.isInteger(v) &&
          v >= 1 &&
          v <= 3
        )
          p.best[k] = v;
      }
    p.unlocked = Math.min(
      count,
      Math.max(1, ...Object.keys(p.best).map((k) => +k + 1)),
    );
    const r = s.run;
    if (
      r &&
      Number.isInteger(r.level) &&
      r.level >= 1 &&
      r.level <= p.unlocked
    ) {
      let candidate = newRun(r.level);
      const l = makeLevel(r.level, campaign);
      if (Array.isArray(r.removed) && r.removed.length <= l.arrows.length) {
        for (const id of r.removed) {
          if (
            !Number.isInteger(id) ||
            !l.arrows.some((a) => a.id === id) ||
            candidate.removed.includes(id) ||
            blockers(l, candidate.removed, id).length
          )
            throw new Error('Invalid move history');
          candidate = act(l, candidate, { type: 'tap', id });
        }
        candidate.mistakes =
          Number.isInteger(r.mistakes) && r.mistakes >= 0
            ? Math.min(r.mistakes, 99999)
            : 0;
        candidate.hints =
          Number.isInteger(r.hints) && r.hints >= 0
            ? Math.min(r.hints, 99999)
            : 0;
        if (
          candidate.hints > 0 &&
          !failed(l, candidate) &&
          Number.isInteger(r.hint) &&
          l.arrows.some((a) => a.id === r.hint) &&
          !candidate.removed.includes(r.hint) &&
          !blockers(l, candidate.removed, r.hint).length
        )
          candidate.hint = r.hint;
        p.run = candidate;
      }
    }
    return finishLevel(p);
  } catch {
    return p;
  }
}
