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
  tutorial?: boolean;
  objective?: { type: 'rescue'; targets: number[]; moves: number };
};
export type Run = {
  level: number;
  removed: number[];
  mistakes: number;
  hints: number;
  hint: number | null;
  hintStage?: number;
  hintCandidate?: number | null;
};
import { makeLevel, levelCount } from './levels.ts';
import { tutorialLevel } from './tutorials.ts';

export const lives = (level: Level, run: Run) =>
  level.campaign === 'challenge' && !level.tutorial
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
  hintStage: 0,
  hintCandidate: null,
});
export type Action =
  | { type: 'tap'; id: number }
  | { type: 'undo' }
  | { type: 'hint' };
export function act(level: Level, r: Run, action: Action): Run {
  if (
    isComplete(level, r) ||
    (failed(level, r) && !(level.tutorial && action.type === 'undo'))
  )
    return r;
  if (action.type === 'undo')
    return r.removed.length
      ? {
          ...r,
          removed: r.removed.slice(0, -1),
          hint: null,
          hintStage: 0,
          hintCandidate: null,
        }
      : r;
  if (action.type === 'hint') {
    if (r.hint !== null && !r.removed.includes(r.hint)) return r;
    if (
      level.campaign === 'challenge' &&
      r.hintCandidate != null &&
      !r.removed.includes(r.hintCandidate)
    ) {
      const stage = Math.min(3, (r.hintStage || 0) + 1);
      return {
        ...r,
        hintStage: stage,
        hint: stage === 3 ? r.hintCandidate : null,
      };
    }
    if (level.campaign === 'challenge' && !level.tutorial && r.hints >= 2)
      return r;
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
    if (!free.length) return r;
    return level.campaign === 'challenge'
      ? {
          ...r,
          hints: r.hints + 1,
          hint: null,
          hintStage: 1,
          hintCandidate: free[0].id,
        }
      : { ...r, hints: r.hints + 1, hint: free[0].id };
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
    if (failed(level, next)) {
      next.hint = null;
      next.hintStage = 0;
      next.hintCandidate = null;
    }
    return next;
  }
  const next = {
    ...r,
    removed: [...r.removed, action.id],
    hint:
      level.campaign === 'challenge' || r.hint === action.id ? null : r.hint,
    hintStage: 0,
    hintCandidate: null,
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
export type Training = { id: number; run: Run; sequence: boolean };
export const defaultProgress = (campaign: Campaign = 'classic') => ({
  version: 1,
  campaign,
  contentRevision: campaign === 'challenge' ? 4 : 1,
  balanceRevision: 0,
  previousBest: {} as Record<string, number>,
  showRevisionIntro: false,
  showBalanceNotice: false,
  entry: (campaign === 'challenge' ? 'pending' : 'experienced') as
    | 'pending'
    | 'new'
    | 'experienced',
  tutorialBest: {} as Record<string, number>,
  training: null as Training | null,
  pausedTraining: null as Training | null,
  seenRules: [] as number[],
  unlocked: 1,
  best: {} as Record<string, number>,
  independent: {} as Record<string, boolean>,
  run: newRun(1),
  sound: true,
  reducedMotion: false,
  language: 'zh' as 'zh' | 'en',
});
export type Progress = ReturnType<typeof defaultProgress>;
export const activeRun = (p: Progress): Run => p.training?.run ?? p.run;
export const activeLevel = (p: Progress): Level =>
  p.training
    ? tutorialLevel(p.training.id)
    : makeLevel(p.run.level, p.campaign);
export const withActiveRun = (p: Progress, run: Run): Progress =>
  p.training ? { ...p, training: { ...p.training, run } } : { ...p, run };
export function canStartLevel(p: Progress, id: number): boolean {
  if (!Number.isInteger(id) || id < 1 || id > levelCount(p.campaign))
    return false;
  return p.campaign === 'classic'
    ? id <= p.unlocked
    : (id - 1) % 30 === 0 || Boolean(p.best[id] || p.best[id - 1]);
}
export function enterLevel(p: Progress, id: number): Progress {
  if (!canStartLevel(p, id)) return p;
  const next = pauseTutorial(p);
  return {
    ...next,
    run:
      id === p.run.level && !isComplete(makeLevel(id, p.campaign), p.run)
        ? p.run
        : newRun(id),
    showRevisionIntro: false,
  };
}
export function startTutorial(
  p: Progress,
  id: number,
  sequence = false,
): Progress {
  if (p.campaign !== 'challenge' || !Number.isInteger(id) || id < 1 || id > 8)
    return p;
  if (p.training?.id === id)
    return sequence && id <= 6
      ? { ...p, training: { ...p.training, sequence: true } }
      : p;
  if (p.pausedTraining?.id === id)
    return {
      ...p,
      showRevisionIntro: false,
      training: {
        ...p.pausedTraining,
        sequence: p.pausedTraining.sequence || (sequence && id <= 6),
      },
      pausedTraining: p.training,
    };
  return {
    ...p,
    showRevisionIntro: false,
    pausedTraining: p.training ?? p.pausedTraining,
    training: { id, run: newRun(id), sequence: sequence && id <= 6 },
  };
}
export function pauseTutorial(p: Progress): Progress {
  return p.training
    ? {
        ...p,
        pausedTraining: isComplete(tutorialLevel(p.training.id), p.training.run)
          ? p.pausedTraining
          : p.training,
        training: null,
      }
    : p;
}
export function continueTutorial(p: Progress): Progress {
  if (!p.training) return p;
  return p.training.sequence && p.training.id < 6
    ? startTutorial(p, p.training.id + 1, true)
    : { ...p, training: null };
}
export function chooseEntry(
  p: Progress,
  entry: 'new' | 'experienced',
): Progress {
  const next = {
    ...p,
    entry,
    training: null,
    showRevisionIntro: false,
    run: newRun(entry === 'new' ? 1 : 31),
  };
  return entry === 'new' ? startTutorial(next, 1, true) : next;
}
export function finishLevel(p: Progress): Progress {
  const r = activeRun(p),
    l = activeLevel(p);
  if (failed(l, r) || !isComplete(l, r)) return p;
  if (p.training)
    return {
      ...p,
      tutorialBest: {
        ...p.tutorialBest,
        [p.training.id]: Math.max(p.tutorialBest[p.training.id] || 0, stars(r)),
      },
    };
  return {
    ...p,
    unlocked: Math.max(
      p.unlocked,
      Math.min(levelCount(p.campaign), r.level + 1),
    ),
    best: { ...p.best, [r.level]: Math.max(p.best[r.level] || 0, stars(r)) },
    independent: {
      ...p.independent,
      [r.level]: p.independent[r.level] || r.hints === 0,
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
function restoreRun(value: unknown, level: Level): Run {
  const initial = newRun(level.id);
  if (!value || typeof value !== 'object') return initial;
  const r = value as Run;
  if (!Array.isArray(r.removed) || r.removed.length > level.arrows.length)
    return initial;
  let run = initial;
  for (const id of r.removed) {
    if (
      failed(level, run) ||
      isComplete(level, run) ||
      !Number.isInteger(id) ||
      !level.arrows.some((a) => a.id === id) ||
      run.removed.includes(id) ||
      blockers(level, run.removed, id).length
    )
      return initial;
    run = act(level, run, { type: 'tap', id });
  }
  run.mistakes =
    Number.isInteger(r.mistakes) && r.mistakes >= 0
      ? Math.min(r.mistakes, 99999)
      : 0;
  run.hints =
    Number.isInteger(r.hints) && r.hints >= 0 ? Math.min(r.hints, 99999) : 0;
  const candidate = level.campaign === 'challenge' ? r.hintCandidate : r.hint;
  if (
    run.hints > 0 &&
    !failed(level, run) &&
    !isComplete(level, run) &&
    Number.isInteger(candidate) &&
    requiredArrowIds(level, run.removed).includes(candidate!) &&
    !blockers(level, run.removed, candidate!).length
  ) {
    if (level.campaign === 'challenge') {
      run.hintCandidate = candidate;
      run.hintStage = Math.max(1, Math.min(3, Math.floor(r.hintStage || 1)));
      run.hint = run.hintStage === 3 ? candidate! : null;
    } else run.hint = candidate!;
  }
  return run;
}
export function restoreProgress(
  raw: string | null,
  campaign: Campaign = 'classic',
): Progress {
  const p = defaultProgress(campaign),
    count = levelCount(campaign);
  try {
    const s = JSON.parse(raw || 'null');
    if (!s || s.version !== 1 || (s.campaign || 'classic') !== campaign)
      return p;
    if (
      campaign === 'challenge' &&
      s.contentRevision !== undefined &&
      ![1, 2, 3, 4].includes(s.contentRevision)
    )
      return p;
    p.sound = typeof s.sound === 'boolean' ? s.sound : true;
    p.reducedMotion = s.reducedMotion === true;
    p.language = s.language === 'en' ? 'en' : 'zh';
    const migrating = campaign === 'challenge' && s.contentRevision !== 4;
    p.previousBest =
      campaign === 'challenge' ? validBests(s.previousBest, 30) : {};
    if (migrating) {
      for (const [id, score] of Object.entries(validBests(s.best, 30)))
        p.previousBest[id] = Math.max(p.previousBest[id] || 0, score);
      p.showRevisionIntro = true;
      return p;
    }
    p.best = validBests(s.best, count);
    p.unlocked = Math.min(
      count,
      Math.max(1, ...Object.keys(p.best).map((k) => +k + 1)),
    );
    for (const id of Object.keys(p.best))
      if (s.independent?.[id] === true) p.independent[id] = true;
    p.entry =
      s.entry === 'new' || s.entry === 'experienced' ? s.entry : p.entry;
    p.showRevisionIntro =
      campaign === 'challenge' && s.showRevisionIntro === true;
    p.tutorialBest =
      campaign === 'challenge' ? validBests(s.tutorialBest, 8) : {};
    p.seenRules = Array.isArray(s.seenRules)
      ? [7, 8].filter((id) => s.seenRules.includes(id))
      : [];
    if (s.run && canStartLevel(p, s.run.level))
      p.run = restoreRun(s.run, makeLevel(s.run.level, campaign));
    if (
      campaign === 'challenge' &&
      s.training &&
      Number.isInteger(s.training.id) &&
      s.training.id >= 1 &&
      s.training.id <= 8
    ) {
      p.training = {
        id: s.training.id,
        sequence: s.training.sequence === true && s.training.id <= 6,
        run: restoreRun(s.training.run, tutorialLevel(s.training.id)),
      };
    }
    if (
      campaign === 'challenge' &&
      s.pausedTraining &&
      Number.isInteger(s.pausedTraining.id) &&
      s.pausedTraining.id >= 1 &&
      s.pausedTraining.id <= 8
    ) {
      p.pausedTraining = {
        id: s.pausedTraining.id,
        sequence:
          s.pausedTraining.sequence === true && s.pausedTraining.id <= 6,
        run: restoreRun(
          s.pausedTraining.run,
          tutorialLevel(s.pausedTraining.id),
        ),
      };
    }
    return finishLevel(p);
  } catch {
    return p;
  }
}
