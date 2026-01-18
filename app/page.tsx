import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Footer } from '@/components/landing/Footer'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </header>
      <Hero />
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  )
}
