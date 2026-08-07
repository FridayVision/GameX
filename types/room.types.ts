import type { PlayerState, DisconnectedPlayer } from './player.types'
import type { Item } from './item.types'
import type { Match, MatchRecord } from './match.types'
import type { AssignmentRecord } from './assignment.types'

export type RoomStatus = 'lobby' | 'poolgen' | 'poolreview' | 'active' | 'ended'
export type BracketSize = 8 | 16 | 32

export interface RoomConfig {
  bracketSize: BracketSize
}

export interface RoomState {
  roomId: string
  roomCode: string // 4 numeric digits, e.g. "1234"
  hostId: string // set by create API after first player record; empty string initially
  hostToken: string // validates HOST_* API calls; rotated on reclaim
  reclaimCode: string // 4 lowercase alphanumeric chars, e.g. "ab99"
  topic: string // debate topic set by host during pool generation
  status: RoomStatus
  bracketSize: BracketSize
  players: Map<string, PlayerState>
  pool: Item[]
  lockedItems: Item[]
  survivingItems: Item[]
  currentMatches: Match[]
  matchHistory: MatchRecord[]
  assignmentHistory: AssignmentRecord[]
  currentRound: number
  currentMatchIndex: number
  disconnectedPlayers: Map<string, DisconnectedPlayer>
  champion: Item | null
  createdAt: number // unix ms — used for TTL sweeps
}
