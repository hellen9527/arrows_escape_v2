import type { Level } from './engine.ts';
import { challengeData } from './challenge-data.ts';

export const CHALLENGE_COUNT = 30;
type ChallengeInfo = {
  title: [string, string];
  focus: [string, string];
  tier: 'tutorial' | 'normal' | 'relief' | 'hard';
};

// Briefs describe observations to practice, never imply a legal move can lose.
const briefs: [string, string, string, string][] = [
  [
    '初见出口',
    'First Exit',
    '从箭头尖端沿直线看向边界。',
    'Trace a straight line from each arrowhead to the edge.',
  ],
  [
    '顺藤摸瓜',
    'Follow the Trail',
    '被挡住时，先看看挡路的箭头能否离开。',
    'When an exit is blocked, inspect the arrow in its way.',
  ],
  [
    '一箭多解',
    'One Opens Many',
    '找出同时挡住几条路线的箭头。',
    'Look for an arrow blocking several exit routes.',
  ],
  [
    '弯处看直',
    'Past the Bend',
    '线条可以转弯，离场方向只看最后一段。',
    'Paths bend; the final segment determines the exit direction.',
  ],
  [
    '两路相会',
    'Routes Meet',
    '沿两条被挡的路线，寻找共同的阻挡者。',
    'Trace two blocked routes to a shared blocker.',
  ],
  [
    '第一道关',
    'First Summit',
    '分清出口与后续分支，逐层拆开整张图。',
    'Find the exits, then follow the branches they release.',
  ],
  [
    '缓步前行',
    'A Breather',
    '回到较小的图，重新练习从尖端观察。',
    'Return to a smaller board and read each arrowhead.',
  ],
  [
    '远端来客',
    'Across the Board',
    '别漏看远处的线段：整条射线都要畅通。',
    'Check distant segments too: the entire exit ray must be clear.',
  ],
  [
    '多重门槛',
    'Several Gates',
    '有些箭头需要多个阻挡者都离开。',
    'Some arrows must wait for more than one blocker to leave.',
  ],
  [
    '交会之间',
    'At the Junction',
    '比较几条路线，找出重复出现的阻挡者。',
    'Compare exit routes for blockers they have in common.',
  ],
  [
    '接力向前',
    'Relay',
    '每次离场后，再检查刚露出的出口。',
    'After a removal, check the exits that have just opened.',
  ],
  [
    '第二道关',
    'Second Summit',
    '把长依赖链拆成几段，逐段找到出口。',
    'Break long dependencies into smaller sections and find their exits.',
  ],
  [
    '舒展视线',
    'Open Space',
    '留意空白，让视线沿直线穿过棋盘。',
    'Use the open space to trace straight exit rays.',
  ],
  [
    '折线背后',
    'Behind the Turns',
    '沿箭头的射线查找线身，而不只看其他尖端。',
    'Look for path bodies on an exit ray, not only arrowheads.',
  ],
  [
    '双向观察',
    'Look Both Ways',
    '比较不同朝向的出口，各自追溯阻挡关系。',
    'Compare exits facing different directions and trace their blockers.',
  ],
  [
    '层层展开',
    'Unfolding Layers',
    '观察一层移除后，哪些新分支同时打开。',
    'Watch which branches open together after a layer is removed.',
  ],
  [
    '牵一发动',
    'Shared Release',
    '找出牵连多条路线的节点，再看它的出口。',
    'Find a shared blocker, then inspect its own exit.',
  ],
  [
    '第三道关',
    'Third Summit',
    '在更深的依赖中，始终从当前可走的出口下手。',
    'Work through deeper dependencies from the exits available now.',
  ],
  [
    '短暂停靠',
    'A Short Rest',
    '在较少的箭头中，练习完整扫描一条射线。',
    'With fewer arrows, practice scanning an entire exit ray.',
  ],
  [
    '分支接棒',
    'Branch Relay',
    '先找出口，再观察它影响的多条后续路线。',
    'Find an exit and inspect the routes that depend on it.',
  ],
  [
    '近远之间',
    'Near and Far',
    '近处变空后，也要检查同方向更远的阻挡。',
    'When a nearby blocker leaves, check farther along the same ray.',
  ],
  [
    '织网寻路',
    'Through the Weave',
    '把弯曲线身与直线离场方向分开观察。',
    'Read the curved path separately from its straight exit ray.',
  ],
  [
    '层间转身',
    'Changing Layers',
    '移除一层后重新扫描四个方向。',
    'Rescan all four directions as each layer opens.',
  ],
  [
    '第四道关',
    'Fourth Summit',
    '在多条依赖之间切换，逐步疏通共享出口。',
    'Move between dependency branches and clear their shared blockers.',
  ],
  [
    '蓄力再行',
    'Gather Your Focus',
    '用一张较小的图，重温多重阻挡与共享节点。',
    'Revisit multiple blockers and shared dependencies on a smaller board.',
  ],
  [
    '长线追踪',
    'Long Traces',
    '从一个被挡住的箭头向外追，直到找到可走的箭头。',
    'Trace outward from a blocked arrow until you reach a clear exit.',
  ],
  [
    '分路汇流',
    'Branches Converge',
    '观察不同路线何时汇到同一个阻挡者。',
    'Notice where different routes converge on the same blocker.',
  ],
  [
    '深处见光',
    'Light in the Layers',
    '耐心检查长依赖链中的每一条离场射线。',
    'Inspect each exit ray carefully through the deeper layers.',
  ],
  [
    '终关之前',
    'Before the Summit',
    '让新打开的出口引导下一次观察。',
    'Let newly opened exits guide the next route you inspect.',
  ],
  [
    '最后一道关',
    'Final Summit',
    '综合射线、多重阻挡与分支观察，清空最后一图。',
    'Combine ray tracing, multiple blockers and branching to clear the final board.',
  ],
];

function normalizedId(requested: number) {
  return Math.max(1, Math.min(CHALLENGE_COUNT, Math.floor(requested) || 1));
}

export function challengeInfo(requested: number): ChallengeInfo {
  const id = normalizedId(requested);
  const [zhTitle, enTitle, zhFocus, enFocus] = briefs[id - 1];
  return {
    title: [zhTitle, enTitle],
    focus: [zhFocus, enFocus],
    tier:
      id <= 3
        ? 'tutorial'
        : id % 6 === 0
          ? 'hard'
          : id % 6 === 1
            ? 'relief'
            : 'normal',
  };
}

export function challengeLevel(requested: number): Level {
  const id = normalizedId(requested);
  const data = challengeData[id - 1];
  return {
    id,
    campaign: 'challenge',
    size: data.size,
    arrows: data.paths.map((points, index) => ({
      id: index,
      points: points.map((point) => [...point]),
    })),
  };
}
