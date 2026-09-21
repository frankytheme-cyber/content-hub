import { AppHeader } from '@/components/AppHeader'

export default function InternalLinkingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader maxWidth="max-w-5xl" />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {children}
      </main>
    </div>
  )
}
