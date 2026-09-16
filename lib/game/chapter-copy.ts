const challengeTitles = [
  ['目标与共根', 'Goals and common roots'],
  ['真假支路', 'Branches that matter'],
  ['跨区追踪', 'Across the gaps'],
  ['权限与出口', 'Keys and exits'],
  ['双钥接力', 'Two-key connections'],
  ['三颗星的交集', 'Three-star overlaps'],
  ['分区交织', 'Woven regions'],
  ['多次展开', 'Several breakthroughs'],
  ['步数与选择', 'Moves that matter'],
  ['全局解题', 'Bring it together'],
];
const challengeNotes = [
  ['从目标回溯，找到共同阻挡。', 'Trace the targets to their shared blockers.'],
  ['能走的箭头，不一定需要走。', 'A free arrow is not always a needed arrow.'],
  ['留白之后，射线仍会向前延伸。', 'An exit ray continues across every gap.'],
  [
    '开锁和出口畅通，是两个条件。',
    'Unlocking and clearing the exit are separate conditions.',
  ],
  [
    '认字母，也要追踪钥匙的前置。',
    'Match the letters and trace the keys’ prerequisites.',
  ],
  [
    '分清哪些关系共享，哪些只属一星。',
    'Distinguish shared and private prerequisites.',
  ],
  ['沿连续的线，理清不同区域。', 'Follow each line across the regions.'],
  ['每次展开后，重新看看目标。', 'Revisit the goals after each opening.'],
  ['把动作留给确实需要的路线。', 'Spend moves on routes the targets need.'],
  [
    '拆分全局，组合已学过的关系。',
    'Break down the board using what you have learned.',
  ],
];

const continuationTitles = [
  ['再启新程', 'A fresh trail'],
  ['沿线寻根', 'Trace the roots'],
  ['静看交错', 'Study the crossings'],
  ['钥匙之间', 'Between the keys'],
  ['出口相连', 'Connected exits'],
  ['目标在前', 'Targets ahead'],
  ['留白与线', 'Lines and spaces'],
  ['转角寻路', 'Around the bends'],
  ['细看支路', 'Read the branches'],
  ['共赴出口', 'Toward the exits'],
  ['层层理清', 'One layer at a time'],
  ['步步有用', 'Make each move count'],
  ['循线而行', 'Follow the lines'],
  ['远近之间', 'Near and far'],
  ['解开相连', 'Untangle connections'],
  ['从容收束', 'Bring the paths together'],
  ['旅程未尽', 'More to discover'],
];
const continuationNotes = [
  [
    '先看目标，再找挡住它的路线。',
    'Look at the goal, then trace what blocks it.',
  ],
  ['每解开一条线，再观察一次出口。', 'Check the exits again after each move.'],
  [
    '不急着出手，先理清前后关系。',
    'Take a moment to trace what needs to move first.',
  ],
  [
    '找到共同的阻挡，让一步帮助更多目标。',
    'Look for blockers shared by several targets.',
  ],
];

export function chapterLevelIds(
  chapter: number,
  perChapter: number,
  count: number,
): number[] {
  const start = chapter * perChapter + 1;
  return Array.from(
    { length: Math.max(0, Math.min(perChapter, count - start + 1)) },
    (_, i) => start + i,
  );
}

export function clampChapter(
  chapter: number,
  perChapter: number,
  count: number,
): number {
  return Math.max(
    0,
    Math.min(Math.ceil(count / perChapter) - 1, Math.floor(chapter) || 0),
  );
}

export function challengeChapterCopy(count: number) {
  return Array.from({ length: Math.ceil(count / 30) }, (_, index) => ({
    title: challengeTitles[index] ??
      continuationTitles[index - challengeTitles.length] ?? [
        `继续探索 ${index + 1}`,
        `Keep exploring ${index + 1}`,
      ],
    note:
      challengeNotes[index] ??
      continuationNotes[
        (index - challengeNotes.length) % continuationNotes.length
      ],
  }));
}
