import test from 'node:test';
import assert from 'node:assert/strict';
import { blockers, direction, type Level } from '../lib/game/engine.ts';
import {
  challengeLevel,
  challengeInfo,
  CHALLENGE_COUNT,
} from '../lib/game/challenge-levels.ts';

type RescueLevel = Level & {
  objective?: { type: 'rescue'; targets: number[]; moves: number };
};
function closure(level: Level, targets: number[]) {
  const required = new Set<number>();
  function visit(id: number) {
    if (required.has(id)) return;
    required.add(id);
    blockers(level, [], id).forEach(visit);
  }
  targets.forEach(visit);
  return required;
}
function solveAll(level: Level) {
  const removed: number[] = [];
  while (removed.length < level.arrows.length) {
    const free = level.arrows.filter(
      (a) => !removed.includes(a.id) && !blockers(level, removed, a.id).length,
    );
    assert.ok(free.length, `unsolvable level ${level.id}`);
    removed.push(...free.map((a) => a.id));
  }
}

void test('thirty stable bilingual levels introduce a real target objective early', () => {
  assert.equal(CHALLENGE_COUNT, 30);
  const layouts = new Set<string>();
  for (let id = 1; id <= CHALLENGE_COUNT; id++) {
    const level = challengeLevel(id);
    assert.deepEqual(level, challengeLevel(id));
    assert.equal(level.id, id);
    assert.equal(level.campaign, 'challenge');
    layouts.add(
      JSON.stringify([
        level.size,
        level.arrows,
        (level as RescueLevel).objective,
      ]),
    );
    const info = challengeInfo(id);
    assert.ok(info.title.every(Boolean) && info.focus.every(Boolean));
  }
  assert.equal(layouts.size, 30);
  assert.ok(
    (challengeLevel(4) as RescueLevel).objective,
    'first target lesson must appear before level 8',
  );
  assert.equal(challengeInfo(8).tier, 'hard');
  assert.equal(challengeLevel(100).id, 30);
  assert.equal(challengeLevel(NaN).id, 1);
});

void test('every static board has valid disjoint geometry and a full geometric/key solution', () => {
  for (let id = 1; id <= CHALLENGE_COUNT; id++) {
    const level = challengeLevel(id);
    assert.ok(level.size >= 6 && level.size <= 19, `mobile scale ${id}`);
    assert.ok(
      level.arrows.length >= 5 && level.arrows.length <= 50,
      `click budget ${id}`,
    );
    const cells = new Set<string>(),
      ids = new Set<number>();
    for (const a of level.arrows) {
      assert.ok(!ids.has(a.id));
      ids.add(a.id);
      assert.ok(a.points.length >= 2);
      const [dx, dy] = direction(a),
        [hx, hy] = a.points.at(-1)!;
      a.points.forEach(([x, y], i) => {
        assert.ok(
          Number.isInteger(x) &&
            Number.isInteger(y) &&
            x >= 0 &&
            y >= 0 &&
            x < level.size &&
            y < level.size,
        );
        assert.ok(!cells.has(`${x},${y}`), `overlap ${id}`);
        cells.add(`${x},${y}`);
        assert.ok(
          !(dx ? y === hy && (x - hx) * dx > 0 : x === hx && (y - hy) * dy > 0),
          `self-ray ${id}`,
        );
        if (i)
          assert.equal(
            Math.abs(x - a.points[i - 1][0]) + Math.abs(y - a.points[i - 1][1]),
            1,
          );
      });
      if (a.lock)
        assert.ok(
          level.arrows.some((k) => k.key === a.lock),
          `missing key ${id}`,
        );
    }
    solveAll(level);
  }
});

