'use client'

import Link from 'next/link'
import { type Phase } from '@/lib/data'

// Lucide-style inline SVG icons
function Icon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, JSX.Element> = {
    Braces: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/>
        <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
      </svg>
    ),
    FileCode: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>
      </svg>
    ),
    Server: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
        <line x1="6" y1="6" x2="6.01" y2="6"/>
        <line x1="6" y1="18" x2="6.01" y2="18"/>
      </svg>
    ),
    Shield: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    GitBranch: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15"/>
        <circle cx="18" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M18 9a9 9 0 0 1-9 9"/>
      </svg>
    ),
    Database: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
    Layers: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
    HardDrive: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="12" x2="2" y2="12"/>
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        <line x1="6" y1="16" x2="6.01" y2="16"/>
        <line x1="10" y1="16" x2="10.01" y2="16"/>
      </svg>
    ),
    Zap: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    BarChart2: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  }
  return icons[name] ?? icons.Braces
}

export default function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  return (
    <Link
      href={`/phase/${phase.id}`}
      className="group relative block rounded-2xl border border-[#1A2332] bg-[#0D1117] hover:border-[#2A3A52] hover:bg-[#0F1923] transition-all duration-300 overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: phase.gradient }}
      />

      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top left, ${phase.color}, transparent 60%)` }}
      />

      <div className="relative p-6">
        {/* Phase number + icon */}
        <div className="flex items-start justify-between mb-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center border transition-colors duration-300"
            style={{
              backgroundColor: `${phase.color}10`,
              borderColor: `${phase.color}25`,
            }}
          >
            <Icon name={phase.icon} color={phase.color} />
          </div>
          <span className="text-xs font-mono text-[#3D4F6B] tabular-nums">
            {String(phase.phase).padStart(2, '0')}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#E8F4FF] transition-colors">
          {phase.title}
        </h3>
        <p className="text-xs font-mono text-[#5A7096] mb-3 uppercase tracking-wider">
          {phase.subtitle}
        </p>
        <p className="text-sm text-[#8892A4] leading-relaxed mb-5 line-clamp-2">
          {phase.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {phase.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wide border"
              style={{
                color: phase.color,
                borderColor: `${phase.color}25`,
                backgroundColor: `${phase.color}0A`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1A2332]">
          <div>
            <div className="text-lg font-black text-white tabular-nums">{phase.totalConcepts}</div>
            <div className="text-[10px] font-mono text-[#5A7096] uppercase tracking-wide">Concepts</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono text-[#5A7096] uppercase tracking-wide mb-0.5">Level</div>
            <div className="text-xs font-semibold" style={{ color: phase.color }}>
              {phase.levelRange}
            </div>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke={phase.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}
