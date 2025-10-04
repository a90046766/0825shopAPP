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
	carousel?: Array<{ imageUrl: string; title: string; subtitle?: string; ctaText?: string; ctaLink?: string }>;
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
		{ title: '居家清潔', description: '定期/深度打掃、除塵除蟎', link: '/store/products?category=home', imageUrl: '' },
		{ title: '家電購買', description: '嚴選優質家電，安心安裝', link: '/store/products?category=new', imageUrl: '' },
		{ title: '二手家電', description: '履保二手，環保又省錢', link: '/store/products?category=used', imageUrl: '' }
	]
};

export default function NewShop() {
	// 簡易超時包裝：不改動 supabase 內部型別
	const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> => {
		return new Promise<T>((resolve, reject) => {
			const t = setTimeout(() => reject(new Error('timeout')), ms);
			p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
		});
	};
	const [cmsEnabled, setCmsEnabled] = React.useState<boolean>(false);
	const [isAdminSupport, setIsAdminSupport] = React.useState<boolean>(false);
	const [published, setPublished] = React.useState<CmsContent | null>(null);
	const [loading, setLoading] = React.useState<boolean>(true);
	const [displayName, setDisplayName] = React.useState<string>('');
	const [memberId, setMemberId] = React.useState<string>('');
	const [carouselIndex, setCarouselIndex] = React.useState<number>(0);

	React.useEffect(() => {
		const safetyTimer = setTimeout(() => setLoading(false), 2000);
		const forcedNoCms =
			typeof window !== 'undefined' &&
			new URLSearchParams(window.location.search).get('nocms') === '1';
		
    (async () => {
      try {
				if (forcedNoCms) {
					setCmsEnabled(false);
					setPublished(null);
					clearTimeout(safetyTimer);
					setLoading(false);
					return;
				}
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
					const nameFromMeta =
						(u?.user?.user_metadata as any)?.full_name ||
						(u?.user?.user_metadata as any)?.name ||
						email;
					setDisplayName(nameFromMeta || '');
					
					// 獲取會員編號（從用戶ID或email生成）
					const userId = u?.user?.id || '';
					const memberNum = userId ? `M${userId.slice(-6).toUpperCase()}` : '';
					setMemberId(memberNum);
				} catch {}

				// 讀全站開關（失敗則當作未啟用，顯示固定版），加 3 秒超時
				let enabled = false;
				try {
					const settingsResp: any = await withTimeout((supabase.rpc('get_site_settings') as any), 3000);
					enabled = !!settingsResp?.data?.cms_enabled;
				} catch {}
				setCmsEnabled(enabled);

				// 若啟用則讀已發布內容（失敗也顯示固定版）
				if (enabled) {
					try {
						const pubResp: any = await withTimeout((supabase.rpc('get_cms_published', { p_id: 'home' }) as any), 3000);
						const parsed = (pubResp?.data?.content as any) || null;
						if (parsed && typeof parsed === 'object') {
							setPublished({
								hero: { ...defaultContent.hero, ...(parsed.hero ?? {}) },
								services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services,
								carousel: Array.isArray((parsed as any).carousel) && (parsed as any).carousel.length > 0 ? (parsed as any).carousel : undefined
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

	// 輪播圖自動播放
	React.useEffect(() => {
		const interval = setInterval(() => {
			const cmsSlides = (cmsEnabled && published && Array.isArray((published as any).carousel) ? (published as any).carousel as any[] : null);
			const count = cmsSlides && cmsSlides.length > 0 ? Math.min(3, cmsSlides.length) : 3;
			setCarouselIndex((prev) => (prev + 1) % count);
		}, 10000); // 每10秒切換

		return () => clearInterval(interval);
	}, [cmsEnabled, published]);

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
							services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services,
							carousel: Array.isArray((parsed as any).carousel) && (parsed as any).carousel.length > 0 ? (parsed as any).carousel : undefined
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
						services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaultContent.services,
						carousel: Array.isArray((parsed as any).carousel) && (parsed as any).carousel.length > 0 ? (parsed as any).carousel : undefined
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

	function renderCarousel() {
		const cmsSlides = (cmsEnabled && published && Array.isArray((published as any).carousel) ? (published as any).carousel as any[] : null)
		const fallbackSlides = [
			{ bg: 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/sign/banners1/slide1.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMjVhZWJmZi1kMGFjLTRkN2YtODM1YS1lYThmNzE4YTNlZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJiYW5uZXJzMS9zbGlkZTEud2VicCIsImlhdCI6MTc1NzY4OTE0OSwiZXhwIjoxODIwNzYxMTQ5fQ.S_yrCrdiwFF6m0foNJBGnmNlCKQYZRa_iiLmzr-W_vY', title: '加入會員享好康', subtitle: '推薦加入就送100積分', ctaText: '立即加入會員', ctaLink: '/register/member' },
			{ bg: 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/sign/slide3/slide3.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMjVhZWJmZi1kMGFjLTRkN2YtODM1YS1lYThmNzE4YTNlZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzbGlkZTMvc2xpZGUzLndlYnAiLCJpYXQiOjE3NTgzNTUzMzUsImV4cCI6MTgyMTQyNzMzNX0.rzL_-tj6ciGzdq6YblbTpsqZj4UnKEpG0pMdKMxnpew', title: '', subtitle: '', ctaText: '了解更多', ctaLink: '/store' },
			{ bg: 'https://dekopbnpsvqlztabblxg.supabase.co/storage/v1/object/sign/slide2/slide2.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMjVhZWJmZi1kMGFjLTRkN2YtODM1YS1lYThmNzE4YTNlZDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzbGlkZTIvc2xpZGUyLndlYnAiLCJpYXQiOjE3NTc3NjUyMTcsImV4cCI6MTgyMDgzNzIxN30.c64qcvnx1RWYYRtEJ9Vr4bbNZMKhUYJHF976G5Nu8g4', title: '專業日式洗濯服務', subtitle: '讓您的家電煥然一新，享受如新機般的清潔效果！', ctaText: '立即預約', ctaLink: '/store/products?category=cleaning' }
		]
		const slides = (cmsSlides && cmsSlides.length > 0)
			? cmsSlides.slice(0, 3).map((s:any) => ({ bg: s.imageUrl || '', title: s.title || '', subtitle: s.subtitle || '', ctaText: s.ctaText, ctaLink: s.ctaLink }))
			: fallbackSlides
  return (
			<div className="relative overflow-hidden rounded-2xl mx-auto mb-8 max-w-6xl px-4" style={{ height: 'clamp(240px, calc(100vw / 1.91), 628px)' }}>
				<div
					className="flex transition-transform duration-500 ease-in-out h-full"
					style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
				>
					{slides.map((s: any, i: number) => (
						<div key={i} className="w-full h-full flex-shrink-0 relative text-white">
							{s.video ? (
								<>
									<iframe
										src={s.video}
										title="carousel-video"
										loading="lazy"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										allowFullScreen
										className="absolute inset-0 w-full h-full object-cover"
									/>
									<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-transparent" />
									{(i === 0 || i === 1 || i === 2) ? (
										<div className="absolute left-4 bottom-4 z-20">
											{s.ctaText && s.ctaLink ? (
												<Link to={s.ctaLink} className="inline-block bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">{s.ctaText}</Link>
											) : null}
										</div>
									) : (
										<div className="relative z-20 h-full p-8 flex items-center">
											<div className="flex items-center gap-2 mb-4">
												<span className="text-3xl">✨</span>
												<span className="text-sm bg-white/20 px-3 py-1 rounded-full">精選活動</span>
											</div>
											<h2 className="text-3xl md:text-4xl font-bold mb-3">{s.title}</h2>
											{s.subtitle ? <p className="text-lg md:text-xl text-white/90 mb-6">{s.subtitle}</p> : null}
											{s.ctaText && s.ctaLink ? (
												<Link to={s.ctaLink} className="inline-block bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">{s.ctaText}</Link>
											) : null}
            </div>
              )}
        
								</>
							) : (
								<div className="w-full h-full relative bg-transparent">
									<img
										src={s.bg}
										alt=""
										className="absolute inset-0 w-full h-full object-contain object-center"
										onError={(e)=>{ (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581578017425-b3a4e3bfa6fd?q=80&w=1600&auto=format&fit=crop' }}
									/>
										{(i === 0 || i === 1 || i === 2) ? (
										<div className="absolute left-4 bottom-4 z-10">
											{s.ctaText && s.ctaLink ? (
												<Link to={s.ctaLink} className="inline-block bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">{s.ctaText}</Link>
											) : null}
            </div>
									) : (
										<div className="relative z-10 h-full p-8 flex items-center">
											<div className="flex items-center gap-2 mb-4">
												<span className="text-3xl">✨</span>
												<span className="text-sm bg-white/20 px-3 py-1 rounded-full">精選活動</span>
          </div>
											<h2 className="text-3xl md:text-4xl font-bold mb-3">{s.title}</h2>
											{s.subtitle ? <p className="text-lg md:text-xl text-white/90 mb-6">{s.subtitle}</p> : null}
											{s.ctaText && s.ctaLink ? (
												<Link to={s.ctaLink} className="inline-block bg-white text-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">{s.ctaText}</Link>
											) : null}
        </div>
      )}
								</div>
							)}

						</div>
					))}
            </div>
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
					{slides.map((_: any, index: number) => (
						<button key={index} className={`w-3 h-3 rounded-full transition-all duration-300 ${index === carouselIndex ? 'bg-white opacity-80' : 'bg-white/50 hover:bg-white/70'}`} onClick={() => setCarouselIndex(index)} />
					))}
          </div>
        </div>
		);
	}

	function renderTraining() {
		return (
			<div className="bg-gradient-to-br from-amber-50 via-white to-orange-50">
				<div className="max-w-6xl mx-auto px-4 py-12">
					<div className="rounded-2xl bg-white shadow-lg border border-amber-100 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
						<div className="flex-1">
							<div className="text-sm text-amber-700 font-semibold mb-1">職訓課程</div>
							<h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">日式洗濯｜教學保證班（台中）</h3>
							<p className="text-gray-700">不會就退費・小班 4 人・兩天一夜含住宿。結業可獨立上手，現場演練＋工具實操。</p>
							<div className="mt-3 flex flex-wrap gap-2 text-sm">
								<span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">職人實作｜一對一指導</span>
								<span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">完訓輔導接案</span>
								<span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">工具清單與流程 SOP</span>
							</div>
							<p className="mt-2 text-sm text-amber-700">從技術到接案，一次到位。今天開始，讓專業成為你的收入。</p>
						</div>
						<div className="flex items-center gap-3">
							<a
								href={`http://tachung.942clean.com.tw?utm_source=store&utm_medium=homepage&utm_campaign=training_cta`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center rounded-xl bg-amber-600 px-5 py-3 text-white font-semibold shadow hover:bg-amber-700 transition-colors"
							>
								了解課程
                  </a>
                </div>
              </div>
            </div>
          </div>
		)
	}

	function renderHero() {
		// 強制使用程式版內容，忽略 CMS
		const hero = defaultContent.hero;
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
						<div className="flex items-center gap-2 mb-4">
							<span className="text-2xl">🏆</span>
							<span className="text-sm bg-white/20 px-3 py-1 rounded-full text-white">10年專業經驗</span>
                </div>
						<h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-blue-900 drop-shadow-sm">
							日式洗濯家電服務
                </h1>
						<p className="mt-3 md:mt-4 text-white/90 text-base md:text-lg">
							{hero.subtitle || '專業清潔，守護您的生活'}
						</p>
						<div className="mt-6 flex gap-4 mb-6">
							<Link to="/store/products" className="inline-flex items-center px-8 py-4 rounded-xl bg-white text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold text-lg border-2 border-transparent hover:border-blue-200">
								<span className="mr-3 text-xl">🚀</span>
                  瀏覽服務
                </Link>
							<Link to="/store/products?category=cleaning" className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold text-lg border-2 border-transparent hover:border-blue-400">
								<span className="mr-3 text-xl">🛒</span>
								立即預約
                  </Link>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{[
								{ icon: '⭐', title: '4.9星評價', sub: '客戶一致好評' },
								{ icon: '👥', title: '5000+客戶', sub: '滿意服務見證' },
								{ icon: '🕒', title: '09:00~21:00', sub: '全年無休服務' },
								{ icon: '🛡️', title: '90天保固', sub: '品質保證服務' }
							].map((c, i) => (
								<div key={i} className={`group relative overflow-hidden rounded-2xl text-white ring-1 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] ${i===0? 'bg-gradient-to-br from-amber-400 to-rose-500 ring-amber-200/50' : i===1 ? 'bg-gradient-to-br from-sky-400 to-indigo-500 ring-sky-200/50' : i===2 ? 'bg-gradient-to-br from-emerald-400 to-teal-500 ring-emerald-200/50' : 'bg-gradient-to-br from-fuchsia-400 to-pink-500 ring-fuchsia-200/50' }`}>
									<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10" />
									<div className="p-5 text-center relative z-10">
										<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/25 text-2xl shadow-inner">{c.icon}</div>
										<div className="text-base font-extrabold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">{c.title}</div>
										<div className="mt-1 text-xs text-white/95">{c.sub}</div>
									</div>
              </div>
            ))}
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
		const serviceImages = [
			'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', // 冷氣清洗
			'https://images.unsplash.com/photo-1581578731548-c6a0c3f2fcc0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', // 居家清潔
			'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', // 家電購買
			'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'  // 二手家電
		];
		
		return (
			<div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
				<div className="max-w-6xl mx-auto px-4 py-16">
                                <div className="text-center mb-12">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">我們的服務</h2>
						<p className="text-lg text-gray-600">專業家電清潔服務，讓您的家電煥然一新</p>
                    </div>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
						{list.map((s, idx) => (
                <Link
								key={idx}
								to={s.link || '#'}
								className="group block rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden border border-gray-100"
							>
								<div className="relative w-full aspect-[4/3] overflow-hidden">
									<div 
										className="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
										style={{ backgroundImage: `url(${serviceImages[idx] || serviceImages[0]})` }}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
									<div className="absolute top-4 right-4">
										<div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-2xl">
											{idx === 0 ? '❄️' : idx === 1 ? '🏠' : idx === 2 ? '🛒' : '♻️'}
										</div>
									</div>
								</div>
								<div className="p-6">
									<h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{s.title || '服務'}</h3>
									<p className="text-gray-600 text-sm leading-relaxed">{s.description || '服務說明'}</p>
									<div className="mt-4 flex items-center text-blue-600 font-medium group-hover:text-blue-700">
										<span className="mr-2">了解更多</span>
										<span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
									</div>
								</div>
                </Link>
            ))}
          </div>
        </div>
                      </div>
		);
	}

	function renderAdvantages() {
		return (
			<div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 to-purple-100/30"></div>
				<div className="relative max-w-6xl mx-auto px-4 py-16">
                                <div className="text-center mb-12">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">為什麼要找日式洗濯？</h2>
						<p className="text-lg text-gray-600">專業技術，值得信賴的服務品質</p>
                </div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{[
							{ title: '10年專業經驗', desc: '深耕業界十年，累積豐富實戰經驗', icon: '🏆' },
							{ title: '5000+滿意客戶', desc: '服務過無數家庭，口碑見證品質', icon: '👥' },
							{ title: '4.9星高評價', desc: '客戶一致好評，品質有口皆碑', icon: '⭐' },
							{ title: '滿意保證', desc: '不滿意重新清洗，確保服務品質', icon: '✅' },
							{ title: '日式精工精神', desc: '嚴謹細膩的服務態度，追求完美', icon: '🇯🇵' },
							{ title: '專用清潔劑', desc: '不傷機器與機體，效果更佳', icon: '🧪' },
							{ title: '專業設備工具', desc: '引進最新清洗設備，效果更佳', icon: '🔧' },
							{ title: '最長90天保固', desc: '10年內機器提供90天保固服務', icon: '🛡️' },
							{ title: '透明合理價格', desc: '公開透明收費，絕不亂加價', icon: '💰' },
							{ title: '線上預約便利', desc: '24小時線上預約，時間彈性安排', icon: '📱' },
							{ title: '專業技師團隊', desc: '經驗豐富技師，技術精湛可靠', icon: '👨‍🔬' },
							{ title: '全國服務範圍', desc: '服務範圍涵蓋北北基桃竹苗中彰投南高', icon: '🗺️' }
						].map((a, i) => (
							<div key={i} className="group text-center bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/50">
								<div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{a.icon}</div>
								<h3 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-blue-600 transition-colors">{a.title}</h3>
								<p className="text-sm text-gray-600 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
			</div>
		);
	}

	function renderFAQ() {
		return (
			<div className="bg-gradient-to-br from-gray-50 via-white to-blue-50">
				<div className="max-w-6xl mx-auto px-4 py-16">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold text-gray-900 mb-4">常見問題</h2>
						<p className="text-lg text-gray-600">為您解答服務相關疑問</p>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-6">
							<div className="bg-white rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 清洗服務需要多長時間？</h3>
								<p className="text-gray-600 leading-relaxed">A: 一般冷氣清洗約1-2小時，洗衣機清洗約1.5小時，抽油煙機清洗約1.5小時，具體時間依現場環境及設備狀況而定。</p>
							</div>
							<div className="bg-white rounded-xl p-6 border border-green-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 清洗後有保固嗎？</h3>
								<p className="text-gray-600 leading-relaxed">A: 是的，我們提供10年內機器提供90天保固服務，13年內提供30天保固，13年後不提供保固。保固期間內如無法維修提供換機購物金。</p>
							</div>
							<div className="bg-white rounded-xl p-6 border border-purple-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 需要提前多久預約？</h3>
								<p className="text-gray-600 leading-relaxed">A: 建議提前1-3天預約，我們會安排最適合的時間為您服務。</p>
            </div>
							<div className="bg-white rounded-xl p-6 border border-orange-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 清洗過程會影響日常生活嗎？</h3>
								<p className="text-gray-600 leading-relaxed">A: 我們會盡量減少對您日常生活的影響，並在清洗前說明流程。</p>
              </div>
							<div className="bg-white rounded-xl p-6 border border-pink-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 使用什麼清潔劑？</h3>
								<p className="text-gray-600 leading-relaxed">A: 我們使用專用清潔劑，不傷機器與機體，效果更佳。</p>
              </div>
							<div className="bg-white rounded-xl p-6 border border-indigo-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 可以指定技師嗎？</h3>
								<p className="text-gray-600 leading-relaxed">A: 可以，我們會盡量安排您指定的技師，但需視排程情況而定。</p>
              </div>
            </div>
						<div className="space-y-6">
							<div className="bg-white rounded-xl p-6 border border-yellow-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 團購優惠如何計算？</h3>
								<p className="text-gray-600 leading-relaxed">A: 同一地址滿3件服務即可享受團購價，可節省200-300元不等。</p>
							</div>
							<div className="bg-white rounded-xl p-6 border border-teal-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 清洗後多久可以正常使用？</h3>
								<p className="text-gray-600 leading-relaxed">A: 清洗完成後即可正常使用，技師會確保機器正常運作。</p>
          </div>
							<div className="bg-white rounded-xl p-6 border border-red-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 如果設備有故障怎麼辦？</h3>
								<p className="text-gray-600 leading-relaxed">A: 我們會先評估故障原因，如非清洗造成，會協助您聯繫維修服務。</p>
        </div>
							<div className="bg-white rounded-xl p-6 border border-cyan-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 可以開發票嗎？</h3>
								<p className="text-gray-600 leading-relaxed">A: 可以，我們提供電子發票，可選擇個人或公司統編。</p>
            </div>
							<div className="bg-white rounded-xl p-6 border border-emerald-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 服務範圍包含哪些地區？</h3>
								<p className="text-gray-600 leading-relaxed">A: 目前服務地區，包含北北基/桃竹苗/中彰投/南高，其他地區如雲嘉南/屏東由周邊技師服務。</p>
              </div>
							<div className="bg-white rounded-xl p-6 border border-rose-100 shadow-md hover:shadow-lg transition-shadow duration-300">
								<h3 className="font-bold text-gray-900 mb-3 text-lg">Q: 如何取消或改期？</h3>
								<p className="text-gray-600 leading-relaxed">A: 請提前24小時聯繫客服，我們會協助您重新安排時間。如在當天臨時有事可直接聯繫訂單上的服務技師。</p>
              </div>
              </div>
            </div>
          </div>
        </div>
		);
	}

	function renderContact() {
		return (
			<div className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white">
				<div className="max-w-6xl mx-auto px-4 py-12">
					<h2 className="text-3xl font-bold text-center mb-8">聯繫我們</h2>
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
						<div className="text-center bg-white/10 rounded-xl p-6 hover:bg-white/20 transition-colors">
							<div className="text-3xl mb-4">📞</div>
							<h3 className="font-semibold mb-2">客服專線</h3>
							<p className="text-white/90 mb-2 font-mono text-lg">(02)7756-2269</p>
							<p className="text-sm text-white/70">服務時間09:00~18:00</p>
            </div>
						<div className="text-center bg-white/10 rounded-xl p-6 hover:bg-white/20 transition-colors">
							<div className="text-3xl mb-4">💬</div>
							<h3 className="font-semibold mb-2">官方賴服務</h3>
							<p className="text-white/90 mb-2 font-mono text-lg">@942clean</p>
							<p className="text-sm text-white/70">服務時間09:00~21:00</p>
              </div>
						<div className="text-center bg-white/10 rounded-xl p-6 hover:bg-white/20 transition-colors">
							<div className="text-3xl mb-4">🕒</div>
							<h3 className="font-semibold mb-2">服務時間</h3>
							<p className="text-white/90 mb-2">周一~周日</p>
							<p className="text-sm text-white/70">09:00~21:00</p>
              </div>
						<div className="text-center bg-white/10 rounded-xl p-6 hover:bg-white/20 transition-colors">
							<div className="text-3xl mb-4">📍</div>
							<h3 className="font-semibold mb-2">服務範圍</h3>
							<p className="text-white/90 mb-2 text-sm">北北基/桃竹苗/中彰投/南高</p>
							<p className="text-xs text-white/70">其他地區需滿三件以上</p>
              </div>
            </div>

					<div className="mt-8 pt-8 border-t border-white/20">
						<div className="grid gap-6 md:grid-cols-3 text-center">
							<div>
								<h4 className="font-semibold mb-3">快速預約</h4>
								<p className="text-sm text-white/80 mb-3">線上預約，快速安排</p>
								<Link to="/store/products" className="inline-block bg-white text-blue-900 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition-all duration-300 hover:scale-105 shadow-lg">
									立即預約
            </Link>
          </div>
							<div>
								<h4 className="font-semibold mb-3">LINE客服</h4>
								<p className="text-sm text-white/80 mb-3">加入LINE好友，即時諮詢</p>
								<button className="inline-block bg-green-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-600 transition-all duration-300 hover:scale-105 shadow-lg">
									加入LINE(@942clean)
								</button>
        </div>
							<div>
								<h4 className="font-semibold mb-3">緊急聯絡</h4>
								<p className="text-sm text-white/80 mb-3">點擊後電話直撥</p>
								<a href="tel:0913788051" className="inline-block bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 hover:scale-105 shadow-lg">
									緊急聯絡
								</a>
              </div>
              </div>
            </div>
          </div>
        </div>
		);
	}

	function renderWelcome() {
		return (
			<div className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
				<div className="max-w-6xl mx-auto px-4 py-3 text-sm flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<span className="text-lg mr-2">👋</span>
						{displayName ? (
							<>
								<span className="font-medium">歡迎回來，{displayName}</span>
								{memberId && (
									<span className="bg-white/20 px-2 py-1 rounded-full text-xs font-mono">{memberId}</span>
								)}
							</>
						) : (
							<span className="font-medium">歡迎光臨 日式洗濯購物站</span>
						)}
					</div>
					<div className="flex items-center space-x-3">
						{displayName ? (
							<Link to="/store/member/orders" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors duration-300 font-medium">前往會員中心</Link>
						) : (
							<>
								<Link to="/login/member" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors duration-300 font-medium">登入</Link>
								<Link to="/register/member" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors duration-300 font-medium">註冊</Link>
							</>
						)}
						{isAdminSupport && (
							<Link to="/dispatch" className="bg-orange-500/80 hover:bg-orange-600 px-3 py-1 rounded-lg transition-colors duration-300 font-medium">返回派工系統</Link>
						)}
					</div>
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
		<div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 relative">
			{/* 背景裝飾 */}
			<div className="absolute inset-0 bg-gradient-to-r from-blue-200/20 via-transparent to-purple-200/20"></div>
			<div className="absolute top-0 left-0 w-96 h-96 bg-blue-300/10 rounded-full -translate-x-48 -translate-y-48"></div>
			<div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300/10 rounded-full translate-x-48 translate-y-48"></div>
			
			<div className="relative z-10">
				{isAdminSupport && (
					<AdminCmsBar
						cmsEnabled={cmsEnabled}
						onToggle={toggleCms}
						onPublish={publishNow}
					/>
				)}
				{renderWelcome()}
				{renderCarousel()}
				{renderTraining()}
				{renderHero()}
				{renderServices()}
				{renderAdvantages()}
				{renderFAQ()}
				{renderContact()}
            </div>
          </div>
	);
}