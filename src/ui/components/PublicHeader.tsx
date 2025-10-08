import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';

type UserLite = { role?: 'admin'|'support'|'technician'|'sales'|'member'; email?: string; name?: string; code?: string; phone?: string };

function useCurrentUser(): UserLite | null {
  try { const m = localStorage.getItem('member-auth-user'); if (m) return JSON.parse(m) } catch {}
  try { const s = localStorage.getItem('supabase-auth-user'); if (s) return JSON.parse(s) } catch {}
  try { const l = localStorage.getItem('local-auth-user'); if (l) return JSON.parse(l) } catch {}
  return null;
}

function extractPhoneFromMemberLocal(email?: string | null): string | null {
  if (!email) return null;
  const m = /^m-(\d{8,15})@member\.local$/i.exec(email);
  return m ? m[1] : null;
}

export default function PublicHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [memberInfo, setMemberInfo] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      // 只要 localStorage 有 member-auth-user 就進行補配與讀取（即使 role 尚未標記為 member）
      const memberRaw = localStorage.getItem('member-auth-user');
      if (!memberRaw && user?.role !== 'member') { setMemberInfo(null); return; }

      let email: string | null = user?.email || null;
      let phone: string | null = user?.phone || extractPhoneFromMemberLocal(user?.email) || null;
      try {
        if (!email && !phone && memberRaw) {
          const m = JSON.parse(memberRaw);
          email = m?.email || null;
          phone = m?.phone || extractPhoneFromMemberLocal(m?.email) || null;
        }
      } catch {}

      // 讀取會員資料（統一 API）
      try {
        const q = new URLSearchParams(email? { memberEmail: email } : (phone? { phone: phone }: {} as any))
        const res = await fetch(`/_api/member/profile?${q.toString()}`)
        const j = await res.json()
        if (j?.success && j.data) {
          setMemberInfo({ id: j.data.id, name: j.data.name, email: j.data.email, phone: j.data.phone, code: j.data.code })
          try {
            const old = JSON.parse(localStorage.getItem('member-auth-user') || '{}');
            localStorage.setItem('member-auth-user', JSON.stringify({
              ...old,
              role: 'member',
              name: j.data.name ?? old.name,
              email: j.data.email ?? old.email,
              phone: j.data.phone ?? old.phone,
              code: j.data.code
            }));
          } catch {}
        }
      } catch {}
    };
    run();
  }, [user]);

  const navItems = useMemo(() => [
    { id: 'home', path: '/', label: '首頁' },
    { id: 'store', path: '/store', label: '購物站' },
    { id: 'products', path: '/store/products', label: '產品' },
  ], []);

  const active = (path: string) => location.pathname.startsWith(path) ? 'text-brand-600 font-semibold' : 'text-gray-600 hover:text-gray-900';
  const isEditor = user?.role === 'admin' || user?.role === 'support';

  return (
    <header className="sticky top-0 z-30 mb-3 rounded-2xl bg-white/90 px-4 py-3 shadow-card backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="text-base font-extrabold tracking-wide text-gray-900">日式洗濯購物站</Link>
        <nav className="hidden gap-4 text-sm md:flex">
          {navItems.map(it => <Link key={it.id} to={it.path} className={active(it.path)}>{it.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          {user && user.role === 'member' ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xl font-extrabold text-brand-600">歡迎回來</span>
              <span className="text-lg font-bold text-gray-900">{memberInfo?.name || user.name || user.phone || '訪客'}</span>
              {memberInfo?.code && <span className="text-sm text-gray-500">會員編號: {memberInfo.code}</span>}
              <button
                onClick={async () => {
                  try { await supabase.auth.signOut(); } catch {}
                  try { localStorage.removeItem('supabase-auth-user'); localStorage.removeItem('member-auth-user'); localStorage.removeItem('local-auth-user'); } catch {}
                  try { navigate('/'); } catch {} finally { window.location.href = '/'; }
                }}
                className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >登出</button>
            </div>
          ) : (
            <>
              <Link to="/login/member" className="hidden rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 md:inline-block">會員登入</Link>
              <Link to="/register/member" className="hidden rounded bg-brand-500 px-3 py-1 text-xs text-white md:inline-block">註冊</Link>
            </>
          )}
          {isEditor && <Link to="/admin" className="hidden rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 md:inline-block">管理</Link>}
        </div>
      </div>
    </header>
  );
}