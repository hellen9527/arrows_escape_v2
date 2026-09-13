import { blockers, type Level } from '../game/engine.ts';
import { makeLevel } from '../game/levels.ts';
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
const titles = [
  '先凑成一组',
  '给下一组留位置',
  '先解开，再收集',
  '跨过交错的线',
  '别急着收进来',
  '把选择连起来',
];
const notes = [
  '相同字母收齐3个，就会腾出槽位。',
  '能出界的箭头，也可以先等一等。',
  '目标颜色被挡住时，先计算需要几个空位。',
  '看箭头的出口，也看槽里缺少的颜色。',
  '撤回一步，试试另一种收集顺序。',
  '没有倒计时，找到自己的清场顺序。',
];
export const matchLevels: MatchLevel[] = [2, 8, 17, 27, 36, 45].map(
  (source, index) => {
    const base = makeLevel(source);
    const arrows = base.arrows.slice(0, Math.floor(base.arrows.length / 3) * 3);
    const level = { id: index + 1, size: base.size, arrows };
    const witness: number[] = [];
    while (witness.length < arrows.length) {
      const free = arrows.find(
        (a) =>
          !witness.includes(a.id) &&
          blockers(level, witness, a.id).length === 0,
      );
      if (!free) throw new Error('Invalid experiment board');
      witness.push(free.id);
    }
    const colors: Record<number, number> = {};
    for (let i = 0; i < witness.length; i++) {
      const fullPair = Math.floor(i / 6) * 6 + 6 <= witness.length;
      colors[witness[i]] =
        index === 0
          ? Math.floor(i / 3) % 3
          : (Math.floor(i / 6) * 2 + (fullPair ? i % 2 : 0)) % 4;
    }
    return {
      ...level,
      colors,
      witness,
      title: titles[index],
      note: notes[index],
    };
  },
);
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
