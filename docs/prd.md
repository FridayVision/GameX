---
title: GameX
status: final
created: 2026-07-27
updated: 2026-07-28
---

# PRD: GameX

## 0. Document Purpose

This PRD is for the developer(s) building GameX v1 and the host who will run the first session. It defines what to build, not how. Vocabulary is anchored in §3 — terms there are used verbatim throughout. Source: `docs/brainstorm-intent.md`. Screen layout references are in `addendum.md`.

---

## 1. Vision

GameX turns any topic into a knockout tournament of argument. Players pick the better option in each head-to-head — a Tamil film, a snack, a footballer — debating until one champion survives. The twist: each player secretly defends a specific item each round, known only to them. Nobody knows who's rooting for what, which makes every argument interesting and every vote slightly suspicious.

There's no player winner. No scores. The tournament crowns an item. The post-game reveal — who defended what, round by round — is the payoff that turns the bracket result into a story.

The app runs in any browser, supports groups on a shared TV and fully remote play equally, and takes under five minutes to set up.

---

## 2. Target User

### 2.1 Jobs To Be Done

- Have a structured, lively group argument about something everyone has opinions on.
- Keep every person invested for the full session — not just the first few rounds.
- Create a "wait, they were defending *that*?" moment at the end.
- Get a session running in under five minutes with no installs and no accounts.

### 2.2 Key User Journeys

**UJ-1. Raahul hosts a Tamil movie bracket with four friends — three in the room, one remote.**
- **Entry state:** Raahul opens the app on his laptop, creates a Room, shares the code. Three friends join on phones. One joins remotely on their phone. Raahul opens the Board URL on his laptop and connects it to the TV via HDMI.
- **Path:** Raahul types "Vadivelu comedy movies" → app generates a Pool of 25 movies via multi-tool search → Raahul selects 16, adds one manual entry, locks the list → Round 1 begins → each player's phone shows a face-down Assignment card; they long-press to reveal their pick privately → all four debate match one → Raahul calls Vote on his phone → votes appear live on TV → winner advances → repeat.
- **Climax:** Thiruda Thiruda wins the final. The post-game reveal shows Padma ended up defending it in the semi and final after her own pick was eliminated in Round 2 — Raahul had been quietly arguing against it the whole time.
- **Resolution:** The assignment history table appears on TV and all phones. Everyone argues about whether Raahul threw Round 1.

**UJ-2. A remote player uses reverse psychology to protect their pick.**
- **Entry state:** Player receives a room code, opens the web app on their phone, enters a name and colour.
- **Path:** Each round their Assignment card appears face-down. They long-press to see "You are defending: Kadhalan (Round 2 of 4)," release, and the card obscures. They argue loudly *against* Kadhalan to mislead the room. It wins anyway.
- **Climax:** Post-game reveal outs them. The table erupts.

---

## 3. Glossary

- **Room** — A game session identified by a short alphanumeric code. Created by the Host; Players join by entering the code in any browser.
- **Host** — The Player who creates the Room and controls the Host Panel. The Host participates as a Player in every Match.
- **Player** — Any participant, including the Host. 3–8 per Room.
- **Topic** — A keyword or phrase the Host enters to seed Pool generation (e.g. "Vadivelu comedy movies").
- **Pool** — The full list of generated Items (approximately 1.5× the Bracket size) from which the Host curates the final set.
- **Item** — One tournament entry: title, context line, one-line blurb, image. Films and TV: sourced from TMDB. General topics: Wikipedia thumbnail and first paragraph.
- **Bracket** — The server-side single-elimination structure. Never shown to any Player or the Host. Re-drawn fresh after each Round.
- **Draw** — The random server-side pairing of surviving Items into Matches for the coming Round. Generated after the previous Round ends; not disclosed in advance.
- **Match** — One head-to-head pairing of two Items within a Round. All Players debate and vote in every Match.
- **Round** — All Matches within the same elimination tier, run sequentially one at a time. A new Draw follows each Round.
- **Assignment** — The Item a Player is secretly told to defend for a given Round. Delivered in-app via Long-Press Reveal. Pure random assignment; multiple Players may share the same Assignment in a Round.
- **Board** — A login-free, display-only app view (`/room/{code}/board`) showing public game state: Match cards, live vote tally, champion, Post-Game Reveal. No secret information. Designed to run on a TV, projector, or shared screen.
- **Player View** — The personal app view on each Player's device. Shows the Assignment card, vote buttons, current Match state, and Post-Game Reveal.
- **Host Panel** — A control overlay visible only on the Host's device (on top of their Player View). Controls: Pool approval, Call Vote, Coin Flip, Next Match.
- **Long-Press Reveal** — A press-and-hold gesture that surfaces a Player's Assignment card. Obscures immediately on release.
- **Coin Flip** — Host-triggered tiebreak on a tied Vote. Heads = Item A advances, Tails = Item B. Result shown on Board and all Player Views.
- **Post-Game Reveal** — The session-end screen showing the full Assignment history: each Player, each Round, each Item defended.

