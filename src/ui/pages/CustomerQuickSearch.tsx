import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

type MemberLite = { id: string; name: string | null; phone: string | null; email: string | null; code: string | null };

export default function CustomerQuickSearch(props: { onSelect: (m: MemberLite) => void }) {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MemberLite[]>([]);

  useEffect(() => {
    const h = setTimeout(async () => {
      const keyword = q.trim();
      if (!keyword) { setRows([]); return; }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id,name,phone,email,code')
          .or(`name.ilike.%${keyword}%,phone.ilike.%${keyword}%,email.ilike.%${keyword}%,code.ilike.%${keyword}%`)
          .limit(10);
        if (error) throw error;
        setRows((data || []) as MemberLite[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [q]);

  return (
    <div className="rounded border p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="w-full rounded border px-3 py-1 text-sm"
          placeholder="搜尋舊客戶（姓名/電話/Email/會員編號）"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {loading && <span className="text-xs text-gray-500">搜尋中...</span>}
      </div>
      {rows.length > 0 && (
        <div className="max-h-56 overflow-auto rounded border">
          {rows.map(m => (
            <button
              key={m.id}
              onClick={() => props.onSelect(m)}
              className="block w-full border-b px-3 py-2 text-left hover:bg-gray-50"
            >
              <div className="text-sm font-medium">{m.name || '—'} {m.code ? `（${m.code}）` : ''}</div>
              <div className="text-xs text-gray-600">
                {m.phone || '—'} · {m.email || '—'}
              </div>
            </button>
          ))}
        </div>
      )}
      {q && !loading && rows.length === 0 && (
        <div className="rounded border px-3 py-2 text-xs text-gray-500">無符合結果</div>
      )}
    </div>
  );
}