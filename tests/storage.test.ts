import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProgress } from '../lib/game/engine.ts';
void test('revision2 storage takes precedence and migrating never writes the original save', async () => {
  const api = await import('../lib/game/storage.ts').catch(() => null);
  assert.ok(api, 'versioned storage adapter must exist');
  const old = {
    version: 1,
    campaign: 'challenge',
    best: { 1: 3, 2: 3 },
    run: { level: 3, removed: [] },
  };
  const values: Record<string, string> = {
    'arrow-escape:challenge:v1': JSON.stringify(old),
  };
  const storage = { getItem: (key: string) => values[key] ?? null };
  const migrated = api.readProgress(storage, 'challenge');
  assert.equal(migrated.unlocked, 3);
  assert.deepEqual(migrated.previousBest, old.best);
  assert.equal(Object.keys(values).length, 1);
  const current = defaultProgress('challenge');
  values[api.saveKey('challenge')] = JSON.stringify(current);
  assert.deepEqual(api.readProgress(storage, 'challenge'), current);
  assert.throws(() =>
    api.readProgress(
      {
        getItem: () => {
          throw new Error('blocked');
        },
      },
      'challenge',
    ),
  );
});