void test('rescue puzzles have useful and irrelevant legal choices, attainable budgets and nonredundant targets', () => {
  let rescueCount = 0,
    multiCount = 0;
  for (let id = 1; id <= CHALLENGE_COUNT; id++) {
    const level = challengeLevel(id) as RescueLevel,
      goal = level.objective;
    if (!goal) continue;
    rescueCount++;
    assert.equal(goal.type, 'rescue');
    assert.ok(goal.targets.length >= 1 && goal.targets.length <= 3);
    assert.equal(new Set(goal.targets).size, goal.targets.length);
    for (const target of goal.targets)
      assert.ok(level.arrows.some((a) => a.id === target));
    const required = closure(level, goal.targets);
    assert.ok(
      required.size > goal.targets.length,
      `target requires observation ${id}`,
    );
    assert.ok(
      Number.isInteger(goal.moves) &&
        goal.moves >= required.size &&
        goal.moves < level.arrows.length,
      `meaningful budget ${id}`,
    );
    const free = level.arrows.filter((a) => !blockers(level, [], a.id).length);
    assert.ok(
      free.some((a) => required.has(a.id)),
      `no relevant entry ${id}`,
    );
    assert.ok(
      free.some((a) => !required.has(a.id)),
      `no irrelevant choice ${id}`,
    );
    for (const target of goal.targets) {
      const one = closure(level, [target]);
      assert.ok(
        goal.targets.every((other) => other === target || !one.has(other)),
        `redundant target ${id}`,
      );
    }
    if (goal.targets.length > 1) multiCount++;
    const removed: number[] = [];
    while (!goal.targets.every((t) => removed.includes(t))) {
      const a = level.arrows.find(
        (a) =>
          required.has(a.id) &&
          !removed.includes(a.id) &&
          !blockers(level, removed, a.id).length,
      );
      assert.ok(a, `target deadlock ${id}`);
      removed.push(a.id);
    }
    assert.equal(removed.length, required.size);
    assert.ok(
      removed.length <= goal.moves && removed.length < level.arrows.length,
    );
  }
  assert.ok(
    rescueCount >= 12 && rescueCount <= 20,
    'campaign must alternate objectives and clear boards',
  );
  assert.ok(
    multiCount >= 6,
    'multiple targets must be practiced beyond the first lesson',
  );
});

void test('campaign varies goals and path reading without treating every sixth level as a large peak', () => {
  const kinds = new Set<string>(),
    shapes = new Set<string>();
  let reliefs = 0,
    long = 0,
    keyedGoals = 0;
  for (let id = 4; id <= CHALLENGE_COUNT; id++) {
    const level = challengeLevel(id) as RescueLevel,
      info = challengeInfo(id);
    kinds.add(info.kind);
    shapes.add(info.shape);
    if (info.tier === 'relief') {
      reliefs++;
      assert.ok(!level.objective);
      assert.ok(level.arrows.length <= 20);
    }
    if (info.kind === 'long') {
      long++;
      assert.ok(
        level.arrows.reduce((n, a) => n + a.points.length, 0) /
          level.arrows.length >=
          6,
      );
    }
    if (level.objective && level.arrows.some((a) => a.key)) keyedGoals++;
  }
  assert.ok(reliefs >= 4 && long >= 3 && keyedGoals >= 4);
  assert.ok(kinds.size >= 4 && shapes.size >= 5);
  assert.equal(challengeInfo(6).tier, 'relief');
  assert.equal(challengeInfo(9).tier, 'relief');
});

void test('cross-gap lessons put a real far-side blocker on a starred exit', () => {
  for (const id of [8, 15, 22]) {
    const level = challengeLevel(id),
      center = (level.size - 1) / 2;
    const inGap = (x: number, y: number) =>
      id === 15
        ? Math.abs(x - center) < 2
        : Math.max(Math.abs(x - center), Math.abs(y - center)) <
          Math.ceil(level.size * 0.25);
    const targets = level.objective!.targets.map((t) =>
      level.arrows.find((a) => a.id === t)!,
    );
    const crossing = targets.some((a) => {
      const [hx, hy] = a.points.at(-1)!,
        [dx, dy] = direction(a);
      return level.arrows.some(
        (b) =>
          b.id !== a.id &&
          b.points.some(([x, y]) => {
            const distance = (x - hx) * dx + (y - hy) * dy;
            if (distance <= 0 || (dx ? y !== hy : x !== hx)) return false;
            return Array.from({ length: distance - 1 }, (_, i) => i + 1).some(
              (step) => inGap(hx + dx * step, hy + dy * step),
            );
          }),
      );
    });
    assert.ok(
      crossing,
      `level ${id} must require tracing a star across the gap`,
    );
    if (id === 15) {
      assert.ok(targets.some((a) => a.points.at(-1)![0] < center));
      assert.ok(targets.some((a) => a.points.at(-1)![0] > center));
    }
  }
});
