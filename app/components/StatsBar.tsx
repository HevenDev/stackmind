const STATS = [
  { value: '10', label: 'Phases' },
  { value: '114', label: 'Concepts' },
  { value: '6', label: 'Tabs per Concept' },
  { value: '100%', label: 'Free' },
]

export default function StatsBar() {
  return (
    <div id="phases" className="border-y border-[#1A2332] bg-[#0A0F1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#1A2332]">
          {STATS.map(({ value, label }) => (
            <div key={label} className="px-8 py-8 text-center">
              <div className="text-3xl font-black text-[#00C17C] tabular-nums">{value}</div>
              <div className="text-sm text-[#8892A4] mt-1 font-mono tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
