import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase';

type CmsHero = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
};

type CmsServiceCard = {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
};

type CmsContent = {
  hero: CmsHero;
  services: CmsServiceCard[];
  carousel?: Array<{
    imageUrl: string;
    title: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
  }>;
};

const defaultContent: CmsContent = {
  hero: {
    title: '專業清潔，守護您的生活',
    subtitle: '冷氣、洗衣機、居家清潔一次搞定',
    imageUrl: ''
  },
  services: [
    { title: '專業清洗', description: '冷氣/洗衣機/冰箱深度清洗', link: '/store/products?category=cleaning', imageUrl: '' },
    { title: '居家清潔', description: '定期/深度打掃、除塵除蟎', link: '/store/products?category=housekeeping', imageUrl: '' },
    { title: '家電購買', description: '嚴選優質家電，安心安裝', link: '/store/products?category=appliance', imageUrl: '' },
    { title: '二手家電', description: '履保二手，環保又省錢', link: '/store/products?category=used', imageUrl: '' }
  ],
  carousel: [
    { imageUrl: '', title: '加入會員想好康', subtitle: '推薦加入就送100積分', ctaText: '立即加入', ctaLink: '/register/member' },
    { imageUrl: '', title: '積分回饋制度', subtitle: '消費$100=1積分', ctaText: '會員中心', ctaLink: '/store/member/orders' },
    { imageUrl: '', title: '專業日式洗濯服務', subtitle: '家電煥然一新', ctaText: '立即預約', ctaLink: '/store/products?category=cleaning' }
  ]
};

async function getMyRole(): Promise<'admin' | 'support' | 'sales' | 'technician' | null> {
  const { data: session } = await supabase.auth.getUser();
  const email = session?.user?.email ?? '';
  if (!email) return null;
  const { data: staffRow } = await supabase.from('staff').select('role').eq('email', email).maybeSingle();
  return (staffRow?.role as any) ?? null;
}

