# UX Micro Doc — Host Panel Surface
GameX · 2026-07-28 · Status: draft

> **Scope:** Structured UX artifact only. No visual style (colours, typography, spacing) — those belong in DESIGN.md, not yet created.

---

## 1. Surface Overview

The Host Panel is a persistent control overlay visible only on the Host's own device, rendered on top of their Player View. It is never shown on the Board or any other Player's device. The Host is simultaneously a Player (they debate and vote in every Match) and the session controller (they approve the Pool, call Votes, trigger Coin Flips, and advance Matches). This dual role creates a fundamental UX tension: the Host must be able to take controller actions without losing access to their player actions, and vice versa. The Host Panel must never obscure the Host's vote buttons or Assignment card. The overlay must feel like a natural extension of the Player View, not a separate app layered on top.

---

## 2. Screen Inventory

| Panel phase | Entry trigger | Controls shown | Underlying Player View screen |
|---|---|---|---|
| Session Config | Host creates Room | Bracket size selector, items-owned-per-player slider, start trigger | Lobby |
| Pool Generation | Host triggers generation | Progress indicator (read-only), cancel [ASSUMPTION] | Pool Generation |
| Pool Curation | Generation complete | Item selection grid, Approve button, Regen controls, manual entry | Pool Curation |
| ~~Pool Reveal~~ | ~~removed~~ | ~~No pool reveal; Host Panel transitions directly to Round 1 assignment~~ | ~~n/a~~ |
| Inter-Round Assignment (passive) | Round N begins | No controls — Host long-presses like any Player | Inter-Round Assignment |
| Match Debate | Host advances to Match | "Call Vote" button (primary action) | Match View — Debate |
| Voting Open | Host calls Vote | Vote count indicator (N of M voted); no other controls | Match View — Voting |
| All Voted — Clear Winner | All Players voted | "Next Match →" or "Next Round →" button | Match Result |
| All Voted — Tied | All voted, 2-2 tie | "Flip Coin" button (primary action) | Tied Result |
| Coin Flip (passive) | Host taps Flip | No controls during animation | Coin Flip |
| Coin Result | Flip resolves | "Next Match →" or "Next Round →" button | Match Result |
| Round Complete | Last Match resolved | "Start Round N →" button | Round Complete interstitial |
| Champion (passive) | Final Match resolved | "Reveal Assignments →" button | Champion Screen |
| Post-Game Reveal (passive) | Host triggers reveal | No further controls | Post-Game Reveal |

---

## 3. User Flow (Host Actions Only)

```
Host creates Room
    │
    ▼
SESSION CONFIG (in Lobby)
  Set bracket size (8/16/32; default 16)
  Set items owned per player (1–6)
  [Players join while Host configures]
    │  Host taps "Generate Pool"
    ▼
POOL GENERATION
  [Progress visible; Host waits]
    │  Generation complete
    ▼
POOL CURATION
  Host selects N items from pool of ~1.5N
    ├── Partial regen: select subset → enter Boost Keyword → "Get more" → new items appear
    ├── Manual add: type item name → added to pool (up to 3)
    └── Edit: tap item → edit title or blurb inline
    │  Host taps "Approve Pool" (N items selected)
    ▼
  [No Pool Reveal — pool contents are not disclosed. Game proceeds directly to Round 1.]
    │  Host approves pool
    ▼
─── ROUND LOOP (Rounds 1 through N) ───────────────────────────────

INTER-ROUND ASSIGNMENT (Host is a Player here)
  [Host long-presses their own Assignment card to reveal — counts as confirmation]
  [No "Start Round →" button until every Player's checkmark is filled on Board]
    │  All Players confirmed → "Start Round →" appears → Host taps it
    ▼

─── MATCH LOOP (per Match in Round) ────────────────────────────────

MATCH DEBATE (Host is a Player here)
  [Host debates; Host Panel shows only "Call Vote" button]
    │  Host taps "Call Vote"
    ▼
VOTING OPEN (Host is also a Player voting)
  [Host casts vote on their Player View]
  [Host Panel shows vote count: "N of M voted"]
    │
    ├── All voted, clear winner ──► HOST SEES "Next Match →"
    │                                   │  Host taps
    │                                   └── (loop: next Match in Round)
    │
    ├── All voted, tied ──────────► HOST SEES "Flip Coin"
    │                                   │  Host taps (with confirmation)
    │                                   ▼
    │                              COIN FLIP (passive)
    │                                   │  Result
    │                              HOST SEES "Next Match →"
    │                                   │  Host taps
    │                                   └── (loop: next Match)
    │
    └── Round's last Match resolved ──► HOST SEES "Start Round N+1 →"
                                            │  Host taps
                                            └── (back to INTER-ROUND ASSIGNMENT)

─────────────────────────────────────────────────────────────────────

Final Match resolved
    │  Host sees "Reveal Assignments →"
    ▼
CHAMPION SCREEN (passive)
    │  Host taps "Reveal Assignments"
    ▼
POST-GAME REVEAL (passive)
  [No further Host controls]
```

---

## 4. States Per Panel Phase

