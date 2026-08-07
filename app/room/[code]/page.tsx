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
import { PlayerChampionScreen } from '@/components/player/champion-screen'
import { PlayerRevealTable } from '@/components/player/reveal-table'
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
    const pt = localStorage.getItem(`playerToken_${code}`)
    const pid = localStorage.getItem(`playerId_${code}`)
    const rid = localStorage.getItem(`roomId_${code}`)

    if (!pt || !pid || !rid) {
      router.replace(`/room/${code}/join`)
      return
    }

    const ht = localStorage.getItem(`hostToken_${code}`)
    const rc = localStorage.getItem(`reclaimCode_${code}`)
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

  const {
    roomState,
    confirmAssignment,
    castVote,
    callVote,
    coinFlip,
    nextMatch,
    proceedAnyway,
    emitRoomReset,
    triggerReveal,
  } = usePlayerSocket(session?.roomId ?? null, session?.playerToken ?? null)

  const handleEndGame = useCallback(() => {
    // Notify board and players immediately before navigating (closing the socket)
    emitRoomReset()
    // Small delay so the socket event sends before the page navigates away
    setTimeout(() => {
      localStorage.removeItem(`playerToken_${code}`)
      localStorage.removeItem(`playerId_${code}`)
      localStorage.removeItem(`roomId_${code}`)
      localStorage.removeItem(`hostToken_${code}`)
      localStorage.removeItem(`reclaimCode_${code}`)
      router.replace('/')
    }, 150)
  }, [code, router, emitRoomReset])

  const handleReturnHome = useCallback(() => {
    if (session?.isHost) {
      handleEndGame()
    } else {
      localStorage.removeItem(`playerToken_${code}`)
      localStorage.removeItem(`playerId_${code}`)
      localStorage.removeItem(`roomId_${code}`)
      localStorage.removeItem(`hostToken_${code}`)
      localStorage.removeItem(`reclaimCode_${code}`)
      router.replace('/')
    }
  }, [session, code, router, handleEndGame])

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

  // All players left — shown to host when they reconnect and find nobody waiting
  if (roomState.allPlayersLeft && session.isHost) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <LedBackground />
        <div
          className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[320px]"
          style={{
            padding: '28px 24px',
            borderRadius: 20,
            background: 'rgba(8,8,8,0.96)',
            border: '1px solid rgba(250,255,254,0.10)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#fafffe',
                letterSpacing: '-0.02em',
              }}
            >
              Everyone left
            </p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(250,255,254,0.40)', lineHeight: 1.5 }}>
              You reconnected, but all players have already gone home.
            </p>
          </div>
          <button
            onClick={handleEndGame}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 10,
              border: '1px solid rgba(250,255,254,0.15)',
              background: 'rgba(250,255,254,0.06)',
              color: 'rgba(250,255,254,0.65)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Host ended game — non-host players see a "Game ended" screen
  if (roomState.gameEnded && !session.isHost) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <LedBackground />
        <div
          className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[320px]"
          style={{
            padding: '28px 24px',
            borderRadius: 20,
            background: 'rgba(8,8,8,0.96)',
            border: '1px solid rgba(250,255,254,0.10)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#fafffe',
                letterSpacing: '-0.02em',
              }}
            >
              Game ended
            </p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(250,255,254,0.40)', lineHeight: 1.5 }}>
              The host ended the game.
            </p>
          </div>
          <button
            onClick={() => router.replace('/')}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 10,
              border: '1px solid rgba(250,255,254,0.15)',
              background: 'rgba(250,255,254,0.06)',
              color: 'rgba(250,255,254,0.65)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Removed from game
  if (roomState.removedFromGame) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <LedBackground />
        <div
          className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[320px]"
          style={{
            padding: '28px 24px',
            borderRadius: 20,
            background: 'rgba(8,8,8,0.96)',
            border: '1px solid rgba(250,255,254,0.10)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'rgba(236,88,56,0.12)',
              border: '1.5px solid rgba(236,88,56,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            ✕
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#fafffe',
                letterSpacing: '-0.02em',
              }}
            >
              You&apos;ve been removed
            </p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(250,255,254,0.40)', lineHeight: 1.5 }}>
              The host removed you from the game after you disconnected.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Host abandoned — game is over
  if (roomState.hostAbandoned) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center px-6 text-center gap-4">
        <LedBackground />
        <div
          className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[320px]"
          style={{
            padding: '28px 24px',
            borderRadius: 20,
            background: 'rgba(8,8,8,0.96)',
            border: '1px solid rgba(250,255,254,0.10)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p
              style={{
                fontSize: '1.2rem',
                fontWeight: 900,
                color: '#fafffe',
                letterSpacing: '-0.02em',
              }}
            >
              Host didn&apos;t reconnect
            </p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(250,255,254,0.40)', lineHeight: 1.5 }}>
              The host left and didn&apos;t come back. The game has ended.
            </p>
          </div>
          <button
            onClick={() => router.replace('/')}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 10,
              border: '1px solid rgba(250,255,254,0.15)',
              background: 'rgba(250,255,254,0.06)',
              color: 'rgba(250,255,254,0.65)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Game over — champion screen → host-triggered reveal table
  if (roomState.gameOver && roomState.champion) {
    if (roomState.revealVisible && roomState.revealRows && session) {
      return (
        <PlayerRevealTable
          rows={roomState.revealRows}
          champion={roomState.champion}
          totalRounds={roomState.totalRounds ?? 4}
          myPlayerId={session.playerId}
          onReturn={handleReturnHome}
        />
      )
    }
    const myPlayer = session
      ? roomState.players.find((p) => p.playerId === session.playerId)
      : undefined
    return (
      <PlayerChampionScreen
        champion={roomState.champion}
        path={roomState.revealPath ?? []}
        totalRounds={roomState.totalRounds ?? 4}
        isHost={session?.isHost ?? false}
        onReveal={triggerReveal}
        playerName={myPlayer?.displayName}
        playerColour={myPlayer?.colour}
      />
    )
  }

  // Match in progress — show PlayerMatchView (+ HostMatchControls overlay for host)
  if (gameActive && roomState.currentMatch) {
    const activePlayers = roomState.players.filter((p) => p.status !== 'removed')
    const votedCount = roomState.votes.length
    const totalCount = activePlayers.length

    return (
      <div className="h-[100dvh]">
        <LedBackground />
        {/* Game paused banner — shown to non-host players when host disconnects */}
        {roomState.gamePaused && !session.isHost && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              padding: '10px 16px',
              background: 'rgba(8,8,8,0.96)',
              borderBottom: '1px solid rgba(250,255,254,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              className="anim-waiting-dot"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#f59e0b',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'rgba(250,255,254,0.65)',
                letterSpacing: '0.04em',
              }}
            >
              Host disconnected — game paused
            </span>
          </div>
        )}
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
          castVote={roomState.gamePaused ? () => {} : castVote}
          gamePaused={roomState.gamePaused}
        />
        {session.isHost && (
          <HostMatchControls
            matchPhase={roomState.matchPhase}
            isInterRound={false}
            votedCount={votedCount}
            totalCount={totalCount}
            confirmedCount={roomState.confirmedPlayerIds.length}
            playerCount={totalCount}
            timedOutPlayers={roomState.timedOutPlayers}
            onCallVote={callVote}
            onCoinFlip={coinFlip}
            onNextMatch={nextMatch}
            onProceedAnyway={proceedAnyway}
            onEndGame={handleEndGame}
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
            playerCount={roomState.players.filter((p) => p.status === 'connected').length}
            timedOutPlayers={roomState.timedOutPlayers}
            onCallVote={callVote}
            onCoinFlip={coinFlip}
            onNextMatch={nextMatch}
            onProceedAnyway={proceedAnyway}
            onEndGame={handleEndGame}
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
