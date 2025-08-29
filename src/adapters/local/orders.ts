import type { OrderRepo, Order } from '../../core/repository'
import { scheduleRepo } from './schedule'
import { memberRepo } from './members'
import { technicianRepo } from './technicians'
import { staffRepo } from './staff'

class LocalOrderRepo implements OrderRepo {
  private readonly storageKey = 'local-orders-data'
  private readonly counterKey = 'local-order-counter'

  private loadData(): Order[] {
    try {
      const saved = localStorage.getItem(this.storageKey)
      return saved ? JSON.parse(saved) : this.getInitialData()
    } catch {
      return this.getInitialData()
    }
  }

  private saveData(data: Order[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  private getInitialData(): Order[] {
    return [
      {
        id: 'O01958',
        customerName: '吳妮諮',
        customerPhone: '0912345678',
        customerAddress: '302 新竹縣竹北市興隆路一段469號',
        preferredTimeStart: '13:30',
        preferredTimeEnd: '17:30',
        serviceItems: [
          { name: '洗衣機清洗／滾筒式', quantity: 1, unitPrice: 3999 }
        ],
        assignedTechnicians: ['楊小飛'],
        signatureTechnician: '楊小飛',
        status: 'completed',
        platform: '日',
        photos: [],
        signatures: { customer: '', technician: '' },
        workStartedAt: '2025/07/14 13:57:50',
        workCompletedAt: '2025/08/17 20:25:29',
        createdAt: '2025/07/14 05:57:14',
        updatedAt: new Date().toISOString()
      }
    ]
  }

  private getNextOrderId(): string {
    try {
      const current = parseInt(localStorage.getItem(this.counterKey) || '1958')
      const next = current + 1
      localStorage.setItem(this.counterKey, next.toString())
      return `O${next.toString().padStart(5, '0')}`
    } catch {
      return `O${Date.now().toString().slice(-5)}`
    }
  }

  async list(): Promise<Order[]> {
    return this.loadData()
  }

  async get(id: string): Promise<Order | null> {
    const data = this.loadData()
    return data.find(order => order.id === id) || null
  }

  async create(draft: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const now = new Date().toISOString()
    const order: Order = {
      id: this.getNextOrderId(),
      ...draft,
      createdAt: now,
      updatedAt: now
    }

    const data = this.loadData()
    this.saveData([order, ...data])
    return order
  }

  async update(id: string, patch: Partial<Order>): Promise<void> {
    const data = this.loadData()
    const index = data.findIndex(order => order.id === id)
    if (index === -1) throw new Error('訂單不存在')

    const prev = data[index]
    const next = { ...prev, ...patch, updatedAt: new Date().toISOString() }
    data[index] = next
    this.saveData(data)

    // 同步工單占用：以技師 email 建立占用；先移除該訂單的舊占用再重建
    try {
      // 先移除舊占用
      // 先抓取全部占用（避免跨月變更殘留）
      const old = await scheduleRepo.listWork()
      for (const w of old) {
        if (w.orderId === next.id) await scheduleRepo.removeWork(w.id)
      }
      // 再建立新占用
      if (next.assignedTechnicians?.length && next.preferredTimeStart && next.preferredTimeEnd) {
        const date = next.preferredDate || new Date().toISOString().slice(0,10)
        const techs = await technicianRepo.list()
        for (const who of next.assignedTechnicians) {
          const t = techs.find(x => x.name === who || (x.code || '').toUpperCase() === (who || '').toUpperCase() || (x.email || '').toLowerCase() === (who || '').toLowerCase())
          const email = (t?.email || who || '').toLowerCase()
          await scheduleRepo.saveWork({
            technicianEmail: email,
            date,
            startTime: next.preferredTimeStart,
            endTime: next.preferredTimeEnd,
            orderId: next.id,
          })
        }
      }
    } catch {}
  }

  async delete(id: string, reason: string): Promise<void> {
    const data = this.loadData()
    const idx = data.findIndex(o => o.id === id)
    if (idx < 0) throw new Error('訂單不存在')
    if (data[idx].status !== 'draft') throw new Error('僅草稿訂單可刪除，已確認請改用取消')
    // 直接移除
    data.splice(idx, 1)
    this.saveData(data)
  }

  async cancel(id: string, reason: string): Promise<void> {
    const order = await this.get(id)
    if (!order) throw new Error('訂單不存在')
    if (order.status !== 'confirmed') throw new Error('僅已確認的訂單可以取消')
    await this.update(id, { status: 'canceled', canceledReason: reason })
  }

  async confirm(id: string): Promise<void> {
    await this.update(id, { status: 'confirmed' })
  }

  async startWork(id: string, at: string): Promise<void> {
    await this.update(id, { workStartedAt: at, status: 'in_progress' })
  }

  async finishWork(id: string, at: string): Promise<void> {
    await this.update(id, { workCompletedAt: at, status: 'completed' })
    // 完工時計分：介紹人 + 規則
    try {
      const order = await this.get(id)
      if (!order) return
      const amount = order.serviceItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
      const netAmount = Math.max(0, amount - (order.pointsDeductAmount || 0))
      const ref = (order.referrerCode || '').toUpperCase()
      // 會員：100 元 = 1 點
      if (order.memberId) {
        const m = await memberRepo.get(order.memberId)
        if (m) {
          const used = Math.max(0, order.pointsUsed || 0)
          const earned = Math.floor(netAmount / 100)
          const nextPts = Math.max(0, (m.points || 0) - used + earned)
          await memberRepo.upsert({ ...m, points: nextPts })
        }
      }
      // 技師/業務介紹（每滿 300 元 +1）
      if (ref.startsWith('SR')) {
        const techs = await technicianRepo.list()
        const t = techs.find(x => x.code.toUpperCase() === ref)
        if (t) await technicianRepo.upsert({ id: t.id, name: t.name, shortName: t.shortName, email: t.email, phone: t.phone, region: t.region, status: t.status, points: (t.points || 0) + Math.floor(netAmount / 300) })
      } else if (ref.startsWith('SE')) {
        const staffs = await staffRepo.list()
        const s = staffs.find(x => (x.refCode || '').toUpperCase() === ref)
        if (s) await staffRepo.upsert({ name: s.name, shortName: s.shortName, email: s.email, phone: s.phone, role: s.role, status: s.status, points: (s.points || 0) + Math.floor(netAmount / 300) } as any)
      }
    } catch {}

    // 完工扣庫：優先以 productId 對應，否則以名稱對應
    try {
      const { inventoryRepo } = await import('./inventory')
      const inv = await inventoryRepo.list()
      const idToItem = new Map(inv.filter(i=>i.productId).map(i => [i.productId as string, i]))
      const nameToItem = new Map(inv.map(i => [i.name, i]))
      const order = await this.get(id)
      if (!order) return
      for (const it of (order.serviceItems || [])) {
        const byId = it.productId ? idToItem.get(it.productId) : undefined
        const hit = byId || nameToItem.get(it.name)
        if (hit) await inventoryRepo.upsert({ ...hit, quantity: Math.max(0, (hit.quantity || 0) - it.quantity) })
      }
    } catch {}
  }
}

export const orderRepo = new LocalOrderRepo()
