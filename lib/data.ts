import phases from '@/data/phases.json'

export type Phase = {
  id: string
  phase: number
  title: string
  subtitle: string
  description: string
  totalConcepts: number
  color: string
  accentDark: string
  gradient: string
  icon: string
  tags: string[]
  levelRange: string
  seoKeywords: string[]
}

export type Concept = {
  id: number
  title: string
  tag: string
  color: string
  tldr: string
  problem: string
  analogy: string
  deep: string
  code: string
  bugs: string
  challenge: string
  summary: string
}

export type PhaseData = {
  id: string
  title: string
  subtitle: string
  description: string
  longDescription: string
  phase: number
  totalConcepts: number
  color: string
  gradient: string
  icon: string
  tags: string[]
  levelRange: string
  concepts: Concept[]
}

export function getAllPhases(): Phase[] {
  return phases as Phase[]
}

export function getPhaseById(id: string): Phase | undefined {
  return (phases as Phase[]).find(p => p.id === id)
}

export async function getPhaseData(id: string): Promise<PhaseData | null> {
  try {
    const data = await import(`@/data/${id}.json`)
    return data.default as PhaseData
  } catch {
    return null
  }
}

export function getLevelColor(level: string): string {
  if (level.includes('SDE 2/3')) return '#F59E0B'
  if (level.includes('SDE 2')) return '#60A5FA'
  if (level.includes('Mid')) return '#34D399'
  return '#A78BFA'
}
