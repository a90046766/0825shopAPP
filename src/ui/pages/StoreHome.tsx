import { Link } from 'react-router-dom'
import PublicHeader from '../components/PublicHeader'
import PublicFooter from '../components/PublicFooter'
import { useEffect, useState } from 'react'
import { siteCMS } from '../../adapters/supabase/site_cms'

export default function StoreHomePage(){
  const [hero, setHero] = useState<any|null>(null)
  const [sections, setSections] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editingHero, setEditingHero] = useState<any|null>(null)
  const [editingSection, setEditingSection] = useState<any|null>(null)

  const userRaw = (()=>{ try{ return JSON.parse(localStorage.getItem('supabase-auth-user')||'null') }catch{return null} })()
  const isEditor = userRaw?.role==='admin' || userRaw?.role==='support'

  useEffect(()=>{ (async()=>{
    try { const h = await siteCMS.getHero('home-hero'); setHero(h) } catch {}
    try { const list = await siteCMS.listSections('/'); setSections(list) } catch {}
  })() },[])

  return (
    <div className="space-y-6">
      <PublicHeader />
      {/* Hero（讀取 CMS，無圖時用漸層） */}
      <section className={`relative overflow-hidden rounded-2xl ${hero?.imageUrl? 'p-0' : 'p-6'} shadow-card ${hero?.imageUrl? '' : 'bg-gradient-to-r from-brand-500 to-brand-400 text-white'}`}>
        {hero?.imageUrl ? (
          <div className="relative">
            <img src={hero.imageUrl} className="h-56 w-full object-cover md:h-72" />
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 flex items-center p-6">
              <div className="max-w-2xl text-white">
                <h1 className="text-2xl font-extrabold tracking-tight">{hero.title||'日式洗濯｜為什麼選擇我們？'}</h1>
                <p className="mt-2 text-sm text-white/90">{hero.subtitle||'專業流程、照片存證、雙簽名結案、明確保固。'}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Link to="/store/products?category=cleaning" className="rounded bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">專業清洗</Link>
                  <Link to="/store/products?category=home" className="rounded bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">居家清潔</Link>
                  <Link to="/store/products?category=new" className="rounded bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">家電購買</Link>
                  <Link to="/store/products?category=used" className="rounded bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">二手家電</Link>
                  <Link to="/store" className="rounded bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">立即預約</Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight">日式洗濯｜為什麼選擇我們？</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90">專業流程、標準化保護、施工照片存證、雙簽名結案、明確保固。以日式細節服務守護你的每一次體驗。</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link to="/store/products?category=cleaning" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">專業清洗</Link>
              <Link to="/store/products?category=home" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">居家清潔</Link>
              <Link to="/store/products?category=new" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">家電購買</Link>
              <Link to="/store/products?category=used" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">二手家電</Link>
              <Link to="/store" className="rounded-full bg-white/90 px-3 py-1 text-brand-600 hover:bg-white">立即預約</Link>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          </div>
        )}
      </section>

      {/* 我們的優勢 */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(sections.length? sections : [
          { id:'s1', title:'標準化流程', content:'前置覆蓋→拆洗→藥水→沖洗→還原→收尾' },
          { id:'s2', title:'照片存證', content:'施工前/後照片上傳保存' },
          { id:'s3', title:'雙簽名結案', content:'技師與客戶簽名，清楚交付' },
        ]).map((s:any)=> (
          <div key={s.id} className="rounded-2xl border bg-white p-4 shadow-card">
            <div className="text-base font-semibold text-gray-900">{s.title}</div>
            <div className="mt-1 text-sm text-gray-600 whitespace-pre-line">{s.content}</div>
          </div>
        ))}
      </section>

      {/* 三步驟 */}
      <section className="rounded-2xl border bg-white p-4 shadow-card">
        <div className="text-lg font-semibold">三步驟完成</div>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-gray-700">
          <li>線上填寫需求與時段（1 分鐘）</li>
          <li>客服確認細節與到府時間</li>
          <li>到府服務與雙簽名結案</li>
        </ol>
        <div className="mt-3"><Link to="/store" className="rounded bg-brand-500 px-4 py-2 text-white">立即預約</Link></div>
      </section>

      {isEditor && (
        <section className="rounded-2xl border bg-white p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-semibold">首頁管理</div>
            <button onClick={()=>setEditMode(v=>!v)} className="rounded bg-gray-100 px-3 py-1 text-sm">{editMode?'關閉':'管理模式'}</button>
          </div>
          {editMode && (
            <div className="space-y-4">
              {/* 編輯 Hero */}
              <div className="rounded border p-3">
                <div className="mb-1 font-medium">Hero 橫幅</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <input className="rounded border px-2 py-1" placeholder="標題" value={(editingHero??hero)?.title||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'home-hero' }), title:e.target.value })} />
                  <input className="rounded border px-2 py-1" placeholder="副標" value={(editingHero??hero)?.subtitle||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'home-hero' }), subtitle:e.target.value })} />
                  <input className="col-span-2 rounded border px-2 py-1" placeholder="圖片網址（可留空）" value={(editingHero??hero)?.imageUrl||''} onChange={e=>setEditingHero({ ...(editingHero??hero??{ slot:'home-hero' }), imageUrl:e.target.value })} />
                </div>
                <div className="mt-2 text-right">
                  <button onClick={async()=>{ try{ const saved = await siteCMS.upsertBanner({ id: hero?.id, slot:'home-hero', title:(editingHero??hero)?.title, subtitle:(editingHero??hero)?.subtitle, imageUrl:(editingHero??hero)?.imageUrl, sortOrder:0, active:true }); setHero(saved); setEditingHero(null) }catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存 Hero</button>
                </div>
              </div>

              {/* 管理 Sections */}
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
                        <button onClick={async()=>{ try{ const payload = (editingSection?.id===s.id? editingSection : s); const saved = await siteCMS.upsertSection({ id: s.id, page:'/', kind: payload.kind||'content', title: payload.title, content: payload.content, imageUrl: payload.imageUrl, sortOrder: payload.sortOrder, active: true }); const list = await siteCMS.listSections('/'); setSections(list); setEditingSection(null) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-sm text-white">儲存</button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right">
                    <button onClick={()=> setSections(prev=> [...prev, { id: `tmp-${Date.now()}`, page:'/', kind:'content', title:'新段落', content:'', sortOrder:(prev[prev.length-1]?.sortOrder||0)+1, active:true }])} className="rounded bg-gray-100 px-3 py-1 text-sm">新增版位</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <PublicFooter />
    </div>
  )
}
