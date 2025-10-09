import type { OrderRepo, Order } from '../../core/repository'
import { supabase } from '../../utils/supabase'

// 輕量重試工具：處理偶發網路/瞬時錯誤
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      const waitMs = 300 + attempt * 400
      await new Promise(res => setTimeout(res, waitMs))
    }
  }
  throw lastError
}

// UUID 驗�??�數
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// ?��? UUID ?��???ID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function toDbRow(input: Partial<Order>): any {
  if (!input) return {}
  const map: Record<string, string> = {
    customerName: 'customer_name',
    customerPhone: 'customer_phone',
    customerEmail: 'customer_email',
    customerTitle: 'customer_title',
    customerTaxId: 'customer_tax_id',
    customerAddress: 'customer_address',
    preferredDate: 'preferred_date',
    preferredTimeStart: 'preferred_time_start',
    preferredTimeEnd: 'preferred_time_end',
    referrerCode: 'referrer_code',
    memberId: 'member_id',
    signatureTechnician: 'signature_technician',
    assignedTechnicians: 'assigned_technicians',
    serviceItems: 'service_items',
    signatures: 'signatures',
    photos: 'photos',
    photosBefore: 'photos_before',
    photosAfter: 'photos_after',
    paymentMethod: 'payment_method',
    paymentStatus: 'payment_status',
    pointsUsed: 'points_used',
    pointsDeductAmount: 'points_deduct_amount',
    invoiceSent: 'invoice_sent',
    note: 'note',
    workStartedAt: 'work_started_at',
    workCompletedAt: 'work_completed_at',
    serviceFinishedAt: 'service_finished_at',
    canceledReason: 'canceled_reason',
    createdBy: 'created_by',
    supportNote: 'support_note',
  }
  const row: any = {}
  for (const [camel, snake] of Object.entries(map)) {
    if ((input as any)[camel] !== undefined) row[snake] = (input as any)[camel]
  }
  const passthrough = ['status', 'platform', 'category', 'channel', 'used_item_id', 'created_at', 'updated_at']
  for (const key of passthrough) {
    if ((input as any)[key] !== undefined) row[key] = (input as any)[key]
  }
  // 移除空�?串�??��?，避??Postgres date �???�誤
  if (row['preferred_date'] === '' || row['preferred_date'] === undefined) {
    delete row['preferred_date']
  }
  return row
}

function fromDbRow(row: any): Order {
  const r = row || {}
  const pick = (a: string, b: string) => (r[a] ?? r[b])
  const normalizeStatus = (s: any): any => {
    try {
      const x = String(s||'').toLowerCase()
      if (!x) return 'draft'
      if (['draft','pending'].includes(x)) return 'pending'
      if (['confirm','confirmed'].includes(x)) return 'confirmed'
      if (['in_progress','inprogress','servicing','service'].includes(x)) return 'in_progress'
      if (['completed','complete','finished','finish','done'].includes(x)) return 'completed'
      if (['closed','close'].includes(x)) return 'closed'
      if (['canceled','cancelled','cancel'].includes(x)) return 'canceled'
      if (['unservice','no_service','cannot_service','unable'].includes(x)) return 'unservice' as any
      return s
    } catch { return s }
  }
  return {
    // 使用 order_number 作為顯示 ID，�??��??��?使用 UUID
    id: r.order_number || r.id,
    memberId: pick('memberId', 'member_id'),
    customerName: pick('customerName', 'customer_name') || '',
    customerPhone: pick('customerPhone', 'customer_phone') || '',
    customerEmail: pick('customerEmail', 'customer_email') || '',
    customerTitle: pick('customerTitle', 'customer_title') || '',
    customerTaxId: pick('customerTaxId', 'customer_tax_id') || '',
    customerAddress: pick('customerAddress', 'customer_address') || '',
    preferredDate: pick('preferredDate', 'preferred_date') || '',
    preferredTimeStart: pick('preferredTimeStart', 'preferred_time_start') || '09:00',
    preferredTimeEnd: pick('preferredTimeEnd', 'preferred_time_end') || '12:00',
    referrerCode: pick('referrerCode', 'referrer_code') || '',
    paymentMethod: pick('paymentMethod', 'payment_method'),
    paymentStatus: pick('paymentStatus', 'payment_status'),
    pointsUsed: pick('pointsUsed', 'points_used') ?? 0,
    pointsDeductAmount: pick('pointsDeductAmount', 'points_deduct_amount') ?? 0,
    invoiceSent: (r.invoiceSent ?? r.invoice_sent) ?? false,
    note: pick('note', 'note') || '',
    serviceItems: pick('serviceItems', 'service_items') || [],
    assignedTechnicians: pick('assignedTechnicians', 'assigned_technicians') || [],
    signatureTechnician: r.signatureTechnician || r.signature_technician,
    status: normalizeStatus(r.status || 'draft'),
    platform: r.platform || '商',
    photos: r.photos || [],
    photosBefore: pick('photosBefore', 'photos_before') || [],
    photosAfter: pick('photosAfter', 'photos_after') || [],
    signatures: r.signatures || {},
    workStartedAt: pick('workStartedAt', 'work_started_at'),
    workCompletedAt: pick('workCompletedAt', 'work_completed_at'),
    serviceFinishedAt: pick('serviceFinishedAt', 'service_finished_at'),
    canceledReason: pick('canceledReason', 'canceled_reason'),
    closedAt: pick('closedAt', 'closed_at'),
    createdBy: pick('createdBy', 'created_by'),
    supportNote: pick('supportNote','support_note'),
    createdAt: pick('createdAt', 'created_at') || new Date().toISOString(),
    updatedAt: pick('updatedAt', 'updated_at') || new Date().toISOString(),
  }
}

