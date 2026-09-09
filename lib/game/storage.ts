import { restoreProgress, type Campaign } from './engine.ts';

export const LEGACY_CHALLENGE_KEY = 'arrow-escape:challenge:v1';
export const saveKey = (campaign: Campaign) =>
  campaign === 'classic' ? 'arrow-escape:v1' : 'arrow-escape:challenge:v2';

export function readProgress(
  storage: { getItem: (key: string) => string | null },
  campaign: Campaign,
) {
  const current = storage.getItem(saveKey(campaign));
  const raw =
    current === null && campaign === 'challenge'
      ? storage.getItem(LEGACY_CHALLENGE_KEY)
      : current;
  return restoreProgress(raw, campaign);
}
