/** Contract edges read left-to-right: blocker > consumer. g is physical;
 * r is transitive physical; no forbids physical reachability. Locks add their
 * own permission edges after binding. Every symbol names a distinct arrow.
 */
export const contracts = {
  1: { g: 'U>X,X>P', targets: 'P' },
  8: { g: 'X>P,X>Q,U>X', targets: 'P,Q' },
  31: {
    g: 'X>U,X>V,U>P,V>Q,L>X',
    targets: 'P,Q',
    no: 'U>Q,V>P',
    distractor: true,
  },
  46: { g: 'X>P,X>Q,Y>P', targets: 'P,Q', no: 'Y>Q', distractor: true },
  67: { g: 'X>P,Y>Q,U>X,U>Y', targets: 'P,Q', far: 'X>P', distractor: true },
  96: {
    g: 'U>P,Y>X,X>Q',
    keys: { A: 'P' },
    locks: { X: 'A' },
    targets: 'P,Q',
    far: 'U>P',
    distractor: true,
  },
  133: {
    g: 'U>P,V>Q,X>R',
    keys: { A: 'P', B: 'Q' },
    locks: { Q: 'A', X: 'B' },
    targets: 'P,Q,R',
    distractor: true,
  },
  158: {
    g: 'X>U,X>V,U>A,V>B,Y>Q,Z>Q',
    keys: { A: 'A', B: 'B' },
    locks: { P: 'A', R: 'B', Y: 'A', Z: 'B' },
    targets: 'P,Q,R',
    no: 'U>B,V>A',
    distractor: true,
  },
  193: {
    g: 'X>P,X>Q,Y>Q,Y>R,U>A,V>B',
    targets: 'P,Q,R',
    no: 'X>R,Y>P',
    keys: { A: 'A', B: 'B' },
    locks: { P: 'A', R: 'B' },
    distractor: true,
  },
  223: {
    g: 'U>A,X>P,X>V,V>B,Y>Q,Y>Z,Z>R',
    targets: 'P,Q,R',
    keys: { A: 'A', B: 'B' },
    locks: { X: 'A', Y: 'B' },
    far: 'Z>R',
    distractor: true,
  },
  258: {
    g: 'X>P,X>Q,Y>Q,Y>R,Z>X,Z>Y,U>A,V>B',
    targets: 'P,Q,R',
    keys: { A: 'A', B: 'B' },
    locks: { P: 'A', R: 'B' },
    no: 'X>R,Y>P',
    distractor: true,
  },
  291: {
    g: 'I>X,X>U,X>V,U>A,V>B,S>P,S>Q,T>Q,T>R',
    targets: 'P,Q,R',
    keys: { A: 'A', B: 'B' },
    locks: { P: 'A', R: 'B' },
    no: 'S>R,T>P',
    inner: 'I',
    distractor: true,
  },
};
export function edges(text = '') {
  return text ? text.split(',').map((s) => s.split('>')) : [];
}

