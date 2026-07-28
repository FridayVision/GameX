# UX Micro Doc — Player View Surface
GameX · 2026-07-28 · Status: draft

> **Scope:** Structured UX artifact only. No visual style (colours, typography, spacing) — those belong in DESIGN.md, not yet created.

---

## 1. Surface Overview

The Player View is the personal browser view each Player opens on their own phone (`/room/{code}`). It handles everything that is private to the individual: joining the Room, waiting in the Lobby, seeing the Pool of Items, discovering their secret Assignment via Long-Press Reveal, voting, and viewing the Post-Game Reveal. Unlike the Board, the Player View renders secret state — each Player's socket connection receives only their own Assignment payload. The Host also uses this view; their device additionally shows the Host Panel overlay (documented in `ux-host-panel.md`). The Player View must work on a mobile browser with one hand, in a group setting where others may occasionally glance at the screen.

---

## 2. Screen Inventory

| Screen | Entry trigger | Primary content | Exit trigger |
|---|---|---|---|
| Join | Player opens Room URL | Room code field, name field, colour picker | Player submits valid name + colour |
| Lobby | Successful join | Connected Players list, room code, waiting state | Host starts session |
| ~~Pool Reveal~~ | ~~removed~~ | ~~Pool not disclosed; game proceeds directly to inter-round assignment~~ | ~~n/a~~ |
| Inter-Round Assignment | Round N begins | Face-down Assignment card with long-press affordance | Player confirms (reveals card) AND Host starts Round |
| Match View — Debate | Round starts / Host advances match | Item A and Item B shown, debate phase label | Host calls Vote |
| Match View — Voting | Host calls Vote | Two large vote buttons (Item A / Item B) + live tally | Player votes (locked) |
| Match View — Voted | Player has voted | Locked vote confirmation + live tally updating | All Players voted |
| Match Result | All voted | Winner highlighted, loser dimmed, brief result state | Host advances |
| Tied Result | All voted, 2-2 | Tie indicator, waiting for coin flip | Coin flip result received |
| Champion Screen | Final Match resolved | Winning Item (large), Wild label if applicable | Host triggers Post-Game Reveal |
| Post-Game Reveal | Host triggers reveal | Assignment history table | Session ends |
| Error / Reconnect | Socket disconnect | "Reconnecting…" overlay | Socket reconnects; state resumes |

---

## 3. User Flow

```
Player opens /room/{code}
    │
    ▼
JOIN SCREEN
  [Enter name, pick colour]
    │
    ├── Duplicate name ──► Inline error; re-enter name
    │
    ▼
LOBBY
  [See other Players join; wait for Host]
    │
    ▼  ← Host approves pool (no reveal — pool contents stay hidden)
INTER-ROUND ASSIGNMENT  ← Repeats each Round (Round 1 begins immediately after pool approval)
  [Face-down card; long-press to reveal Assignment]
  [Card auto-dismisses when Round's first Match begins]
    │
    ▼
MATCH VIEW — DEBATE
  [Item A vs Item B; "Waiting for host to call vote…"]
    │  (Host calls Vote)
    ▼
MATCH VIEW — VOTING
  [Two vote buttons: Item A / Item B]
    │  (Player taps a button)
    ▼
MATCH VIEW — VOTED (locked)
  [Player's choice locked; live tally updates as others vote]
    │
    ├── All voted, clear winner ──► MATCH RESULT
    │                                   │
    │                             [Host: Next Match or Round]
    │                                   │
    │                           ┌───────┴────────┐
    │                      Next Match        Round ends
    │                           │                │
    │                    (back to           INTER-ROUND ASSIGNMENT
    │                   MATCH DEBATE)
    │
    └── All voted, tied ──────► TIED RESULT
                                    │
                              [Coin flip on Board / all devices]
                                    │
                              MATCH RESULT (coin winner)
                                    │
                              [continue as above]

Final Match resolved
    │
    ▼
CHAMPION SCREEN
    │  (Host triggers reveal)
    ▼
POST-GAME REVEAL
  [Assignment history table]
```

---

## 4. States Per Screen

### Join
- **Default** — Name field empty, colour picker showing available colours, submit disabled.
- **Name entered** — Submit enabled.
- **Colour conflict** — [ASSUMPTION: if another Player already chose a colour, it is shown as unavailable.]
- **Duplicate name error** — Inline error message under name field; field highlighted; submit disabled until name changes.
- **Submitting** — Brief loading state while server processes join.

### Lobby
- **Waiting** — Player list shows all connected Players with colours. Room code visible for sharing. "Waiting for [Host name] to start" label.
- **Player joins** — New Player appears in list with colour.
- **Player disconnects** — Player dims in list; rejoining re-activates.
- **Host starting** — Transition animation to Pool Generation / Pool Reveal.

