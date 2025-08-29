import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'

export default function ProductsPage() {
  const u = authRepo.getCurrentUser()
  if (u && u.role==='technician') return <Navigate to="/dispatch" replace />
  const [rows, setRows] = useState<any[]>([])
  const [repos, setRepos] = useState<any>(null)
  const [edit, setEdit] = useState<any | null>(null)
  const [img, setImg] = useState<string | null>(null)
  const [cats, setCats] = useState<Array<{id:string;name:string}>>([])
  const [catMngOpen, setCatMngOpen] = useState(false)
  const load = async () => { if(!repos) return; setRows(await repos.productRepo.list()) }
  useEffect(() => { (async()=>{ const a = await loadAdapters(); setRepos(a) })() }, [])
  useEffect(() => { if(repos){ load(); (async()=>{ try{ const meta = await import('../../adapters/supabase/product_meta'); const list = await meta.productMeta.listCategories(true); setCats(list.map(c=>({id:c.id,name:c.name}))) } catch {} })() } }, [repos])
  
  // 檢查安全庫存提醒
  const lowStockProducts = rows.filter(p => p.safeStock && p.safeStock > 0 && (p.quantity || 0) < p.safeStock)
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">產品管理</div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setEdit({ 
            id:'', 
            name:'', 
            unitPrice:0, 
            groupPrice:undefined, 
            groupMinQty:0, 
            description:'', 
            content: '', // 新增內容欄位
            region: '', // 新增地區欄位
            imageUrls:[], 
            safeStock:0, 
            category:'service',
            defaultQuantity: 1
          })} className="rounded-lg bg-brand-500 px-3 py-1 text-white">新增</button>
          {rows.length===0 && (
            <button onClick={async()=>{
              if(!repos) return
              try {
                await repos.productRepo.upsert({ id:'', name:'分離式冷氣清洗', unitPrice:1800, groupPrice:1600, groupMinQty:2, description:'室內外機標準清洗，包含濾網、蒸發器、冷凝器清潔', content: '專業冷氣清洗服務，適用於各種分離式冷氣機型', region: '全台', imageUrls:[], safeStock:20, defaultQuantity: 1 })
                await repos.productRepo.upsert({ id:'', name:'洗衣機清洗（滾筒）', unitPrice:1999, groupPrice:1799, groupMinQty:2, description:'滾筒式洗衣機拆洗保養，包含內筒、外筒、管路清潔', content: '深度清洗滾筒洗衣機，去除污垢和異味', region: '全台', imageUrls:[], safeStock:20, defaultQuantity: 1 })
                await repos.productRepo.upsert({ id:'', name:'倒T型抽油煙機清洗', unitPrice:2200, groupPrice:2000, groupMinQty:2, description:'不鏽鋼倒T型抽油煙機，包含內部機械清洗', content: '專業抽油煙機清洗，確保廚房空氣品質', region: '全台', imageUrls:[], safeStock:20, defaultQuantity: 1 })
                await repos.productRepo.upsert({ id:'', name:'傳統雙渦輪抽油煙機清洗', unitPrice:1800, groupPrice:1600, groupMinQty:2, description:'傳統型雙渦輪抽油煙機清洗保養', content: '傳統抽油煙機專業清洗服務', region: '全台', imageUrls:[], safeStock:20, defaultQuantity: 1 })
                await load()
                alert('預設產品已建立')
              } catch(e:any){ alert(e?.message||'建立失敗') }
            }} className="rounded-lg bg-gray-900 px-3 py-1 text-white">建立預設產品</button>
          )}
        </div>
      </div>
      
      {/* 安全庫存提醒 */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
          <div className="font-semibold">⚠️ 安全庫存提醒</div>
          <div>以下產品庫存低於安全庫存：</div>
          <div className="mt-1 space-y-1">
            {lowStockProducts.map(p => (
              <div key={p.id} className="text-xs">
                • {p.name}：庫存 {p.quantity || 0} / 安全庫存 {p.safeStock}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 提醒採用模式代號 */}
      <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">建檔提醒：請先選擇「模式代號（不可見於購物車）」與「區塊」，其行為會決定是否扣庫、是否唯一件、數量限制等。</div>
      {rows.map(p => (
        <div key={p.id} className={`rounded-xl border p-4 shadow-card ${p.safeStock && p.safeStock>0 && (p.quantity||0) < p.safeStock ? 'border-amber-400 bg-amber-50' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-gray-500">模式 {p.modeCode||'-'}｜區塊 {p.category||'-'}｜單價 {p.unitPrice}｜團購 {p.groupPrice||'-'}（{p.groupMinQty} 件）｜預設數量 {p.defaultQuantity||1}｜已售 {p.soldCount||0}</div>
              {p.content && <div className="text-xs text-gray-600 mt-1">內容：{p.content}</div>}
              {p.region && <div className="text-xs text-gray-600">地區：{p.region}</div>}
              {p.safeStock ? <div className="text-xs text-amber-600">安全庫存 {p.safeStock}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setEdit(p)} className="rounded-lg bg-gray-900 px-3 py-1 text-white">編輯</button>
              <button onClick={async()=>{
                const { confirmTwice } = await import('../kit')
                const ok = await confirmTwice('確認刪除該產品？','刪除後無法復原，仍要刪除？')
                if(!ok) return
                try { if(!repos) return; await repos.productRepo.remove(p.id); load() } catch {}
              }} className="rounded-lg bg-rose-500 px-3 py-1 text-white">刪除</button>
            </div>
          </div>
        </div>
      ))}
      {rows.length===0 && <div className="text-gray-500">尚無產品</div>}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
            <div className="mb-2 text-lg font-semibold">編輯產品</div>
            <div className="space-y-2 text-sm">
              <div>模式代號（不可見於購物車）：
                <select className="w-full rounded border px-2 py-1" value={edit.modeCode||'svc'} onChange={e=>setEdit({...edit,modeCode:e.target.value})}>
                  <option value="svc">svc（服務：不扣庫）</option>
                  <option value="home">home（居家：不扣庫）</option>
                  <option value="new">new（新品：一般不扣庫）</option>
                  <option value="used">used（二手：唯一件）</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">區塊：
                  <select className="w-full rounded border px-2 py-1" value={edit.categoryId||''} onChange={e=>setEdit({...edit,categoryId:e.target.value})}>
                    <option value="">（未指定）</option>
                    {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button onClick={()=>setCatMngOpen(true)} className="rounded bg-gray-100 px-2 py-1 text-xs">+</button>
              </div>
              <div>名稱：<input className="w-full rounded border px-2 py-1" value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})} /></div>
              <div>單價：<input type="number" className="w-full rounded border px-2 py-1" value={edit.unitPrice} onChange={e=>setEdit({...edit,unitPrice:Number(e.target.value)})} /></div>
              <div>內容：<textarea className="w-full rounded border px-2 py-1" rows={3} value={edit.content || ''} onChange={e=>setEdit({...edit,content:e.target.value})} placeholder="產品詳細內容描述..." /></div>
              <div>地區：<input className="w-full rounded border px-2 py-1" value={edit.region || ''} onChange={e=>setEdit({...edit,region:e.target.value})} placeholder="服務地區..." /></div>
              <div>預設數量：<input type="number" className="w-full rounded border px-2 py-1" value={edit.defaultQuantity||1} onChange={e=>setEdit({...edit,defaultQuantity:Math.max(1, Number(e.target.value)||1)})} /></div>
              <div>安全庫存：<input type="number" className="w-full rounded border px-2 py-1" value={edit.safeStock||0} onChange={e=>setEdit({...edit,safeStock:Number(e.target.value)})} /></div>
              <div className="text-xs text-gray-500">保存後可於訂單項目引用此產品（帶入單價）。</div>
              <div>
                <label className="mb-1 block">圖片（自動壓縮 ≤200KB）</label>
                <input type="file" accept="image/*" onChange={async (e)=>{
                  const f = e.target.files?.[0]; if(!f) return
                  const { compressImageToDataUrl } = await import('../../utils/image')
                  const dataUrl = await compressImageToDataUrl(f, 200)
                  setImg(dataUrl)
                }} />
                {img && <img src={img} className="mt-2 h-24 w-24 rounded object-cover" />}
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={()=>setEdit(null)} className="rounded-lg bg-gray-100 px-3 py-1">取消</button>
              {edit.id && (
              <button onClick={async()=>{
                if(!repos) return
                const { confirmTwice } = await import('../kit')
                if (!(await confirmTwice('建立對應庫存？','將建立數量為 0、並綁定此產品。是否繼續？'))) return
                await repos.inventoryRepo.upsert({ id: '', name: edit.name, productId: edit.id, quantity: 0, imageUrls: [], safeStock: edit.safeStock||0 })
                alert('已建立對應庫存並綁定')
              }} className="rounded-lg bg-gray-200 px-3 py-1 text-sm">建立對應庫存</button>
              )}
              <button onClick={async()=>{ if(!repos) return; const payload = { ...edit, imageUrls: img? [img] : (edit.imageUrls||[]) }; await repos.productRepo.upsert(payload); setEdit(null); setImg(null); load() }} className="rounded-lg bg-brand-500 px-3 py-1 text-white">儲存</button>
            </div>
          </div>
        </div>
      )}

      {catMngOpen && (
        <CategoryManager onClose={()=>setCatMngOpen(false)} onChanged={async()=>{ try{ const meta = await import('../../adapters/supabase/product_meta'); const list = await meta.productMeta.listCategories(true); setCats(list.map(c=>({id:c.id,name:c.name}))) } catch {} }} />
      )}
    </div>
  )
}


function CategoryManager({ onClose, onChanged }: { onClose: ()=>void; onChanged: ()=>void }){
  const [rows, setRows] = useState<any[]>([])
  const [name, setName] = useState('')
  const [sort, setSort] = useState(0)
  const [active, setActive] = useState(true)
  useEffect(()=>{ (async()=>{ try{ const meta = await import('../../adapters/supabase/product_meta'); const list = await meta.productMeta.listCategories(false); setRows(list) } catch {} })() },[])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg font-semibold">區塊管理</div>
          <button onClick={onClose} className="rounded bg-gray-100 px-2 py-1 text-sm">關閉</button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded border px-2 py-1" placeholder="區塊名稱" value={name} onChange={e=>setName(e.target.value)} />
            <input type="number" className="rounded border px-2 py-1" placeholder="排序" value={sort} onChange={e=>setSort(Number(e.target.value)||0)} />
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} />啟用</label>
          <div className="text-right">
            <button onClick={async()=>{ const meta = await import('../../adapters/supabase/product_meta'); await meta.productMeta.upsertCategory({ name, sortOrder: sort, active }); const list = await meta.productMeta.listCategories(false); setRows(list); setName(''); setSort(0); setActive(true); onChanged() }} className="rounded bg-brand-500 px-3 py-1 text-white">新增/更新</button>
          </div>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {rows.map((r:any)=> (
            <div key={r.id} className="flex items-center justify-between rounded border p-2">
              <div className="min-w-0 flex-1 truncate">{r.name} <span className="text-xs text-gray-400">#{r.sortOrder}</span> {!r.active && <span className="ml-1 rounded bg-gray-100 px-1 text-[10px]">停用</span>}</div>
              <div className="flex items-center gap-2">
                <button onClick={()=>{ setName(r.name); setSort(r.sortOrder||0); setActive(!!r.active) }} className="rounded bg-gray-100 px-2 py-1 text-xs">編輯</button>
                {r.active && <button onClick={async()=>{ const meta = await import('../../adapters/supabase/product_meta'); await meta.productMeta.deactivateCategory(r.id); const list = await meta.productMeta.listCategories(false); setRows(list); onChanged() }} className="rounded bg-rose-500 px-2 py-1 text-xs text-white">停用</button>}
              </div>
            </div>
          ))}
          {rows.length===0 && <div className="text-gray-500">尚無區塊</div>}
        </div>
      </div>
    </div>
  )
}

