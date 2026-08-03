# GameX — Dev Task List

Generated: 2026-07-27 | Last updated: 2026-08-03
Tech stack: Next.js 16 + Socket.IO 4 + TypeScript 6 + Tailwind 4
Default config: 4 players, 16 items | Hosting: Railway (custom server)

Read `docs/trd.md` for all architecture decisions before starting any task.

---

## Milestone 0 — Project Foundation

_One-time setup. Must be complete before any feature work._

- [x] Create `package.json` with name `gamex`, scripts (dev/build/start/lint/type-check/format/prepare)
- [x] Install dependencies: Next.js 16, React 19, TypeScript 6, Tailwind 4, Socket.IO 4, Socket.IO client
- [x] Install dev dependencies: Husky, lint-staged, Prettier, ESLint, postcss, @tailwindcss/postcss
- [x] Configure Husky pre-commit hook → `npx lint-staged`
- [x] Configure lint-staged: ESLint + Prettier on `.ts/.tsx`; Prettier on `.js/.json/.md/.css`
- [x] Configure `.prettierrc`: no semi, single quotes, 2-space, trailing commas, 100-char width
- [x] Configure `.prettierignore`: `.next/`, `out/`, `node_modules/`, `public/`, `mockups/`
- [x] Update `.gitignore`: Next.js artifacts, env files, Python, logs, Vercel
- [x] Create `CLAUDE.md` with session start protocol and naming conventions
- [x] Write `tsconfig.json` — strict mode, path aliases (`@/` → project root)
- [x] Write `next.config.ts` — custom server compatible config
- [x] Write `postcss.config.mjs` — Tailwind 4 via `@tailwindcss/postcss` (no tailwind.config.ts needed in v4)
- [x] Write `eslint.config.mjs` — Next.js flat config + Prettier (native v16 export, no FlatCompat)
- [x] Write `server.ts` — custom HTTP server that mounts Socket.IO then hands off to Next.js
- [x] Update `package.json` dev + start scripts: `tsx server.ts`

---

## Milestone 1 — Shared Foundation (Types + Socket Infrastructure)

_Cross-cutting. Everything else imports from here._

- [x] Create `types/room.types.ts` — `RoomStatus`, `BracketSize`, `RoomConfig`
- [x] Create `types/player.types.ts` — `PlayerState`, `PlayerStatus`, `DisconnectedPlayer`
- [x] Create `types/item.types.ts` — `Item`, `ItemSource`
- [x] Create `types/match.types.ts` — `Match`, `MatchRecord`
- [x] Create `types/assignment.types.ts` — `AssignmentRecord`, `AssignmentPayload`
- [x] Create `lib/socket-events.ts` — `EVENTS` constants object, `EventName` type
- [x] Create `lib/room-store.ts` — `Map<roomId, RoomState>` + CRUD interface (`createRoom`, `getRoom`, `updateRoom`, `deleteRoom`)
- [x] Create `lib/socket-server.ts` — `initSocketServer(httpServer)`: mounts Socket.IO, sets up `/board` and `/player` namespaces, registers connection handlers (stub — game logic in Milestone 2+)
- [x] Create `lib/bracket-engine.ts` — `drawRound(survivingItems)` → `Match[]`, `runAssignment(room, roundIndex)` → `AssignmentRecord[]`

---

## Milestone 2 — Room & Lobby

_Players can create and join a room. Board and Player Views show the lobby._

