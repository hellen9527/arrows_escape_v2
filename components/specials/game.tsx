/* oxlint-disable next/no-html-link-for-pages -- Vinext Link RSC navigation fails in the production preview; native links reliably restore saved progress. */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Wind,
  Sparkles,
  Check,
  RotateCcw,
  Undo2,
  Lightbulb,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  CircleHelp,
} from 'lucide-react';
import { FeedbackButton } from '@/components/feedback/feedback';
import { Board } from '@/components/game/board';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { blockers, newRun } from '@/lib/game/engine';
import { playSound } from '@/lib/game/sound';
import {
  specials,
  play,
  replaySpecial,
  restoreSpecials,
  SPECIAL_KEY,
  asMatch,
  type Special,
  type SpecialSave,
} from '@/lib/specials/engine';
import { palette, symbols, solve } from '@/lib/specials/match';
import { readSpecialSave, SkinSwitch } from './shared';
import './specials.css';
const EMPTY: number[] = [];
const kindNames = { breeze: '顺风连消', giant: '长尾风筝', match: '彩色集结' };
function Cover({ kind }: { kind: Special['kind'] }) {
  return (
    <svg
      className={`special-cover ${kind}`}
      viewBox="0 0 300 150"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 120 Q65 85 132 120 T310 107"
        stroke="currentColor"
        opacity=".12"
      />
      <path
        d="M-10 133 Q70 105 140 131 T310 120"
        stroke="currentColor"
        opacity=".08"
      />
      {kind === 'match' ? (
        <>
          {[0, 1, 2].map((n) => (
            <g
              key={n}
              transform={`translate(${88 + n * 61},${78 - (n % 2) * 15})`}
            >
              <rect
                x={-22}
                y={-25}
                width={44}
                height={50}
                rx={13}
                fill={palette[n]}
                opacity=".12"
              />
              <path
                d="M-9 12 L9 -10 M-7 -8 L9 -10 L7 6"
                stroke={palette[n]}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <text y={-33} fill={palette[n]} textAnchor="middle" fontSize={12}>
                {symbols[n]}
              </text>
            </g>
          ))}
        </>
      ) : (
        <>
          <path
            d={
              kind === 'giant'
                ? 'M60 112 H120 V92 H90 V66 H180 V39 H218'
                : 'M54 101 H99 V76 H138 V44 H187'
            }
            stroke="currentColor"
            strokeWidth={kind === 'giant' ? 5 : 3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={
              kind === 'giant'
                ? 'M232 39 L210 27 L214 39 L210 51 Z'
                : 'M202 44 L182 33 L186 44 L182 55 Z'
            }
            fill="currentColor"
          />
          <path
            d="M53 106 L62 98 M52 99 L62 106"
            stroke="currentColor"
            strokeWidth={2}
          />
          {kind === 'breeze' && (
            <>
              <path
                d="M180 103 H231 M216 95 L231 103 L216 111 M213 72 H252 M239 65 L252 72 L239 79 M126 117 H163 M152 111 L163 117 L152 123"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={99}
                cy={76}
                r={11}
                fill="#f7faf5"
                stroke="currentColor"
              />
              <text
                x={99}
                y={81}
                textAnchor="middle"
                fill="currentColor"
                fontSize={17}
              >
                ≈
              </text>
            </>
          )}
        </>
      )}
      <circle cx={45} cy={42} r={3} fill="currentColor" opacity=".16" />
      <circle cx={252} cy={35} r={4} fill="currentColor" opacity=".12" />
    </svg>
  );
}
export default function SpecialGame() {
  const [saved, setSaved] = useState<SpecialSave>(() => restoreSpecials(null)),
    savedRef = useRef(saved);
  const [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notice, setNotice] = useState(''),
    [flying, setFlying] = useState<number[]>([]),
    [hint, setHint] = useState<number | null>(null);
  const [bump, setBump] = useState<{
    id: number;
    blocked: number[];
    serial: number;
  } | null>(null);
  const [help, setHelp] = useState(false),
    [confirmRetry, setConfirmRetry] = useState(false),
    [sound, setSound] = useState(false),
    [reduced, setReduced] = useState(false),
    [saveError, setSaveError] = useState(false),
    [zoom, setZoom] = useState(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    busy = useRef(false);
  const level = selected ? specials[selected - 1] : null;
  const moves = level ? (saved.runs[level.id] ?? EMPTY) : EMPTY;
  const state = useMemo(
    () => (level ? replaySpecial(level, moves) : null),
    [level, moves],
  );
  function commit(next: SpecialSave) {
    const normalized = restoreSpecials(next);
    savedRef.current = normalized;
    setSaved(normalized);
    try {
      localStorage.setItem(SPECIAL_KEY, JSON.stringify(normalized));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  function clearFeedback() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busy.current = false;
    setFlying([]);
    setBump(null);
    setHint(null);
    setNotice('');
    setHelp(false);
    setConfirmRetry(false);
    setZoom(1);
  }
  useEffect(() => {
    document.documentElement.lang = 'zh-CN';
    function restoreLocation() {
      clearFeedback();
      const id = Number(new URL(location.href).searchParams.get('stage'));
      setSelected(Number.isInteger(id) && id >= 1 && id <= 12 ? id : null);
    }
    const frame = requestAnimationFrame(() => {
      let save = readSpecialSave();
      const id = Number(new URL(location.href).searchParams.get('stage'));
      if (Number.isInteger(id) && id >= 1 && id <= 12)
        save = { ...save, seen: [...new Set([...save.seen, id])] };
      commit(save);
      restoreLocation();
      setLoaded(true);
    });
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(mq.matches);
    const motionFrame = requestAnimationFrame(motion);
    mq.addEventListener('change', motion);
    window.addEventListener('popstate', restoreLocation);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(motionFrame);
      mq.removeEventListener('change', motion);
      window.removeEventListener('popstate', restoreLocation);
      timers.current.forEach(clearTimeout);
    };
  }, []);
  function select(id: number | null) {
    clearFeedback();
    setSelected(id);
    history.pushState(null, '', id ? `/specials?stage=${id}` : '/specials');
    if (id)
      commit({
        ...savedRef.current,
        seen: [...new Set([...savedRef.current.seen, id])],
      });
  }
  function tap(id: number) {
    if (
      !loaded ||
      !level ||
      busy.current ||
      help ||
      confirmRetry ||
      feedbackOpen
    )
      return;
    const current = savedRef.current,
      s = replaySpecial(level, current.runs[level.id] ?? []),
      next = play(level, s, id);
    if (next === s) {
      if (s.status === 'playing' && !s.removed.includes(id)) {
        setBump({
          id,
          blocked: blockers(level, s.removed, id),
          serial: Date.now(),
        });
        setNotice('出口还被挡着，沿线找找高亮的阻挡。');
        if (sound) playSound('block');
      }
      return;
    }
    setHint(null);
    setBump(null);
    const outgoing = next.removed.filter((x) => !s.removed.includes(x));
    setFlying(outgoing);
    busy.current = true;
    setNotice(
      level.kind === 'match'
        ? next.matches > s.matches
          ? '一组集齐，空位回来了。'
          : '已入槽，看看下一组还缺谁。'
        : outgoing.length > 1
          ? `这一阵风，额外放走 ${outgoing.length - 1} 支箭头。`
          : id === level.giant
            ? '长尾放飞！再把余下的线解开。'
            : '',
    );
    if (sound)
      playSound(
        next.matches > s.matches || outgoing.length > 1 ? 'hint' : 'escape',
        s.moves.length,
      );
    commit({ ...current, runs: { ...current.runs, [level.id]: next.moves } });
    timers.current.push(
      setTimeout(
        () => {
          setFlying([]);
          busy.current = false;
          if (next.status === 'won' && sound) playSound('win');
        },
        reduced ? 100 : 640,
      ),
    );
  }
  function undo() {
    if (!level || busy.current) return;
    clearFeedback();
    const current = savedRef.current;
    commit({
      ...current,
      runs: {
        ...current.runs,
        [level.id]: (current.runs[level.id] ?? []).slice(0, -1),
      },
    });
    setNotice('已撤销这一手，整阵风也会一起回来。');
  }
  function retry() {
    if (!level) return;
    clearFeedback();
    const current = savedRef.current;
    commit({ ...current, runs: { ...current.runs, [level.id]: [] } });
  }
  function suggest() {
    if (!level || !state || busy.current) return;
    if (level.kind === 'match') {
      const path = solve(asMatch(level), state, 12000);
      if (!path?.length) {
        setNotice(
          path === null
            ? '这个收集顺序已经走不通了，撤销几步再试。'
            : '暂时没找到完整解法，先看看槽里数量最多的字母。',
        );
        return;
      }
      setHint(path[0]);
      setNotice('这支箭头能接上一条完整的清场路线。');
    } else {
      const candidates = level.arrows.filter(
        (a) =>
          !state.removed.includes(a.id) &&
          !blockers(level, state.removed, a.id).length,
      );
      const a =
        candidates.find(
          (a) => level.wind.includes(a.id) || a.id === level.giant,
        ) ?? candidates[0];
      if (a) {
        setHint(a.id);
        setNotice('这条出口畅通，可以先从这里打开。');
      }
    }
  }
  const appearances = useMemo(
    () =>
      level
        ? Object.fromEntries(
            level.arrows.map((a) => [
              a.id,
              level.kind === 'match'
                ? {
                    color: palette[level.colors[a.id]],
                    symbol: symbols[level.colors[a.id]],
                  }
                : level.wind.includes(a.id)
                  ? { color: '#27816f', symbol: '≈' }
                  : a.id === level.giant
                    ? { color: '#b96737', giant: true }
                    : { color: '#425b66' },
            ]),
          )
        : undefined,
    [level],
  );
  const completed = state?.status === 'won' && !flying.length;
  return (
    <main
      className={`special-app ${level ? `playing-special ${level.kind}` : 'special-gallery'}`}
    >
      <header className="special-header">
        <a href="/" className="special-back">
          <ArrowLeft size={17} />
          <span>返回主线</span>
        </a>
        <span className="special-wordmark">
          途中奇遇 <i>WIND & WANDER</i>
        </span>
        <div className="special-header-tools">
          <FeedbackButton
            onOpenChange={setFeedbackOpen}
            context={{
              mode: level ? 'special' : 'gallery',
              level: level?.id ?? 0,
              removed: state?.removed.length ?? 0,
              total: level?.arrows.length ?? 0,
              mistakes: null,
              hints: null,
            }}
          />
          <SkinSwitch />
        </div>
      </header>
      {!level ? (
        <div className="gallery-scroll">
          <section className="special-intro">
            <div>
              <span className="special-eyebrow">走得远，也偶尔绕个弯</span>
              <h1>
                解开方向，
                <br />
                <em>遇见一点不同。</em>
              </h1>
              <p>
                一阵顺风、一只长尾风筝、一次小小集结。
                <br />
                12 段短旅程，随时回来继续主线。
              </p>
            </div>
            <div className="intro-art">
              <Cover kind="giant" />
              <span>LET THE WIND TAKE IT</span>
            </div>
          </section>
          <div className="gallery-label">
            <h2>选一段奇遇</h2>
            <span>{saved.done.length} / 12 已完成</span>
          </div>
          <div className="special-grid">
            {specials.map((l) => (
              <button
                key={l.id}
                className={`special-card ${l.kind}`}
                onClick={() => select(l.id)}
                disabled={!loaded}
              >
                <div className="card-overline">
                  <span>
                    {String(l.id).padStart(2, '0')} · {kindNames[l.kind]}
                  </span>
                  {saved.done.includes(l.id) ? (
                    <span className="card-done">
                      <Check size={13} />
                      完成
                    </span>
                  ) : (
                    <ArrowUpRight size={17} />
                  )}
                </div>
                <Cover kind={l.kind} />
                <h3>{l.title}</h3>
                <p>{l.subtitle}</p>
                <footer>
                  <span>{l.arrows.length} 支箭头</span>
                  <span>第 {l.after} 关后的邀请</span>
                </footer>
              </button>
            ))}
          </div>
          <a href="/practice/match" className="legacy-practice-link">
            <span>还想慢慢配对？</span>
            <strong>原版配对试玩 · 6 关</strong>
            <ArrowUpRight size={19} />
          </a>
          <p className="gallery-foot">
            奇遇可以直接试玩，不计入主线通关数。进度保存在这台设备。
          </p>
        </div>
      ) : (
        <>
          <section className="special-stage-heading">
            <div>
              <span className="special-eyebrow">
                奇遇 {String(level.id).padStart(2, '0')} ·{' '}
                {kindNames[level.kind]}
              </span>
              <h1>{level.title}</h1>
            </div>
            <button
              className="special-text-button"
              onClick={() => select(null)}
            >
              全部奇遇
            </button>
          </section>
          <div className="special-play-layout">
            <section className="special-board-shell" aria-label="奇遇棋盘">
              <div className="special-board-top">
                <span>
                  {state!.removed.length} / {level.arrows.length} 已出逃
                </span>
                <div>
                  <button
                    aria-label={zoom === 1 ? '放大棋盘' : '缩小棋盘'}
                    title={zoom === 1 ? '放大棋盘' : '缩小棋盘'}
                    onClick={() => setZoom(zoom === 1 ? 2 : 1)}
                  >
                    {zoom === 1 ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
                  </button>
                  <button aria-label="玩法说明" onClick={() => setHelp(true)}>
                    <CircleHelp size={18} />
                  </button>
                  <button
                    aria-label="切换音效"
                    aria-pressed={sound}
                    onClick={() => {
                      setSound(!sound);
                      if (!sound) playSound('hint');
                    }}
                  >
                    {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                </div>
              </div>
              <div
                className={`special-board-viewport ${zoom > 1 ? 'zoomed' : ''}`}
              >
                <div
                  className="special-board-inner"
                  style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
                >
                  <Board
                    level={level}
                    run={{ ...newRun(level.id), removed: state!.removed, hint }}
                    flying={flying}
                    bump={bump}
                    reducedMotion={reduced}
                    onTap={tap}
                    directionWords={['右', '下', '左', '上']}
                    label={`${kindNames[level.kind]}棋盘`}
                    en={false}
                    disabled={
                      !loaded ||
                      flying.length > 0 ||
                      state!.status !== 'playing' ||
                      help ||
                      confirmRetry
                    }
                    appearances={appearances}
                  />
                </div>
              </div>
              <progress
                className="special-progress"
                aria-label="清场进度"
                max={level.arrows.length}
                value={state!.removed.length}
              />
            </section>
            <aside className="special-controls">
              <div className="special-rule">
                <span>
                  {level.kind === 'match' ? (
                    <Sparkles size={18} />
                  ) : (
                    <Wind size={18} />
                  )}
                </span>
                <p>{level.subtitle}</p>
              </div>
              {level.kind === 'match' && (
                <fieldset className="special-tray" aria-label="七个收集槽位">
                  {Array.from({ length: 7 }, (_, i) => {
                    const id = state!.tray[i];
                    return (
                      <span
                        key={i}
                        className={id === undefined ? '' : 'filled'}
                        style={
                          id === undefined
                            ? undefined
                            : {
                                color: palette[level.colors[id]],
                                borderColor: palette[level.colors[id]],
                              }
                        }
                        aria-label={
                          id === undefined
                            ? '空槽位'
                            : symbols[level.colors[id]]
                        }
                      >
                        {id === undefined ? <i /> : symbols[level.colors[id]]}
                      </span>
                    );
                  })}
                </fieldset>
              )}
              <output className="special-notice">
                {notice ||
                  (zoom > 1
                    ? '拖动棋盘查看；缩小可看全局。'
                    : level.kind === 'match'
                      ? '只有本次集结需要配对。七格满了，可以撤销。'
                      : '没有倒计时。碰到阻挡，看看再来。')}
              </output>
              <div className="special-actions">
                <button
                  onClick={undo}
                  disabled={!moves.length || flying.length > 0}
                >
                  <Undo2 size={19} />
                  撤销
                </button>
                <button
                  onClick={suggest}
                  disabled={state!.status !== 'playing' || flying.length > 0}
                >
                  <Lightbulb size={19} />
                  线索
                </button>
                <button
                  onClick={() => setConfirmRetry(true)}
                  disabled={!moves.length || flying.length > 0}
                >
                  <RotateCcw size={19} />
                  重来
                </button>
              </div>
              <p className="special-save-note">
                {saveError
                  ? '当前浏览器无法保存，离开后进度可能丢失。'
                  : '随时离开，回来接着解。'}
              </p>
            </aside>
          </div>
          <Dialog
            open={
              !feedbackOpen &&
              (help || confirmRetry || completed || state!.status === 'lost')
            }
            onOpenChange={(open) => {
              if (!open) {
                setHelp(false);
                setConfirmRetry(false);
              }
            }}
          >
            <DialogContent
              className="special-dialog"
              showCloseButton={help || confirmRetry}
            >
              {help ? (
                <>
                  <span className="special-eyebrow">玩法说明</span>
                  <DialogTitle>{kindNames[level.kind]}</DialogTitle>
                  <DialogDescription>{level.subtitle}</DialogDescription>
                  <p>
                    {level.kind === 'breeze'
                      ? '带 ≈ 的箭头出逃时，最多再放走三支出口畅通的箭头，优先刚刚被解开的。顺风带走的风纹不会继续触发。最后仍需清空棋盘。'
                      : level.kind === 'giant'
                        ? '棕色长尾风筝也按尖端方向出逃。沿着它的线找到箭头尖，先解除出口的阻挡；长线本身不会增加额外条件。清空棋盘即可完成。'
                        : '点击出口没有阻挡的箭头进入槽位。相同字母集齐三个立即消除；七格满且没有凑成一组时失败。能走的箭头也可以先等等，选择有意义的顺序。'}
                  </p>
                  <button
                    className="special-primary"
                    onClick={() => setHelp(false)}
                  >
                    明白了，开始解
                  </button>
                </>
              ) : confirmRetry ? (
                <>
                  <DialogTitle>从头再解这次奇遇？</DialogTitle>
                  <DialogDescription>
                    本局的点击将清空，已经完成的奇遇印章会保留。
                  </DialogDescription>
                  <button className="special-primary" onClick={retry}>
                    重新开始
                  </button>
                  <button
                    className="special-secondary"
                    onClick={() => setConfirmRetry(false)}
                  >
                    继续这局
                  </button>
                </>
              ) : completed ? (
                <>
                  <div className="special-seal">
                    <Wind size={35} />
                  </div>
                  <span className="special-eyebrow">
                    奇遇完成 · {kindNames[level.kind]}
                  </span>
                  <DialogTitle>
                    {level.kind === 'giant'
                      ? '长风自由了。'
                      : level.kind === 'match'
                        ? '都找到同伴了。'
                        : '这一阵风，刚刚好。'}
                  </DialogTitle>
                  <DialogDescription>
                    用 {moves.length} 次点击，放走了 {level.arrows.length}{' '}
                    支箭头。这段奇遇已记在你的旅程里。
                  </DialogDescription>
                  <a href="/" className="special-primary">
                    继续主线 <ArrowUpRight size={18} />
                  </a>
                  <button
                    className="special-secondary"
                    onClick={() => select(null)}
                  >
                    看看其他奇遇
                  </button>
                  <button className="special-secondary" onClick={retry}>
                    再玩这一次
                  </button>
                </>
              ) : (
                <>
                  <DialogTitle>槽位暂时满了</DialogTitle>
                  <DialogDescription>
                    撤销几步，想想怎样先凑成一组。也可以回主线继续出逃。
                  </DialogDescription>
                  <button className="special-primary" onClick={undo}>
                    撤销上一步
                  </button>
                  <button className="special-secondary" onClick={retry}>
                    重新集结
                  </button>
                  <a href="/" className="special-secondary">
                    返回主线
                  </a>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
      {saveError && !level && (
        <output className="gallery-save-error">
          浏览器无法保存，当前进度只在本次打开期间保留。
        </output>
      )}
    </main>
  );
}
