import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080B11] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[120px] font-black text-[#0D1117] leading-none select-none">404</p>
        <p className="text-xs font-mono tracking-[0.3em] text-[#00C17C] uppercase mb-4 -mt-4">
          Phase not found
        </p>
        <h1 className="text-2xl font-bold text-white mb-3">This deep dive doesn't exist yet</h1>
        <p className="text-[#8892A4] mb-8">The concept you're looking for hasn't been added to StackMind yet.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00C17C] text-[#080B11] font-semibold text-sm hover:bg-[#00D988] transition-colors"
        >
          ← Back to all phases
        </Link>
      </div>
    </div>
  )
}
