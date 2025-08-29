import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'

// 預設分類
const MODEL_CATEGORIES = [
  { id: 'aircon', name: '冷氣', color: 'bg-blue-100 text-blue-800' },
  { id: 'washer', name: '洗衣機', color: 'bg-green-100 text-green-800' },
  { id: 'hood', name: '抽油煙機', color: 'bg-purple-100 text-purple-800' },
  { id: 'tv', name: '電視', color: 'bg-orange-100 text-orange-800' },
  { id: 'fridge', name: '冰箱', color: 'bg-pink-100 text-pink-800' },
  { id: 'other', name: '其他', color: 'bg-gray-100 text-gray-800' }
]

// 常見品牌（按分類）
const COMMON_BRANDS = {
  aircon: ['大金', '日立', '國際', '三菱', '東元', '聲寶', '格力', '美的', '海爾', 'LG', '三星'],
  washer: ['國際', '日立', '三洋', '東元', '聲寶', '惠而浦', 'LG', '三星', '海爾', '美的'],
  hood: ['櫻花', '林內', '莊頭北', '豪山', '喜特麗', '太平洋', '歐化', '德意'],
  tv: ['國際', '日立', '東元', '聲寶', '奇美', 'BenQ', 'LG', '三星', 'Sony', 'Sharp'],
  fridge: ['國際', '日立', '三洋', '東元', '聲寶', '惠而浦', 'LG', '三星', '海爾', '美的']
}

// 常見機型（按分類和品牌）
const COMMON_MODELS = {
  aircon: {
    '大金': ['S22YT2', 'S25YT2', 'S28YT2', 'S36YT2', 'S50YT2'],
    '日立': ['RAS-22NB', 'RAS-25NB', 'RAS-28NB', 'RAS-36NB', 'RAS-50NB'],
    '國際': ['CS-K22YA2', 'CS-K25YA2', 'CS-K28YA2', 'CS-K36YA2', 'CS-K50YA2'],
    '三菱': ['MSZ-GL22NA', 'MSZ-GL25NA', 'MSZ-GL28NA', 'MSZ-GL36NA', 'MSZ-GL50NA']
  },
  washer: {
    '國際': ['NA-V130GB', 'NA-V160GB', 'NA-V190GB', 'NA-V210GB'],
    '日立': ['SF-BD1200T', 'SF-BD1400T', 'SF-BD1600T', 'SF-BD1800T'],
    '三洋': ['ASW-12T', 'ASW-14T', 'ASW-16T', 'ASW-18T']
  },
  hood: {
    '櫻花': ['R-7600', 'R-7601', 'R-7602', 'R-7603'],
    '林內': ['RH-9076', 'RH-9077', 'RH-9078', 'RH-9079'],
    '莊頭北': ['JT-1688', 'JT-1689', 'JT-1690', 'JT-1691']
  },
  tv: {
    '國際': ['TH-43GX750W', 'TH-49GX750W', 'TH-55GX750W', 'TH-65GX750W'],
    '日立': ['43UHDT', '49UHDT', '55UHDT', '65UHDT'],
    '東元': ['TL43U1TRE', 'TL49U1TRE', 'TL55U1TRE', 'TL65U1TRE']
  },
  fridge: {
    '國際': ['NR-C479HV', 'NR-C509HV', 'NR-C569HV', 'NR-C609HV'],
    '日立': ['R-SF47EMJ', 'R-SF50EMJ', 'R-SF56EMJ', 'R-SF60EMJ'],
    '三洋': ['SR-C47A', 'SR-C50A', 'SR-C56A', 'SR-C60A']
  }
}