### Pool Reveal
- **Removed.** Pool contents are not disclosed to players. After the Host approves the pool, the Player View transitions directly to the Inter-Round Assignment screen. Players discover items only through their assignment card and through watching matches play out.

### Inter-Round Assignment
- **Default (card face-down)** — Assignment card shown blurred/obscured. Affordance text: "Hold to see your assignment." Round N of M label.
- **Pressing (threshold not yet met)** — Visual feedback that press is registered (e.g. card edge lifts or press indicator appears).
- **Revealed (holding)** — Card shows: "You are defending: [Title] (Round N of M)" + item image if available.
- **Released** — Card immediately re-obscures. Player may press again. [ASSUMPTION: unlimited re-reveals until round starts.]
- **Confirmed** — After the Player long-presses and reveals their card for the first time, their status updates to "confirmed" on the Board (checkmark). The card remains accessible — Player can re-reveal it until the Match begins.
- **Gate:** The Host cannot start the Round until every Player has confirmed. The Board shows this in real time.
- **Expired** — Card auto-dismisses when Round's first Match begins. If a Player has not confirmed by this point, the round starts anyway once all others have confirmed and the Host taps Start. [ASSUMPTION: no second chance after match starts.]

### Match View — Debate
- **Active** — Item A and Item B shown as cards (image, title, blurb). Phase label: "DEBATE." Status: "Waiting for host to call vote…"
- **Player disconnected** — Reconnect overlay. Match continues on server.

