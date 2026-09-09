import test from 'node:test';
import assert from 'node:assert/strict';
import { blockers, direction } from '../lib/game/engine.ts';
import type { Level } from '../lib/game/engine.ts';

async function api() {
  const campaignModule = await import('../lib/game/challenge-levels.ts').catch(
    () => null,
  );
  assert.ok(campaignModule, 'The static challenge campaign must exist');
  return campaignModule;
}

function waves(level: Level) {
  const removed: number[] = [];
  const result: number[][] = [];
  while (removed.length < level.arrows.length) {
    const free = level.arrows
      .filter(
        (a) =>
          !removed.includes(a.id) &&
          blockers(level, removed, a.id).length === 0,
      )
      .map((a) => a.id);
    assert.ok(free.length, `Challenge ${level.id} has a dependency cycle`);
    result.push(free);
    removed.push(...free);
  }
  return result;
}

void test('challenge campaign contains exactly 30 original stable layouts and bilingual briefs', async () => {
  const { CHALLENGE_COUNT, challengeLevel, challengeInfo } = await api();
  assert.equal(CHALLENGE_COUNT, 30);
  const layouts = new Set<string>();
  for (let id = 1; id <= 30; id++) {
    const level = challengeLevel(id);
    assert.equal(level.id, id);
    assert.equal(level.campaign, 'challenge');
    assert.deepEqual(level, challengeLevel(id));
    layouts.add(JSON.stringify([level.size, level.arrows]));
    const info = challengeInfo(id);
    assert.ok(info.title.every((s) => s.length > 0));
    assert.ok(info.focus.every((s) => s.length > 0));
    assert.equal(info.title.length, 2);
    assert.equal(info.focus.length, 2);
  }
  assert.equal(layouts.size, 30);
  assert.equal(challengeLevel(0).id, 1);
  assert.equal(challengeLevel(100).id, 30);
  assert.equal(challengeLevel(NaN).id, 1);
});

void test('all challenge arrows have disjoint adjacent paths, readable boards and a complete solution', async () => {
  const { challengeLevel } = await api();
  for (let id = 1; id <= 30; id++) {
    const level = challengeLevel(id);
    assert.ok(level.size >= 6 && level.size <= 13, `board ${id}`);
    assert.ok(level.arrows.length >= (id <= 3 ? 5 : 12), `arrow count ${id}`);
    assert.ok(level.arrows.length <= (id <= 3 ? 10 : 40), `arrow count ${id}`);
    const cells = new Set<string>();
    const ids = new Set<number>();
    for (const arrow of level.arrows) {
      assert.ok(!ids.has(arrow.id));
      ids.add(arrow.id);
      assert.ok(arrow.points.length >= 2);
      const [dx, dy] = direction(arrow);
      const [hx, hy] = arrow.points.at(-1)!;
      for (let index = 0; index < arrow.points.length; index++) {
        const [x, y] = arrow.points[index];
        assert.ok(
          Number.isInteger(x) &&
            Number.isInteger(y) &&
            x >= 0 &&
            y >= 0 &&
            x < level.size &&
            y < level.size,
        );
        assert.ok(!cells.has(`${x},${y}`), `overlap in ${id}`);
        cells.add(`${x},${y}`);
        assert.ok(
          !(dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0),
          `self-ray in ${id}`,
        );
        if (index) {
          const [px, py] = arrow.points[index - 1];
          assert.equal(Math.abs(px - x) + Math.abs(py - y), 1);
        }
      }
    }
    waves(level);
  }
});

void test('challenge pacing has tutorial, relief and progressively deeper six-level peaks', async () => {
  const { challengeLevel, challengeInfo } = await api();
  for (let id = 1; id <= 3; id++)
    assert.equal(challengeInfo(id).tier, 'tutorial');
  for (const id of [7, 13, 19, 25]) {
    assert.equal(challengeInfo(id).tier, 'relief');
    assert.ok(
      waves(challengeLevel(id)).length < waves(challengeLevel(id - 1)).length,
    );
    assert.ok(
      challengeLevel(id).arrows.length < challengeLevel(id - 1).arrows.length,
    );
  }
  for (const [index, id] of [6, 12, 18, 24, 30].entries()) {
    assert.equal(challengeInfo(id).tier, 'hard');
    assert.ok(
      waves(challengeLevel(id)).length >= [7, 9, 10, 12, 14][index],
      `peak depth ${id}`,
    );
  }
});

void test('non-tutorial challenges limit opening choices and contain branching dependencies', async () => {
  const { challengeLevel } = await api();
  for (let id = 4; id <= 30; id++) {
    const level = challengeLevel(id);
    const layers = waves(level);
    assert.ok(
      layers[0].length >= 2 && layers[0].length <= 5,
      `opening choices ${id}: ${layers[0].length}`,
    );
    assert.ok(
      layers.length >= 5 && layers.length <= 16,
      `dependency depth ${id}: ${layers.length}`,
    );
    assert.ok(
      layers.some((layer) => layer.length >= 3),
      `branching wave ${id}`,
    );
    const deps = level.arrows.map((a) => blockers(level, [], a.id));
    assert.ok(
      deps.filter((d) => d.length >= 2).length >= 3,
      `merging dependencies ${id}`,
    );
    assert.ok(
      level.arrows.some(
        (a) => deps.filter((d) => d.includes(a.id)).length >= 3,
      ),
      `shared blocker ${id}`,
    );
    assert.ok(
      layers.filter((layer) => layer.length === 1).length <=
        Math.ceil(layers.length * 0.6),
      `too linear ${id}`,
    );
    let consecutiveForcedWaves = 0;
    for (const layer of layers) {
      consecutiveForcedWaves =
        layer.length === 1 ? consecutiveForcedWaves + 1 : 0;
      assert.ok(consecutiveForcedWaves <= 3, `long forced-only stretch ${id}`);
    }
  }
});
