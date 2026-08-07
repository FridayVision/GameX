'use client'
import { useEffect, useState } from 'react'
import type { Item } from '@/types/item.types'

interface BoardChampionScreenProps {
  champion: Item
  path: Item[]
  totalRounds: number
}

function roundLabel(index: number, total: number): string {
  if (index === total - 1) return 'Final'
  if (index === total - 2 && total > 2) return 'Semi-Final'
  return `Round ${index + 1}`
}

export function BoardChampionScreen({ champion, path, totalRounds }: BoardChampionScreenProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 80))
  }, [])

  return (
    <div
      className={`flex flex-col${loaded ? ' is-loaded' : ''}`}
      style={{ position: 'fixed', inset: 0, zIndex: 20, background: '#060d05', overflow: 'hidden' }}
    >
      {/* LED background — stronger orange for champion atmosphere */}
      <div className="led-dots-board" aria-hidden="true" />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(ellipse 95% 78% at 8% 92%, rgba(236,88,56,0.36) 0%, rgba(190,48,10,0.15) 38%, transparent 62%)',
            'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(220,72,30,0.22) 0%, transparent 55%)',
            'radial-gradient(ellipse 60% 50% at 92% 10%, rgba(200,60,18,0.14) 0%, transparent 50%)',
          ].join(','),
        }}
        aria-hidden="true"
      />
      <div className="led-teal-glow" aria-hidden="true" />
      <div className="led-void" aria-hidden="true" />

      {/* Breathing spotlight behind champion card */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '50%',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(236,88,56,0.18) 0%, rgba(200,55,20,0.08) 40%, transparent 70%)',
          filter: 'blur(30px)',
          zIndex: 1,
          pointerEvents: 'none',
          animation: 'spotlight-breathe 3s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <header
        className="relative z-10 flex-shrink-0"
        style={{ padding: '20px 48px', borderBottom: '1px solid rgba(250,255,254,0.08)' }}
      >
        <div
          className="reveal-fade-up d-100"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
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
          ROUND {totalRounds} OF {totalRounds}
          <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>FINAL
        </div>
      </header>

      {/* Main */}
      <main
        className="relative z-10 flex-1 flex flex-col items-center justify-center"
        style={{ gap: 0, paddingTop: 4 }}
      >
        {/* THE CHAMPION heading */}
        <div
          className="reveal-fade-up d-200"
          style={{ marginBottom: 14, textAlign: 'center', lineHeight: 1 }}
        >
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.38em',
              textTransform: 'uppercase',
              color: 'rgba(250,255,254,0.35)',
              margin: '0 0 1px',
            }}
          >
            THE
          </p>
          <h1
            style={{
              fontSize: '4rem',
              fontWeight: 900,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: '#ec5838',
              margin: 0,
              lineHeight: 0.95,
              textShadow:
                '0 0 30px rgba(236,88,56,0.70), 0 0 70px rgba(236,88,56,0.35), 0 0 130px rgba(236,88,56,0.15)',
            }}
          >
            CHAMPION
          </h1>
        </div>

        {/* Champion card */}
        <div className="reveal-scale-in d-300" style={{ position: 'relative', marginBottom: 16 }}>
          <div
            style={{
              width: 260,
              height: 360,
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
                {/* Warm colour overlay */}
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
                padding: '18px 18px 22px',
              }}
            >
              <div
                style={{
                  background: 'rgba(6,10,5,0.72)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(250,255,254,0.09)',
                  borderRadius: 10,
                  padding: '12px 16px',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.9rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    margin: '0 0 3px',
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
                      fontSize: '0.85rem',
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

        {/* Path to the top */}
        {path.length > 0 && (
          <div className="reveal-fade-up d-500">
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.20em',
                textTransform: 'uppercase',
                color: 'rgba(250,255,254,0.25)',
                textAlign: 'center',
                margin: '0 0 12px',
              }}
            >
              PATH TO THE TOP
            </p>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {path.flatMap((item, i) => [
                i > 0 ? (
                  <div
                    key={`arrow-${i}`}
                    style={{
                      width: 36,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingBottom: 28,
                      color: 'rgba(250,255,254,0.18)',
                      fontSize: '1rem',
                    }}
                  >
                    →
                  </div>
                ) : null,
                <div
                  key={item.itemId}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                >
                  <div
                    style={{
                      width: 105,
                      height: 158,
                      borderRadius: 8,
                      overflow: 'hidden',
                      position: 'relative',
                      outline: '1px solid rgba(255,255,255,0.06)',
                      flexShrink: 0,
                    }}
                  >
                    {item.imageUrl && (
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
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, transparent 100%)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '8px 10px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'rgba(250,255,254,0.60)',
                        lineHeight: 1.2,
                      }}
                    >
                      {item.title}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(250,255,254,0.30)',
                    }}
                  >
                    {roundLabel(i, totalRounds)}
                  </span>
                </div>,
              ])}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
