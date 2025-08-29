import type { DocumentsRepo, DocumentItem } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): DocumentItem {
  return { 
    id: r.id, 
    title: r.title, 
    url: r.url, 
    tags: r.tags || [], 
    category: r.category || 'forms',
    description: r.description || '',
    accessLevel: r.access_level || 'all',
    updatedAt: r.updated_at || new Date().toISOString() 
  }
}

function toRow(item: any): any {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    tags: item.tags || [],
    category: item.category || 'forms',
    description: item.description || '',
    access_level: item.accessLevel || 'all',
    updated_at: new Date().toISOString()
  }
}

class SupabaseDocumentsRepo implements DocumentsRepo {
  async list(): Promise<DocumentItem[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('Supabase documents list error:', error)
      throw new Error(`文件列表載入失敗: ${error.message}`)
    }
    
    return (data || []).map(fromRow)
  }

  async upsert(item: Omit<DocumentItem, 'updatedAt'>): Promise<DocumentItem> {
    try {
      const row = toRow(item)
      const { data, error } = await supabase
        .from('documents')
        .upsert(row)
        .select()
        .single()
      
      if (error) {
        console.error('Supabase documents upsert error:', error)
        throw new Error(`文件儲存失敗: ${error.message}`)
      }
      
      return fromRow(data)
    } catch (error) {
      console.error('Supabase documents upsert exception:', error)
      throw new Error('文件儲存失敗')
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Supabase documents remove error:', error)
        throw new Error(`文件刪除失敗: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase documents remove exception:', error)
      throw new Error('文件刪除失敗')
    }
  }
}

export const documentsRepo: DocumentsRepo = new SupabaseDocumentsRepo()


