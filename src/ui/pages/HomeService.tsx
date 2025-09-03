import PublicHeader from '../components/PublicHeader'
import { useEffect, useState } from 'react'
import { siteCMS } from '../../adapters/supabase/site_cms'

export default function HomeServicePage(){
  const [hero, setHero] = useState<any|null>(null)
  const [sections, setSections] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editingHero, setEditingHero] = useState<any|null>(null)
  const [editingSection, setEditingSection] = useState<any|null>(null)

  const userRaw = (()=>{ try{ return JSON.parse(localStorage.getItem('supabase-auth-user')||'null') }catch{return null} })()
  const isEditor = userRaw?.role==='admin' || userRaw?.role==='support'

  useEffect(()=>{ (async()=>{
    try { const h = await siteCMS.getHero('services-home-hero'); setHero(h) } catch {}
    try { const list = await siteCMS.listSections('/services/home'); setSections(list) } catch {}
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
                <h1 className="text-2xl font-extrabold tracking-tight">{hero.title||'居家清潔 / 消毒'}</h1>
                <p className="mt-2 text-sm text-white/90">{hero.subtitle||'定期清潔 / 裝修後清潔 / 環境消毒 — 專業團隊到府'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">居家清潔 / 消毒</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">定期清潔、裝修後清潔與環境消毒服務。範圍、估價、流程與保固說明。</p>
          </div>
        )}
      </section>

      {/* 內容段落 */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(sections.length? sections : [
          { id:'h1', title:'項目範圍', content:'地板/廚衛/玻璃/陽台/傢俱表面與細部' },
          { id:'h2', title:'到府流程', content:'確認範圍→到府作業→現場點交→雙簽名結案' },
          { id:'h3', title:'安全耗材', content:'使用中性清潔劑與適當稀釋比例，保護表面材質' },
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
            <div className="text-lg font-semibold">居家清潔頁管理</div>
            <button onClick={()=>setEditMode(v=>!v)} className="rounded bg-gray-100 px-3 py-1 text-sm">{editMode?'關閉':'管理模式'}</button>
          </div>
          {editMode && (
            <div className="space-y-4">
              <div className="rounded border p-3">
                <div className="mb-1 font-medium">Hero 橫幅</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <input className="rounded border px-2 py-1" placeholder="標題" value={(editingHero??hero)?.title||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'services-home-hero' }), title:e.target.value })} />
                  <input className="rounded border px-2 py-1" placeholder="副標" value={(editingHero??hero)?.subtitle||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'services-home-hero' }), subtitle:e.target.value })} />
                  <input className="col-span-2 rounded border px-2 py-1" placeholder="圖片網址（可留空）" value={(editingHero??hero)?.imageUrl||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'services-home-hero' }), imageUrl:e.target.value })} />
                </div>
                <div className="mt-2 text-right">
                  <button onClick={async()=>{ try{ const saved = await siteCMS.upsertBanner({ id: hero?.id, slot:'services-home-hero', title:(editingHero??hero)?.title, subtitle:(editingHero??hero)?.subtitle, imageUrl:(editingHero??hero)?.imageUrl, sortOrder:0, active:true }); setHero(saved); setEditingHero(null) }catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存 Hero</button>
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
                        <button onClick={async()=>{ try{ const payload = (editingSection?.id===s.id? editingSection : s); const saved = await siteCMS.upsertSection({ id: s.id, page:'/services/home', kind: payload.kind||'content', title: payload.title, content: payload.content, imageUrl: payload.imageUrl, sortOrder: payload.sortOrder, active: true }); const list = await siteCMS.listSections('/services/home'); setSections(list); setEditingSection(null) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right">
                    <button onClick={()=> setSections(prev=> [...prev, { id: `tmp-${Date.now()}`, page:'/services/home', kind:'content', title:'新段落', content:'', sortOrder:(prev[prev.length-1]?.sortOrder||0)+1, active:true }])} className="rounded bg-gray-100 px-3 py-1 text-sm">新增版位</button>
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


