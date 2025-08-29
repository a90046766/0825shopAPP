import React, { useState, useEffect } from 'react'
import { getRandomQuote, getQuotes, searchQuotes, getQuotesCount } from '../../utils/quotes'

interface QuoteDisplayProps {
  mode?: 'random' | 'daily' | 'search'
  searchKeyword?: string
  count?: number
  showRefresh?: boolean
  className?: string
}

export default function QuoteDisplay({ 
  mode = 'random', 
  searchKeyword = '', 
  count = 1, 
  showRefresh = true,
  className = ''
}: QuoteDisplayProps) {
  const [quotes, setQuotes] = useState<string[]>([])
  const [currentQuote, setCurrentQuote] = useState('')
  const [searchResults, setSearchResults] = useState<string[]>([])

  useEffect(() => {
    updateQuotes()
  }, [mode, searchKeyword, count])

  const updateQuotes = () => {
    if (mode === 'search' && searchKeyword) {
      const results = searchQuotes(searchKeyword)
      setSearchResults(results)
      setQuotes(results.slice(0, count))
    } else if (mode === 'daily') {
      // 每日語錄 - 基於日期生成固定的隨機語錄
      const today = new Date()
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
      const dailyQuotes = getQuotes(count)
      setQuotes(dailyQuotes)
      setCurrentQuote(dailyQuotes[0] || '')
    } else {
      // 隨機模式
      const randomQuotes = getQuotes(count)
      setQuotes(randomQuotes)
      setCurrentQuote(randomQuotes[0] || '')
    }
  }

  const refreshQuote = () => {
    if (mode === 'search') {
      updateQuotes()
    } else {
      const newQuote = getRandomQuote()
      setCurrentQuote(newQuote)
      setQuotes([newQuote])
    }
  }

  const totalQuotes = getQuotesCount()

  if (mode === 'search' && searchKeyword) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">職人語錄搜尋結果</h3>
          <span className="text-sm text-gray-500">
            找到 {searchResults.length} 句相關語錄
          </span>
        </div>
        
        {searchResults.length > 0 ? (
          <div className="space-y-4">
            {quotes.map((quote, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-brand-500">
                <p className="text-gray-700 leading-relaxed">"{quote}"</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">沒有找到包含 "{searchKeyword}" 的語錄</p>
            <p className="text-sm text-gray-400 mt-2">試試其他關鍵字</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">職人語錄</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            共 {totalQuotes} 句語錄
          </span>
          {showRefresh && (
            <button
              onClick={refreshQuote}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              換一句
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-brand-500">
        <p className="text-gray-700 leading-relaxed text-lg">"{currentQuote}"</p>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {mode === 'daily' ? '今日語錄' : '隨機語錄'}
          </p>
        </div>
      </div>
      
      {quotes.length > 1 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">更多語錄：</h4>
          <div className="space-y-2">
            {quotes.slice(1).map((quote, index) => (
              <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-gray-600 text-sm">"{quote}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 簡化版語錄顯示組件（用於儀表板等小空間）
export function QuoteCard({ className = '' }: { className?: string }) {
  const [quote, setQuote] = useState('')

  useEffect(() => {
    setQuote(getRandomQuote())
  }, [])

  const refreshQuote = () => {
    setQuote(getRandomQuote())
  }

  return (
    <div className={`bg-gradient-to-br from-brand-50 to-blue-50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">今日語錄</h3>
        <button
          onClick={refreshQuote}
          className="text-brand-600 hover:text-brand-700 text-xs"
        >
          換一句
        </button>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">"{quote}"</p>
    </div>
  )
}