### Match View — Voting
- **Open** — Two large vote buttons, one per Item. Item names shown on buttons. Live tally area visible (initially empty or showing others' votes).
- **Others voting** — Tally updates as other Players vote. Player's own buttons remain active.

### Match View — Voted
- **Locked** — Player's chosen button shows locked/confirmed state. The unchosen button is dimmed. Live tally continues updating.
- **Waiting for others** — Subtle indicator of remaining unvoted Players. [ASSUMPTION: "Waiting for N more players…" label.]
- **All voted** — Winning side highlighted. Losing side dimmed. Result visible.

### Tied Result
- **Tied** — Both sides equal. "It's a tie!" label. "Waiting for coin flip…" — Player cannot act; Host resolves.

### Champion Screen
- **Standard** — Winning Item card (large): image, title. Path: R1 → R2 → … → Final.
- **Wild champion** — Same layout with explicit label: "Wild — no one owned this item."

### Post-Game Reveal
- **Revealing** — Assignment history table animates in [ASSUMPTION: row by row].
- **Complete** — Full table shown. Player's own row [ASSUMPTION: visually distinguished — flag for decision]. Wilds labelled.
- **Session end** — [ASSUMPTION: no auto-reset; remains on this screen until browser is closed or new Room is created.]

### Error / Reconnect
- **Disconnected** — "Reconnecting…" overlay. All interactive elements disabled.
- **Reconnected** — Overlay dismisses; Player View resumes at correct phase.

---

## 5. Interaction Specs

### Long-Press Reveal (Critical Interaction)

This is the primary secret-delivery mechanism and the most novel interaction in the app. It must feel deliberate, not accidental.

**Gesture mechanics:**
- **Press threshold:** 400–500ms. Below this = short tap (no reveal). At or above = reveal triggers.
- **Short tap (< threshold):** No reveal. Brief visual pulse on card acknowledges tap and signals "hold longer."
- **Long press (≥ threshold):** Card reveals at threshold crossing. Player does not need to keep holding — card stays revealed after trigger.

**Revealed state behaviour:**
- Card remains revealed after the long-press trigger fires. Player is free to read without holding.
- **Close:** Player taps the card to dismiss it manually.
- **Auto-close:** Card fades out automatically after 30 seconds if the Player does not tap to close.
- No "hold to keep open" mechanic — once revealed, it stays up.

**Reveal transition:**
- [ASSUMPTION: card flips (CSS 3D flip) or cross-fades from obscured to revealed state over ~150ms. To be decided at DESIGN.md phase.]
- Revealed state shows: item image (top), "You are defending:" label, item title (large), round context "(Round N of M)" (smaller).

**Re-reveal:**
- Player may long-press again after closing (manually or auto) to re-reveal, as many times as they wish until the Round's first Match begins.
- No limit on re-reveals before Match start.

**Expiry:**
- Card auto-dismisses when the Round's first Match begins (on `match-start` event).
- [ASSUMPTION: if a Player has not yet revealed their Assignment when the Match begins, the card is gone — no second chance. Flag for decision.]

**Discoverability affordance:**
- Required: visible affordance text ("Hold to reveal") AND a visual press-feedback ring that fills toward the threshold.
- Pulsing affordance disappears after first successful reveal.

**Accessibility alternative:**
- Long-press may trigger system context menu on some Android devices. Implementation must suppress default behaviour (`user-select: none`, `touch-action: none`, `contextmenu` event prevention).
- **Required secondary path:** A dedicated "Reveal" button below the card — tap once → card reveals and stays up → player taps card or button again to close (or 30s auto-close applies). Consistent with primary mechanic's stay-up behaviour.

---

### Live Vote Display

**Before voting:**
- Two large vote buttons visible, clearly labelled with Item names (not just A/B).
- Live tally from other Players already visible if they voted first (dots or counts accumulating).
- [ASSUMPTION: Player can see others' votes in real-time as they appear, before casting their own.]

**On tap:**
- Vote button immediately transitions to a "locked" visual state (filled/confirmed appearance).
- The unchosen button dims and becomes non-interactive.
- No undo. No confirmation step. [Per PRD: "Vote buttons lock immediately on tap; no undo." 3-second undo window from original design doc is excluded.]

**While waiting for others:**
- Locked state persists. Live tally continues updating as other votes arrive.
- "Waiting for N more players" label or equivalent.

**All voted:**
- Winning side highlighted. Losing side dimmed.
- Player's own vote position is visible in the tally — they can see their vote counted.

**Tied:**
- Equal tally shown. Tie label. "Host is deciding…" or equivalent. Player cannot act.

---

### Post-Game Reveal

**Entry:**
- Triggered by Host action (`postgame-reveal` event) after Champion screen.
- Player View transitions from Champion screen to Post-Game Reveal.

**Table structure:**
- Rows: each Player (including Host).
- Columns: Starting Assignment + Round 1, Round 2, … Round N.
- Each cell: Item title (short form) or "—" if not applicable (fewer rounds for early-eliminated items).
- Wild Items: labelled "Wild" or with an indicator in the Starting Assignment column.

**Player's own row:**
- [ASSUMPTION: the current Player's own row is visually highlighted (e.g. bold or coloured background) for easy self-location in the table. Low-priority design decision.]

**Re-assignments:**
- Re-assigned items are displayed the same as starting assignments in v1. No visual distinction.

**Animation:**
- All rows revealed at once — no sequential row-by-row animation.

---

## 6. Accessibility Concerns

### Touch Target Sizes
- Vote buttons are the most critical interactive elements. Must meet minimum touch target size (44×44pt per Apple HIG / 48×48dp per Material). Given the vote is the highest-stakes tap in the app, buttons should be significantly larger.
- The Assignment card (long-press target) must also be large — full-width or near-full-width of the screen to avoid edge-press issues.

### Long-Press Discoverability
- Long-press is not universally intuitive, especially for first-time users. Without an affordance, many users will tap and get nothing.
- **Required:** "Hold to reveal" text + a visual press-feedback ring that shows the threshold being approached. This is non-optional.
- Android note: long-press may trigger text-selection or browser context menu on some devices. The implementation must suppress default long-press browser behaviour (`user-select: none`, `touch-action: none` on the card element, `contextmenu` event prevention).

### Colour-Coded Voting — Accessibility Gap (High Priority)
- Vote tally shows Player colour + Player name. Colour is not the sole differentiator.
- Implementation: each vote dot carries the Player's name (or abbreviated name) alongside the colour. Must match Board's display — resolve as one consistent system.

### One-Handed Use
- Players are holding their phone in one hand, possibly eating or gesturing with the other. All primary interactions (vote buttons, long-press card) must be reachable without repositioning the phone.
- Vote buttons: bottom half of screen preferred.
- Assignment card: centre or bottom-centre placement preferred.
- Host Panel (on Host's device): must not require reaching the top of the screen for the most frequent action (Call Vote).

### Information Density on Small Screens
- The voting screen must show: phase label, item names on buttons, live tally, and waiting indicator — all on a phone screen. Tally should not crowd the vote buttons.
- During debate, Item A and Item B cards must be readable (image + title + blurb) on a 375px-wide screen.

### Dark Mode Consistency
- If the Board uses dark mode (per PRD), the Player View should match — a different theme on phone vs. TV would be jarring in a co-located session.
- Dark mode on phone also reduces screen glare in a dim room (movie night scenario).

### Reduced Motion
- Long-press reveal card flip, vote button lock animation, and post-game reveal row animation must all respect `prefers-reduced-motion`. Provide instant state changes as fallback.
