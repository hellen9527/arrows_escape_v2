# Mobile Play Implementation Plan

Goal: deliver the user-approved one-screen mobile game and home-screen launch support, retaining visitor saves.
Architecture: CSS flex sizing uses the dynamic viewport and safe-area padding. The board alone can pan when zoomed. A standalone web manifest and Apple metadata enable home-screen launch; settings explain installation and origin-local saves. No account system or offline promise.
Tech stack: existing React/Vinext, CSS, browser manifest, Cloudflare Worker.

- [x] Reproduce existing vertical overflow at 390×664 and 320×568 with a browser layout check; retain the check for regression coverage.
- [x] Change app/globals.css mobile layout to viewport-constrained flex containers, preserve SVG aspect ratio, keep controls reachable and dialogs internally scrollable. Cover short landscape screens separately.
- [x] Add public/manifest.webmanifest and 192/512 PNG icons, link metadata in app/layout.tsx with viewport-fit=cover. Add installation guidance in settings without interrupting play or changing the save key.
- [x] Verify phone portrait/landscape and desktop, zoom/pan, settings/levels dialogs, escape/undo, reload saves, and manifest/icon endpoints. Run npm run check and production build.
- [ ] Commit and push the tested change. Verify new production artifacts from arrows.fategenie.com; inspect existing Git integration if it does not publish. Record any external blocker accurately.

Verification: original 390×664 viewport had document height 855 and controls bottom 730.75. Updated production build passes eight viewport cases plus tap/undo/pan/dialog/reload and manifest/icon checks. Six engine tests, TypeScript and lint pass. Independent code review reported no important findings. Physical home-screen installation and Safari safe-area behavior remain device-QA items.
