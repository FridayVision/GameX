'use client'
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

interface BoardPoolProgressProps {
  topic: string
  bracketSize: number
  poolProgress: PoolSourceProgress[]
  pool: Item[]
  poolReady: boolean
}

export function BoardPoolProgress({
  topic,
  bracketSize,
  poolProgress,
  pool,
  poolReady,
}: BoardPoolProgressProps) {
  if (poolReady) {
    return (
      <div className="relative z-10 h-[100dvh] flex flex-col items-center justify-start px-6 pt-10 pb-6 overflow-hidden">
        {/* Header */}
        <div className="mb-6 text-center">
          <p
            className="text-[0.60rem] uppercase tracking-[0.3em] font-bold mb-2"
            style={{ color: 'rgba(250,255,254,0.40)' }}
          >
            Pool Ready
          </p>
          <h2
            className="text-[clamp(1.4rem,4vw,2.2rem)] font-black uppercase tracking-[-0.02em] leading-none"
            style={{ color: 'rgba(250,255,254,0.95)' }}
          >
            {topic}
          </h2>
          <p className="text-[rgba(250,255,254,0.30)] text-[0.70rem] mt-2">
            {pool.length} items · host is selecting {bracketSize}
          </p>
        </div>

        {/* Pool grid */}
        <div className="w-full max-w-[900px] flex-1 overflow-y-auto scroll-thin">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {pool.map((item) => (
              <div
                key={item.itemId}
                className="rounded-[10px] overflow-hidden"
                style={{
                  background: '#111',
                  border: '1px solid rgba(250,255,254,0.08)',
                }}
              >
                <div className="w-full aspect-[2/3] bg-[rgba(250,255,254,0.04)]">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center px-1">
                      <span className="text-[rgba(250,255,254,0.25)] text-[0.50rem] text-center leading-tight">
                        {item.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-1.5 py-1.5">
                  <p className="text-[rgba(250,255,254,0.75)] text-[0.55rem] font-semibold leading-tight line-clamp-2">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isGenerating = poolProgress.length > 0

  return (
    <div className="relative z-10 h-[100dvh] flex flex-col items-center justify-center px-6">
      {isGenerating ? (
        <>
          <p
            className="text-[0.60rem] uppercase tracking-[0.3em] font-bold mb-3"
            style={{ color: 'rgba(250,255,254,0.40)' }}
          >
            Generating Pool
          </p>
          <h2
            className="text-[clamp(2rem,6vw,4rem)] font-black uppercase tracking-[-0.02em] leading-none mb-10 text-center"
            style={{ color: 'rgba(250,255,254,0.95)' }}
          >
            {topic}
          </h2>

          {/* Source progress list */}
          <div className="flex flex-col gap-4 w-full max-w-[320px]">
            {SOURCES.map((src) => {
              const prog = poolProgress.find((p) => p.source === src)
              return (
                <div key={src} className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: !prog
                        ? 'rgba(250,255,254,0.05)'
                        : prog.status === 'fetching'
                          ? 'rgba(236,88,56,0.15)'
                          : prog.status === 'done'
                            ? 'rgba(21,244,199,0.15)'
                            : 'rgba(250,255,254,0.06)',
                      border: !prog
                        ? '1px solid rgba(250,255,254,0.08)'
                        : prog.status === 'fetching'
                          ? '1px solid rgba(236,88,56,0.45)'
                          : prog.status === 'done'
                            ? '1px solid rgba(21,244,199,0.45)'
                            : '1px solid rgba(250,255,254,0.12)',
                    }}
                  >
                    {prog?.status === 'fetching' && (
                      <div className="w-2 h-2 rounded-full bg-[#ec5838] animate-pulse" />
                    )}
                    {prog?.status === 'done' && (
                      <svg
                        width="10"
                        height="10"
                        fill="none"
                        stroke="#15f4c7"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {prog?.status === 'error' && (
                      <svg
                        width="10"
                        height="10"
                        fill="none"
                        stroke="rgba(250,255,254,0.30)"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                  </div>

                  {/* Label + count */}
                  <div className="flex-1">
                    <p
                      className="text-[0.78rem] font-bold"
                      style={{
                        color: !prog
                          ? 'rgba(250,255,254,0.20)'
                          : prog.status === 'done'
                            ? 'rgba(250,255,254,0.85)'
                            : 'rgba(250,255,254,0.55)',
                      }}
                    >
                      {SOURCE_LABEL[src]}
                    </p>
                  </div>

                  {prog?.status === 'done' && (
                    <span className="text-[0.65rem] font-bold text-[rgba(250,255,254,0.30)]">
                      {prog.count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-[rgba(250,255,254,0.20)] text-[0.80rem] font-medium">
            Waiting for host to generate pool&hellip;
          </p>
        </div>
      )}
    </div>
  )
}
