# Addendum — Debate Bracket PRD

Overflow from the PRD: screen layout references, deferred-option rationale, and implementation notes that belong downstream (architecture, UX spec) rather than in the PRD itself.

---

## Screen Layout References

These are reference mockups from the design session — not wireframes. Layout and copy will be refined in UX.

### Board (TV / Laptop)

**Lobby**
```
┌─────────────────────────────────────────┐
│         DEBATE BRACKET                  │
│         Room Code:  X7K2               │
│                                         │
│    ● Raahul      ● Divya               │
│    ● Karthik     ● Priya               │
│                                         │
│    Waiting for host to start...         │
└─────────────────────────────────────────┘
```

**Round Assignment Phase (inter-round)**
```
┌─────────────────────────────────────────┐
│         ROUND 2 OF 4                   │
│    Players — check your assignments     │
│                                         │
│    ● Raahul  ✓   ● Divya  ✓           │
│    ● Karthik …   ● Priya  ✓           │
└─────────────────────────────────────────┘
```
Checkmarks appear as each Player reveals their Assignment card on their phone.

**Match View — Debate Phase**
```
┌──────────────────────────────────────────────┐
│  ROUND 2 OF 4  ·  Match 2 of 8   [DEBATE]   │
│                                              │
│  ┌──────────────┐    VS    ┌──────────────┐  │
│  │  [POSTER]    │          │  [POSTER]    │  │
│  │  Anbe Sivam  │          │  Vikram      │  │
│  │  2003        │          │  2022        │  │
│  │  blurb…      │          │  blurb…      │  │
│  └──────────────┘          └──────────────┘  │
│                                              │
│  ● Raahul  ● Divya  ● Karthik  ● Priya      │
└──────────────────────────────────────────────┘
```

**Match View — Voting Phase**
```
┌──────────────────────────────────────────────┐
│  ROUND 2 OF 4  ·  Match 2 of 8   [VOTING]   │
│                                              │
│  ┌──────────────┐    VS    ┌──────────────┐  │
│  │  Anbe Sivam  │          │  Vikram      │  │
│  └──────────────┘          └──────────────┘  │
│                                              │
│    ● Raahul  ● Priya          ● Karthik      │
│    (Divya hasn't voted yet…)                 │
└──────────────────────────────────────────────┘
```
Votes accumulate under Items as Players cast; shown by Player colour, not name.

**Champion Screen**
```
┌─────────────────────────────────────────┐
│           🏆  CHAMPION                  │
│           [LARGE POSTER]                │
│           Anbe Sivam                    │
│                                         │
│  R1 → R2 → Semi → Final               │
└─────────────────────────────────────────┘
```

**Post-Game Reveal**
```
┌────────────────────────────────────────────┐
│  WHO DEFENDED WHAT                         │
│                                            │
│           R1        R2     Semi   Final    │
│  Raahul   Vikram    Anbe   Anbe   Anbe    │
│  Divya    Anbe      Vikram Vikram Vikram  │
│  Karthik  Mersal    Anbe   Anbe   Anbe   │
│  Priya    Anbe      Anbe   Anbe   Anbe   │
│                                            │
└────────────────────────────────────────────┘
```

---

### Player View (Phone)

**Assignment Card — face down (inter-round)**
```
┌─────────────────────┐
│   ROUND 2 OF 4      │
│                     │
│  ┌───────────────┐  │
│  │   ▓▓▓▓▓▓▓    │  │  ← blurred / face-down
│  │   ▓▓▓▓▓▓▓    │  │
│  │  Hold to see  │  │
│  │  your pick    │  │
│  └───────────────┘  │
└─────────────────────┘
```

**Assignment Card — revealed on long-press**
```
┌─────────────────────┐
│   ROUND 2 OF 4      │
│                     │
│  ┌───────────────┐  │
│  │   [POSTER]    │  │
│  │               │  │
│  │  You are      │  │
│  │  defending:   │  │
│  │               │  │
│  │  Anbe Sivam   │  │
│  └───────────────┘  │
└─────────────────────┘
```
Obscures immediately on release.

**Match View — Debate Phase**
```
┌─────────────────────┐
│  DEBATE             │
│  Round 2 · Match 2  │
│                     │
│  [poster] Anbe      │
│           Sivam     │
│       VS            │
│  [poster] Vikram    │
│                     │
│  Waiting for host…  │
└─────────────────────┘
```

**Match View — Voting Phase**
```
┌─────────────────────┐
│  VOTE NOW           │
│  Round 2 · Match 2  │
│                     │
│  ┌─────────────┐    │
│  │  Anbe Sivam │    │
│  └─────────────┘    │
│                     │
│  ┌─────────────┐    │
│  │   Vikram    │    │
│  └─────────────┘    │
│                     │
│  ●● vs ●            │
│  Divya hasn't voted │
└─────────────────────┘
```
Vote buttons lock immediately on tap; no undo.

---

### Host Panel (Overlay on Player View)

**Pool Phase**
```
│ ─────────────────── │
│  HOST PANEL         │
│  [Approve Pool]     │
│  [Regen 3 more ▼]  │
│  [+ Add manual]     │
```

**Debate Phase**
```
│ ─────────────────── │
│  HOST PANEL         │
│  [Call Vote  →]     │
```

**Voting — result clear**
```
│ ─────────────────── │
│  HOST PANEL         │
│  [Next Match  →]    │
```

**Voting — tied**
```
│ ─────────────────── │
│  HOST PANEL         │
│  [🪙  Flip Coin]    │
```

---

## Deferred Option Rationale

**Scoring (v2+):** Points were considered (progression bonuses, correct side-quest guesses) but cut. The game is more fun without them for a first session. The Post-Game Reveal table provides enough resolution for the social debrief.

