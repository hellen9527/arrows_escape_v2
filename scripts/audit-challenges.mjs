/** Structural audit, not an estimate of human difficulty or pass rate.
 * Samples legal goal-directed orders and records all legal exits along the way.
 * Usage: node --experimental-strip-types scripts/audit-challenges.mjs [--baseline path.json]
 */
import fs from 'node:fs';
import { challengeData } from '../lib/game/challenge-data.ts';
import { blockers, requiredArrowIds } from '../lib/game/engine.ts';

function audit(data) {
  return data.map((row) => {
    const level = {
      id: row.id,
      size: row.size,
      campaign: 'challenge',
      objective: row.objective,
      arrows: row.paths.map((points, id) => ({
        id,
        points,
        key: row.keys[id],
        lock: row.locks[id],
      })),
    };
    const deps = level.arrows.map((a) => blockers(level, [], a.id));
    const memo = new Map();
    const depth = (id) => {
      if (!memo.has(id)) memo.set(id, 1 + Math.max(0, ...deps[id].map(depth)));
      return memo.get(id);
    };
    const required = requiredArrowIds(level),
      relevant = new Set(required);
    const opening = level.arrows.filter((a) => !deps[a.id].length);
    const samples = { quarter: [], half: [] };
    let maxSingleRun = 0;
    for (let trial = 0; trial < 64; trial++) {
      let state = row.id * 104729 + trial * 7919,
        singleRun = 0;
      const removed = [];
      for (let step = 0; step < required.length; step++) {
        const free = level.arrows.filter(
          (a) =>
            !removed.includes(a.id) && !blockers(level, removed, a.id).length,
        );
        const useful = free.filter((a) => relevant.has(a.id));
        if (!useful.length) throw Error(`No target solution ${row.id}`);
        if (step < required.length * 0.75) {
          singleRun = useful.length === 1 ? singleRun + 1 : 0;
          maxSingleRun = Math.max(maxSingleRun, singleRun);
        }
        for (const [key, proportion] of [
          ['quarter', 0.25],
          ['half', 0.5],
        ]) {
          if (step === Math.floor(required.length * proportion)) {
            samples[key].push({
              total: free.length,
              relevant: useful.length,
              remaining: level.arrows.length - removed.length,
            });
          }
        }
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        removed.push(useful[state % useful.length].id);
      }
    }
    const summarize = (list) => {
      const sorted = list.map((x) => x.total).sort((a, b) => a - b);
      const useful = list.map((x) => x.relevant).sort((a, b) => a - b);
      return {
        min: sorted[0],
        median: sorted[32],
        max: sorted.at(-1),
        relevantMedian: useful[32],
        remaining: list[0].remaining,
      };
    };
    return {
      id: row.id,
      arrows: level.arrows.length,
      exits: opening.length,
      openingPercent: Math.round((opening.length / level.arrows.length) * 100),
      relevantExits: opening.filter((a) => relevant.has(a.id)).length,
      goals: row.objective?.targets.length || 0,
      keys: Object.keys(row.keys).length,
      required: required.length,
      depth: Math.max(...required.map(depth)),
      slack: row.objective ? row.objective.moves - required.length : null,
      quarter: summarize(samples.quarter),
      half: summarize(samples.half),
      maxSingleRun,
    };
  });
}
const baselineIndex = process.argv.indexOf('--baseline');
const before =
  baselineIndex >= 0
    ? audit(
        JSON.parse(fs.readFileSync(process.argv[baselineIndex + 1], 'utf8')),
      )
    : undefined;
console.log(
  JSON.stringify(
    {
      method:
        '64 seeded legal goal-directed routes; checkpoints by required removals, not time. All exits include optional moves. Structural observations only.',
      before,
      after: audit(challengeData),
    },
    null,
    2,
  ),
);