### Session Config
- **Default** — Bracket size defaulted to 16; items-owned defaulted to 1 [ASSUMPTION]. Wild count shown dynamically as Host adjusts settings.
- **Invalid config** — Wild count goes negative (too many owned items for bracket size); warning shown; "Generate Pool" disabled until resolved.
- **Players joining** — Player list updates underneath while Host configures; Host can adjust settings while players join.

### Pool Generation
- **Generating** — Progress indicator (step labels preferred over spinner: "Searching…", "Checking Reddit…", "Fetching images…"). No Host controls available during generation except cancel [ASSUMPTION].
- **Error** — Generation failure shown with retry option.

### Pool Curation
- **Selecting** — Item grid shown. Selected items highlighted. Running count: "X of N selected."
- **Under-selected** — Approve button disabled until exactly the bracket-size count is selected.
- **Boost Keyword input** — Text field appears when Host taps "Get more items." Host types keyword, taps submit. New items load into pool.
- **Partial regen in progress** — New items loading; existing selection preserved.
- **Manual add** — Text field for item title; image falls back to typographic card. Up to 3 manual adds permitted.
- **Editing item** — Inline edit of title or blurb; no regeneration triggered.
- **Ready to approve** — Exactly N items selected; Approve button enabled and visually prominent.
- **Confirming approve** — [ASSUMPTION: brief confirmation ("Lock this list?") before pool is locked and revealed to all Players. Once locked, pool cannot be changed.]

### Pool Reveal
- **Removed.** Pool contents are not disclosed to players. After Host approves pool, the game transitions directly to Inter-Round Assignment for Round 1. The Host Panel has no pool reveal state.

### Inter-Round Assignment
- Host long-presses their own Assignment card (Player View interaction) — same as any Player.
- No Host Panel controls until every Player has confirmed their reveal (long-pressed their card at least once).
- **Hard gate:** "Start Round →" button appears in Host Panel only after all Player confirmations are received. This is not bypassed — if one Player hasn't confirmed, the button does not appear.
- Host taps "Start Round →" to begin the first Match of the Round.

### Match Debate
- **Active** — Single prominent control: "Call Vote." No other controls.
- Host debates freely as a Player.
- "Call Vote" is the only button visible — reduces cognitive load. Cannot be triggered accidentally with one button.

### Voting Open
- **Voting in progress** — Vote count shown: "3 of 4 voted." Host Panel shows this count; no other controls.
- Host's own vote buttons are on the Player View below the Host Panel — must not be obscured.
- Host votes freely like any Player — no special nudge or condition when Host is last to vote.
- **All voted** — Panel transitions to result controls.

### All Voted — Clear Winner
- "Next Match →" button (or "Next Round →" if last match in round) appears.
- No confirmation needed to advance.

### All Voted — Tied
- "Flip Coin" button appears as primary action.
- **Confirmation required:** A mis-tap on Coin Flip in front of the group is awkward. [ASSUMPTION: "Flip Coin" requires a confirmation step — e.g. tap to arm, tap again to flip — or a hold-to-confirm interaction to prevent accidental trigger.]

### Coin Flip (Passive)
- Coin animation plays on all surfaces. No Host controls during animation.
- Result appears; Host then sees "Next Match →" or "Next Round →."

### Champion
- "Reveal Assignments →" button. No other controls.
- [ASSUMPTION: brief pause here — Host can say something to the room before triggering the reveal.]

### Post-Game Reveal (Passive)
- No controls. Table is shown. Session is over.
- [ASSUMPTION: "New Game" or "Back to Lobby" button at the end of the reveal — to be designed.]

---

## 5. Interaction Specs

### Pool Curation Flow

**Selecting items:**
- Host sees the full Pool (e.g. 25 items for a 16-bracket) as a scrollable grid or list.
- Tap an item to select (highlighted); tap again to deselect.
- Running counter visible: "12 of 16 selected."
- Approve button disabled until count reaches exactly the Bracket size.

**Partial regeneration:**
1. Host selects some items (e.g. 10 of 16).
2. Taps "Get more items" — a Boost Keyword input appears.
3. Host types a narrowing keyword (e.g. "90s only") — optional, can be left blank for generic refill.
4. Taps "Generate" — server fetches additional items matching the keyword + existing context.
5. New items appear in the pool alongside existing ones (append, not replace).
6. Previously selected items remain selected.
7. Host can repeat up to 3 times per session [per PRD].

**Manual add:**
1. Host taps "+ Add your own."
2. Text field appears; Host types item title.
3. Item is added to pool with a typographic card (no image).
4. Blurb can optionally be added inline.
5. Up to 3 manual items permitted [per PRD].

**Approving:**
- Host taps "Approve Pool" when N items are selected.
- [ASSUMPTION: Confirmation dialog: "Lock this list of 16 items? This cannot be changed." Confirm / Cancel.]
- On confirm: Pool is locked server-side; Pool Reveal triggers for all Players simultaneously.

---

### Call Vote

**Trigger context:**
- "Call Vote" appears only during Match Debate phase — never during other phases.
- It is the single control shown; no other distractions.

