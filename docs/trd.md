---
title: GameX — Technical Reference Document
status: draft
created: 2026-08-03
updated: 2026-08-03
---

# TRD: GameX

## 0. Document Purpose

This TRD is a personal build map — written for Raahul (the developer and the future-session LLM) so that every coding session can start in under two minutes without re-deriving decisions. It documents _how_ to build what the PRD defines. Read the PRD (`docs/prd.md`) for _what_ and _why_; read the task list (`docs/task-list.md`) for _what's done_.

Source: brainstorming session `_bmad-output/brainstorming/brainstorm-trd-gamex-2026-08-03/.memlog.md`

---

## 1. Decisions Index

Scannable one-liners. Each links to its deep section.

| #    | Decision             | Choice                                                                                                                                                                      |
| ---- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Hosting & runtime    | Custom Next.js server on Railway — not Vercel ([§3](#3-stack--hosting))                                                                                                     |
| D-02 | Real-time layer      | Socket.IO 4 mounted on the custom server, isolated in `lib/socket-server.ts` ([§4](#4-real-time-architecture))                                                              |
| D-03 | Socket namespaces    | `/board` (TV, public) and `/player` (per-player, secret) — structural separation ([§4](#4-real-time-architecture))                                                          |
| D-04 | Room state           | In-memory `Map<roomId, RoomState>` behind `lib/room-store.ts` interface; Redis swap-in later ([§5](#5-room-state))                                                          |
| D-05 | Bracket engine       | `survivingItems[]` + `matchHistory[]`; fresh random draw each Round; no pre-determined tree ([§6](#6-bracket--assignment-engine))                                           |
| D-06 | Assignment algorithm | Sticky: keep same Item if alive; eliminated players get shuffle-and-deal from unassigned survivors; wrap-around if pool exhausted ([§6](#6-bracket--assignment-engine))     |
| D-07 | LLM pool generation  | API route starts job → returns `jobId`; Socket.IO streams per-source progress events to Board namespace ([§7](#7-llm-pipeline))                                             |
| D-08 | Pool size            | Always `ceil(bracketSize × 1.5)` — never less; full regen available if host is unhappy ([§7](#7-llm-pipeline))                                                              |
| D-09 | LLM failure handling | Per-source 15 s timeout; partial pool accepted if `pool.length >= bracketSize`; does not block ([§7](#7-llm-pipeline))                                                      |
| D-10 | Odd survivors        | Not possible — bracket sizes 8 / 16 / 32 are powers of 2; clean pairs guaranteed every round ([§6](#6-bracket--assignment-engine))                                          |
| D-11 | Host identity        | `sessionStorage` `hostToken` + `reclaimCode`; host can reclaim on a second device ([§8](#8-host-identity--auth))                                                            |
| D-12 | Socket event schema  | Constants file `lib/socket-events.ts` now; migrate to typed Socket.IO event map after schema stabilises ([§9](#9-socket-event-schema))                                      |
| D-13 | Shared types         | `types/` folder; one file per domain: `room`, `player`, `item`, `match`, `assignment` ([§10](#10-shared-types-reference))                                                   |
| D-14 | Player disconnection | 60 s grace → host gets proceed-anyway prompt → reconnect mid-game resumes round state → no-return removes player at round boundary ([§11](#11-disconnection--reconnection)) |
| D-15 | Host disconnection   | 60 s grace; game pauses with "Host disconnected" state on Board; resumes on reclaimCode reconnect; no host transfer in MVP ([§11](#11-disconnection--reconnection))         |
| D-16 | TRD structure        | Two-layer: decisions index (this table) + deep sections below                                                                                                               |
| D-17 | Project memory       | PRD + TRD + task-list = full LLM context; CLAUDE.md mandates reading all three at session start                                                                             |
| D-18 | Folder structure     | Own section — literal directory tree ([§2](#2-folder-structure))                                                                                                            |

---

## 2. Folder Structure

```
gamex/
├── app/                            # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                    # Home — create or join room
│   ├── room/
│   │   └── [code]/
│   │       ├── page.tsx            # Player View (+ Host Panel overlay)
│   │       └── board/
│   │           └── page.tsx        # Board View (login-free, TV)
│   └── api/
│       ├── room/
│       │   ├── create/
│       │   │   └── route.ts        # POST — create room, return code + tokens
│       │   ├── join/
│       │   │   └── route.ts        # POST — join room, return playerToken
│       │   └── reclaim/
│       │       └── route.ts        # POST — reclaim host on new device
│       ├── pool/
│       │   ├── generate/
│       │   │   └── route.ts        # POST — start LLM job, return jobId
│       │   └── boost/
│       │       └── route.ts        # POST — partial regen with boost keyword
│       └── game/
│           └── coin-flip/
│               └── route.ts        # POST — host-triggered coin flip
│
├── lib/
│   ├── socket-server.ts            # Socket.IO init + namespace setup
│   ├── socket-events.ts            # All event name constants (D-12)
│   ├── room-store.ts               # In-memory Map interface (D-04)
│   └── bracket-engine.ts           # Draw logic + assignment algorithm (D-05, D-06)
│
├── types/                          # Shared TypeScript types (D-13)
│   ├── room.types.ts
│   ├── player.types.ts
│   ├── item.types.ts
│   ├── match.types.ts
│   └── assignment.types.ts
│
├── components/
│   ├── board/                      # Board-only components
│   ├── player/                     # Player View components
│   ├── host/                       # Host Panel components
│   └── shared/                     # Used across surfaces
│
├── hooks/                          # Custom React hooks
│
├── tools/                          # Python LLM tool scripts
│   ├── pool_generator.py           # Orchestrator — calls all sources
│   ├── sources/
│   │   ├── tmdb_search.py
│   │   ├── reddit_search.py
│   │   ├── wikipedia_search.py
│   │   └── web_search.py
│   └── requirements.txt
│
├── server.ts                       # Custom Next.js server entry point
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
├── .prettierrc
├── .eslintrc.json (or eslint.config.mjs)
└── CLAUDE.md
```

**Naming rules (enforced by CLAUDE.md):**

- All TypeScript/TSX files → `kebab-case`
- All folders → `kebab-case`
- Python files → `snake_case`
- Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`) → as-is
- Exports: React components → `PascalCase`, hooks → `camelCase`, types → `PascalCase`, constants → `SCREAMING_SNAKE_CASE`

---

## 3. Stack & Hosting

### Tech stack

| Layer     | Choice             | Version |
| --------- | ------------------ | ------- |
| Framework | Next.js App Router | ^16     |
| UI        | React              | ^19     |
| Language  | TypeScript         | ^6      |
| Styling   | Tailwind CSS       | ^4      |
| Real-time | Socket.IO          | ^4      |
| Runtime   | Node.js            | LTS     |
| LLM tools | Python             | 3.12+   |

### Hosting

**Railway** — single deployment running the custom Next.js server.

**Why not Vercel:** Vercel's serverless model terminates Node.js processes between requests. A persistent WebSocket server requires a long-lived process. Railway keeps the Node.js process alive indefinitely, which is what Socket.IO needs.

**Deployment unit:** One Railway service running `node server.ts` (compiled). Socket.IO and the HTTP server share the same process. No separate worker.

**Environment variables (`.env.local` locally, Railway env in prod):**

```
ANTHROPIC_API_KEY=
TMDB_API_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

---

## 4. Real-time Architecture

### Custom server (`server.ts`)

Next.js does not expose its underlying HTTP server for Socket.IO to attach to when using `next dev` / `next start` directly. The solution: write a minimal custom server that creates an `http.Server`, attaches Socket.IO, and then hands the HTTP server to Next.js.

```ts
// server.ts (simplified shape)
import { createServer } from 'http'
import next from 'next'
import { initSocketServer } from './lib/socket-server'

const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handler = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(handler)
  initSocketServer(httpServer) // attach Socket.IO
  httpServer.listen(3000)
})
```

`package.json` `dev` script changes from `next dev` to `tsx server.ts` (or `ts-node server.ts`).

### Two namespaces (D-03)

```
/board   — Board clients (TV). Receives only public game state.
/player  — Player clients. Each socket carries playerId; receives public + own-secret state.
```

The server **never** emits assignment data to the `/board` namespace. This is structural, not a runtime check — the Board namespace handler simply has no code path that touches assignment state.

The `/player` namespace emits to individual sockets (`socket.emit(...)`) for secret data and to the room channel (`io.of('/player').to(roomId).emit(...)`) for public data.

### Socket flow (session lifecycle)

```
Host creates room → POST /api/room/create → receives roomCode + hostToken + reclaimCode
Host connects Board → /board namespace, joins room channel roomCode
Host opens phone → POST /api/room/join → receives playerToken; connects to /player namespace
Players join → POST /api/room/join; connect to /player namespace
  └── server emits PLAYER_JOINED to /board:roomCode and /player:roomCode

Host triggers pool gen → POST /api/pool/generate → receives jobId
  └── Python tool starts; server emits POOL_PROGRESS events to /board:roomCode as sources complete
  └── server emits POOL_READY to /board:roomCode and /player:roomCode when done

Host locks pool → server runs draw (FR-9) + initial assignments (FR-10)
  └── emits ROUND_START to /board:roomCode (public data only)
  └── emits ASSIGNMENT to each /player socket individually (secret)

Match loop events (all paced by host):
  MATCH_START → /board + /player room channel
  VOTE_OPEN   → /board + /player room channel
  PLAYER_VOTE → /player room channel (colour only, no name)
  VOTE_RESULT → /board + /player room channel
  COIN_FLIP   → /board + /player room channel
  MATCH_END   → /board + /player room channel
  ROUND_END   → triggers new draw + reassignment cycle

GAME_OVER    → /board + /player room channel (champion item)
REVEAL_START → /board + /player room channel (full assignment history)
```

---

## 5. Room State

### Interface contract (`lib/room-store.ts`)

All room state lives in a single `Map<string, RoomState>` in process memory. Feature code never touches the Map directly — it goes through `room-store.ts` functions:

```ts
createRoom(config): RoomState
getRoom(roomId): RoomState | undefined
updateRoom(roomId, patch: Partial<RoomState>): void
deleteRoom(roomId): void
```

This interface is the Redis swap boundary. If Redis is added later, only `room-store.ts` changes — all callers stay the same.

### `RoomState` shape

```ts
interface RoomState {
  roomId: string
  roomCode: string // 5-char alphanumeric, displayed to players
  hostId: string // playerId of the host
  reclaimCode: string // single-use token for host device swap
  status: RoomStatus // 'lobby' | 'poolgen' | 'poolreview' | 'active' | 'ended'
  bracketSize: 8 | 16 | 32
  players: Map<string, PlayerState>
  pool: Item[] // full generated pool
  lockedItems: Item[] // host-selected subset, length === bracketSize
  survivingItems: Item[] // updated each round
  matchHistory: MatchRecord[]
  assignmentHistory: AssignmentRecord[]
  currentRound: number
  currentMatchIndex: number
  disconnectedPlayers: Map<string, DisconnectedPlayer>
}
```

Full type definitions live in `types/` (see §10). `RoomState` imports from them.

### Persistence note

A server restart clears all rooms. For MVP this is acceptable. If Railway restarts the dyno mid-game, the session is lost. Add periodic JSON snapshot to disk (or Redis) in v2 if reliability is needed.

---

## 6. Bracket & Assignment Engine

### Bracket model (D-05)

There is no bracket tree object. The bracket is represented by two arrays:

- `survivingItems: Item[]` — the pool of items still in the tournament after each round
- `matchHistory: MatchRecord[]` — immutable append-only log of every match result

At the start of each Round: shuffle `survivingItems`, zip into pairs → that Round's matches. No future rounds are computed in advance. The Board never receives `survivingItems` as a list — it only receives the current match.

```ts
interface MatchRecord {
  roundIndex: number
  matchIndex: number
  itemA: string // itemId
  itemB: string // itemId
  winner: string // itemId
  tiebroken: boolean
}
```

After all matches in a Round: `survivingItems = matchHistory.filter(m => m.roundIndex === currentRound).map(m => m.winner)`

### Assignment algorithm (D-06)

At the start of each Round, for each player:

1. **Sticky check:** If the player's previous assignment (`lastAssignedItemId`) is still in `survivingItems`, keep it. No change.
2. **Re-assignment pool:** Build `unassignedSurvivors = survivingItems.filter(item => no player has already been assigned it in this round)`. Shuffle this list.
3. **Eliminated players:** Draw from the front of `unassignedSurvivors`. If the pool runs dry (more eliminated players than surviving items), wrap around — survivors can be double-assigned.
4. Record every assignment to `assignmentHistory`.

**Round 1 constraint (PRD FR-9):** Best-effort attempt to ensure no two players assigned the same Item appear in the same Match 1 pairing. Relaxed if bracket size makes it impossible.

### Powers of 2 guarantee (D-10)

Bracket sizes 8, 16, 32 produce 4, 8, 16 survivors after Round 1; 2, 4, 8 after Round 2; etc. Clean pairs are always guaranteed. No bye logic needed.

---

## 7. LLM Pipeline

### Job pattern (D-07)

Pool generation is slow (multi-source, up to 60 s). It cannot block the HTTP request. Flow:

```
POST /api/pool/generate
  → validates host token + bracketSize
  → creates job { jobId, status: 'running', results: [] }
  → spawns Python subprocess: tools/pool_generator.py --topic "..." --size N --job-id X
  → returns { jobId } immediately (HTTP 202)

Python process (per source, in parallel):
  → each source writes JSON events to stdout: { type: 'progress', source: 'tmdb', items: [...] }
  → Node.js reads stdout stream, emits POOL_PROGRESS to /board:roomCode per event

On process exit:
  → Node.js collects all items, deduplicates, ranks by popularity signals
  → trims to ceil(bracketSize × 1.5)
  → stores in room.pool
  → emits POOL_READY to /board + /player room channels
```

### Source targets and timeout (D-09)

| Source     | Data                                          | Per-source timeout |
| ---------- | --------------------------------------------- | ------------------ |
| TMDB       | Films and TV — title, year, poster            | 15 s               |
| Reddit     | Popularity signals — upvotes, thread mentions | 15 s               |
| Wikipedia  | General topics — thumbnail, first paragraph   | 15 s               |
| Web search | Fallback ranking signals                      | 15 s               |

If a source times out: its partial results are included if any arrived; the source is marked failed in the progress events. Pool generation continues.

Partial pool is accepted if `pool.length >= bracketSize`. If not, the host sees an error and can retry.

### Pool size (D-08)

`poolSize = Math.ceil(bracketSize * 1.5)` — i.e. 12 for 8-Bracket, 24 for 16-Bracket, 48 for 32-Bracket.

The host curates down to `bracketSize` items. If unhappy with the entire pool, a full regen is available (same POST, clears previous pool). Partial regen with Boost Keyword is a separate route (`/api/pool/boost`).

### LLM caller

Python scripts call the Anthropic API (Claude) with tool use — Claude selects which sources to call and synthesises results. Each source tool has a 15 s timeout enforced by the Python side.

---

## 8. Host Identity & Auth

### The dual-device problem (D-11)

The host needs:

- A **Board** open on a laptop/TV (passive display, no auth)
- A **Player+Host View** on their phone (controls + their own secret assignment)

These are two separate browser sessions. They cannot share `sessionStorage`. The solution:

### Token model

On room creation, the server issues:

```ts
{
  hostToken: string // stored in host's phone sessionStorage
  reclaimCode: string // 6-char alphanumeric, shown once, host writes it down
}
```

`hostToken` authenticates all host API calls (Call Vote, Coin Flip, Next Match, Pool actions). It lives in `sessionStorage` — tab close clears it. No cookie, no server session.

`reclaimCode` is a single-use recovery code. If the host's phone tab closes or they switch devices:

- POST `/api/room/reclaim` with `{ roomCode, reclaimCode }`
- Server issues a new `hostToken`, invalidates the old one, returns the new token
- Host re-connects to `/player` namespace with the new token

The Board (`/board` namespace) is login-free. Any browser hitting the Board URL joins as a display-only client.

### Player tokens

On join, each player receives a `playerToken` stored in `sessionStorage`. On reconnect within the grace period, the player re-authenticates with this token and the server re-associates their new socket with their existing `PlayerState`.

---

## 9. Socket Event Schema

### Current approach: constants file (D-12)

`lib/socket-events.ts` exports all event name strings as constants. Both server and client import from this file.

```ts
// lib/socket-events.ts
export const EVENTS = {
  // Connection lifecycle
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  PLAYER_RECONNECT: 'player-reconnect',
  HOST_DISCONNECTED: 'host-disconnected',

  // Pool generation
  POOL_PROGRESS: 'pool-progress',
  POOL_READY: 'pool-ready',

  // Game flow
  ROUND_START: 'round-start',
  ASSIGNMENT: 'assignment', // /player namespace only
  MATCH_START: 'match-start',
  VOTE_OPEN: 'vote-open',
  PLAYER_VOTE: 'player-vote',
  VOTE_RESULT: 'vote-result',
  COIN_FLIP: 'coin-flip',
  MATCH_END: 'match-end',
  ROUND_END: 'round-end',
  GAME_OVER: 'game-over',
  REVEAL_START: 'reveal-start',

  // Host controls (client → server)
  HOST_CALL_VOTE: 'host-call-vote',
  HOST_NEXT_MATCH: 'host-next-match',
  HOST_COIN_FLIP: 'host-coin-flip',
  HOST_LOCK_POOL: 'host-lock-pool',

  // Room management
  ROOM_RESET: 'room-reset',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
```

### Migration path to typed event map

Once the schema is stable (all surfaces built and tested), migrate to Socket.IO's generic typed interface:

```ts
// types/socket.types.ts (future)
interface ServerToClientEvents {
  [EVENTS.PLAYER_JOINED]: (payload: PlayerJoinedPayload) => void
  [EVENTS.ASSIGNMENT]: (payload: AssignmentPayload) => void
  // ...
}
interface ClientToServerEvents {
  [EVENTS.HOST_CALL_VOTE]: (payload: { matchId: string }) => void
  // ...
}
```

This gives full type inference on `socket.emit` and `socket.on` calls. Do not attempt this until all event shapes are confirmed — premature typing slows down schema iteration.

---

## 10. Shared Types Reference

One file per domain under `types/`. All files use `export interface` / `export type` — no default exports.

### `types/room.types.ts`

```ts
export type RoomStatus = 'lobby' | 'poolgen' | 'poolreview' | 'active' | 'ended'
export type BracketSize = 8 | 16 | 32

export interface RoomConfig {
  bracketSize: BracketSize
}
```

### `types/player.types.ts`

```ts
export type PlayerStatus = 'connected' | 'grace' | 'timedout' | 'removed'
export type PlayerColour = string // hex colour chosen on join

export interface PlayerState {
  playerId: string
  displayName: string
  colour: PlayerColour
  isHost: boolean
  status: PlayerStatus
  socketId: string | null
  lastAssignedItemId: string | null
}

export interface DisconnectedPlayer {
  playerId: string
  disconnectedAt: number // Date.now()
  graceExpiresAt: number
}
```

### `types/item.types.ts`

```ts
export type ItemSource = 'tmdb' | 'reddit' | 'wikipedia' | 'web' | 'manual'

export interface Item {
  itemId: string
  title: string
  contextLine: string // year, or category context
  blurb: string // one-line description
  imageUrl: string | null // null → typographic fallback card
  source: ItemSource
  popularityScore: number // used for initial pool ranking
}
```

### `types/match.types.ts`

```ts
export interface Match {
  matchId: string
  roundIndex: number
  matchIndex: number
  itemA: Item
  itemB: Item
  votes: Record<string, 'A' | 'B'> // playerId → choice
  winner: 'A' | 'B' | null
  tiebroken: boolean
}

export interface MatchRecord {
  roundIndex: number
  matchIndex: number
  itemAId: string
  itemBId: string
  winnerId: string
  tiebroken: boolean
}
```

### `types/assignment.types.ts`

```ts
export interface AssignmentRecord {
  playerId: string
  roundIndex: number
  itemId: string
}

// Payload sent to individual player socket
export interface AssignmentPayload {
  itemId: string
  itemTitle: string
  roundIndex: number
  totalRounds: number // known from bracketSize: log2(bracketSize)
}
```

---

## 11. Disconnection & Reconnection

### Player disconnection (D-14)

State machine per player:

```
connected
  ↓ socket disconnect
grace (60 s timer starts, host sees greyed-out player dot)
  ↓ socket reconnects within 60 s
connected (state synced: current match, assignment for this round)
  ↓ 60 s expires without reconnect
timedout (host sees proceed-anyway prompt on Host Panel)
  ↓ host proceeds OR next round starts
removed (player excluded from future rounds; assignment history frozen)
```

On reconnect within grace:

1. Client sends `playerToken` on socket handshake
2. Server re-associates the new `socket.id` with the existing `PlayerState`
3. Server emits current room state snapshot to the reconnecting socket
4. Timer is cleared; player status → `connected`

`removed` players' records remain in `assignmentHistory` (historical data for Post-Game Reveal) but they do not receive further assignments or votes.

### Host disconnection (D-15)

Same grace model, extended:

```
host disconnected
  ↓ all clients in /board and /player namespaces receive HOST_DISCONNECTED
Board shows "Host disconnected — game paused"
All vote buttons disabled; no matches can advance
  ↓ host reconnects within 60 s (via reclaimCode or same sessionStorage token)
game resumes from current state
  ↓ 60 s expires
game remains paused indefinitely (no auto-transfer in MVP)
Players see a "waiting for host" state
```

Host reconnection uses the same `reclaimCode` flow as device-switch (§8). On reconnect, server clears the paused state and emits `HOST_RECONNECTED` to both namespaces.

---

## 12. API Routes

All routes live under `app/api/`. All use Next.js App Router `route.ts` convention.

| Route                 | Method | Body / Params                       | Auth             | Returns                                |
| --------------------- | ------ | ----------------------------------- | ---------------- | -------------------------------------- |
| `/api/room/create`    | POST   | `{ bracketSize }`                   | None             | `{ roomCode, hostToken, reclaimCode }` |
| `/api/room/join`      | POST   | `{ roomCode, displayName, colour }` | None             | `{ playerId, playerToken }`            |
| `/api/room/reclaim`   | POST   | `{ roomCode, reclaimCode }`         | reclaimCode      | `{ hostToken }`                        |
| `/api/pool/generate`  | POST   | `{ roomCode, topic }`               | hostToken header | `{ jobId }` (202)                      |
| `/api/pool/boost`     | POST   | `{ roomCode, boostKeyword, count }` | hostToken header | `{ jobId }` (202)                      |
| `/api/pool/lock`      | POST   | `{ roomCode, selectedItemIds[] }`   | hostToken header | `{ ok }`                               |
| `/api/game/coin-flip` | POST   | `{ roomCode, matchId }`             | hostToken header | `{ result, winnerId }`                 |

**Auth header:** `Authorization: Bearer <token>`. Server validates against `room.hostToken` or `player.playerToken` depending on the route.

**No auth on Board routes:** The Board (`/room/{code}/board`) is a static Next.js page. It connects to the `/board` Socket.IO namespace with only `roomCode`. The server joins it to the room channel and streams public-only events. No token required.

---

## 13. Session Start Protocol

At the start of every development session, read these three files before touching any code:

1. `docs/prd.md` — what we're building and why
2. `docs/trd.md` — every technical decision and how it fits together
3. `docs/task-list.md` — current build status and what's next

Commit after every completed milestone. Update `docs/task-list.md` status at each commit.
