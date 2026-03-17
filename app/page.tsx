import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPhases } from '@/lib/data'
import PhaseCard from '@/app/components/PhaseCard'
import HeroSection from '@/app/components/HeroSection'
import StatsBar from '@/app/components/StatsBar'

export const metadata: Metadata = {
  title: 'StackMind — Deep-Dive Developer Learning',
  description: 'Master JavaScript, TypeScript, SQL, MongoDB, Fastify, DSA and more with concept-by-concept deep dives. From junior to SDE 2/3 level — free for everyone.',
  keywords: ['developer learning', 'javascript deep dive', 'typescript tutorial', 'SQL for developers', 'DSA patterns', 'backend architecture', 'full stack developer guide'],
  openGraph: {
    title: 'StackMind — Deep-Dive Developer Learning',
    description: 'Master the full developer stack with 114 concept deep-dives across 10 phases.',
    type: 'website',
    url: 'https://stackmind.in',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StackMind — Deep-Dive Developer Learning',
    description: '114 concepts. 10 phases. Junior to SDE 2/3. Free.',
  },
}

export default function HomePage() {
  const phases = getAllPhases()

  return (
    <main className="min-h-screen bg-[#080B11] text-white">
      <HeroSection />
      <StatsBar />

      {/* Phase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-16">
          <p className="text-xs font-mono tracking-[0.3em] text-[#00C17C] uppercase mb-4">
            10 Phases · 114 Concepts
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Pick your deep dive
          </h2>
          <p className="mt-4 text-lg text-[#8892A4] max-w-2xl">
            Each phase is a complete learning module — theory, code, real bugs, and challenges.
            Go in any order. Everything is free.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {phases.map((phase, index) => (
            <PhaseCard key={phase.id} phase={phase} index={index} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-[#1A2332] py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-mono tracking-[0.3em] text-[#8892A4] uppercase mb-6">
            Open Source · No Login · Always Free
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Built for developers who want to go deep
          </h2>
          <p className="text-[#8892A4] text-lg max-w-2xl mx-auto">
            Not another tutorial that shows you the syntax.
            StackMind explains the <em className="text-white not-italic font-semibold">why</em> — internals, trade-offs, real bugs, SDE 2/3 patterns.
          </p>
        </div>
      </section>
    </main>
  )
}