// 輕量欄位（避免巨大 JSON，例如 photos_* 造成解析失敗或資源不足）
const ORDERS_COLUMNS =
  'id,order_number,customer_name,customer_phone,customer_email,customer_title,customer_tax_id,customer_address,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,signatures,payment_method,payment_status,points_used,points_deduct_amount,invoice_sent,note,support_note,category,channel,used_item_id,work_started_at,work_completed_at,service_finished_at,canceled_reason,status,created_by,created_at,updated_at'

// 詳細頁欄位（單筆讀取可接受較大欄位，需包含照片供結案檢核）
const ORDER_COLUMNS_DETAIL =
  ORDERS_COLUMNS + ',photos,photos_before,photos_after'

class SupabaseOrderRepo implements OrderRepo {
  private buildYearMonthRange(year?: string, month?: string): { start?: string; end?: string } {
    try {
      const now = new Date()
      const y = year && year.length===4 ? Number(year) : now.getFullYear()
      if (!month) {
        const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString()
        const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0)).toISOString()
        return { start, end }
      }
      const m = Math.max(1, Math.min(12, Number(month))) - 1
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0)).toISOString()
      const end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0)).toISOString()
      return { start, end }
    } catch { return {} }
  }

  async listByFilter(opts?: {
    year?: string,
    month?: string,
    status?: 'all'|'pending'|'confirmed'|'completed'|'closed'|'canceled',
    q?: string,
    platforms?: string[],
    limit?: number,
    offset?: number,
  }): Promise<{ rows: Order[]; total?: number }> {
    const { year, month, status = 'all', q, platforms, limit, offset } = opts || {}
    const RANGE = this.buildYearMonthRange(year, month)
    const LIST_COLS = 'id,order_number,customer_name,customer_phone,customer_email,customer_address,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,status,created_by,created_at,updated_at,work_started_at,work_completed_at,service_finished_at'
    let query = supabase.from('orders').select(LIST_COLS, { count: 'exact' })
    if (RANGE.start && RANGE.end) {
      // 月/年範圍：以 created_at 或 work_completed_at 任一落在範圍內
      query = query.or(`and(created_at.gte.${RANGE.start},created_at.lt.${RANGE.end}),and(work_completed_at.gte.${RANGE.start},work_completed_at.lt.${RANGE.end})`)
    }
    if (Array.isArray(platforms) && platforms.length>0) {
      query = query.in('platform', platforms as any)
    }
    if (q && q.trim()) {
      const kw = q.trim()
      query = query.or(`order_number.ilike.%${kw}%,customer_name.ilike.%${kw}%`)
    }
    if (status && status!=='all') {
      if (status==='pending') {
        query = query.in('status', ['pending','draft'] as any)
      } else if (status==='confirmed') {
        query = query.in('status', ['confirmed','in_progress'] as any)
      } else if (status==='completed') {
        query = query.eq('status','completed')
      } else if (status==='closed') {
        query = query.eq('status','closed')
      } else if (status==='canceled') {
        query = query.or('status.eq.canceled,status.eq.unservice')
      }
    }
    query = query.order('created_at', { ascending: false })
    if (typeof limit === 'number') {
      const from = Math.max(0, Number(offset||0))
      const to = from + Math.max(0, limit) - 1
      if (to >= from) query = query.range(from, to)
    }
    const { data, error, count } = await query
    if (error) throw new Error(`訂單清單讀取失敗: ${error.message}`)
    return { rows: (data||[]).map(fromDbRow), total: count||undefined }
  }

  async countByStatus(opts?: {
    year?: string,
    month?: string,
    q?: string,
    platforms?: string[],
  }): Promise<{ all: number; pending: number; confirmed: number; completed: number; closed: number; canceled: number }> {
    const { year, month, q, platforms } = opts || {}
    const RANGE = this.buildYearMonthRange(year, month)
    const base = () => {
      let qy = supabase.from('orders').select('id', { count: 'exact', head: true })
      if (RANGE.start && RANGE.end) qy = qy.or(`and(created_at.gte.${RANGE.start},created_at.lt.${RANGE.end}),and(work_completed_at.gte.${RANGE.start},work_completed_at.lt.${RANGE.end})`)
      if (Array.isArray(platforms) && platforms.length>0) qy = qy.in('platform', platforms as any)
      if (q && q.trim()) qy = qy.or(`order_number.ilike.%${q.trim()}%,customer_name.ilike.%${q.trim()}%`)
      return qy
    }
    const get = async (mod: (x: any)=>any) => {
      const { count, error } = await mod(base())
      if (error) return 0
      return count || 0
    }
    const all = await get(x=>x)
    const pending = await get(x=> x.in('status', ['pending','draft'] as any))
    const confirmed = await get(x=> x.in('status', ['confirmed','in_progress'] as any))
    const completed = await get(x=> x.eq('status','completed'))
    const closed = await get(x=> x.eq('status','closed'))
    const canceled = await get(x=> x.or('status.eq.canceled,status.eq.unservice'))
    return { all, pending, confirmed, completed, closed, canceled }
  }
  async list(): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDERS_COLUMNS)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Supabase orders list error:', error)
        throw new Error(`訂單清單載入失敗: ${error.message}`)
      }
      const rows = (data || []).map(fromDbRow) as any
      try { sessionStorage.setItem('cache-orders', JSON.stringify({ t: Date.now(), rows })) } catch {}
      return rows
    } catch (error: any) {
      console.error('Supabase orders list exception:', error)
      // 備援：若因巨大 JSON 解析失敗，改以更精簡欄位再嘗試一次
      try {
        const MIN_COLS = 'id,order_number,customer_name,customer_phone,customer_email,customer_address,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,status,created_at,updated_at,work_started_at,work_completed_at,service_finished_at'
        const { data } = await supabase
          .from('orders')
          .select(MIN_COLS)
          .order('created_at', { ascending: false })
        const rows = (data || []).map(fromDbRow) as any
        try { sessionStorage.setItem('cache-orders', JSON.stringify({ t: Date.now(), rows })) } catch {}
        return rows
      } catch (e2) {
        // NEW: 萃取有效草稿與正式單分開緩存，避免一次載入過多
        try {
          const { data: d1 } = await supabase
            .from('orders')
            .select('id,order_number,customer_name,customer_phone,preferred_date,preferred_time_start,preferred_time_end,assigned_technicians,signature_technician,status,created_at,updated_at')
            .in('status', ['confirmed','in_progress','completed','closed'])
            .order('created_at', { ascending: false })
          const rows1 = (d1 || []).map(fromDbRow) as any
          try { sessionStorage.setItem('cache-orders-hot', JSON.stringify({ t: Date.now(), rows: rows1 })) } catch {}
          // 草稿用更小欄位，且只取近14天
          const fourteen = new Date(Date.now() - 14*24*60*60*1000).toISOString()
          const { data: d2 } = await supabase
            .from('orders')
            .select('id,order_number,customer_name,customer_phone,status,created_at,updated_at')
            .eq('status','draft')
            .gte('created_at', fourteen)
            .order('created_at', { ascending: false })
          const rows2 = (d2 || []).map(fromDbRow) as any
          return [...rows2, ...rows1]
        } catch {}
        // 最後備援：讀 15 秒內緩存，避免白屏
        try {
          const raw = sessionStorage.getItem('cache-orders')
          if (raw) {
            const { t, rows } = JSON.parse(raw)
            if (Date.now() - t < 15_000) return rows
          }
        } catch {}
        console.error('Supabase orders list fallback failed:', e2)
        throw new Error('訂單清單載入失敗')
      }
    }
  }

  async get(id: string): Promise<Order | null> {
    try {
      // 先嘗試詳細欄位（含照片）
      {
        let query = supabase.from('orders').select(ORDER_COLUMNS_DETAIL)
        if (isValidUUID(id)) query = query.eq('id', id)
        else query = query.eq('order_number', id)
        const { data, error } = await query.maybeSingle()
        if (!error && data) return fromDbRow(data)
        if (error && error.code === 'PGRST116') return null
        if (error) console.warn('Supabase order get warn (detail maybeSingle), will try light:', error)
      }

      // 再嘗試輕量欄位（不含大欄位，降低 JSON 解析風險）
      {
        let query = supabase.from('orders').select(ORDERS_COLUMNS)
        if (isValidUUID(id)) query = query.eq('id', id)
        else query = query.eq('order_number', id)
        const { data, error, status } = await query.maybeSingle()
        if (!error && data) return fromDbRow(data)
        if (status === 406) {
          // 406 Not Acceptable（例如選取到複雜 JSON 型別導致）→ 改用最小欄位
        } else if (error && error.code === 'PGRST116') {
          return null
        } else if (error) {
          console.warn('Supabase order get light warn:', error)
        }
      }

      // 最後備援：最小欄位集合（避免 406）
      {
        const MIN_COLS = 'id,order_number,customer_name,customer_phone,customer_email,customer_address,preferred_date,preferred_time_start,preferred_time_end,platform,referrer_code,member_id,service_items,assigned_technicians,signature_technician,signatures,status,created_at,updated_at,work_started_at,work_completed_at,service_finished_at'
        let query = supabase.from('orders').select(MIN_COLS)
        if (isValidUUID(id)) query = query.eq('id', id)
        else query = query.eq('order_number', id)
        const { data } = await query.maybeSingle()
        return data ? fromDbRow(data) : null
      }
    } catch (error) {
      console.error('Supabase order get exception:', error)
      throw new Error('訂單載入失敗')
    }
  }

  async create(draft: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    try {
      // 若是後台要建立的草稿單，直接走回退流程（避免 RPC 延遲或限制）
      const isDraftFlow = (draft as any)?.status === 'draft'

      // 優先使用 RPC 將「產生單號 + 寫入 header/items」包成交易
      const payload: any = {
        customerName: (draft as any).customerName,
        customerPhone: (draft as any).customerPhone,
        customerEmail: (draft as any).customerEmail,
        customerAddress: (draft as any).customerAddress,
        preferredDate: (draft as any).preferredDate,
        preferredTimeStart: (draft as any).preferredTimeStart,
        preferredTimeEnd: (draft as any).preferredTimeEnd,
        paymentMethod: (draft as any).paymentMethod,
        pointsUsed: (draft as any).pointsUsed,
        pointsDeductAmount: (draft as any).pointsDeductAmount,
        note: (draft as any).note,
        platform: (draft as any).platform || '商',
        status: (draft as any).status || 'pending',
        serviceItems: (draft as any).serviceItems || []
      }

      if (!isDraftFlow) {
        try {
          const { data: rpcRow, error: rpcErr } = await supabase.rpc('create_reservation_order', {
            p_member_id: (draft as any).memberId || null,
            p_payload: payload
          })
          if (rpcErr) throw rpcErr
          if (rpcRow) {
            // RPC 可能未填完整欄位：補寫必要欄位並回讀
            const created = fromDbRow(rpcRow)
            const patch: Partial<Order> = {}
            // 補寫積分使用（部分 RPC 可能未保存）
            if ((created as any).pointsUsed == null && (payload as any).pointsUsed != null) {
              ;(patch as any).pointsUsed = (payload as any).pointsUsed
            }
            if ((created as any).pointsDeductAmount == null && (payload as any).pointsDeductAmount != null) {
              ;(patch as any).pointsDeductAmount = (payload as any).pointsDeductAmount
            }
            if ((!created.serviceItems || created.serviceItems.length===0) && Array.isArray(payload.serviceItems) && payload.serviceItems.length>0) {
              (patch as any).serviceItems = payload.serviceItems
            }
            if ((!created.customerAddress || created.customerAddress.trim()==='') && payload.customerAddress) {
              (patch as any).customerAddress = payload.customerAddress
            }
            if ((!created.customerEmail || created.customerEmail.trim()==='') && (draft as any).customerEmail) {
              (patch as any).customerEmail = (draft as any).customerEmail
            }
            if ((!created.customerName || created.customerName.trim()==='') && (draft as any).customerName) {
              (patch as any).customerName = (draft as any).customerName
            }
            if ((!created.customerPhone || created.customerPhone.trim()==='') && (draft as any).customerPhone) {
              (patch as any).customerPhone = (draft as any).customerPhone
            }
            if ((!created.preferredDate || String(created.preferredDate).trim()==='') && (draft as any).preferredDate) {
              (patch as any).preferredDate = (draft as any).preferredDate
            }
            if ((!created.preferredTimeStart || !created.preferredTimeEnd) && ((draft as any).preferredTimeStart || (draft as any).preferredTimeEnd)) {
              if ((draft as any).preferredTimeStart) (patch as any).preferredTimeStart = (draft as any).preferredTimeStart
              if ((draft as any).preferredTimeEnd) (patch as any).preferredTimeEnd = (draft as any).preferredTimeEnd
            }
            if ((created.status as any) !== 'pending' && payload.status === 'pending') {
              (patch as any).status = 'pending'
            }
            if (!created.platform || created.platform !== '商') {
              (patch as any).platform = '商'
            }
            try { if (Object.keys(patch).length>0) await this.update(created.id, patch) } catch {}
            try { const reread = await this.get(created.id); if (reread) return reread } catch {}
            // 新訂單通知（僅購物站 channel）
            try {
              const title = '購物站新訂單'
              const body = `新訂單：${String(created.id||'')}，客戶：${(draft as any).customerName||''}，電話：${(draft as any).customerPhone||''}`
              await supabase.from('notifications').insert({
                title,
                body,
                level: 'info',
                target: 'support',
                channel: 'store',
                created_at: new Date().toISOString(),
                sent_at: new Date().toISOString()
              } as any)
            } catch {}
            return created
          }
        } catch (rpcError: any) {
          // RPC 不存在或失敗時，回退到舊流程（兩段式）
          console.warn('create_reservation_order RPC 不可用，回退兩段式建立：', rpcError?.message || rpcError)
        }
      }

      // 回退流程（兩段式）：先產生單號再插入
      const row = toDbRow(draft)
      // 自動綁定會員：若未提供 memberId，嘗試以 email/phone 反查 members.id
      try {
        if (!row['member_id']) {
          const email = String(row['customer_email']||'').toLowerCase()
          const phone = String(row['customer_phone']||'').trim()
          if (email) {
            const { data: m } = await supabase
              .from('members')
              .select('id')
              .eq('email', email)
              .maybeSingle()
            if (m?.id) row['member_id'] = m.id
          }
          if (!row['member_id'] && phone) {
            const { data: m2 } = await supabase
              .from('members')
              .select('id')
              .eq('phone', phone)
              .maybeSingle()
            if (m2?.id) row['member_id'] = m2.id
          }
        }
      } catch {}
      // 若有 createdBy，轉到 snake case 欄位
      if ((draft as any).createdBy && !row['created_by']) row['created_by'] = (draft as any).createdBy
      row.id = generateUUID()
      
      // 不連號、不重覆：OD + 隨機5位數字；若碰撞多次自動切換前置英文（OD→OE→...→OZ）；最後退回時間碼
      async function generateNonSequential(): Promise<string> {
        const prefixes = ['OD','OE','OF','OG','OH','OI','OJ','OK','OL','OM','ON','OO','OP','OQ','OR','OS','OT','OU','OV','OW','OX','OY','OZ']
        for (let p = 0; p < prefixes.length; p++) {
          for (let attempt = 0; attempt < 10; attempt++) {
            const code = Math.floor(10000 + Math.random() * 90000).toString()
            const candidate = `${prefixes[p]}${code}`
            const { data: existing } = await supabase
              .from('orders')
              .select('id')
              .eq('order_number', candidate)
              .maybeSingle()
            if (!existing) return candidate
          }
        }
        const tail = Date.now().toString(36).toUpperCase().slice(-5)
        return `OD${tail}`
      }
      row.order_number = await generateNonSequential()
      
      // 檢查是否重複，如果重複則重新生成（maybeSingle 避免未命中即丟錯）
      let attempts = 0
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', row.order_number)
          .maybeSingle()
        if (!existing) break
        // 重複則重新產生（不連號）
        row.order_number = await generateNonSequential()
        attempts++
      }

      const { data, error } = await withRetry(() => supabase.from('orders').insert(row).select(ORDERS_COLUMNS).single())
      if (error) {
        console.error('Supabase order create error:', error)
        throw new Error(`訂單建立失敗: ${error.message}`)
      }
      // 新訂單通知（僅購物站 channel）
      try {
        const title = '購物站新訂單'
        const payload = { kind: 'new_order', order_id: String(row.order_number||row.id), customer_name: row.customer_name||'', customer_phone: row.customer_phone||'' }
        await supabase.from('notifications').insert({ title, body: JSON.stringify(payload), level: 'info', target: 'support', channel: 'store', created_at: new Date().toISOString(), sent_at: new Date().toISOString() } as any)
      } catch {}
      return fromDbRow(data)
    } catch (error) {
      console.error('Supabase order create exception:', error)
      throw new Error('訂單建立失敗')
    }
  }

  async update(id: string, patch: Partial<Order>): Promise<void> {
    try {
      const payload = toDbRow(patch)
      // 防止將地址覆蓋為空字串
      if (Object.prototype.hasOwnProperty.call(payload, 'customer_address')) {
        const val = payload['customer_address']
        if (val === '' || val === null || val === undefined) {
          delete payload['customer_address']
        }
      }
      let query = supabase
        .from('orders')
        .update(payload)
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      const { error } = await withRetry(() => query)
      if (error) {
        console.error('Supabase order update error:', error)
        throw new Error(`訂單更新失敗: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order update exception:', error)
      throw new Error('訂單更新失敗')
    }
  }

  async delete(id: string, reason: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .delete()
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order delete error:', error)
        throw new Error(`訂單?�除失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order delete exception:', error)
      throw new Error('訂單?�除失�?')
    }
  }

  async cancel(id: string, reason: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          status: 'canceled', 
          canceled_reason: reason,
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order cancel error:', error)
        throw new Error(`訂單?��?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order cancel exception:', error)
      throw new Error('訂單?��?失�?')
    }
  }

  async confirm(id: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order confirm error:', error)
        throw new Error(`訂單確�?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order confirm exception:', error)
      throw new Error('訂單確�?失�?')
    }
  }

  async startWork(id: string, at: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          work_started_at: at,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order startWork error:', error)
        throw new Error(`?��?工�?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order startWork exception:', error)
      throw new Error('?��?工�?失�?')
    }
  }

  async finishWork(id: string, at: string): Promise<void> {
    try {
      let query = supabase
        .from('orders')
        .update({ 
          work_completed_at: at,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
      
      // 以 UUID 為主，否則以 order_number
      if (isValidUUID(id)) {
        query = query.eq('id', id)
      } else {
        query = query.eq('order_number', id)
      }
      
      const { error } = await query
      
      if (error) {
        console.error('Supabase order finishWork error:', error)
        throw new Error(`完�?工�?失�?: ${error.message}`)
      }
    } catch (error) {
      console.error('Supabase order finishWork exception:', error)
      throw new Error('完�?工�?失�?')
    }
  }

  // 客服確認並推播會員（以顧客 Email 為目標）
  async confirmWithMemberNotify(id: string): Promise<void> {
    await this.confirm(id)
    try {
      // 取得訂單資料，用於組合通知內容
      const order = await this.get(id)
      if (!order) return
      const email = (order.customerEmail || '').toLowerCase()
      if (!email) return
      const timeBand = (order.preferredTimeStart && order.preferredTimeEnd)
        ? `${order.preferredTimeStart}-${order.preferredTimeEnd}`
        : ''
      const title = '服務已確認通知'
      const body = `親愛的${order.customerName||''}您好，感謝您的惠顧！您${order.preferredDate||''}的服務已確認，訂單編號 ${order.id}。技師將於 ${timeBand} 抵達，請保持電話暢通。建議加入官方 LINE：@942clean 以利溝通與留存紀錄。如需異動請於 LINE 留言或致電 (02)7756-2269。`
      // 直接寫入 notifications 表
      await supabase.from('notifications').insert({
        title,
        body,
        level: 'info',
        target: 'user',
        target_user_email: email,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.warn('confirmWithMemberNotify 寫入通知失敗：', e)
    }
  }
}

export const orderRepo = new SupabaseOrderRepo()
