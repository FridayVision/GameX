import { randomBytes } from 'crypto'
import { getRoom } from './room-store'
import type { PlayerState, PlayerPublicState } from '@/types/player.types'

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function validateHostToken(roomId: string, token: string): boolean {
  const room = getRoom(roomId)
  return room !== undefined && room.hostToken === token && token.length > 0
}

export function validatePlayerToken(roomId: string, playerId: string, token: string): boolean {
  const room = getRoom(roomId)
  if (!room) return false
  const player = room.players.get(playerId)
  return player !== undefined && player.playerToken === token && token.length > 0
}

export function findPlayerByToken(roomId: string, token: string): PlayerState | undefined {
  const room = getRoom(roomId)
  if (!room) return undefined
  for (const player of room.players.values()) {
    if (player.playerToken === token) return player
  }
  return undefined
}

export function toPublicState(player: PlayerState): PlayerPublicState {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    colour: player.colour,
    isHost: player.isHost,
    status: player.status,
  }
}
