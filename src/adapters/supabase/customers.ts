import type { CustomerRepo, Customer } from '../../core/repository'
import { supabase } from '../../utils/supabase'

function fromRow(r: any): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone || '',
    email: r.email || undefined,
    addresses: r.addresses || [],
    notes: r.notes || undefined,
    blacklisted: !!r.blacklisted,
    updatedAt: r.updated_at || new Date().toISOString(),
  }
}

class SupabaseCustomerRepo implements CustomerRepo {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(fromRow)
  }
  async get(id: string): Promise<Customer | null> {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
    if (error) {
      if ((error as any).code === 'PGRST116') return null
      throw error
    }
    return fromRow(data)
  }
  async upsert(c: Omit<Customer, 'id' | 'updatedAt'> & { id?: string }): Promise<Customer> {
    const now = new Date().toISOString()
    const row: any = { id: c.id, name: c.name, phone: c.phone, email: c.email, addresses: c.addresses||[], notes: c.notes, blacklisted: !!c.blacklisted, updated_at: now }
    const { data, error } = await supabase.from('customers').upsert(row).select().single()
    if (error) throw error
    return fromRow(data)
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
  }
}

export const customerRepo: CustomerRepo = new SupabaseCustomerRepo()


