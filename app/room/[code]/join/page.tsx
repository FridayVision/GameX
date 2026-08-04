'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'
import { JoinForm } from '@/components/player/join-form'

type PageMode = 'join' | 'reclaim'

interface RoomInfo {
  roomId: string
  roomCode: string
  bracketSize: number
  status: string
  hostName: string
  takenColours: string[]
}

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [mode, setMode] = useState<PageMode>('join')
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [reclaimInput, setReclaimInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/room/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.roomId) setRoomInfo(data)
        else setError('Room not found')
      })
      .catch(() => setError('Could not load room info'))
  }, [code])

  async function handleJoin(displayName: string, colour: string) {
    if (!roomInfo) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, displayName, colour }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to join')
        return
      }
      const { playerId, playerToken } = data
      sessionStorage.setItem(`playerToken_${code}`, playerToken)
      sessionStorage.setItem(`playerId_${code}`, playerId)
      sessionStorage.setItem(`roomId_${code}`, roomInfo.roomId)
      router.push(`/room/${code}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleReclaim() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/room/reclaim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, reclaimCode: reclaimInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(res.status === 401 ? 'Invalid reclaim code' : (data.error ?? 'Failed to reclaim'))
        return
      }
      const { hostToken, playerToken, playerId, roomId } = data
      sessionStorage.setItem(`hostToken_${code}`, hostToken)
      sessionStorage.setItem(`playerToken_${code}`, playerToken)
      sessionStorage.setItem(`playerId_${code}`, playerId)
      sessionStorage.setItem(`roomId_${code}`, roomId)
      router.push(`/room/${code}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[100dvh]">
      <LedBackground />

      <div className="relative z-10 h-[100dvh] flex flex-col px-4 pt-6 pb-4 overflow-hidden">
        {/* Header card */}
        <div className="w-full max-w-[390px] mx-auto shrink-0 mb-3">
          <div
            className="rounded-[16px] px-5 py-4"
            style={{
              background: '#0e0e0e',
              border: '1px solid rgba(250,255,254,.18)',
              boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 8px 32px rgba(0,0,0,.60)',
            }}
          >
            <button
              onClick={() => (mode === 'reclaim' ? setMode('join') : router.push('/'))}
              className="flex items-center gap-2 text-[rgba(250,255,254,0.50)] text-[0.82rem] font-semibold hover:text-[rgba(250,255,254,0.80)] transition-colors mb-3"
            >
              <span className="w-6 h-6 rounded-full border border-[rgba(250,255,254,0.18)] flex items-center justify-center hover:border-[rgba(250,255,254,0.40)] transition-colors">
                <svg
                  width="10"
                  height="10"
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
            <h1 className="text-[rgba(250,255,254,1)] text-[1.85rem] font-black leading-none tracking-[-0.03em] uppercase mb-1.5">
              {mode === 'reclaim' ? 'Reclaim Session' : 'Join Room'}
            </h1>
            {roomInfo && (
              <p className="text-[rgba(250,255,254,0.35)] text-[0.70rem] font-medium">
                Room <span style={{ color: '#ec5838', fontWeight: 700 }}>{code}</span>
                {roomInfo.hostName && (
                  <>
                    <span className="text-[rgba(250,255,254,0.20)] mx-1.5">·</span>
                    <span className="text-[rgba(250,255,254,0.30)]">Host: {roomInfo.hostName}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Main card */}
        <div
          className="w-full max-w-[390px] mx-auto flex-1 flex flex-col rounded-[20px] overflow-hidden min-h-0"
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,.18)',
            boxShadow: '0 0 0 1px rgba(0,0,0,.8),0 16px 56px rgba(0,0,0,.70)',
          }}
        >
          {error && (
            <p className="px-6 pt-4 text-[#ec5838] text-[0.72rem] font-medium text-center">
              {error}
            </p>
          )}

          {mode === 'join' ? (
            <>
              {roomInfo ? (
                <JoinForm
                  takenColours={roomInfo.takenColours}
                  onJoin={handleJoin}
                  loading={loading}
                  roomCode={code}
                  hostName={roomInfo.hostName}
                />
              ) : !error ? (
                <div className="flex-1 flex items-center justify-center text-[rgba(250,255,254,0.30)] text-[0.80rem]">
                  Loading…
                </div>
              ) : null}

              {/* Host reclaim section */}
              <div
                className="shrink-0 mx-6 mb-4 rounded-[12px] px-4 py-3 flex items-center justify-between"
                style={{
                  background: 'rgba(236,88,56,0.06)',
                  border: '1px solid rgba(236,88,56,0.22)',
                }}
              >
                <div>
                  <p className="text-[rgba(250,255,254,0.55)] text-[0.72rem] font-semibold">
                    Already the host?
                  </p>
                  <p className="text-[rgba(250,255,254,0.28)] text-[0.60rem]">
                    Use your reclaim code to get back in
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMode('reclaim')
                    setError('')
                  }}
                  className="shrink-0 ml-3 px-3 h-[34px] rounded-[8px] text-[0.72rem] font-bold transition-all active:scale-[0.97]"
                  style={{
                    background: 'rgba(236,88,56,0.15)',
                    border: '1px solid rgba(236,88,56,0.45)',
                    color: '#ec5838',
                  }}
                >
                  I&apos;m the host
                </button>
              </div>
            </>
          ) : (
            /* Reclaim mode */
            <div className="flex-1 flex flex-col px-6 pt-8">
              <p className="text-[rgba(250,255,254,0.45)] text-[0.56rem] uppercase tracking-[0.26em] font-bold mb-3">
                Host Reclaim Code
              </p>
              <input
                type="text"
                maxLength={4}
                placeholder="ab99"
                value={reclaimInput}
                onChange={(e) => setReclaimInput(e.target.value.toLowerCase().slice(0, 4))}
                className="w-full h-[56px] bg-[rgba(8,8,8,0.65)] border border-[rgba(250,255,254,0.14)] rounded-[10px] px-4 font-mono font-bold text-[1.4rem] tracking-[0.30em] text-[rgba(250,255,254,1)] placeholder:text-[rgba(250,255,254,0.20)] placeholder:tracking-widest focus:outline-none focus:border-[rgba(236,88,56,0.65)] transition-colors"
                autoComplete="off"
                autoFocus
              />
              <p className="text-[rgba(250,255,254,0.25)] text-[0.62rem] mt-2">
                Enter the 4-character code shown when you created the room
              </p>

              <div className="mt-6">
                <button
                  disabled={reclaimInput.length !== 4 || loading}
                  onClick={handleReclaim}
                  className="w-full h-[52px] bg-[#ec5838] text-white font-bold text-[1rem] rounded-[12px] flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
                >
                  {loading ? (
                    'Reclaiming…'
                  ) : (
                    <>
                      Reclaim
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
