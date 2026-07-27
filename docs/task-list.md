# Debate Bracket — Dev Task List

Generated from brainstorming session: 2026-07-27
Tech stack: Next.js + Socket.IO
Default config: 4 players, 16 movies, host-configurable owned vs wild ratio

---

## Layer 1 — Skeleton (Room / Socket / Bracket)

_Foundation for everything. All later layers depend on this being stable._

- [ ] Create room model — define server-side room state shape: roomId, hostId, players[], bracketSize (8/16/32), status enum (lobby/draft/active/ended)
- [ ] Implement room creation API route — `POST /api/room/create`; generates unique roomId, stores room in server memory or session store; returns roomId to host
- [ ] Implement room join flow — `POST /api/room/join`; accepts roomId + player name; adds player to room state; emits `player-joined` Socket.IO event to all clients in room
- [ ] Set up Socket.IO server — initialise Socket.IO on the Next.js custom server; define room namespacing by roomId so events are scoped per game session
- [ ] Build lobby screen (host view) — shows joined players, bracket size selector (8/16/32), owned vs wild ratio slider; host sees a "Start Game" button; dependency: room join flow must be complete
- [ ] Build lobby screen (player view) — shows room code, waiting state, player list as others join; receives `player-joined` Socket.IO event to update live
- [ ] Build TV board client — separate browser client (e.g. `/tv/[roomId]`) that connects to Socket.IO and receives only public state; no secret data ever sent to this client
- [ ] Implement bracket generation — on host "Start Game", take the approved movie pool and seed a single-elimination bracket; store full bracket structure server-side; emit `bracket-ready` event with public bracket data (movie titles, match pairings, round index) — _dependency for Layer 2 content reveal and Layer 3 assignment_

---

## Layer 2 — Content (LLM Generation / Host Veto / Pool Reveal)

_Depends on Layer 1 room and socket infrastructure._

- [ ] Build topic input screen (host) — text field for host to enter a topic (e.g. "space movies"); submit triggers LLM generation; show loading state
- [ ] Implement LLM generation API route — `POST /api/movies/generate`; accepts topic + bracketSize; calls LLM to produce N movie titles (N = bracketSize); returns list to host only; server-side only, never emitted to TV board or players at this stage
- [ ] Implement host veto UI — display generated movie list to host; allow deletion of up to 3 entries with a "remove" button per item; each deletion triggers regeneration of that slot via a follow-up LLM call (`POST /api/movies/regenerate-slot`)
- [ ] Implement manual entry — host UI includes up to 2 free-text fields to add manual movie titles to the pool before approving; appended to list before bracket seed
- [ ] Implement host approve action — "Approve Pool" button on host screen; emits `pool-approved` Socket.IO event; triggers bracket generation (Layer 1 bracket task); locks pool from further edits
- [ ] Reveal bracket to TV board — on `bracket-ready` event, TV board renders the full single-elimination bracket with all movie titles visible; first-round match pairings displayed — _dependency for Layer 4 match loop_

---

## Layer 3 — Secret Layer (Assignment / QR)

_Depends on Layer 1 bracket and Layer 2 pool approval. Server-side secrecy is critical throughout._

- [ ] Design assignment algorithm — server-side function: at the start of each round, assign each player one movie from that round's active matches; respect owned vs wild ratio set by host; if a player's previously assigned movie was eliminated, assign a new live movie; multiple players may be assigned the same movie in later rounds (semis/finals) without knowing — server-side only
- [ ] Implement assignment store — server-side data structure that records, per player per round: playerId, roundIndex, assignedMovie; never exposed to clients during the game; persisted in room state for post-game reveal — _dependency for Layer 5 ending_
- [ ] Implement QR generation API route — `GET /api/qr/[roomId]/[playerId]/[roundIndex]`; server validates the request is for the current round; generates QR code image encoding the player's secret assignment text (movie name + round context e.g. "Defending: Interstellar — Round 1 of 4"); returns image; server-side only, never cached on client
- [ ] Build sequential QR display on TV board — host triggers "Show QR" for the current round; TV board displays one QR code at a time per player in sequence (Player 1 → Player 2 → ...); host advances manually; QR disappears after player scans or host moves on — trust-based, MVP; emit `qr-next-player` Socket.IO event to advance
- [ ] Build in-app assignment reveal (remote players) — for players not co-located, a "Reveal My Assignment" button appears in the player app at the start of each round; fetches from the QR API route and displays assignment text inline; cleared at round end
- [ ] Enforce round-scoped QR expiry — QR API route checks current round server-side; requests for a past round return 403; prevents players scanning old QR codes for stale assignments

