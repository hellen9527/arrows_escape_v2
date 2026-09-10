import type { Level } from './engine.ts';
import { challengeData } from './challenge-data.ts';
import { challengeBriefs } from './challenge-briefs.ts';

export const CHALLENGE_COUNT = challengeBriefs.length;
function normalizedId(requested: number) {
  return Math.max(1, Math.min(CHALLENGE_COUNT, Math.floor(requested) || 1));
}
export function challengeInfo(requested: number) {
  const brief = challengeBriefs[normalizedId(requested) - 1];
  return {
    title: brief.title,
    focus: brief.focus,
    kind: brief.kind,
    shape: brief.shape,
    tier: brief.tier,
  };
}
export function challengeLevel(requested: number): Level {
  const id = normalizedId(requested);
  const data = challengeData[id - 1];
  const keys: Record<number, string | undefined> = data.keys;
  const locks: Record<number, string | undefined> = data.locks;
  return {
    id,
    campaign: 'challenge',
    size: data.size,
    ...(data.objective
      ? {
          objective: {
            ...data.objective,
            targets: [...data.objective.targets],
          },
        }
      : {}),
    arrows: data.paths.map((points, index) => ({
      id: index,
      points: points.map((point) => [...point]),
      ...(keys[index] ? { key: keys[index] } : {}),
      ...(locks[index] ? { lock: locks[index] } : {}),
    })),
  };
}
