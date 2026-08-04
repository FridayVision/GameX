export type PlayerStatus = 'connected' | 'grace' | 'timedout' | 'removed'
export type PlayerColour = string

export interface PlayerState {
  playerId: string
  displayName: string
  colour: PlayerColour
  isHost: boolean
  status: PlayerStatus
  socketId: string | null
  lastAssignedItemId: string | null
  playerToken: string
}

export interface PlayerPublicState {
  playerId: string
  displayName: string
  colour: PlayerColour
  isHost: boolean
  status: PlayerStatus
}

export interface DisconnectedPlayer {
  playerId: string
  disconnectedAt: number
  graceExpiresAt: number
}