---

## 4. Features

### 4.1 Room & Session Setup

**Description:** The Host creates a Room; a short code is generated for Players to join from any browser. No accounts, no installs. The Host sets Bracket size and portfolio depth before the session starts. Realizes UJ-1.

#### FR-1: Room creation
Host can create a Room and receive a shareable code.

**Consequences:**
- Room is created server-side with a unique 4–6 character alphanumeric code.
- Host is assigned the Host role automatically and lands in the Lobby.
- Room state persists with periodic JSON snapshot; a server restart does not end an active session.

#### FR-2: Player join
Player can join a Room by entering a code, a display name, and a colour. Realizes UJ-2.

**Consequences:**
- Player appears in the Lobby on the Board and all Player Views as connected, shown in their chosen colour.
- Display names must be unique within a Room; duplicates are rejected with an inline error.

#### FR-3: Session configuration
Host can set Bracket size (8 / 16 / 32; default 16) before starting.

**Consequences:**
- Configuration is locked once the Host triggers Pool generation.

---

### 4.2 Content Pool Generation

**Description:** The Host enters a Topic. The system uses multi-tool LLM search — web, Reddit, TMDB, Wikipedia — to produce a Pool roughly 50% larger than the Bracket size, ranked by cultural popularity rather than recency or alphabetical order. The Host curates, can partially regenerate with a Boost Keyword, and may add manual entries. Pool quality determines argument quality — this is the most important setup step. Realizes UJ-1.

#### FR-4: Topic-driven Pool generation
Host enters a Topic and triggers LLM-powered Pool generation.

**Consequences:**
- System invokes multiple tools in sequence or parallel: general web search, Reddit (subreddit and thread search for popularity signals), TMDB (for films and TV), Wikipedia (for general knowledge topics).
- Results are ranked by popularity signals — Reddit mentions, ratings, cultural prominence — not release date or alphabetical order.
- Pool size = ceil(Bracket size × 1.5) — e.g. 25 for a 16-Bracket, 12 for an 8-Bracket, 48 for a 32-Bracket.
- Each Item includes: title, year or context, one-line blurb, image URL.
- Board shows a live generation progress state while tools are running.

#### FR-5: Host Pool curation
Host selects Items from the Pool to form the final tournament set.

**Consequences:**
- Host sees the full Pool and selects the target count (e.g. 16 of 25). Selected Items are highlighted; unselected Items remain available.
- Host can deselect and reselect freely before locking.

#### FR-6: Partial regeneration with Boost Keyword
Host can select a subset and request additional Items to fill remaining slots, optionally scoped with a Boost Keyword.

**Consequences:**
- Example: Host selects 10 of 25, types "90s only," requests 6 more. System generates 6 Items matching the Boost Keyword alongside existing context.
- Previously selected Items are not replaced.
- Host may trigger partial regeneration up to 3 times per session. [ASSUMPTION]

#### FR-7: Manual entries and edits
Host can add up to 3 manual Items and edit any Item's title or blurb inline before locking.

**Consequences:**
- Manual Items without an image fall back to a typographic card: bold title on a colour derived from the title hash.
- Edits do not trigger regeneration.

#### FR-8: Pool reveal
Once the Host locks the Item set, all Players see the full list simultaneously. Realizes UJ-1.

**Consequences:**
- All Items shown as cards on Board and all Player Views: image, title, context line, blurb.
- The Draw for Round 1 is generated server-side after the Pool locks. No client receives pairing information before Matches begin.
- [ASSUMPTION: 60-second Pool reveal window before Round 1 starts; Host can advance early.]

---

### 4.3 Bracket & Assignment Engine

**Description:** After Pool lock, the server generates Round 1 pairings and assigns each Player their secret Items. Secret state never leaves the server to the wrong client. When a Player's Item is eliminated, they receive a new random Assignment for the next Round. Assignments are purely random — multiple Players may defend the same Item in a Round.

#### FR-9: Round Draw
Server generates Match pairings randomly at the start of each Round.

**Consequences:**
- Bracket structure is never exposed to any Player or the Host at any point.
- Players see only the current Match — never upcoming pairings.
- Round 1 constraint: no two Items assigned to the same Player meet in Round 1. [ASSUMPTION: best-effort; relaxed if configuration makes it impossible.]
- After each Round completes, the server draws fresh pairings for surviving Items.

