import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mascotSpace } from '../lib/game/mascot-space.ts';
import { makeLevel } from '../lib/game/levels.ts';
void test('a central open square gets a mascot; occupied and tiny boards do not', () => {
  assert.equal(mascotSpace(makeLevel(1, 'challenge')), null);
  const l = makeLevel(31, 'challenge'),
    space = mascotSpace(l);
  assert.ok(space);
  assert.ok(space.side >= 7);
  const blocked = {
    ...l,
    arrows: [
      ...l.arrows,
      {
        id: 999,
        points: [
          [21, 21],
          [21, 22],
        ],
      },
    ],
  };
  assert.equal(mascotSpace(blocked), null);
});
void test('every mascot footprint stays inside originally empty cells across the 300 levels', () => {
  let count = 0;
  for (let id = 1; id <= 300; id++) {
    const l = makeLevel(id, 'challenge'),
      s = mascotSpace(l);
    if (!s) continue;
    count++;
    const cells = l.arrows.flatMap((a) => a.points);
    assert.ok(
      !cells.some(
        ([x, y]) =>
          x >= s.x && x < s.x + s.side && y >= s.y && y < s.y + s.side,
      ),
    );
  }
  assert.ok(count > 0 && count < 300);
});