---

## Layer 4 — Match Loop (Board / Host Controls / Vote)

_Depends on Layers 1-3. This is the core runtime loop repeated each round._

- [ ] Display active match on TV board — TV board shows the current head-to-head match: Movie A vs Movie B; updates on `match-start` Socket.IO event emitted by server when host advances to a match
- [ ] Build host match control panel — host screen shows current match, a "Call Vote" button, and a "Coin Flip" button (visible only on tie); no discussion timer — host drives pace
- [ ] Implement vote submission (player) — player app shows Movie A and Movie B buttons once host calls vote (on `vote-open` Socket.IO event); player taps to cast vote; emits `player-vote` event with {playerId, matchId, choice}
- [ ] Implement live vote display on TV board — as each `player-vote` event arrives, TV board immediately shows updated tally (e.g. "Movie A: 2 — Movie B: 1"); votes are visible as cast, not hidden until all locked; no vote timer
- [ ] Implement vote resolution — server listens for all 4 player votes (or host manually closes vote); calculates winner by majority; on tie (2-2), winner is not auto-resolved — host must trigger coin flip
- [ ] Implement coin flip — host taps "Coin Flip" button; server picks heads or tails randomly; emits `coin-flip-result` event with {result: "heads"|"tails", winner: movieTitle}; TV board displays result prominently
- [ ] Advance bracket on winner — server updates bracket state with winning movie advancing to next round; emits `match-result` event with {winnerId: movieTitle, nextMatchup}; TV board re-renders bracket; triggers next-round assignment algorithm (Layer 3)
- [ ] Loop: repeat match sequence — after each match result, host panel shows "Next Match" button; emits `match-start` for the next pairing in the current round; repeats until round is complete, then increments round index and re-triggers QR assignment phase

---

## Layer 5 — Ending (Champion Screen / Post-Game Reveal)

_Depends on all prior layers. Assignment store from Layer 3 must be complete and accurate._

- [ ] Detect final match completion — server detects when bracket has one movie remaining (final match resolved); emits `game-over` event with {champion: movieTitle}
- [ ] Build champion screen (TV board) — TV board displays winning movie title prominently on `game-over` event; transition from bracket view to champion view
- [ ] Build post-game assignment history reveal — after champion is shown, host triggers "Reveal Assignments"; server emits full assignment history from the store: for each player, each round's assigned movie; TV board and player apps display this as a scrollable table or list — the "side quest" payoff moment
- [ ] Format assignment history display — each row: Player Name | Round | Movie Defended; highlight cases where multiple players defended the same movie in the same round; no scoring shown — display only, for social discussion
- [ ] Build play-again flow — host screen shows "New Game" button post-reveal; resets room state (clears bracket, assignments, pool) but keeps players in room; returns to topic input screen (Layer 2); emits `room-reset` Socket.IO event to all clients

---

## Cross-Cutting / Infrastructure

- [ ] Define shared Socket.IO event schema — document all event names and payloads in a single constants file (e.g. `lib/socket-events.ts`); both server and client import from this file to avoid string drift — _dependency for all socket tasks across all layers_
- [ ] Enforce TV board receives public state only — middleware or server-side filter on all Socket.IO emissions; any payload containing assignment data must be scoped to individual player socket connections, never broadcast to the room — _security-critical, review at each layer_
- [ ] Bracket size configuration — host settings UI exposes bracket size (8/16/32) and owned vs wild ratio before game start; values stored in room state and used by assignment algorithm and LLM generation route
