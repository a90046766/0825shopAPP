import PublicHeader from '../components/PublicHeader'
import { useEffect, useState } from 'react'
import { siteCMS } from '../../adapters/supabase/site_cms'

export default function UsedStorePage(){
  const [hero, setHero] = useState<any|null>(null)
  const [sections, setSections] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editingHero, setEditingHero] = useState<any|null>(null)
  const [editingSection, setEditingSection] = useState<any|null>(null)

  const userRaw = (()=>{ try{ return JSON.parse(localStorage.getItem('supabase-auth-user')||'null') }catch{return null} })()
  const isEditor = userRaw?.role==='admin' || userRaw?.role==='support'

  useEffect(()=>{ (async()=>{
    try { const h = await siteCMS.getHero('used-hero'); setHero(h) } catch {}
    try { const list = await siteCMS.listSections('/used'); setSections(list) } catch {}
  })() },[])

  return (
    <div className="space-y-4">
      <PublicHeader />

      {/* Hero */}
      <section className={`relative overflow-hidden rounded-2xl ${hero?.imageUrl? 'p-0' : 'p-6'} shadow-card ${hero?.imageUrl? '' : 'bg-gradient-to-r from-brand-500 to-brand-400 text-white'}`}>
        {hero?.imageUrl ? (
          <div className="relative">
            <img src={hero.imageUrl} className="h-56 w-full object-cover md:h-72" />
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 flex items-center p-6">
              <div className="max-w-2xl text-white">
                <h1 className="text-2xl font-extrabold tracking-tight">{hero.title||'二手家電'}</h1>
                <p className="mt-2 text-sm text-white/90">{hero.subtitle||'來源透明・檢測流程・唯一件・基本保固'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">二手家電</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">來源透明、檢測流程、唯一件標記與基本保固。可出售/收購，歡迎聯繫。</p>
          </div>
        )}
      </section>

      {/* 內容段落 */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(sections.length? sections : [
          { id:'u1', title:'檢測流程', content:'外觀檢查→功能測試→耗材評估→拍照建檔' },
          { id:'u2', title:'唯一件', content:'每件商品皆唯一，售完即下架' },
          { id:'u3', title:'保固說明', content:'基本功能保固期內故障，提供維修或退換' },
        ]).map((s:any)=> (
          <div key={s.id} className="rounded-2xl border bg-white p-4 shadow-card">
            <div className="text-base font-semibold text-gray-900">{s.title}</div>
            <div className="mt-1 text-sm text-gray-600 whitespace-pre-line">{s.content}</div>
          </div>
        ))}
      </section>

      {isEditor && (
        <section className="rounded-2xl border bg-white p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-semibold">二手家電頁管理</div>
            <button onClick={()=>setEditMode(v=>!v)} className="rounded bg-gray-100 px-3 py-1 text-sm">{editMode?'關閉':'管理模式'}</button>
          </div>
          {editMode && (
            <div className="space-y-4">
              <div className="rounded border p-3">
                <div className="mb-1 font-medium">Hero 橫幅</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <input className="rounded border px-2 py-1" placeholder="標題" value={(editingHero??hero)?.title||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'used-hero' }), title:e.target.value })} />
                  <input className="rounded border px-2 py-1" placeholder="副標" value={(editingHero??hero)?.subtitle||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'used-hero' }), subtitle:e.target.value })} />
                  <input className="col-span-2 rounded border px-2 py-1" placeholder="圖片網址（可留空）" value={(editingHero??hero)?.imageUrl||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'used-hero' }), imageUrl:e.target.value })} />
                </div>
                <div className="mt-2 text-right">
                  <button onClick={async()=>{ try{ const saved = await siteCMS.upsertBanner({ id: hero?.id, slot:'used-hero', title:(editingHero??hero)?.title, subtitle:(editingHero??hero)?.subtitle, imageUrl:(editingHero??hero)?.imageUrl, sortOrder:0, active:true }); setHero(saved); setEditingHero(null) }catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存 Hero</button>
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="mb-1 font-medium">內容版位</div>
                <div className="space-y-2">
                  {sections.map(s=> (
                    <div key={s.id} className="rounded border p-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <input className="rounded border px-2 py-1" value={(editingSection?.id===s.id? editingSection.title : s.title)||''} onChange={e=> setEditingSection({ ...(editingSection?.id===s.id? editingSection : s), title:e.target.value })} />
                        <input className="rounded border px-2 py-1" type="number" value={(editingSection?.id===s.id? editingSection.sortOrder : s.sortOrder)||0} onChange={e=> setEditingSection({ ...(editingSection?.id===s.id? editingSection : s), sortOrder:Number(e.target.value)||0 })} />
                        <textarea className="col-span-2 rounded border px-2 py-1" rows={3} value={(editingSection?.id===s.id? editingSection.content : s.content)||''} onChange={e=> setEditingSection({ ...(editingSection?.id===s.id? editingSection : s), content:e.target.value })} />
                      </div>
                      <div className="mt-2 text-right">
                        <button onClick={async()=>{ try{ const payload = (editingSection?.id===s.id? editingSection : s); const saved = await siteCMS.upsertSection({ id: s.id, page:'/used', kind: payload.kind||'content', title: payload.title, content: payload.content, imageUrl: payload.imageUrl, sortOrder: payload.sortOrder, active: true }); const list = await siteCMS.listSections('/used'); setSections(list); setEditingSection(null) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right">
                    <button onClick={()=> setSections(prev=> [...prev, { id: `tmp-${Date.now()}`, page:'/used', kind:'content', title:'新段落', content:'', sortOrder:(prev[prev.length-1]?.sortOrder||0)+1, active:true }])} className="rounded bg-gray-100 px-3 py-1 text-sm">新增版位</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}


