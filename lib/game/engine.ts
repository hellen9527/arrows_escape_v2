export type Arrow = {
  id: number;
  points: number[][];
  key?: string;
  lock?: string;
};
export type Campaign = 'classic' | 'challenge';
export type Level = {
  id: number;
  size: number;
  arrows: Arrow[];
  campaign?: Campaign;
  objective?: { type: 'rescue'; targets: number[]; moves: number };
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
export const isComplete = (level: Level, run: Run): boolean =>
  level.objective?.type === 'rescue'
    ? level.objective.targets.every((id) => run.removed.includes(id))
    : level.arrows.every((arrow) => run.removed.includes(arrow.id));
export const movesLeft = (level: Level, run: Run): number | null =>
  level.objective?.type === 'rescue'
    ? Math.max(0, level.objective.moves - run.removed.length)
    : null;
export const failureReason = (
  level: Level,
  run: Run,
): 'hearts' | 'moves' | null =>
  lives(level, run) === 0
    ? 'hearts'
    : !isComplete(level, run) && movesLeft(level, run) === 0
      ? 'moves'
      : null;
export const failed = (level: Level, run: Run) =>
  failureReason(level, run) !== null;

export function direction(a: Arrow): number[] {
  const p = a.points.at(-1)!;
  const q = a.points.at(-2)!;
  return [p[0] - q[0], p[1] - q[1]];
}
export function isLocked(
  level: Level,
  removed: number[],
  arrow: Arrow,
): boolean {
  return Boolean(
    arrow.lock &&
    !level.arrows.some((a) => a.key === arrow.lock && removed.includes(a.id)),
  );
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
  const blocked = level.arrows
    .filter(
      (a) =>
        a.id !== id &&
        !removed.includes(a.id) &&
        a.points.some(([x, y]) =>
          dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0,
        ),
    )
    .map((a) => a.id);
  if (isLocked(level, removed, arrow)) {
    const key = level.arrows.find((a) => a.key === arrow.lock);
    if (!key) return [...blocked, -1];
    if (!blocked.includes(key.id)) blocked.push(key.id);
  }
  return blocked;
}
export function requiredArrowIds(
  level: Level,
  removed: number[] = [],
): number[] {
  if (level.objective?.type !== 'rescue')
    return level.arrows.filter((a) => !removed.includes(a.id)).map((a) => a.id);
  const required = new Set<number>();
  const visit = (id: number) => {
    if (removed.includes(id) || required.has(id)) return;
    required.add(id);
    blockers(level, removed, id).forEach(visit);
  };
  level.objective.targets.forEach(visit);
  return level.arrows.filter((a) => required.has(a.id)).map((a) => a.id);
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
  if (failed(level, r) || isComplete(level, r)) return r;
  if (action.type === 'undo')
    return r.removed.length
      ? { ...r, removed: r.removed.slice(0, -1), hint: null }
      : r;
  if (action.type === 'hint') {
    if (r.hint !== null && !r.removed.includes(r.hint)) return r;
    if (level.campaign === 'challenge' && r.hints >= 2) return r;
    const required = new Set(requiredArrowIds(level, r.removed));
    const free = level.arrows.filter(
      (a) => required.has(a.id) && !blockers(level, r.removed, a.id).length,
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
  const arrow = level.arrows.find((a) => a.id === action.id)!;
  if (isLocked(level, r.removed, arrow)) return r;
  if (blockers(level, r.removed, action.id).length) {
    const next = { ...r, mistakes: r.mistakes + 1 };
    if (failed(level, next)) next.hint = null;
    return next;
  }
  const next = {
    ...r,
    removed: [...r.removed, action.id],
    hint: r.hint === action.id ? null : r.hint,
  };
  if (failed(level, next) || isComplete(level, next)) next.hint = null;
  return next;
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
  contentRevision: campaign === 'challenge' ? 3 : 1,
  previousBest: {} as Record<string, number>,
  showRevisionIntro: false,
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
  if (failed(l, p.run) || !isComplete(l, p.run)) return p;
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
function validBests(value: unknown, count: number): Record<string, number> {
  const best: Record<string, number> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return best;
  for (const [key, score] of Object.entries(value)) {
    if (
      Number.isInteger(+key) &&
      +key >= 1 &&
      +key <= count &&
      typeof score === 'number' &&
      Number.isInteger(score) &&
      score >= 1 &&
      score <= 3
    )
      best[key] = score;
  }
  return best;
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
    if (
      campaign === 'challenge' &&
      s.contentRevision !== undefined &&
      s.contentRevision !== 1 &&
      s.contentRevision !== 2 &&
      s.contentRevision !== 3
    )
      return p;
    p.sound = typeof s.sound === 'boolean' ? s.sound : true;
    p.reducedMotion = s.reducedMotion === true;
    p.language = s.language === 'en' ? 'en' : 'zh';
    const migrating = campaign === 'challenge' && s.contentRevision !== 3;
    p.previousBest =
      campaign === 'challenge' ? validBests(s.previousBest, count) : {};
    if (migrating) {
      for (const [id, score] of Object.entries(validBests(s.best, count)))
        p.previousBest[id] = Math.max(p.previousBest[id] || 0, score);
    }
    p.best = migrating ? {} : validBests(s.best, count);
    p.showRevisionIntro =
      campaign === 'challenge' && (migrating || s.showRevisionIntro === true);
    p.unlocked = Math.min(
      count,
      Math.max(
        1,
        ...Object.keys({ ...p.previousBest, ...p.best }).map((k) => +k + 1),
      ),
    );
    const r = s.run;
    if (
      r &&
      Number.isInteger(r.level) &&
      r.level >= 1 &&
      r.level <= p.unlocked
    ) {
      p.run = newRun(
        migrating && p.previousBest[r.level]
          ? Math.min(p.unlocked, r.level + 1)
          : r.level,
      );
      // Old arrow ids refer to a different puzzle. Carry achievements, never moves.
      if (migrating) return p;
      let candidate = newRun(r.level);
      const l = makeLevel(r.level, campaign);
      if (Array.isArray(r.removed) && r.removed.length <= l.arrows.length) {
        for (const id of r.removed) {
          if (
            failed(l, candidate) ||
            isComplete(l, candidate) ||
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
          !isComplete(l, candidate) &&
          Number.isInteger(r.hint) &&
          l.arrows.some((a) => a.id === r.hint) &&
          !candidate.removed.includes(r.hint) &&
          requiredArrowIds(l, candidate.removed).includes(r.hint) &&
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
