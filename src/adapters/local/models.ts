import type { ModelsRepo, ModelItem } from '../../core/repository'

const STORAGE_KEY = 'models'

function fromRow(r: any): ModelItem {
  return { 
    id: r.id, 
    category: r.category, 
    brand: r.brand, 
    model: r.model, 
    notes: r.notes || undefined, 
    blacklist: !!r.blacklist, 
    attention: r.attention || undefined, 
    updatedAt: r.updatedAt || new Date().toISOString() 
  }
}

class LocalModelsRepo implements ModelsRepo {
  async list(): Promise<ModelItem[]> {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    try {
      const items = JSON.parse(data)
      return items.map(fromRow)
    } catch {
      return []
    }
  }

  async upsert(item: Omit<ModelItem, 'updatedAt'>): Promise<ModelItem> {
    const now = new Date().toISOString()
    const items = await this.list()
    const existingIndex = items.findIndex(i => i.id === item.id)
    
    const newItem = {
      ...item,
      updatedAt: now
    }
    
    if (existingIndex >= 0) {
      items[existingIndex] = newItem
    } else {
      items.unshift(newItem)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return newItem
  }

  async remove(id: string): Promise<void> {
    const items = await this.list()
    const filtered = items.filter(i => i.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }
}

export const modelsRepo: ModelsRepo = new LocalModelsRepo()


