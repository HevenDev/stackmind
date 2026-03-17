import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllPhases, getPhaseById, getPhaseData } from '@/lib/data'
import PhasePageClient from '@/app/components/PhasePageClient'

type Props = {
  params: { phaseId: string }
}

export async function generateStaticParams() {
  const phases = getAllPhases()
  return phases.map(p => ({ phaseId: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const phase = getPhaseById(params.phaseId)
  if (!phase) return { title: 'Not Found — StackMind' }

  const title = `${phase.title}: ${phase.subtitle} — StackMind`
  const description = `${phase.description} ${phase.totalConcepts} concepts from ${phase.levelRange}. Free, no login required.`

  return {
    title,
    description,
    keywords: phase.seoKeywords,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://stackmind.in/phase/${phase.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `https://stackmind.in/phase/${phase.id}`,
    },
  }
}

export default async function PhasePage({ params }: Props) {
  const phase = getPhaseById(params.phaseId)
  if (!phase) notFound()

  const phaseData = await getPhaseData(params.phaseId)
  if (!phaseData) notFound()

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${phase.title}: ${phase.subtitle}`,
    description: phase.description,
    provider: {
      '@type': 'Organization',
      name: 'StackMind',
      url: 'https://stackmind.in',
    },
    hasCourseInstance: phaseData.concepts.map(c => ({
      '@type': 'CourseInstance',
      name: c.title,
      description: c.tldr,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PhasePageClient phase={phase} phaseData={phaseData} />
    </>
  )
}
