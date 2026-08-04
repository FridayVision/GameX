'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LedBackground } from '@/components/shared/led-background'

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')

  function handleJoin() {
    const code = joinCode.trim()
    if (code.length === 0) return
    router.push(`/room/${code}/join`)
  }

  return (
    <main className="flex flex-col min-h-[100dvh] selection:bg-[#ec5838] selection:text-white">
      <LedBackground />

      <div className="relative z-10 w-full max-w-[390px] mx-auto flex-grow flex flex-col items-center justify-center px-5 h-[100dvh]">
        <div
          className="w-full rounded-[20px] px-7 py-10 flex flex-col items-center"
          style={{
            background: '#0e0e0e',
            border: '1px solid rgba(250,255,254,0.18)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.8), 0 16px 56px rgba(0,0,0,0.7)',
          }}
        >
          {/* Identity */}
          <section className="flex flex-col items-center text-center mb-8 w-full shrink-0">
            <h1
              className="text-[rgba(250,255,254,1)] text-[3.8rem] font-black leading-none mb-3 tracking-[-0.04em] uppercase"
              style={{ transform: 'scaleX(1.05)' }}
            >
              GameX
            </h1>
            <h2 className="text-[rgba(250,255,254,0.80)] text-[1rem] italic font-medium tracking-wide mb-3">
              Argue. Defend. Deceive.
            </h2>
            <p className="text-[rgba(250,255,254,0.60)] text-[0.75rem] max-w-[240px] leading-relaxed mx-auto font-medium">
              A secret-assignment debate tournament for 3–8 players
            </p>
          </section>

          <div className="w-full h-[1px] bg-[rgba(250,255,254,0.10)] mb-8 shrink-0" />

          {/* Host A Game */}
          <section className="flex flex-col items-center w-full mb-7 shrink-0">
            <h3 className="text-[rgba(250,255,254,0.70)] text-[0.62rem] uppercase tracking-[0.25em] font-bold mb-4">
              Host A Game
            </h3>
            <button
              onClick={() => router.push('/host/setup')}
              className="w-full h-[56px] bg-[#ec5838] text-white font-bold text-[1.1rem] rounded-[12px] shadow-[0_0_24px_rgba(236,88,56,0.30)] flex items-center justify-center transition-all active:scale-[0.97]"
            >
              Create Room
            </button>
            <p className="text-[rgba(250,255,254,0.55)] text-[0.72rem] mt-3 tracking-wide">
              Set up items, then share the code
            </p>
          </section>

          {/* OR separator */}
          <div className="flex items-center w-full mb-7 shrink-0">
            <div className="flex-grow h-[1px] bg-[rgba(250,255,254,0.10)]" />
            <span className="px-5 text-[rgba(250,255,254,0.55)] text-[0.65rem] uppercase tracking-[0.2em] font-bold">
              Or
            </span>
            <div className="flex-grow h-[1px] bg-[rgba(250,255,254,0.10)]" />
          </div>

          {/* Join A Game */}
          <section className="flex flex-col items-center w-full shrink-0">
            <h3 className="text-[rgba(250,255,254,0.70)] text-[0.62rem] uppercase tracking-[0.25em] font-bold mb-5">
              Join A Game
            </h3>
            <div className="w-full flex flex-col gap-4">
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full h-[52px] bg-[rgba(8,8,8,0.60)] border border-[rgba(250,255,254,0.16)] rounded-[10px] text-center font-bold text-lg tracking-[0.25em] text-[rgba(250,255,254,1)] placeholder:text-[rgba(250,255,254,0.30)] placeholder:tracking-widest placeholder:font-medium focus:outline-none focus:border-[rgba(236,88,56,0.70)] transition-colors"
                autoComplete="off"
              />
              <button
                onClick={handleJoin}
                disabled={joinCode.length === 0}
                className="w-full h-[52px] border-[1.5px] border-[#ec5838] text-[#ec5838] font-bold text-[1.1rem] rounded-[10px] flex items-center justify-center bg-transparent disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.97] hover:bg-[rgba(236,88,56,0.06)]"
              >
                Join Room
              </button>
            </div>
            <p className="text-[rgba(250,255,254,0.55)] text-[0.72rem] mt-4 tracking-wide">
              No account needed
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
