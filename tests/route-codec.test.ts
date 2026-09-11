import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoute, decodeRoute } from '../lib/game/route-codec.ts';
void test('compact routes preserve every unit cell and repeated turns', () => {
  const points = [
    [61, 62],
    [62, 62],
    [63, 62],
    [63, 61],
    [62, 61],
    [62, 60],
    [62, 59],
  ];
  assert.deepEqual(decodeRoute(encodeRoute(points)), points);
  assert.throws(() => decodeRoute('broken'));
  assert.throws(() =>
    encodeRoute([
      [0, 0],
      [3, 0],
    ]),
  );
  assert.throws(() => decodeRoute('0,0:X'));
  assert.throws(() => decodeRoute('0,0:'));
});
