'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  RotateCcw,
  Undo2,
  Lightbulb,
  Volume2,
  VolumeX,
  CircleHelp,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
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
  collect,
  matchLevels,
  palette,
  replay,
  solve,
  symbols,
} from '@/lib/experiments/match';
import './match.css';
const EMPTY: number[] = [];
const KEY = 'arrow-escape:experiment:match:v1';
type Save = { level: number; runs: Record<number, number[]> };
export default function MatchGame() {
  const [saved, setSaved] = useState<Save>({ level: 1, runs: {} });
  const [loaded, setLoaded] = useState(false),
    [sound, setSound] = useState(false),
    [help, setHelp] = useState(false),
    [saveError, setSaveError] = useState(false),
    [reduced, setReduced] = useState(false);
  const [notice, setNotice] = useState(''),
    [flying, setFlying] = useState<number[]>([]),
    [hint, setHint] = useState<number | null>(null),
    [bump, setBump] = useState<{
      id: number;
      blocked: number[];
      serial: number;
    } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const savedRef = useRef(saved);
  const level = matchLevels[saved.level - 1];
  const moves = saved.runs[saved.level] ?? EMPTY;
  const state = useMemo(() => replay(level, moves), [level, moves]);
  const appearances = useMemo(
    () =>
      Object.fromEntries(
        level.arrows.map((a) => [
          a.id,
          {
            color: palette[level.colors[a.id]],
            symbol: symbols[level.colors[a.id]],
          },
        ]),
      ),
    [level],
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        if (
          raw &&
          Number.isInteger(raw.level) &&
          raw.level >= 1 &&
          raw.level <= 6 &&
          raw.runs &&
          typeof raw.runs === 'object'
        ) {
          const runs: Record<number, number[]> = {};
          for (const l of matchLevels) {
            const input = raw.runs[l.id];
            if (
              Array.isArray(input) &&
              input.length <= l.arrows.length &&
              input.every(Number.isInteger)
            )
              runs[l.id] = replay(l, input).removed;
          }
          const restored = { level: raw.level, runs };
          savedRef.current = restored;
          setSaved(restored);
        }
      } catch {
        setSaveError(true);
      }
      setLoaded(true);
    });
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    const motionFrame = requestAnimationFrame(update);
    mq.addEventListener('change', update);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(motionFrame);
      mq.removeEventListener('change', update);
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(KEY, JSON.stringify(saved));
      } catch {
        queueMicrotask(() => setSaveError(true));
      }
  }, [saved, loaded]);
  function commit(next: Save) {
    savedRef.current = next;
    setSaved(next);
  }
  function clearFeedback() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFlying([]);
    setHint(null);
    setBump(null);
    setNotice('');
  }
  function tap(id: number) {
    if (!loaded || help) return;
    const current = savedRef.current,
      l = matchLevels[current.level - 1],
      s = replay(l, current.runs[l.id] ?? []);
    if (s.status !== 'playing' || s.removed.includes(id)) return;
    const blocked = blockers(l, s.removed, id);
    if (blocked.length) {
      setBump({ id, blocked, serial: Date.now() });
      setNotice('出口被挡住了，先沿这条线找到阻挡。');
      return;
    }
    const next = collect(l, s, id);
    if (next === s) return;
    commit({ ...current, runs: { ...current.runs, [l.id]: next.removed } });
    setHint(null);
    setBump(null);
    setFlying((v) => [...v, id]);
    timers.current.push(
      setTimeout(
        () => setFlying((v) => v.filter((x) => x !== id)),
        reduced ? 80 : 650,
      ),
    );
    setNotice(
      next.matches > s.matches
        ? `${symbols[l.colors[id]]}类凑齐，腾出3格。`
        : next.tray.length >= 5
          ? '槽位不多了，看看哪一组更容易凑齐。'
          : '',
    );
    if (sound)
      playSound(
        next.status === 'won'
          ? 'win'
          : next.matches > s.matches
            ? 'hint'
            : 'escape',
      );
  }
  function undo() {
    clearFeedback();
    const c = savedRef.current;
    commit({
      ...c,
      runs: { ...c.runs, [c.level]: (c.runs[c.level] ?? []).slice(0, -1) },
    });
  }
  function restart() {
    clearFeedback();
    commit({
      ...savedRef.current,
      runs: { ...savedRef.current.runs, [savedRef.current.level]: [] },
    });
  }
  function choose(id: number) {
    clearFeedback();
    commit({ ...savedRef.current, level: id });
  }
  function showHint() {
    const path = solve(level, state);
    setHint(path?.[0] ?? null);
    setNotice(
      path === null
        ? '当前选择已经无法清场，撤回一步，再试另一种顺序。'
        : path === undefined
          ? '这一步还没找到可靠提示，可以撤回观察。'
          : path.length
            ? `试试高亮的${symbols[level.colors[path[0]]]}类箭头；从这里仍有清场路线。`
            : '已经清场。',
    );
  }
  const completed = matchLevels.filter(
    (l) => replay(l, saved.runs[l.id] ?? []).status === 'won',
  ).length;
  return (
    <main className={`match-app ${reduced ? 'reduce-motion' : ''}`}>
      <header className="match-header">
        <Link href="/" className="match-brand">
          <span>
            <ArrowUpRight />
          </span>
          <div>
            箭头集集<small>ARROW MATCH · 玩法实验</small>
          </div>
        </Link>
        <div className="match-header-actions">
          <button aria-label="玩法说明" onClick={() => setHelp(true)}>
            <CircleHelp size={20} />
          </button>
          <button
            aria-label="切换音效"
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          >
            {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>
      <div className="match-layout">
        <aside className="match-intro">
          <span className="match-eyebrow">A LITTLE ROOM FOR STRATEGY</span>
          <h1>
            出逃之后，
            <br />
            还有点<span>小心思。</span>
          </h1>
          <p>
            解开交错的方向，
            <br />
            也为下一组留一个位置。
          </p>
          <div className="match-principle">
            <span>01</span>
            <p>出口畅通，才能收集</p>
            <span>02</span>
            <p>同类三个，腾出空间</p>
            <span>03</span>
            <p>七格满了，撤回再想想</p>
          </div>
          <Link className="match-baseline" href="/classic">
            试玩原版规则 <ArrowUpRight size={16} />
          </Link>
          <small>
            {saveError ? '暂时无法保存进度' : '实验进度仅保存在当前浏览器'}
          </small>
        </aside>
        <section className="match-play" aria-label="配对游戏">
          <div className="match-level-title">
            <div>
              <span className="match-eyebrow">
                PUZZLE {String(level.id).padStart(2, '0')} / 06
              </span>
              <h2>{level.title}</h2>
            </div>
            <span className="match-count">
              {level.arrows.length - state.removed.length}
              <small>根待收集</small>
            </span>
          </div>
          <div className="match-paper">
            <div className="match-board-top">
              <span>
                <span className="match-dot" />
                {state.status === 'playing'
                  ? '慢慢想，没有倒计时'
                  : state.status === 'won'
                    ? '全部配对完成'
                    : '槽位已满'}
              </span>
              <span>
                {state.matches} / {level.arrows.length / 3} 组
              </span>
            </div>
            <div className="match-board">
              <Board
                level={level}
                run={{ ...newRun(level.id), removed: state.removed, hint }}
                appearances={appearances}
                flying={flying}
                bump={bump}
                reducedMotion={reduced}
                onTap={tap}
                disabled={!loaded || help || state.status !== 'playing'}
                directionWords={['右', '下', '左', '上']}
                label={`第${level.id}关配对箭头棋盘`}
                en={false}
              />
            </div>
            <div className="match-tray-label">
              <strong>
                收集槽 <span>{state.tray.length} / 7</span>
              </strong>
              <span>相同字母 × 3 = 消除</span>
            </div>
            <div
              className={`match-tray ${state.tray.length >= 5 ? 'match-tray-tight' : ''}`}
              aria-label="七格收集槽"
            >
              {Array.from({ length: 7 }, (_, i) => {
                const id = state.tray[i];
                return (
                  <div
                    key={i}
                    className={`match-slot ${id !== undefined ? 'occupied' : ''}`}
                    style={
                      id === undefined
                        ? undefined
                        : { color: palette[level.colors[id]] }
                    }
                  >
                    {id === undefined ? (
                      <span className="slot-dot" />
                    ) : (
                      <>
                        <ArrowUpRight size={22} />
                        <b>{symbols[level.colors[id]]}</b>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="match-status" aria-live="polite">
              {state.status === 'won' ? (
                <>
                  <Sparkles size={16} /> 一组不落，干净利落。
                </>
              ) : state.status === 'lost' ? (
                '七格都占满了。撤回一步，重新安排收集顺序。'
              ) : (
                notice || level.note
              )}
            </div>
          </div>
          <div className="match-controls">
            <button
              onClick={undo}
              disabled={!loaded || !moves.length || flying.length > 0}
            >
              <Undo2 size={18} />
              <span>撤回</span>
            </button>
            <button onClick={restart} disabled={!loaded || !moves.length}>
              <RotateCcw size={18} />
              <span>重来</span>
            </button>
            {state.status === 'won' ? (
              <button
                className="match-primary"
                onClick={() => choose(level.id === 6 ? 1 : level.id + 1)}
              >
                {level.id === 6 ? '回到第一关' : '下一关'}
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                className="match-primary"
                onClick={showHint}
                disabled={!loaded || state.status === 'lost'}
              >
                <Lightbulb size={18} />
                一点提示
              </button>
            )}
          </div>
          <nav className="match-levels" aria-label="实验关卡">
            {matchLevels.map((l) => (
              <button
                key={l.id}
                className={l.id === level.id ? 'selected' : ''}
                aria-label={`选择第${l.id}关`}
                aria-current={l.id === level.id ? 'step' : undefined}
                onClick={() => choose(l.id)}
              >
                {replay(l, saved.runs[l.id] ?? []).status === 'won' ? (
                  <Check size={16} />
                ) : (
                  String(l.id).padStart(2, '0')
                )}
              </button>
            ))}
          </nav>
        </section>
        <aside className="match-journal">
          <div className="match-illustration" aria-hidden="true">
            <span>A</span>
            <span>A</span>
            <span>A</span>
            <Sparkles />
          </div>
          <span className="match-eyebrow">THE JOY OF MAKING ROOM</span>
          <h3>
            留一点余地，
            <br />
            让好事成组。
          </h3>
          <p>
            有时候，最好的下一步，
            <br />
            是让一根箭头再等一会儿。
          </p>
          <div className="match-stamp">
            {completed}
            <small> / 6 张小谜题</small>
          </div>
        </aside>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="game-dialog">
          <button
            className="dialog-close icon-button"
            aria-label="关闭说明"
            onClick={() => setHelp(false)}
          >
            <X />
          </button>
          <DialogTitle>出逃，再凑成一组</DialogTitle>
          <DialogDescription>
            这是独立的配对玩法实验，共6关，可以自由选择。
          </DialogDescription>
          <ol className="help-steps">
            <li>箭头前方没有阻挡时，点击收进暂存槽。</li>
            <li>相同颜色、相同字母的3根箭头自动消除。</li>
            <li>凑组后仍占满7格，本次尝试结束；可以撤回或重来。</li>
            <li>清空棋盘和收集槽就过关。没有倒计时，提示与撤回不限次数。</li>
          </ol>
          <button className="primary-button" onClick={() => setHelp(false)}>
            开始收集
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
