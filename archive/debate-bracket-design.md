# GameX — game and app design

A party game for a small group. Two choices go head to head, everybody argues, everybody
votes, one advances. Repeat until a champion. Underneath, each player is secretly rooting
for particular choices and trying not to give it away.

Designed for 5 players, one host (who is also a player), some co-located and some remote.

---

## 1. Core rules

- The host picks a topic. The app generates a pool of choices with images and a one-line blurb.
- Choices are seeded into a single-elimination bracket. Only the choices are eliminated.
- **No player is ever eliminated.** Everyone argues and votes in every match, all the way
  to the final, regardless of whether anything they secretly back is still alive.
- Each player is secretly assigned some choices to root for. Some choices belong to nobody
  — these are the wilds. A wild winning the whole thing is a legitimate and funny outcome.
- Guessing who was backing what is an optional side quest at the end, not the point.
- You must vote. You may vote against something you're backing. You may never state
  outright that a choice is or isn't yours.

---

## 2. The two design problems

**Problem 1 — everyone must stay invested for the full hour.** Solved by the no-elimination
rule plus the assignment mode (§3): stakes are distributed so nobody sits out the back half.

**Problem 2 — arguing for something must not reveal that you own it.** Solved by
**assigned advocates**. Each match, the app randomly picks one player to deliver the opening
case for A and one for B, regardless of who actually backs what. Now enthusiasm is noise
rather than evidence, and someone backing A can be publicly assigned to argue for B, which is
excellent cover.

Without assigned advocates the hidden layer collapses within two matches. This is the single
most important mechanic in the game.

---

## 3. Assignment modes

Three ways to hand out secret allegiances. Pick one per session; the app should support at
least the first two.

### Mode A — Portfolio (long arc)

Dealt once at the start. With 16 choices and 5 players: **3 each = 15 owned, 1 wild.**

- Seeding constraint: no two choices from the same portfolio meet in round 1.
- Pros: strong long-game narrative, real ownership, satisfying when your pick takes the crown.
- Cons: uneven stakes late — someone may have nothing alive by the semis. Acceptable now that
  nobody is eliminated, but the back half is less tense for them.
- Variant with more mystery: **2 each = 10 owned, 6 wild.** Far more doubt in the room,
  because any given match may involve zero owned choices.

### Mode B — Rolling stakes (even tension)

No upfront portfolio. Before each match, the server secretly tells each player their stake in
*that match only*: backing A, backing B, or neutral. Assignments are balanced so that across
the tournament everyone gets a similar number of stakes, spread evenly across rounds.

- Pros: nobody is ever a spectator, tension is identical in the final and in match one,
  almost nothing to memorise, and it leaks the least information.
- Cons: no long arc — you don't get to nurse a favourite through five rounds.
- Good for a first play, or a short 8-choice bracket.

### Mode C — Hybrid (recommended after one play)

Portfolio for rounds 1 and 2, then from the quarter-finals onward the app switches to rolling
stakes on top of whatever survives. You get the early ownership arc and the late-game
even tension. Slightly more to explain at the table.

### Draft variants (adds agency without adding information)

- **Blind draft.** Instead of being dealt, players take turns picking face-down numbered
  cards from the pool. You choose, but you don't know what you're choosing.
- **Deal and discard.** Deal 4, each player secretly discards 1 back into the pool as a wild.
  The discard is a real decision, and it creates wilds organically.

---

## 4. How to show a player their secret choices

The revealing UI matters more than usual here, because two of the players are in the same
room. Options, roughly best to worst for this group:

### 1. Just-in-time stake card (recommended)

At the start of each match, the phone shows one line and nothing else:
*"You're backing Vikram"* / *"You're backing neither"*. It clears when the match ends.

Nothing to memorise, nothing sitting on screen for a partner to glance at, and there's no
persistent list to accidentally show. Works natively with Mode B and can be layered on top of
Mode A as the display method for a portfolio dealt underneath.

### 2. In-context marking, no list

Never show a separate "your choices" screen. Instead, when browsing the pool or viewing a
matchup, your own choices carry a small coloured dot in the corner of the card — visible only
on your device. Your allegiance lives inside the thing itself rather than in a list, so there
is no single screen that dumps everything if someone looks over.

