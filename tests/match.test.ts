import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchLevels,
  collect,
  replay,
  solve,
  type MatchLevel,
} from '../lib/experiments/match.ts';
const fixture: MatchLevel = {
  id: 1,
  size: 15,
  arrows: Array.from({ length: 12 }, (_, id) => ({
    id,
    points: [
      [id, 1],
      [id, 0],
    ],
  })),
  colors: Object.fromEntries(
    Array.from({ length: 12 }, (_, id) => [id, Math.floor(id / 3)]),
  ),
  witness: [],
  title: 'test',
  note: 'test',
};
void test('three matching arrows clear before capacity is checked', () => {
  const s = replay(fixture, [0, 3, 4, 6, 7, 1]);
  assert.equal(s.tray.length, 6);
  const n = collect(fixture, s, 2);
  assert.equal(n.tray.length, 4);
  assert.equal(n.status, 'playing');
});
void test('a legal choice can fill the tray and undo restores play', () => {
  const moves = [0, 3, 6, 9, 1, 4, 7];
  const s = replay(fixture, moves);
  assert.equal(s.status, 'lost');
  assert.equal(replay(fixture, moves.slice(0, -1)).status, 'playing');
  assert.deepEqual(collect(fixture, s, 10), s);
  const path = solve(fixture, replay(fixture, []));
  assert.ok(path);
  assert.equal(replay(fixture, path).status, 'won');
});
void test('blocked, duplicate and invalid IDs never enter the tray', () => {
  const l = {
    ...fixture,
    arrows: [
      {
        id: 0,
        points: [
          [0, 1],
          [0, 0],
        ],
      },
      {
        id: 1,
        points: [
          [0, 3],
          [0, 2],
        ],
      },
    ],
  };
  const s = replay(l, []);
  assert.deepEqual(collect(l, s, 1), s);
  assert.deepEqual(collect(l, s, 999), s);
  const n = collect(l, s, 0);
  assert.deepEqual(collect(l, n, 0), n);
});
void test('all six fixed boards have a winning witness and solver route', () => {
  assert.equal(matchLevels.length, 6);
  for (const l of matchLevels) {
    assert.equal(replay(l, l.witness).status, 'won', l.title);
    const path = solve(l, replay(l, []));
    assert.ok(path, l.title);
    assert.equal(replay(l, path).status, 'won', l.title);
  }
});
