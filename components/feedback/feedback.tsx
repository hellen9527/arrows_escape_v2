'use client';
import { useRef, useState } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  feelings,
  type Feeling,
  type FeedbackContext,
} from '@/lib/feedback/server';
import './feedback.css';
const labels: Record<Feeling, [string, string]> = {
  enjoyed: ['玩得挺爽', 'Enjoyed it'],
  easy: ['太简单', 'Too easy'],
  hard: ['太难了', 'Too hard'],
  boring: ['有点重复', 'Repetitive'],
  controls: ['操作不顺', 'Awkward controls'],
  bug: ['发现问题', 'Something broke'],
  other: ['其他感受', 'Something else'],
};
export function FeedbackButton({
  context,
  en = false,
  onOpenChange,
}: {
  context: Omit<FeedbackContext, 'skin'>;
  en?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // Feedback is opt-in: only the player's feedback button opens this dialog.
  // Do not trigger it from progress, wins, losses, timers or draft restoration.
  const [open, setOpen] = useState(false),
    [feeling, setFeeling] = useState<Feeling | null>(null),
    [message, setMessage] = useState(''),
    [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
      'idle',
    ),
    [error, setError] = useState('');
  const requestId = useRef<string | null>(null),
    inFlight = useRef(false);
  const [snapshot, setSnapshot] = useState<FeedbackContext | null>(null);
  function changeOpen(value: boolean) {
    if (inFlight.current) return;
    if (value) {
      if (
        !snapshot ||
        status === 'sent' ||
        (!feeling && !message && !requestId.current)
      )
        setSnapshot({
          ...context,
          skin:
            document.documentElement.dataset.arrowSkin === 'line'
              ? 'line'
              : 'kite',
        });
      if (status === 'sent') {
        setStatus('idle');
        setFeeling(null);
        setMessage('');
        requestId.current = null;
      }
    }
    setOpen(value);
    onOpenChange?.(value);
  }
  async function submit() {
    if (!feeling || inFlight.current || !snapshot) return;
    inFlight.current = true;
    setStatus('sending');
    setError('');
    requestId.current ??= crypto.randomUUID();
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId.current,
          feeling,
          message,
          context: snapshot,
        }),
        signal: controller.signal,
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || data.ok !== true)
        throw new Error(
          en
            ? 'Could not save your feedback. Please try again.'
            : (data.message ?? '暂时没能保存，请稍后重试。'),
        );
      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setError(
        e instanceof Error && e.name !== 'AbortError'
          ? e.message
          : en
            ? 'Connection timed out. Your text is still here.'
            : '连接超时，文字还在，可以重试。',
      );
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
    }
  }
  const label = en ? 'Share feedback' : '反馈感受';
  return (
    <>
      <button
        className="feedback-trigger"
        title={label}
        aria-label={label}
        onClick={() => changeOpen(true)}
      >
        <MessageCircle size={18} />
        <span>{en ? 'Feedback' : '反馈'}</span>
      </button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          className="feedback-dialog"
          showCloseButton={status !== 'sending'}
        >
          {status === 'sent' ? (
            <>
              <div className="feedback-thanks">
                <Check size={28} />
              </div>
              <DialogTitle>
                {en ? 'Thanks for telling us.' : '收到，谢谢你认真玩。'}
              </DialogTitle>
              <DialogDescription>
                {en
                  ? 'Your feedback and level have been saved for the team.'
                  : '你的感受和关卡信息已经保存，我们会用来改进关卡。'}
              </DialogDescription>
              <button
                className="feedback-submit"
                onClick={() => changeOpen(false)}
              >
                {en ? 'Back to the puzzle' : '继续玩'}
              </button>
            </>
          ) : (
            <>
              <DialogTitle>
                {en ? 'How did this puzzle feel?' : '这一关，玩起来怎么样？'}
              </DialogTitle>
              <DialogDescription>
                {en
                  ? 'One honest thought helps us improve.'
                  : '觉得爽、无聊、费脑或操作别扭，都可以告诉我们。'}
              </DialogDescription>
              <fieldset
                className="feedback-feelings"
                disabled={status === 'sending'}
              >
                <legend className="sr-only">
                  {en ? 'Choose a feeling' : '选择一个感受'}
                </legend>
                {feelings.map((f) => (
                  <button
                    type="button"
                    key={f}
                    aria-pressed={feeling === f}
                    onClick={() => {
                      setFeeling(f);
                      requestId.current = null;
                    }}
                  >
                    {labels[f][en ? 1 : 0]}
                  </button>
                ))}
              </fieldset>
              <label className="feedback-label" htmlFor="feedback-message">
                {en ? 'Add a detail (optional)' : '补充一句（可不填）'}
              </label>
              <textarea
                id="feedback-message"
                maxLength={600}
                rows={3}
                value={message}
                disabled={status === 'sending'}
                placeholder={
                  en
                    ? 'Which move felt good or frustrating?'
                    : '哪一步最有意思，或者让你不想继续？'
                }
                onChange={(e) => {
                  setMessage(e.target.value);
                  requestId.current = null;
                }}
              />
              <div className="feedback-context">
                <span>
                  {en ? 'Level included' : '自动附上'}：
                  {snapshot?.mode === 'match-lab'
                    ? en
                      ? 'Matching practice'
                      : '配对练习'
                    : snapshot?.mode === 'gallery'
                      ? en
                        ? 'Detour gallery'
                        : '奇遇选关页'
                      : snapshot?.mode === 'special'
                        ? en
                          ? 'Detour'
                          : '奇遇'
                        : snapshot?.mode === 'training'
                          ? en
                            ? 'Practice'
                            : '引导'
                          : en
                            ? 'Level'
                            : '主线'}{' '}
                  {snapshot?.mode === 'gallery' ? '' : snapshot?.level}
                </span>
                <span>{message.length}/600</span>
              </div>
              <p className="feedback-privacy">
                {en
                  ? 'We send your selected feeling, text and puzzle progress. No account or contact details needed.'
                  : '仅发送你选择的感受、这段文字和本关进度，无需登录或留下联系方式。'}
              </p>
              {error && <output className="feedback-error">{error}</output>}
              <button
                className="feedback-submit"
                onClick={submit}
                disabled={!feeling || status === 'sending'}
              >
                {status === 'sending'
                  ? en
                    ? 'Sending…'
                    : '正在提交…'
                  : en
                    ? 'Send feedback'
                    : '提交感受'}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
