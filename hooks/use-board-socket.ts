'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PlayerPublicState } from '@/types/player.types'
import type { Item } from '@/types/item.types'
import type { RoomStatus, BracketSize } from '@/types/room.types'
import type { MatchPublic as MatchPublicFull } from '@/types/match.types'
import { EVENTS } from '@/lib/socket-events'
import type { RevealRow } from './use-player-socket'

// Minimal match shape for the round-level match list (used in RoundStartScreen)
export interface MatchPublic {
  matchId: string
  matchIndex: number
  itemA: Item
  itemB: Item
}

export interface BoardSourceProgress {
  source: string
  status: 'fetching' | 'done' | 'error'
  count: number
  error?: string
}

export interface BoardRoomState {
  players: PlayerPublicState[]
  status: RoomStatus
  bracketSize: BracketSize | null
  roomCode: string
  topic: string
  poolProgress: BoardSourceProgress[]
  pool: Item[]
  poolReady: boolean
  roundIndex: number | null
  totalRounds: number | null
  roundMatches: MatchPublic[]
  confirmedPlayerIds: string[]
  // Match loop state
  currentMatch: MatchPublicFull | null
  votes: Array<{ colour: string; side: 'A' | 'B' }>
  matchPhase: MatchPublicFull['phase'] | null
  voteResult: { side: 'A' | 'B' | 'tie'; winnerItem: Item | null } | null
  coinFlipResult: { result: 'heads' | 'tails'; side: 'A' | 'B'; winnerItem: Item } | null
  interRound: boolean
  gameOver: boolean
  champion: Item | null
  gamePaused: boolean
  hostAbandoned: boolean
  roomReset: boolean
  // Post-game reveal
  revealVisible: boolean
  revealRows: RevealRow[] | null
  revealPath: Item[] | null
}

export type { RevealRow }

