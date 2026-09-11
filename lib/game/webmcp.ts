'use client';
import { useEffect, useRef } from 'react';
import {
  failed,
  activeLevel,
  activeRun,
  isComplete,
  movesLeft,
  blockers,
  type Progress,
} from './engine';

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type Context = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
type Bindings = {
  ready: boolean;
  progress: Progress;
  onTap: (id: number) => void;
  panelOpen: boolean;
};

export function useGameTools(bindings: Bindings) {
  const latest = useRef(bindings);
  useEffect(() => {
    latest.current = bindings;
  }, [bindings]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const read = () => {
      const { ready, progress, panelOpen } = latest.current;
      if (!ready) throw new Error('The game is loading.');
      const level = activeLevel(progress),
        run = activeRun(progress);
      return {
        level: level.id,
        campaign: progress.campaign,
        tutorial: Boolean(level.tutorial),
        failed: failed(level, run),
        complete: isComplete(level, run),
        objective: level.objective ?? { type: 'clear' },
        movesLeft: movesLeft(level, run),
        size: level.size,
        unlocked: progress.unlocked,
        panelOpen,
        removed: run.removed,
        arrows: level.arrows
          .filter((a) => !run.removed.includes(a.id))
          .map((a) => ({
            ...a,
            blockedBy: blockers(level, run.removed, a.id),
          })),
      };
    };
    const register = (tool: Tool) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported registry does not affect play. */
      }
    };
    register({
      name: 'read_arrow_puzzle',
      description:
        'Read the current arrow puzzle, arrow coordinates and blocking dependencies. Does not change the game.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => read(),
    });
    register({
      name: 'tap_puzzle_arrow',
      description:
        'Tap one remaining arrow using the same rules as the game. Blocked taps count as mistakes. Available only while the board is open.',
      inputSchema: {
        type: 'object',
        properties: { arrowId: { type: 'integer', minimum: 0 } },
        required: ['arrowId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const id =
          typeof input === 'object' && input !== null && 'arrowId' in input
            ? input.arrowId
            : undefined;
        const state = read();
        if (state.failed || state.complete)
          throw new Error('This attempt is over. Start or retry a level.');
        if (state.panelOpen)
          throw new Error('Close the open dialog before playing.');
        if (
          typeof id !== 'number' ||
          !Number.isInteger(id) ||
          !state.arrows.some((a) => a.id === id)
        )
          throw new Error('arrowId must name a remaining arrow.');
        latest.current.onTap(id);
        await new Promise((resolve) => setTimeout(resolve, 700));
        return read();
      },
    });
    return () => lifecycle.abort();
  }, []);
}
