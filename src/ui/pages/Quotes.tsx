import React, { useState } from 'react'
import { QuoteDisplay, QuoteCard } from '../kit'
import { getQuotes, searchQuotes, getQuotesCount } from '../../utils/quotes'

export default function QuotesPage() {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [displayMode, setDisplayMode] = useState<'random' | 'daily' | 'search'>('random')
  const [quoteCount, setQuoteCount] = useState(5)

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      setDisplayMode('search')
    } else {
      setDisplayMode('random')
    }
  }

  const totalQuotes = getQuotesCount()

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">職人語錄</h1>
        <p className="text-gray-600 mb-6">
          激勵同事夥伴們的 {totalQuotes} 句語錄，希望能為您的工作帶來正能量和動力。
        </p>

        {/* 搜尋功能 */}
        <div className="mb-6">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="搜尋語錄關鍵字..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-brand-500 px-6 py-2 text-white hover:bg-brand-600"
            >
              搜尋
            </button>
            <button
              onClick={() => {
                setSearchKeyword('')
                setDisplayMode('random')
              }}
              className="rounded-lg bg-gray-500 px-6 py-2 text-white hover:bg-gray-600"
            >
              清除
            </button>
          </div>

          {/* 顯示模式選擇 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={displayMode === 'random'}
                onChange={() => setDisplayMode('random')}
              />
              隨機語錄
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={displayMode === 'daily'}
                onChange={() => setDisplayMode('daily')}
              />
              每日語錄
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={displayMode === 'search'}
                onChange={() => setDisplayMode('search')}
              />
              搜尋結果
            </label>
          </div>

          {/* 數量選擇 */}
          <div className="mt-4">
            <label className="flex items-center gap-2">
              顯示數量：
              <select
                value={quoteCount}
                onChange={(e) => setQuoteCount(Number(e.target.value))}
                className="rounded border px-2 py-1"
              >
                <option value={1}>1 句</option>
                <option value={3}>3 句</option>
                <option value={5}>5 句</option>
                <option value={10}>10 句</option>
                <option value={20}>20 句</option>
              </select>
            </label>
          </div>
        </div>

        {/* 語錄顯示 */}
        <QuoteDisplay
          mode={displayMode}
          searchKeyword={searchKeyword}
          count={quoteCount}
          showRefresh={true}
        />
      </div>

      {/* 快速語錄卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuoteCard />
        <QuoteCard />
        <QuoteCard />
      </div>

      {/* 語錄分類 */}
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">語錄分類</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: '專業精神', keyword: '專業', color: 'bg-blue-100 text-blue-800' },
            { title: '團隊合作', keyword: '團隊', color: 'bg-green-100 text-green-800' },
            { title: '服務精神', keyword: '服務', color: 'bg-purple-100 text-purple-800' },
            { title: '學習成長', keyword: '學習', color: 'bg-orange-100 text-orange-800' },
            { title: '堅持不懈', keyword: '堅持', color: 'bg-red-100 text-red-800' },
            { title: '品質保證', keyword: '品質', color: 'bg-indigo-100 text-indigo-800' },
            { title: '創新思維', keyword: '創新', color: 'bg-pink-100 text-pink-800' },
            { title: '責任擔當', keyword: '責任', color: 'bg-yellow-100 text-yellow-800' }
          ].map((category, index) => {
            const results = searchQuotes(category.keyword)
            return (
              <button
                key={index}
                onClick={() => {
                  setSearchKeyword(category.keyword)
                  setDisplayMode('search')
                }}
                className={`rounded-lg p-4 text-center hover:opacity-80 transition-opacity ${category.color}`}
              >
                <div className="font-semibold">{category.title}</div>
                <div className="text-sm opacity-75">{results.length} 句</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">語錄統計</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-brand-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-brand-600">{totalQuotes}</div>
            <div className="text-sm text-gray-600">總語錄數</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{searchQuotes('專業').length}</div>
            <div className="text-sm text-gray-600">專業相關</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{searchQuotes('服務').length}</div>
            <div className="text-sm text-gray-600">服務相關</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{searchQuotes('團隊').length}</div>
            <div className="text-sm text-gray-600">團隊相關</div>
          </div>
        </div>
      </div>
    </div>
  )
}