- [ ] `app/api/room/create/route.ts` — POST: validate bracketSize, create room in store, return `{ roomCode, hostToken, reclaimCode }`
- [ ] `app/api/room/join/route.ts` — POST: validate roomCode + displayName (unique check) + colour, add player to room, return `{ playerId, playerToken }`, emit `PLAYER_JOINED` to room channels
- [ ] `app/api/room/reclaim/route.ts` — POST: validate reclaimCode, issue new hostToken, emit `HOST_RECONNECTED`
- [ ] `app/page.tsx` — home screen: create room form (bracketSize picker) + join room form (code + name + colour)
- [ ] `app/room/[code]/page.tsx` — Player View shell: connects to `/player` namespace with `playerToken`; shows Host Panel overlay if `isHost`
- [ ] `app/room/[code]/board/page.tsx` — Board View shell: connects to `/board` namespace with only `roomCode`; login-free
- [ ] `components/player/lobby-screen.tsx` — room code display, player list (coloured dots), waiting state
- [ ] `components/board/lobby-screen.tsx` — room code large display, connected player list, bracket size
- [ ] `/player` namespace handler — on `connect`: validate playerToken, join roomId channel, sync current room state to reconnecting socket; on `disconnect`: start 60 s grace timer, emit `PLAYER_LEFT` with player colour

---

## Milestone 3 — LLM Pool Generation

_Host enters topic; pool generates with live progress; host curates and locks._

- [ ] `tools/pool_generator.py` — orchestrator: spawns source tools in parallel, enforces 15 s per-source timeout, streams JSON progress events to stdout, deduplicates and ranks results, trims to `ceil(bracketSize × 1.5)`
- [ ] `tools/sources/tmdb_search.py` — TMDB API search; returns `Item[]`
- [ ] `tools/sources/reddit_search.py` — Reddit API search for popularity signals
- [ ] `tools/sources/wikipedia_search.py` — Wikipedia thumbnail + first paragraph
- [ ] `tools/sources/web_search.py` — general web search fallback
- [ ] `tools/requirements.txt`
- [ ] `app/api/pool/generate/route.ts` — POST: validate hostToken + roomCode, create job, spawn `pool_generator.py` subprocess, pipe stdout to `/board` namespace as `POOL_PROGRESS` events, emit `POOL_READY` on exit
- [ ] `app/api/pool/boost/route.ts` — POST: partial regen with boost keyword; same job pattern; does not replace already-selected items
- [ ] `app/api/pool/lock/route.ts` — POST: validate `selectedItemIds.length === bracketSize`, store `lockedItems`, trigger Milestone 4 draw
- [ ] `components/host/pool-curation.tsx` — topic input, pool grid (image cards), select/deselect, manual entry (up to 3), boost keyword field, lock button; live progress overlay during generation
- [ ] `components/board/pool-progress.tsx` — source-by-source progress indicators during generation; pool reveal grid after POOL_READY

---

## Milestone 4 — Bracket Draw & Assignment

_Server draws Round 1 pairings and delivers secret assignments to each player._

- [ ] Pool lock handler → call `bracketEngine.drawRound(lockedItems)` for Round 1 → store matches → emit `ROUND_START` (public match list, no assignments) to `/board:roomCode`
- [ ] Assignment handler → call `bracketEngine.runAssignment(room, roundIndex)` → store `AssignmentRecord[]` → emit `ASSIGNMENT` payload to each `/player` socket individually (never to room channel)
- [ ] `components/player/assignment-card.tsx` — face-down card with long-press reveal: press-and-hold shows "You are defending: [Title] (Round N of M)"; releases back to face-down; auto-dismisses on `MATCH_START`
- [ ] Board receives `ROUND_START` — shows round number and first match pair (no assignment data)
- [ ] Round 1 constraint: `drawRound` attempts to avoid pairing items where two players share the same assignment in Match 1 (best-effort, relaxed if not possible)

---

## Milestone 5 — Match Loop

_Core runtime: reveal → debate → vote → advance. Paced entirely by host._