Object.assign(contracts, {
  1: { targets: 'P', g: 'X>P,U>X', free: 'D', unrelated: 'D' },
  2: { targets: 'P', g: 'X>P,Y>P,U>X,V>Y', no: 'U>Y,V>X' },
  3: { targets: 'P', g: 'X>P,U>X', direction: { P: [0, -1] }, long: 'P' },
  4: { targets: 'P', g: 'U>P,V>P,X>U,X>V,Y>X' },
  5: { g: 'X>U,X>V,Y>X', gap: 'X>U' },
  6: { targets: 'P', r: 'X>P', inner: 'X', free: 'D', unrelated: 'D' },
  7: { targets: 'P', g: 'X>P,U>X', free: 'D', unrelated: 'D' },
  8: { targets: 'P,Q', g: 'U>P,V>Q,X>U,X>V,Z>X,W>Z', no: 'U>Q,V>P' },
  9: {
    targets: 'P,Q',
    g: 'U>P,V>Q,X>U,X>V',
    mask: { U: 'P', V: 'Q', X: 'P,Q' },
  },
  10: { targets: 'P', g: 'X>P,U>X', far: 'X>P' },
  11: { targets: 'P', g: 'X>P,U>X', gap: 'X>P' },
  12: { targets: 'P', g: 'X>P,Y>X', direction: { P: [1, 0], X: [0, 1] } },
  13: { targets: 'P', g: 'X>P,Y>X', free: 'Y', inner: 'Y' },
  14: { g: 'X>U,X>V,Y>X', gap: 'X>U' },
  15: { targets: 'P', g: 'X>P,Y>P', far: 'X>P,Y>P' },
  16: { targets: 'P,Q', g: 'X>P,X>Q', free: 'D', unrelated: 'D' },
  17: { targets: 'P', g: 'X>P,U>X', gap: 'X>P', unrelated: 'D', free: 'D' },
  18: {
    targets: 'P,Q',
    g: 'U>P,V>Q,X>U,X>V',
    direction: { P: [1, 0], Q: [0, 1] },
  },
  19: { targets: 'P,Q', g: 'U>P,V>Q,X>U,X>V', mask: { U: 'P', V: 'Q' } },
  20: { g: 'X>U,X>V,Y>W,Y>Z', no: 'X>Y,Y>X' },
  21: { targets: 'P', g: 'X>P,Y>P,U>Y,X>U' },
  22: {
    targets: 'P',
    r: 'U>P',
    free: 'U,D',
    unrelated: 'D',
    opening: 2,
    related: [1, 1],
  },
  23: { targets: 'P', g: 'X>P,U>X', body: 'X>P', long: 'X' },
  24: { targets: 'P,Q', g: 'U>P,V>Q,X>U,X>V', mask: { U: 'P', V: 'Q' } },
  25: {
    targets: 'P,Q',
    g: 'U>P,V>Q,X>U,X>V',
    mask: { U: 'P', V: 'Q' },
    direction: { P: [0, -1], U: [1, 0] },
  },
  26: { targets: 'P,Q', g: 'X>P,X>Q,Y>Q', only: { P: 'X' }, no: 'Y>P' },
  27: { targets: 'P', g: 'X>P,U>X', free: 'D', unrelated: 'D' },
  28: { targets: 'P', r: 'U>P,V>P', free: 'U,V', no: 'U>V,V>U' },
  29: { g: 'X>U,X>V,Y>X', direction: { U: [1, 0], V: [0, -1] } },
  30: {
    targets: 'P,Q',
    g: 'X>P,X>Q,Y>P',
    far: 'Y>P',
    body: 'Y>P',
    free: 'D',
    unrelated: 'D',
  },
  31: {
    targets: 'P,Q',
    g: 'U>P,V>Q,X>U,X>V,L>X',
    mask: { U: 'P', V: 'Q' },
    free: 'D',
    unrelated: 'D',
  },
  32: { targets: 'P,Q', g: 'X>P,Y>Q', only: { P: 'X' }, no: 'Y>P' },
  33: {
    targets: 'P,Q',
    g: 'U>P,V>Q,X>U,X>V',
    mask: { U: 'P', V: 'Q' },
    far: 'X>U,X>V',
  },
  34: { targets: 'P,Q', g: 'P>X,X>Q,U>P' },
  35: { targets: 'P,Q', g: 'Y>P,Y>Q,U>Y,V>Y', no: 'U>V,V>U' },
  36: {
    targets: 'P,Q',
    g: 'X>P,Y>P,Y>Q',
    no: 'X>Q',
    direction: { P: [0, 1], Q: [0, 1] },
  },
  37: { targets: 'P,Q', g: 'X>P,X>Q', unrelated: 'D' },
  38: {
    targets: 'P,Q',
    r: 'U>P,V>Q',
    free: 'U,V,D',
    mask: { U: 'P', V: 'Q' },
    unrelated: 'D',
    opening: 3,
  },
  39: { targets: 'P,Q', g: 'U>P,V>Q,X>U,X>V,W>V', mask: { U: 'P', V: 'Q' } },
  40: { targets: 'P,Q', g: 'X>P,X>Q,U>X,V>X', free: 'U,V' },
  41: { g: 'X>U,X>V,Y>X,Z>X', no: 'Y>Z,Z>Y' },
  42: {
    targets: 'P,Q',
    g: 'U>P,V>Q,X>U,X>V',
    body: 'X>U,X>V',
    mask: { U: 'P', V: 'Q' },
  },
  43: { targets: 'P,Q', r: 'X>P,X>Q', direction: { P: [1, 0], Q: [-1, 0] } },
  44: { targets: 'P,Q', g: 'X>U,X>V,Y>P,Y>Q', r: 'X>P,X>Q', no: 'Y>X' },
  45: { targets: 'P,Q', g: 'X>U,Y>P,Y>Q', r: 'X>P,X>Q', no: 'Y>X' },
  46: {
    targets: 'P,Q',
    g: 'X>P,X>Q,U>X,V>X',
    free: 'U,V,D,E',
    unrelated: 'D,E',
    opening: 4,
    related: [2, 2],
  },
  47: { targets: 'P,Q', r: 'X>P,X>Q', free: 'X,D', unrelated: 'D' },
  48: { targets: 'P,Q', g: 'U>P,V>Q,U>V', no: 'V>P' },
  49: { targets: 'P,Q', g: 'X>P,U>Q', free: 'D', unrelated: 'D' },
  50: { targets: 'P,Q', g: 'X>P,Y>Q,U>Y', mask: { Y: 'Q' }, no: 'P>Q,Q>P' },
  51: {
    targets: 'P,Q',
    g: 'X>P,Y>P,Y>Q,U>Y,V>Y',
    only: { P: 'X,Y', Q: 'Y' },
    no: 'X>Q',
  },
  52: { targets: 'P,Q', g: 'X>P,Y>Q,U>Y', only: { P: 'X' }, long: 'P' },
  53: { targets: 'P,Q', g: 'X>P,X>Q', unrelated: 'Y' },
  54: {
    targets: 'P,Q',
    g: 'X>U,X>V,U>P,V>Q,W>P',
    mask: { W: 'P' },
    unrelated: 'D,E',
  },
  55: {
    targets: 'P,Q',
    g: 'X>P,X>Q,U>X,V>X,W>U,Z>V',
    free: 'W,Z',
    no: 'U>V,V>U',
  },
  56: { targets: 'P,Q', g: 'P>Q,U>P' },
  57: {
    targets: 'P,Q',
    g: 'U>P,V>U,V>Q',
    no: 'P>Q',
    direction: { U: [0, -1], V: [1, 0] },
  },
  58: { targets: 'P,Q', g: 'X>P,X>Q,Y>P,Y>Q', unrelated: 'D,E' },
  59: { targets: 'P,Q', g: 'X>Y,Z>Y,Y>P,Y>Q', no: 'Y>X' },
  60: { targets: 'P,Q', g: 'X>P,P>Q', free: 'D', unrelated: 'D' },
  61: { targets: 'P,Q', g: 'X>P,Y>X,Y>Q', gap: 'X>P' },
  62: { targets: 'P,Q', g: 'X>P,Y>P,U>Q', gap: 'X>P,Y>P' },
  63: { targets: 'P,Q', g: 'X>P,Y>Q', far: 'X>P' },
  64: { targets: 'P,Q', g: 'X>P,X>Q,U>X', body: 'X>P,X>Q', long: 'X' },
  65: { targets: 'P,Q', g: 'U>P,V>Q,X>U,X>V', far: 'U>P' },
  66: { targets: 'P,Q', g: 'X>P,Q>X,U>Q', gap: 'X>P' },
  67: { targets: 'P,Q', g: 'X>P,X>Q,Y>X', gap: 'X>P,X>Q,Y>X', body: 'X>P,X>Q' },
  68: { targets: 'P,Q', g: 'U>P,V>Q,X>V', free: 'U', gap: 'X>V' },
  69: { targets: 'P,Q', g: 'X>P,X>Q', unrelated: 'D', long: 'D' },
  70: { targets: 'P,Q', g: 'X>P,X>Q,U>X,V>X', gap: 'X>P' },
  71: { targets: 'P,Q', g: 'X>P,Y>X,U>Q', inner: 'Y' },
  72: {
    targets: 'P,Q',
    g: 'X>P,Y>Q',
    free: 'X',
    direction: { P: [1, 0], Q: [0, 1] },
  },
  73: {
    targets: 'P,Q,R',
    g: 'U>P,V>Q,W>R,X>U,X>V,X>W',
    mask: { U: 'P', V: 'Q', W: 'R' },
    gap: 'X>U',
  },
  74: { targets: 'P,Q', g: 'P>Q,U>P', direction: { P: [0, -1] }, long: 'P' },
  75: {
    targets: 'P,Q,R',
    g: 'U>P,V>Q,W>R,X>U,X>V,X>W',
    mask: { U: 'P', V: 'Q', W: 'R' },
  },
  76: { targets: 'P,Q', g: 'U>P,V>Q,Y>U,Y>V,X>Y', gap: 'X>Y,Y>U' },
  77: { targets: 'P,Q', g: 'X>P,U>X,V>X,U>Q', no: 'V>Q,X>Q', gap: 'X>P' },
  78: { targets: 'P,Q,R', g: 'X>P,X>Q,X>R', long: 'X', body: 'X>P,X>Q,X>R' },
  79: { targets: 'P,Q', g: 'X>P,Y>Q', far: 'X>P', long: 'Q' },
  80: {
    targets: 'P,Q,R',
    g: 'U>P,V>Q,W>R,X>U,X>V,X>W,Y>X,Z>Y',
    gap: 'Y>X,Z>Y',
  },
  81: {
    targets: 'P,Q',
    g: 'X>P,Y>Q',
    notDirect: 'X>Q,Y>P',
    far: 'X>P,Y>Q',
    direction: { P: [1, 0], Q: [0, 1] },
  },
  82: { targets: 'P,Q', g: 'X>P,Y>Q', notDirect: 'X>Q', gap: 'X>P' },
  83: {
    targets: 'P,Q,R',
    g: 'X>P,X>Q,Y>R',
    mask: { X: 'P,Q', Y: 'R' },
    only: { R: 'Y' },
  },
  84: { targets: 'P,Q', g: 'U>P,V>Q,X>V', free: 'U', long: 'U,V', far: 'X>V' },
  85: { targets: 'P,Q,R', g: 'U>P,V>Q,W>R,X>U,X>V,X>W', gap: 'X>U' },
  86: { targets: 'P,Q,R', g: 'X>P,X>Q,Y>Q,Y>R', mask: { X: 'P,Q', Y: 'Q,R' } },
  87: { targets: 'P,Q', g: 'P>X,X>Q,U>P', far: 'X>Q' },
  88: { targets: 'P,Q,R', g: 'X>P,U>Q,V>R', gap: 'X>P', unrelated: 'D' },
  89: {
    targets: 'P,Q,R',
    g: 'X>P,P>Q,Y>Q,Y>R',
    mask: { X: 'P,Q', Y: 'Q,R' },
    gap: 'X>P,Y>R',
  },
  90: { targets: 'P,Q,R', g: 'X>P,Y>Q,Z>R', free: 'D,E', unrelated: 'D,E' },
});

