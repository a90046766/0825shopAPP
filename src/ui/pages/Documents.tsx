import { useEffect, useState } from 'react'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { Navigate } from 'react-router-dom'

// 預設文件分類
const DOCUMENT_CATEGORIES = [
  { id: 'contracts', name: '合約文件', color: 'bg-blue-100 text-blue-800' },
  { id: 'forms', name: '表單文件', color: 'bg-green-100 text-green-800' },
  { id: 'manuals', name: '技術手冊', color: 'bg-purple-100 text-purple-800' },
  { id: 'policies', name: '政策文件', color: 'bg-orange-100 text-orange-800' },
  { id: 'templates', name: '範本文件', color: 'bg-pink-100 text-pink-800' },
  { id: 'reports', name: '報告文件', color: 'bg-gray-100 text-gray-800' }
]

// 預設標籤
const COMMON_TAGS = [
  '驗收單', '報價單', '合約書', '技術手冊', '員工手冊', 
  'SOP', '安全規範', '品質標準', '客戶資料', '財務報表'
]

export default function DocumentsPage() {
  const u = authRepo.getCurrentUser()
  if (u && u.role==='technician') return <Navigate to="/dispatch" replace />
  
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<any | null>(null)
  const [repos, setRepos] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => { 
    (async()=>{ 
      const a = await loadAdapters(); 
      setRepos(a); 
      setRows(await (a as any).documentsRepo.list()) 
    })() 
  }, [])

  // 過濾文件
  const filteredRows = rows.filter(doc => {
    // 搜索過濾
    if (searchTerm && !doc.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !doc.url.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !doc.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    
    // 分類過濾
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false
    }
    
    // 標籤過濾
    if (selectedTags.length > 0 && (!doc.tags || !selectedTags.some(tag => doc.tags.includes(tag)))) {
      return false
    }
    
    return true
  })

  // 獲取分類名稱
  const getCategoryName = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId)
    return category ? category.name : '未分類'
  }

  // 獲取分類顏色
  const getCategoryColor = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId)
    return category ? category.color : 'bg-gray-100 text-gray-800'
  }

  // 添加標籤
  const addTag = (tag: string) => {
    if (!edit.tags) edit.tags = []
    if (!edit.tags.includes(tag)) {
      setEdit({...edit, tags: [...edit.tags, tag]})
    }
  }

  // 移除標籤
  const removeTag = (tag: string) => {
    setEdit({...edit, tags: edit.tags.filter((t: string) => t !== tag)})
  }

  return (
    <div className="space-y-4">
      {/* 標題和新增按鈕 */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">文件管理</div>
        <button 
          onClick={()=>setEdit({ 
            title:'', 
            url:'', 
            tags:[], 
            category: 'forms',
            description: '',
            accessLevel: 'all'
          })} 
          className="rounded-lg bg-brand-500 px-3 py-1 text-white hover:bg-brand-600"
        >
          新增文件
        </button>
      </div>

      {/* 搜索和過濾 */}
      <div className="space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="搜尋文件標題、URL 或標籤..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 pl-10 focus:border-brand-500 focus:outline-none"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* 高級過濾 */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-600 hover:text-brand-500"
          >
            {showAdvanced ? '隱藏' : '顯示'} 高級過濾
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border p-3 bg-gray-50">
            {/* 分類過濾 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                <option value="all">所有分類</option>
                {DOCUMENT_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* 標籤過濾 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">標籤</label>
              <div className="flex flex-wrap gap-1">
                {COMMON_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag))
                      } else {
                        setSelectedTags([...selectedTags, tag])
                      }
                    }}
                    className={`px-2 py-1 rounded text-xs ${
                      selectedTags.includes(tag) 
                        ? 'bg-brand-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 統計信息 */}
      <div className="text-sm text-gray-500">
        共 {filteredRows.length} 個文件 {searchTerm || selectedCategory !== 'all' || selectedTags.length > 0 ? `(已過濾)` : ''}
      </div>

      {/* 文件列表 */}
      <div className="space-y-3">
        {filteredRows.map(d => (
          <div key={d.id} className="rounded-xl border p-4 shadow-card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-lg">{d.title}</div>
                  <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(d.category)}`}>
                    {getCategoryName(d.category)}
                  </span>
                </div>
                
                {d.description && (
                  <div className="text-sm text-gray-600 mb-2">{d.description}</div>
                )}
                
                <div className="text-xs text-gray-500 mb-2">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" 
                     className="text-brand-500 hover:underline break-all">
                    {d.url}
                  </a>
                </div>

                {/* 標籤 */}
                {d.tags && d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {d.tags.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 訪問權限 */}
                <div className="text-xs text-gray-400">
                  權限: {d.accessLevel === 'all' ? '所有人' : 
                         d.accessLevel === 'admin' ? '管理員' : 
                         d.accessLevel === 'tech' ? '技師' : '自定義'}
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button 
                  onClick={() => window.open(d.url, '_blank')}
                  className="rounded-lg bg-green-500 px-3 py-1 text-white text-sm hover:bg-green-600"
                >
                  開啟
                </button>
                <button 
                  onClick={()=>setEdit(d)} 
                  className="rounded-lg bg-gray-900 px-3 py-1 text-white text-sm hover:bg-gray-800"
                >
                  編輯
                </button>
                <button 
                  onClick={async()=>{ 
                    const { confirmTwice } = await import('../kit'); 
                    if(await confirmTwice('確認刪除？','刪除後無法復原，仍要刪除？')){ 
                      await (repos as any).documentsRepo.remove(d.id); 
                      setRows(await (repos as any).documentsRepo.list()) 
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
            <div className="mb-4 text-lg font-semibold">{edit.id?'編輯':'新增'}文件</div>
            
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">標題 *</label>
                  <input 
                    className="w-full rounded border px-3 py-2" 
                    placeholder="文件標題" 
                    value={edit.title} 
                    onChange={e=>setEdit({...edit,title:e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                  <select 
                    className="w-full rounded border px-3 py-2"
                    value={edit.category || 'forms'}
                    onChange={e=>setEdit({...edit,category:e.target.value})}
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="https://drive.google.com/..." 
                  value={edit.url} 
                  onChange={e=>setEdit({...edit,url:e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea 
                  className="w-full rounded border px-3 py-2" 
                  placeholder="文件描述（可選）"
                  rows={3}
                  value={edit.description || ''} 
                  onChange={e=>setEdit({...edit,description:e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">訪問權限</label>
                <select 
                  className="w-full rounded border px-3 py-2"
                  value={edit.accessLevel || 'all'}
                  onChange={e=>setEdit({...edit,accessLevel:e.target.value})}
                >
                  <option value="all">所有人</option>
                  <option value="admin">管理員</option>
                  <option value="tech">技師</option>
                  <option value="support">客服</option>
                </select>
              </div>

              {/* 標籤管理 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">標籤</label>
                
                {/* 現有標籤 */}
                {edit.tags && edit.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {edit.tags.map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-800 rounded text-sm">
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          className="text-brand-600 hover:text-brand-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* 快速添加標籤 */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-2">快速添加標籤：</div>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        disabled={edit.tags && edit.tags.includes(tag)}
                        className={`px-2 py-1 rounded text-xs ${
                          edit.tags && edit.tags.includes(tag)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 自定義標籤 */}
                <div className="flex gap-2">
                  <input 
                    className="flex-1 rounded border px-3 py-2 text-sm" 
                    placeholder="輸入自定義標籤" 
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement
                        if (input.value.trim()) {
                          addTag(input.value.trim())
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement
                      if (input.value.trim()) {
                        addTag(input.value.trim())
                        input.value = ''
                      }
                    }}
                    className="px-3 py-2 bg-brand-500 text-white rounded text-sm hover:bg-brand-600"
                  >
                    添加
                  </button>
                </div>
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
                  await (repos as any).documentsRepo.upsert(edit); 
                  setEdit(null); 
                  setRows(await (repos as any).documentsRepo.list()) 
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


