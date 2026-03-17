import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://stackmind.in'),
  title: {
    default: 'StackMind — Deep-Dive Developer Learning',
    template: '%s — StackMind',
  },
  description: 'Master JavaScript, TypeScript, SQL, MongoDB, Fastify, DSA and more with 114 concept-by-concept deep dives. Junior to SDE 2/3 level. Free forever.',
  authors: [{ name: 'StackMind' }],
  creator: 'StackMind',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Sora:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080B11] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
