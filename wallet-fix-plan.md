# ABD Wallet Fix & Stabilization Plan

## Goal
Fix all failing build steps, linting errors, RPC network polling issues, and test configurations to make the ABD Wallet application completely stable, buildable, and testable locally.

## Tasks
- [x] Task 1: Create `.eslintrc.json` and install devDependencies → Verify: `npm run lint` passes with 0 errors
- [x] Task 2: Add `export const dynamic = 'force-dynamic'` to all 8 API routes → Verify: `npm run build` succeeds with code 0
- [x] Task 3: Optimize `lib/provider.ts`, `lib/rpc-registry.ts`, and `src/app/api/gas/route.ts` with static network definitions and robust fallbacks → Verify: `GET /api/gas?chainId=1` returns 200 OK and console is free of infinite network detection loops
- [x] Task 4: Fix `playwright.config.ts` default `baseURL` to `http://localhost:3000` → Verify: Playwright tests connect to local dev server
- [x] Task 5: Update `next.config.mjs` webpack config with `topLevelAwait: true` → Verify: Webpack WASM warnings are resolved

## Done When
- [x] `npm run lint` exits cleanly with code 0
- [x] `npm run build` completes production build with code 0
- [x] `npx vitest run` passes 100% (11/11 tests passed)
- [x] Local dev server (`npm run dev`) responds on `http://localhost:3000` with 200 OK without console spam
- [x] Playwright UI tests run and pass on local server
