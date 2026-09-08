# Cloudflare deployment

The user requested migrating the existing game to `hellen9527/arrows_escape_v2` and publishing a public, link-accessible browser game. Preserve the existing Vinext/Cloudflare adapter, all game features, and the lockfile's dependency versions. No custom domain was requested; use the account's workers.dev address initially.

Source configuration: `wrangler.jsonc`. Generated Worker entry: `dist/server/index.js`; public assets: `dist/client`. Build: `npm run check && npm run build`. Deploy: `npm run deploy`. Production branch: `main`. Node: 22. No game secrets or runtime bindings.

Validate the unchanged core with its existing tests. Validate the deployment adapter with a production build and dry run. In the browser, verify actual arrow interaction, blocked feedback, hints, undo, win/next-level, settings, and mobile-width usability. Verify published JS/CSS hashes against local production artifacts and test the live game, not only its HTTP status.

Do not switch off TLS checks, upload source as static assets, expose credentials, or create a second project to work around an authorization failure. Preserve existing repository contents if any appear before push.
