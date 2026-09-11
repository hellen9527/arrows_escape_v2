import { restoreProgress, type Campaign } from './engine.ts';

export const LEGACY_CHALLENGE_KEY = 'arrow-escape:challenge:v1';
export const LEGACY_CHALLENGE_V2_KEY = 'arrow-escape:challenge:v2';
export const LEGACY_CHALLENGE_V3_KEY = 'arrow-escape:challenge:v3';
export const LEGACY_CHALLENGE_V4_KEY = 'arrow-escape:challenge:v4';
export const saveKey = (campaign: Campaign) =>
  campaign === 'classic' ? 'arrow-escape:v1' : 'arrow-escape:challenge:v5';

export function readProgress(
  storage: { getItem: (key: string) => string | null },
  campaign: Campaign,
) {
  let raw = storage.getItem(saveKey(campaign));
  if (raw === null && campaign === 'challenge') {
    raw = storage.getItem(LEGACY_CHALLENGE_V4_KEY);
    if (raw === null) raw = storage.getItem(LEGACY_CHALLENGE_V3_KEY);
    if (raw === null) raw = storage.getItem(LEGACY_CHALLENGE_V2_KEY);
    if (raw === null) raw = storage.getItem(LEGACY_CHALLENGE_KEY);
  }
  return restoreProgress(raw, campaign);
}
