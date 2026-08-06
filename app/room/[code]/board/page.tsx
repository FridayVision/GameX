'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { BoardLobbyScreen } from '@/components/board/lobby-screen'
import { BoardPoolProgress } from '@/components/board/pool-progress'
import { RoundStartScreen } from '@/components/board/round-start-screen'
import { BoardMatchView } from '@/components/board/match-view'
import { useBoardSocket } from '@/hooks/use-board-socket'
import type { BracketSize } from '@/types/room.types'

export default function BoardPage() {
  const params = useParams()
  const code = params.code as string

  const router = useRouter()
  const { roomState } = useBoardSocket(code)
  const bracketSize = (roomState.bracketSize ?? 16) as BracketSize

  // Host ended the game — go home immediately, no overlay needed
  useEffect(() => {
    if (roomState.roomReset) router.replace('/')
  }, [roomState.roomReset, router])

  const showPool =
    (roomState.status === 'poolgen' || roomState.status === 'poolreview') && !roomState.poolReady
      ? false
      : roomState.poolReady && roomState.status !== 'active'

  // Host abandoned — show on board
  if (roomState.hostAbandoned) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center"
        style={{ background: '#060d05', position: 'relative' }}
      >
        <LedBackground />
        <div
          className="relative z-10 flex flex-col items-center gap-5 text-center"
          style={{
            padding: '36px 32px',
            borderRadius: 20,
            background: 'rgba(8,8,8,0.96)',
            border: '1px solid rgba(250,255,254,0.10)',
            maxWidth: 400,
          }}
        >
          <p
            style={{
              fontSize: '0.60rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(250,255,254,0.35)',
            }}
          >
            Game Ended
          </p>
          <p
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#fafffe',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            Host didn&apos;t reconnect
          </p>
          <p style={{ fontSize: '0.80rem', color: 'rgba(250,255,254,0.40)', lineHeight: 1.6 }}>
            The host left and didn&apos;t come back within 60 seconds.
          </p>
          <button
            onClick={() => router.replace('/')}
            style={{
              marginTop: 4,
              padding: '12px 32px',
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

  // Game over — hold at champion state until M7
  if (roomState.gameOver) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <LedBackground />
        <div className="relative z-10 text-center px-8">
          <p
            style={{
              fontSize: '0.72rem',
              color: 'rgba(250,255,254,0.40)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Champion
          </p>
          <h1
            style={{
              fontSize: '4rem',
              fontWeight: 900,
              color: '#fafffe',
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {roomState.champion?.title ?? 'Game Over'}
          </h1>
          {roomState.champion?.contextLine && (
            <p style={{ fontSize: '1rem', color: 'rgba(250,255,254,0.45)', marginTop: 12 }}>
              {roomState.champion.contextLine}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Match in progress — show full-screen match view
  if (roomState.status === 'active' && roomState.currentMatch) {
    return (
      <div style={{ position: 'relative' }}>
        <BoardMatchView
          match={roomState.currentMatch}
          votes={roomState.votes}
          matchPhase={roomState.matchPhase}
          voteResult={roomState.voteResult}
          coinFlipResult={roomState.coinFlipResult}
          players={roomState.players}
        />
        {roomState.gamePaused && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 30,
              background: 'rgba(6,13,5,0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 280, 560].map((d) => (
                <span
                  key={d}
                  className="anim-waiting-dot"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ec5838',
                    animationDelay: `${d}ms`,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                padding: '4px 14px',
                borderRadius: 6,
                background: 'rgba(8,8,8,0.92)',
                border: '1.5px solid rgba(245,158,11,0.4)',
                color: '#f59e0b',
                fontSize: '0.60rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              HOST DISCONNECTED
            </div>
            <div
              style={{
                padding: '16px 28px',
                borderRadius: 12,
                background: 'rgba(8,8,8,0.92)',
                border: '1px solid rgba(250,255,254,0.12)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <p
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: '#fafffe',
                  letterSpacing: '-0.02em',
                }}
              >
                Game paused
              </p>
              <p style={{ fontSize: '0.80rem', color: 'rgba(250,255,254,0.45)' }}>
                Waiting for host to reconnect
              </p>
              <p
                style={{
                  fontSize: '0.70rem',
                  color: 'rgba(250,255,254,0.28)',
                  letterSpacing: '0.10em',
                  marginTop: 4,
                }}
              >
                Room code:{' '}
                <strong style={{ color: 'rgba(250,255,254,0.55)' }}>{code.toUpperCase()}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ position: 'relative' }}>
      <LedBackground />
      {roomState.gamePaused && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            background: 'rgba(6,13,5,0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 280, 560].map((d) => (
              <span
                key={d}
                className="anim-waiting-dot"
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ec5838',
                  animationDelay: `${d}ms`,
                }}
              />
            ))}
          </div>
          <div
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              background: 'rgba(8,8,8,0.92)',
              border: '1.5px solid rgba(245,158,11,0.4)',
              color: '#f59e0b',
              fontSize: '0.60rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            HOST DISCONNECTED
          </div>
          <div
            style={{
              padding: '16px 28px',
              borderRadius: 12,
              background: 'rgba(8,8,8,0.92)',
              border: '1px solid rgba(250,255,254,0.12)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <p
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#fafffe',
                letterSpacing: '-0.02em',
              }}
            >
              Game paused
            </p>
            <p style={{ fontSize: '0.80rem', color: 'rgba(250,255,254,0.45)' }}>
              Waiting for host to reconnect
            </p>
            <p
              style={{
                fontSize: '0.70rem',
                color: 'rgba(250,255,254,0.28)',
                letterSpacing: '0.10em',
                marginTop: 4,
              }}
            >
              Room code:{' '}
              <strong style={{ color: 'rgba(250,255,254,0.55)' }}>{code.toUpperCase()}</strong>
            </p>
          </div>
        </div>
      )}

      {/* GameX wordmark */}
      <div className="absolute top-7 left-8 z-10 text-[rgba(255,255,255,0.25)] text-[0.70rem] font-black uppercase tracking-[0.26em]">
        GameX
      </div>

      {roomState.status === 'active' && roomState.roundIndex !== null ? (
        <RoundStartScreen
          roundIndex={roomState.roundIndex}
          totalRounds={roomState.totalRounds ?? Math.log2(bracketSize)}
          matches={roomState.roundMatches}
          bracketSize={bracketSize}
          topic={roomState.topic}
          players={roomState.players}
          confirmedPlayerIds={roomState.confirmedPlayerIds}
        />
      ) : showPool || roomState.status === 'poolgen' || roomState.status === 'poolreview' ? (
        <BoardPoolProgress
          topic={roomState.topic}
          bracketSize={bracketSize}
          poolProgress={roomState.poolProgress}
          pool={roomState.pool}
          poolReady={roomState.poolReady}
        />
      ) : (
        <BoardLobbyScreen
          roomCode={code}
          bracketSize={bracketSize}
          players={roomState.players}
          topic={roomState.topic}
        />
      )}
    </div>
  )
}