### 3. Hold-to-reveal dossier

A "my brief" panel that is blurred until you press and hold, and re-blurs the instant you
release. Screenshots and shoulder-glances get nothing. Simple to build, works everywhere.

### 4. Scratch-off card

At the draft, each choice arrives as a card you scratch open with your finger. Purely
tactile pleasure, but it makes the deal feel like a moment. Once opened, it should still be
gated behind hold-to-reveal afterwards.

### 5. Audio reveal through headphones

The app speaks your assignment. Genuinely the most leak-proof option for two people sharing a
sofa, and it feels like a spy briefing. Needs everyone to have earphones, so treat it as a
toggle rather than the default.

### 6. Codename mapping

Every choice has a two-word codename shown alongside its title. Your brief lists codenames
only, so a glance at someone's screen shows "Amber Fox" and means nothing without the key.
Adds a lookup step, which is friction, but it's a nice flavour layer.

### 7. Envelope moment

Nothing is visible until the host triggers "open your briefs", all five open simultaneously
with a countdown, and everyone gets exactly 15 seconds. Doesn't solve secrecy on its own —
combine it with 1, 2, or 3 — but it makes the deal feel ceremonial.

### Things not to do

- A persistent always-visible list of your choices. Guaranteed to leak in a shared room.
- Colour-coding by owner anywhere on the shared board view.
- Anything that requires the co-located pair to look away or be trusted. Design so trust
  isn't needed.

**Recommendation:** just-in-time stake card as the primary surface, in-context dots as a
secondary, and a hold-to-reveal dossier as the fallback for people who want to see the whole
picture. Offer audio reveal as a toggle.

### Out-of-band delivery — CHANNEL NOT YET DECIDED

> **Open decision.** The idea below is agreed in principle; the delivery channel is not.
> Telegram bot vs. email vs. Discord DM is still open, and it may end up being none of them
> if in-app delivery proves good enough. Build the assignment layer so the channel is a
> swappable adapter and this can be decided later without a rewrite.

Instead of showing assignments inside the app at all, push them to each player privately
outside it. The secret never touches a game surface, so there is nothing to glance at.

**The handler.** Don't send a bare list. Send a short in-character briefing, written fresh by
an LLM, in the voice of a shadowy handler who has hired the player:

> *Your asset is Vikram. It reaches the final, or you explain why. You will not be told who
> else is working tonight. Do not be interesting.*

The phrasing varies per player, so nobody can infer anything from message shape. The handler
can also keep talking between matches — *"still standing. Contain yourself."*

**Everyone gets a message, always.** This is the part that does the real work. Neutral players
receive a briefing too — same length, same moment, same tone — theirs simply says they have no
stake this round and should behave as though they do. All messages sent at an identical
timestamp. Without this, the tell isn't what's on your phone, it's whether you looked at it.

**Candidate channels, undecided:**

| Channel | Setup cost | Latency | Notes |
|---|---|---|---|
| Telegram bot | Low — BotFather token, `/start` once per player to capture `chat_id` | Instant | Fits per-match rolling stakes. Roughly 50 lines of code. |
| Discord DM via bot | Low, and no new app if voice is already on Discord | Instant | Close second to Telegram. |
| Email | Low — Resend or Postmark | 5–30s | Fine for the one-time opening dossier, too slow for a 15-second phase. |
| WhatsApp | High — Business API verification, approved templates | Instant | Too much scaffolding for a game night. |
| SMS (India) | High — DLT registration for transactional routes | Instant | Real bureaucracy and cost, no upside. |

**Burn after reading.** For the opening dossier specifically, send a one-time link rather than
the text. Opening it renders the brief and burns it; the URL never resolves again. Creates a
real moment at the table and leaves no artifact to scroll back to. This works with any of the
channels above, including email.

---

## 5. Surfaces

Two per person. No screen sharing — a screen-shared board over a video call loses image
quality and desynchronises the timer.

| Surface | Device | Shows |
|---|---|---|
| Board | Laptop, one per household | Bracket, current matchup cards, timer, vote reveal, player status row |
| Player | Phone, one per person | Stake card, advocate assignment, vote buttons, notes |
| Host panel | Host's phone or a laptop tab | Pause, extend, skip to vote, tiebreak, next match |

