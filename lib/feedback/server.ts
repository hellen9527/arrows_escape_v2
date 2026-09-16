export const feelings = [
  'enjoyed',
  'easy',
  'hard',
  'boring',
  'controls',
  'bug',
  'other',
] as const;
export type Feeling = (typeof feelings)[number];
export type FeedbackContext = {
  mode: 'classic' | 'challenge' | 'training' | 'special' | 'gallery';
  level: number;
  removed: number;
  total: number;
  mistakes: number | null;
  hints: number | null;
  skin: 'line' | 'kite';
};
export type Feedback = {
  id: string;
  feeling: Feeling;
  message: string;
  context: FeedbackContext;
};
export function parseFeedback(input: unknown): Feedback | null {
  if (!input || typeof input !== 'object') return null;
  const p = input as Record<string, unknown>,
    c = p.context as Record<string, unknown> | null;
  if (
    typeof p.id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      p.id,
    ) ||
    !feelings.includes(p.feeling as Feeling) ||
    typeof p.message !== 'string' ||
    p.message.length > 600 ||
    !c ||
    typeof c !== 'object'
  )
    return null;
  const modes = ['classic', 'challenge', 'training', 'special', 'gallery'];
  if (
    !modes.includes(c.mode as string) ||
    !['line', 'kite'].includes(c.skin as string)
  )
    return null;
  const maxLevel =
    c.mode === 'gallery'
      ? 0
      : c.mode === 'special'
        ? 12
        : c.mode === 'training'
          ? 8
          : c.mode === 'classic'
            ? 60
            : 300;
  for (const [key, max] of [
    ['level', maxLevel],
    ['removed', 1000],
    ['total', 1000],
    ['mistakes', 10000],
    ['hints', 10000],
  ] as const)
    if (
      !((key === 'mistakes' || key === 'hints') && c[key] === null) &&
      (!Number.isInteger(c[key]) ||
        Number(c[key]) < (key === 'level' && c.mode !== 'gallery' ? 1 : 0) ||
        Number(c[key]) > max)
    )
      return null;
  if (Number(c.removed) > Number(c.total)) return null;
  return {
    id: p.id,
    feeling: p.feeling as Feeling,
    message: p.message.trim(),
    context: {
      mode: c.mode as FeedbackContext['mode'],
      level: Number(c.level),
      removed: Number(c.removed),
      total: Number(c.total),
      mistakes: c.mistakes === null ? null : Number(c.mistakes),
      hints: c.hints === null ? null : Number(c.hints),
      skin: c.skin as FeedbackContext['skin'],
    },
  };
}
export async function submitFeedback(
  input: unknown,
  store: { insert: (feedback: Feedback) => Promise<void> } | null,
): Promise<{
  status: number;
  body: { ok: boolean; message?: string; id?: string };
}> {
  const feedback = parseFeedback(input);
  if (!feedback)
    return {
      status: 400,
      body: { ok: false, message: '反馈内容不完整，请检查后再试。' },
    };
  if (!store)
    return {
      status: 503,
      body: {
        ok: false,
        message: '反馈服务暂不可用，文字已保留，可以稍后重试。',
      },
    };
  try {
    await store.insert(feedback);
    return { status: 200, body: { ok: true, id: feedback.id } };
  } catch {
    return {
      status: 503,
      body: {
        ok: false,
        message: '暂时没能保存反馈，文字已保留，请稍后重试。',
      },
    };
  }
}

export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes = 4096,
): Promise<string | null> {
  if (!body) return '';
  const reader = body.getReader(),
    decoder = new TextDecoder();
  let bytes = 0,
    text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
