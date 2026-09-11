import type { Level } from './engine.ts';
import { tutorialData } from './tutorial-data.ts';
export const tutorialInfo = [
  {
    title: ['看箭头尖端', 'Follow the tip'],
    focus: [
      '点击箭头，让它沿尖端方向离开。',
      'Tap an arrow to send it in the direction of its tip.',
    ],
  },
  {
    title: ['转弯的是线身', 'Bends and directions'],
    focus: [
      '沿线找到尖端。弯曲的箭头也只沿尖端方向直线离开。',
      'Trace the line to its tip. Even a bent arrow exits in a straight line.',
    ],
  },
  {
    title: ['追到挡路的源头', 'Trace the blocker'],
    focus: [
      '前方有线身就走不了。先找到挡路箭头的出口。',
      'A body in front blocks the exit. Trace that arrow to find its opening.',
    ],
  },
  {
    title: ['一次打开两条路', 'Open two paths'],
    focus: [
      '有些箭头同时挡着两条路线。移走它，观察哪里变通了。',
      'Some arrows block two routes at once. Free one and watch the paths open.',
    ],
  },
  {
    title: ['只送走星标', 'Rescue the star'],
    focus: [
      '送走星标即可过关，普通箭头可以留下。沿星标出口追踪真正的阻挡。',
      'Free the star to win. Ordinary arrows may stay; trace the star’s blockers.',
    ],
  },
  {
    title: ['把步数留给目标', 'Spend moves on the goal'],
    focus: [
      '两颗星都要送走。成功移除用一步；点了无关箭头，可以撤销并退回步数。',
      'Rescue both stars. Each removal costs one move. Undo an irrelevant move to refund it.',
    ],
  },
  {
    title: ['开锁后再看出口', 'A key is one condition'],
    focus: [
      '金色 A 钥匙离开后，紫色 A 锁打开；仍要检查前方有没有线身。',
      'Free the gold A key to open violet A locks. Then check the exit for physical blockers.',
    ],
  },
  {
    title: ['两把钥匙接力', 'Two keys'],
    focus: [
      '相同字母配对。这里先取 A 才能开 B 钥匙的锁；查看锁不扣心。',
      'Match the letters. Here A unlocks the B key. Inspecting a lock costs no heart.',
    ],
  },
];
export function tutorialLevel(id: number): Level {
  const data = tutorialData[Math.max(1, Math.min(8, id)) - 1];
  return {
    id: data.id,
    size: data.size,
    campaign: 'challenge',
    tutorial: true,
    arrows: data.paths.map((points, index) => ({
      id: index,
      points: points.map((p) => [...p]),
      ...(data.keys[index] ? { key: data.keys[index] } : {}),
      ...(data.locks[index] ? { lock: data.locks[index] } : {}),
    })),
    ...(data.objective
      ? {
          objective: {
            ...data.objective,
            targets: [...data.objective.targets],
          },
        }
      : {}),
  };
}
