import type { DocumentsRepo, DocumentItem } from '../../core/repository'

class LocalDocumentsRepo implements DocumentsRepo {
  private readonly key = 'local-documents'
  
  private load(): DocumentItem[] { 
    try { 
      const s = localStorage.getItem(this.key); 
      return s ? JSON.parse(s) : this.getInitialData() 
    } catch { 
      return this.getInitialData() 
    } 
  }
  
  private save(rows: DocumentItem[]) { localStorage.setItem(this.key, JSON.stringify(rows)) }

  private getInitialData(): DocumentItem[] {
    return [
      {
        id: 'DOC-001',
        title: '驗收單範本',
        url: 'https://drive.google.com/file/d/example1/view',
        tags: ['驗收單', '範本'],
        category: 'forms',
        description: '標準驗收單範本，用於服務完成後的客戶簽收',
        accessLevel: 'all',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'DOC-002',
        title: '技術手冊 - 冷氣清洗',
        url: 'https://drive.google.com/file/d/example2/view',
        tags: ['技術手冊', '冷氣', 'SOP'],
        category: 'manuals',
        description: '冷氣清洗標準作業程序',
        accessLevel: 'tech',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'DOC-003',
        title: '員工手冊',
        url: 'https://drive.google.com/file/d/example3/view',
        tags: ['員工手冊', '政策'],
        category: 'policies',
        description: '公司員工手冊及相關政策',
        accessLevel: 'all',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'DOC-004',
        title: '報價單範本',
        url: 'https://drive.google.com/file/d/example4/view',
        tags: ['報價單', '範本'],
        category: 'templates',
        description: '標準報價單範本',
        accessLevel: 'support',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'DOC-005',
        title: '安全規範',
        url: 'https://drive.google.com/file/d/example5/view',
        tags: ['安全規範', 'SOP'],
        category: 'policies',
        description: '工作安全規範及注意事項',
        accessLevel: 'all',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'DOC-006',
        title: '品質標準',
        url: 'https://drive.google.com/file/d/example6/view',
        tags: ['品質標準', 'SOP'],
        category: 'policies',
        description: '服務品質標準及檢查項目',
        accessLevel: 'tech',
        updatedAt: new Date().toISOString()
      }
    ]
  }

  async list(): Promise<DocumentItem[]> { return this.load() }
  
  async upsert(item: Omit<DocumentItem, 'updatedAt'>): Promise<DocumentItem> {
    const rows = this.load()
    const now = new Date().toISOString()
    const idx = rows.findIndex(r => r.id === item.id)
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...item, updatedAt: now }
      this.save(rows)
      return rows[idx]
    }
    const id = (item as any).id || `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const obj: DocumentItem = { 
      ...(item as any), 
      id, 
      category: item.category || 'forms',
      description: item.description || '',
      accessLevel: item.accessLevel || 'all',
      updatedAt: now 
    }
    this.save([obj, ...rows])
    return obj
  }
  
  async remove(id: string): Promise<void> { this.save(this.load().filter(r => r.id !== id)) }
}

export const documentsRepo = new LocalDocumentsRepo()


