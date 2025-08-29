import React from 'react'

export interface CalendarProps {
  value: string // YYYY-MM-DD
  onChange: (date: string) => void
  header?: string
  markers?: Record<string, number> // key: YYYY-MM-DD => count
  onMonthChange?: (year: number, monthIndex: number) => void
  emphasis?: Record<string, 'warn' | 'danger'>
  tooltips?: Record<string, string>
  onDayHover?: (date: string) => void
  onDayLeave?: (date: string) => void
}

function getDaysInMonth(year: number, monthIndex: number): Date[] {
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const days: Date[] = []
  const current = new Date(first)
  while (current.getUTCMonth() === monthIndex) {
    days.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function Calendar({ value, onChange, header, markers, onMonthChange, emphasis, tooltips, onDayHover, onDayLeave }: CalendarProps) {
  const selected = new Date(value || new Date().toISOString())
  const year = selected.getUTCFullYear()
  const month = selected.getUTCMonth()
  const firstDay = new Date(Date.UTC(year, month, 1))
  const days = getDaysInMonth(year, month)
  const startWeekday = firstDay.getUTCDay() // 0 Sun ... 6 Sat
  const leadingEmpty = (startWeekday + 6) % 7 // Monday-first grid

  const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`

  const go = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1))
    onChange(formatDate(d))
    if (onMonthChange) onMonthChange(d.getUTCFullYear(), d.getUTCMonth())
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => go(-1)} className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">‹</button>
        <div className="text-sm font-semibold">{header || ''} {monthLabel}</div>
        <button onClick={() => go(1)} className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        <div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div><div>日</div>
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`e-${i}`} className="h-8" />
        ))}
        {days.map((d) => {
          const ds = formatDate(d)
          const active = ds === value
          const count = markers?.[ds] || 0
          const badge = count > 0
          const emph = emphasis?.[ds]
          const emphRing = emph === 'danger' ? 'ring-2 ring-red-400' : emph === 'warn' ? 'ring-2 ring-amber-300' : ''
          return (
            <button
              key={ds}
              onClick={() => onChange(ds)}
              onMouseEnter={() => onDayHover && onDayHover(ds)}
              onMouseLeave={() => onDayLeave && onDayLeave(ds)}
              title={tooltips?.[ds] || (badge ? `當日占用 ${count}` : '')}
              className={`relative h-8 rounded-md text-sm ${active ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${badge && !active ? 'ring-1 ring-brand-300' : ''} ${!active ? emphRing : ''}`}
            >
              {String(d.getUTCDate())}
              {badge ? (
                <span className={`absolute -right-1 -top-1 rounded-full px-1 text-[10px] ${active ? 'bg-white text-brand-600' : 'bg-brand-500 text-white'}`}>{count > 9 ? '9+' : count}</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}


