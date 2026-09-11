// Product hypotheses; not competitor difficulty coefficients.
export function weaveProfile(id) {
  const band = Math.floor((id - 1) / 10),
    slot = (id - 1) % 10;
  const base =
    id <= 30
      ? 44 + (id - 1) * 1.8
      : id <= 60
        ? 100 + (id - 31) * 1.1
        : id <= 120
          ? 134 + (id - 61) * 0.5
          : 166 + (id - 121) * 0.35;
  const relief = slot === 0 || slot === 5,
    hard = slot === 4 || slot === 9;
  const target = Math.round(base) + (hard ? 4 : relief ? 0 : 2);
  const style = ['weave', 'bridges', 'folds', 'windows', 'wings'][
    (band + slot) % 5
  ];
  const size = Math.ceil(Math.sqrt((target * 12) / 0.65));
  return {
    id,
    target,
    size,
    style,
    relief,
    hard,
    depth: 12 + Math.floor(id / 12) + (hard ? 3 : 0),
    exits: hard ? 4 : relief ? 6 : 5,
    keys: id < 91 ? 0 : id < 121 ? 1 : 2,
    targets: id % 5 === 0 ? 0 : id < 16 ? 1 : id < 151 ? 2 : 3,
    slack: relief ? 4 : hard ? 2 : 3,
  };
}
