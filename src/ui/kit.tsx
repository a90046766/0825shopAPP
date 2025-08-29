import React from 'react'
export { Button, Card, Badge, Modal, Select, Input, Textarea } from './components/UIComponents'
export { default as QuoteDisplay, QuoteCard } from './components/QuoteDisplay'

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <i className="h-5 w-1.5 rounded bg-brand-500" />
      <h2 className="text-base font-semibold">{children}</h2>
    </div>
  )
}

export function StatusChip({ kind, text }: { kind: 'done' | 'paid' | 'pending' | 'doing'; text: string }) {
  const map: Record<string, string> = {
    done: 'bg-green-100 text-green-700',
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    doing: 'bg-purple-100 text-purple-700',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[kind]}`}>{text}</span>
}

export function MetricCard({ title, icon, value }: { title: string; icon?: React.ReactNode; value: number | string }) {
  return (
    <div className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-card">
      <div>
        <div className="text-gray-500">{title}</div>
        <div className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">{value}</div>
      </div>
      {icon && <div className="text-brand-500">{icon}</div>}
    </div>
  )
}

export function TimelineStep({ index, title, time }: { index: number; title: string; time: string }) {
  return (
    <div className="flex items-center justify-between border-b py-3">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-600">{index}</div>
        <div className="text-base font-semibold">{title}</div>
      </div>
      <div className="text-brand-600">{time}</div>
    </div>
  )
}

export function ListCell({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-3">
      <div>
        <div className="text-base font-semibold">{title}</div>
        {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
      </div>
      {right || <div className="text-gray-400">›</div>}
    </div>
  )
}

export function PhotoGrid({ urls }: { urls: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((u, i) => (
        <div key={i} className="aspect-square overflow-hidden rounded-xl bg-gray-100">
          <img src={u} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  )
}


export async function confirmTwice(message: string, second?: string): Promise<boolean> {
  if (!confirm(message)) return false
  return confirm(second || '再確認一次，是否確定？')
}


