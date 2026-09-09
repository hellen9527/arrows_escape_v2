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
          (!(a as { lock?: string }).lock ||
            level.arrows.some(
              (key) =>
                (key as { key?: string }).key ===
                  (a as { lock?: string }).lock && removed.includes(key.id),
            )) &&
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
    assert.ok(level.size >= 6 && level.size <= 23, `board ${id}`);
    assert.ok(level.arrows.length >= (id <= 3 ? 5 : 12), `arrow count ${id}`);
    assert.ok(level.arrows.length <= (id <= 3 ? 10 : 80), `arrow count ${id}`);
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

void test('challenge pacing contrasts short relief boards with large six-level peaks', async () => {
  const { challengeLevel, challengeInfo } = await api();
  for (let id = 1; id <= 3; id++) {
    assert.equal(challengeInfo(id).tier, 'tutorial');
    assert.equal(challengeLevel(id).arrows.length, [5, 7, 9][id - 1]);
  }
  for (const id of [7, 13, 19, 25]) {
    assert.equal(challengeInfo(id).tier, 'relief');
    assert.ok(
      waves(challengeLevel(id)).length < waves(challengeLevel(id - 1)).length,
    );
    assert.ok(
      challengeLevel(id).arrows.length < challengeLevel(id - 1).arrows.length,
    );
    assert.ok(challengeLevel(id).arrows.length <= 20);
    assert.ok(
      challengeLevel(id - 1).arrows.length >=
        challengeLevel(id).arrows.length * 2.5,
    );
  }
  for (const [index, id] of [6, 12, 18, 24, 30].entries()) {
    assert.equal(challengeInfo(id).tier, 'hard');
    assert.ok(
      waves(challengeLevel(id)).length >= [7, 9, 10, 11, 12][index],
      `peak depth ${id}`,
    );
    assert.ok(
      challengeLevel(id).arrows.length >= [36, 56, 62, 70, 78][index],
      `peak scale ${id}`,
    );
  }
});

void test('non-tutorial challenges limit opening choices and contain branching dependencies', async () => {
  const { challengeLevel } = await api();
  for (let id = 4; id <= 30; id++) {
    const level = challengeLevel(id);
    const layers = waves(level);
    assert.ok(
      layers[0].length >= 2 && layers[0].length <= 12,
      `opening choices ${id}: ${layers[0].length}`,
    );
    assert.ok(
      layers.length >= 4 && layers.length <= 24,
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

void test('long-path chapters change the visual grammar and every chapter has a distinct silhouette', async () => {
  const { challengeLevel, challengeInfo } = await api();
  const shapes = new Set<string>();
  for (let id = 4; id <= 30; id++) {
    const level = challengeLevel(id);
    const info = challengeInfo(id) as ReturnType<typeof challengeInfo> & {
      kind?: string;
      shape?: string;
    };
    assert.ok(info.shape, `shape metadata ${id}`);
    shapes.add(info.shape);
    const average =
      level.arrows.reduce((n, a) => n + a.points.length, 0) /
      level.arrows.length;
    if ([10, 16, 22, 28].includes(id)) {
      assert.equal(info.kind, 'long');
      assert.ok(
        average >= 6 && average <= 9,
        `long path average ${id}: ${average}`,
      );
      assert.ok(
        level.arrows.filter((a) => a.points.length >= 8).length >=
          level.arrows.length / 3,
        `long paths ${id}`,
      );
    } else if (level.arrows.length >= 40) {
      assert.ok(
        average >= 2.5 && average <= 4.5,
        `dense short paths ${id}: ${average}`,
      );
    }
    const c = (level.size - 1) / 2;
    const inside = (x: number, y: number) => {
      const dx = Math.abs(x - c),
        dy = Math.abs(y - c);
      switch (info.shape) {
        case 'diamond':
          return dx + dy <= Math.floor(level.size * 0.67);
        case 'ring':
          return Math.max(dx, dy) >= Math.ceil(level.size * 0.25);
        case 'hourglass':
          return dx <= Math.max(Math.ceil(level.size * 0.17), dy + 1);
        case 'cross':
          return Math.min(dx, dy) <= Math.floor(level.size * 0.23);
        case 'wings':
          return !(
            dx <= Math.floor(level.size * 0.12) &&
            dy > Math.floor(level.size * 0.2)
          );
        case 'islands':
          return dx >= 2;
        default:
          return true;
      }
    };
    let maskCells = 0;
    for (let y = 0; y < level.size; y++)
      for (let x = 0; x < level.size; x++) if (inside(x, y)) maskCells++;
    assert.ok(
      maskCells <= level.size * level.size * 0.88,
      `meaningful negative space ${id}`,
    );
    const points = level.arrows.flatMap((a) => a.points);
    assert.ok(
      points.every(([x, y]) => inside(x, y)),
      `outside silhouette ${id}`,
    );
    assert.ok(
      points.length >= maskCells * 0.35,
      `recognizable shape coverage ${id}`,
    );
    assert.ok(
      Math.max(...points.map(([x]) => x)) -
        Math.min(...points.map(([x]) => x)) >=
        level.size - 3,
      `horizontal spread ${id}`,
    );
    assert.ok(
      Math.max(...points.map(([, y]) => y)) -
        Math.min(...points.map(([, y]) => y)) >=
        level.size - 3,
      `vertical spread ${id}`,
    );
  }
  assert.ok(shapes.size >= 6);
});

void test('key chapters create real staged unlocks with multiple locked arrows and solvable combined dependencies', async () => {
  const { challengeLevel } = await api();
  for (const id of [5, 11, 17, 18, 23, 24, 29, 30]) {
    const level = challengeLevel(id);
    const arrows = level.arrows as (Level['arrows'][number] & {
      key?: string;
      lock?: string;
    })[];
    const keys = arrows.filter((a) => a.key);
    assert.equal(keys.length, id <= 11 ? 1 : 2, `key groups ${id}`);
    assert.equal(new Set(keys.map((a) => a.key)).size, keys.length);
    for (const key of keys) {
      const locks = arrows.filter((a) => a.lock === key.key);
      assert.ok(locks.length >= 3, `meaningful locked group ${id}/${key.key}`);
      assert.ok(
        locks.every((a) => a.id < key.id),
        `key unlock DAG ${id}`,
      );
      if (id !== 5)
        assert.ok(
          blockers(level, [], key.id).length > 0 || key.lock,
          `key requires progress ${id}`,
        );
    }
    assert.ok(
      arrows
        .filter((a) => a.lock)
        .every((a) => keys.some((key) => key.key === a.lock)),
      `missing key ${id}`,
    );
    // Check geometry directly: blockers also includes lock dependencies in the engine.
    const geometricFree = (a: Level['arrows'][number], removed: number[]) => {
      const [dx, dy] = direction(a),
        [hx, hy] = a.points.at(-1)!;
      return !arrows.some(
        (b) =>
          b.id !== a.id &&
          !removed.includes(b.id) &&
          b.points.some(([x, y]) =>
            dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0,
          ),
      );
    };
    let meaningful = false;
    const removed: number[] = [];
    for (const layer of waves(level)) {
      if (
        arrows.some(
          (a) =>
            a.lock &&
            !removed.includes(a.id) &&
            !keys.some(
              (key) => key.key === a.lock && removed.includes(key.id),
            ) &&
            geometricFree(a, removed),
        )
      )
        meaningful = true;
      removed.push(...layer);
    }
    assert.ok(meaningful, `locks must affect a geometrically open arrow ${id}`);
  }
});
