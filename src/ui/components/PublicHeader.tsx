import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { siteCMS } from '../../adapters/supabase/site_cms'
import { loadAdapters } from '../../adapters'

type UserLite = { role?: 'admin'|'support'|'technician'|'sales'|'member'; email?: string; name?: string }

function useCurrentUser(): UserLite | null {
  try {
    const raw = localStorage.getItem('supabase-auth-user')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function PublicHeader() {
  const loc = useLocation()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const isEditor = user?.role === 'admin' || user?.role === 'support'
  const active = (p: string) => loc.pathname === p ? 'text-brand-600 font-semibold' : 'text-gray-700 hover:text-brand-600'
  const [items, setItems] = useState<Array<{id:string;label:string;path:string;sortOrder:number;active:boolean}>>([])
  const [editMode, setEditMode] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  useEffect(() => { (async()=>{ try { const nav = await siteCMS.listNav(); setItems(nav) } catch {} })() }, [])

  const sorted = useMemo(() => (items||[]).slice().sort((a,b)=> (a.sortOrder-b.sortOrder) || a.label.localeCompare(b.label,'zh-Hant')), [items])

  return (
    <header className="sticky top-0 z-30 mb-3 rounded-2xl bg-white/90 px-4 py-3 shadow-card backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="text-base font-extrabold tracking-wide text-gray-900">日式洗濯 0825</Link>
        <nav className="hidden gap-4 text-sm md:flex">
          {sorted.map(it => (
            <Link key={it.id} to={it.path} className={active(it.path)}>{it.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* 會員入口（未登入：登入/註冊；已登入：顯示名稱/登出） */}
          {!user ? (
            <>
              <Link to="/login" className="hidden rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 md:inline-block">登入</Link>
              <Link to="/register/member" className="hidden rounded bg-brand-500 px-3 py-1 text-xs text-white md:inline-block">註冊</Link>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs text-gray-700">{user.name || user.email}</span>
              <button
                onClick={async()=>{ try{ const a = await loadAdapters(); await a.authRepo.logout(); navigate('/login') }catch{} }}
                className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >登出</button>
            </div>
          )}
          <Link to="/store" className="rounded bg-brand-500 px-3 py-1 text-sm text-white md:hidden">預約</Link>
          {isEditor && (
            <button onClick={()=>setEditMode(v=>!v)} className="hidden rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 md:inline-block">{editMode? '關閉管理':'管理模式'}</button>
          )}
        </div>
      </div>

      {isEditor && editMode && (
        <div className="mx-auto mt-2 max-w-5xl rounded-2xl border bg-white p-3 text-sm shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-gray-800">導覽管理</div>
            <button onClick={()=> setEditing({ id:'', label:'', path:'/', sortOrder: (items?.length||0)+1, active:true })} className="rounded bg-brand-500 px-2 py-1 text-xs text-white">新增</button>
          </div>
          <div className="space-y-1">
            {sorted.map(it => (
              <div key={it.id} className="flex items-center justify-between rounded border px-2 py-1">
                <div className="truncate"><span className="font-medium">{it.label}</span> <span className="text-gray-500">{it.path}</span></div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setEditing(it)} className="rounded bg-gray-100 px-2 py-0.5 text-xs">編輯</button>
                </div>
              </div>
            ))}
          </div>

          {editing && (
            <div className="mt-3 rounded-lg border p-3">
              <div className="mb-2 font-medium">{editing.id? '編輯':'新增'}導覽</div>
              <div className="grid grid-cols-2 gap-2">
                <input className="rounded border px-2 py-1" placeholder="標題" value={editing.label||''} onChange={e=>setEditing({...editing,label:e.target.value})} />
                <input className="rounded border px-2 py-1" placeholder="/path" value={editing.path||''} onChange={e=>setEditing({...editing,path:e.target.value})} />
                <input className="rounded border px-2 py-1" type="number" placeholder="排序" value={editing.sortOrder??0} onChange={e=>setEditing({...editing,sortOrder:Number(e.target.value)||0})} />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})} />啟用</label>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                {editing.id && (
                  <button onClick={async()=>{ if(!confirm('確定刪除此導覽？')) return; try{ await siteCMS.removeNav(editing.id); const nav=await siteCMS.listNav(); setItems(nav); setEditing(null) } catch(e:any){ alert(e?.message||'刪除失敗') } }} className="rounded bg-rose-500 px-3 py-1 text-xs text-white">刪除</button>
                )}
                <button onClick={()=>setEditing(null)} className="rounded bg-gray-100 px-3 py-1 text-xs">取消</button>
                <button onClick={async()=>{ try{ const saved = await siteCMS.upsertNav(editing); const nav=await siteCMS.listNav(); setItems(nav); setEditing(null) } catch(e:any){ alert(e?.message||'儲存失敗') } }} className="rounded bg-brand-500 px-3 py-1 text-xs text-white">儲存</button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}


