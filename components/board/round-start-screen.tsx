'use client'
import { useEffect, useState } from 'react'
import type { MatchPublic } from '@/hooks/use-board-socket'
import type { BracketSize } from '@/types/room.types'
import type { PlayerPublicState } from '@/types/player.types'
import { toRgba } from '@/lib/colours'

interface RoundStartScreenProps {
  roundIndex: number
  totalRounds: number
  matches: MatchPublic[]
  bracketSize: BracketSize
  topic: string
  players: PlayerPublicState[]
  confirmedPlayerIds: string[]
}

const PLAYER_DELAYS = ['d-400', 'd-500', 'd-600', 'd-700', 'd-800', 'd-900', 'd-1000', 'd-1100']

export function RoundStartScreen({
  roundIndex,
  totalRounds,
  players,
  confirmedPlayerIds,
}: RoundStartScreenProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 80))
  }, [])

  const activePlayers = players.filter((p) => p.status !== 'removed' && p.status !== 'timedout')
  const confirmedSet = new Set(confirmedPlayerIds)
  const allConfirmed =
    activePlayers.length > 0 && activePlayers.every((p) => confirmedSet.has(p.playerId))

  return (
    <div
      className={`flex flex-col${loaded ? ' is-loaded' : ''}`}
      style={{ position: 'fixed', inset: 0, zIndex: 20, background: '#060d05' }}
    >
      {/* Inter-round LED background layers */}
      <div className="led-dots-board" aria-hidden="true" />
      <div className="led-orange-glow" aria-hidden="true" />
      <div className="led-teal-glow" aria-hidden="true" />
      <div className="led-void" aria-hidden="true" />

      {/* Header */}
      <header
        className="relative z-10 w-full px-12 py-5 flex justify-between items-center flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(250,255,254,0.08)' }}
      >
        <div
          className="reveal-fade-up d-100"
          style={{
            background: 'rgba(8,14,7,0.60)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(250,255,254,0.08)',
            borderRadius: 8,
            padding: '6px 16px',
            color: 'rgba(250,255,254,0.55)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          ROUND {roundIndex + 1} OF {totalRounds}
          <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>INTER-ROUND
        </div>

        <div className="reveal-fade-up d-200">
          <span
            style={{
              background: 'rgba(8,14,7,0.70)',
              color: 'rgba(250,255,254,0.80)',
              padding: '6px 20px',
              borderRadius: 6,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              border: '1px solid rgba(250,255,254,0.14)',
            }}
          >
            ASSIGNMENTS
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
        {/* Large round number */}
        <div
          className="reveal-scale-in d-200 flex flex-col items-center"
          style={{ marginBottom: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span
              style={{
                fontSize: '7.5rem',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: '#fafffe',
                textShadow: '0 0 80px rgba(250,255,254,0.06)',
              }}
            >
              {roundIndex + 1}
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                paddingBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.35)',
                  lineHeight: 1,
                }}
              >
                ROUND
              </span>
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'rgba(250,255,254,0.30)',
                  lineHeight: 1.2,
                }}
              >
                of {totalRounds}
              </span>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p
          className="reveal-fade-up d-300"
          style={{
            fontSize: '1rem',
            fontWeight: 500,
            color: 'rgba(250,255,254,0.40)',
            letterSpacing: '0.06em',
            margin: '0 0 52px',
          }}
        >
          Players are checking their assignments
        </p>

        {/* Player circles */}
        {activePlayers.length > 0 && (
          <div style={{ display: 'flex', gap: 56, alignItems: 'flex-start', marginBottom: 52 }}>
            {activePlayers.map((player, i) => {
              const delayClass = PLAYER_DELAYS[Math.min(i, PLAYER_DELAYS.length - 1)]
              const confirmed = confirmedSet.has(player.playerId)
              return (
                <div
                  key={player.playerId}
                  className={`reveal-fade-up ${delayClass}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Circle */}
                  <div
                    className={confirmed ? '' : 'anim-ring-pulse'}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      position: 'relative',
                      flexShrink: 0,
                      transition:
                        'background 0.5s ease, box-shadow 0.5s ease, border-color 0.5s ease, opacity 0.5s ease',
                      ...(confirmed
                        ? {
                            background: player.colour,
                            boxShadow: `0 0 22px ${toRgba(player.colour, 0.4)}`,
                            border: '2.5px solid transparent',
                            opacity: 1,
                          }
                        : {
                            background: 'transparent',
                            border: `2.5px solid ${player.colour}`,
                            opacity: 0.45,
                          }),
                    }}
                  >
                    {confirmed && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 28,
                          fontWeight: 900,
                          color: 'rgba(0,0,0,0.45)',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'color 0.4s ease',
                      color: confirmed ? 'rgba(250,255,254,0.90)' : 'rgba(250,255,254,0.35)',
                    }}
                  >
                    {player.displayName}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Gate pill */}
        <div className="reveal-fade-up d-900">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 24px',
              borderRadius: 10,
              background: 'rgba(8,14,7,0.65)',
              backdropFilter: 'blur(8px)',
              border: allConfirmed
                ? '1px solid rgba(21,244,199,0.35)'
                : '1px solid rgba(250,255,254,0.10)',
              fontSize: '0.85rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: allConfirmed ? '#15F4C7' : 'rgba(250,255,254,0.55)',
              boxShadow: allConfirmed ? '0 0 28px rgba(21,244,199,0.12)' : undefined,
              transition: 'border-color 0.5s ease, color 0.5s ease, box-shadow 0.5s ease',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: allConfirmed ? '#15F4C7' : 'rgba(250,255,254,0.30)',
                flexShrink: 0,
                transition: 'background 0.5s ease',
              }}
            />
            {allConfirmed
              ? 'All players confirmed — Host can start the round'
              : 'Waiting for players to check assignments'}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 w-full flex items-center justify-center px-12 flex-shrink-0"
        style={{ height: 72, borderTop: '1px solid rgba(250,255,254,0.06)' }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 500,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'rgba(250,255,254,0.38)',
            background: 'rgba(8,14,7,0.55)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(250,255,254,0.12)',
            borderRadius: 6,
            padding: '5px 14px',
          }}
        >
          Board is receive-only — assignment cards are on each player&apos;s device
        </span>
      </footer>
    </div>
  )
}
