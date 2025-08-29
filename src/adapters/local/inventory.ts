import type { InventoryRepo, InventoryItem, PurchaseRequest } from '../../core/repository'

class LocalInventoryRepo implements InventoryRepo {
  private readonly key = 'local-inventory'
  private readonly purchaseRequestsKey = 'local-purchase-requests'
  
  private load(): InventoryItem[] { try { const s = localStorage.getItem(this.key); return s ? JSON.parse(s) : [] } catch { return [] } }
  private save(rows: InventoryItem[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }
  
  private loadPurchaseRequests(): PurchaseRequest[] { try { const s = localStorage.getItem(this.purchaseRequestsKey); return s ? JSON.parse(s) : [] } catch { return [] } }
  private savePurchaseRequests(requests: PurchaseRequest[]) { localStorage.setItem(this.purchaseRequestsKey, JSON.stringify(requests)) }

  async list(): Promise<InventoryItem[]> { return this.load() }
  async upsert(item: Omit<InventoryItem, 'updatedAt'>): Promise<InventoryItem> {
    const rows = this.load()
    const now = new Date().toISOString()
    const idx = rows.findIndex(r => r.id === item.id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...item, updatedAt: now }
      this.save(rows)
      return rows[idx]
    }
    const id = (item as any).id || `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const obj: InventoryItem = { ...(item as any), id, updatedAt: now }
    this.save([obj, ...rows])
    return obj
  }
  async remove(id: string): Promise<void> { this.save(this.load().filter(r => r.id !== id)) }
  
  // 購買申請相關方法
  async createPurchaseRequest(request: Omit<PurchaseRequest, 'id'>): Promise<PurchaseRequest> {
    const requests = this.loadPurchaseRequests()
    const id = `PR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString()
    const newRequest: PurchaseRequest = { ...request, id, requestDate: now }
    this.savePurchaseRequests([newRequest, ...requests])
    return newRequest
  }
  
  async getPurchaseRequest(id: string): Promise<PurchaseRequest | null> {
    const requests = this.loadPurchaseRequests()
    return requests.find(r => r.id === id) || null
  }
  
  async updatePurchaseRequest(id: string, patch: Partial<PurchaseRequest>): Promise<void> {
    const requests = this.loadPurchaseRequests()
    const idx = requests.findIndex(r => r.id === id)
    if (idx >= 0) {
      requests[idx] = { ...requests[idx], ...patch }
      this.savePurchaseRequests(requests)
    }
  }
  
  async listPurchaseRequests(): Promise<PurchaseRequest[]> {
    return this.loadPurchaseRequests()
  }
}

export const inventoryRepo = new LocalInventoryRepo()


