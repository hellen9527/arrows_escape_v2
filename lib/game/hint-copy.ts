import { blockers, type Level, type Run } from './engine.ts';
export function hintCopy(l: Level, r: Run, language: 'zh' | 'en'): string {
  const t = (zh: string, en: string) => (language === 'en' ? en : zh);
  if (r.hintCandidate == null && r.hint == null) return '';
  const candidate = l.arrows.find((a) => a.id === (r.hintCandidate ?? r.hint));
  if (!candidate) return '';
  const [x, y] = candidate.points.at(-1)!;
  const region = t(
    `${y < l.size / 3 ? '上' : y > (l.size * 2) / 3 ? '下' : '中'}${x < l.size / 3 ? '左' : x > (l.size * 2) / 3 ? '右' : '部'}`,
    `${y < l.size / 3 ? 'upper' : y > (l.size * 2) / 3 ? 'lower' : 'middle'} ${x < l.size / 3 ? 'left' : x > (l.size * 2) / 3 ? 'right' : 'center'}`,
  );
  const dependents = l.arrows.filter((a) =>
    blockers(l, r.removed, a.id).includes(candidate.id),
  );
  return r.hintStage === 1
    ? t(
        `先观察${region}区域。这里有一支能推进目标的箭头。`,
        `Look in the ${region}. A clear arrow here advances the goal.`,
      )
    : r.hintStage === 2
      ? candidate.key
        ? t(
            `这一带有 ${candidate.key} 钥匙。沿它的线找到尖端，确认出口。`,
            `Look for key ${candidate.key} here. Trace its line to the tip and check the exit.`,
          )
        : l.objective?.type === 'rescue' &&
            l.objective.targets.includes(candidate.id)
          ? t(
              '这一带有一支星标箭头，出口已经畅通。沿线找到它的尖端。',
              'A starred arrow here has a clear exit. Trace its line to the tip.',
            )
          : dependents.length === 0
            ? t(
                '找一支前方已经畅通的箭头，沿线确认它的尖端。',
                'Find a clear arrow and trace its line to the tip.',
              )
            : t(
                `寻找这一带同时影响 ${dependents.length} 支箭头的线身，再检查它自己的尖端。`,
                `Look for the body affecting ${dependents.length} arrows here, then check its own tip.`,
              )
      : t(
          '这支发光的箭头可以离开，并推进当前目标。',
          'The glowing arrow can leave and advances the current goal.',
        );
}