- [ ] `components/board/match-view.tsx` — two item cards side by side; live vote tally by player colour; player status row (connected / voted / waiting dot per player)
- [ ] `components/player/match-view.tsx` — same two item cards; vote buttons (A / B) appear on `VOTE_OPEN`; vote locked after cast
- [ ] `components/host/match-controls.tsx` — "Call Vote" button; live cast-count vs pending; "Coin Flip" button (visible only on tie); "Next Match" button after result
- [ ] `/player` namespace — `HOST_CALL_VOTE`: validate hostToken, emit `VOTE_OPEN` to room channels; `PLAYER_VOTE`: record vote, emit `PLAYER_VOTE` (colour only, no name) to room channels; detect all-voted → emit `VOTE_RESULT`; `HOST_COIN_FLIP`: random heads/tails, emit `COIN_FLIP`; `HOST_NEXT_MATCH`: advance match index, emit `MATCH_START` or `ROUND_END`
- [ ] `app/api/game/coin-flip/route.ts` — POST: validate hostToken, flip, return result; emit `COIN_FLIP` to room channels
- [ ] Round advance: on `ROUND_END` → run new draw + reassignment → emit `ROUND_START` + individual `ASSIGNMENT` events → host sees "Next Round" on Host Panel

---

## Milestone 6 — Disconnection & Reconnection

_Grace timer, state sync on rejoin, permanent removal. Required before any real session._

- [ ] Grace timer logic in room-store: `DisconnectedPlayer` records with `graceExpiresAt`; server-side `setTimeout` for 60 s
- [ ] On grace expiry: update `PlayerState.status = 'timedout'`; emit `PLAYER_TIMEOUT` to host socket only → Host Panel shows "Player X timed out — proceed anyway?"
- [ ] Host "proceed anyway" handler: emit `PLAYER_REMOVED` to room channels; player excluded from next round assignment; existing assignment record frozen
- [ ] Reconnect within grace: validate playerToken on socket handshake; clear timer; sync current match state and current-round assignment to reconnected socket; emit `PLAYER_RECONNECT` to room channels
- [ ] Host disconnect: emit `HOST_DISCONNECTED` to `/board:roomCode` and `/player:roomCode`; Board shows "Host disconnected — game paused"; disable vote buttons on all Player Views; start 60 s host grace timer
- [ ] Host reconnect: POST `/api/room/reclaim` → new token → reconnect to `/player` namespace → emit `HOST_RECONNECTED` → resume from current state

---

## Milestone 7 — Champion Screen & Post-Game Reveal

_Final match → champion → assignment history table._

- [ ] Final match detection: after `MATCH_END` when `survivingItems.length === 1`; emit `GAME_OVER` with winner `Item` to room channels
- [ ] `components/board/champion-screen.tsx` — champion item card with full visual weight; "Reveal Assignments" button appears on host side
- [ ] `components/player/champion-screen.tsx` — same champion display; waits for host to trigger reveal
- [ ] `HOST_REVEAL_START` handler: emit `REVEAL_START` with full `assignmentHistory` to both namespaces
- [ ] `components/board/reveal-table.tsx` — table: Player (coloured) × Round × Item Defended; highlight rows where multiple players shared the same assignment
- [ ] `components/player/reveal-table.tsx` — same table; player's own rows highlighted
- [ ] Play-again: "New Game" button on Host Panel; POST `/api/room/reset` (or host control socket event); clear bracket/pool/assignments; keep players; return to Milestone 3 pool generation; emit `ROOM_RESET`

---

## Cross-Cutting / Infrastructure

- [x] Define Socket.IO event constants — `lib/socket-events.ts` (done in Milestone 1)
- [ ] Enforce `/board` namespace receives no assignment data — code review gate: no assignment field in any payload emitted to `/board`
- [ ] Bracket size UI — host can pick 8 / 16 / 32 in lobby before pool generation; stored in `room.bracketSize`; used by pool generator and bracket engine
- [ ] Token validation middleware — shared `validateHostToken(req, roomId)` and `validatePlayerToken(req, roomId)` helpers used by all API routes
- [ ] Error states — pool generation failure UI; socket disconnect UI; rejoin flow for players who close and reopen their tab
