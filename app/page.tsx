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
  Heart,
  Trophy,
  KeyRound,
  UnlockKeyhole,
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
import { HomeScreenGuide } from '@/components/game/home-screen-guide';
import {
  act,
  failed,
  failureReason,
  isComplete,
  movesLeft,
  direction,
  lives,
  type Campaign,
  blockers,
  isLocked,
  defaultProgress,
  finishLevel,
  newRun,
  restoreProgress,
  stars,
  type Progress,
} from '@/lib/game/engine';
import { saveKey, readProgress } from '@/lib/game/storage';
import { levelCount, makeLevel } from '@/lib/game/levels';
import { challengeInfo } from '@/lib/game/challenge-levels';
import { useGameTools } from '@/lib/game/webmcp';
import { playSound } from '@/lib/game/sound';

const MODE_KEY = 'arrow-escape:campaign';
const classicChapters = [
  ['初见方向', 'First directions'],
  ['转角之后', 'Around the corner'],
  ['交错之间', 'Woven paths'],
  ['向内探索', 'Look within'],
  ['自由之境', 'The great escape'],
];
const classicNotes = [
  ['找到出口，轻轻出发。', 'Find an opening. Make your first move.'],
  ['换个方向，答案就在转角。', 'Follow the bends. Find a new way.'],
  ['耐心观察，解开交错的线。', 'Untangle the paths, one at a time.'],
  ['从外到内，慢慢找到线索。', 'Look a little closer. Follow the clues.'],
  ['相信直觉，也享受思考。', 'Trust your eye. Enjoy the challenge.'],
];
const challengeChapters = [
  ['寻找突破', 'Find the opening'],
  ['追踪线索', 'Trace the paths'],
  ['层层解锁', 'Peel the layers'],
  ['交织之境', 'Woven together'],
  ['最后的突破', 'The final escape'],
];
const challengeNotes = [
  ['看清方向，再出发。', 'Look before you move.'],
  ['顺着阻挡，追到源头。', 'Trace a block back to its source.'],
  ['解开关键，豁然开朗。', 'One key move opens new paths.'],
  ['耐心观察，连接线索。', 'Take your time. Connect the clues.'],
  ['用学会的技巧，完成最后挑战。', 'Bring it all together.'],
];
type Panel =
  | 'levels'
  | 'settings'
  | 'help'
  | 'restart'
  | 'win'
  | 'fail'
  | 'revision'
  | 'keys'
  | 'objective'
  | null;

