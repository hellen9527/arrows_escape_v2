import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockers } from '../lib/game/engine.ts';
import {
  specials,
  play,
  replaySpecial,
  restoreSpecials,
  invitation,
  type Special,
  type SpecialState,
} from '../lib/specials/engine.ts';
const fixture: Special = {
  id: 1,
  after: 10,
  kind: 'breeze',
  title: 'Test',
  subtitle: 'Test',
  size: 10,
  arrows: Array.from({ length: 7 }, (_, id) => ({
    id,
    points: [
      [0, id],
      [1, id],
    ],
  })),
  wind: [0, 1],
  giant: null,
  colors: {},
  witness: [0, 1, 2, 3, 4, 5, 6],
};
const empty: SpecialState = {
  removed: [],
  tray: [],
  matches: 0,
  status: 'playing',
  moves: [],
};
void test('wind releases at most three legal extras, never recursively triggers another wind', () => {
  const s = play(fixture, empty, 0);
  assert.equal(s.removed.length, 4);
  assert.deepEqual(s.moves, [0]);
  assert.deepEqual(replaySpecial(fixture, s.moves), s);
  assert.deepEqual(replaySpecial(fixture, s.moves.slice(0, -1)), empty);
});
void test('blocked taps and corrupt move suffixes are rejected', () => {
  const l = {
    ...fixture,
    arrows: [
      {
        id: 0,
        points: [
          [0, 0],
          [1, 0],
        ],
      },
      {
        id: 1,
        points: [
          [3, 0],
          [4, 0],
        ],
      },
    ],
  };
  assert.equal(play(l, empty, 0), empty);
  assert.equal(play(l, empty, 999), empty);
  assert.deepEqual(replaySpecial(l, [0, 1]), empty);
  assert.deepEqual(replaySpecial(l, [1, 999, 0]).moves, [1]);
});
void test('all twelve distinct boards have non-overlapping unit paths and winning witnesses', () => {
  assert.equal(specials.length, 12);
  assert.equal(specials.filter((l) => l.kind === 'match').length, 3);
  const boards = new Set();
  for (const l of specials) {
    const cells = new Set<string>();
    for (const a of l.arrows)
      for (let i = 0; i < a.points.length; i++) {
        const [x, y] = a.points[i];
        assert.ok(x >= 0 && y >= 0 && x < l.size && y < l.size);
        assert.ok(!cells.has(`${x},${y}`), `${l.id} collision`);
        cells.add(`${x},${y}`);
        if (i) {
          const p = a.points[i - 1];
          assert.equal(Math.abs(x - p[0]) + Math.abs(y - p[1]), 1);
        }
      }
    const s = replaySpecial(l, l.witness);
    assert.equal(s.status, 'won', `special ${l.id}`);
    boards.add(JSON.stringify(l.arrows));
    if (l.kind === 'giant') {
      const g = l.arrows.find((a) => a.id === l.giant)!;
      assert.ok(g.points.length >= 30);
      assert.ok(blockers(l, [], g.id).length > 0);
    }
    if (l.kind === 'breeze') assert.equal(l.wind.length, 3);
  }
  assert.equal(boards.size, 12);
});
void test('save restore validates moves and invitation state without touching main progress', () => {
  const s = restoreSpecials({
    runs: { 1: [999, 0] },
    seen: [1, 1, 999, '2'],
    done: [1, 999],
    style: 'bad',
  });
  assert.deepEqual(s.runs[1], []);
  assert.deepEqual(s.seen, [1]);
  assert.deepEqual(s.done, []);
  assert.equal(invitation(10, [])?.id, 1);
  assert.equal(invitation(10, [1]), undefined);
  assert.equal(invitation(11, []), undefined);
  assert.deepEqual(restoreSpecials(null), {
    runs: {},
    seen: [],
    done: [],
    clears: {},
  });
});
void test('completion survives replay and malformed completion records grant nothing', () => {
  const l = specials[0],
    saved = restoreSpecials({ runs: { [l.id]: l.witness } });
  assert.deepEqual(saved.done, [l.id]);
  const replaying = restoreSpecials({ ...saved, runs: { [l.id]: [] } });
  assert.deepEqual(replaying.done, [l.id]);
  assert.deepEqual(replaying.runs[l.id], []);
  assert.deepEqual(restoreSpecials({ clears: { 1: [999] } }).done, []);
});
void test('every automatic escape is geometrically legal at that point in the wave', () => {
  for (const l of specials.filter((l) => l.kind === 'breeze')) {
    let s = replaySpecial(l, []);
    for (const id of l.witness) {
      const next = play(l, s, id),
        removed = [...s.removed];
      for (const x of next.removed.slice(removed.length)) {
        assert.equal(blockers(l, removed, x).length, 0);
        removed.push(x);
      }
      assert.ok(next.removed.length - s.removed.length <= 4);
      s = next;
    }
  }
});
void test('actual matching specials have both a winning route and a meaningful losing choice', () => {
  for (const l of specials.filter((l) => l.kind === 'match')) {
    const visited = new Set<string>();
    let budget = 50000;
    function findLoss(s: SpecialState): number[] | null {
      if (s.status === 'lost') return s.moves;
      if (s.status === 'won' || --budget < 0) return null;
      const key = s.removed
        .slice()
        .sort((a, b) => a - b)
        .join(',');
      if (visited.has(key)) return null;
      visited.add(key);
      const free = l.arrows
        .filter(
          (a) =>
            !s.removed.includes(a.id) && !blockers(l, s.removed, a.id).length,
        )
        .sort(
          (a, b) =>
            s.tray.filter((x) => l.colors[x] === l.colors[a.id]).length -
            s.tray.filter((x) => l.colors[x] === l.colors[b.id]).length,
        );
      for (const a of free) {
        const loss = findLoss(play(l, s, a.id));
        if (loss) return loss;
      }
      return null;
    }
    const loss = findLoss(replaySpecial(l, []));
    assert.ok(loss, `special ${l.id} must have a real capacity tradeoff`);
    assert.equal(replaySpecial(l, loss).status, 'lost');
    assert.equal(replaySpecial(l, loss.slice(0, -1)).status, 'playing');
  }
});
