'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { PlayerPublicState } from '@/types/player.types'
import type { Item } from '@/types/item.types'
import type { RoomStatus, BracketSize } from '@/types/room.types'
import type { AssignmentPayload } from '@/types/assignment.types'
import type { MatchPublic } from '@/types/match.types'
import { EVENTS } from '@/lib/socket-events'

export interface PoolSourceProgress {
  source: string
  status: 'fetching' | 'done' | 'error'
  count: number
  error?: string
}

export interface PlayerRoomState {
  players: PlayerPublicState[]
  status: RoomStatus
  bracketSize: BracketSize | null
  roomCode: string
  topic: string
  poolProgress: PoolSourceProgress[]
  pool: Item[]
  poolReady: boolean
  poolFailed: boolean
  poolError: string
  assignment: AssignmentPayload | null
  roundIndex: number | null
  totalRounds: number | null
  confirmedPlayerIds: string[]
  // Match loop state
  currentMatch: MatchPublic | null
  votes: Array<{ colour: string; side: 'A' | 'B' }>
  matchPhase: MatchPublic['phase'] | null
  myVote: 'A' | 'B' | null
  voteResult: { side: 'A' | 'B' | 'tie'; winnerItem: Item | null } | null
  coinFlipResult: { result: 'heads' | 'tails'; side: 'A' | 'B'; winnerItem: Item } | null
  interRound: boolean
  gameOver: boolean
  champion: Item | null
}

export function usePlayerSocket(roomId: string | null, playerToken: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const currentMatchRef = useRef<MatchPublic | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomState, setRoomState] = useState<PlayerRoomState>({
    players: [],
    status: 'lobby',
    bracketSize: null,
    roomCode: '',
    topic: '',
    poolProgress: [],
    pool: [],
    poolReady: false,
    poolFailed: false,
    poolError: '',
    assignment: null,
    roundIndex: null,
    totalRounds: null,
    confirmedPlayerIds: [],
    currentMatch: null,
    votes: [],
    matchPhase: null,
    myVote: null,
    voteResult: null,
    coinFlipResult: null,
    interRound: false,
    gameOver: false,
    champion: null,
  })

  useEffect(() => {
    if (!roomId || !playerToken) return
    const socket = io('/player', { auth: { roomId, playerToken } })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on(
      EVENTS.PLAYER_JOINED,
      (data: Omit<PlayerRoomState, 'poolProgress' | 'pool' | 'poolReady'>) => {
        setRoomState((prev) => ({ ...prev, ...data }))
      }
    )
    socket.on(EVENTS.PLAYER_LEFT, ({ playerId }: { playerId: string }) => {
      setRoomState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.playerId !== playerId),
      }))
    })
    socket.on(
      EVENTS.POOL_PROGRESS,
      (data: { source?: string; status: string; count?: number; error?: string }) => {
        if (data.status === 'failed') {
          setRoomState((prev) => ({
            ...prev,
            poolFailed: true,
            poolError: data.error ?? 'Pool generation failed. Try a different topic.',
          }))
          return
        }
        if (data.status === 'started') {
          setRoomState((prev) => ({
            ...prev,
            poolFailed: false,
            poolError: '',
            poolProgress: [],
            poolReady: false,
            pool: [],
          }))
          return
        }
        if (!data.source) return
        setRoomState((prev) => ({
          ...prev,
          poolProgress: [
            ...prev.poolProgress.filter((p) => p.source !== data.source),
            {
              source: data.source!,
              status: data.status as PoolSourceProgress['status'],
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
    socket.on(EVENTS.ROUND_START, (data: { roundIndex: number; totalRounds: number }) => {
      setRoomState((prev) => ({
        ...prev,
        status: 'active',
        roundIndex: data.roundIndex,
        totalRounds: data.totalRounds,
        currentMatch: null,
        matchPhase: null,
        votes: [],
        myVote: null,
        voteResult: null,
        coinFlipResult: null,
        interRound: true,
        confirmedPlayerIds: [],
      }))
      currentMatchRef.current = null
    })
    socket.on(EVENTS.ASSIGNMENT, (data: AssignmentPayload) => {
      setRoomState((prev) => ({ ...prev, assignment: data }))
    })
    socket.on(EVENTS.ASSIGNMENT_CONFIRMED, (data: { confirmedPlayerIds: string[] }) => {
      setRoomState((prev) => ({ ...prev, confirmedPlayerIds: data.confirmedPlayerIds }))
    })
    socket.on(EVENTS.MATCH_START, (data: MatchPublic) => {
      currentMatchRef.current = data
      setRoomState((prev) => ({
        ...prev,
        currentMatch: data,
        matchPhase: data.phase,
        votes: [],
        myVote: null,
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
    socket.on(EVENTS.GAME_OVER, (data: { champion: Item }) => {
      setRoomState((prev) => ({ ...prev, gameOver: true, champion: data.champion }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, playerToken])

  const confirmAssignment = useCallback(() => {
    socketRef.current?.emit(EVENTS.ASSIGNMENT_CONFIRMED)
  }, [])

  const castVote = useCallback((side: 'A' | 'B') => {
    const match = currentMatchRef.current
    if (!match) return
    socketRef.current?.emit(EVENTS.PLAYER_VOTE, { matchId: match.matchId, side })
    setRoomState((prev) => ({ ...prev, myVote: side }))
  }, [])

  const callVote = useCallback(() => {
    socketRef.current?.emit(EVENTS.HOST_CALL_VOTE)
  }, [])

  const coinFlip = useCallback(() => {
    socketRef.current?.emit(EVENTS.HOST_COIN_FLIP)
  }, [])

  const nextMatch = useCallback(() => {
    socketRef.current?.emit(EVENTS.HOST_NEXT_MATCH)
  }, [])

  return { connected, roomState, confirmAssignment, castVote, callVote, coinFlip, nextMatch }
}
