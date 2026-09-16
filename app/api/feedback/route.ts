import { env } from 'cloudflare:workers';
import { submitFeedback, readLimitedBody } from '@/lib/feedback/server';
export async function POST(request: Request) {
  const json = (body: unknown, status: number) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin)
    return json({ ok: false, message: '请从游戏页面提交反馈。' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    return json({ ok: false, message: '不支持的提交格式。' }, 415);
  if (Number(request.headers.get('Content-Length')) > 4096)
    return json({ ok: false, message: '反馈内容太长。' }, 413);
  const bindings = env as unknown as {
    FEEDBACK_DB?: D1Database;
    FEEDBACK_RATE_LIMITER?: {
      limit: (input: { key: string }) => Promise<{ success: boolean }>;
    };
  };
  try {
    if (bindings.FEEDBACK_RATE_LIMITER) {
      // Cloudflare's limiter holds the network key; IP addresses aren't written to feedback records.
      const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
      const { success } = await bindings.FEEDBACK_RATE_LIMITER.limit({
        key: ip,
      });
      if (!success)
        return json(
          { ok: false, message: '提交有点频繁，请一分钟后再试。' },
          429,
        );
    }
    const text = await readLimitedBody(request.body);
    if (text === null)
      return json({ ok: false, message: '反馈内容太长。' }, 413);
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return json({ ok: false, message: '反馈格式有误。' }, 400);
    }
    const db = bindings.FEEDBACK_DB;
    const result = await submitFeedback(
      input,
      db
        ? {
            insert: async (f) => {
              await db
                .prepare(
                  'INSERT INTO feedback (id, feeling, message, context_json, version) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
                )
                .bind(
                  f.id,
                  f.feeling,
                  f.message,
                  JSON.stringify(f.context),
                  'journey-800-v1',
                )
                .run();
            },
          }
        : null,
    );
    return json(result.body, result.status);
  } catch {
    return json({ ok: false, message: '反馈服务暂不可用，请稍后重试。' }, 503);
  }
}
