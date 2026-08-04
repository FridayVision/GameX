'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { HostLobbyScreen } from '@/components/host/lobby-screen'
import { PlayerLobbyScreen } from '@/components/player/lobby-screen'
import { AssignmentCard } from '@/components/player/assignment-card'
import { usePlayerSocket } from '@/hooks/use-player-socket'
import type { BracketSize } from '@/types/room.types'

interface SessionState {
  playerToken: string
  playerId: string
  roomId: string
  hostToken: string | null
  isHost: boolean
  reclaimCode: string
}

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [session, setSession] = useState<SessionState | null>(null)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    const pt = sessionStorage.getItem(`playerToken_${code}`)
    const pid = sessionStorage.getItem(`playerId_${code}`)
    const rid = sessionStorage.getItem(`roomId_${code}`)

    if (!pt || !pid || !rid) {
      router.replace(`/room/${code}/join`)
      return
    }

    const ht = sessionStorage.getItem(`hostToken_${code}`)
    const rc = sessionStorage.getItem(`reclaimCode_${code}`)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({
      playerToken: pt,
      playerId: pid,
      roomId: rid,
      hostToken: ht,
      isHost: !!ht,
      reclaimCode: rc ?? '',
    })
  }, [code, router])

  const { roomState, confirmAssignment } = usePlayerSocket(
    session?.roomId ?? null,
    session?.playerToken ?? null
  )

  const handleStart = useCallback(async () => {
    if (!session?.hostToken) return
    setStartLoading(true)
    setStartError('')
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.hostToken}`,
        },
        body: JSON.stringify({ roomCode: code }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStartError((data as { error?: string }).error ?? 'Failed to start game')
      }
      // ROUND_START + ASSIGNMENT arrive via socket — no further action needed
    } catch {
      setStartError('Network error — please try again')
    } finally {
      setStartLoading(false)
    }
  }, [session, code])

  if (!session) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <LedBackground />
      </div>
    )
  }

  const hostPlayer = roomState.players.find((p) => p.isHost)
  const mePlayer = roomState.players.find((p) => p.playerId === session.playerId)
  const bracketSize = (roomState.bracketSize ?? 16) as BracketSize
  const gameActive = roomState.status === 'active'

  return (
    <div className="h-[100dvh]">
      <LedBackground />

      {gameActive && roomState.assignment ? (
        /* Game started — show secret assignment */
        <AssignmentCard
          assignment={roomState.assignment}
          playerName={mePlayer?.displayName ?? session.playerId}
          playerColour={mePlayer?.colour ?? '#15F4C7'}
          onReady={confirmAssignment}
        />
      ) : gameActive && session.isHost ? (
        /* Host view while game is active but no assignment (host doesn't get one in M4) */
        <div className="relative z-10 h-[100dvh] flex flex-col items-center justify-center px-6 text-center gap-3">
          <p className="text-[rgba(250,255,254,0.50)] text-[0.70rem] uppercase tracking-[0.22em] font-bold">
            Round {(roomState.roundIndex ?? 0) + 1} of {roomState.totalRounds ?? '?'}
          </p>
          <h1 className="text-[rgba(250,255,254,1)] text-[2rem] font-black tracking-[-0.03em] uppercase">
            Game Started
          </h1>
          <p className="text-[rgba(250,255,254,0.35)] text-[0.75rem]">
            Players have received their assignments · Match controls coming in the next build
          </p>
          {startError && <p className="text-[#ec5838] text-[0.72rem]">{startError}</p>}
        </div>
      ) : session.isHost ? (
        <HostLobbyScreen
          roomCode={code}
          reclaimCode={session.reclaimCode}
          bracketSize={bracketSize}
          players={roomState.players}
          currentPlayerId={session.playerId}
          topic={roomState.topic}
          onStart={handleStart}
          loading={startLoading}
        />
      ) : (
        <PlayerLobbyScreen
          roomCode={code}
          bracketSize={bracketSize}
          players={roomState.players}
          currentPlayerId={session.playerId}
          hostName={hostPlayer?.displayName ?? ''}
          topic={roomState.topic}
        />
      )}
    </div>
  )
}