**On tap:**
- Immediate: all Player Views (including Host's own) transition to Voting phase — vote buttons appear.
- Host Panel transitions to Voting Open state (shows vote count).
- No confirmation needed — calling vote early is a Host judgement call.

**Can Host un-call vote?**
- [OPEN QUESTION: can the Host cancel a vote once called (e.g. a Player raises a new argument)? Not specified in PRD. Recommend: No — once called, vote proceeds. Reduces complexity and prevents manipulation. Flag for decision.]

---

### Coin Flip

**Trigger context:**
- "Flip Coin" appears only in Tied Result state — never at other times.
- Tied state is visually clear (equal tally, tie label) so Host knows when to use it.

**Accidental trigger prevention:**
- [ASSUMPTION: Coin Flip requires a hold-to-confirm interaction (press and hold for ~1 second) rather than a single tap. This prevents mis-taps and makes the trigger feel intentional.]
- Alternative: two-tap confirm (tap → arm state → tap again to flip).

**On trigger:**
- Coin flip animation plays on Board and all Player Views simultaneously.
- Result rendered: "HEADS — [Item A] advances" or "TAILS — [Item B] advances."
- Host Panel shows "Next Match →" after result.

---

### Next Match / Round Advance

**Next Match:**
- Tap → server advances to next Match in current Round → Match Reveal on all surfaces.
- No confirmation needed.

**Next Round (last match in a Round):**
- Tap → server triggers new Draw + Assignment update → Inter-Round Assignment phase on all surfaces.
- Host is returned to passive state (long-press their own card like any Player).

**Round transition — who triggers start?**
- [ASSUMPTION: after all Players have confirmed their Assignment (all checkmarks filled on Board), the "Start Round →" button appears in Host Panel. Host taps it to begin first Match.]
- This gives the Host control over pacing and ensures everyone is ready before the first Match starts.

---

### Dual-Role Order of Operations (Voting Phase)

This is the most critical UX tension: the Host must call Vote and also cast a vote.

**Resolved model:**
1. Host is debating as a Player (Player View shows match cards).
2. Host taps "Call Vote" in Host Panel → all devices switch to voting phase, including the Host's own Player View.
3. Host's Player View now shows vote buttons. Host Panel shows vote count.
4. **Host votes on their Player View** (their vote buttons are not obscured by Host Panel).
5. When all Players (including Host) have voted:
   - If clear winner: Host Panel shows "Next Match →."
   - If tied: Host Panel shows "Flip Coin."

**Critical constraint:** The Host Panel overlay must not cover the vote buttons during the voting phase. The overlay must reposition, collapse, or use a layout that keeps both Host Panel controls and Player View vote buttons simultaneously accessible.

---

## 6. Accessibility Concerns

### Dual-Role Cognitive Load
- The Host is managing two concurrent mental models (Player + Controller) on a single phone screen.
- **Mitigation required:** The Host Panel and Player View must have clear visual separation. Controller actions (Call Vote, Flip Coin, Next Match) must be visually distinct from Player actions (vote buttons, long-press card). Mixing them risks accidental triggers.
- Phase clarity matters: the Host Panel must make it immediately obvious which "mode" the Host is in — are they acting as Player right now, or as Controller?

### Vote Button Occlusion (Critical)
- If the Host Panel is a bottom sheet or sticky footer, it may cover the vote buttons during the voting phase.
- **Required:** During voting, the Host's own vote buttons must be fully visible and tappable. The Host Panel in voting phase should show only the vote count (small, non-intrusive) and move out of the way of the buttons. This must be validated on small phone screens (375px width, 667px height).

### Coin Flip — Accidental Trigger Prevention
- "Flip Coin" appears only in a tie — a rare, high-visibility moment. A mis-tap would be disruptive and visible to the whole room.
- The hold-to-confirm or two-tap confirm model is strongly recommended over a single tap.
- The button must have sufficient spacing from "Next Match" to prevent fat-finger errors.

### Approve Pool — Irreversibility
- Approving the Pool is irreversible. The confirmation dialog must clearly state this.
- After approval, the Pool Curation controls must disappear and not be accessible — no "undo" path.

### Host's Own Assignment Card
- The Host long-presses their Assignment card in the Inter-Round Assignment phase, same as other Players.
- The Host Panel must be passive (no controls shown) during this phase so the Host can long-press without accidentally triggering a Host Panel control.

### Footgun: Host Running Board on Same Device
- If the Host opens both `/room/{code}/board` (Board view) and `/room/{code}` (Player View) on the same phone (two tabs), switching between tabs during the match is a footgun — they may lose the voting phase or miss the Call Vote moment.
- **Flag:** The recommended setup (Board on laptop, Player View on phone) should be clearly communicated at session start. The app cannot enforce it, but onboarding should guide the Host toward the dual-device setup.
- [ASSUMPTION: a first-run tooltip or setup guide for the Host at Room creation explains the dual-device model.]

### Touch Target Separation
- The three most-used Host Panel controls — "Call Vote," "Next Match," and "Flip Coin" — should never appear simultaneously. They are phase-gated. This eliminates the risk of tapping the wrong one.
- Each control should be a full-width button (or near-full-width) to maximise target size and minimise miss-taps.