Each board opens independently in its own browser and is synced by the server. The existing
video call carries faces and audio only.

Fallback for anyone with only one device: a combined view where all secret content sits
behind hold-to-reveal.

---

## 6. Session flow

```
LOBBY
  → TOPIC_SETUP
  → GENERATING
  → POOL_REVEAL
  → DRAFT
  → BRACKET_REVEAL
  → [ MATCH × N ]
  → CHAMPION
  → SIDE_QUEST        (optional)
  → SCOREBOARD        (optional)
```

**LOBBY.** Room code. Each player enters a name and picks a colour. Host sees ready states.
Host also selects bracket size (8 or 16) and assignment mode.

**TOPIC_SETUP.** Host types or picks a topic — English TV series, Tamil comedy, 90s Tamil
films, best snack, whatever. Optionally adds 2–3 manual entries for inside jokes, which get
mixed into the generated pool.

**GENERATING.** Server produces the pool: title, year or context, one-line blurb, image.
Board shows a progress state.

**POOL_REVEAL.** All choices revealed to everyone simultaneously. 60 seconds to read.
Host has an optional veto pass here (see §9).

**DRAFT.** Secret assignments are handed out per §3 and §4. Wilds are created. Nobody,
including the host, learns anyone else's assignment.

**BRACKET_REVEAL.** Seeding is randomised server-side and only displayed now. This is what
keeps the pairings hidden from the host — the server seeds after the pool is locked, and the
host's client is never sent the bracket ahead of this state.

**MATCH loop.** See §7.

**CHAMPION.** Winner card, the full path it took, and a reveal of who was backing it. If a
wild wins, the board says so explicitly — it's a good punchline.

**SIDE_QUEST (optional).** Everyone privately guesses who was backing what, then a reveal.
Purely for bragging.

**SCOREBOARD (optional).** See §8.

---

## 7. Match loop

| Phase | Default | What happens |
|---|---|---|
| Reveal | 8s | Both cards flip up on the board with images and blurbs |
| Advocates | 30s each | Two randomly assigned players give the opening case for A and for B |
| Open floor | 60s | Free-for-all argument |
| Vote | 15s | Everyone votes on their phone, hidden until locked |
| Result | — | Votes revealed together, winner advances on the bracket |

Roughly 2:15 per match. A 16-choice bracket is 15 matches, so about an hour with banter.

Scale the open floor up as it gets serious: 60s in round 1, 90s in the semis, 3 minutes in the
final. The app should do this automatically by round.

**Timer implementation.** The server sends an end-timestamp, not a countdown. All clients
interpolate locally. A reconnecting client resumes at the correct moment. Soft chime at
15 seconds remaining, not just at zero.

**Ties.** Impossible with 5 voters unless somebody doesn't vote. Rule: a missed vote is an
abstain; a tie triggers a 30-second sudden-death re-vote; if still tied, a system coin flip
that the host triggers but does not decide.

---

## 8. Scoring (optional layer)

Since nobody is eliminated, scoring is decoration rather than structure. Offer it as a toggle;
some nights you'll just want the argument.

| Event | Points |
|---|---|
| A choice you back survives round 1 | 1 |
| Reaches quarter-final | 2 |
| Reaches semi-final | 3 |
| Reaches final | 5 |
| Wins the bracket | 8 |
| Correct guess in the side quest | 2 each |
| One of your choices going unguessed | 3 each |

Optional extra: a **secret futures bet** locked at DRAFT — each player privately names the
choice they think will win the whole tournament, worth 6 points. It creates a nice conflict,
because you want your bet to land but pushing for it publicly is exactly what gives you away.

---

## 9. Content generation and images

**The list.** An LLM generates N choices given the topic, an optional era range, and a hint
about how hard the comparisons should be. Manual entries from the host are merged in.
Each entry returns: title, year or context, one-line blurb, and a search key.

**The images.** Do not use AI image generation — for Tamil films and English TV it produces
mush. Resolve names to real artwork:

- Films and TV, including Tamil, Telugu, Hindi: **TMDB API**. Free key, strong regional
  coverage, gives posters, year, and a synopsis you can trim into the blurb.
- People, places, food, brands, general knowledge: **Wikipedia REST summary endpoint** for a
  thumbnail plus a first paragraph.