#### FR-10: Initial Assignment
Server assigns each Player their starting Items before Round 1.

**Consequences:**
- Each Player's Assignment is sent only to their own socket connection.

#### FR-11: Round-start Assignment update
At the start of each Round, each Player's device receives their Assignment for that Round.

**Consequences:**
- If a Player's Item is still alive: same Assignment. Card reads "You are defending: [Title] (Round N of M)."
- If eliminated: server assigns a random surviving Item. No indication is given that the Assignment changed.
- Multiple Players may hold the same Assignment. This is intentional.
- Assignment card auto-dismisses when the Round's first Match begins.
- Full Assignment history (Player × Item × Round) is recorded server-side; never surfaced mid-session.

---

### 4.4 Secret Assignment Delivery

**Description:** Assignment delivery is identical in co-located and remote modes — in-app on each Player's device via Long-Press Reveal. The Board never shows any Player's Assignment. Realizes UJ-1, UJ-2.

#### FR-12: Long-Press Reveal card
At the start of each Round, each Player's device shows a face-down Assignment card.

**Consequences:**
- Player presses and holds to reveal: "You are defending: [Title] (Round N of M)."
- Card re-obscures immediately on release.
- Card is accessible only during the inter-round Assignment phase; it auto-dismisses when the Round's first Match begins.
- Behaviour is identical in co-located and remote modes.
- [ASSUMPTION: Players in co-located mode are trusted not to share their screen with others.]

---

### 4.5 Match Loop

**Description:** Each Match runs four phases, all paced by the Host. No timers are forced by the app. Votes are shown live as cast. The Host Panel is the only control surface; the Board and all Player Views display the current public state. Realizes UJ-1, UJ-2.

#### FR-13: Match reveal
At the start of each Match, both competing Items are displayed on the Board and all Player Views.

**Consequences:**
- Each Item shown as a card: image, title, context line, blurb.
- No auto-advance; the Host controls all transitions.

#### FR-14: Open debate
All Players debate freely. The app imposes no speaking order, roles, or timer.

**Consequences:**
- App state during debate: Match cards visible, no vote buttons shown.
- [NON-GOAL for MVP: advocate assignment (forcing a Player to argue for a specific side).]

#### FR-15: Host calls Vote
Host taps "Call Vote" on the Host Panel to open the voting phase for all Players.

**Consequences:**
- All Player Views display two large vote buttons (Item A / Item B).
- Host Panel shows a live count of votes cast vs. Players pending.
- No vote timer.

#### FR-16: Live vote display
Votes appear on the Board and all Player Views as each Player casts theirs.

**Consequences:**
- Votes shown by Player colour — not name — accumulating under each Item.
- The Board shows a Player status row throughout each Match: each Player's colour dot is marked connected / voted / waiting. Prevents the most common table dispute ("did you vote yet?").
- A Player may not change their vote once cast.
- Once all Players have voted, the winning Item is highlighted automatically.

#### FR-17: Tie resolution
If votes are tied, the Host triggers a Coin Flip from the Host Panel.

**Consequences:**
- Coin Flip is animated on the Board and all Player Views. Heads = Item A advances, Tails = Item B.
- Result recorded identically to a normal vote outcome.

#### FR-18: Match advance
Host confirms the result and advances to the next Match or Round.

**Consequences:**
- Winning Item advances in the server-side Bracket.
- If all Matches in the Round are complete, the system triggers a new Draw (FR-9) and Round-start Assignment update (FR-11) before the next Match begins.

---

### 4.6 Post-Game Reveal

**Description:** When the final Match concludes, the app displays the champion Item and then reveals the full Assignment history. This is the session's social payoff. Realizes UJ-1.

#### FR-19: Champion screen
The winning Item is displayed on the Board and all Player Views.

**Consequences:**
- Host advances to the Assignment history reveal.

#### FR-20: Full Assignment history reveal
The app shows a table: each Player, each Round, each Item they defended.

**Consequences:**
- Triggered by the Host after the champion screen.
- Table shows starting Assignments and all subsequent round-by-round reassignments.
- No export or external sharing in v1.

---

## 5. Non-Goals

- No player scoring, leaderboards, or player-level win tracking in v1.
- No advocate assignment mechanic in v1. [NOTE FOR PM: the original design doc flags this as the single most important mechanic for reducing information leakage — revisit after the first real session.]
- No hard secrecy enforcement. The game trusts players.
- No native mobile app — browser only.
- No accounts or persistent player profiles.
- No session saving, history, or replay.
- No audio reveal, codename delivery, or out-of-band messaging (Telegram, Discord, email, SMS).

---

## 6. MVP Scope

