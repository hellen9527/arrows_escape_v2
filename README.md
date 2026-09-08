# Arrow Escape / 箭头出逃

A complete browser puzzle game with 60 deterministic, independently generated levels, SVG escape animation, blocking feedback, hints, undo, chapter selection, local saves, star ratings, synthesized audio, Chinese/English UI, and responsive touch/keyboard play.

## Run

Requires Node >= 22.13 and npm.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vinext. Progress is local to that browser and origin. Private browsing or disabled storage may prevent persistence. Sound starts after a user gesture.

## Verify

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Lint covers authored code; the scaffold's unmodified Shadcn catalog and use-mobile hook are excluded because they ship with baseline lint violations. Tests validate all 60 levels plus state transitions and save recovery. Browser interaction and real-device QA are a separate release check.

## Game structure

- `lib/game/levels.ts`: seeded reverse construction; new arrows have a clear exit when inserted, so reverse insertion order is a solution.
- `lib/game/engine.ts`: pure blocking, transitions, scoring and save validation.
- `components/game/board.tsx`: SVG paths, large click targets, keyboard operation, escape and bump animations.
- `app/page.tsx`: complete player flow and device-local progress.
- `lib/game/sound.ts`: optional Web Audio effects; no third-party assets.
- `lib/game/webmcp.ts`: feature-detected read and tap tools, sharing visible UI state. Live WebMCP validation requires a supporting browser and is not yet verified.

Game art is code-native geometry. Code and level generation are independently implemented. This delivery is a browser game, not an Android/iOS store package; there are no ads, purchases, accounts or cloud saves.

## Publishing through GitHub and Cloudflare

Production repository: https://github.com/hellen9527/arrows_escape_v2

- Branch: `main`
- Cloudflare Worker: `arrows-escape-v2`
- Root directory: `/`
- Build command: `npm run check && npm run build`
- Deploy command: `npm run deploy`
- Node version: `22` (also specified in `.node-version`)
- No API keys, application secrets, database or build variables are needed by the game.

Connect this repository to Cloudflare Workers Builds. A push to `main` triggers the production build and publishes the Worker plus `dist/client` assets. `wrangler.jsonc` is the source configuration; the Cloudflare Vite plugin generates `dist/server/wrangler.json`. Deploy only that generated build, not the repository source.

For an initial manual deployment only when Git automatic builds are not configured:

```sh
npm run check
npm run build
npm run deploy
```

Cloudflare authentication is required for manual deployment. Never commit tokens. After Git integration is configured, use Git pushes instead of simultaneous local deployments.

The `.openai/hosting.json` file records an earlier, unsuccessful Sites deployment attempt. It is retained as historical metadata and is not used by the Cloudflare build. The game has no login requirement on its public Cloudflare URL.
