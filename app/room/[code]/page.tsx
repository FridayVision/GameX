'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { HostLobbyScreen } from '@/components/host/lobby-screen'
import { PlayerLobbyScreen } from '@/components/player/lobby-screen'
import { AssignmentCard } from '@/components/player/assignment-card'
import { PlayerMatchView } from '@/components/player/match-view'
import { HostMatchControls } from '@/components/host/match-controls'
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

  const { roomState, confirmAssignment, castVote, callVote, coinFlip, nextMatch } = usePlayerSocket(
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

  // Game over — hold at current view until M7 champion screen
  if (roomState.gameOver) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-6 text-center gap-3">
        <LedBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <p
            style={{
              fontSize: '0.70rem',
              color: 'rgba(250,255,254,0.45)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Champion
          </p>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#fafffe',
              letterSpacing: '-0.03em',
            }}
          >
            {roomState.champion?.title ?? 'Game Over'}
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'rgba(250,255,254,0.35)' }}>
            Reveal screen coming in the next build
          </p>
        </div>
      </div>
    )
  }

  // Match in progress — show PlayerMatchView (+ HostMatchControls overlay for host)
  if (gameActive && roomState.currentMatch) {
    const activePlayers = roomState.players.filter(
      (p) => p.status !== 'removed' && p.status !== 'timedout'
    )
    const votedCount = roomState.votes.length
    const totalCount = activePlayers.length

    return (
      <div className="h-[100dvh]">
        <LedBackground />
        <PlayerMatchView
          match={roomState.currentMatch}
          votes={roomState.votes}
          matchPhase={roomState.matchPhase}
          myVote={roomState.myVote}
          voteResult={roomState.voteResult}
          coinFlipResult={roomState.coinFlipResult}
          playerColour={mePlayer?.colour ?? '#15F4C7'}
          playerName={mePlayer?.displayName ?? session.playerId}
          isHost={session.isHost}
          castVote={castVote}
        />
        {session.isHost && (
          <HostMatchControls
            matchPhase={roomState.matchPhase}
            isInterRound={false}
            votedCount={votedCount}
            totalCount={totalCount}
            confirmedCount={roomState.confirmedPlayerIds.length}
            playerCount={totalCount}
            onCallVote={callVote}
            onCoinFlip={coinFlip}
            onNextMatch={nextMatch}
          />
        )}
      </div>
    )
  }

  // Inter-round / initial — show assignment card if available
  if (gameActive && roomState.assignment) {
    return (
      <div className="h-[100dvh]">
        <LedBackground />
        <AssignmentCard
          assignment={roomState.assignment}
          playerName={mePlayer?.displayName ?? session.playerId}
          playerColour={mePlayer?.colour ?? '#15F4C7'}
          onReady={confirmAssignment}
        />
        {/* Host sees "Start Match" controls during inter-round */}
        {session.isHost && (
          <HostMatchControls
            matchPhase={null}
            isInterRound={true}
            votedCount={0}
            totalCount={0}
            confirmedCount={roomState.confirmedPlayerIds.length}
            playerCount={
              roomState.players.filter((p) => p.status !== 'removed' && p.status !== 'timedout')
                .length
            }
            onCallVote={callVote}
            onCoinFlip={coinFlip}
            onNextMatch={nextMatch}
          />
        )}
      </div>
    )
  }

  // Game active but no assignment yet (transient state)
  if (gameActive) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <LedBackground />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
          <div className="flex gap-1.5">
            {[0, 280, 560].map((d) => (
              <span
                key={d}
                className="w-[5px] h-[5px] rounded-full inline-block anim-waiting-dot"
                style={{ background: '#ec5838', animationDelay: `${d}ms` }}
              />
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'rgba(250,255,254,0.40)' }}>
            Waiting for round to start…
          </p>
        </div>
      </div>
    )
  }

  // Lobby
  return (
    <div className="h-[100dvh]">
      <LedBackground />
      {session.isHost ? (
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
      {startError && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
          <p
            style={{
              fontSize: '0.72rem',
              color: '#ec5838',
              background: '#0e0e0e',
              border: '1px solid rgba(236,88,56,0.3)',
              borderRadius: 8,
              padding: '6px 14px',
            }}
          >
            {startError}
          </p>
        </div>
      )}
    </div>
  )
}