// Defaults are explicit production choices from the shared design contract.
// A provided lock map overrides defaults; star/key aliases remain one entity.
function keyed(groups, g, options = {}) {
  const targets = options.targets || 'P,Q,R';
  const keys = options.keys || (groups === 1 ? { A: 'A' } : { A: 'A', B: 'B' });
  const locks =
    options.locks ||
    (groups === 1
      ? { P: 'A' }
      : { P: 'A', [targets.includes('R') ? 'R' : 'Q']: 'B' });
  const chain = edges(g),
    ancestry = [...chain, ...edges(options.r)];
  for (const [letter, role] of Object.entries(keys)) {
    if (
      !ancestry.some(([, to]) => to === role) &&
      !locks[role] &&
      !(options.free || '').split(',').includes(role)
    )
      chain.push([`pre${letter}`, role]);
  }
  return {
    targets,
    keys,
    locks,
    ...options,
    g: chain.map((e) => e.join('>')).join(','),
  };
}
const a = (g, o = {}) => keyed(1, g, { targets: 'P,Q', ...o });
const ab = (g, o = {}) => keyed(2, g, o);
Object.assign(contracts, {
  91: a('X>P,X>Q', { free: 'A', far: 'X>P', mask: { X: 'P,Q', A: 'P' } }),
  92: a('U>A,V>P,W>Q', {
    locks: { P: 'A', Q: 'A' },
    mask: { V: 'P', W: 'Q' },
    gap: 'U>A',
  }),
  93: a('X>P,X>Q', { locks: { X: 'A' } }),
  94: a('Y>Q', {
    locks: { P: 'A', Q: 'A' },
    only: { P: '' },
    mask: { Y: 'Q' },
  }),
  95: a('X>U,X>V,U>P,V>Q', { locks: { X: 'A' }, mask: { U: 'P', V: 'Q' } }),
  96: a('U>P,Y>X,X>Q', {
    keys: { A: 'P' },
    locks: { X: 'A' },
    gap: 'U>P',
    mask: { X: 'Q', Y: 'Q' },
  }),
  97: a('U>A,X>P', {
    locks: { Q: 'A' },
    mask: { U: 'Q', A: 'Q' },
    unrelated: 'D',
    far: 'U>A',
  }),
  98: a('Y>X,X>P,X>Q', { locks: { X: 'A' } }),
  99: a('U>A,X>P,X>Q', { locks: { X: 'A' } }),
  100: a('U>X,V>Y,X>P,Y>Q', {
    locks: { X: 'A', Y: 'A' },
    mask: { U: 'P', V: 'Q', X: 'P', Y: 'Q' },
  }),
  101: a('P>A,U>P,V>Q', { locks: { Q: 'A' } }),
  102: a('X>P,X>Q', { locks: { X: 'A' }, long: 'X', body: 'X>P,X>Q' }),
  103: a('X>R,U>P,V>Q', {
    targets: 'P,Q,R',
    locks: { P: 'A', Q: 'A', X: 'A' },
    mask: { X: 'R' },
  }),
  104: a('X>P,X>Q', { locks: { X: 'A', D: 'A' }, unrelated: 'D' }),
  105: a('U>A,V>P,W>Q,Z>R', {
    targets: 'P,Q,R',
    locks: { P: 'A', Q: 'A', R: 'A' },
    mask: { V: 'P', W: 'Q', Z: 'R' },
  }),
  106: a('X>P,X>Q', { far: 'X>P', mask: { X: 'P,Q', A: 'P' } }),
  107: a('X>A,X>U,U>P', {
    locks: { Q: 'A' },
    mask: { U: 'P', A: 'Q', X: 'P,Q' },
  }),
  108: a('Y>X,X>P,Y>Q', { locks: { Y: 'A' }, mask: { X: 'P' } }),
  109: a('G>X,X>P,X>Q,X>R', { targets: 'P,Q,R', locks: { X: 'A' } }),
  110: a('G>X,X>U,X>V,X>W,U>P,V>Q,W>R', {
    targets: 'P,Q,R',
    locks: { X: 'A' },
    mask: { U: 'P', V: 'Q', W: 'R' },
  }),
  111: a('A>P,U>Q', { locks: { Q: 'A' }, body: 'A>P' }),
  112: a('Y>A,X>P,X>Q', { locks: { X: 'A' }, unrelated: 'D', gap: 'Y>A' }),
  113: a('X>P,X>Q,X>R', {
    targets: 'P,Q,R',
    locks: { P: 'A', Q: 'A' },
    mask: { X: 'P,Q,R', A: 'P,Q' },
  }),
  114: a('U>V,V>A,X>P,Y>Q', { far: 'U>V,V>A' }),
  115: a('U>R', {
    targets: 'P,Q,R',
    locks: { P: 'A', Q: 'A', R: 'A' },
    only: { P: '', Q: '' },
    mask: { U: 'R' },
  }),
  116: a('X>A,X>P,Y>Q', {
    locks: { Q: 'A' },
    mask: { X: 'P,Q', A: 'Q', Y: 'Q' },
    far: 'Y>Q',
  }),
  117: a('X>Q', { only: { P: '' }, mask: { A: 'P', X: 'Q' }, far: 'X>Q' }),
  118: a('X>P,X>Q,Y>R', {
    targets: 'P,Q,R',
    locks: { X: 'A' },
    mask: { X: 'P,Q', Y: 'R' },
  }),
  119: a('U>P,X>V,X>W,V>Q,W>R', {
    targets: 'P,Q,R',
    keys: { A: 'P' },
    locks: { X: 'A', D: 'A' },
    mask: { X: 'Q,R', V: 'Q', W: 'R' },
    unrelated: 'D',
  }),
  120: a('X>Q,Y>V,V>R,U>P,U>X', {
    targets: 'P,Q,R',
    locks: { P: 'A', X: 'A', Y: 'A' },
    mask: { U: 'P,Q', X: 'Q', Y: 'R' },
  }),
  121: ab('X>U,X>V,U>A,V>B', {
    targets: 'P,Q',
    locks: { P: 'A', Q: 'B' },
    mask: { U: 'P', V: 'Q' },
  }),
  122: ab('X>P,X>Q', { targets: 'P,Q', locks: { B: 'A', X: 'B' } }),
  123: ab('X>P,Y>Q', {
    targets: 'P,Q',
    mask: { A: 'P', B: 'Q' },
    far: 'X>P,Y>Q',
  }),
  124: ab('U>R,V>R', {
    locks: { P: 'A', U: 'A', Q: 'B', V: 'B' },
    mask: { A: 'P,R', B: 'Q,R', U: 'R', V: 'R' },
  }),
  125: ab('X>A,X>B,X>Q,U>P,V>R'),
  126: ab('X>P,Y>Q', { targets: 'P,Q', locks: { A: 'B', P: 'A' } }),
  127: ab('U>P,X>Q,Y>Q,Y>R', {
    keys: { A: 'P', B: 'B' },
    locks: { X: 'A', R: 'B' },
    mask: { Y: 'Q,R', X: 'Q', B: 'R' },
  }),
  128: ab('Y>X,X>P,Y>Q', {
    targets: 'P,Q',
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P', A: 'P' },
  }),
  129: ab('X>A,X>B,X>R,Y>Q'),
  130: ab('U>P,V>Q,W>R', {
    locks: { B: 'A', R: 'B', P: 'A' },
    mask: { U: 'P', V: 'Q', W: 'R' },
  }),
  131: ab('X>P,X>Q', {
    targets: 'P,Q',
    locks: { P: 'A', X: 'B' },
    mask: { A: 'P' },
  }),
  132: ab('B>A,X>P,Y>Q,Z>R', { body: 'B>A' }),
  133: ab('U>P,V>Q,X>R', {
    keys: { A: 'P', B: 'Q' },
    locks: { Q: 'A', X: 'B' },
  }),
  134: ab('U>Y,V>Y,Y>P,Y>Q,Y>R'),
  135: ab('X>P,X>Q,X>R,U>P,V>R'),
  136: ab('U>P,V>Q', {
    targets: 'P,Q',
    locks: { P: 'A', D: 'A', Q: 'B', E: 'B' },
    mask: { A: 'P', B: 'Q' },
    unrelated: 'D,E',
  }),
  137: ab('P>B,U>P,V>Q,W>R', { locks: { A: 'B', Q: 'A', R: 'A' } }),
  138: ab('X>U,X>V,U>A,V>B,Y>U,S>Q,T>Q', {
    locks: { P: 'A', S: 'A', R: 'B', T: 'B' },
    no: 'Y>B',
    mask: { A: 'P,Q', B: 'Q,R' },
  }),
  139: ab('U>P,V>Q', {
    targets: 'P,Q',
    mask: { U: 'P', V: 'Q' },
    far: 'U>P,V>Q',
  }),
  140: ab('X>A,X>B,X>P,X>Q,X>R', { locks: { P: 'A', Q: 'A', R: 'B' } }),
  141: ab('X>P,X>Q,Y>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R' },
  }),
  142: ab('A>P,U>Q', {
    targets: 'P,Q',
    locks: { B: 'A', Q: 'B' },
    body: 'A>P',
  }),
  143: ab('X>P,X>Q,Y>Q,Y>R', { free: 'A,B', mask: { X: 'P,Q', Y: 'Q,R' } }),
  144: ab('U>X,V>Y,X>S,S>P,Y>Q,U>R,V>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { U: 'P,R', V: 'Q,R', X: 'P', Y: 'Q' },
    far: 'Y>Q',
  }),
  145: ab('X>P,Y>Q,Z>R', {
    locks: { B: 'A', P: 'A', R: 'B' },
    gap: 'X>P',
    free: 'D',
    unrelated: 'D',
  }),
  146: ab('P>X,X>A,X>B,U>P', { locks: { Q: 'A', R: 'B' } }),
  147: ab('X>P,Y>Q', {
    targets: 'P,Q',
    locks: { X: 'A', Q: 'B' },
    unrelated: 'D',
    mask: { X: 'P', B: 'Q' },
  }),
  148: ab('U>P,V>R,W>Q', {
    mask: { U: 'P', V: 'R' },
    direction: { P: [1, 0], R: [1, 0] },
  }),
  149: ab('U>P,V>Q,X>Q,X>R', {
    keys: { A: 'A', B: 'P' },
    locks: { A: 'B', V: 'A' },
    mask: { X: 'Q,R' },
    far: 'X>Q',
  }),
  150: ab('U>A,U>R,V>B,V>R,X>P,Y>Q', {
    locks: { P: 'A', Q: 'B' },
    mask: { A: 'P', B: 'Q', U: 'P,R', V: 'Q,R' },
  }),
  151: ab('X>P,X>Q,Y>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R' },
  }),
  152: ab('X>P,X>Q,X>R,U>P', {
    locks: { X: 'A', U: 'B' },
    mask: { U: 'P', B: 'P' },
  }),
  153: ab('X>P,X>U,U>Q,X>V,V>W,W>R', {
    notDirect: 'X>Q,X>R',
    mask: { U: 'Q', V: 'R', W: 'R' },
  }),
  154: ab('P>A,U>P,V>Q,W>R', {
    locks: { B: 'A', Q: 'B', R: 'B' },
    mask: { V: 'Q', W: 'R' },
  }),
  155: ab('X>U,X>V,X>W,U>P,V>Q,W>R', { mask: { U: 'P', V: 'Q', W: 'R' } }),
  156: ab('X>P,X>Q,Y>Q,Y>R,Z>P,Z>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R', Z: 'P,R' },
  }),
  157: ab('X>P,X>Q,Y>R', {
    locks: { X: 'A', R: 'B' },
    mask: { X: 'P,Q', Y: 'R', B: 'R' },
    far: 'Y>R',
  }),
  158: ab('X>U,X>V,U>A,V>B,Y>Q,Z>Q', {
    locks: { P: 'A', R: 'B', Y: 'A', Z: 'B' },
    mask: { U: 'P,Q', V: 'Q,R', Y: 'Q', Z: 'Q' },
  }),
  159: ab('P>U,P>V,U>Q,V>W,W>R', {
    locks: { P: 'A', W: 'B' },
    mask: { U: 'Q', V: 'R', B: 'R' },
    body: 'P>U,P>V',
  }),
  160: ab('X>P,X>Q,Y>Q,Y>R', { mask: { X: 'P,Q', Y: 'Q,R' } }),
  161: ab('X>P,X>Q,X>R,Y>P,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q,R', Y: 'P,R' },
  }),
  162: ab('U>Q,V>U,X>P,Y>R', { mask: { U: 'Q', V: 'Q' }, long: 'U' }),
  163: ab('U>P,P>V,V>Q', {
    keys: { A: 'A', B: 'Q' },
    locks: { U: 'A', R: 'B' },
  }),
  164: ab('X>P,Y>Q,Z>R', {
    locks: { P: 'A', D: 'A', R: 'B', E: 'B' },
    unrelated: 'D,E',
  }),
  165: ab('X>P,X>Q,X>R,Y>Q', { mask: { X: 'P,Q,R', Y: 'Q' } }),
  166: ab('X>P,X>Q,Z>X,Z>R', { mask: { X: 'P,Q', Z: 'P,Q,R' } }),
  167: ab('X>P,Y>Q,Z>R', {
    direction: { P: [1, 0], Q: [0, 1], R: [-1, 0] },
    long: 'X,Y',
  }),
  168: ab('X>U,X>V,U>A,V>B,X>W,W>Q'),
  169: ab('X>P,X>Q,Y>Q,Y>R', { mask: { X: 'P,Q', Y: 'Q,R' }, far: 'X>Q,Y>Q' }),
  170: ab('X>P,X>Q,Y>Q,Y>R,Z>P,Z>R', {
    mask: { X: 'P,Q', Y: 'Q,R', Z: 'P,R' },
    gap: 'X>P,Y>R',
  }),
  171: ab('X>P,X>Q,Y>Q,Y>R', {
    mask: { X: 'P,Q', Y: 'Q,R' },
    long: 'D',
    unrelated: 'D',
  }),
  172: ab('X>A,X>B,U>P,V>Q,W>R', { mask: { U: 'P', V: 'Q', W: 'R' } }),
  173: ab('U>X,V>X,W>X,X>P,X>Q,X>R', { free: 'U,V,W' }),
  174: ab('U>P,V>Q,X>R,Y>R', {
    keys: { A: 'P', B: 'Q' },
    locks: { X: 'A', Y: 'B' },
    no: 'P>Q,Q>P',
    mask: { X: 'R', Y: 'R' },
  }),
  175: ab('X>P,X>Q,Y>R', { mask: { X: 'P,Q', Y: 'R', B: 'R' } }),
  176: ab('X>P,X>Q,Y>Q,Y>R,U>A,V>W,W>B', { mask: { X: 'P,Q', Y: 'Q,R' } }),
  177: ab('U>R,V>R', {
    locks: { P: 'A', U: 'A', Q: 'B', V: 'B' },
    mask: { A: 'P,R', B: 'Q,R', U: 'R', V: 'R' },
  }),
  178: ab('U>A,A>P,A>Q,X>R', { locks: { X: 'A', U: 'B' }, body: 'A>P,A>Q' }),
  179: ab('X>P,X>Q,X>R,Y>P,Y>Q,Z>Q,Z>R,U>P,V>Q,W>R', {
    locks: { P: 'A', R: 'B', D: 'A' },
    mask: { Y: 'P,Q', Z: 'Q,R', U: 'P', V: 'Q', W: 'R' },
    unrelated: 'D',
  }),
  180: ab('X>P,X>Q,Z>X,Z>R', {
    mask: { X: 'P,Q', Z: 'P,Q,R' },
    direction: { P: [0, -1], R: [1, 0] },
  }),
  181: ab('X>P,X>Q,Y>R', { mask: { X: 'P,Q', Y: 'R' } }),
  182: ab('U>A,V>B,W>P,X>Q', { mask: { W: 'P' } }),
  183: ab('X>A,B>Y,Y>Q,Y>R', {
    long: 'A,B',
    body: 'B>Y',
    mask: { X: 'P', Y: 'Q,R' },
  }),
  184: ab('X>P,X>Q,Y>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R' },
  }),
  185: ab('X>P,X>Q,Y>R', { mask: { X: 'P,Q', Y: 'R' }, far: 'X>P' }),
  186: ab('U>X,V>X,W>X,X>A,X>B,Y>Q', { free: 'U,V,W' }),
  187: ab('X>P,X>Q,Z>X,Z>R', { mask: { X: 'P,Q', Z: 'P,Q,R' }, gap: 'Z>X' }),
  188: ab('X>P,X>R,U>Q', {
    locks: { X: 'A', U: 'B' },
    long: 'X',
    body: 'X>P,X>R',
    mask: { X: 'P,R', U: 'Q' },
  }),
  189: ab('U>A,V>R,W>B,X>Q', { unrelated: 'D', mask: { V: 'R' } }),
  190: ab('X>P,X>Q,Y>R', { mask: { X: 'P,Q', Y: 'R' }, notDirect: 'X>R' }),
  191: ab('U>A,V>B,X>Q', {
    unrelated: 'D,E',
    direction: { U: [0, 1], V: [0, -1], D: [1, 0], E: [-1, 0] },
  }),
  192: ab('X>P,X>Y,Y>A,U>Q', {
    direction: { P: [1, 0], Y: [0, 1] },
    body: 'X>P,X>Y',
  }),
  193: ab('X>P,X>Q,Y>Q,Y>R,U>A,V>B', {
    mask: { X: 'P,Q', Y: 'Q,R' },
    long: 'X',
    free: 'D',
    unrelated: 'D',
  }),
  194: ab('X>P,X>Q,Y>Q,Y>R,U>A,V>B', {
    mask: { X: 'P,Q', Y: 'Q,R' },
    free: 'D',
    unrelated: 'D',
  }),
  195: ab('X>P,Y>Q,U>R', {
    locks: { X: 'A', Y: 'A', R: 'B' },
    mask: { X: 'P', Y: 'Q', A: 'P,Q' },
    long: 'X,Y',
  }),
});
Object.assign(contracts, {
  196: ab('X>A,U>P,V>Q,W>R', { inner: 'X', free: 'X,D', unrelated: 'D' }),
  197: ab('U>A,X>P,Y>Q,Z>R', {
    locks: { X: 'A', Y: 'A', Z: 'A', U: 'B' },
    mask: { X: 'P', Y: 'Q', Z: 'R' },
  }),
  198: ab('X>P,H>Q,H>R', {
    long: 'H',
    notDirect: 'H>P',
    mask: { H: 'Q,R', X: 'P' },
  }),
  199: ab('X>P,X>Q,Y>R', { mask: { X: 'P,Q', Y: 'R' }, far: 'X>P,Y>R' }),
  200: ab('X>P,Y>Q,Z>R', {
    locks: { A: 'B', X: 'A', Y: 'A' },
    mask: { Z: 'R' },
  }),
  201: ab('X>P,X>Q,Y>R', { unrelated: 'D,E' }),
  202: ab('X>P,X>Q,Y>X,Y>R', { mask: { X: 'P,Q', Y: 'P,Q,R' }, gap: 'Y>X' }),
  203: ab('X>P,X>Q,Y>Q,Y>R,U>X,U>B', { locks: { X: 'A', R: 'B' }, no: 'Y>P' }),
  204: ab('X>Q,U>P,V>R', {
    locks: { P: 'A', Q: 'A', R: 'B' },
    mask: { X: 'Q' },
  }),
  205: ab('P>U,P>V,U>Q,V>R', {
    keys: { A: 'P', B: 'B' },
    locks: { P: 'B', U: 'A' },
    long: 'P',
    body: 'P>U,P>V',
  }),
  206: ab('X>P,X>Q,Y>R', {
    locks: { P: 'A', Q: 'A', R: 'B' },
    mask: { A: 'P,Q', B: 'R', Y: 'R' },
    long: 'A',
  }),
  207: ab('X>U,X>V,U>A,V>B,Y>Q', { inner: 'X' }),
  208: ab('X>P,X>Q,Z>X,Z>R', { mask: { X: 'P,Q', Z: 'P,Q,R' } }),
  209: ab('X>P,X>Q,Y>Q,Y>R,Z>P,Z>R,K>A,K>B', {
    mask: { X: 'P,Q', Y: 'Q,R', Z: 'P,R' },
  }),
  210: ab('X>P,U>Q,V>Q,Y>R', {
    locks: { X: 'A', U: 'A', V: 'B', Y: 'B' },
    mask: { X: 'P', U: 'Q', V: 'Q', Y: 'R' },
  }),
  211: ab('U>X,V>X,X>P,X>Q,X>R', {
    locks: { U: 'A', V: 'B' },
    unrelated: 'D',
    free: 'D',
  }),
  212: ab('P>A,P>B,U>P,V>Q,W>R', {
    locks: { Q: 'A', R: 'B' },
    mask: { V: 'Q', W: 'R' },
    far: 'V>Q,W>R',
  }),
  213: ab('X>A,X>B,Y>P,Y>Q,Y>R,Z>R', {
    locks: { Y: 'A', Z: 'B' },
    mask: { Z: 'R' },
  }),
  214: ab('Q>B,X>P,X>Q,U>R', { locks: { P: 'B', R: 'A' }, no: 'P>Q' }),
  215: ab('U>X,V>X,X>S,X>T,X>W,S>P,T>Q,W>R', {
    locks: { U: 'A', V: 'B' },
    mask: { S: 'P', T: 'Q', W: 'R' },
  }),
  216: ab('X>P,X>B,Y>Q,Y>R', { locks: { X: 'A', Y: 'B' }, mask: { Y: 'Q,R' } }),
  217: ab('P>A,P>U,U>Q,V>R', { locks: { Q: 'A', R: 'B' }, mask: { V: 'R' } }),
  218: ab('X>P,X>Q,Y>R', { locks: { B: 'A', X: 'B', Y: 'B' }, gap: 'X>P,Y>R' }),
  219: ab('X>P,X>Q,X>R', { locks: { X: 'A', R: 'B' }, unrelated: 'D,E,F' }),
  220: ab('P>A,Q>B,U>P,V>Q,W>R', {
    locks: { Q: 'A', R: 'B' },
    mask: { W: 'R' },
    far: 'W>R',
  }),
  221: ab('X>U,X>V,X>D,U>Q,V>R,W>P', {
    mask: { U: 'Q', V: 'R' },
    unrelated: 'D',
  }),
  222: ab('X>U,X>V,X>D,U>Q,V>R,W>P', {
    mask: { U: 'Q', V: 'R' },
    unrelated: 'D',
  }),
  223: ab('U>A,X>P,X>V,V>B,Y>Q,Y>Z,Z>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { Y: 'Q,R', Z: 'R' },
    far: 'Z>R',
  }),
  224: ab('X>A,X>P,Y>Q,Y>B,Z>R', { locks: { Y: 'A', Z: 'B' } }),
  225: ab('X>P,Y>Q,Z>R,U>Y,V>Z', {
    locks: { X: 'A', Y: 'A', Z: 'A', V: 'B' },
    mask: { X: 'P', Y: 'Q', Z: 'R' },
  }),
  226: ab('U>Y,V>Y,Y>A,Y>B,X>P,W>Q,Z>R', {
    free: 'U,V',
    mask: { X: 'P', W: 'Q', Z: 'R' },
  }),
  227: ab('U>P,X>Q,X>R,V>A,W>B', {
    locks: { Q: 'A', R: 'B' },
    mask: { X: 'Q,R' },
  }),
  228: ab('X>A,Y>B,Z>R,U>P,V>Q', {
    locks: { Y: 'A', Z: 'B' },
    direction: { X: [0, -1], Y: [-1, 0], Z: [0, 1] },
  }),
  229: ab('X>P,P>B,Y>Q,Y>R', { locks: { P: 'A', Y: 'B' }, far: 'X>P,Y>R' }),
  230: ab('X>P,X>Q,U>R,V>R', {
    locks: { P: 'A', Q: 'A', U: 'B' },
    mask: { X: 'P,Q', U: 'R', V: 'R' },
  }),
  231: ab('P>A,X>Q,X>B,U>R,V>R', {
    locks: { X: 'A', U: 'B' },
    mask: { U: 'R', V: 'R' },
  }),
  232: ab('X>U,X>V,X>D,X>E,U>P,V>Q,Y>R', { unrelated: 'D,E' }),
  233: ab('X>P,Y>Q,U>R,V>R', {
    locks: { P: 'A', R: 'B' },
    mask: { U: 'R', V: 'R' },
    no: 'B>X,B>Y',
  }),
  234: ab('U>P,V>Q,W>R', {
    r: 'X>Y,Y>U,Y>V,Y>W',
    mask: { U: 'P', V: 'Q', W: 'R' },
    direction: { U: [1, 0], V: [0, 1], W: [-1, 0] },
  }),
  235: ab('U>X,V>X,W>X,X>P,X>Q,X>R', { free: 'U,V,W' }),
  236: ab('X>U,X>V,U>P,V>Q,Y>R', {
    locks: { U: 'A', Y: 'B' },
    mask: { Y: 'R' },
  }),
  237: ab('X>P,X>B,Y>Q,Y>R', { locks: { X: 'A', Y: 'B' }, mask: { Y: 'Q,R' } }),
  238: ab('X>P,X>Q,Y>Q,Y>R', {
    mask: { X: 'P,Q', Y: 'Q,R' },
    free: 'D,E',
    unrelated: 'D,E',
  }),
  239: ab('K>A,K>B,P>U,U>Q,X>R,U>D', {
    locks: { P: 'A', R: 'B' },
    unrelated: 'D',
    far: 'X>R',
  }),
  240: ab('X>U,X>V,Y>V,Y>W,U>P,V>Q,W>R', {
    mask: { X: 'P,Q', Y: 'Q,R', U: 'P', V: 'Q', W: 'R' },
  }),
  241: ab('U>A,V>B,W>X,X>P,X>Q,X>R', {
    free: 'U,V,W,D,E',
    unrelated: 'D,E',
    opening: 5,
    related: [3, 3],
  }),
  242: ab('X>P,X>Q,Y>R', { locks: { X: 'A', D: 'A', R: 'B' }, unrelated: 'D' }),
  243: ab('X>A,X>B,Y>Q', { free: 'D', unrelated: 'D', inner: 'X' }),
  244: ab('X>P,X>Q,Y>R', { unrelated: 'D,E', gap: 'X>P,Y>R' }),
  245: ab('X>P,X>Q,Q>D,U>R', {
    locks: { P: 'A', Q: 'A', U: 'B' },
    mask: { U: 'R' },
    unrelated: 'D',
    far: 'U>R',
  }),
  246: ab('X>P,X>Q,Y>X,Y>R', {
    mask: { X: 'P,Q', Y: 'P,Q,R' },
    free: 'D',
    unrelated: 'D',
  }),
  247: ab('U>P,V>Q,W>R,U>D,V>E,W>F', {
    mask: { U: 'P', V: 'Q', W: 'R' },
    unrelated: 'D,E,F',
  }),
  248: ab('X>P,X>Q,Y>Q,Y>R', { mask: { X: 'P,Q', Y: 'Q,R' } }),
  249: ab('U>A,V>B,X>Q', {
    free: 'U,V,D',
    unrelated: 'D',
    direction: { U: [0, -1], V: [0, -1], D: [0, -1] },
  }),
  250: ab('U>A,U>B,X>Q', { inner: 'U', free: 'X,D', unrelated: 'D' }),
  251: ab('X>P,Y>Q,Z>R', { unrelated: 'D,E,F' }),
  252: ab('X>P,X>Q,Y>Q,Y>R', { mask: { X: 'P,Q', Y: 'Q,R' }, gap: 'X>P,Y>R' }),
  253: ab('U>A,V>B,X>P,Y>Q,Z>R', { no: 'A>B,B>A' }),
  254: ab('X>P,Y>Q,Z>R', { free: 'A,B,D', unrelated: 'D' }),
  255: ab('X>P,Y>Q,Z>R', { far: 'X>P,Y>Q,Z>R', unrelated: 'D,E' }),
  256: ab('X>A,X>P,X>Q,X>R,Y>D', { unrelated: 'Y,D' }),
  257: ab('X>U,X>Y,U>P,Y>Q,Y>R', { mask: { U: 'P', Y: 'Q,R', X: 'P,Q,R' } }),
  258: ab('Z>X,Z>Y,X>P,X>Q,Y>Q,Y>R', {
    mask: { X: 'P,Q', Y: 'Q,R' },
    free: 'D,E',
    unrelated: 'D,E',
  }),
  259: ab('U>B,X>R,Y>P,Z>Q', {
    locks: { X: 'B', P: 'A' },
    far: 'U>B,X>R',
    free: 'D,E',
    unrelated: 'D,E',
  }),
  260: ab('X>P,X>Q,X>R,X>F', {
    locks: { B: 'A', X: 'B', D: 'A', E: 'B' },
    unrelated: 'D,E,F',
  }),
  261: ab('X>P,X>Q,X>R,X>F', {
    locks: { B: 'A', X: 'B', D: 'A', E: 'B' },
    unrelated: 'D,E,F',
  }),
  262: ab('U>A,U>B,V>A,V>B,X>Q', {
    locks: { P: 'A', R: 'B', D: 'A', E: 'B' },
    unrelated: 'D,E',
  }),
  263: ab('X>P,Y>Q,Z>R', { far: 'X>P,Y>Q,Z>R', unrelated: 'D,E,F' }),
  264: ab('X>P,X>Q,Y>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R' },
    gap: 'X>P,Y>R',
    unrelated: 'D',
  }),
  265: ab('X>Q,X>R,U>Q,V>R,Y>P', {
    mask: { X: 'Q,R', U: 'Q', V: 'R' },
    unrelated: 'D',
  }),
  266: ab('U>P,U>Q,U>R,X>P,Y>Q', {
    no: 'P>Q,Q>P',
    mask: { U: 'P,Q,R', X: 'P', Y: 'Q' },
  }),
  267: ab('X>P,X>Q,Y>Q,Y>R,U>P,V>R', {
    locks: { P: 'A', R: 'B', D: 'A' },
    mask: { X: 'P,Q', Y: 'Q,R', U: 'P', V: 'R' },
    unrelated: 'D',
  }),
  268: ab('U>X,V>X,X>P,X>Q,Y>R', { unrelated: 'D' }),
  269: ab('V>P,X>P,Y>Q,Y>R,Q>D,U>R', {
    keys: { A: 'P', B: 'B' },
    locks: { Q: 'A', R: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R' },
    unrelated: 'D',
    far: 'U>R',
  }),
  270: ab('X>P,X>Q,Y>Q,Y>R,U>P,V>Q,W>R', {
    mask: { X: 'P,Q', Y: 'Q,R', U: 'P', V: 'Q', W: 'R' },
  }),
  271: ab('X>A,X>B,X>U,X>V,U>Y,V>Y,Y>P,Y>Q,Y>R'),
  272: ab('Z>A,Z>B,X>P,X>Q,Y>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R' },
    gap: 'X>P,Y>R',
  }),
  273: ab('P>B,Q>X,X>R,U>P', {
    keys: { A: 'P', B: 'B' },
    locks: { Q: 'B', X: 'A' },
    mask: { X: 'R' },
    far: 'X>R',
  }),
  274: ab('Z>X,Z>Y,X>U,X>V,Y>V,Y>W,U>P,V>Q,W>R', {
    mask: { X: 'P,Q', Y: 'Q,R', U: 'P', V: 'Q', W: 'R' },
  }),
  275: ab('X>A,X>B,Y>P,Y>Q,Y>R', { far: 'Y>P,Y>R' }),
  276: ab('X>P,X>Q,X>R,U>R', {
    locks: { P: 'A', U: 'B' },
    mask: { X: 'P,Q,R', U: 'R' },
  }),
  277: ab('U>A,V>B,W>P,X>Q', {
    free: 'U,V,D',
    mask: { W: 'P' },
    unrelated: 'D',
  }),
  278: ab('U>X,V>X,X>P,X>Q,X>R', { locks: { U: 'A', V: 'B' }, no: 'A>B,B>A' }),
  279: ab('P>A,X>Q,X>R,A>X,U>P', {
    locks: { Q: 'A', R: 'B' },
    long: 'P,A,X',
    body: 'P>A,A>X',
  }),
  280: ab('X>A,Y>B,U>P,V>Q,W>R', { gap: 'X>A,Y>B', unrelated: 'D,E' }),
  281: ab('Z>X,Z>Y,X>P,X>Q,Y>Q,Y>R', {
    mask: { X: 'P,Q', Y: 'Q,R', Z: 'P,Q,R' },
  }),
  282: ab('Z>X,Z>Y,X>U,X>V,Y>V,Y>W,U>P,V>Q,W>R', {
    mask: { X: 'P,Q', Y: 'Q,R', U: 'P', V: 'Q', W: 'R' },
  }),
  283: ab('X>P,Y>U,U>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P', Y: 'Q,R' },
  }),
  284: ab('X>A,X>B,Y>Q', { inner: 'X', free: 'D,E', unrelated: 'D,E' }),
  285: ab('P>A,U>B,V>Q,Q>W,W>R', {
    locks: { U: 'A', V: 'B' },
    mask: { W: 'R' },
    gap: 'W>R',
  }),
  286: ab('X>P,X>Q,X>R,Y>P,Y>Q,Z>Q,Z>R,W>P,W>R', {
    mask: { X: 'P,Q,R', Y: 'P,Q', Z: 'Q,R', W: 'P,R' },
  }),
  287: ab('U>A,V>B,S>R,T>R', {
    locks: { P: 'A', S: 'A', Q: 'B', T: 'B' },
    free: 'U,V',
    no: 'A>B,B>A',
    mask: { S: 'R', T: 'R' },
  }),
  288: ab('X>Y,X>Z,Y>P,Y>Q,U>R', { unrelated: 'Z' }),
  289: ab('X>U,X>V,X>W,U>P,V>Q,W>R', {
    locks: { A: 'B', X: 'A' },
    mask: { U: 'P', V: 'Q', W: 'R' },
    gap: 'X>U',
  }),
  290: ab('X>U,X>V,X>W,U>P,V>Q,W>R', {
    locks: { A: 'B', X: 'A' },
    mask: { U: 'P', V: 'Q', W: 'R' },
    gap: 'X>U',
  }),
  291: ab('I>K,K>A,K>B,X>P,X>Q,Y>Q,Y>R,U>P,V>R', {
    inner: 'I',
    mask: { X: 'P,Q', Y: 'Q,R', U: 'P', V: 'R' },
    far: 'U>P,V>R',
  }),
  292: ab('P>U,U>Q,Q>V,V>R,X>A,X>B', { locks: { P: 'A', R: 'B' } }),
  293: ab('X>P,X>Q,Y>Q,Y>R', {
    mask: { X: 'P,Q', Y: 'Q,R' },
    gap: 'X>P,Y>R',
    free: 'D,E',
    unrelated: 'D,E',
  }),
  294: ab('U>Q,V>Q,X>P,Y>R', {
    locks: { P: 'A', U: 'A', V: 'B', R: 'B' },
    mask: { U: 'Q', V: 'Q', X: 'P', Y: 'R' },
  }),
  295: ab('X>P,X>Q,U>R,V>R,W>U,W>V', {
    locks: { P: 'A', Q: 'A', U: 'B' },
    mask: { X: 'P,Q', U: 'R', V: 'R', W: 'R' },
    unrelated: 'D',
  }),
  296: ab('X>P,X>Q,U>R,V>R', {
    locks: { P: 'A', Q: 'A', U: 'B' },
    mask: { X: 'P,Q', U: 'R', V: 'R' },
  }),
  297: ab('X>P,X>Q,X>R,U>P,V>Q,W>R', {
    locks: { A: 'B', P: 'A', Q: 'A', R: 'A', D: 'B' },
    mask: { U: 'P', V: 'Q', W: 'R' },
    unrelated: 'D',
  }),
  298: ab('Z>X,Z>Y,X>P,X>Q,Y>Q,Y>R', {
    locks: { X: 'A', Y: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R', Z: 'P,Q,R' },
    far: 'X>P,Y>R',
  }),
  299: ab('P>U,U>Q,Q>V,V>R', { locks: { P: 'A', V: 'B' } }),
  300: ab('K>A,K>B,X>P,P>Q,Y>Q,Y>R,U>R', {
    locks: { P: 'A', R: 'B' },
    mask: { X: 'P,Q', Y: 'Q,R', U: 'R' },
    gap: 'X>P,Y>R',
  }),
});

