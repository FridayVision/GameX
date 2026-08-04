'use client'
import { useState, useEffect } from 'react'
import type { Item } from '@/types/item.types'
import type { PoolSourceProgress } from '@/hooks/use-player-socket'

const SOURCES = ['tmdb', 'reddit', 'wikipedia', 'web', 'claude']

const SOURCE_LABEL: Record<string, string> = {
  tmdb: 'TMDB',
  reddit: 'Reddit',
  wikipedia: 'Wikipedia',
  web: 'Web',
  claude: 'Gemini',
}

export type BoostType = 'actor' | 'genre' | 'era' | 'expand'

const BOOST_GENRES = [
  'Comedy',
  'Action',
  'Drama',
  'Thriller',
  'Horror',
  'Romance',
  'Political',
  'Sci-Fi',
  'Crime',
  'Animation',
]
const BOOST_ERAS = ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s']

const BOOST_CHIPS: { type: BoostType; label: string; icon: string }[] = [
  { type: 'actor', label: '+ Actor', icon: '🎭' },
  { type: 'genre', label: '+ Genre', icon: '🎬' },
  { type: 'era', label: '+ Era', icon: '📅' },
  { type: 'expand', label: '+ Expand', icon: '🔍' },
]

function formatVoteCount(n?: number): string {
  if (!n || n === 0) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

interface PoolCurationProps {
  pool: Item[]
  poolReady: boolean
  poolProgress: PoolSourceProgress[]
  poolFailed: boolean
  poolError: string
  bracketSize: number
  onLock: (selectedItemIds: string[]) => void
  onBoost: (type: BoostType, value: string) => void
  onRetry: () => void
  loading: boolean
  topic: string
}

export function PoolCuration({
  pool,
  poolReady,
  poolProgress,
  poolFailed,
  poolError,
  bracketSize,
  onLock,
  onBoost,
  onRetry,
  loading,
  topic,
}: PoolCurationProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeBoostType, setActiveBoostType] = useState<BoostType | null>(null)
  const [boostValue, setBoostValue] = useState('')

  // Reset selection whenever the pool is replaced (boost / retry generates new item IDs)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set())
  }, [pool])

  function toggleItem(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else if (next.size < bracketSize) {
        next.add(itemId)
      }
      return next
    })
  }

  function handleBoostChip(type: BoostType) {
    if (activeBoostType === type) {
      setActiveBoostType(null)
      setBoostValue('')
    } else {
      setActiveBoostType(type)
      setBoostValue('')
    }
  }

  function submitBoost(value: string) {
    if (!activeBoostType || !value.trim()) return
    onBoost(activeBoostType, value.trim())
    setActiveBoostType(null)
    setBoostValue('')
  }

  const isGenerating = !poolReady && !poolFailed && poolProgress.length > 0
  const canLock = selected.size === bracketSize && !loading

  if (!isGenerating && !poolReady && !poolFailed) return null

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Failed state */}
      {poolFailed && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
            style={{ background: 'rgba(236,88,56,0.12)', border: '1px solid rgba(236,88,56,0.35)' }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="#ec5838"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-[rgba(250,255,254,0.80)] text-[0.90rem] font-bold mb-2">
            Generation Failed
          </p>
          <p className="text-[rgba(250,255,254,0.35)] text-[0.72rem] max-w-[240px] leading-relaxed mb-6">
            {poolError || 'Not enough items found. Try a broader or more popular topic.'}
          </p>
          <button
            onClick={onRetry}
            disabled={loading}
            className="h-[46px] px-8 bg-[#ec5838] text-white font-bold text-[0.90rem] rounded-[12px] flex items-center gap-2 disabled:opacity-30 transition-all active:scale-[0.97]"
          >
            {loading ? 'Retrying…' : 'Try Again'}
          </button>
        </div>
      )}

      {/* Progress overlay */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
          <p className="text-[rgba(250,255,254,0.50)] text-[0.62rem] uppercase tracking-[0.22em] font-bold mb-6">
            Generating Pool for &ldquo;{topic}&rdquo;
          </p>
          <div className="w-full max-w-[280px] flex flex-col gap-3">
            {SOURCES.map((src) => {
              const prog = poolProgress.find((p) => p.source === src)
              return (
                <div key={src} className="flex items-center gap-3">
                  <div className="w-[68px] text-[0.60rem] font-bold text-[rgba(250,255,254,0.35)] uppercase tracking-wider">
                    {SOURCE_LABEL[src]}
                  </div>
                  {!prog ? (
                    <div className="flex-1 h-[2px] bg-[rgba(250,255,254,0.06)] rounded-full" />
                  ) : prog.status === 'fetching' ? (
                    <div className="flex-1 h-[2px] rounded-full overflow-hidden bg-[rgba(250,255,254,0.06)]">
                      <div
                        className="h-full bg-[#ec5838] rounded-full animate-pulse"
                        style={{ width: '60%' }}
                      />
                    </div>
                  ) : prog.status === 'done' ? (
                    <>
                      <div className="flex-1 h-[2px] bg-[#ec5838] rounded-full" />
                      <span className="text-[0.58rem] text-[rgba(250,255,254,0.35)] font-medium w-[28px] text-right">
                        {prog.count}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 h-[2px] bg-[rgba(250,255,254,0.12)] rounded-full" />
                      <span className="text-[0.55rem] text-[rgba(236,88,56,0.55)] font-medium">
                        err
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[rgba(250,255,254,0.20)] text-[0.60rem] mt-8">
            Finding the best items — this takes about 15 seconds
          </p>
        </div>
      )}

      {/* Pool grid */}
      {poolReady && (
        <>
          {/* Selection header */}
          <div className="shrink-0 px-5 pt-4 pb-3 border-b border-[rgba(250,255,254,0.06)] flex items-center justify-between">
            <div>
              <p className="text-[rgba(250,255,254,0.50)] text-[0.56rem] uppercase tracking-[0.22em] font-bold">
                Select Items
              </p>
              <p className="text-[rgba(250,255,254,0.25)] text-[0.60rem] mt-0.5">
                Pick exactly {bracketSize} to advance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[1.1rem] font-black tabular-nums"
                style={{
                  color: selected.size === bracketSize ? '#ec5838' : 'rgba(250,255,254,0.45)',
                }}
              >
                {selected.size}
              </span>
              <span className="text-[rgba(250,255,254,0.25)] text-[0.75rem] font-medium">
                / {bracketSize}
              </span>
            </div>
          </div>

          {/* Boost chips */}
          <div className="shrink-0 px-5 py-3 border-b border-[rgba(250,255,254,0.06)] flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {BOOST_CHIPS.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => handleBoostChip(type)}
                  disabled={loading}
                  className="h-[32px] px-3 rounded-[8px] text-[0.70rem] font-bold transition-all disabled:opacity-30 flex items-center gap-1.5"
                  style={{
                    background:
                      activeBoostType === type ? 'rgba(236,88,56,0.18)' : 'rgba(250,255,254,0.05)',
                    border:
                      activeBoostType === type
                        ? '1px solid rgba(236,88,56,0.55)'
                        : '1px solid rgba(250,255,254,0.10)',
                    color: activeBoostType === type ? '#ec5838' : 'rgba(250,255,254,0.45)',
                  }}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Contextual boost input */}
            {activeBoostType === 'actor' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Actor name (e.g. Kamal Haasan, Vivek…)"
                  value={boostValue}
                  onChange={(e) => setBoostValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitBoost(boostValue)}
                  autoFocus
                  className="flex-1 h-[34px] bg-[rgba(8,8,8,0.65)] border border-[rgba(250,255,254,0.11)] rounded-[8px] px-3 text-[0.78rem] text-[rgba(250,255,254,0.85)] placeholder:text-[rgba(250,255,254,0.20)] focus:outline-none focus:border-[rgba(236,88,56,0.45)]"
                />
                <button
                  onClick={() => submitBoost(boostValue)}
                  disabled={!boostValue.trim() || loading}
                  className="shrink-0 h-[34px] px-4 rounded-[8px] text-[0.72rem] font-bold disabled:opacity-30"
                  style={{
                    background: 'rgba(236,88,56,0.12)',
                    border: '1px solid rgba(236,88,56,0.35)',
                    color: '#ec5838',
                  }}
                >
                  Boost
                </button>
              </div>
            )}

            {activeBoostType === 'genre' && (
              <div className="flex gap-1.5 flex-wrap">
                {BOOST_GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => submitBoost(g)}
                    disabled={loading}
                    className="h-[30px] px-3 rounded-[8px] text-[0.68rem] font-bold transition-all disabled:opacity-30"
                    style={{
                      background: 'rgba(250,255,254,0.05)',
                      border: '1px solid rgba(250,255,254,0.12)',
                      color: 'rgba(250,255,254,0.55)',
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {activeBoostType === 'era' && (
              <div className="flex gap-1.5 flex-wrap">
                {BOOST_ERAS.map((era) => (
                  <button
                    key={era}
                    onClick={() => submitBoost(era)}
                    disabled={loading}
                    className="h-[30px] px-3 rounded-[8px] text-[0.68rem] font-bold transition-all disabled:opacity-30"
                    style={{
                      background: 'rgba(250,255,254,0.05)',
                      border: '1px solid rgba(250,255,254,0.12)',
                      color: 'rgba(250,255,254,0.55)',
                    }}
                  >
                    {era}
                  </button>
                ))}
              </div>
            )}

            {activeBoostType === 'expand' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Expand to adjacent topic (e.g. Tamil 90s action…)"
                  value={boostValue}
                  onChange={(e) => setBoostValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitBoost(boostValue)}
                  autoFocus
                  className="flex-1 h-[34px] bg-[rgba(8,8,8,0.65)] border border-[rgba(250,255,254,0.11)] rounded-[8px] px-3 text-[0.78rem] text-[rgba(250,255,254,0.85)] placeholder:text-[rgba(250,255,254,0.20)] focus:outline-none focus:border-[rgba(236,88,56,0.45)]"
                />
                <button
                  onClick={() => submitBoost(boostValue)}
                  disabled={!boostValue.trim() || loading}
                  className="shrink-0 h-[34px] px-4 rounded-[8px] text-[0.72rem] font-bold disabled:opacity-30"
                  style={{
                    background: 'rgba(236,88,56,0.12)',
                    border: '1px solid rgba(236,88,56,0.35)',
                    color: '#ec5838',
                  }}
                >
                  Boost
                </button>
              </div>
            )}
          </div>

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pool.map((item, index) => {
                const isSelected = selected.has(item.itemId)
                const isDisabled = !isSelected && selected.size >= bracketSize
                const voteCountStr = formatVoteCount(item.voteCount)
                return (
                  <button
                    key={item.itemId}
                    onClick={() => !isDisabled && toggleItem(item.itemId)}
                    className="relative rounded-[12px] overflow-hidden text-left transition-all active:scale-[0.97]"
                    style={{
                      background: '#111',
                      border: isSelected ? '2px solid #ec5838' : '1px solid rgba(250,255,254,0.10)',
                      opacity: isDisabled ? 0.35 : 1,
                    }}
                  >
                    {/* Image */}
                    <div className="w-full aspect-[2/3] bg-[rgba(250,255,254,0.04)] relative">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[rgba(250,255,254,0.15)] text-[0.65rem] font-bold uppercase tracking-wide text-center px-2">
                            {item.title}
                          </span>
                        </div>
                      )}

                      {/* Rank badge — top left */}
                      <div
                        className="absolute top-1.5 left-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
                      >
                        <span className="text-[0.52rem] font-black text-[rgba(250,255,254,0.70)] tabular-nums leading-none">
                          {index + 1}
                        </span>
                      </div>

                      {/* Rating badge — top right */}
                      {item.voteAverage != null && item.voteAverage > 0 && (
                        <div
                          className="absolute top-1.5 right-1.5 h-[20px] px-1.5 rounded-full flex items-center gap-0.5"
                          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
                        >
                          <svg width="7" height="7" viewBox="0 0 24 24" fill="#f5c518">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-[0.52rem] font-bold text-[rgba(250,255,254,0.80)] tabular-nums">
                            {item.voteAverage.toFixed(1)}
                          </span>
                        </div>
                      )}

                      {/* Selected overlay */}
                      {isSelected && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(236,88,56,0.20)' }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: '#ec5838' }}
                          >
                            <svg
                              width="12"
                              height="12"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-2.5 py-2">
                      <p className="text-[rgba(250,255,254,0.90)] text-[0.72rem] font-bold leading-tight line-clamp-2">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.contextLine && (
                          <span className="text-[rgba(250,255,254,0.35)] text-[0.58rem]">
                            {item.contextLine}
                          </span>
                        )}
                        {voteCountStr && (
                          <span
                            className="text-[0.52rem] font-bold px-1 rounded"
                            style={{
                              background: 'rgba(250,255,254,0.06)',
                              color: 'rgba(250,255,254,0.35)',
                            }}
                          >
                            {voteCountStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lock button */}
          <div className="shrink-0 border-t border-[rgba(250,255,254,0.07)] px-5 pt-4 pb-5">
            <button
              disabled={!canLock}
              onClick={() => onLock([...selected])}
              className="w-full h-[50px] bg-[#ec5838] text-white font-bold text-[0.97rem] rounded-[12px] flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
            >
              {loading ? (
                'Locking Pool…'
              ) : (
                <>
                  Lock Pool &amp; Enter Lobby
                  <svg
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            {selected.size < bracketSize && (
              <p className="text-[rgba(250,255,254,0.25)] text-[0.60rem] text-center mt-1.5">
                Select {bracketSize - selected.size} more item
                {bracketSize - selected.size !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
