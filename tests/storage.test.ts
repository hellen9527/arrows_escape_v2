import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProgress } from '../lib/game/engine.ts';
void test('revision4 storage takes precedence and migrating never writes the original save', async () => {
  const api = await import('../lib/game/storage.ts').catch(() => null);
  assert.ok(api, 'versioned storage adapter must exist');
  assert.equal(api.saveKey('challenge'), 'arrow-escape:challenge:v4');
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
  assert.equal(migrated.unlocked, 1);
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

void test('challenge storage falls back through v2 then v1 only when newer keys are absent', async () => {
  const { readProgress } = await import('../lib/game/storage.ts');
  const first = JSON.stringify({
    ...defaultProgress('challenge'),
    contentRevision: 1,
    best: { 1: 3 },
  });
  const second = JSON.stringify({
    ...defaultProgress('challenge'),
    contentRevision: 2,
    best: { 2: 2 },
  });
  const values: Record<string, string> = {
    'arrow-escape:challenge:v1': first,
    'arrow-escape:challenge:v2': second,
  };
  const reads: string[] = [];
  const storage = {
    getItem: (key: string) => {
      reads.push(key);
      return values[key] ?? null;
    },
  };
  assert.deepEqual(readProgress(storage, 'challenge').previousBest, { 2: 2 });
  assert.deepEqual(reads, [
    'arrow-escape:challenge:v4',
    'arrow-escape:challenge:v3',
    'arrow-escape:challenge:v2',
  ]);
  assert.deepEqual(
    { ...values },
    {
      'arrow-escape:challenge:v1': first,
      'arrow-escape:challenge:v2': second,
    },
  );
  for (const raw of [
    '',
    '{broken',
    JSON.stringify({ ...defaultProgress('challenge'), contentRevision: 5 }),
  ]) {
    values['arrow-escape:challenge:v4'] = raw;
    reads.length = 0;
    assert.deepEqual(
      readProgress(storage, 'challenge'),
      defaultProgress('challenge'),
    );
    assert.deepEqual(reads, ['arrow-escape:challenge:v4']);
  }
  delete values['arrow-escape:challenge:v4'];
  values['arrow-escape:challenge:v2'] = '{broken';
  assert.deepEqual(
    readProgress(storage, 'challenge'),
    defaultProgress('challenge'),
  );
  delete values['arrow-escape:challenge:v2'];
  reads.length = 0;
  assert.deepEqual(readProgress(storage, 'challenge').previousBest, { 1: 3 });
  assert.deepEqual(reads, [
    'arrow-escape:challenge:v4',
    'arrow-escape:challenge:v3',
    'arrow-escape:challenge:v2',
    'arrow-escape:challenge:v1',
  ]);
});

void test('storage failures at a legacy key propagate and classic never reads challenge keys', async () => {
  const { readProgress, saveKey } = await import('../lib/game/storage.ts');
  const reads: string[] = [];
  assert.throws(
    () =>
      readProgress(
        {
          getItem: (key) => {
            reads.push(key);
            if (key === 'arrow-escape:challenge:v2')
              throw new Error('legacy blocked');
            return null;
          },
        },
        'challenge',
      ),
    /legacy blocked/,
  );
  assert.deepEqual(reads, [
    'arrow-escape:challenge:v4',
    'arrow-escape:challenge:v3',
    'arrow-escape:challenge:v2',
  ]);
  reads.length = 0;
  assert.equal(saveKey('classic'), 'arrow-escape:v1');
  assert.deepEqual(
    readProgress(
      {
        getItem: (key) => {
          reads.push(key);
          return null;
        },
      },
      'classic',
    ),
    defaultProgress(),
  );
  assert.deepEqual(reads, ['arrow-escape:v1']);
});
