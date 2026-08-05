import type { Item } from './item.types'

export interface Match {
  matchId: string
  roundIndex: number
  matchIndex: number
  itemA: Item
  itemB: Item
  votes: Record<string, 'A' | 'B'> // playerId → choice
  winner: 'A' | 'B' | null
  tiebroken: boolean
  phase: 'pending' | 'debate' | 'voting' | 'result' | 'tied'
}

export interface MatchRecord {
  roundIndex: number
  matchIndex: number
  itemAId: string
  itemBId: string
  winnerId: string
  tiebroken: boolean
}

export interface MatchPublic {
  matchId: string
  matchIndex: number
  roundIndex: number
  totalMatches: number
  itemA: Item
  itemB: Item
  phase: 'pending' | 'debate' | 'voting' | 'result' | 'tied'
}
