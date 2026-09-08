'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  Grid2X2,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Settings2,
  Sparkles,
  Star,
  Undo2,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
  Check,
  Flag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Board } from '@/components/game/board';
import {
  act,
  blockers,
  defaultProgress,
  finishLevel,
  newRun,
  restoreProgress,
  stars,
  type Progress,
} from '@/lib/game/engine';
import { LEVEL_COUNT, makeLevel } from '@/lib/game/levels';
import { useGameTools } from '@/lib/game/webmcp';
import { playSound } from '@/lib/game/sound';

const SAVE_KEY = 'arrow-escape:v1';
const chapters = [
  ['初见方向', 'First directions'],
  ['转角之后', 'Around the corner'],
  ['交错之间', 'Woven paths'],
  ['向内探索', 'Look within'],
  ['自由之境', 'The great escape'],
];
const chapterNotes = [
  ['找到出口，轻轻出发。', 'Find an opening. Make your first move.'],
  ['换个方向，答案就在转角。', 'Follow the bends. Find a new way.'],
  ['耐心观察，解开交错的线。', 'Untangle the paths, one at a time.'],
  ['从外到内，慢慢找到线索。', 'Look a little closer. Follow the clues.'],
  ['相信直觉，也享受思考。', 'Trust your eye. Enjoy the challenge.'],
];
type Panel = 'levels' | 'settings' | 'help' | 'restart' | 'win' | null;

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const progressRef = useRef(progress);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [chapterPage, setChapterPage] = useState(0);
  const [flying, setFlying] = useState<number[]>([]);
  const [bump, setBump] = useState<{
    id: number;
    blocked: number[];
    serial: number;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const [zoom, setZoom] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const winShown = useRef('');
  const [storageFailed, setStorageFailed] = useState(false);
  const en = progress.language === 'en';
  const t = (zh: string, english: string) => (en ? english : zh);
  const run = progress.run;
  const level = useMemo(() => makeLevel(run.level), [run.level]);
  const chapter = Math.floor((run.level - 1) / 12);
  const complete = run.removed.length === level.arrows.length;
  const remaining = level.arrows.length - run.removed.length;
  const totalStars = Object.values(progress.best).reduce((a, b) => a + b, 0);
  const update = useCallback((next: Progress) => {
    progressRef.current = next;
    setProgress(next);
  }, []);
  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms);
    timers.current.push(timer);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        update(restoreProgress(localStorage.getItem(SAVE_KEY)));
      } catch {
        setStorageFailed(true);
      }
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      timers.current.forEach(clearTimeout);
    };
  }, [update]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      queueMicrotask(() => setStorageFailed(true));
    }
    document.documentElement.lang = en ? 'en' : 'zh-CN';
  }, [progress, ready, en]);
  useEffect(() => {
    if (!ready || !complete || flying.length || panel !== null) return;
    const key = `${run.level}:${run.mistakes}:${run.hints}`;
    if (winShown.current === key) return;
    const timer = setTimeout(() => {
      winShown.current = key;
      setPanel('win');
      if (progressRef.current.sound) playSound('win');
    }, 260);
    return () => clearTimeout(timer);
  }, [
    complete,
    flying.length,
    ready,
    run.level,
    run.mistakes,
    run.hints,
    panel,
  ]);
  function startLevel(id: number) {
    if (id > progressRef.current.unlocked || id < 1 || id > LEVEL_COUNT) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFlying([]);
    setBump(null);
    setNotice('');
    setZoom(false);
    winShown.current = '';
    update({ ...progressRef.current, run: newRun(id) });
    setPanel(null);
  }
  function tap(id: number) {
    if (!ready || panel || progressRef.current.run.removed.includes(id)) return;
    const p = progressRef.current;
    const l = makeLevel(p.run.level);
    const blocked = blockers(l, p.run.removed, id);
    if (!l.arrows.some((a) => a.id === id)) return;
    if (blocked.length) {
      if (bump?.id === id) return;
      const serial = Date.now();
      setBump({ id, blocked, serial });
      setNotice(
        t(
          '前方被挡住了，先解开蓝色标记的箭头。',
          'Path blocked. Free the highlighted arrow first.',
        ),
      );
      later(
        () =>
          setBump((current) =>
            current?.serial === serial ? { ...current, id: -1 } : current,
          ),
        520,
      );
      if (p.sound) playSound('block');
    } else {
      setNotice('');
      setBump(null);
      if (p.sound) playSound('escape', p.run.removed.length);
      setFlying((old) => [...old, id]);
      later(
        () => setFlying((old) => old.filter((x) => x !== id)),
        p.reducedMotion ? 100 : 640,
      );
    }
    update(finishLevel({ ...p, run: act(l, p.run, { type: 'tap', id }) }));
  }
  function hint() {
    setBump(null);
    const p = progressRef.current;
    const next = act(makeLevel(p.run.level), p.run, { type: 'hint' });
    update({ ...p, run: next });
    setNotice(
      t(
        '轻点发光的箭头，它的前方已经畅通。',
        'Tap the glowing arrow. Its path is clear.',
      ),
    );
    if (p.sound) playSound('hint');
  }
  function undo() {
    if (flying.length) return;
    const p = progressRef.current;
    update({ ...p, run: act(makeLevel(p.run.level), p.run, { type: 'undo' }) });
    setNotice('');
    setBump(null);
    winShown.current = '';
  }
  function openLevels(c = chapter) {
    setChapterPage(c);
    setPanel('levels');
  }
  useGameTools({ ready, progress, onTap: tap, panelOpen: panel !== null });
  const directionWords = en
    ? ['right', 'down', 'left', 'up']
    : ['右', '下', '左', '上'];
  return (
    <main
      className={`escape-app ${progress.reducedMotion ? 'reduce-motion' : ''}`}
    >
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <ArrowUpRight />
          </span>
          <span>
            {t('箭头出逃', 'Arrow Escape')}
            <small>FIND YOUR WAY OUT</small>
          </span>
        </div>
        <div className="header-right">
          <span className="header-star">
            <Star size={17} fill="currentColor" />
            {totalStars}
            <span>/ 180</span>
          </span>
          <button
            className="icon-button sound-button"
            title={t('切换音效', 'Toggle sound')}
            aria-label={t('切换音效', 'Toggle sound')}
            aria-pressed={progress.sound}
            onClick={() => {
              update({ ...progress, sound: !progress.sound });
              if (!progress.sound) playSound('hint');
            }}
          >
            {progress.sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="icon-button"
            title={t('设置', 'Settings')}
            aria-label={t('设置', 'Settings')}
            onClick={() => setPanel('settings')}
          >
            <Settings2 />
          </button>
        </div>
      </header>
      <div className="game-layout">
        <aside className="journey-sidebar">
          <div className="section-eyebrow">
            {t('你的解谜旅程', 'YOUR JOURNEY')}
          </div>
          <h2>
            {t('一步一步，', 'One arrow.')}
            <br />
            {t('解开所有方向。', 'One clear path.')}
          </h2>
          <nav className="chapter-list" aria-label={t('章节', 'Chapters')}>
            {chapters.map((names, i) => {
              const done = Object.keys(progress.best).filter(
                (k) => Math.floor((+k - 1) / 12) === i,
              ).length;
              return (
                <button
                  key={i}
                  className={`chapter-link ${i === chapter ? 'active' : ''}`}
                  onClick={() => openLevels(i)}
                >
                  <span className="chapter-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="chapter-text">
                    {names[en ? 1 : 0]}
                    <small>
                      {i === chapter
                        ? t('正在探索', 'EXPLORING')
                        : done === 12
                          ? t('已完成', 'COMPLETED')
                          : `${i * 12 + 1} – ${(i + 1) * 12}`}
                    </small>
                  </span>
                  {done === 12 ? (
                    <Check size={16} />
                  ) : i * 12 + 1 > progress.unlocked ? (
                    <LockKeyhole size={14} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              );
            })}
          </nav>
          <div className="journey-progress">
            <div>
              <span>{t('旅程进度', 'Journey progress')}</span>
              <strong>
                {Object.keys(progress.best).length}
                <small> / {LEVEL_COUNT}</small>
              </strong>
            </div>
            <ProgressBar
              value={(Object.keys(progress.best).length / LEVEL_COUNT) * 100}
              aria-label={t('总关卡完成进度', 'Overall level progress')}
            />
          </div>
          <div className="sidebar-foot">
            <span className="tiny-dot" />
            {storageFailed
              ? t('本次进度暂不能保存', 'Saving unavailable')
              : t('进度自动保存在这台设备', 'Progress saved on this device')}
          </div>
        </aside>
        <section
          className="play-column"
          aria-label={t('游戏区域', 'Play area')}
        >
          <div className="level-heading">
            <div>
              <div className="section-eyebrow">
                {t(
                  `第 ${chapter + 1} 章 · ${chapters[chapter][0]}`,
                  `CHAPTER ${chapter + 1} · ${chapters[chapter][1].toUpperCase()}`,
                )}
              </div>
              <h1>
                {t('第', 'Level')}{' '}
                <span>{String(run.level).padStart(2, '0')}</span>
                {!en && ' 关'}
              </h1>
            </div>
            <button className="level-picker" onClick={() => openLevels()}>
              <Grid2X2 size={17} />
              <span>{t('选关', 'Levels')}</span>
            </button>
          </div>
          <div className="board-shell">
            <div className="board-topline">
              <span className="difficulty">
                <span />
                <span className={chapter > 0 ? 'on' : ''} />
                <span className={chapter > 2 ? 'on' : ''} />
                {t(
                  chapter === 0
                    ? '轻松起步'
                    : chapter < 3
                      ? '渐入佳境'
                      : '进阶挑战',
                  chapter === 0
                    ? 'Easy does it'
                    : chapter < 3
                      ? 'Getting deeper'
                      : 'A little challenge',
                )}
              </span>
              <button
                className="board-help"
                aria-label={t('玩法说明', 'How to play')}
                onClick={() => setPanel('help')}
              >
                <CircleHelp size={19} />
              </button>
            </div>
            <div className={`board-viewport ${zoom ? 'zoomed' : ''}`}>
              <Board
                level={level}
                run={run}
                flying={flying}
                bump={bump}
                reducedMotion={progress.reducedMotion}
                onTap={tap}
                directionWords={directionWords}
                label={t(
                  '点击箭头，让它沿指向离开棋盘。',
                  'Tap an arrow to let it escape in the direction it points.',
                )}
                en={en}
              />
            </div>
            <div className="board-bottomline">
              <span>
                <span className="status-dot" />
                {complete
                  ? t('所有方向，都已解开', 'Every path is clear')
                  : t(`还剩 ${remaining} 支箭头`, `${remaining} arrows to go`)}
              </span>
              <button
                className="zoom-button"
                aria-label={
                  zoom ? t('缩小棋盘', 'Zoom out') : t('放大棋盘', 'Zoom in')
                }
                aria-pressed={zoom}
                onClick={() => setZoom(!zoom)}
              >
                {zoom ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
            </div>
            <ProgressBar
              className="board-progress"
              value={(run.removed.length / level.arrows.length) * 100}
              aria-label={t('本关进度', 'Level progress')}
            />
          </div>
          <output
            className={`game-message ${bump ? 'blocked-message' : ''}`}
            aria-live="polite"
          >
            {notice ||
              (complete
                ? t(
                    '做得漂亮。准备好下一个谜题了吗？',
                    'Nicely done. Ready for the next puzzle?',
                  )
                : run.level === 1 && run.removed.length === 0
                  ? t(
                      '轻点箭头。前方没有阻挡，它就能自由离开。',
                      'Tap an arrow. If the path ahead is clear, it will escape.',
                    )
                  : t(
                      '顺着箭头看，找到一条畅通的路。',
                      'Follow the arrow. Find a clear way out.',
                    ))}
          </output>
          {complete ? (
            <button
              className="next-level-button"
              onClick={() =>
                run.level < LEVEL_COUNT
                  ? startLevel(run.level + 1)
                  : openLevels()
              }
            >
              {run.level < LEVEL_COUNT
                ? t('下一关', 'Next level')
                : t('重温旅程', 'Explore again')}
              <ArrowUpRight size={22} />
            </button>
          ) : (
            <div className="game-controls">
              <button
                className="tool-button"
                onClick={undo}
                disabled={!run.removed.length || flying.length > 0}
              >
                <Undo2 />
                <span>{t('撤销', 'Undo')}</span>
              </button>
              <button
                className="tool-button"
                onClick={() => setPanel('restart')}
              >
                <RotateCcw />
                <span>{t('重来', 'Restart')}</span>
              </button>
              <button className="tool-button hint-button" onClick={hint}>
                <Lightbulb />
                <span>{t('提示', 'Hint')}</span>
                <span className="hint-spark">
                  <Sparkles size={14} />
                </span>
              </button>
            </div>
          )}
          <div className="mobile-chapter">
            <span>{chapterNotes[chapter][en ? 1 : 0]}</span>
            <span className="mini-stars">
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  size={14}
                  fill={n <= stars(run) ? 'currentColor' : 'none'}
                  className={n <= stars(run) ? '' : 'empty-star'}
                />
              ))}
            </span>
          </div>
        </section>
        <aside className="notes-sidebar">
          <div className="note-card">
            <span className="note-icon">
              <ArrowUpRight size={24} />
            </span>
            <h3>{t('跟着方向走', 'Follow the direction')}</h3>
            <p>
              {t(
                '点击一条箭头。前方畅通时，它会沿着自己的轨迹离开。',
                'Tap an arrow. When its path is clear, it will follow its trail out.',
              )}
            </p>
            <div className="note-divider" />
            <h4>{t('被挡住了？没关系。', 'A blocked path? All good.')}</h4>
            <p>
              {t(
                '先移走挡路的箭头，再回来试试。每一步，都会打开新的出口。',
                'Clear the arrow in its way, then try again. Every move opens a new possibility.',
              )}
            </p>
            <button className="text-button" onClick={() => setPanel('help')}>
              {t('看看怎么玩', 'How to play')}
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="star-note">
            <div className="rating-stars">
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  size={22}
                  fill={n <= stars(run) ? 'currentColor' : 'none'}
                  className={n <= stars(run) ? '' : 'empty-star'}
                />
              ))}
            </div>
            <p>{t('慢一点，也能很漂亮。', 'Take your time. Make it count.')}</p>
            <small>
              {t(
                '无误点、不用提示，收获三星。',
                'No blocked taps or hints for three stars.',
              )}
            </small>
          </div>
        </aside>
      </div>
      <footer className="site-footer">
        <span>ARROW ESCAPE</span>
        <span>
          {t('不赶时间，慢慢解开。', 'No rush. Just one clear move.')}
        </span>
        <button onClick={() => setPanel('help')}>
          <CircleHelp size={14} />
          {t('玩法说明', 'How to play')}
        </button>
      </footer>
      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent
          className={`game-dialog ${panel === 'levels' ? 'levels-dialog' : ''} ${panel === 'win' ? 'win-dialog' : ''}`}
          showCloseButton={false}
        >
          <button
            className="dialog-close icon-button"
            aria-label={t('关闭', 'Close')}
            onClick={() => setPanel(null)}
          >
            <X size={20} />
          </button>
          {panel === 'levels' && (
            <>
              <span className="section-eyebrow">
                {t('每一步，都是新的出口', 'ONE MOVE CLOSER')}
              </span>
              <DialogTitle>
                {t('你的解谜旅程', 'Your puzzle journey')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  '已完成的关卡可以随时重玩，刷新自己的星级。',
                  'Replay completed levels anytime to improve your stars.',
                )}
              </DialogDescription>
              <div className="chapter-tabs">
                {chapters.map((_, i) => (
                  <button
                    className={chapterPage === i ? 'selected' : ''}
                    key={i}
                    onClick={() => setChapterPage(i)}
                    aria-label={t(`第${i + 1}章`, `Chapter ${i + 1}`)}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <div className="chapter-dialog-title">
                <h3>{chapters[chapterPage][en ? 1 : 0]}</h3>
                <span>{chapterNotes[chapterPage][en ? 1 : 0]}</span>
              </div>
              <div className="level-grid">
                {Array.from(
                  { length: 12 },
                  (_, i) => chapterPage * 12 + i + 1,
                ).map((id) => (
                  <button
                    className={`level-tile ${id === run.level ? 'current' : ''} ${progress.best[id] ? 'done' : ''}`}
                    key={id}
                    disabled={id > progress.unlocked}
                    onClick={() =>
                      id === run.level && !complete
                        ? setPanel(null)
                        : startLevel(id)
                    }
                    aria-label={t(
                      `第${id}关，${progress.best[id] || 0}星`,
                      `Level ${id}, ${progress.best[id] || 0} stars`,
                    )}
                  >
                    {id > progress.unlocked ? (
                      <LockKeyhole size={20} />
                    ) : (
                      <strong>{String(id).padStart(2, '0')}</strong>
                    )}
                    <span>
                      {id > progress.unlocked
                        ? ''
                        : progress.best[id]
                          ? [1, 2, 3].map((n) => (
                              <Star
                                size={10}
                                key={n}
                                fill={
                                  n <= progress.best[id]
                                    ? 'currentColor'
                                    : 'none'
                                }
                              />
                            ))
                          : id === run.level
                            ? t('进行中', 'PLAYING')
                            : t('开始', 'PLAY')}
                    </span>
                  </button>
                ))}
              </div>
              <p className="dialog-footnote">
                {t(
                  '完成当前关卡，即可解锁下一关。',
                  'Finish a level to unlock the next one.',
                )}
              </p>
            </>
          )}
          {panel === 'settings' && (
            <>
              <span className="section-eyebrow">
                {t('用你喜欢的方式', 'MAKE YOURSELF COMFORTABLE')}
              </span>
              <DialogTitle>{t('游戏设置', 'Settings')}</DialogTitle>
              <DialogDescription>
                {t('找到最适合你的解谜节奏。', 'Find your own puzzle pace.')}
              </DialogDescription>
              <div className="settings-row">
                <label htmlFor="sound">
                  <strong>{t('音效', 'Sound effects')}</strong>
                  <small>
                    {t(
                      '轻柔的点击与通关音效',
                      'Soft taps and a little celebration',
                    )}
                  </small>
                </label>
                <Switch
                  id="sound"
                  checked={progress.sound}
                  onCheckedChange={(v) => {
                    update({ ...progress, sound: v });
                    if (v) playSound('hint');
                  }}
                />
              </div>
              <div className="settings-row">
                <label htmlFor="motion">
                  <strong>{t('减少动画', 'Reduce motion')}</strong>
                  <small>
                    {t('使用更简短的移动效果', 'Shorter, gentler movement')}
                  </small>
                </label>
                <Switch
                  id="motion"
                  checked={progress.reducedMotion}
                  onCheckedChange={(v) =>
                    update({ ...progress, reducedMotion: v })
                  }
                />
              </div>
              <div className="settings-row">
                <label htmlFor="language">
                  <strong>{t('语言', 'Language')}</strong>
                  <small>中文 / English</small>
                </label>
                <select
                  id="language"
                  value={progress.language}
                  onChange={(e) =>
                    update({
                      ...progress,
                      language: e.target.value as 'zh' | 'en',
                    })
                  }
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>
              <p className="settings-save">
                <Check size={16} />
                {storageFailed
                  ? t(
                      '当前浏览器无法保存进度',
                      'This browser cannot save progress',
                    )
                  : t(
                      '进度和设置自动保存在当前浏览器',
                      'Progress and preferences save in this browser',
                    )}
              </p>
            </>
          )}
          {panel === 'help' && (
            <>
              <span className="section-eyebrow">
                {t('简单开始，慢慢上手', 'SIMPLE TO START')}
              </span>
              <DialogTitle>
                {t('让每支箭头找到出口', 'Find a way out for every arrow')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  '清空棋盘，就能进入下一关。没有倒计时，也没有生命限制。',
                  'Clear the board to finish the level. No timers and no lives to lose.',
                )}
              </DialogDescription>
              <ol className="help-steps">
                <li>
                  <span>01</span>
                  <div>
                    <h3>{t('看方向，点箭头', 'Look, then tap')}</h3>
                    <p>
                      {t(
                        '箭头尖端决定离开的方向，点击箭头的任意位置都可以。',
                        'The tip shows the exit direction. Tap anywhere along an arrow.',
                      )}
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>{t('先解开挡路的箭头', 'Clear the way')}</h3>
                    <p>
                      {t(
                        '前方有其他箭头时会轻轻弹回。先移开被标记的箭头，再试一次。',
                        'Blocked arrows bounce back. Remove the highlighted obstacle, then try again.',
                      )}
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>{t('卡住时，借一点灵感', 'A little help is here')}</h3>
                    <p>
                      {t(
                        '提示会点亮一支可离开的箭头；撤销可恢复上一步。小屏幕可以放大棋盘。',
                        'Hints light up a clear arrow. Undo restores your last move. Zoom in for a closer look.',
                      )}
                    </p>
                  </div>
                </li>
              </ol>
              <div className="scoring-help">
                <Star size={20} fill="currentColor" />
                <p>
                  {t(
                    '三星：无误点、无提示。两星：误点不超过 3 次，提示不超过 2 次。完成关卡至少获得一星。',
                    'Three stars: no blocked taps or hints. Two stars: up to 3 blocked taps and 2 hints. Every completed level earns at least one star.',
                  )}
                </p>
              </div>
              <button className="primary-button" onClick={() => setPanel(null)}>
                {t('明白了，开始解谜', 'Got it. Let’s play')}
                <ArrowUpRight size={19} />
              </button>
            </>
          )}
          {panel === 'restart' && (
            <>
              <span className="modal-symbol">
                <RotateCcw />
              </span>
              <DialogTitle>
                {t('重新解开这一关？', 'A fresh start?')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  '当前关卡会重新开始，已经获得的星级和解锁进度会保留。',
                  'This level will reset. Your best stars and unlocked levels will stay safe.',
                )}
              </DialogDescription>
              <button
                className="primary-button"
                onClick={() => startLevel(run.level)}
              >
                {t('重新开始', 'Restart level')}
                <RotateCcw size={18} />
              </button>
              <button
                className="secondary-button"
                onClick={() => setPanel(null)}
              >
                {t('继续当前游戏', 'Keep playing')}
              </button>
            </>
          )}
          {panel === 'win' && (
            <>
              <div className="win-orbit">
                <Flag size={32} />
                <i />
                <i />
                <i />
              </div>
              <span className="section-eyebrow">
                {t(
                  `第 ${String(run.level).padStart(2, '0')} 关 · 已解开`,
                  `LEVEL ${String(run.level).padStart(2, '0')} · COMPLETE`,
                )}
              </span>
              <DialogTitle>
                {run.level === LEVEL_COUNT
                  ? t('每个方向，都有出口。', 'Every path found its way.')
                  : stars(run) === 3
                    ? t('漂亮，完美出逃！', 'A perfect escape!')
                    : t('解开了，做得漂亮！', 'Clear skies. Nicely done!')}
              </DialogTitle>
              <DialogDescription>
                {run.level === LEVEL_COUNT
                  ? t(
                      '60 个谜题全部完成。回头看看，试着收集所有星星吧。',
                      'All 60 puzzles complete. Revisit your favorites and collect every star.',
                    )
                  : t(
                      '每一条交错的线，都找到了自己的方向。',
                      'Every tangled path found its own way out.',
                    )}
              </DialogDescription>
              <div className="win-stars">
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    size={42}
                    fill={n <= stars(run) ? 'currentColor' : 'none'}
                    className={n <= stars(run) ? '' : 'empty-star'}
                  />
                ))}
              </div>
              <div className="win-stats">
                <div>
                  <strong>{level.arrows.length}</strong>
                  <span>{t('箭头出逃', 'Arrows freed')}</span>
                </div>
                <div>
                  <strong>{run.mistakes}</strong>
                  <span>{t('误点次数', 'Blocked taps')}</span>
                </div>
                <div>
                  <strong>{run.hints}</strong>
                  <span>{t('使用提示', 'Hints used')}</span>
                </div>
              </div>
              <button
                className="primary-button"
                onClick={() =>
                  run.level < LEVEL_COUNT
                    ? startLevel(run.level + 1)
                    : openLevels()
                }
              >
                {run.level < LEVEL_COUNT
                  ? t('继续 · 下一关', 'On to the next level')
                  : t('重温旅程', 'Explore again')}
                <ArrowUpRight size={21} />
              </button>
              <button
                className="secondary-button"
                onClick={() => startLevel(run.level)}
              >
                {t('再玩一次', 'Play this level again')}
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
