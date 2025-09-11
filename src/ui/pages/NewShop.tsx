import React from 'react';
import { Link } from 'react-router-dom';
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
};

function AdminCmsBar(props: {
	cmsEnabled: boolean;
	onToggle: () => void;
	onPublish: () => void;
}) {
	return (
		<div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900">
			<div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
				<span className="text-sm">CMS 管理列（僅管理員/客服）</span>
				<span className={`text-xs px-2 py-1 rounded ${props.cmsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
					全站 CMS：{props.cmsEnabled ? '啟用中' : '未啟用'}
				</span>
				<button className="text-sm px-3 py-1 rounded border hover:bg-white" onClick={props.onToggle}>
					{props.cmsEnabled ? '關閉全站 CMS' : '開啟全站 CMS'}
				</button>
				<button className="text-sm px-3 py-1 rounded border hover:bg-white" onClick={props.onPublish}>
					一鍵發布（草稿→已發布）
				</button>
				<a href="/cms" className="text-sm px-3 py-1 rounded border hover:bg-white">前往 CMS 編輯</a>
			</div>
		</div>
	);
}

const defaultContent: CmsContent = {
	hero: {
		title: '日式洗濯購物站',
		subtitle: '專業清潔，守護您的生活',
		imageUrl: ''
	},
	services: [
		{ title: '專業清洗', description: '冷氣/洗衣機/冰箱深度清洗', link: '/store/products?category=cleaning', imageUrl: '' },
		{ title: '居家清潔', description: '定期/深度打掃、除塵除蟎', link: '/store/products?category=housekeeping', imageUrl: '' },
		{ title: '家電購買', description: '嚴選優質家電，安心安裝', link: '/store/products?category=appliance', imageUrl: '' },
		{ title: '二手家電', description: '履保二手，環保又省錢', link: '/store/products?category=used', imageUrl: '' }
	]
};

export default function NewShop() {
	const [cmsEnabled, setCmsEnabled] = React.useState<boolean>(false);
	const [isAdminSupport, setIsAdminSupport] = React.useState<boolean>(false);
	const [published, setPublished] = React.useState<CmsContent | null>(null);
	const [loading, setLoading] = React.useState<boolean>(true);

	React.useEffect(() => {
		// 最多 4 秒結束載入，避免卡住
		const safetyTimer = setTimeout(() => setLoading(false), 4000);

		(async () => {
			try {
				// 是否 admin/support（失敗不影響前台）
				try {
					const { data: u } = await supabase.auth.getUser();
					const email = u?.user?.email ?? '';
					if (email) {
						const { data: staffRow } = await supabase
							.from('staff')
							.select('role')
							.eq('email', email)
							.maybeSingle();
						setIsAdminSupport(!!staffRow && (staffRow.role === 'admin' || staffRow.role === 'support'));
					}
				} catch {}

				// 讀全站開關（失敗則當作未啟用，顯示固定版）
				let enabled = false;
				try {
					const { data: settings } = await supabase.rpc('get_site_settings');
					enabled = !!settings?.cms_enabled;
				} catch {}
				setCmsEnabled(enabled);

				// 若啟用則讀已發布內容（失敗也顯示固定版）
				if (enabled) {
					try {
						const { data: pub } = await supabase.rpc('get_cms_published', { p_id: 'home' });
						const parsed = (pub?.content as any) || null;
						if (parsed && typeof parsed === 'object') {
							setPublished({
								hero: { ...defaultContent.hero, ...(parsed.hero ?? {}) },
								services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services
							});
						} else {
							setPublished(defaultContent);
						}
					} catch {
						setPublished(null);
					}
				} else {
					setPublished(null);
				}
			} finally {
				clearTimeout(safetyTimer);
				setLoading(false);
			}
		})();
	}, []);

	async function toggleCms() {
		const { data, error } = await supabase.rpc('set_cms_enabled', { p_enabled: !cmsEnabled });
		if (!error) {
			const enabled = !!data?.cms_enabled;
			setCmsEnabled(enabled);
			if (enabled) {
				try {
					const { data: pub } = await supabase.rpc('get_cms_published', { p_id: 'home' });
					const parsed = (pub?.content as any) || null;
					if (parsed && typeof parsed === 'object') {
						setPublished({
							hero: { ...defaultContent.hero, ...(parsed.hero ?? {}) },
							services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services
						});
					} else {
						setPublished(defaultContent);
					}
				} catch {
					setPublished(null);
				}
			} else {
				setPublished(null);
			}
		} else {
			alert(error.message || '切換失敗');
		}
	}

	async function publishNow() {
		try {
			await supabase.rpc('publish_cms', { p_id: 'home', p_enable: true });
			setCmsEnabled(true);
			try {
				const { data: pub } = await supabase.rpc('get_cms_published', { p_id: 'home' });
				const parsed = (pub?.content as any) || null;
				if (parsed && typeof parsed === 'object') {
					setPublished({
						hero: { ...defaultContent.hero, ...(parsed.hero ?? {}) },
						services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services
					});
				} else {
					setPublished(defaultContent);
				}
			} catch {
				setPublished(defaultContent);
			}
			alert('已發布並啟用全站 CMS');
		} catch (e: any) {
			alert(e?.message ?? '發布失敗');
		}
	}

	function renderHero() {
		const hero = cmsEnabled && published ? published.hero : defaultContent.hero;
		return (
			<div
				className="relative w-full"
				style={{
					backgroundImage: hero.imageUrl ? `url(${hero.imageUrl})` : undefined,
					backgroundSize: 'cover',
					backgroundPosition: 'center'
				}}
			>
				<div className={`w-full ${hero.imageUrl ? 'bg-black/40' : 'bg-gradient-to-r from-[#f6f9ff] to-[#eef4ff]'} `}>
					<div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
						<h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
							{hero.title || '日式洗濯購物站'}
						</h1>
						<p className="mt-3 md:mt-4 text-white/90 text-base md:text-lg">
							{hero.subtitle || '專業清潔，守護您的生活'}
						</p>
						<div className="mt-6 flex gap-3">
							<Link to="/store/products" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-gray-900 shadow hover:shadow-md">
								瀏覽服務
							</Link>
							<Link to="/store/products?category=cleaning" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white/90 text-gray-900 hover:bg-white">
								立即預約
							</Link>
						</div>
					</div>
				</div>
				{isAdminSupport && (
					<div className="absolute top-3 right-3">
						<Link to="/dispatch" className="px-3 py-1.5 rounded bg-white text-gray-700 shadow hover:shadow-md">返回派工系統</Link>
					</div>
				)}
			</div>
		);
	}

	function renderServices() {
		const list = cmsEnabled && published ? published.services : defaultContent.services;
		return (
			<div className="max-w-6xl mx-auto px-4 py-12">
				<h2 className="text-2xl font-bold mb-6">我們的服務</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					{list.map((s, idx) => (
						<Link
							key={idx}
							to={s.link || '#'}
							className="block rounded-xl border bg-white hover:shadow-lg transition overflow-hidden"
						>
							{(s.imageUrl && s.imageUrl.trim()) ? (
								<div className="w-full aspect-[4/3] bg-gray-100" style={{ backgroundImage: `url(${s.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
							) : (
								<div className="w-full aspect-[4/3] bg-gradient-to-br from-sky-50 to-indigo-50" />
							)}
							<div className="p-4">
								<div className="font-semibold">{s.title || '服務'}</div>
								<div className="mt-1 text-sm text-gray-600 line-clamp-2">{s.description || '服務說明'}</div>
							</div>
						</Link>
					))}
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] p-6">
				<div className="rounded-2xl bg-white p-6 shadow-card text-center text-sm text-gray-600">載入中…</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F5F7FB]">
			{isAdminSupport && (
				<AdminCmsBar
					cmsEnabled={cmsEnabled}
					onToggle={toggleCms}
					onPublish={publishNow}
				/>
			)}
			{renderHero()}
			{renderServices()}
			{/* 你原有的其他版塊可持續往下放，例如 FAQ、聯絡資訊、優惠等 */}
		</div>
	);
}