'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Phase, PhaseData, Concept } from '@/lib/data'

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'tldr',      label: 'TLDR',       icon: '⚡', desc: 'Quick summary' },
  { id: 'analogy',   label: 'Analogy',    icon: '🧠', desc: 'Real-world analogy' },
  { id: 'deep',      label: 'Deep Dive',  icon: '🔬', desc: 'Technical internals' },
  { id: 'code',      label: 'Code',       icon: '< >', desc: 'Examples' },
  { id: 'bugs',      label: 'Bugs',       icon: '🐛', desc: 'Real mistakes' },
  { id: 'challenge', label: 'Challenge',  icon: '🏆', desc: 'Test yourself' },
]

// ─── PROSE RENDERER ───────────────────────────────────────────────────────────
function Prose({ content, accentColor }: { content: string; accentColor: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />

        // Section header (ALL CAPS or ends with colon on short line)
        if (/^[A-Z][A-Z\s\d&/—–-]{4,}:?\s*$/.test(line.trim()) || 
            (line.trim().endsWith(':') && line.trim().length < 50 && !line.trim().startsWith('http'))) {
          return (
            <p key={i} className="text-xs font-mono tracking-[0.2em] uppercase mt-4 mb-2 font-semibold"
              style={{ color: accentColor }}>
              {line.trim().replace(/:$/, '')}
            </p>
          )
        }

        // Bug/numbered items
        if (/^(BUG|FIX|CHALLENGE|STEP)\s*\d+/.test(line.trim())) {
          return (
            <p key={i} className="text-sm font-bold text-white mt-3">
              {line.trim()}
            </p>
          )
        }

        // Indented sub-lines
        if (line.startsWith('   ') || line.startsWith('\t')) {
          return (
            <p key={i} className="text-sm text-[#8892A4] pl-4 leading-relaxed">
              {line.trim()}
            </p>
          )
        }

        return (
          <p key={i} className="text-sm text-[#C8D6E5] leading-relaxed">
            {line}
          </p>
        )
      })}
    </div>
  )
}

