import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeedback, submitFeedback } from '../lib/feedback/server.ts';
const valid = {
  id: '106b54e0-247d-4a02-b587-721048d3d8b4',
  feeling: 'boring',
  message: '中间有点重复',
  context: {
    mode: 'challenge',
    level: 31,
    removed: 12,
    total: 100,
    mistakes: 0,
    hints: 1,
    skin: 'kite',
  },
};
void test('feedback accepts bounded context, strips unrelated client fields and rejects invalid data', () => {
  const p = parseFeedback({ ...valid, email: 'do not collect' });
  assert.ok(p);
  assert.equal('email' in p, false);
  assert.equal(parseFeedback({ ...valid, feeling: 'x' }), null);
  assert.equal(parseFeedback({ ...valid, message: 'x'.repeat(601) }), null);
  assert.equal(
    parseFeedback({ ...valid, context: { ...valid.context, level: 999 } }),
    null,
  );
});
void test('feedback only reports success after persistence, and retries use the same ID', async () => {
  const inserted = new Map();
  const store = {
    insert: async (p: NonNullable<ReturnType<typeof parseFeedback>>) => {
      inserted.set(p.id, p);
    },
  };
  for (let i = 0; i < 2; i++)
    assert.equal((await submitFeedback(valid, store)).status, 200);
  assert.equal(inserted.size, 1);
  assert.equal((await submitFeedback(valid, null)).status, 503);
  assert.equal(
    (
      await submitFeedback(valid, {
        insert: async () => {
          throw new Error('offline');
        },
      })
    ).status,
    503,
  );
  assert.equal(
    (await submitFeedback({ ...valid, id: 'invalid' }, store)).status,
    400,
  );
});
void test('streamed request bodies stop as soon as the byte limit is exceeded', async () => {
  const { readLimitedBody } = await import('../lib/feedback/server.ts');
  let cancelled = false,
    reads = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      reads++;
      c.enqueue(new Uint8Array(3000));
    },
    cancel() {
      cancelled = true;
    },
  });
  assert.equal(await readLimitedBody(body), null);
  assert.equal(cancelled, true);
  assert.ok(reads <= 3);
  const bytes = new TextEncoder().encode('感受');
  const normal = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(bytes.slice(0, 2));
      c.enqueue(bytes.slice(2));
      c.close();
    },
  });
  assert.equal(await readLimitedBody(normal), '感受');
});