// Spatial and state witnesses supplement the dependency skeletons.
Object.assign(contracts[1], {
  zones: { X: [0, 0.5, 0.5, 1], D: [0.66, 1, 0, 1] },
  direction: { X: [0, 1] },
});
Object.assign(contracts[31], {
  layout: 'three-islands',
  columns: 3,
  zones: { P: [0, 0.333, 0, 1], Q: [0.333, 0.666, 0, 1], D: [0.666, 1, 0, 1] },
  unrelatedRegions: 'D',
  branch: 'D',
});
Object.assign(contracts[67], { distinctContacts: 'X>P,X>Q' });
Object.assign(contracts[133], { mask: { V: 'Q,R' } });
Object.assign(contracts[193], {
  columns: 3,
  rows: 2,
  unrelatedRegions: 'D',
  branch: 'D',
});
Object.assign(contracts[258], {
  columns: 3,
  rows: 2,
  unrelatedRegions: 'D,E',
  branch: 'D,E',
});
for (const id of [98, 109, 110])
  contracts[id].no = [
    contracts[id].no,
    ...(id === 98 ? ['Y>A', 'A>Y'] : ['G>A', 'A>G']),
  ]
    .filter(Boolean)
    .join(',');
for (const [id, pivot, children] of [
  [4, 'X', 'U,V'],
  [14, 'X', 'U,V'],
  [29, 'X', 'U,V'],
  [221, 'X', 'U,V,D'],
  [222, 'X', 'U,V,D'],
  [232, 'X', 'U,V,D,E'],
  [288, 'X', 'Y,Z'],
])
  contracts[id].release = { [pivot]: children };
Object.assign(contracts[272], { layout: 'three-islands' });
Object.assign(contracts[286], {
  g: 'Y>P,Y>Q,Z>Q,Z>R,W>P,W>R,preA>A,preB>B',
  r: 'X>Y,X>Z,X>W',
});
Object.assign(contracts[291], {
  g: 'I>K,X>P,X>Q,Y>Q,Y>R,U>P,V>R',
  r: 'K>A,K>B',
  no: 'A>B,B>A',
  innerLength: 6,
  unorderedKeys: true,
});
