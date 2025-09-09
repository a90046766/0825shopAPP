import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  code: string | null;
};

function downloadCsv(filename: string, rows: string[][]) {
  const bom = '\uFEFF';
  const csv = rows.map(r => r.map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Members() {
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [exportPhone, setExportPhone] = useState(true);
  const [exportEmail, setExportEmail] = useState(true);
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id,name,email,phone,code,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as Member[]);
    } catch (e) {
      console.error(e);
      alert(`載入失敗：${(e as any)?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const assignAll = async () => {
    if (!confirm('要為所有未配發編號的會員執行「一鍵補配」嗎？')) return;
    setAssigning(true);
    try {
      const { data, error } = await supabase.rpc('assign_codes_for_members_without_code');
      if (error) throw error;
      alert(`已補配 ${data ?? 0} 位會員的編號`);
      await load();
    } catch (e) {
      console.error(e);
      alert(`補配失敗：${(e as any)?.message || e}`);
    } finally {
      setAssigning(false);
    }
  };

  const filtered = items.filter(m => {
    if (!keyword.trim()) return true;
    const q = keyword.trim().toLowerCase();
    return [m.name, m.phone, m.email, m.code].some(v => (v ?? '').toLowerCase().includes(q));
  });

  const exportCsvNow = () => {
    const header = ['姓名'];
    if (exportPhone) header.push('電話');
    if (exportEmail) header.push('Email');
    header.push('會員編號');

    const rows: string[][] = [header];
    filtered.forEach(m => {
      const r = [m.name ?? ''];
      if (exportPhone) r.push(m.phone ?? '');
      if (exportEmail) r.push(m.email ?? '');
      r.push(m.code ?? '');
      rows.push(r);
    });

    downloadCsv(`members_${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">會員管理</h1>
        <div className="flex items-center gap-2">
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜尋 姓名/電話/Email/會員編號"
            className="rounded border px-3 py-1 text-sm"
          />
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input type="checkbox" checked={exportPhone} onChange={e => setExportPhone(e.target.checked)} />
            手機
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-700">
            <input type="checkbox" checked={exportEmail} onChange={e => setExportEmail(e.target.checked)} />
            信箱
          </label>
          <button
            className="rounded bg-gray-700 px-3 py-1 text-xs text-white disabled:opacity-60"
            onClick={exportCsvNow}
            disabled={loading}
          >
            匯出 CSV
          </button>
          <button
            className="rounded bg-brand-600 px-3 py-1 text-white disabled:opacity-60"
            onClick={assignAll}
            disabled={assigning || loading}
          >
            {assigning ? '補配中...' : '一鍵補配會員編號'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded border p-6 text-sm text-gray-600">載入中...</div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">姓名</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">電話</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">會員編號</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.name || '—'}</td>
                  <td className="px-3 py-2">{m.email || '—'}</td>
                  <td className="px-3 py-2">{m.phone || '—'}</td>
                  <td className="px-3 py-2">{m.code || <span className="text-gray-400">未配發</span>}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={4}>沒有資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}