### 6.1 In Scope

- Room creation and Player join — browser only, no accounts
- Multi-tool LLM Pool generation ranked by popularity
- Host Pool curation: select, partial regen with Boost Keyword, up to 3 manual entries
- Bracket sizes: 8 / 16 (default) / 32
- Secret Assignment via Long-Press Reveal — same mechanic on all devices
- Auto-reassignment each Round when a Player's Item is eliminated; pure random
- Match loop: reveal → debate → Host calls Vote → live votes by colour → advance
- Tie resolution via Host-triggered Coin Flip
- Board view (login-free, display-only URL) for TV / screenshare / projector
- Player View on every participant's device
- Host Panel overlay on Host's Player View
- Champion screen and full Assignment history Post-Game Reveal

### 6.2 Out of Scope for MVP

- Scoring and points [deferred to v2]
- Advocate assignment [deferred to v2]
- Assist mode — talking points per Item [deferred to v3]
- Audio reveal, codenames, scratch-off draft [deferred to v3+]
- Saved topic packs [deferred to v4]
- Out-of-band Assignment delivery — Telegram, Discord, email [deferred; adapter interface built from v1]
- Blind draft and deal-and-discard variants [deferred to v3]
- Futures bet and side-quest scoring [deferred to v3]
- Export or sharing of Post-Game Reveal [deferred]

---

## 7. Success Metrics

Hobby project. Success = sessions run end-to-end without technical intervention, and the Post-Game Reveal produces at least one surprised reaction.

**Primary**
- **SM-1:** Session completion rate — % of started sessions reaching Post-Game Reveal. Target: 100% in test sessions.

**Counter-metric**
- **SM-C1:** Setup time — Room creation to first Match reveal in under 5 minutes. Counterbalances optimising Pool generation quality at the expense of speed.

---

## 8. Assumptions Index

- §3 Player — min 3, max 8 Players per Room.
- §4.2 FR-8 — 60-second Pool reveal window before Round 1; Host can advance early.
- §4.2 FR-6 — Host may trigger partial regeneration up to 3 times per session.
- §4.3 FR-9 — Round 1 pairing constraint (no two Players share the same Assignment) is best-effort; relaxed if configuration makes it impossible.
- §4.3 FR-11 — Auto-reassignment is pure random; multiple Players may share the same Assignment in a Round.
- §4.4 FR-12 — Co-located Players are trusted not to share phone screens with others.
- §4.6 FR-20 — No export or sharing of Post-Game Reveal in v1.
- §IA — The Board client and the Host's Player View are independent, anonymous connections to the same Room. The Host Panel is tied to the Host role, not to a specific device.

---

## Aesthetic & Tone

Fast, sleek, modern — the UI should feel like a polished product. Dark mode preferred for TV display. Cards are the primary visual unit: large, image-forward, clean typographic hierarchy. Motion is purposeful — vote counts tick up live, the champion reveal lands with weight. Every screen has one job; no clutter.

---

## Information Architecture

Three surfaces, one model across all play scenarios.

| Surface | URL | Login | Content |
|---|---|---|---|
| Board | `/room/{code}/board` | None | Public: Match cards, live vote tally, champion, Post-Game Reveal |
| Player View | `/room/{code}` | Name + colour | Personal: Assignment card, vote buttons, Match state, Post-Game Reveal |
| Host Panel | Overlay on Player View | Host role | Pool approval, Call Vote, Coin Flip, Next Match |

**Host dual-device setup:** Host opens `/room/{code}/board` on a laptop (HDMI to TV or screenshared into a video call) and `/room/{code}` on their phone as the controlling Player. The two are independent anonymous connections to the same Room — no linking required.

**Play scenario coverage:**

| Scenario | Board device | How shown | Player devices |
|---|---|---|---|
| Co-located, TV | Host's laptop | HDMI | Everyone's phone |
| Co-located, projector | Host's laptop | HDMI / wireless | Everyone's phone |
| Remote with screenshare | Host's laptop | Shared in video call | Everyone's phone or laptop |
| Fully remote, no shared screen | Not used | — | Everyone's own device |

**Screen flows:**

- **Player View (phone):** Join → Lobby → Pool Reveal → Assignment Card (Long-Press Reveal) → Match view (vote buttons, live vote tally) → Post-Game Reveal.
- **Board (TV / laptop):** Lobby (room code, connected Players) → Pool Reveal → Match view (Item cards, live vote tally by Player colour) → Champion screen → Post-Game Reveal.
- **Host Panel (overlay):** Session config → Pool curation → per-Match: Call Vote → Coin Flip (if tied) → Next Match.

*Detailed screen layout mockups are in `addendum.md`.*
