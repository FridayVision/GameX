import { randomUUID } from 'crypto'
import type { Item } from '@/types/item.types'
import type { Match } from '@/types/match.types'
import type { AssignmentRecord } from '@/types/assignment.types'
import type { RoomState } from '@/types/room.types'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function drawRound(survivingItems: Item[], roundIndex: number): Match[] {
  const shuffled = shuffle(survivingItems)
  const matches: Match[] = []

  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      matchId: randomUUID(),
      roundIndex,
      matchIndex: i / 2,
      itemA: shuffled[i],
      itemB: shuffled[i + 1],
      votes: {},
      winner: null,
      tiebroken: false,
      phase: 'pending',
    })
  }

  return matches
}

// Returns AssignmentRecord[]. Caller must:
//   1. Append records to room.assignmentHistory
//   2. Update each player's lastAssignedItemId
export function runAssignment(room: RoomState, roundIndex: number): AssignmentRecord[] {
  const { players, survivingItems } = room
  const records: AssignmentRecord[] = []
  const assignedThisRound = new Set<string>()

  // Pass 1: sticky — keep existing assignment if item still survives
  const needsAssignment: string[] = []

  for (const [playerId, player] of players) {
    if (player.status === 'removed') continue

    const isSticky =
      player.lastAssignedItemId !== null &&
      survivingItems.some((item) => item.itemId === player.lastAssignedItemId)

    if (isSticky) {
      assignedThisRound.add(player.lastAssignedItemId!)
      records.push({ playerId, roundIndex, itemId: player.lastAssignedItemId! })
    } else {
      needsAssignment.push(playerId)
    }
  }

  // Pass 2: deal from unassigned survivors; wrap-around if exhausted
  const unassigned = shuffle(survivingItems.filter((item) => !assignedThisRound.has(item.itemId)))
  const wrapPool = shuffle([...survivingItems])
  let wrapIndex = 0

  for (const playerId of needsAssignment) {
    let itemId: string
    if (unassigned.length > 0) {
      itemId = unassigned.shift()!.itemId
    } else {
      // Multiple players may share the same assignment — intentional per PRD FR-11
      itemId = wrapPool[wrapIndex % wrapPool.length].itemId
      wrapIndex++
    }
    records.push({ playerId, roundIndex, itemId })
  }

  return records
}
