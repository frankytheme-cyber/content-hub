import { cn } from '@/lib/utils'

const CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  BOZZA:      { label: 'Bozza',       dot: 'bg-zinc-500',    text: 'text-zinc-400' },
  REVISIONE:  { label: 'In revisione', dot: 'bg-amber-500',   text: 'text-amber-400' },
  APPROVATO:  { label: 'Approvato',   dot: 'bg-emerald-500', text: 'text-emerald-400' },
  PUBBLICATO: { label: 'Pubblicato',  dot: 'bg-sky-500',     text: 'text-sky-400' },
}

export function StatoBadge({ stato }: { stato: string }) {
  const cfg = CONFIG[stato] ?? { label: stato, dot: 'bg-zinc-500', text: 'text-zinc-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
