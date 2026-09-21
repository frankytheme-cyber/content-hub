import { AppHeader } from '@/components/AppHeader'

export default function AggiornamentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader maxWidth="max-w-2xl" />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        {children}
      </main>
    </div>
  )
}