export function useBoardSocket(roomCode: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomState, setRoomState] = useState<BoardRoomState>({
    players: [],
    status: 'lobby',
    bracketSize: null,
    roomCode: roomCode ?? '',
    topic: '',
    poolProgress: [],
    pool: [],
    poolReady: false,
    roundIndex: null,
    totalRounds: null,
    roundMatches: [],
    confirmedPlayerIds: [],
    currentMatch: null,
    votes: [],
    matchPhase: null,
    voteResult: null,
    coinFlipResult: null,
    interRound: false,
    gameOver: false,
    champion: null,
    gamePaused: false,
    hostAbandoned: false,
    roomReset: false,
    revealVisible: false,
    revealRows: null,
    revealPath: null,
  })

  useEffect(() => {
    if (!roomCode) return
    const socket = io('/board', { auth: { roomCode } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on(EVENTS.PLAYER_JOINED, (data: Record<string, unknown>) => {
      setRoomState((prev) => ({
        ...prev,
        players: (data.players as PlayerPublicState[]) ?? prev.players,
        status: (data.status as RoomStatus) ?? prev.status,
        bracketSize: (data.bracketSize as BracketSize) ?? prev.bracketSize,
        roomCode: (data.roomCode as string) ?? prev.roomCode,
        topic: (data.topic as string) ?? prev.topic,
        roundIndex: 'roundIndex' in data ? (data.roundIndex as number) : prev.roundIndex,
        totalRounds: 'totalRounds' in data ? (data.totalRounds as number) : prev.totalRounds,
        roundMatches: (data.roundMatches as MatchPublic[]) ?? prev.roundMatches,
        confirmedPlayerIds: (data.confirmedPlayerIds as string[]) ?? prev.confirmedPlayerIds,
        gamePaused: 'gamePaused' in data ? (data.gamePaused as boolean) : prev.gamePaused,
        // currentMatch and votes come from reconnect payload
        currentMatch:
          'currentMatch' in data
            ? (data.currentMatch as MatchPublicFull | null)
            : prev.currentMatch,
        votes:
          'currentVotes' in data
            ? (data.currentVotes as Array<{ colour: string; side: 'A' | 'B' }>)
            : prev.votes,
        // Restore matchPhase from reconnected match
        matchPhase:
          'currentMatch' in data && data.currentMatch
            ? ((data.currentMatch as MatchPublicFull).phase as MatchPublicFull['phase'])
            : prev.matchPhase,
      }))
    })

    socket.on(EVENTS.PLAYER_LEFT, ({ playerId, status }: { playerId: string; status?: string }) => {
      setRoomState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.playerId === playerId
            ? { ...p, status: (status ?? 'grace') as PlayerPublicState['status'] }
            : p
        ),
      }))
    })
    socket.on(EVENTS.PLAYER_RECONNECT, ({ playerId }: { playerId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.playerId === playerId ? { ...p, status: 'connected' as const } : p
        ),
      }))
    })
    socket.on(EVENTS.PLAYER_REMOVED, ({ playerId }: { playerId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.playerId !== playerId),
      }))
    })
    socket.on(EVENTS.HOST_DISCONNECTED, () => {
      setRoomState((prev) => ({ ...prev, gamePaused: true }))
    })
    socket.on(EVENTS.HOST_RECONNECTED, () => {
      setRoomState((prev) => ({ ...prev, gamePaused: false, hostAbandoned: false }))
    })
    socket.on(EVENTS.HOST_ABANDONED, () => {
      setRoomState((prev) => ({ ...prev, hostAbandoned: true }))
    })
    socket.on(EVENTS.ROOM_RESET, () => {
      setRoomState((prev) => ({ ...prev, roomReset: true }))
    })
    socket.on(
      EVENTS.POOL_PROGRESS,
      (data: { source?: string; status: string; count?: number; error?: string }) => {
        if (!data.source) return
        setRoomState((prev) => ({
          ...prev,
          poolProgress: [
            ...prev.poolProgress.filter((p) => p.source !== data.source),
            {
              source: data.source!,
              status: data.status as BoardSourceProgress['status'],
              count: data.count ?? 0,
              error: data.error,
            },
          ],
        }))
      }
    )
    socket.on(EVENTS.POOL_READY, (data: { items: Item[] }) => {
      setRoomState((prev) => ({ ...prev, pool: data.items, poolReady: true }))
    })
    socket.on(
      EVENTS.ROUND_START,
      (data: { roundIndex: number; totalRounds: number; matches: MatchPublic[] }) => {
        setRoomState((prev) => ({
          ...prev,
          status: 'active',
          roundIndex: data.roundIndex,
          totalRounds: data.totalRounds,
          roundMatches: data.matches,
          confirmedPlayerIds: [],
          currentMatch: null,
          matchPhase: null,
          votes: [],
          voteResult: null,
          coinFlipResult: null,
          interRound: true,
        }))
      }
    )
    socket.on(EVENTS.ASSIGNMENT_CONFIRMED, (data: { confirmedPlayerIds: string[] }) => {
      setRoomState((prev) => ({ ...prev, confirmedPlayerIds: data.confirmedPlayerIds }))
    })
    socket.on(EVENTS.MATCH_START, (data: MatchPublicFull) => {
      setRoomState((prev) => ({
        ...prev,
        currentMatch: data,
        matchPhase: data.phase,
        votes: [],
        voteResult: null,
        coinFlipResult: null,
        interRound: false,
      }))
    })
    socket.on(EVENTS.VOTE_OPEN, () => {
      setRoomState((prev) => ({ ...prev, matchPhase: 'voting' }))
    })
    socket.on(EVENTS.PLAYER_VOTE, (data: { colour: string; side: 'A' | 'B' }) => {
      setRoomState((prev) => ({ ...prev, votes: [...prev.votes, data] }))
    })
    socket.on(EVENTS.VOTE_RESULT, (data: { side: 'A' | 'B' | 'tie'; winnerItem: Item | null }) => {
      setRoomState((prev) => ({
        ...prev,
        voteResult: data,
        matchPhase: data.side === 'tie' ? 'tied' : 'result',
      }))
    })
    socket.on(
      EVENTS.COIN_FLIP,
      (data: { result: 'heads' | 'tails'; side: 'A' | 'B'; winnerItem: Item }) => {
        setRoomState((prev) => ({
          ...prev,
          coinFlipResult: data,
          matchPhase: 'result',
          voteResult: { side: data.side, winnerItem: data.winnerItem },
        }))
      }
    )
    socket.on(EVENTS.GAME_OVER, (data: { champion: Item; path?: Item[] }) => {
      setRoomState((prev) => ({
        ...prev,
        gameOver: true,
        champion: data.champion,
        revealPath: data.path ?? null,
      }))
    })
    socket.on(EVENTS.REVEAL_START, (data: { rows: RevealRow[]; totalRounds: number }) => {
      setRoomState((prev) => ({
        ...prev,
        revealVisible: true,
        revealRows: data.rows,
        totalRounds: data.totalRounds,
      }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomCode])

  return { connected, roomState }
}
