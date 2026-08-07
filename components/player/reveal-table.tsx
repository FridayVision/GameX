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

  const gridTemplate = `140px repeat(${totalRounds}, minmax(90px, 1fr))`

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
      <div className="relative z-10 flex flex-col h-full" style={{ padding: '24px 0 24px' }}>
        {/* Header */}
        <div className="reveal-fade-up d-100 flex-shrink-0" style={{ padding: '0 20px 20px' }}>
          <div
            style={{
              background: 'rgba(8,8,8,0.85)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(250,255,254,0.10)',
              borderRadius: 14,
              padding: '16px 20px',
              boxShadow: '0 0 0 1px rgba(0,0,0,.70), 0 8px 28px rgba(0,0,0,.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.30)',
                  margin: '0 0 3px',
                }}
              >
                Post-Game Reveal
              </p>
              <h1
                style={{
                  fontSize: '1.45rem',
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
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p
                style={{
                  fontSize: '0.52rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,255,254,0.28)',
                  margin: '0 0 2px',
                }}
              >
                Champion
              </p>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ec5838', margin: 0 }}>
                {champion.title}
              </p>
            </div>
          </div>
        </div>

        {/* Table — horizontally scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: '100%' }}>
            <div style={{ minWidth: `${140 + totalRounds * 90}px` }}>
              {/* Column headers */}
              <div
                className="reveal-fade-up d-200"
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridTemplate,
                  padding: '0 16px',
                }}
              >
                <div
                  style={{
                    padding: '0 12px 10px',
                    fontSize: '0.60rem',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  Players
                </div>
                {Array.from({ length: totalRounds }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0 12px 10px',
                      fontSize: '0.60rem',
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'rgba(250,255,254,0.28)',
                    }}
                  >
                    {roundColHeader(i, totalRounds)}
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div
                className="reveal-fade-up d-200"
                style={{
                  height: 1,
                  background: 'rgba(250,255,254,0.10)',
                  margin: '0 16px 4px',
                }}
              />

              {/* Player rows */}
              {rows.map((row, rowIdx) => {
                const isMe = row.playerId === myPlayerId
                return (
                  <div
                    key={row.playerId}
                    className="reveal-fade-up"
                    style={{
                      transitionDelay: `${160 + rowIdx * 140}ms`,
                      display: 'grid',
                      gridTemplateColumns: gridTemplate,
                      alignItems: 'stretch',
                      position: 'relative',
                      margin: '0 16px',
                      borderLeft: `4px solid ${row.colour}`,
                      borderBottom: '1px solid rgba(250,255,254,0.07)',
                      background: isMe ? toRgba(row.colour, 0.06) : toRgba(row.colour, 0.03),
                    }}
                  >
                    {/* Name cell */}
                    <div
                      style={{
                        padding: '16px 12px 16px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: row.colour,
                            boxShadow: `0 0 8px ${toRgba(row.colour, 0.5)}`,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: isMe ? '0.82rem' : '0.78rem',
                            fontWeight: isMe ? 800 : 700,
                            color: isMe ? '#fafffe' : 'rgba(250,255,254,0.80)',
                            lineHeight: 1.2,
                          }}
                        >
                          {row.displayName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {row.isHost && (
                          <span
                            style={{
                              fontSize: '0.46rem',
                              fontWeight: 800,
                              letterSpacing: '0.10em',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 3,
                              background: 'rgba(236,88,56,0.13)',
                              border: '1px solid rgba(236,88,56,0.30)',
                              color: '#ec5838',
                            }}
                          >
                            Host
                          </span>
                        )}
                        {isMe && (
                          <span
                            style={{
                              fontSize: '0.46rem',
                              fontWeight: 800,
                              letterSpacing: '0.10em',
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 3,
                              background: 'rgba(250,255,254,0.08)',
                              border: '1px solid rgba(250,255,254,0.18)',
                              color: 'rgba(250,255,254,0.55)',
                            }}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Round cells */}
                    {Array.from({ length: totalRounds }, (_, i) => {
                      const cell = row.rounds[i]
                      const isChamp = cell?.itemId === champion.itemId
                      return (
                        <div
                          key={i}
                          style={{
                            position: 'relative',
                            padding: '16px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: isChamp ? 'rgba(250,255,254,0.88)' : 'rgba(250,255,254,0.45)',
                            borderLeft: '1px solid rgba(250,255,254,0.05)',
                            background: isChamp ? 'rgba(236,88,56,0.08)' : undefined,
                          }}
                        >
                          {isChamp && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 10,
                                bottom: 10,
                                width: 2,
                                background: 'rgba(236,88,56,0.62)',
                                borderRadius: 1,
                              }}
                            />
                          )}
                          {cell ? cell.title : '—'}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
