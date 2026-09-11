export function profile(card, c) {
  const stage = card.stage - 1,
    [min, max] = card.candidateArrowRange;
  const offset = { relief: 5, normal: 6, challenge: 9, assessment: 11 }[
    card.designIntent
  ];
  const target = Math.min(max, min + offset + ((card.number % 3) - 1));
  const shape =
    c.layout ||
    (c.gap
      ? /环/.test(card.layoutOrganization)
        ? 'ring'
        : /四岛/.test(card.layoutOrganization)
          ? 'four-islands'
          : /三岛/.test(card.layoutOrganization)
            ? 'three-islands'
            : /六窗|六区/.test(card.layoutOrganization)
              ? 'six-windows'
              : 'islands'
      : /六窗|六区/.test(card.layoutOrganization)
        ? 'six-windows'
        : /三岛/.test(card.layoutOrganization)
          ? 'three-islands'
          : /四岛/.test(card.layoutOrganization)
            ? 'four-islands'
            : /双岛/.test(card.layoutOrganization)
              ? 'islands'
              : /菱形/.test(card.layoutOrganization)
                ? 'diamond'
                : /环/.test(card.layoutOrganization)
                  ? 'ring'
                  : /十字/.test(card.layoutOrganization)
                    ? 'cross'
                    : /沙漏/.test(card.layoutOrganization)
                      ? 'hourglass'
                      : /翼/.test(card.layoutOrganization)
                        ? 'wings'
                        : 'square');
  const size = stage < 2 ? 19 : stage < 4 ? 21 : stage < 6 ? 23 : 25;
  const corridor = c.inner
    ? {
        x: Math.floor(size / 2),
        y:
          shape === 'ring'
            ? Math.floor((size - 1) / 2) + Math.ceil(size * 0.25)
            : Math.floor(size * 0.58),
        ...(c.innerLength ? { length: c.innerLength } : {}),
      }
    : undefined;
  return {
    id: card.number,
    size,
    target,
    corridor,
    depth: 9 + Math.floor(stage / 2),
    shape,
    kind: c.long ? 'mixed' : 'normal',
    exits: c.opening ? [c.opening, c.opening] : undefined,
    slack: card.candidateMoveSlack || 0,
  };
}