export default function Home() {
  const [progress, setProgress] = useState<Progress>(() =>
    defaultProgress('challenge'),
  );
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
  const [release, setRelease] = useState<{
    serial: number;
    count: number;
    key: boolean;
  } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const winShown = useRef('');
  const blockedTap = useRef({ id: -1, at: 0 });
  const savedModes = useRef<Partial<Record<Campaign, Progress>>>({});
  const storageLoaded = useRef(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const en = progress.language === 'en';
  const t = (zh: string, english: string) => (en ? english : zh);
  const challenge = progress.campaign === 'challenge';
  const count = levelCount(progress.campaign);
  const perChapter = challenge ? 6 : 12;
  const chapters = challenge ? challengeChapters : classicChapters;
  const chapterNotes = challenge ? challengeNotes : classicNotes;
  const run = progress.run;
  const info = challenge ? challengeInfo(run.level) : null;
  const level = useMemo(
    () => makeLevel(run.level, progress.campaign),
    [run.level, progress.campaign],
  );
  const lost = failed(level, run);
  const hearts = lives(level, run);
  const chapter = Math.floor((run.level - 1) / perChapter);
  const complete = isComplete(level, run);
  const objective = level.objective;
  const targetsFound =
    objective?.targets.filter((id) => run.removed.includes(id)).length ?? 0;
  const remainingMoves = movesLeft(level, run);
  const failReason = failureReason(level, run);
  const remaining = level.arrows.length - run.removed.length;
  const keyArrows = level.arrows.filter((a) => a.key);
  const keysFound = keyArrows.filter((a) => run.removed.includes(a.id)).length;
  const previousCount = Object.keys(progress.previousBest).length;
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
        const campaign =
          localStorage.getItem(MODE_KEY) === 'classic'
            ? 'classic'
            : 'challenge';
        const restored = readProgress(localStorage, campaign);
        if (
          !localStorage.getItem(saveKey(campaign)) &&
          campaign === 'challenge' &&
          !localStorage.getItem('arrow-escape:challenge:v1') &&
          !localStorage.getItem('arrow-escape:challenge:v2')
        ) {
          const previous = restoreProgress(
            localStorage.getItem(saveKey('classic')),
          );
          restored.sound = previous.sound;
          restored.language = previous.language;
          restored.reducedMotion = previous.reducedMotion;
        }
        update(restored);
        storageLoaded.current = true;
        if (restored.showRevisionIntro) setPanel('revision');
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
    document.documentElement.lang = en ? 'en' : 'zh-CN';
    // Do not persist temporary defaults if the original save was unreadable.
    if (!storageLoaded.current) return;
    try {
      savedModes.current[progress.campaign] = progress;
      localStorage.setItem(
        saveKey(progress.campaign),
        JSON.stringify(progress),
      );
      localStorage.setItem(MODE_KEY, progress.campaign);
    } catch {
      queueMicrotask(() => setStorageFailed(true));
    }
  }, [progress, ready, en]);
  useEffect(() => {
    if (!ready || !complete || flying.length || panel !== null) return;
    const key = `${progress.campaign}:${run.level}:${run.mistakes}:${run.hints}`;
    if (winShown.current === key) return;
    const timer = setTimeout(() => {
      winShown.current = key;
      setPanel('win');
      if (progressRef.current.sound) playSound('win');
    }, 260);
    return () => clearTimeout(timer);
  }, [
    complete,
    progress.campaign,
    flying.length,
    ready,
    run.level,
    run.mistakes,
    run.hints,
    panel,
  ]);
  useEffect(() => {
    if (!ready || !lost) return;
    const timer = setTimeout(() => setPanel('fail'), 180);
    return () => clearTimeout(timer);
  }, [ready, lost, progress.campaign, run.level]);
  function clearEffects() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setFlying([]);
    setBump(null);
    setRelease(null);
    setNotice('');
    setZoom(false);
    winShown.current = '';
    blockedTap.current = { id: -1, at: 0 };
  }
  function switchCampaign(campaign: Campaign) {
    if (!storageLoaded.current) return;
    if (campaign === progressRef.current.campaign) return;
    const current = progressRef.current;
    savedModes.current[current.campaign] = current;
    let next = savedModes.current[campaign];
    try {
      next ??= readProgress(localStorage, campaign);
    } catch {
      setStorageFailed(true);
      // Keep the current campaign when the destination cannot be read.
      // A default save could otherwise overwrite progress on recovery.
      return;
    }
    try {
      localStorage.setItem(saveKey(current.campaign), JSON.stringify(current));
    } catch {
      setStorageFailed(true);
    }
    clearEffects();
    update({
      ...next,
      sound: current.sound,
      language: current.language,
      reducedMotion: current.reducedMotion,
    });
    setChapterPage(
      Math.floor((next.run.level - 1) / (campaign === 'challenge' ? 6 : 12)),
    );
    setPanel(next.showRevisionIntro ? 'revision' : 'levels');
  }
  function closePanel() {
    if (panel === 'revision')
      update({ ...progressRef.current, showRevisionIntro: false });
    setPanel(null);
  }
  function startRevision(id: number) {
    update({ ...progressRef.current, showRevisionIntro: false });
    startLevel(id);
  }
  function startLevel(id: number) {
    if (
      id > progressRef.current.unlocked ||
      id < 1 ||
      id > levelCount(progressRef.current.campaign)
    )
      return;
    clearEffects();
    update({ ...progressRef.current, run: newRun(id) });
    setPanel(null);
  }
  function tap(id: number) {
    if (!ready || panel || progressRef.current.run.removed.includes(id)) return;
    const p = progressRef.current;
    const l = makeLevel(p.run.level, p.campaign);
    if (failed(l, p.run) || isComplete(l, p.run)) return;
    const blocked = blockers(l, p.run.removed, id);
    const arrow = l.arrows.find((a) => a.id === id);
    if (!arrow) return;
    if (isLocked(l, p.run.removed, arrow)) {
      setNotice(
        t(
          `先移走 ${arrow.lock} 钥匙箭头，解开同字母的锁。查看锁不会扣心。`,
          `Free key ${arrow.lock} to open matching locks. Inspecting a lock costs no heart.`,
        ),
      );
      return;
    }
    if (blocked.length) {
      const serial = Date.now();
      if (blockedTap.current.id === id && serial - blockedTap.current.at < 520)
        return;
      blockedTap.current = { id, at: serial };
      const teach = p.campaign === 'classic' || l.id <= 3;
      const [dx, dy] = direction(arrow);
      const [hx, hy] = arrow.points.at(-1)!;
      const distance = (otherId: number) =>
        Math.min(
          ...l.arrows
            .find((a) => a.id === otherId)!
            .points.filter(([x, y]) =>
              dx
                ? y === hy && (x - hx) * dx > 0
                : x === hx && (y - hy) * dy > 0,
            )
            .map(([x, y]) => (x - hx) * dx + (y - hy) * dy),
        );
      const nearest = [...blocked].sort((a, b) => distance(a) - distance(b))[0];
      setBump({ id, blocked: teach ? blocked : [nearest], serial });
      setNotice(
        t(
          teach
            ? '前方被挡住了，先解开蓝色标记的箭头。'
            : `蓝色标记挡住了出口。${p.run.mistakes >= 2 ? '爱心用完，可以重试。' : `还剩 ${2 - p.run.mistakes} 颗心。`}`,
          teach
            ? 'Path blocked. Free the highlighted arrow first.'
            : `The blue arrow blocks this exit. ${p.run.mistakes >= 2 ? 'No hearts left. Try again.' : `${2 - p.run.mistakes} hearts left.`}`,
        ),
      );
      later(
        () =>
          setBump((current) => (current?.serial === serial ? null : current)),
        1400,
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
      const newlyFree = l.arrows.filter(
        (a) =>
          !p.run.removed.includes(a.id) &&
          a.id !== id &&
          blockers(l, p.run.removed, a.id).length > 0 &&
          blockers(l, [...p.run.removed, id], a.id).length === 0,
      ).length;
      const openedLocks = arrow.key
        ? l.arrows.filter(
            (a) => a.lock === arrow.key && !p.run.removed.includes(a.id),
          ).length
        : 0;
      setNotice(
        openedLocks
          ? t(
              `${arrow.key} 钥匙到手！${openedLocks} 支箭头已解锁。`,
              `Key ${arrow.key} found! ${openedLocks} arrows unlocked.`,
            )
          : p.campaign === 'challenge' && newlyFree >= 2
            ? t(
                `突破！打开 ${newlyFree} 条新通路。`,
                `Breakthrough! ${newlyFree} new paths.`,
              )
            : '',
      );
      if (p.campaign === 'challenge' && (openedLocks || newlyFree >= 3)) {
        const serial = Date.now();
        setRelease({
          serial,
          count: openedLocks || newlyFree,
          key: Boolean(openedLocks),
        });
        later(
          () =>
            setRelease((value) => (value?.serial === serial ? null : value)),
          1300,
        );
        if (p.sound && openedLocks) playSound('hint');
      }
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
    if (!ready || panel) return;
    setBump(null);
    const p = progressRef.current;
    const next = act(makeLevel(p.run.level, p.campaign), p.run, {
      type: 'hint',
    });
    if (next === p.run) return;
    update({ ...p, run: next });
    setNotice(
      t(
        objective
          ? '这支发光的箭头通向星标目标，先移走它。'
          : '轻点发光的箭头，它的前方已经畅通。',
        objective
          ? 'This glowing arrow leads to a star. Free it first.'
          : 'Tap the glowing arrow. Its path is clear.',
      ),
    );
    if (p.sound) playSound('hint');
  }
  function undo() {
    if (!ready || panel || flying.length) return;
    const p = progressRef.current;
    update({
      ...p,
      run: act(makeLevel(p.run.level, p.campaign), p.run, { type: 'undo' }),
    });
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
      className={`escape-app ${challenge ? 'challenge-mode' : ''} ${progress.reducedMotion ? 'reduce-motion' : ''}`}
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
            <span>/ {count * 3}</span>
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
                (k) => Math.floor((+k - 1) / perChapter) === i,
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
                        : done === perChapter
                          ? t('已完成', 'COMPLETED')
                          : `${i * perChapter + 1} – ${(i + 1) * perChapter}`}
                    </small>
                  </span>
                  {done === perChapter ? (
                    <Check size={16} />
                  ) : i * perChapter + 1 > progress.unlocked ? (
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
                <small> / {count}</small>
              </strong>
            </div>
            <ProgressBar
              value={(Object.keys(progress.best).length / count) * 100}
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
                  challenge
                    ? `挑战 3.0 · ${info!.title[0]}`
                    : `第 ${chapter + 1} 章 · ${chapters[chapter][0]}`,
                  challenge
                    ? `CHALLENGE 3.0 · ${info!.title[1]}`
                    : `CHAPTER ${chapter + 1} · ${chapters[chapter][1].toUpperCase()}`,
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
          <div className={`board-shell ${release ? 'has-breakthrough' : ''}`}>
            {release && (
              <div
                className={`release-feedback ${release.key ? 'key-release' : ''}`}
                key={release.serial}
                aria-hidden="true"
              >
                {release.key ? (
                  <UnlockKeyhole size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>
                  {release.key ? t('解锁', 'UNLOCKED') : t('突破', 'OPENING')} +
                  {release.count}
                </span>
              </div>
            )}
            <div className="board-topline">
              <span className="difficulty">
                <span />
                <span
                  className={
                    (challenge ? info!.tier !== 'tutorial' : chapter > 0)
                      ? 'on'
                      : ''
                  }
                />
                <span
                  className={
                    (challenge ? info!.tier === 'hard' : chapter > 2)
                      ? 'on'
                      : ''
                  }
                />
                {challenge
                  ? t(
                      info!.tier === 'hard'
                        ? '挑战关'
                        : info!.tier === 'tutorial'
                          ? '教学关'
                          : info!.tier === 'relief'
                            ? '轻松一刻'
                            : '步步深入',
                      info!.tier === 'hard'
                        ? 'Hard'
                        : info!.tier === 'tutorial'
                          ? 'Tutorial'
                          : info!.tier === 'relief'
                            ? 'Breather'
                            : 'Focus',
                    )
                  : t(
                      chapter === 0 ? '轻松起步' : '渐入佳境',
                      chapter === 0 ? 'Easy does it' : 'Getting deeper',
                    )}
              </span>
              {challenge && (
                <output
                  className="heart-meter"
                  aria-label={
                    hearts === null
                      ? t('教学关，不扣生命', 'Tutorial, no lives lost')
                      : t(`剩余 ${hearts} 颗心`, `${hearts} hearts left`)
                  }
                >
                  {hearts === null ? (
                    <span>{t('练习 · 不扣心', 'Practice')}</span>
                  ) : (
                    [1, 2, 3].map((n) => (
                      <Heart
                        key={n}
                        size={17}
                        fill={n <= hearts ? 'currentColor' : 'none'}
                        className={n <= hearts ? '' : 'heart-empty'}
                      />
                    ))
                  )}
                </output>
              )}
              <button
                className="board-help"
                aria-label={t('玩法说明', 'How to play')}
                onClick={() => setPanel('help')}
              >
                <CircleHelp size={19} />
              </button>
            </div>
            <div
              className={`board-viewport ${zoom ? 'zoomed' : ''} ${level.size >= 18 ? 'large-board' : ''}`}
            >
              <Board
                disabled={!ready || lost || complete || panel !== null}
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
              {objective ? (
                <button
                  className={`objective-counter ${remainingMoves !== null && remainingMoves <= 3 ? 'few-moves' : ''}`}
                  onClick={() => setPanel('objective')}
                  aria-label={t(
                    `星标 ${targetsFound}/${objective.targets.length}，剩余 ${remainingMoves} 步，查看目标规则`,
                    `Stars ${targetsFound}/${objective.targets.length}, ${remainingMoves} moves left, show goal rules`,
                  )}
                >
                  <Star size={16} fill="currentColor" />
                  <span>
                    {t('星标', 'Stars')} {targetsFound}/
                    {objective.targets.length}
                  </span>
                  <strong>
                    {t(`剩 ${remainingMoves} 步`, `${remainingMoves} moves`)}
                  </strong>
                </button>
              ) : (
                <span>
                  <span className="status-dot" />
                  {complete
                    ? t('所有方向，都已解开', 'Every path is clear')
                    : lost
                      ? t('本次挑战结束', 'Attempt over')
                      : t(
                          `还剩 ${remaining} 支箭头`,
                          `${remaining} arrows to go`,
                        )}
                </span>
              )}
              {keyArrows.length > 0 && (
                <button
                  className="key-counter"
                  onClick={() => setPanel('keys')}
                  aria-label={t(
                    `钥匙 ${keysFound}/${keyArrows.length}，查看规则`,
                    `Keys ${keysFound}/${keyArrows.length}, show rules`,
                  )}
                >
                  <KeyRound size={14} />
                  {keysFound}/{keyArrows.length}
                </button>
              )}
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
              value={
                objective
                  ? (targetsFound / objective.targets.length) * 100
                  : (run.removed.length / level.arrows.length) * 100
              }
              aria-label={
                objective
                  ? t('目标离场进度', 'Star rescue progress')
                  : t('本关进度', 'Level progress')
              }
            />
          </div>
          <output
            className={`game-message ${bump ? 'blocked-message' : ''}`}
            aria-live="polite"
          >
            {lost
              ? t(
                  failReason === 'moves'
                    ? '步数已用完。重试时，把动作留给星标需要的路线。'
                    : '爱心已用完。记住刚才的阻挡关系，再试一次。',
                  failReason === 'moves'
                    ? 'No moves left. On your next try, follow the routes needed by the stars.'
                    : 'No hearts left. Keep the blockers you found in mind and try again.',
                )
              : notice ||
                (complete
                  ? t(
                      '做得漂亮。准备好下一个谜题了吗？',
                      'Nicely done. Ready for the next puzzle?',
                    )
                  : objective && run.removed.length === 0
                    ? info!.focus[en ? 1 : 0]
                    : keyArrows.length > 0 &&
                        keysFound === 0 &&
                        run.removed.length === 0
                      ? t(
                          '移走金色钥匙，打开同字母的锁；点锁不扣心。',
                          'Free a gold key to open matching locks. Inspecting locks is free.',
                        )
                      : run.level === 1 && run.removed.length === 0
                        ? t(
                            '轻点箭头。前方没有阻挡，它就能自由离开。',
                            'Tap an arrow. If the path ahead is clear, it will escape.',
                          )
                        : info
                          ? info.focus[en ? 1 : 0]
                          : t(
                              '顺着箭头看，找到一条畅通的路。',
                              'Follow the arrow. Find a clear way out.',
                            ))}
          </output>
          {lost ? (
            <button
              className="next-level-button retry-button"
              onClick={() => startLevel(run.level)}
            >
              <RotateCcw size={20} />
              {objective
                ? t(
                    '重试本关 · 恢复步数与爱心',
                    'Retry · fresh moves and hearts',
                  )
                : t('重试本关 · 恢复 3 颗心', 'Retry · 3 fresh hearts')}
            </button>
          ) : complete ? (
            <button
              className="next-level-button"
              onClick={() =>
                run.level < count ? startLevel(run.level + 1) : openLevels()
              }
            >
              {run.level < count
                ? t('下一关', 'Next level')
                : t('重温旅程', 'Explore again')}
              <ArrowUpRight size={22} />
            </button>
          ) : (
            <div className="game-controls">
              <button
                className="tool-button"
                onClick={undo}
                disabled={!ready || !run.removed.length || flying.length > 0}
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
              <button
                className="tool-button hint-button"
                onClick={hint}
                disabled={
                  !ready || (challenge && (run.hints >= 2 || run.hint !== null))
                }
              >
                <Lightbulb />
                <span>
                  {t('提示', 'Hint')}
                  {challenge && ` ${Math.max(0, 2 - run.hints)}/2`}
                </span>
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
                objective
                  ? '在步数内送走带星标的箭头，即可过关。普通箭头可以留在棋盘上。'
                  : '点击一条箭头。前方畅通时，它会沿尖端方向直线离开。',
                objective
                  ? 'Free the starred arrows within the move budget. Ordinary arrows may stay on the board.'
                  : 'Tap an arrow. When its path is clear, it exits straight in the direction of its head.',
              )}
            </p>
            <div className="note-divider" />
            <h4>
              {challenge
                ? t('看清楚，再出发。', 'Look before you move.')
                : t('被挡住了？没关系。', 'A blocked path? All good.')}
            </h4>
            <p>
              {t(
                challenge
                  ? '第 4 关起每局 3 颗心。点错会扣心，耗尽后可以立即重试。拖动放大的棋盘不会扣心。'
                  : '先移走挡路的箭头，再回来试试。每一步，都会打开新的出口。',
                challenge
                  ? 'From level 4, each attempt has 3 hearts. Blocked taps cost a heart. Retry immediately when you run out.'
                  : 'Clear the arrow in its way, then try again. Every move opens a new possibility.',
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
          if (!open) closePanel();
        }}
      >
        <DialogContent
          className={`game-dialog ${panel === 'levels' ? 'levels-dialog' : ''} ${panel === 'win' ? 'win-dialog' : ''}`}
          showCloseButton={false}
        >
          <button
            className="dialog-close icon-button"
            aria-label={t('关闭', 'Close')}
            onClick={closePanel}
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
                  challenge
                    ? '30 个新谜题：有限步数救星标，穿插轻松清场、长线追踪和钥匙接力。'
                    : '已完成的关卡可以随时重玩，刷新自己的星级。',
                  challenge
                    ? '30 new puzzles: rescue stars within a move budget, clear boards, trace ribbons and connect keys.'
                    : 'Replay completed levels anytime to improve your stars.',
                )}
              </DialogDescription>
              <fieldset
                className="campaign-tabs"
                aria-label={t('选择篇章', 'Choose campaign')}
              >
                <button
                  aria-pressed={challenge}
                  onClick={() => switchCampaign('challenge')}
                >
                  {t('挑战 3.0 · 30 关', 'Challenge 3.0 · 30')}
                </button>
                <button
                  aria-pressed={!challenge}
                  onClick={() => switchCampaign('classic')}
                >
                  {t('经典篇 · 60 关', 'Classic · 60')}
                </button>
              </fieldset>
              {challenge && previousCount > 0 && (
                <p className="revision-history">
                  {t(
                    `旧版已过 ${previousCount} 关，解锁范围已保留；新版星级单独记录。`,
                    `${previousCount} original clears kept. Unlocks carry over; new stars start fresh.`,
                  )}
                </p>
              )}
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
                  { length: perChapter },
                  (_, i) => chapterPage * perChapter + i + 1,
                ).map((id) => (
                  <button
                    className={`level-tile ${challenge && challengeInfo(id).tier === 'hard' ? 'hard-tile' : ''} ${id === run.level ? 'current' : ''} ${progress.best[id] ? 'done' : ''}`}
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
                    {challenge && challengeInfo(id).tier === 'hard' && (
                      <Trophy
                        className="tile-trophy"
                        size={12}
                        aria-label={t('挑战关', 'Hard level')}
                      />
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
                          : progress.previousBest[id]
                            ? t('旧版已过', 'PREVIOUS CLEAR')
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
          {panel === 'revision' && (
            <>
              <span className="modal-symbol">
                <Sparkles />
              </span>
              <span className="section-eyebrow">CHALLENGE 3.0</span>
              <DialogTitle>
                {t('这次，每关都有新变化', 'A different kind of challenge')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  `旧版已过 ${previousCount} 关的记录已保留，解锁范围不变。新棋盘会重新开始，新版星级单独记录。`,
                  `Your ${previousCount} original clears and unlocked levels are kept. New layouts start fresh, with their own stars.`,
                )}
              </DialogDescription>
              <div className="revision-features">
                <span>
                  {t('星标目标与清场交替', 'Rescue stars or clear the board')}
                </span>
                <span>
                  {t('有限步数，辨认关键路线', 'Find the routes that matter')}
                </span>
                <span>{t('钥匙打开成组箭头', 'Keys unlock groups')}</span>
              </div>
              <button
                className="primary-button"
                onClick={() => startRevision(Math.min(4, progress.unlocked))}
              >
                {t(
                  `体验新版 · 从第 ${Math.min(4, progress.unlocked)} 关开始`,
                  `Try the remix · level ${Math.min(4, progress.unlocked)}`,
                )}
                <ArrowUpRight size={18} />
              </button>
              <button
                className="secondary-button"
                onClick={() => startRevision(run.level)}
              >
                {t(`继续第 ${run.level} 关`, `Continue level ${run.level}`)}
              </button>
            </>
          )}
          {panel === 'keys' && (
            <>
              <span className="modal-symbol key-symbol">
                <KeyRound />
              </span>
              <DialogTitle>
                {t('先找到钥匙，再打开锁', 'Find the key. Open the locks.')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  '金色钥匙和紫色锁用相同的字母配对。钥匙箭头离开后，对应的一组箭头就会解锁；之后仍需确认前方畅通。',
                  'Gold keys and violet locks share a letter. Free the key arrow to unlock its group, then check that each exit path is clear.',
                )}
              </DialogDescription>
              <p className="key-explainer">
                {t(
                  '点击锁只是查看规则，不扣心。撤销钥匙会重新上锁。大棋盘可以放大后拖动观察。',
                  'Inspecting a lock costs no heart. Undoing a key relocks its group. Zoom and pan to read larger boards.',
                )}
              </p>
              <button className="primary-button" onClick={closePanel}>
                {t('明白了，寻找钥匙', 'Got it. Find the key')}
                <KeyRound size={18} />
              </button>
            </>
          )}
          {panel === 'objective' && objective && (
            <>
              <span className="modal-symbol goal-symbol">
                <Star fill="currentColor" />
              </span>
              <DialogTitle>
                {t('把步数留给星星', 'Make your moves count')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  `用 ${objective.moves} 步送走 ${objective.targets.length} 支星标箭头即可过关，普通箭头不必全部清空。沿星标的出口追踪阻挡，找出真正需要移走的箭头。`,
                  `Free ${objective.targets.length} starred arrows in ${objective.moves} moves. Ordinary arrows may stay. Trace each star’s exit to find the arrows it needs.`,
                )}
              </DialogDescription>
              <p className="key-explainer">
                {t(
                  '成功移走一支箭头用 1 步；撞到阻挡只扣爱心，查看锁不扣步数或爱心。结束前撤销可退回 1 步，但不退还爱心和提示。步数或爱心用完后，可立即重试同一关。',
                  'Each freed arrow uses one move. A blocked tap costs a heart; inspecting a lock is free. Before the attempt ends, undo refunds a move, but not hearts or hints. Retry the same board when moves or hearts run out.',
                )}
              </p>
              <button className="primary-button" onClick={closePanel}>
                {t('明白了，寻找星标', 'Got it. Follow the stars')}
                <Star size={18} />
              </button>
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
              <HomeScreenGuide en={en} />
            </>
          )}
          {panel === 'help' && (
            <>
              <span className="section-eyebrow">
                {t('简单开始，慢慢上手', 'SIMPLE TO START')}
              </span>
              <DialogTitle>
                {t('看清目标，找到出口', 'Read the goal. Find the exit.')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  challenge
                    ? '清场关需要移走全部箭头；星标关只需在步数内送走星标。前 3 关练习，第 4 关起每局 3 颗心。没有倒计时。'
                    : '清空棋盘，就能进入下一关。没有倒计时，也没有生命限制。',
                  challenge
                    ? 'Clear every arrow in clearing levels. In star levels, free the stars within the move budget. Levels 1–3 are practice; from level 4 you have 3 hearts. No timer.'
                    : 'Clear the board to finish the level. No timers and no lives to lose.',
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
                        challenge
                          ? '前方有其他箭头时会弹回并扣心，蓝色会短暂标记最近的阻挡。星标关中，能离开的箭头不一定都需要移走。'
                          : '前方有其他箭头时会轻轻弹回。先移开被标记的箭头，再试一次。',
                        challenge
                          ? 'Blocked arrows bounce back and cost a heart. Blue briefly marks the nearest blocker. In star levels, not every free arrow needs to leave.'
                          : 'Blocked arrows bounce back. Remove the highlighted obstacle, then try again.',
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
                        challenge
                          ? '每局 2 次提示，星标关会提示通向目标的箭头。结束前撤销退回一步，不退还爱心或提示。放大后可拖动棋盘；重试恢复步数、爱心和提示。'
                          : '提示会点亮一支可离开的箭头；撤销可恢复上一步。小屏幕可以放大棋盘。',
                        challenge
                          ? 'Two hints per attempt, pointing toward stars in goal levels. Undo refunds a move before the attempt ends, but not hearts or hints. Zoom to pan. Retry restores moves, hearts and hints.'
                          : 'Hints light up a clear arrow. Undo restores your last move. Zoom in for a closer look.',
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
              <button className="primary-button" onClick={closePanel}>
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
              <button className="secondary-button" onClick={closePanel}>
                {t('继续当前游戏', 'Keep playing')}
              </button>
            </>
          )}
          {panel === 'fail' && (
            <>
              <span className="modal-symbol fail-symbol">
                <Heart />
              </span>
              <span className="section-eyebrow">
                {t(
                  `挑战篇 · 第 ${run.level} 关`,
                  `CHALLENGE · LEVEL ${run.level}`,
                )}
              </span>
              <DialogTitle>
                {failReason === 'moves'
                  ? t('步数用完，换个思路。', 'Out of moves. Try a new route.')
                  : t('爱心用完，再试一次。', 'Out of hearts. Try again.')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  failReason === 'moves'
                    ? `还有 ${objective!.targets.length - targetsFound} 支星标没有离场。试着略过无关的箭头。重试恢复同一棋盘、${objective!.moves} 步、3 颗心和 2 次提示。`
                    : `3 颗心已用完。这次找到的阻挡关系，下一次用得上。重试恢复同一棋盘、${objective ? `${objective.moves} 步、` : ''}3 颗心和 2 次提示。`,
                  failReason === 'moves'
                    ? `${objective!.targets.length - targetsFound} starred arrows remain. Try leaving unrelated arrows alone. Retry the same board with ${objective!.moves} moves, 3 hearts and 2 hints.`
                    : `Your 3 hearts are gone. Keep the blockers you found in mind. Retry the same puzzle with ${objective ? `${objective.moves} moves, ` : ''}3 hearts and 2 hints.`,
                )}
              </DialogDescription>
              <button
                className="primary-button"
                onClick={() => startLevel(run.level)}
              >
                <RotateCcw size={18} />
                {t('重试本关', 'Retry level')}
              </button>
              <button className="secondary-button" onClick={() => openLevels()}>
                {t('返回选关', 'Choose a level')}
              </button>
            </>
          )}
          {panel === 'win' && (
            <>
              <div className="win-orbit">
                {info?.tier === 'hard' ? (
                  <Trophy size={32} />
                ) : (
                  <Flag size={32} />
                )}
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
                {run.level === count
                  ? t('终章解开，旅程继续。', 'Finale solved. Keep exploring.')
                  : info?.tier === 'hard'
                    ? t(
                        stars(run) === 3 ? '完美攻克，漂亮！' : '挑战攻克！',
                        stars(run) === 3
                          ? 'A flawless breakthrough!'
                          : 'Challenge conquered!',
                      )
                    : stars(run) === 3
                      ? t('漂亮，完美出逃！', 'A perfect escape!')
                      : t('解开了，做得漂亮！', 'Clear skies. Nicely done!')}
              </DialogTitle>
              <DialogDescription>
                {objective
                  ? t(
                      `${objective.targets.length} 支星标全部出逃，用了 ${run.removed.length}/${objective.moves} 步。${remaining} 支普通箭头留在原地，也一样完成目标。`,
                      `All ${objective.targets.length} stars escaped in ${run.removed.length}/${objective.moves} moves. ${remaining} ordinary arrows stayed behind. Goal complete.`,
                    )
                  : run.level === count
                    ? t(
                        `${count} 个谜题全部完成。回头看看，试着收集所有星星吧。`,
                        `All ${count} puzzles complete. Revisit your favorites and collect every star.`,
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
                  <strong>{run.removed.length}</strong>
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
                  run.level < count ? startLevel(run.level + 1) : openLevels()
                }
              >
                {run.level < count
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
