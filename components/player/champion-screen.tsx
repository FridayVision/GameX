'use client'
import { useEffect, useState } from 'react'
import type { Item } from '@/types/item.types'

interface PlayerChampionScreenProps {
  champion: Item
  path: Item[]
  totalRounds: number
  isHost: boolean
  onReveal: () => void
  playerName?: string
  playerColour?: string
}

function roundLabel(index: number, total: number): string {
  if (index === total - 1) return 'Final'
  if (index === total - 2 && total > 2) return 'Semi'
  return `R${index + 1}`
}

export function PlayerChampionScreen({
  champion,
  path,
  totalRounds,
  isHost,
  onReveal,
  playerName,
  playerColour,
}: PlayerChampionScreenProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 80))
  }, [])

  return (
    <div
      className={`h-[100dvh]${loaded ? ' is-loaded' : ''}`}
      style={{ position: 'relative', overflow: 'hidden', background: '#080808' }}
    >
      {/* Phone-style LED background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="led-orange" />
        <div className="led-teal" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, #080808 95%)',
          }}
        />
      </div>

      {/* Breathing spotlight */}
      <div
        style={{
          position: 'fixed',
          top: '4%',
          left: '50%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(236,88,56,0.20) 0%, rgba(200,55,20,0.08) 40%, transparent 70%)',
          filter: 'blur(28px)',
          zIndex: 2,
          pointerEvents: 'none',
          animation: 'spotlight-breathe 3s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* Scrollable content */}
      <div
        className="relative z-10 h-[100dvh] flex flex-col items-center px-4 py-6"
        style={{ gap: 0, overflowY: 'auto', justifyContent: 'center' }}
      >
        {/* Round context pill */}
        <div className="reveal-fade-up d-100" style={{ marginBottom: 12 }}>
          <div
            style={{
              background: 'rgba(8,8,8,0.92)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(250,255,254,0.12)',
              borderRadius: 8,
              padding: '5px 14px',
              textAlign: 'center',
              color: 'rgba(250,255,254,0.55)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontSize: '0.62rem',
              fontWeight: 600,
            }}
          >
            Round {totalRounds} of {totalRounds} · Final
          </div>
        </div>

        {/* THE CHAMPION heading — solid dark card */}
        <div
          className="reveal-fade-up d-200"
          style={{
            textAlign: 'center',
            lineHeight: 1,
            marginBottom: 16,
            background: 'rgba(8,8,8,0.94)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(250,255,254,0.12)',
            borderRadius: 14,
            padding: '14px 32px',
            boxShadow: '0 0 0 1px rgba(0,0,0,.90), 0 8px 28px rgba(0,0,0,.70)',
          }}
        >
          <p
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.38em',
              textTransform: 'uppercase',
              color: 'rgba(250,255,254,0.45)',
              margin: '0 0 2px',
            }}
          >
            THE
          </p>
          <h1
            style={{
              fontSize: '2.90rem',
              fontWeight: 900,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: '#ec5838',
              margin: 0,
              lineHeight: 0.92,
              textShadow: '0 0 28px rgba(236,88,56,0.72), 0 0 65px rgba(236,88,56,0.36)',
            }}
          >
            CHAMPION
          </h1>
        </div>

        {/* Champion card */}
        <div className="reveal-scale-in d-300" style={{ position: 'relative', marginBottom: 12 }}>
          <div
            style={{
              width: 200,
              height: 285,
              borderRadius: 14,
              overflow: 'hidden',
              position: 'relative',
              outline: '1px solid rgba(255,255,255,0.12)',
              animation: 'champ-pulse 2.6s ease-in-out infinite',
            }}
          >
            {champion.imageUrl ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${champion.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transform: 'scale(1.03)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(236,88,56,0.14)',
                    mixBlendMode: 'color',
                    pointerEvents: 'none',
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(160deg, rgba(236,88,56,0.25) 0%, #111111 60%)',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 42%, transparent 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '14px 14px 18px',
              }}
            >
              <div
                style={{
                  background: 'rgba(4,8,3,0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(250,255,254,0.09)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    margin: '0 0 2px',
                    color: '#fafffe',
                    lineHeight: 1.1,
                  }}
                >
                  {champion.title}
                </h2>
                {champion.contextLine && (
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      fontStyle: 'italic',
                      fontSize: '0.70rem',
                      margin: 0,
                    }}
                  >
                    {champion.contextLine}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player identity chip — "You are: [name]" */}
        {playerName && playerColour && (
          <div className="reveal-fade-up d-400" style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(8,8,8,0.92)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(250,255,254,0.10)',
                borderRadius: 20,
                padding: '6px 14px 6px 8px',
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: playerColour,
                  boxShadow: `0 0 8px ${playerColour}55`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'rgba(250,255,254,0.70)',
                }}
              >
                {playerName}
              </span>
            </div>
          </div>
        )}

        {/* Path to the top — solid dark card, scrollable */}
        {path.length > 0 && (
          <div
            className="reveal-fade-up d-500"
            style={{ width: '100%', maxWidth: 400, marginBottom: 12 }}
          >
            <div
              style={{
                background: 'rgba(8,8,8,0.92)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(250,255,254,0.10)',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <p
                style={{
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.50)',
                  textAlign: 'center',
                  margin: '0 0 12px',
                }}
              >
                Path to the Top
              </p>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', paddingBottom: 2, gap: 0 }}
                >
                  {path.flatMap((item, i) => [
                    i > 0 ? (
                      <div
                        key={`arrow-${i}`}
                        style={{
                          width: 18,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingBottom: 24,
                          color: 'rgba(250,255,254,0.30)',
                          fontSize: '0.75rem',
                          alignSelf: 'center',
                        }}
                      >
                        →
                      </div>
                    ) : null,
                    <div
                      key={item.itemId}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 66,
                          height: 99,
                          borderRadius: 7,
                          overflow: 'hidden',
                          position: 'relative',
                          outline: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {item.imageUrl ? (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundImage: `url(${item.imageUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: 'grayscale(0.75) brightness(0.45)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: '#1a1a1a',
                            }}
                          />
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 50%, transparent 100%)',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '5px 6px 7px',
                            fontSize: '0.56rem',
                            fontWeight: 700,
                            color: 'rgba(250,255,254,0.75)',
                            lineHeight: 1.2,
                          }}
                        >
                          {item.title}
                        </div>
                      </div>
                      {/* Round label — pill with bg */}
                      <div
                        style={{
                          background: 'rgba(250,255,254,0.08)',
                          border: '1px solid rgba(250,255,254,0.12)',
                          borderRadius: 4,
                          padding: '2px 7px',
                          fontSize: '0.50rem',
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'rgba(250,255,254,0.65)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {roundLabel(i, totalRounds)}
                      </div>
                    </div>,
                  ])}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Host-only: Reveal Assignments button — solid dark bg */}
        {isHost && (
          <div className="reveal-fade-up d-500" style={{ width: '100%', maxWidth: 320 }}>
            <button
              onClick={onReveal}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 12,
                border: '2px solid rgba(21,244,199,0.55)',
                background: 'rgba(8,8,8,0.95)',
                color: '#15F4C7',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 0 20px rgba(21,244,199,0.10)',
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Reveal Assignments
            </button>
          </div>
        )}

        {/* Non-host: waiting — solid dark bg card */}
        {!isHost && (
          <div className="reveal-fade-up d-500" style={{ width: '100%', maxWidth: 320 }}>
            <div
              style={{
                background: 'rgba(8,8,8,0.92)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(250,255,254,0.10)',
                borderRadius: 12,
                padding: '14px 18px',
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
                  background: '#ec5838',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'rgba(250,255,254,0.60)',
                }}
              >
                Waiting for host to reveal assignments…
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