export default function CmsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [cmsEnabled, setCmsEnabled] = useState<boolean>(false);
  const [content, setContent] = useState<CmsContent>(defaultContent);
  const isAdminSupport = useMemo(() => role === 'admin' || role === 'support', [role]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await getMyRole();
        setRole(r);
        const { data: settings } = await supabase.rpc('get_site_settings');
        setCmsEnabled(!!settings?.cms_enabled);
        const { data: draft } = await supabase.rpc('get_cms_draft', { p_id: 'home' });
        const parsed = (draft?.content as any) || null;
        if (parsed && typeof parsed === 'object') {
          setContent({
            hero: { ...defaultContent.hero, ...(parsed.hero ?? {}) },
            services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services,
            carousel: Array.isArray((parsed as any).carousel) && (parsed as any).carousel.length>0 ? (parsed as any).carousel : defaultContent.carousel
          });
        } else {
          setContent(defaultContent);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await supabase.rpc('upsert_cms_draft', { p_id: 'home', p_content: content as any });
      alert('草稿已儲存');
    } catch (e: any) {
      alert(`草稿儲存失敗：${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await supabase.rpc('publish_cms', { p_id: 'home', p_enable: true });
      setCmsEnabled(true);
      alert('已發布並啟用全站 CMS 內容');
    } catch (e: any) {
      alert(`發布失敗：${e?.message ?? e}`);
    } finally {
      setPublishing(false);
    }
  }

  async function handleToggleEnabled(next: boolean) {
    setToggling(true);
    try {
      const { data } = await supabase.rpc('set_cms_enabled', { p_enabled: next });
      setCmsEnabled(!!data?.cms_enabled);
    } catch (e: any) {
      alert(`切換失敗：${e?.message ?? e}`);
    } finally {
      setToggling(false);
    }
  }

  function setHero<K extends keyof CmsHero>(key: K, value: CmsHero[K]) {
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  }

  function setService(idx: number, patch: Partial<CmsServiceCard>) {
    setContent((prev) => {
      const next = [...prev.services];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, services: next };
    });
  }

  function addService() {
    setContent((prev) => ({ ...prev, services: [...prev.services, { title: '', description: '', link: '', imageUrl: '' }] }));
  }

  function removeService(idx: number) {
    setContent((prev) => {
      const next = prev.services.filter((_, i) => i !== idx);
      return { ...prev, services: next };
    });
  }

  if (loading) {
    return <div className="p-6 text-gray-600">讀取中...</div>;
  }

  if (!isAdminSupport) {
    return <div className="p-6 text-red-600">沒有權限（僅管理員/客服可編輯 CMS）</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CMS 編輯</h1>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-sm ${cmsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            全站 CMS：{cmsEnabled ? '啟用中' : '未啟用'}
          </span>
          <button className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-60" onClick={() => handleToggleEnabled(!cmsEnabled)} disabled={toggling}>
            {cmsEnabled ? '關閉全站 CMS' : '開啟全站 CMS'}
          </button>
          <a href="/store" className="px-3 py-2 rounded border hover:bg-gray-50">前台預覽</a>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">首頁橫幅（Hero）</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">標題</div>
            <input className="w-full border rounded px-3 py-2" value={content.hero.title} onChange={(e) => setHero('title', e.target.value)} placeholder="例：專業清潔，守護您的生活" />
          </label>
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">副標</div>
            <input className="w-full border rounded px-3 py-2" value={content.hero.subtitle ?? ''} onChange={(e) => setHero('subtitle', e.target.value)} placeholder="例：冷氣、洗衣機、居家清潔一次搞定" />
          </label>
          <label className="block md:col-span-2">
            <div className="text-sm text-gray-600 mb-1">背景圖片（建議 1920×900 或 2560×1280 WebP）</div>
            <input className="w-full border rounded px-3 py-2" value={content.hero.imageUrl ?? ''} onChange={(e) => setHero('imageUrl', e.target.value)} placeholder="https://.../hero.webp" />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">首頁輪播（最多 4 張）</h2>
          <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={()=> setContent(p=> ({...p, carousel: [...(p.carousel||[]), { imageUrl:'', title:'', subtitle:'', ctaText:'', ctaLink:'' }]}))}>新增輪播</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(content.carousel||[]).slice(0,4).map((c,idx)=> (
            <div key={idx} className="border rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">輪播 #{idx+1}</div>
                <button className="text-red-600 text-sm hover:underline" onClick={()=> setContent(prev=> ({...prev, carousel: (prev.carousel||[]).filter((_,i)=> i!==idx)}))}>移除</button>
              </div>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">圖片 URL</div>
                <input className="w-full border rounded px-3 py-2" value={c.imageUrl} onChange={(e)=> setContent(prev=> { const next=[...(prev.carousel||[])]; next[idx]={...next[idx], imageUrl:e.target.value}; return {...prev, carousel:next} })} placeholder="https://.../banner.webp" />
              </label>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">標題</div>
                <input className="w-full border rounded px-3 py-2" value={c.title} onChange={(e)=> setContent(prev=> { const next=[...(prev.carousel||[])]; next[idx]={...next[idx], title:e.target.value}; return {...prev, carousel:next} })} />
              </label>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">副標</div>
                <input className="w-full border rounded px-3 py-2" value={c.subtitle||''} onChange={(e)=> setContent(prev=> { const next=[...(prev.carousel||[])]; next[idx]={...next[idx], subtitle:e.target.value}; return {...prev, carousel:next} })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-sm text-gray-600 mb-1">按鈕文字</div>
                  <input className="w-full border rounded px-3 py-2" value={c.ctaText||''} onChange={(e)=> setContent(prev=> { const next=[...(prev.carousel||[])]; next[idx]={...next[idx], ctaText:e.target.value}; return {...prev, carousel:next} })} placeholder="例如：立即加入" />
                </label>
                <label className="block">
                  <div className="text-sm text-gray-600 mb-1">按鈕連結</div>
                  <input className="w-full border rounded px-3 py-2" value={c.ctaLink||''} onChange={(e)=> setContent(prev=> { const next=[...(prev.carousel||[])]; next[idx]={...next[idx], ctaLink:e.target.value}; return {...prev, carousel:next} })} placeholder="/register/member" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">我們的服務（卡片）</h2>
          <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={addService}>新增卡片</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.services.map((s, idx) => (
            <div key={idx} className="border rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">卡片 #{idx + 1}</div>
                <button className="text-red-600 text-sm hover:underline" onClick={() => removeService(idx)}>移除</button>
              </div>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">標題</div>
                <input className="w-full border rounded px-3 py-2" value={s.title} onChange={(e) => setService(idx, { title: e.target.value })}/>
              </label>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">描述</div>
                <input className="w-full border rounded px-3 py-2" value={s.description ?? ''} onChange={(e) => setService(idx, { description: e.target.value })}/>
              </label>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">連結</div>
                <input className="w-full border rounded px-3 py-2" value={s.link ?? ''} onChange={(e) => setService(idx, { link: e.target.value })}/>
              </label>
              <label className="block">
                <div className="text-sm text-gray-600 mb-1">圖片 URL</div>
                <input className="w-full border rounded px-3 py-2" value={s.imageUrl ?? ''} onChange={(e) => setService(idx, { imageUrl: e.target.value })}/>
              </label>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60" onClick={handleSaveDraft} disabled={saving}>
          {saving ? '儲存中...' : '儲存草稿'}
        </button>
        <button className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60" onClick={handlePublish} disabled={publishing}>
          {publishing ? '發布中...' : '發布（並開啟全站）'}
        </button>
      </div>
    </div>
  );
}