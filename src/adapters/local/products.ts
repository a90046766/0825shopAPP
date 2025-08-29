import type { ProductRepo, Product } from '../../core/repository'

class LocalProductRepo implements ProductRepo {
  private readonly storageKey = 'local-products-data'

  private loadData(): Product[] {
    try {
      const saved = localStorage.getItem(this.storageKey)
      return saved ? JSON.parse(saved) : this.getInitialData()
    } catch {
      return this.getInitialData()
    }
  }

  private saveData(data: Product[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  private getInitialData(): Product[] {
    return [
      {
        id: 'P-AC-CLEAN',
        name: '分離式冷氣清洗',
        unitPrice: 1800,
        groupPrice: 1600,
        groupMinQty: 2,
        description: '室內外機標準清洗，包含濾網、蒸發器、冷凝器清潔',
        content: '專業冷氣清洗服務，包含室內外機完整清潔，確保冷氣效能最佳化',
        region: '全台',
        imageUrls: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'P-WASH-CLEAN',
        name: '洗衣機清洗（滾筒）',
        unitPrice: 1999,
        groupPrice: 1799,
        groupMinQty: 2,
        description: '滾筒式洗衣機拆洗保養，包含內筒、外筒、管路清潔',
        content: '專業洗衣機深度清洗，徹底清除污垢和細菌，延長洗衣機壽命',
        region: '全台',
        imageUrls: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'P-HOOD-T',
        name: '倒T型抽油煙機清洗',
        unitPrice: 2200,
        groupPrice: 2000,
        groupMinQty: 2,
        description: '不鏽鋼倒T型抽油煙機，包含內部機械清洗',
        content: '專業抽油煙機清洗服務，徹底清除油垢，恢復抽油煙機效能',
        region: '全台',
        imageUrls: [],
        updatedAt: new Date().toISOString()
      },
      {
        id: 'P-HOOD-TRAD',
        name: '傳統雙渦輪抽油煙機清洗',
        unitPrice: 1800,
        groupPrice: 1600,
        groupMinQty: 2,
        description: '傳統型雙渦輪抽油煙機清洗保養',
        content: '傳統抽油煙機專業清洗，包含渦輪和管路的完整清潔',
        region: '全台',
        imageUrls: [],
        updatedAt: new Date().toISOString()
      }
    ]
  }

  async list(): Promise<Product[]> {
    return this.loadData()
  }

  async upsert(product: Omit<Product, 'updatedAt'>): Promise<Product> {
    const data = this.loadData()
    const existing = data.find(p => p.id === product.id)
    const now = new Date().toISOString()

    if (existing) {
      // 更新現有
      const updated = { ...existing, ...product, updatedAt: now }
      const newData = data.map(p => p.id === product.id ? updated : p)
      this.saveData(newData)
      return updated
    } else {
      // 新增
      const newProduct: Product = { ...product, updatedAt: now }
      this.saveData([...data, newProduct])
      return newProduct
    }
  }

  async remove(id: string): Promise<void> {
    const data = this.loadData()
    this.saveData(data.filter(p => p.id !== id))
  }
}

export const productRepo = new LocalProductRepo()
