// 簡化的活動折扣工具：回傳目前生效的最高折扣百分比（0 表示無）
export async function getActivePercent(): Promise<number> {
  try {
    const { promotionsRepo } = await import('../adapters/local/promotions')
    const list = await promotionsRepo.list()
    const nowTs = Date.now()
    const toTs = (s?: string) => {
      if (!s) return undefined
      if (s.includes('T')) return new Date(s).getTime()
      // date-only: 用本地時區起訖
      return new Date(`${s}T00:00:00`).getTime()
    }
    const toEndTs = (s?: string) => {
      if (!s) return undefined
      if (s.includes('T')) return new Date(s).getTime()
      return new Date(`${s}T23:59:59`).getTime()
    }
    const active = list.filter((p: any) => {
      const startTs = toTs(p.startAt)
      const endTs = toEndTs(p.endAt)
      return (p.active !== false) && (startTs === undefined || startTs <= nowTs) && (endTs === undefined || endTs >= nowTs)
    })
    let percent = 0
    for (const p of active) {
      const rules = p.rules || {}
      if (typeof rules.percent === 'number' && rules.percent > percent) percent = rules.percent
    }
    return percent
  } catch {
    return 0
  }
}
