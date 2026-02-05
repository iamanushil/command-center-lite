import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-base p-12">
      <div className="max-w-6xl mx-auto">
        <Header />
        <main>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}
