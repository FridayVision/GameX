'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { PoolCuration, type BoostType } from '@/components/host/pool-curation'
import { usePlayerSocket } from '@/hooks/use-player-socket'
import { HOST_COLOUR } from '@/lib/colours'

type BracketOption = 8 | 16 | 32

const ROUNDS: Record<BracketOption, number> = { 8: 3, 16: 4, 32: 5 }
const POOL_SIZES: Record<BracketOption, number> = { 8: 12, 16: 24, 32: 48 }

export default function HostSetupPage() {
  const router = useRouter()

  // Form state
  const [hostName, setHostName] = useState('')
  const [topic, setTopic] = useState('')
  const [bracketSize, setBracketSize] = useState<BracketOption>(16)

  // Room + socket state (set after Create Room)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [playerToken, setPlayerToken] = useState<string | null>(null)
  const [hostToken, setHostToken] = useState<string | null>(null)

  // Loading + error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Phase: 'config' until room created + pool gen started; 'curating' after
  const phase = roomCode ? 'curating' : 'config'

  // Socket hook — only active after room is created
  const { roomState } = usePlayerSocket(roomId, playerToken)

  const trimmedName = hostName.trim()
  const trimmedTopic = topic.trim()
  const canGenerate = trimmedName.length > 0 && trimmedTopic.length > 0 && !loading

  async function handleGenerate() {
    if (!canGenerate) return
    setLoading(true)
    setError('')
    try {
      // Step 1: Create room
      const createRes = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bracketSize, hostName: trimmedName }),
      })
      if (!createRes.ok) {
        const data = await createRes.json()
        setError(data.error ?? 'Failed to create room')
        return
      }
      const { roomCode: code, roomId: rid, hostToken: ht, reclaimCode } = await createRes.json()

      // Step 2: Join as player (host is also a player)
      const joinRes = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, displayName: trimmedName, colour: HOST_COLOUR }),
      })
      if (!joinRes.ok) {
        const data = await joinRes.json()
        setError(data.error ?? 'Failed to join room')
        return
      }
      const { playerId, playerToken: pt } = await joinRes.json()

      // Store tokens immediately (so refresh can reclaim)
      sessionStorage.setItem(`hostToken_${code}`, ht)
      sessionStorage.setItem(`reclaimCode_${code}`, reclaimCode)
      sessionStorage.setItem(`playerToken_${code}`, pt)
      sessionStorage.setItem(`playerId_${code}`, playerId)
      sessionStorage.setItem(`roomId_${code}`, rid)

      // Update state — this triggers usePlayerSocket to connect
      setRoomCode(code)
      setRoomId(rid)
      setPlayerToken(pt)
      setHostToken(ht)

      // Step 3: Start pool generation (after state updates, but fire immediately)
      const genRes = await fetch('/api/pool/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ht}`,
        },
        body: JSON.stringify({ roomCode: code, topic: trimmedTopic }),
      })
      if (!genRes.ok) {
        const data = await genRes.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to start pool generation')
      }
      // Pool progress arrives via Socket.IO — no need to wait for this response
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleLock(selectedItemIds: string[]) {
    if (!roomCode || !hostToken) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pool/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostToken}`,
        },
        body: JSON.stringify({ roomCode, selectedItemIds }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to lock pool')
        return
      }
      router.push(`/room/${roomCode}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleRetry() {
    if (!roomCode || !hostToken) return
    setLoading(true)
    setError('')
    try {
      const genRes = await fetch('/api/pool/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostToken}`,
        },
        body: JSON.stringify({ roomCode, topic: trimmedTopic }),
      })
      if (!genRes.ok) {
        const data = await genRes.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to start pool generation')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleBoost(type: BoostType, value: string) {
    if (!roomCode || !hostToken || !value.trim()) return
    setLoading(true)
    try {
      await fetch('/api/pool/boost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hostToken}`,
        },
        body: JSON.stringify({
          roomCode,
          topic: trimmedTopic,
          boostType: type,
          boostKeyword: value.trim(),
          selectedItemIds: [],
        }),
      })
    } catch {
      setError('Boost failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[100dvh]">
      <LedBackground />

      <div className="relative z-10 h-[100dvh] flex flex-col px-4 pt-6 pb-4 overflow-hidden">
        {/* Header card */}
        <div className="w-full max-w-[780px] mx-auto shrink-0 mb-3">
          <div
            className="rounded-[16px] px-5 py-4 sm:px-6"
            style={{
              background: '#0e0e0e',
              border: '1px solid rgba(250,255,254,.18)',
              boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 8px 32px rgba(0,0,0,.60)',
            }}
          >
            <button
              onClick={() => {
                if (phase === 'curating') {
                  // Reset to config — abandon current room, let user start fresh
                  setRoomCode(null)
                  setRoomId(null)
                  setPlayerToken(null)
                  setHostToken(null)
                  setError('')
                } else {
                  router.push('/')
                }
              }}
              className="flex items-center gap-2 text-[rgba(250,255,254,0.60)] text-[0.85rem] font-semibold hover:text-[rgba(250,255,254,1)] transition-colors mb-3"
            >
              <span className="w-7 h-7 rounded-full border border-[rgba(250,255,254,0.20)] flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
              </span>
              Back
            </button>
            <h1 className="text-[rgba(250,255,254,1)] text-[2rem] sm:text-[2.4rem] font-black leading-none tracking-[-0.03em] uppercase">
              {phase === 'config' ? 'Host Setup' : 'Curate Pool'}
            </h1>
            <p className="text-[rgba(250,255,254,0.45)] text-[0.75rem] mt-1.5 font-medium">
              {phase === 'config'
                ? 'Configure your game — room code is generated after generating items'
                : `Topic: ${trimmedTopic} · Room ${roomCode}`}
            </p>
          </div>
        </div>

        {/* Main card */}
        <div
          className="w-full max-w-[780px] mx-auto flex-1 flex flex-col rounded-[20px] overflow-hidden min-h-0"
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.18)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 16px 56px rgba(0,0,0,.70)',
          }}
        >
          {error && (
            <p className="px-6 pt-4 text-[#ec5838] text-[0.72rem] font-medium text-center shrink-0">
              {error}
            </p>
          )}

          {phase === 'config' ? (
            <>
              {/* Settings section */}
              <div className="shrink-0 px-5 pt-6 pb-5 sm:px-8 sm:pt-7 border-b border-[rgba(250,255,254,0.07)]">
                <div className="flex flex-col sm:flex-row sm:gap-8">
                  {/* Left: Name + Topic */}
                  <div className="flex-1 flex flex-col gap-5 mb-5 sm:mb-0">
                    {/* Host name */}
                    <div>
                      <label className="block text-[rgba(250,255,254,0.50)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        maxLength={25}
                        placeholder="What do people call you?"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        autoCapitalize="words"
                        spellCheck={false}
                        className="w-full h-[46px] bg-[rgba(8,8,8,0.65)] border border-[rgba(250,255,254,0.13)] rounded-[10px] px-4 font-bold text-[0.90rem] text-[rgba(250,255,254,1)] placeholder:text-[rgba(250,255,254,0.26)] focus:outline-none focus:border-[rgba(236,88,56,0.60)] transition-colors"
                      />
                    </div>

                    {/* Topic */}
                    <div>
                      <label className="block text-[rgba(250,255,254,0.50)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-2">
                        Topic
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bollywood Movies, Marvel Superheroes…"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        autoComplete="off"
                        className="w-full h-[46px] bg-[rgba(8,8,8,0.65)] border border-[rgba(250,255,254,0.13)] rounded-[10px] px-4 font-medium text-[0.90rem] text-[rgba(250,255,254,1)] placeholder:text-[rgba(250,255,254,0.26)] focus:outline-none focus:border-[rgba(236,88,56,0.60)] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Right: Bracket size */}
                  <div className="shrink-0 sm:w-[210px]">
                    <label className="block text-[rgba(250,255,254,0.50)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-2">
                      Bracket Size
                    </label>
                    <div className="flex gap-2 mb-2">
                      {([8, 16, 32] as BracketOption[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => setBracketSize(size)}
                          className="flex-1 h-[40px] rounded-[9px] font-bold text-[0.95rem] transition-all"
                          style={{
                            background:
                              bracketSize === size ? 'rgba(236,88,56,0.13)' : 'rgba(8,8,8,0.70)',
                            border:
                              bracketSize === size
                                ? '1px solid rgba(236,88,56,0.60)'
                                : '1px solid rgba(250,255,254,0.11)',
                            color: bracketSize === size ? '#ec5838' : 'rgba(250,255,254,0.38)',
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold uppercase tracking-wide"
                        style={{
                          background: 'rgba(236,88,56,0.11)',
                          border: '1px solid rgba(236,88,56,0.28)',
                          color: '#ec5838',
                        }}
                      >
                        {ROUNDS[bracketSize]} Rounds
                      </span>
                      <span className="text-[rgba(250,255,254,0.30)] text-[0.63rem]">
                        {POOL_SIZES[bracketSize]} options · pick {bracketSize}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty placeholder */}
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[rgba(250,255,254,0.16)] text-[0.78rem] text-center max-w-[200px] leading-relaxed">
                  Enter your name and topic,
                  <br />
                  then generate the item pool
                </p>
              </div>

              {/* Bottom bar */}
              <div className="shrink-0 border-t border-[rgba(250,255,254,0.07)] px-5 pt-4 pb-5 sm:px-8 sm:pb-6">
                <button
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  className="w-full h-[50px] bg-[#ec5838] text-white font-bold text-[0.97rem] rounded-[12px] shadow-[0_0_20px_rgba(236,88,56,0.24)] flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
                >
                  {loading ? (
                    'Setting up…'
                  ) : (
                    <>
                      Generate Items
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
                <p className="text-[rgba(250,255,254,0.25)] text-[0.62rem] text-center mt-1.5">
                  Room code is generated here — share it with your players
                </p>
              </div>
            </>
          ) : (
            /* Curating phase */
            <PoolCuration
              pool={roomState.pool}
              poolReady={roomState.poolReady}
              poolProgress={roomState.poolProgress}
              poolFailed={roomState.poolFailed}
              poolError={roomState.poolError}
              bracketSize={bracketSize}
              onLock={handleLock}
              onBoost={handleBoost}
              onRetry={handleRetry}
              loading={loading}
              topic={trimmedTopic}
            />
          )}
        </div>
      </div>
    </div>
  )
}
