import { randomBytes } from 'crypto'
import type { RoomState, RoomConfig } from '@/types/room.types'

// Store on process (immune to Next.js webpack module isolation in dev mode)
type ProcessWithStore = NodeJS.Process & {
  __rooms?: Map<string, RoomState>
  __roomSweepInterval?: ReturnType<typeof setInterval>
}

const ROOM_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours
const SWEEP_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

function getRooms(): Map<string, RoomState> {
  const p = process as ProcessWithStore
  if (!p.__rooms) p.__rooms = new Map()
  return p.__rooms
}

/** Start periodic room cleanup — call once from server init. Safe to call multiple times. */
export function startRoomSweep(): void {
  const p = process as ProcessWithStore
  if (p.__roomSweepInterval) return // already running
  p.__roomSweepInterval = setInterval(() => {
    const now = Date.now()
    const rooms = getRooms()
    for (const [id, room] of rooms) {
      if (now - room.createdAt > ROOM_TTL_MS) {
        rooms.delete(id)
        console.log(`[room-store] swept expired room ${room.roomCode} (${id})`)
      }
    }
  }, SWEEP_INTERVAL_MS)
}

// Room code: 4 numeric digits (e.g. "1234")
function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function generateUniqueRoomCode(): string {
  let code = generateRoomCode()
  while (getRoomByCode(code) !== undefined) {
    code = generateRoomCode()
  }
  return code
}

// Reclaim code: 2 letters then 2 digits (e.g. "dg78") — easy to read aloud, no ambiguous chars
const RECLAIM_LETTERS = 'abcdefghjkmnpqrstuvwxyz'
const RECLAIM_DIGITS = '23456789'

function generateReclaimCode(): string {
  const l1 = RECLAIM_LETTERS[Math.floor(Math.random() * RECLAIM_LETTERS.length)]
  const l2 = RECLAIM_LETTERS[Math.floor(Math.random() * RECLAIM_LETTERS.length)]
  const d1 = RECLAIM_DIGITS[Math.floor(Math.random() * RECLAIM_DIGITS.length)]
  const d2 = RECLAIM_DIGITS[Math.floor(Math.random() * RECLAIM_DIGITS.length)]
  return `${l1}${l2}${d1}${d2}`
}

export function createRoom(config: RoomConfig): RoomState {
  const roomId = randomBytes(16).toString('hex')
  const roomCode = generateUniqueRoomCode()
  const reclaimCode = generateReclaimCode()

  const room: RoomState = {
    roomId,
    roomCode,
    hostId: '', // set by create API after player record created
    hostToken: '', // set by create API
    reclaimCode,
    topic: '',
    status: 'lobby',
    bracketSize: config.bracketSize,
    players: new Map(),
    pool: [],
    lockedItems: [],
    survivingItems: [],
    currentMatches: [],
    matchHistory: [],
    assignmentHistory: [],
    currentRound: 0,
    currentMatchIndex: 0,
    disconnectedPlayers: new Map(),
    champion: null,
    createdAt: Date.now(),
  }

  getRooms().set(roomId, room)
  return room
}

export function getRoom(roomId: string): RoomState | undefined {
  return getRooms().get(roomId)
}

// O(n) scan — fine for MVP (max ~10 active rooms)
export function getRoomByCode(roomCode: string): RoomState | undefined {
  for (const room of getRooms().values()) {
    if (room.roomCode === roomCode) return room
  }
  return undefined
}

// For nested Map mutations (e.g. players.set(...)), callers mutate the live object
// returned by getRoom directly — Map is a reference type so no updateRoom call needed.
// This is the Redis swap boundary per D-04: only this file changes if Redis is added.
export function updateRoom(roomId: string, patch: Partial<RoomState>): void {
  const room = getRooms().get(roomId)
  if (!room) throw new Error(`Room not found: ${roomId}`)
  Object.assign(room, patch)
}

export function deleteRoom(roomId: string): void {
  getRooms().delete(roomId)
}