- Inside jokes and abstract topics: fall back to a generated typographic card — bold text on a
  colour derived from the title, plus one icon.

Cache images server-side and crop to a consistent 2:3 card so the board doesn't look ragged.

**Assist mode (toggle).** Shows 3 talking points per choice. Useful when not everyone has seen
everything. Turn it off for topics you all know well — it flattens the arguing, which is the
actual game.

**Host veto pass.** The host sees the generated pool and may delete up to 3 duds, which are
regenerated. This gives the host a small information edge that's offset by having to run the
timer. If you'd rather the host be a fully equal player, skip the veto and have the pool
reveal to everyone simultaneously without the host seeing it first. Either way, seeding
happens after lock, so pairings stay hidden from everyone.

---

## 10. Screens

**Board (laptop).**
- Bracket tree, current match highlighted, completed matches showing their winner.
- Matchup panel: two large cards side by side with image, title, context line, blurb.
- Timer ring with phase name.
- Player status row: connected / voted / waiting. Cheap to build, prevents the most likely
  argument of the night.
- Vote reveal: all five votes flip at once, never one at a time.

**Player (phone).**
- Big current-phase banner so you know whether to talk or vote.
- Stake card for this match.
- Advocate badge when you've been assigned to open for a side.
- Two large vote buttons, locked once tapped, with a 3-second undo.
- A "my brief" tab behind hold-to-reveal.

**Host panel.**
- Pause / resume, +30s, skip to vote, force result.
- Next match, replay a match, tiebreak trigger.
- Nudge a player who hasn't voted.
- Emergency: end round, jump phase.

---

## 11. State and data

Server-authoritative. Secret state must never be sent to a client that shouldn't see it —
no hiding things in the frontend.

```
Room       { code, hostId, players[], phase, settings }
Player     { id, name, colour, connected, score }
Choice     { id, title, contextLine, blurb, imageUrl, isWild }
Assignment { playerId, choiceId }            // server-only
Match      { id, round, slotA, slotB, winnerId, advocateA, advocateB,
             votes[], phase, phaseEndsAt }
Bracket    { rounds[][] }                     // withheld until BRACKET_REVEAL
```

Serialise per-client: strip `Assignment` entirely, and attach only that player's stake to
their own match payload.

---

## 12. Tech notes

- Next.js plus Socket.IO, or Supabase Realtime if you'd rather not run a socket server.
- No accounts. Room code plus a name.
- Keep the room in memory with a periodic JSON snapshot so a server restart doesn't kill
  the evening.
- Reconnect handling matters — three players are remote. On reconnect, replay current phase
  and `phaseEndsAt`.
- Timers are timestamps, never client-side counters.

---

## 13. Build order

**v1 — playable.**
Pool generation with images, bracket, match loop with host timer controls, voting,
rolling-stakes assignment (Mode B), just-in-time stake card, player status row.

**v2 — the good stuff.**
Assigned advocates. If you only add one thing from v2, add this.

**v3 — depth.**
Portfolio mode, hold-to-reveal dossier, side quest, scoring, futures bet.

**v4 — polish.**
Audio reveal, codenames, scratch-off draft, assist mode, saved topic packs, match replay.

**Unscheduled — pending a decision.**
Out-of-band handler delivery (§4). Slot it in once the channel is chosen. Writing the
assignment layer against a `deliver(playerId, message)` interface from v1 onward means this
drops in at any point, and in-app delivery is just the default adapter.

---

## 14. Open decisions

Not yet settled. Build so each of these can be swapped late.

- **Out-of-band delivery channel** (§4). Telegram bot vs. email vs. Discord DM vs. staying
  fully in-app. Undecided. Keep it behind an adapter interface.
- **Assignment mode** for the first real session (§3) — rolling stakes vs. portfolio.
- **Host veto pass** on the generated pool (§9), which trades a small host information edge
  for pool quality.
- **Whether scoring is on at all** (§8).

---

## 15. House rules to enforce in the app

- Voting is mandatory. A missed vote is an abstain and can cause a tie.
- You may vote against a choice you're backing.
- You may never state outright that a choice is or isn't yours.
- Advocates must actually make the case they were assigned, even a bad one.
- The host runs the clock but does not decide anything the clock decides.
