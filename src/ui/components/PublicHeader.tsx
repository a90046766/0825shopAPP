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

export default function PublicHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [memberInfo, setMemberInfo] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      if (user?.role === 'member') {
        try {
          await supabase.rpc('ensure_member_code', { p_email: user.email ?? null, p_phone: user.phone ?? null });
        } catch {}
        try {
          const or = [user?.email ? `email.eq.${user.email}` : '', user?.phone ? `phone.eq.${user.phone}` : ''].filter(Boolean).join(',');
          const { data, error } = await supabase
            .from('members')
            .select('id,name,code,email,phone')
            .or(or || 'id.gt.0')
            .limit(1)
            .maybeSingle();
          if (!error && data) {
            setMemberInfo(data);
            // 同步更新 localStorage 讓 Header 立即顯示 code
            try {
              const old = JSON.parse(localStorage.getItem('member-auth-user') || '{}');
              localStorage.setItem('member-auth-user', JSON.stringify({ ...old, email: data.email, phone: data.phone, name: data.name, code: data.code, role: 'member' }));
            } catch {}
          }
        } catch {}
      } else {
        setMemberInfo(null);
      }
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
              <span className="text-lg font-extrabold text-brand-600">歡迎回來</span>
              <span className="text-sm text-gray-700">{memberInfo?.name || user.name || user.phone || '訪客'}</span>
              {memberInfo?.code && <span className="text-xs text-gray-500">會員編號: {memberInfo.code}</span>}
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