export default function ModelsPage() {
  const u = authRepo.getCurrentUser()
  if (u && u.role==='technician') return <Navigate to="/dispatch" replace />
  
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any | null>(null)
  const [repos, setRepos] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => { 
    (async()=>{ 
      const a = await loadAdapters(); 
      setRepos(a); 
      setRows(await (a as any).modelsRepo.list()) 
    })() 
  }, [])

  // 過濾機型
  const filteredRows = rows.filter(model => {
    // 搜索過濾
    if (searchTerm && !model.category.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !model.brand.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !model.model.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !model.notes?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !model.attention?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    // 分類過濾
    if (selectedCategory !== 'all' && model.category !== selectedCategory) {
      return false
    }
    
    return true
  })

  // 獲取分類名稱
  const getCategoryName = (categoryId: string) => {
    const category = MODEL_CATEGORIES.find(c => c.id === categoryId)
    return category ? category.name : categoryId
  }

  // 獲取分類顏色
  const getCategoryColor = (categoryId: string) => {
    const category = MODEL_CATEGORIES.find(c => c.id === categoryId)
    return category ? category.color : 'bg-gray-100 text-gray-800'
  }

  // 獲取品牌建議
  const getBrandSuggestions = (category: string) => {
    return COMMON_BRANDS[category as keyof typeof COMMON_BRANDS] || []
  }

  // 獲取機型建議
  const getModelSuggestions = (category: string, brand: string): string[] => {
    const categoryModels = COMMON_MODELS[category as keyof typeof COMMON_MODELS]
    if (!categoryModels) return []
    return categoryModels[brand as keyof typeof categoryModels] || []
  }

  return (
    <div className="space-y-4">
      {/* 標題和新增按鈕 */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">機型管理</div>
        <button 
          onClick={()=>setEdit({ 
            category:'aircon', 
            brand:'', 
            model:'', 
            notes:'', 
            blacklist:false, 
            attention:'' 
          })} 
          className="rounded-lg bg-brand-500 px-3 py-1 text-white hover:bg-brand-600"
        >
          新增機型
        </button>
      </div>

      {/* 搜索和過濾 */}
      <div className="space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="搜尋分類、品牌、機型、備註或注意事項..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 pl-10 focus:border-brand-500 focus:outline-none"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* 分類過濾 */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedCategory === 'all' 
                ? 'bg-brand-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全部
          </button>
          {MODEL_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedCategory === cat.id 
                  ? 'bg-brand-500 text-white' 
                  : `${cat.color} hover:opacity-80`
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 統計信息 */}
      <div className="text-sm text-gray-500">
        共 {filteredRows.length} 個機型 {searchTerm || selectedCategory !== 'all' ? `(已過濾)` : ''}
      </div>

      {/* 機型列表 */}
      <div className="space-y-3">
        {filteredRows.map(m => (
          <div key={m.id} className="rounded-xl border p-4 shadow-card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-lg">{m.brand} {m.model}</div>
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(m.category)}`}>
                    {getCategoryName(m.category)}
                  </span>
                  {m.blacklist && (
                    <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                      黑名單
                    </span>
                  )}
                </div>
                
                {m.notes && (
                  <div className="text-sm text-gray-600 mb-2">{m.notes}</div>
                )}
                
                {m.attention && (
                  <div className="text-sm text-orange-600 mb-2">
                    <span className="font-medium">注意事項：</span>{m.attention}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <button 
                  onClick={()=>setEdit(m)} 
                  className="rounded-lg bg-gray-900 px-3 py-1 text-white text-sm hover:bg-gray-800"
                >
                  編輯
                </button>
                <button 
                  onClick={async()=>{ 
                    const { confirmTwice } = await import('../kit'); 
                    if(await confirmTwice('確認刪除？','刪除後無法復原，仍要刪除？')){ 
                      await (repos as any).modelsRepo.remove(m.id); 
                      setRows(await (repos as any).modelsRepo.list()) 
                    } 
                  }} 
                  className="rounded-lg bg-rose-500 px-3 py-1 text-white text-sm hover:bg-rose-600"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 編輯模態框 */}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-card max-h-[90vh] overflow-y-auto">
            <div className="mb-4 text-lg font-semibold">{edit.id?'編輯':'新增'}機型</div>
            
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分類 *</label>
                  <select 
                    className="w-full rounded border px-3 py-2"
                    value={edit.category || 'aircon'}
                    onChange={e=>setEdit({...edit,category:e.target.value})}
                  >
                    {MODEL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
                  <div className="relative">
                    <input 
                      className="w-full rounded border px-3 py-2" 
                      placeholder="品牌名稱" 
                      value={edit.brand} 
                      onChange={e=>setEdit({...edit,brand:e.target.value})} 
                    />
                    {/* 品牌建議 */}
                    {edit.category && getBrandSuggestions(edit.category).length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                        {getBrandSuggestions(edit.category)
                          .filter(brand => brand.toLowerCase().includes(edit.brand.toLowerCase()))
                          .map(brand => (
                            <button
                              key={brand}
                              onClick={() => setEdit({...edit, brand})}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                            >
                              {brand}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">機型 *</label>
                <div className="relative">
                  <input 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="機型編號" 
                    value={edit.model} 
                    onChange={e=>setEdit({...edit,model:e.target.value})} 
                  />
                  {/* 機型建議 */}
                  {edit.category && edit.brand && getModelSuggestions(edit.category, edit.brand).length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                      {getModelSuggestions(edit.category, edit.brand)
                        .filter(model => model.toLowerCase().includes(edit.model.toLowerCase()))
                        .map(model => (
                          <button
                            key={model}
                            onClick={() => setEdit({...edit, model})}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            {model}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="機型相關備註（可選）"
                  rows={3}
                  value={edit.notes||''} 
                  onChange={e=>setEdit({...edit,notes:e.target.value})} 
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="blacklist"
                  checked={!!edit.blacklist} 
                  onChange={e=>setEdit({...edit,blacklist:e.target.checked})} 
                />
                <label htmlFor="blacklist" className="text-sm font-medium text-gray-700">
                  黑名單（不承接此機型）
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">注意事項</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="針對此機型的特殊注意事項（可選）"
                  rows={3}
                  value={edit.attention||''} 
                  onChange={e=>setEdit({...edit,attention:e.target.value})} 
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={()=>setEdit(null)} 
                className="rounded-lg bg-gray-100 px-4 py-2 hover:bg-gray-200"
              >
                取消
              </button>
              <button 
                onClick={async()=>{ 
                  await (repos as any).modelsRepo.upsert(edit); 
                  setEdit(null); 
                  setRows(await (repos as any).modelsRepo.list()) 
                }} 
                className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


