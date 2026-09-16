// Authored content pacing hypotheses, not fitted human difficulty scores.
export function expansionProfile(id) {
  if (!Number.isInteger(id) || id < 301 || id > 800)
    throw Error('Expansion ID must be 301–800');
  const step = id - 301,
    chapter = Math.floor(step / 30),
    slot = step % 20;
  const sequence = [
    'shared',
    'detour',
    'spread',
    'shared',
    'keys',
    'spread',
    'detour',
    'keys',
    'shared',
    'clear',
    'spread',
    'shared',
    'keys',
    'detour',
    'spread',
    'keys',
    'shared',
    'detour',
    'keys',
    'clear',
  ];
  const intent = sequence[slot],
    relief = [0, 5, 10, 15].includes(slot),
    hard = [4, 8, 14, 18].includes(slot);
  const target =
    230 + Math.min(24, Math.floor(chapter * 1.5)) + (hard ? 6 : relief ? 0 : 3);
  const style = ['windows', 'bridges', 'folds', 'wings', 'weave'][
    (step + Math.floor(step / 20)) % 5
  ];
  return {
    id,
    recipe: 2,
    target,
    size: Math.ceil(Math.sqrt((target * 12) / 0.65)),
    style,
    intent,
    relief,
    hard,
    depth: 33 + Math.min(6, Math.floor(chapter / 3)) + (hard ? 3 : 0),
    exits: relief ? 7 : hard ? 4 : 5,
    keys: 2,
    targets:
      intent === 'clear' ? 0 : ['detour', 'spread'].includes(intent) ? 2 : 3,
    slack: relief ? 6 : hard ? 2 : 4,
    goalRatio:
      intent === 'detour'
        ? 0.64
        : intent === 'shared'
          ? 0.68
          : intent === 'spread'
            ? 0.74
            : 0.8,
  };
}
export function expansionLabels(p) {
  const words = {
    shared: [
      '找到共同支点',
      'Shared roots',
      '三颗星各有支路，也共享阻挡；找出一手能推进多处的位置。',
      'Trace the shared blockers as well as each star’s own branch.',
    ],
    detour: [
      '把步数用在刀刃上',
      'Choose the needed routes',
      '能走不代表需要走；先看星标，给真正的目标留步数。',
      'A clear exit may be a detour. Keep your moves for the stars.',
    ],
    spread: [
      '跨区相逢',
      'Across the board',
      '星标分散在不同区域；沿线追踪，不要只清最近的一角。',
      'Trace the distant targets instead of only clearing the nearest corner.',
    ],
    keys: [
      '双钥织路',
      'Two-key routes',
      '字母配对后，还要检查出口；钥匙关系和几何阻挡共同决定路线。',
      'Match each key and still check the exit. Permissions and paths both matter.',
    ],
    clear: [
      '让整片风自由',
      'Open skies',
      '逐段解开交错，留意能打开多条通路的支点；本关清空整盘。',
      'Find the junctions that open several routes, then clear the whole board.',
    ],
  };
  const w = words[p.intent];
  return {
    id: p.id,
    title: [`${w[0]} · ${p.id}`, `${w[1]} · ${p.id}`],
    focus: w.slice(2),
    tier: p.relief ? 'relief' : p.hard ? 'hard' : 'normal',
    shape: p.style,
    kind: p.intent,
    targets: p.targets,
    keyGroups: p.keys,
    target: p.target,
    size: p.size,
  };
}
