import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'

type TableKey = 'hero_slides' | 'services' | 'advantages' | 'promotions' | 'loyalty' | 'contacts' | 'categories'

const TABLES: { key: TableKey; name: string }[] = [
  { key: 'hero_slides', name: 'Hero 輪播圖' },
  { key: 'services', name: '首頁服務卡' },
  { key: 'advantages', name: '為什麼選擇我們' },
  { key: 'promotions', name: '會員/活動' },
  { key: 'loyalty', name: '積分設定' },
  { key: 'contacts', name: '聯繫我們' },
  { key: 'categories', name: '分類清單' },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-gray-700 mb-1">{label}</div>
      {children}
    </div>
  )
}

export default function AdminContentPage() {
  const [current, setCurrent] = useState<TableKey>('hero_slides')
  const [rows, setRows] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const columns = useMemo(() => {
    switch (current) {
      case 'hero_slides':
        return [
          { key: 'title', label: '標題', type: 'text' },
          { key: 'subtitle', label: '副標', type: 'text' },
          { key: 'image', label: '圖片 URL', type: 'text' },
          { key: 'sort_order', label: '排序', type: 'number' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      case 'services':
        return [
          { key: 'name', label: '名稱', type: 'text' },
          { key: 'description', label: '描述', type: 'textarea' },
          { key: 'features', label: '特色(逗號分隔)', type: 'text' },
          { key: 'icon', label: '圖示(文字，如 Sparkles)', type: 'text' },
          { key: 'link', label: '連結', type: 'text' },
          { key: 'sort_order', label: '排序', type: 'number' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      case 'advantages':
        return [
          { key: 'title', label: '標題', type: 'text' },
          { key: 'description', label: '描述', type: 'textarea' },
          { key: 'icon', label: '圖示(文字，如 Award)', type: 'text' },
          { key: 'sort_order', label: '排序', type: 'number' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      case 'promotions':
        return [
          { key: 'title', label: '標題', type: 'text' },
          { key: 'subtitle', label: '副標', type: 'textarea' },
          { key: 'items', label: '項目(JSON：[{"heading":"","subtext":""}])', type: 'textarea' },
          { key: 'cta_label', label: '按鈕文字', type: 'text' },
          { key: 'cta_link', label: '按鈕連結', type: 'text' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      case 'loyalty':
        return [
          { key: 'earn_per_amount', label: '消費金額(元)→1點，例如100', type: 'number' },
          { key: 'redeem_value_per_point', label: '每點折抵金額(元)，例如1', type: 'number' },
          { key: 'notes', label: '補充(JSON 陣列)', type: 'textarea' },
          { key: 'cta_label', label: '按鈕文字', type: 'text' },
          { key: 'cta_link', label: '按鈕連結', type: 'text' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      case 'contacts':
        return [
          { key: 'company', label: '公司名稱', type: 'text' },
          { key: 'tax_id', label: '統編', type: 'text' },
          { key: 'phone', label: '電話', type: 'text' },
          { key: 'line_id', label: 'LINE ID', type: 'text' },
          { key: 'zones', label: '服務區(長文)', type: 'textarea' },
          { key: 'notes', label: '備註(長文)', type: 'textarea' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      case 'categories':
        return [
          { key: 'key', label: '鍵值(cleaning/new/used/home)', type: 'text' },
          { key: 'name', label: '顯示名稱', type: 'text' },
          { key: 'sort_order', label: '排序', type: 'number' },
          { key: 'enabled', label: '啟用', type: 'checkbox' },
        ]
      default:
        return []
    }
  }, [current])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from(current)
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setRows(data || [])
    } catch (e: any) {
      setError(e?.message || '讀取失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [current])

  const onEdit = (row?: any) => {
    setEditing(row || {})
  }

  const onDelete = async (id: string) => {
    if (!confirm('確定要刪除？')) return
    setLoading(true)
    try {
      const { error } = await supabase.from(current).delete().eq('id', id)
      if (error) throw error
      await load()
    } catch (e: any) {
      setError(e?.message || '刪除失敗')
    } finally {
      setLoading(false)
    }
  }

  const onSave = async () => {
    if (!editing) return
    setLoading(true)
    setError('')
    try {
      const payload: any = { ...editing }
      // 型別轉換
      if (current === 'services' && typeof payload.features === 'string') {
        payload.features = (payload.features as string)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      }
      if ((current === 'promotions' || current === 'loyalty') && typeof payload.items === 'string') {
        try { payload.items = JSON.parse(payload.items) } catch {}
      }
      if (current === 'loyalty' && typeof payload.notes === 'string') {
        try { payload.notes = JSON.parse(payload.notes) } catch {}
      }
      if (payload.id) {
        const { error } = await supabase.from(current).update(payload).eq('id', payload.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from(current).insert(payload)
        if (error) throw error
      }
      setEditing(null)
      await load()
    } catch (e: any) {
      setError(e?.message || '儲存失敗')
    } finally {
      setLoading(false)
    }
  }

  const move = async (id: string, delta: number) => {
    const list = [...rows]
    const idx = list.findIndex(x => x.id === id)
    if (idx < 0) return
    const swapIdx = idx + delta
    if (swapIdx < 0 || swapIdx >= list.length) return
    const a = list[idx]
    const b = list[swapIdx]
    try {
      await supabase.from(current).update({ sort_order: b.sort_order ?? swapIdx }).eq('id', a.id)
      await supabase.from(current).update({ sort_order: a.sort_order ?? idx }).eq('id', b.id)
      await load()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">內容管理</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          {TABLES.map(t => (
            <button
              key={t.key}
              onClick={() => setCurrent(t.key)}
              className={`px-3 py-2 rounded-lg text-sm ${current===t.key?'bg-blue-600 text-white':'bg-white border'} `}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">{TABLES.find(t=>t.key===current)?.name} 列表</div>
                <button onClick={()=> onEdit()} className="px-3 py-1.5 bg-blue-600 text-white rounded">新增</button>
              </div>
              {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
              {loading ? (
                <div className="text-gray-500">載入中...</div>
              ) : (
                <div className="space-y-2">
                  {rows.map((r:any, i:number) => (
                    <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div className="text-sm text-gray-800 truncate">
                        <div className="font-medium">{r.title || r.name || r.key || '(無標題)'}</div>
                        <div className="text-gray-500 truncate max-w-xl">{r.subtitle || r.description || r.phone || r.company || ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {'sort_order' in r && (
                          <>
                            <button onClick={()=>move(r.id, -1)} className="px-2 py-1 text-sm border rounded">上移</button>
                            <button onClick={()=>move(r.id, +1)} className="px-2 py-1 text-sm border rounded">下移</button>
                          </>
                        )}
                        <button onClick={()=>onEdit(r)} className="px-2 py-1 text-sm border rounded">編輯</button>
                        <button onClick={()=>onDelete(r.id)} className="px-2 py-1 text-sm bg-rose-600 text-white rounded">刪除</button>
                      </div>
                    </div>
                  ))}
                  {rows.length===0 && <div className="text-gray-500 text-sm">尚無資料</div>}
                </div>
              )}
            </div>
          </div>

          {/* 編輯器 */}
          <div>
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="font-semibold mb-3">{editing?.id ? '編輯' : '新增'} {TABLES.find(t=>t.key===current)?.name}</div>
              {editing ? (
                <div className="space-y-3">
                  {columns.map(col => (
                    <Field key={col.key} label={col.label}>
                      {col.type === 'text' && (
                        <input
                          className="w-full rounded border px-3 py-2"
                          value={editing[col.key] ?? ''}
                          onChange={(e)=> setEditing({ ...editing, [col.key]: e.target.value })}
                        />
                      )}
                      {col.type === 'number' && (
                        <input type="number" className="w-full rounded border px-3 py-2"
                          value={editing[col.key] ?? 0}
                          onChange={(e)=> setEditing({ ...editing, [col.key]: Number(e.target.value) })}
                        />
                      )}
                      {col.type === 'textarea' && (
                        <textarea className="w-full rounded border px-3 py-2 h-28"
                          value={editing[col.key] ?? ''}
                          onChange={(e)=> setEditing({ ...editing, [col.key]: e.target.value })}
                        />
                      )}
                      {col.type === 'checkbox' && (
                        <input type="checkbox"
                          checked={!!editing[col.key]}
                          onChange={(e)=> setEditing({ ...editing, [col.key]: e.target.checked })}
                        />
                      )}
                    </Field>
                  ))}
                  <div className="flex items-center gap-2">
                    <button onClick={onSave} className="px-3 py-1.5 bg-blue-600 text-white rounded">儲存</button>
                    <button onClick={()=>setEditing(null)} className="px-3 py-1.5 border rounded">取消</button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">選擇左側「新增」或「編輯」以開始</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


