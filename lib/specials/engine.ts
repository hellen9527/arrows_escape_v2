import { blockers, type Level } from '../game/engine.ts';
import { buildBoard } from './boards.ts';
import { collect, type MatchLevel, type MatchState } from './match.ts';
export type Special = Level & {
  kind: 'breeze' | 'giant' | 'match';
  after: number;
  title: string;
  subtitle: string;
  wind: number[];
  giant: number | null;
  colors: Record<number, number>;
  witness: number[];
};
export type SpecialState = MatchState & { moves: number[] };
export type SpecialSave = {
  runs: Record<number, number[]>;
  seen: number[];
  done: number[];
  clears: Record<number, number[]>;
};
export const SPECIAL_KEY = 'arrow-escape:specials:v1';
export const SKIN_KEY = 'arrow-escape:arrow-skin:v1';
const empty = (): SpecialState => ({
  removed: [],
  tray: [],
  matches: 0,
  status: 'playing',
  moves: [],
});
export function asMatch(l: Special): MatchLevel {
  return { ...l, note: l.subtitle };
}
export function play(l: Special, s: SpecialState, id: number): SpecialState {
  if (
    s.status !== 'playing' ||
    s.removed.includes(id) ||
    !l.arrows.some((a) => a.id === id) ||
    blockers(l, s.removed, id).length
  )
    return s;
  if (l.kind === 'match')
    return { ...collect(asMatch(l), s, id), moves: [...s.moves, id] };
  const removed = [...s.removed, id];
  if (l.wind.includes(id)) {
    // Prefer newly opened paths. Other wind arrows can depart, but don't retrigger.
    let previous = s.removed;
    for (let n = 0; n < 3; n++) {
      const free = l.arrows.filter(
        (a) => !removed.includes(a.id) && !blockers(l, removed, a.id).length,
      );
      free.sort(
        (a, b) =>
          Number(blockers(l, previous, b.id).length > 0) -
            Number(blockers(l, previous, a.id).length > 0) || a.id - b.id,
      );
      if (!free.length) break;
      previous = [...removed];
      removed.push(free[0].id);
    }
  }
  return {
    ...s,
    removed,
    moves: [...s.moves, id],
    status: removed.length === l.arrows.length ? 'won' : 'playing',
  };
}
export function replaySpecial(l: Special, input: number[]): SpecialState {
  let s = empty();
  for (const id of input) {
    const next = play(l, s, id);
    if (next === s) break;
    s = next;
  }
  return s;
}
const milestones = [10, 24, 42, 60, 84, 108, 138, 168, 198, 228, 258, 288];
const types = ['breeze', 'giant', 'breeze', 'match'] as const;
const names = {
  breeze: [
    '起风的午后',
    '风过转角',
    '穿过云层',
    '山谷回响',
    '顺风远行',
    '一阵好风',
  ],
  giant: ['把长风放走', '云间的长尾', '越过山海'],
  match: ['初次集结', '为下一组留位', '穿梭再相逢'],
};
const ordinal = { breeze: 0, giant: 0, match: 0 };
export const specials: Special[] = milestones.map((after, index) => {
  const kind = types[index % 4],
    n = ordinal[kind]++;
  const size =
    kind === 'giant' ? 23 + n * 2 : kind === 'match' ? 17 + n * 3 : 19 + n;
  const count =
    kind === 'giant' ? 36 + n * 8 : kind === 'match' ? 21 + n * 9 : 28 + n * 5;
  const board = buildBoard(71309 + index * 7919, size, count, kind === 'giant');
  const order = board.arrows.map((a) => a.id).reverse();
  const colors: Record<number, number> = {};
  if (kind === 'match')
    order.forEach((id, i) => {
      const full = Math.floor(i / 6) * 6 + 6 <= order.length;
      colors[id] = (Math.floor(i / 6) * 2 + (full ? i % 2 : 0)) % 4;
    });
  const l: Special = {
    ...board,
    id: index + 1,
    after,
    kind,
    title: names[kind][n],
    subtitle:
      kind === 'breeze'
        ? '放走风纹箭头，再带走最多三支畅通的箭头。'
        : kind === 'giant'
          ? '沿着长尾找到出口，解开阻挡，让整只风筝飞起来。'
          : '三个相同字母凑成一组，留意七个槽位。',
    wind:
      kind === 'breeze'
        ? [0.18, 0.45, 0.7].map((f) => order[Math.floor(order.length * f)])
        : [],
    giant: kind === 'giant' ? 0 : null,
    colors,
    witness: [],
  };
  let s = empty();
  for (const id of order) {
    if (s.removed.includes(id)) continue;
    s = play(l, s, id);
  }
  if (s.status !== 'won') throw new Error(`Special ${l.id} has no witness`);
  l.witness = s.moves;
  return l;
});
export function invitation(after: number, seen: number[]) {
  return specials.find((l) => l.after === after && !seen.includes(l.id));
}
export function restoreSpecials(input: unknown): SpecialSave {
  const save: SpecialSave = { runs: {}, seen: [], done: [], clears: {} };
  if (!input || typeof input !== 'object') return save;
  const raw = input as Record<string, unknown>;
  if (Array.isArray(raw.seen))
    save.seen = specials
      .filter((l) => (raw.seen as unknown[]).includes(l.id))
      .map((l) => l.id);
  if (raw.runs && typeof raw.runs === 'object')
    for (const l of specials) {
      const moves = (raw.runs as Record<number, unknown>)[l.id];
      if (
        Array.isArray(moves) &&
        moves.length <= l.arrows.length &&
        moves.every(Number.isInteger)
      ) {
        const s = replaySpecial(l, moves);
        save.runs[l.id] = s.moves;
        if (s.status === 'won') save.clears[l.id] = s.moves;
      }
    }
  if (raw.clears && typeof raw.clears === 'object')
    for (const l of specials) {
      const moves = (raw.clears as Record<number, unknown>)[l.id];
      if (
        Array.isArray(moves) &&
        moves.length <= l.arrows.length &&
        moves.every(Number.isInteger) &&
        replaySpecial(l, moves).status === 'won'
      )
        save.clears[l.id] = moves;
    }
  save.done = Object.keys(save.clears).map(Number);
  // Only completed replays prove completion; the supplied done array isn't trusted.
  return save;
}
