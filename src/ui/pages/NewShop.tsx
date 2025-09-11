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
	const [displayName, setDisplayName] = React.useState<string>('');

	React.useEffect(() => {
		const safetyTimer = setTimeout(() => setLoading(false), 4000);
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

	function renderCarousel() {
  return (
			<div className="relative overflow-hidden rounded-2xl mx-4 mb-8">
				<div className="flex transition-transform duration-500 ease-in-out">
					{/* 橫幅 1 */}
					<div className="w-full flex-shrink-0 relative bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 p-8 text-white">
						<div className="absolute inset-0 bg-black/20"></div>
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
						<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
						<div className="relative z-10 flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-4">
									<span className="text-3xl">🎉</span>
									<span className="text-sm bg-white/20 px-3 py-1 rounded-full">限時優惠</span>
								</div>
								<h2 className="text-3xl md:text-4xl font-bold mb-4">加入會員想好康</h2>
								<p className="text-xl text-white/90 mb-6">推薦加入就送100積分，立即享受會員專屬優惠！</p>
								<div className="flex items-center gap-4">
									<div className="bg-white/20 rounded-lg px-4 py-2">
										<span className="text-2xl font-bold">100</span>
										<span className="text-sm ml-1">積分</span>
            </div>
									<Link to="/register" className="bg-white text-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
										立即加入
              </Link>
								</div>
							</div>
							<div className="hidden md:block text-8xl opacity-20">🎁</div>
						</div>
					</div>

					{/* 橫幅 2 */}
					<div className="w-full flex-shrink-0 relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-8 text-white">
						<div className="absolute inset-0 bg-black/20"></div>
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
						<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
						<div className="relative z-10 flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-4">
									<span className="text-3xl">💎</span>
									<span className="text-sm bg-white/20 px-3 py-1 rounded-full">會員專享</span>
								</div>
								<h2 className="text-3xl md:text-4xl font-bold mb-4">積分回饋制度</h2>
								<p className="text-xl text-white/90 mb-6">消費$100=1積分，每一積分=$1元，可全額折抵！</p>
								<div className="flex items-center gap-4">
									<div className="bg-white/20 rounded-lg px-4 py-2">
										<span className="text-2xl font-bold">1:1</span>
										<span className="text-sm ml-1">回饋</span>
									</div>
									<Link to="/account" className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
										查看積分
                </Link>
								</div>
							</div>
							<div className="hidden md:block text-8xl opacity-20">💰</div>
            </div>
          </div>

					{/* 橫幅 3 */}
					<div className="w-full flex-shrink-0 relative bg-gradient-to-r from-green-500 via-teal-500 to-cyan-500 p-8 text-white">
						<div className="absolute inset-0 bg-black/20"></div>
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
						<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
						<div className="relative z-10 flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-4">
									<span className="text-3xl">✨</span>
									<span className="text-sm bg-white/20 px-3 py-1 rounded-full">專業服務</span>
								</div>
								<h2 className="text-3xl md:text-4xl font-bold mb-4">專業日式洗濯服務</h2>
								<p className="text-xl text-white/90 mb-6">讓您的家電煥然一新，享受如新機般的清潔效果！</p>
								<div className="flex items-center gap-4">
									<div className="bg-white/20 rounded-lg px-4 py-2">
										<span className="text-2xl font-bold">99%</span>
										<span className="text-sm ml-1">清潔率</span>
        </div>
									<Link to="/store/products?category=cleaning" className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
										立即預約
              </Link>
								</div>
							</div>
							<div className="hidden md:block text-8xl opacity-20">🧽</div>
            </div>
          </div>
        </div>

				{/* 輪播指示器（裝飾用） */}
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
					<button className="w-3 h-3 bg-white rounded-full opacity-80"></button>
					<button className="w-3 h-3 bg-white/50 rounded-full"></button>
					<button className="w-3 h-3 bg-white/50 rounded-full"></button>
				</div>
			</div>
		);
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
						<h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm">
							{hero.title || '日式洗濯購物站'}
                </h1>
						<p className="mt-3 md:mt-4 text-white/90 text-base md:text-lg">
							{hero.subtitle || '專業清潔，守護您的生活'}
						</p>
						<div className="mt-6 flex gap-3 mb-6">
							<Link to="/store/products" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white text-gray-900 shadow hover:shadow-md transition-all duration-300 hover:scale-105">
								<span className="mr-2">🚀</span>
								瀏覽服務
							</Link>
							<Link to="/store/products?category=cleaning" className="inline-flex items-center px-5 py-2.5 rounded-lg bg-white/90 text-gray-900 hover:bg-white transition-all duration-300 hover:scale-105">
								<span className="mr-2">🛒</span>
								立即預約
                  </Link>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
							<div className="bg-white/10 rounded-lg p-3">
								<div className="text-2xl mb-1">⭐</div>
								<div className="text-sm font-medium">4.9星評價</div>
							</div>
							<div className="bg-white/10 rounded-lg p-3">
								<div className="text-2xl mb-1">👥</div>
								<div className="text-sm font-medium">5000+客戶</div>
							</div>
							<div className="bg-white/10 rounded-lg p-3">
								<div className="text-2xl mb-1">🕒</div>
								<div className="text-sm font-medium">24小時服務</div>
							</div>
							<div className="bg-white/10 rounded-lg p-3">
								<div className="text-2xl mb-1">🛡️</div>
								<div className="text-sm font-medium">品質保證</div>
                </div>
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

	function renderAdvantages() {
		return (
			<div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
				<div className="max-w-6xl mx-auto px-4 py-12">
					<h2 className="text-3xl font-bold text-gray-900 text-center mb-8">為什麼要找日式洗濯？</h2>
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
							<div key={i} className="text-center bg-white/60 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
								<div className="text-4xl mb-4">{a.icon}</div>
								<h3 className="font-semibold text-gray-900 mb-2">{a.title}</h3>
								<p className="text-sm text-gray-600">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
			</div>
		);
	}

	function renderFAQ() {
		return (
			<div className="bg-white">
				<div className="max-w-6xl mx-auto px-4 py-12">
					<h2 className="text-3xl font-bold text-gray-900 text-center mb-8">常見問題</h2>
					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-4">
							<div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 清洗服務需要多長時間？</h3>
								<p className="text-sm text-gray-600">A: 一般冷氣清洗約1-2小時，洗衣機清洗約1.5小時，抽油煙機清洗約1.5小時，具體時間依現場環境及設備狀況而定。</p>
							</div>
							<div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 清洗後有保固嗎？</h3>
								<p className="text-sm text-gray-600">A: 是的，我們提供10年內機器提供90天保固服務，13年內提供30天保固，13年後不提供保固。保固期間內如無法維修提供換機購物金。</p>
							</div>
							<div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 需要提前多久預約？</h3>
								<p className="text-sm text-gray-600">A: 建議提前1-3天預約，我們會安排最適合的時間為您服務。</p>
            </div>
							<div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 清洗過程會影響日常生活嗎？</h3>
								<p className="text-sm text-gray-600">A: 我們會盡量減少對您日常生活的影響，並在清洗前說明流程。</p>
              </div>
							<div className="bg-pink-50 rounded-lg p-4 border-l-4 border-pink-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 使用什麼清潔劑？</h3>
								<p className="text-sm text-gray-600">A: 我們使用專用清潔劑，不傷機器與機體，效果更佳。</p>
              </div>
							<div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 可以指定技師嗎？</h3>
								<p className="text-sm text-gray-600">A: 可以，我們會盡量安排您指定的技師，但需視排程情況而定。</p>
              </div>
            </div>
						<div className="space-y-4">
							<div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 團購優惠如何計算？</h3>
								<p className="text-sm text-gray-600">A: 同一地址滿3件服務即可享受團購價，可節省200-300元不等。</p>
							</div>
							<div className="bg-teal-50 rounded-lg p-4 border-l-4 border-teal-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 清洗後多久可以正常使用？</h3>
								<p className="text-sm text-gray-600">A: 清洗完成後即可正常使用，技師會確保機器正常運作。</p>
          </div>
							<div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 如果設備有故障怎麼辦？</h3>
								<p className="text-sm text-gray-600">A: 我們會先評估故障原因，如非清洗造成，會協助您聯繫維修服務。</p>
        </div>
							<div className="bg-cyan-50 rounded-lg p-4 border-l-4 border-cyan-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 可以開發票嗎？</h3>
								<p className="text-sm text-gray-600">A: 可以，我們提供電子發票，可選擇個人或公司統編。</p>
            </div>
							<div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 服務範圍包含哪些地區？</h3>
								<p className="text-sm text-gray-600">A: 目前服務地區，包含北北基/桃竹苗/中彰投/南高，其他地區如雲嘉南/屏東由周邊技師服務。</p>
              </div>
							<div className="bg-rose-50 rounded-lg p-4 border-l-4 border-rose-500">
								<h3 className="font-semibold text-gray-900 mb-2">Q: 如何取消或改期？</h3>
								<p className="text-sm text-gray-600">A: 請提前24小時聯繫客服，我們會協助您重新安排時間。如在當天臨時有事可直接聯繫訂單上的服務技師。</p>
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
						<div className="text-center bg-white/10 rounded-xl p-6">
							<div className="text-3xl mb-4">📞</div>
							<h3 className="font-semibold mb-2">客服專線</h3>
							<p className="text-white/90 mb-2">0800-000-000</p>
							<p className="text-sm text-white/70">24小時客服熱線</p>
            </div>
						<div className="text-center bg-white/10 rounded-xl p-6">
							<div className="text-3xl mb-4">📧</div>
							<h3 className="font-semibold mb-2">電子郵件</h3>
							<p className="text-white/90 mb-2">service@942clean.com.tw</p>
							<p className="text-sm text-white/70">24小時內回覆</p>
              </div>
						<div className="text-center bg-white/10 rounded-xl p-6">
							<div className="text-3xl mb-4">🕒</div>
							<h3 className="font-semibold mb-2">服務時間</h3>
							<p className="text-white/90 mb-2">週一至週日</p>
							<p className="text-sm text-white/70">8:00-20:00</p>
              </div>
						<div className="text-center bg-white/10 rounded-xl p-6">
							<div className="text-3xl mb-4">📍</div>
							<h3 className="font-semibold mb-2">服務範圍</h3>
							<p className="text-white/90 mb-2">大台北地區</p>
							<p className="text-sm text-white/70">其他地區請洽詢</p>
              </div>
            </div>

					<div className="mt-8 pt-8 border-t border-white/20">
						<div className="grid gap-6 md:grid-cols-3 text-center">
							<div>
								<h4 className="font-semibold mb-3">快速預約</h4>
								<p className="text-sm text-white/80 mb-3">線上預約，快速安排</p>
								<Link to="/store/products" className="inline-block bg-white text-blue-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
									立即預約
            </Link>
          </div>
							<div>
								<h4 className="font-semibold mb-3">LINE客服</h4>
								<p className="text-sm text-white/80 mb-3">加入LINE好友，即時諮詢</p>
								<button className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors">
									加入LINE
								</button>
        </div>
							<div>
								<h4 className="font-semibold mb-3">緊急服務</h4>
								<p className="text-sm text-white/80 mb-3">24小時緊急服務專線</p>
								<a href="tel:0800-000-000" className="inline-block bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors">
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
		if (!displayName) return null;
		return (
			<div className="w-full bg-blue-50 border-b border-blue-100">
				<div className="max-w-6xl mx-auto px-4 py-2 text-sm text-blue-900 flex items-center justify-between">
					<div>歡迎回來，{displayName}</div>
					<Link to="/account" className="underline hover:no-underline">前往會員中心</Link>
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
			{renderWelcome()}
			{renderCarousel()}
			{renderHero()}
			{renderServices()}
			{renderAdvantages()}
			{renderFAQ()}
			{renderContact()}
		</div>
	);
}