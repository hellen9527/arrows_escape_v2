import type { Level } from './engine.ts';
import { challengeData } from './challenge-data.ts';

export const CHALLENGE_COUNT = 30;
type ChallengeInfo = {
  title: [string, string];
  focus: [string, string];
  tier: 'tutorial' | 'normal' | 'relief' | 'hard';
  kind: 'tutorial' | 'weave' | 'long' | 'keys' | 'rush' | 'relief';
  shape: string;
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
    '菱间穿梭',
    'Diamond Weave',
    '菱形边缘藏着出口，沿尖端找到交错线条的空隙。',
    'Read the diamond edges and find exits between interwoven paths.',
  ],
  [
    '第一把钥匙',
    'The First Key',
    '移走钥匙 A，打开同字母的锁；解锁后仍需出口畅通。',
    'Remove key A to unlock its group; unlocked arrows still need a clear exit.',
  ],
  [
    '沙漏急流',
    'Hourglass Rush',
    '38 支短箭头汇入窄腰，分区观察并打开成片出口。',
    'Read 38 short arrows around the narrow waist and open groups of exits.',
  ],
  [
    '小小菱光',
    'A Small Diamond',
    '放慢一步：只有 12 支箭头，逐一看清出口。',
    'Take a breath with just 12 arrows and read each exit.',
  ],
  [
    '环中留白',
    'Around the Ring',
    '中间虽空，射线仍可能撞上对面的环壁。',
    'The center is empty, but an exit ray can meet the opposite rim.',
  ],
  [
    '展翅',
    'Open Wings',
    '在两侧翼面间切换，寻找能连续释放的出口。',
    'Switch between the wings and follow newly released exits.',
  ],
  [
    '长线初探',
    'Long Ribbons',
    '18 条长线横跨棋盘；先认尖端，再沿直线找出口。',
    'Trace 18 long ribbons: locate the head, then inspect its straight exit.',
  ],
  [
    '十字钥门',
    'Crossroads Key',
    '先疏通钥匙的出口，再展开整组上锁的路线。',
    'Clear the key’s exit, then work through the group it unlocks.',
  ],
  [
    '六十环流',
    'Sixty on the Ring',
    '60 支短箭头围成大环，按出口分支逐片清空。',
    'Clear a ring of 60 short arrows by following its exit branches.',
  ],
  [
    '沙漏小憩',
    'Hourglass Pause',
    '回到 16 支箭头的小沙漏，重新寻找清晰的第一步。',
    'Return to a small hourglass of 16 arrows and find a clear first move.',
  ],
  [
    '双岛相望',
    'Twin Islands',
    '两岛之间有留白，但直线出口仍可能互相阻挡。',
    'Space separates the islands, while straight exit rays can connect them.',
  ],
  [
    '菱面密织',
    'Diamond Mesh',
    '短线更密，逐条检查近处和远处的阻挡。',
    'Read a denser diamond and check both nearby and distant blockers.',
  ],
  [
    '回环长卷',
    'Ribbon Ring',
    '24 条长线绕过空心，把线身与离场方向分开观察。',
    'Follow 24 long ribbons around the void and distinguish bodies from exit rays.',
  ],
  [
    '双翼双钥',
    'Two Wings, Two Keys',
    '分别找到 A、B 两把钥匙，观察它们各自打开的路线。',
    'Find keys A and B and read the routes each group unlocks.',
  ],
  [
    '十字高峰',
    'Crossroads Summit',
    '64 支箭头与两组钥门；分段疏通，再展开中央交会。',
    'Work through 64 arrows and two key groups around a broad central crossing.',
  ],
  [
    '轻装再行',
    'Travel Light',
    '18 支箭头组成小菱形，让视线和节奏都慢下来。',
    'Slow the pace with 18 arrows in a small diamond.',
  ],
  [
    '窄腰交会',
    'Through the Waist',
    '宽阔两端由窄腰连接，留意跨区的直线阻挡。',
    'Read the broad ends and narrow waist for blockers across the board.',
  ],
  [
    '环壁接力',
    'Rim Relay',
    '62 支短箭头沿环壁接力，空心也属于射线的一部分。',
    'Follow 62 short arrows around the rim; exit rays cross the empty center.',
  ],
  [
    '双岛长航',
    'Island Ribbons',
    '28 条长线分布双岛，远处线身也会挡住出口。',
    'Read 28 long ribbons on two islands and check distant path bodies.',
  ],
  [
    '菱中连锁',
    'Diamond Key Relay',
    '钥匙 A 打开下一阶段，继续找到 B 并疏通剩余路线。',
    'Key A opens the next stage; reach B and clear the remaining routes.',
  ],
  [
    '双翼大开',
    'Great Wings',
    '72 支短箭头与接力钥匙，把大图拆成几片可读区域。',
    'Divide 72 short arrows and staged keys into readable sections.',
  ],
  [
    '十字歇脚',
    'A Crossroads Rest',
    '用 20 支箭头的小十字，重温出口与共享阻挡。',
    'Revisit clear exits and shared blockers on a 20-arrow cross.',
  ],
  [
    '沙漏织网',
    'Hourglass Weave',
    '54 支箭头围绕窄腰编织，沿当前出口逐层展开。',
    'Unpick 54 arrows around the narrow waist from the exits available now.',
  ],
  [
    '群岛流光',
    'Island Rush',
    '68 支短箭头散布双岛，观察一次移除带来的多个新出口。',
    'Read 68 short arrows on twin islands and the exits each removal reveals.',
  ],
  [
    '长卷终章',
    'The Long Ribbon Ring',
    '34 条长线围成大环，耐心追踪尖端与远处线身。',
    'Trace 34 long ribbons around a large ring, checking heads and distant bodies.',
  ],
  [
    '菱门接力',
    'The Diamond Gates',
    '在 64 支箭头中找到两阶段钥匙，让解锁带来新的观察范围。',
    'Find two key stages among 64 arrows and inspect each newly opened group.',
  ],
  [
    '八十交响',
    'Eighty at the Crossroads',
    '80 支箭头、两阶段钥匙与多路分支，逐片清空最后的大十字。',
    'Clear the final cross of 80 arrows, staged keys and branching exit routes.',
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
    kind: challengeData[id - 1].kind as ChallengeInfo['kind'],
    shape: challengeData[id - 1].shape,
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
  const keys: Record<number, string | undefined> = data.keys;
  const locks: Record<number, string | undefined> = data.locks;
  return {
    id,
    campaign: 'challenge',
    size: data.size,
    arrows: data.paths.map((points, index) => ({
      id: index,
      points: points.map((point) => [...point]),
      ...(keys[index] ? { key: keys[index] } : {}),
      ...(locks[index] ? { lock: locks[index] } : {}),
    })),
  };
}
