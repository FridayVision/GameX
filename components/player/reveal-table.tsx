'use client'
import { useEffect, useState } from 'react'
import type { Item } from '@/types/item.types'
import type { RevealRow } from '@/hooks/use-player-socket'
import { toRgba } from '@/lib/colours'

interface PlayerRevealTableProps {
  rows: RevealRow[]
  champion: Item
  totalRounds: number
  myPlayerId: string
}

function roundColHeader(index: number, total: number): string {
  if (index === total - 1) return 'Final'
  if (index === total - 2 && total > 2) return 'Semi'
  return `R${index + 1}`
}

export function PlayerRevealTable({
  rows,
  champion,
  totalRounds,
  myPlayerId,
}: PlayerRevealTableProps) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setTimeout(() => setLoaded(true), 80))
  }, [])

  return (
    <div
      className={`h-[100dvh] flex flex-col${loaded ? ' is-loaded' : ''}`}
      style={{ position: 'relative', background: '#080808', overflow: 'hidden' }}
    >
      {/* Phone LED background */}
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

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full" style={{ padding: '20px 0 0' }}>
        {/* Header card */}
        <div className="reveal-fade-up d-100 flex-shrink-0" style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              background: 'rgba(8,8,8,0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(250,255,254,0.12)',
              borderRadius: 14,
              padding: '16px 18px',
              boxShadow: '0 0 0 1px rgba(0,0,0,.85), 0 8px 28px rgba(0,0,0,.70)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '0.56rem',
                  fontWeight: 700,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.40)',
                  margin: '0 0 3px',
                }}
              >
                Post-Game Reveal
              </p>
              <h1
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: '#fafffe',
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                Who Defended What
              </h1>
            </div>
            <div
              style={{
                textAlign: 'right',
                flexShrink: 0,
                background: 'rgba(236,88,56,0.08)',
                border: '1px solid rgba(236,88,56,0.22)',
                borderRadius: 10,
                padding: '8px 12px',
              }}
            >
              <p
                style={{
                  fontSize: '0.50rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.40)',
                  margin: '0 0 2px',
                }}
              >
                Champion
              </p>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ec5838', margin: 0 }}>
                {champion.title}
              </p>
            </div>
          </div>
        </div>

        {/* Player cards — vertically stacked, scrollable */}
        <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {rows.map((row, rowIdx) => {
            const isMe = row.playerId === myPlayerId
            return (
              <div
                key={row.playerId}
                className="reveal-fade-up"
                style={{
                  transitionDelay: `${160 + rowIdx * 140}ms`,
                  marginBottom: 10,
                  background: isMe ? `rgba(8,8,8,0.96)` : 'rgba(8,8,8,0.92)',
                  backdropFilter: 'blur(12px)',
                  border: isMe
                    ? `1px solid ${toRgba(row.colour, 0.45)}`
                    : '1px solid rgba(250,255,254,0.08)',
                  boxShadow: isMe
                    ? `0 0 18px ${toRgba(row.colour, 0.2)}, 0 0 6px ${toRgba(row.colour, 0.12)}`
                    : undefined,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Name row */}
                <div
                  style={{
                    padding: '12px 14px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid rgba(250,255,254,0.07)',
                    background: toRgba(row.colour, isMe ? 0.08 : 0.04),
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: row.colour,
                      boxShadow: `0 0 8px ${toRgba(row.colour, 0.55)}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: isMe ? '0.90rem' : '0.85rem',
                      fontWeight: 800,
                      color: isMe ? '#fafffe' : 'rgba(250,255,254,0.85)',
                      flex: 1,
                    }}
                  >
                    {row.displayName}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {row.isHost && (
                      <span
                        style={{
                          fontSize: '0.48rem',
                          fontWeight: 800,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                          borderRadius: 3,
                          background: 'rgba(236,88,56,0.15)',
                          border: '1px solid rgba(236,88,56,0.35)',
                          color: '#ec5838',
                        }}
                      >
                        Host
                      </span>
                    )}
                    {isMe && (
                      <span
                        style={{
                          fontSize: '0.48rem',
                          fontWeight: 800,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                          borderRadius: 3,
                          background: 'rgba(250,255,254,0.10)',
                          border: '1px solid rgba(250,255,254,0.22)',
                          color: 'rgba(250,255,254,0.70)',
                        }}
                      >
                        You
                      </span>
                    )}
                  </div>
                </div>

                {/* Round rows */}
                {Array.from({ length: totalRounds }, (_, i) => {
                  const cell = row.rounds[i]
                  const isChamp = cell?.itemId === champion.itemId
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '9px 14px',
                        borderBottom:
                          i < totalRounds - 1 ? '1px solid rgba(250,255,254,0.05)' : undefined,
                        position: 'relative',
                      }}
                    >
                      {/* Round label */}
                      <div
                        style={{
                          background: 'rgba(250,255,254,0.07)',
                          border: '1px solid rgba(250,255,254,0.10)',
                          borderRadius: 4,
                          padding: '2px 7px',
                          fontSize: '0.52rem',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'rgba(250,255,254,0.55)',
                          minWidth: 44,
                          textAlign: 'center',
                          flexShrink: 0,
                          marginRight: 10,
                        }}
                      >
                        {roundColHeader(i, totalRounds)}
                      </div>
                      {/* Champion star + item title inline */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
                        {isChamp && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="#ec5838"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17.3l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                          </svg>
                        )}
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: isChamp ? 700 : 500,
                            color: isChamp ? '#fafffe' : 'rgba(250,255,254,0.60)',
                          }}
                        >
                          {cell ? cell.title : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
