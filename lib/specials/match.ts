import { blockers, type Level } from '../game/engine.ts';
export type MatchLevel = Level & {
  colors: Record<number, number>;
  witness: number[];
  title: string;
  note: string;
};
export type MatchState = {
  removed: number[];
  tray: number[];
  matches: number;
  status: 'playing' | 'won' | 'lost';
};
export const symbols = ['A', 'B', 'C', 'D'];
export const palette = ['#b84939', '#276bad', '#7b50a0', '#32794a'];
export function collect(
  level: MatchLevel,
  state: MatchState,
  id: number,
): MatchState {
  if (
    state.status !== 'playing' ||
    state.removed.includes(id) ||
    !level.arrows.some((a) => a.id === id) ||
    blockers(level, state.removed, id).length
  )
    return state;
  let tray = [...state.tray, id];
  const same = tray.filter((x) => level.colors[x] === level.colors[id]);
  const matched = same.length === 3;
  if (matched) tray = tray.filter((x) => !same.includes(x));
  const removed = [...state.removed, id];
  return {
    removed,
    tray,
    matches: state.matches + Number(matched),
    status:
      removed.length === level.arrows.length && tray.length === 0
        ? 'won'
        : tray.length >= 7
          ? 'lost'
          : 'playing',
  };
}
export function replay(level: MatchLevel, moves: number[]): MatchState {
  let state: MatchState = {
    removed: [],
    tray: [],
    matches: 0,
    status: 'playing',
  };
  for (const id of moves) {
    const next = collect(level, state, id);
    if (next === state) break;
    state = next;
  }
  return state;
}
// null means no solution; undefined means the search budget was exhausted.
export function solve(
  level: MatchLevel,
  start: MatchState,
  budget = 30000,
): number[] | null | undefined {
  const seen = new Set<string>();
  let exhausted = false;
  function visit(s: MatchState): number[] | null {
    if (s.status === 'won') return [];
    if (s.status === 'lost') return null;
    if (--budget < 0) {
      exhausted = true;
      return null;
    }
    const key = s.removed
      .slice()
      .sort((a, b) => a - b)
      .join(',');
    if (seen.has(key)) return null;
    seen.add(key);
    const candidates = level.arrows
      .filter(
        (a) =>
          !s.removed.includes(a.id) && !blockers(level, s.removed, a.id).length,
      )
      .sort(
        (a, b) =>
          s.tray.filter((x) => level.colors[x] === level.colors[b.id]).length -
          s.tray.filter((x) => level.colors[x] === level.colors[a.id]).length,
      );
    for (const a of candidates) {
      const path = visit(collect(level, s, a.id));
      if (path) return [a.id, ...path];
      if (exhausted) return null;
    }
    return null;
  }
  const path = visit(start);
  return path ?? (exhausted ? undefined : null);
}
