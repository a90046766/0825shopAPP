import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../utils/supabase'

function getMemberFromStorage(): any | null {
  try { return JSON.parse(localStorage.getItem('member-auth-user') || 'null') } catch { return null }
}

export default function MemberProfilePage() {
  const member = getMemberFromStorage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [points, setPoints] = useState<number>(0)
  const [ledger, setLedger] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [memberCode, setMemberCode] = useState<string>('')
  const [shortUrl, setShortUrl] = useState<string>('')
  const [genning, setGenning] = useState<boolean>(false)

  useEffect(() => {
    if (!member) { setLoading(false); return }
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const email = String(member.email || '').toLowerCase()
        setForm((f) => ({ ...f, name: member.name || '', email, phone: '', address: '' }))

        // 讀取/補齊會員資料（members 表）
        try {
          const { data: mrow } = await supabase
            .from('members')
            .select('name,email,phone,addresses,code')
            .eq('email', email)
            .maybeSingle()
          if (mrow) {
            const addr = Array.isArray((mrow as any).addresses) && (mrow as any).addresses[0] ? (mrow as any).addresses[0] : ''
            setForm({ name: mrow.name || member.name || '', email: mrow.email || email, phone: mrow.phone || '', address: addr || '' })
            const currentCode = String((mrow as any).code || '')
            if (currentCode) setMemberCode(currentCode)
            // 若缺少或不符合規格，立即補齊為「MO+4碼數字」（不連號、亂數）；滿了再換 MP、MQ...
            if (!currentCode || !/^MO\d{4}$/.test(currentCode)) {
              const prefixes = ['MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ']
              const gen4 = () => String(Math.floor(Math.random()*10000)).padStart(4,'0')
              let newCode = ''
              try {
                for (const pf of prefixes) {
                  let tried = 0
                  while (tried < 50) { // 每個前綴嘗試 50 次亂數
                    const candidate = pf + gen4()
                    const { data: exists } = await supabase.from('members').select('email').eq('code', candidate).maybeSingle()
                    if (!exists) { newCode = candidate; break }
                    tried++
                  }
                  if (newCode) break
                }
              } catch {}
              if (newCode) {
                try { await supabase.from('members').upsert({ email, name: mrow.name||'', phone: mrow.phone||'', addresses: mrow.addresses||[], code: newCode }, { onConflict: 'email' }) } catch {}
                setMemberCode(newCode)
              }
            }
          } else {
            // 不存在會員資料時，建立一筆並產生會員編號
            const prefixes = ['MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ']
            const gen4 = () => String(Math.floor(Math.random()*10000)).padStart(4,'0')
            let newCode = ''
            try {
              for (const pf of prefixes) {
                let tried = 0
                while (tried < 50) {
                  const candidate = pf + gen4()
                  const { data: exists } = await supabase.from('members').select('email').eq('code', candidate).maybeSingle()
                  if (!exists) { newCode = candidate; break }
                  tried++
                }
                if (newCode) break
              }
            } catch {}
            const code = newCode || ('MO' + gen4())
            try { await supabase.from('members').upsert({ email, name: member.name||'', phone: '', addresses: [], code }, { onConflict: 'email' }) } catch {}
            setMemberCode(code)
          }
        } catch {}

        // 讀取積分（以 member_id 優先；後備 email；最後 localStorage）
        let p = 0
        try {
          // 先以 member.id 查
          if (member.id) {
            const { data: rowById } = await supabase
              .from('member_points')
              .select('balance')
              .eq('member_id', member.id)
              .maybeSingle()
            if (rowById && typeof (rowById as any).balance === 'number') p = (rowById as any).balance
          }
          // 後備以 email 查
          if (!p) {
            const { data: rowByEmail } = await supabase
              .from('member_points')
              .select('balance')
              .eq('member_email', email)
              .maybeSingle()
            if (rowByEmail && typeof (rowByEmail as any).balance === 'number') p = (rowByEmail as any).balance
          }
        } catch {}
        if (!p) {
          try { p = parseInt(localStorage.getItem('customerPoints') || '0') || 0 } catch {}
        }
        setPoints(p)

        // 讀取積分明細（近 50 筆）
        try {
          const { data: logs } = await supabase
            .from('member_points_ledger')
            .select('created_at, delta, reason, order_id, ref_key')
            .eq('member_id', (member as any).id || email)
            .order('created_at', { ascending: false })
            .limit(50)
          setLedger(Array.isArray(logs)? logs: [])
        } catch { setLedger([]) }
      } catch (e: any) {
        setError(e?.message || '載入失敗')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!member) return
    setSaving(true)
    setError('')
    try {
      const email = String(member.email || '').toLowerCase()
      const row: any = { name: form.name || '', phone: form.phone || '', addresses: form.address ? [form.address] : [] }
      const { error } = await supabase
        .from('members')
        .upsert({ email, ...row }, { onConflict: 'email' })
      if (error) throw error
      alert('已儲存')
    } catch (e: any) {
      setError(e?.message || '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!member) {
    return (
      <div className="p-6 text-center">
        <div className="mb-2 text-gray-600">請先登入會員以查看資料</div>
        <Link to="/login/member" className="rounded bg-blue-600 px-4 py-2 text-white">會員登入</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/store/member/orders" className="rounded border px-2 py-1 text-sm">返回</Link>
            <div className="text-lg md:text-xl font-bold">會員資料</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/store/member/orders" className="rounded border px-3 py-1">我的訂單</Link>
            <Link to="/login/member/reset" className="rounded bg-blue-600 px-3 py-1 text-white">忘記/重設密碼</Link>
          </div>
        </div>

        {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {loading ? (
          <div className="rounded border p-3 text-sm text-gray-600">載入中…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl bg-white p-4 shadow">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">姓名</label>
                  <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Email</label>
                  <input value={form.email} disabled className="w-full rounded border px-3 py-2 bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">電話</label>
                  <input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} className="w-full rounded border px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">地址</label>
                  <input value={form.address} onChange={e=>setForm({...form, address: e.target.value})} className="w-full rounded border px-3 py-2" placeholder="城市區域與街道門牌" />
                </div>
              </div>
              <div className="mt-4 text-right">
                <button disabled={saving} onClick={handleSave} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60">{saving?'儲存中…':'儲存'}</button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-gray-600">目前積分</div>
              <div className="mt-1 text-3xl font-extrabold text-blue-700">{points.toLocaleString()}</div>
              <div className="mt-2 text-xs text-gray-500">消費 $100 = 1 點，可全額折抵。數值以後台結算為準。</div>
              <div className="mt-4">
                <Link to="/store/products" className="inline-block rounded bg-blue-600 px-4 py-2 text-white">前往選購</Link>
              </div>
              {ledger.length>0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-800">積分明細</div>
                  <div className="mt-2 divide-y text-xs">
                    {ledger.map((l:any, i:number)=> (
                      <div key={i} className="py-2 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="truncate text-gray-700">{l.reason || '回饋'}</div>
                          <div className="text-[11px] text-gray-500">{l.order_id? `訂單 ${l.order_id}` : (l.ref_key||'')} · {new Date(l.created_at).toLocaleString('zh-TW')}</div>
                        </div>
                        <div className={`font-semibold ${Number(l.delta||0)>=0? 'text-emerald-700':'text-rose-700'}`}>{Number(l.delta||0)>=0? '+':''}{l.delta}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow md:col-span-1">
              <div className="text-sm text-gray-600">推薦分享</div>
              {memberCode ? (
                <>
                  <div className="mt-1 text-xs text-gray-500">你的會員編號：<span className="font-mono font-semibold">{memberCode}</span></div>
                  <div className="mt-2">
                    <input
                      readOnly
                      value={`${shortUrl || ((typeof window!=='undefined' ? window.location.origin : '') + '/register/member?ref=' + memberCode)}`}
                      className="w-full rounded border px-3 py-2 text-sm bg-gray-50"
                      onClick={(e)=> (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={async()=>{ try{ await navigator.clipboard.writeText(shortUrl || `${window.location.origin}/register/member?ref=${memberCode}`); alert('已複製分享連結'); }catch{ try{ const input = document.querySelector('input[readOnly]') as HTMLInputElement; if(input){ input.select(); document.execCommand('copy'); alert('已選取，若未自動複製請按 Ctrl+C'); } else { throw new Error('no input') } }catch{ alert('無法複製，請手動選取後複製'); } } }}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                    >複製連結</button>
                    {typeof navigator!=='undefined' && (navigator as any).share ? (
                      <button
                        onClick={()=>{ try{ (navigator as any).share({ title: '日式洗濯 - 會員推薦註冊', url: shortUrl || `${window.location.origin}/register/member?ref=${memberCode}` }) }catch{} }}
                        className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                      >行動分享</button>
                    ) : null}
                    <button
                      disabled={genning}
                      onClick={async()=>{
                        try {
                          setGenning(true)
                          const original = `${window.location.origin}/register/member?ref=${memberCode}`
                          const rsp = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(original)}`)
                          const txt = await rsp.text()
                          if (rsp.ok && txt && /^https:\/\//i.test(txt)) setShortUrl(txt.trim())
                          else alert('短網址產生失敗，已保留原始連結')
                        } catch {
                          alert('短網址服務暫時無法使用，請用原始連結')
                        } finally {
                          setGenning(false)
                        }
                      }}
                      className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-60"
                    >{genning ? '產生中…' : (shortUrl ? '重新產生短網址' : '產生短網址')}</button>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <img
                      alt="推薦註冊 QR"
                      className="rounded border bg-white p-2"
                      width={220}
                      height={220}
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shortUrl || ((typeof window!=='undefined' ? window.location.origin : '') + '/register/member?ref=' + memberCode))}`}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">手機掃碼將自動套用你的推薦碼（短網址由第三方提供）</div>
                </>
              ) : (
                <div className="mt-2 text-sm text-gray-500">尚未取得會員編號，請稍後重試或重新整理頁面。</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


