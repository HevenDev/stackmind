'use client'

import { useEffect, useRef, useState } from 'react'

const WORDS = ['JavaScript', 'TypeScript', 'SQL', 'MongoDB', 'Fastify', 'DSA', 'Security', 'Drizzle']

export default function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setWordIndex(i => (i + 1) % WORDS.length)
        setVisible(true)
      }, 300)
    }, 2000)
    return () => clearInterval(cycle)
  }, [])

  return (
    <section className="relative overflow-hidden pt-32 pb-24 px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(#00C17C 1px, transparent 1px),
            linear-gradient(90deg, #00C17C 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-[0.08] blur-[120px]"
        style={{ background: 'radial-gradient(ellipse, #00C17C 0%, transparent 70%)' }}
      />

      <div className="relative max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00C17C]/20 bg-[#00C17C]/5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00C17C] animate-pulse" />
          <span className="text-xs font-mono text-[#00C17C] tracking-wider">10 PHASES · FREE · NO LOGIN</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black leading-[0.95] tracking-tight mb-8">
          <span className="text-white block">Go deep on</span>
          <span
            className="block mt-2 transition-all duration-300"
            style={{
              color: '#00C17C',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(-8px)',
            }}
          >
            {WORDS[wordIndex]}
          </span>
          <span className="text-white block mt-2">for real.</span>
        </h1>

        <p className="text-lg sm:text-xl text-[#8892A4] max-w-2xl leading-relaxed mb-12">
          114 concept deep-dives across 10 phases. Each one explains the{' '}
          <span className="text-white font-medium">internals</span>,{' '}
          <span className="text-white font-medium">real bugs</span>, and{' '}
          <span className="text-white font-medium">SDE 2/3 patterns</span>{' '}
          — not just syntax.
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <a
            href="#phases"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-[#00C17C] text-[#080B11] hover:bg-[#00D988] transition-colors"
          >
            Start Learning
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <span className="text-[#8892A4] text-sm font-mono">
            Junior → SDE 2/3
          </span>
        </div>
      </div>
    </section>
  )
}
