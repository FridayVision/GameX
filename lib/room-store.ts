import { randomBytes } from 'crypto'
import type { RoomState, RoomConfig } from '@/types/room.types'

// Store on process (immune to Next.js webpack module isolation in dev mode)
type ProcessWithRooms = NodeJS.Process & { __rooms?: Map<string, RoomState> }

function getRooms(): Map<string, RoomState> {
  const p = process as ProcessWithRooms
  if (!p.__rooms) p.__rooms = new Map()
  return p.__rooms
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

// Reclaim code: 4 alphanumeric chars (e.g. "ab99") — lowercase + digits, no ambiguous chars
const RECLAIM_CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

function generateReclaimCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += RECLAIM_CODE_CHARS[Math.floor(Math.random() * RECLAIM_CODE_CHARS.length)]
  }
  return code
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