// ─── CODE BLOCK ───────────────────────────────────────────────────────────────
function CodeBlock({ content, accentColor }: { content: string; accentColor: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = content.split('\n')

  return (
    <div className="rounded-xl border border-[#1A2332] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0A0F1A] border-b border-[#1A2332]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[10px] font-mono text-[#3D4F6B] ml-2">javascript</span>
        </div>
        <button
          onClick={copy}
          className="text-[10px] font-mono transition-colors px-2 py-1 rounded"
          style={{ color: copied ? accentColor : '#5A7096' }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto bg-[#060A10]">
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="group hover:bg-[#0D1117]">
                <td className="select-none pr-4 pl-4 py-[1px] text-right text-[11px] font-mono text-[#2A3A52] w-10 align-top group-hover:text-[#3D4F6B]">
                  {i + 1}
                </td>
                <td className="pr-4 py-[1px] align-top">
                  <CodeLine line={line} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CodeLine({ line }: { line: string }) {
  if (!line.trim()) return <span className="block text-[13px] font-mono leading-6">&nbsp;</span>

  // Simple token coloring
  const parts: Array<{ text: string; color: string }> = []
  let rest = line

  // Comments
  const commentIdx = rest.indexOf('//')
  if (commentIdx !== -1) {
    const before = rest.slice(0, commentIdx)
    const comment = rest.slice(commentIdx)
    if (before) {
      return (
        <span className="block text-[13px] font-mono leading-6 whitespace-pre">
          <CodeLine line={before} />
          <span style={{ color: '#4A5568', fontStyle: 'italic' }}>{comment}</span>
        </span>
      )
    }
    return <span className="block text-[13px] font-mono leading-6 whitespace-pre" style={{ color: '#4A5568', fontStyle: 'italic' }}>{line}</span>
  }

  return <span className="block text-[13px] font-mono leading-6 whitespace-pre text-[#E2E8F0]">{line}</span>
}

// ─── CONCEPT CONTENT ─────────────────────────────────────────────────────────
function ConceptContent({ concept, activeTab, accentColor }: {
  concept: Concept
  activeTab: string
  accentColor: string
}) {
  const contentMap: Record<string, React.ReactNode> = {
    tldr: (
      <div className="space-y-6">
        <div className="rounded-xl border p-6" style={{ borderColor: `${accentColor}25`, backgroundColor: `${accentColor}06` }}>
          <p className="text-xs font-mono uppercase tracking-[0.2em] mb-3" style={{ color: accentColor }}>
            In Plain English
          </p>
          <p className="text-lg text-white leading-relaxed font-medium">{concept.tldr}</p>
        </div>
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#5A7096] mb-3">
            Why It Matters
          </p>
          <Prose content={concept.problem} accentColor={accentColor} />
        </div>
      </div>
    ),
    analogy: (
      <div className="space-y-6">
        <div className="rounded-xl border border-[#1A2332] bg-[#0A0F1A] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🧠</span>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#5A7096]">
              Real-World Analogy
            </p>
          </div>
          <Prose content={concept.analogy} accentColor={accentColor} />
        </div>
      </div>
    ),
    deep: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔬</span>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#5A7096]">
            Technical Internals
          </p>
        </div>
        <Prose content={concept.deep} accentColor={accentColor} />
      </div>
    ),
    code: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#5A7096]">
            Code Examples — Beginner to Advanced
          </p>
        </div>
        <CodeBlock content={concept.code} accentColor={accentColor} />
      </div>
    ),
    bugs: (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🐛</span>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#5A7096]">
            Real Production Bugs & Fixes
          </p>
        </div>
        <div className="rounded-xl border border-[#2A1A1A] bg-[#0F0A0A] p-5">
          <Prose content={concept.bugs} accentColor="#F87171" />
        </div>
      </div>
    ),
    challenge: (
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🏆</span>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#5A7096]">
            Test Yourself
          </p>
        </div>
        <Prose content={concept.challenge} accentColor={accentColor} />
        <div
          className="rounded-xl border p-4 mt-4"
          style={{ borderColor: `${accentColor}20`, backgroundColor: `${accentColor}05` }}
        >
          <p className="text-xs font-mono text-[#5A7096]">
            Complete the challenges before checking solutions. That's how real learning happens.
          </p>
        </div>
      </div>
    ),
  }

  return (
    <div
      key={`${concept.id}-${activeTab}`}
      style={{
        animation: 'fadeSlideIn 0.25s ease-out',
      }}
    >
      {contentMap[activeTab] ?? null}
    </div>
  )
}

// ─── SIDEBAR ITEM ─────────────────────────────────────────────────────────────
function SidebarItem({
  concept,
  active,
  accentColor,
  onClick,
}: {
  concept: Concept
  active: boolean
  accentColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group relative"
      style={{
        backgroundColor: active ? `${accentColor}10` : 'transparent',
        border: `1px solid ${active ? `${accentColor}25` : 'transparent'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0"
          style={{
            backgroundColor: active ? accentColor : '#1A2332',
            color: active ? '#080B11' : '#5A7096',
          }}
        >
          {concept.id}
        </span>
        <div className="min-w-0">
          <p
            className="text-sm font-semibold truncate transition-colors"
            style={{ color: active ? '#FFFFFF' : '#8892A4' }}
          >
            {concept.title}
          </p>
          <p className="text-[10px] font-mono truncate text-[#3D4F6B] mt-0.5">
            {concept.tag}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PhasePageClient({
  phase,
  phaseData,
}: {
  phase: Phase
  phaseData: PhaseData
}) {
  const [activeConcept, setActiveConcept] = useState(0)
  const [activeTab, setActiveTab] = useState('tldr')
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const concept = phaseData.concepts[activeConcept]
  const accentColor = concept?.color ?? phase.color

  // Reset tab when concept changes
  useEffect(() => {
    setActiveTab('tldr')
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeConcept])

  const handleConceptSelect = (index: number) => {
    setActiveConcept(index)
    setMobileSheetOpen(false)
  }

  if (!concept) return null

  return (
    <div className="min-h-screen bg-[#080B11] text-white">
      {/* Inject animation keyframes */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-40 border-b border-[#1A2332] bg-[#080B11]/90 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-sm font-mono text-[#5A7096] hover:text-white transition-colors flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            StackMind
          </Link>
          <span className="text-[#1A2332]">/</span>
          <span className="text-sm font-medium text-white">{phase.title}</span>

          <div className="ml-auto flex items-center gap-3">
            {/* Mobile: open concept list */}
            <button
              className="sm:hidden flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1A2332] text-sm text-[#8892A4]"
              onClick={() => setMobileSheetOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="2" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {activeConcept + 1}/{phaseData.concepts.length}
            </button>

            {/* Prev / Next */}
            <div className="flex items-center gap-1">
              <button
                disabled={activeConcept === 0}
                onClick={() => setActiveConcept(i => i - 1)}
                className="w-8 h-8 rounded-lg border border-[#1A2332] flex items-center justify-center text-[#5A7096] hover:text-white hover:border-[#2A3A52] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                disabled={activeConcept === phaseData.concepts.length - 1}
                onClick={() => setActiveConcept(i => i + 1)}
                className="w-8 h-8 rounded-lg border border-[#1A2332] flex items-center justify-center text-[#5A7096] hover:text-white hover:border-[#2A3A52] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* ── Desktop Sidebar ── */}
        <aside className="hidden sm:flex flex-col w-72 xl:w-80 flex-shrink-0 border-r border-[#1A2332] h-[calc(100vh-3.5rem)] sticky top-14 overflow-hidden">
          {/* Phase header */}
          <div className="p-5 border-b border-[#1A2332]">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${phase.color}15`, border: `1px solid ${phase.color}25` }}
            >
              <span className="text-sm font-bold" style={{ color: phase.color }}>
                {phase.phase.toString().padStart(2, '0')}
              </span>
            </div>
            <h1 className="text-base font-bold text-white">{phase.title}</h1>
            <p className="text-xs text-[#5A7096] font-mono">{phase.subtitle}</p>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-mono text-[#3D4F6B] mb-1.5">
                <span>Progress</span>
                <span>{activeConcept + 1} / {phaseData.concepts.length}</span>
              </div>
              <div className="h-1 rounded-full bg-[#1A2332] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((activeConcept + 1) / phaseData.concepts.length) * 100}%`,
                    backgroundColor: phase.color,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Concept list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
            {phaseData.concepts.map((c, i) => (
              <SidebarItem
                key={c.id}
                concept={c}
                active={i === activeConcept}
                accentColor={phase.color}
                onClick={() => handleConceptSelect(i)}
              />
            ))}
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 min-w-0">
          {/* Concept header */}
          <div className="border-b border-[#1A2332] px-6 lg:px-10 py-7">
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${accentColor}15`, border: `1px solid ${accentColor}25`, color: accentColor }}
              >
                {concept.id}
              </div>
              <div>
                <p className="text-[10px] font-mono tracking-[0.25em] uppercase mb-1.5" style={{ color: accentColor }}>
                  {concept.tag}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {concept.title}
                </h2>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="border-b border-[#1A2332] px-6 lg:px-10 overflow-x-auto">
            <div className="flex gap-0 min-w-max">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors whitespace-nowrap"
                  style={{ color: activeTab === tab.id ? '#FFFFFF' : '#5A7096' }}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div
            ref={contentRef}
            className="px-6 lg:px-10 py-8 max-h-[calc(100vh-14rem)] overflow-y-auto"
          >
            {/* Summary callout at bottom */}
            <ConceptContent
              concept={concept}
              activeTab={activeTab}
              accentColor={accentColor}
            />

            {/* Summary always visible at bottom */}
            {activeTab === 'challenge' && (
              <div
                className="mt-8 rounded-xl border p-5"
                style={{ borderColor: `${accentColor}20`, backgroundColor: `${accentColor}06` }}
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: accentColor }}>
                  Key Takeaway
                </p>
                <p className="text-sm text-[#C8D6E5] leading-relaxed">{concept.summary}</p>
              </div>
            )}

            {/* Pagination bottom */}
            <div className="flex items-center justify-between mt-12 pt-6 border-t border-[#1A2332]">
              <button
                disabled={activeConcept === 0}
                onClick={() => setActiveConcept(i => i - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1A2332] text-sm text-[#8892A4] hover:border-[#2A3A52] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {activeConcept > 0 ? phaseData.concepts[activeConcept - 1]?.title : 'Previous'}
              </button>
              <button
                disabled={activeConcept === phaseData.concepts.length - 1}
                onClick={() => setActiveConcept(i => i + 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1A2332] text-sm text-[#8892A4] hover:border-[#2A3A52] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {activeConcept < phaseData.concepts.length - 1 ? phaseData.concepts[activeConcept + 1]?.title : 'Next'}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Sheet ── */}
      {mobileSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm sm:hidden"
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1117] border-t border-[#1A2332] rounded-t-2xl sm:hidden max-h-[80vh] flex flex-col"
            style={{ animation: 'sheetUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#2A3A52]" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-[#1A2332] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{phase.title}</p>
                <p className="text-xs text-[#5A7096] font-mono">{phaseData.concepts.length} concepts</p>
              </div>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="w-8 h-8 rounded-lg border border-[#1A2332] flex items-center justify-center text-[#5A7096]"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {phaseData.concepts.map((c, i) => (
                <SidebarItem
                  key={c.id}
                  concept={c}
                  active={i === activeConcept}
                  accentColor={phase.color}
                  onClick={() => handleConceptSelect(i)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
