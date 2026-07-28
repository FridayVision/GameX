# Brainstorm Intent — GameX

**Session:** brainstorm-debate-bracket-open-decisions — 2026-07-27
**Status:** All decisions resolved. Ready for PRD.

---

## Game Overview

A bracket-style elimination game where players debate which item (e.g. a movie) deserves to win. Each player is secretly assigned an item to defend each round via QR code; as items are eliminated, assignments change. No player wins or loses — the bracket crowns a champion item. The secret allegiance layer and post-game reveal of who defended what are the social payoff.

---

## All Settled Decisions

- Bracket size: 16 default; host can set 8 or 32 in settings.
- LLM generates 32 candidate items; host approves the pool before the game starts.
- Host veto: up to 3 duds deletable with regeneration; host may add 1-2 manual entries before pool reveals.
- Portfolio: host-configurable — host sets how many items each player owns vs how many are wilds.
- Each player is assigned one item upfront; if their item is eliminated, they receive a new live item each round.
- Assignment delivery: co-located = QR on TV per player (sequential, trust-based, MVP); remote = in-app reveal. No out-of-band channel.
- QR shown per round, not per match. QR displays: item name + round context (e.g. defending 1 of 32 in Round 1).
- All four players debate each match; no formal advocate roles.
- Match flow: host calls vote — no discussion timer, no vote timer.
- Votes shown live as cast; not hidden until all locked.
- Ties: host triggers coin flip; heads = Item A wins, tails = Item B wins; result shown on TV.
- Secrecy: light and fun, reverse psychology allowed, no hard rules against revealing.
- Scoring: deferred. No points, no player winner in v1.
- App tracks full assignment history per player per round; reveals only post-game at champion screen.

---

## Core Mechanics

- **Assignment:** each player owns 1 item upfront; eliminated item triggers auto-reassignment to a live item each round.
- **QR delivery:** TV displays QR per player sequentially each round; player scans privately to see their stake; scan every round even if assignment unchanged (ritual).
- **Match flow:** host calls debate start, host calls vote when ready.
- **Voting:** votes displayed live as cast; no timer; host-paced.
- **Tie resolution:** host-triggered coin flip; outcome shown on TV.
- **Post-game reveal:** champion screen shows full assignment history — who defended what, every round. Automated.

---

## Key Insights

- QR-per-round solves three problems with one mechanic: delivery channel (no Telegram/out-of-band), secrecy (context clears after round), and the spy-briefing ritual moment.
- The app serves the table, not the reverse — host calls vote, votes are live, no timers. All three form one coherent design principle: the room controls the pace.
- Dropping scoring, formal advocates, and the vote timer made the game dramatically more buildable without reducing fun. The core loop is 6 steps: generate → draft → bracket → debate → vote → advance.
- Post-game reveal replaces the manual side-quest concept; tracking is automated, payoff is always delivered.

---

## Deferred / Out of Scope for v1

- Scoring and player-level win tracking.
- Hard secrecy rules or enforcement mechanics.
- Remote play as a primary path (in-app reveal noted but not built in v1).
- Any formal advocate or assigned-speaker mechanic.

---

## Tech Stack

- **Framework:** Next.js
- **Realtime:** Socket.IO
- **TV board:** browser client receiving public state only
- **QR generation:** server-side via API route

---

## Build Order

1. **Layer 1 — Skeleton:** room creation, socket infrastructure, bracket structure.
2. **Layer 2 — Content:** LLM item generation, host veto flow, pool reveal.
3. **Layer 3 — Secret layer:** player assignment engine, QR generation and delivery.
4. **Layer 4 — Match loop:** TV board, host controls, voting, tie resolution.
5. **Layer 5 — Ending:** champion screen, post-game assignment history reveal.
