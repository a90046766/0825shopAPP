import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRepo } from '../../adapters/local/auth'
import { loadAdapters } from '../../adapters'

interface QiuBaoProps {
  className?: string
  showVoice?: boolean
  onVoiceClick?: () => void
}

export default function QiuBao({ className = '', showVoice = false, onVoiceClick }: QiuBaoProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })

  // 隨機移動動畫
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating) {
        setIsAnimating(true)
        const newX = Math.random() * (window.innerWidth - 120)
        const newY = Math.random() * (window.innerHeight - 120)
        setPosition({ x: newX, y: newY })
        setTimeout(() => setIsAnimating(false), 1000)
      }
    }, 15000) // 每15秒移動一次

    return () => clearInterval(interval)
  }, [isAnimating])

  // 語音動畫
  const handleVoiceClick = () => {
    if (onVoiceClick) {
      setIsSpeaking(true)
      onVoiceClick()
      setTimeout(() => setIsSpeaking(false), 2000)
    }
  }

  return (
    <div 
      className={`fixed z-50 cursor-pointer transition-all duration-1000 ease-in-out ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: isAnimating ? 'scale(1.1)' : 'scale(1)'
      }}
      onClick={showVoice ? handleVoiceClick : undefined}
    >
      {/* 球寶主體 - 更可愛的版本 */}
      <div className="relative">
        {/* 貓咪身體 - 更圓潤 */}
        <div className="w-20 h-20 bg-gradient-to-br from-white via-pink-50 to-purple-50 rounded-full border-3 border-purple-200 shadow-xl">
          {/* 耳朵 - 更可愛 */}
          <div className="absolute -top-3 -left-2 w-5 h-5 bg-white rounded-full border-2 border-purple-200 transform rotate-12"></div>
          <div className="absolute -top-3 -right-2 w-5 h-5 bg-white rounded-full border-2 border-purple-200 transform -rotate-12"></div>
          
          {/* 眼睛 - 更大更可愛 */}
          <div className="absolute top-4 left-4 w-4 h-4 bg-blue-400 rounded-full shadow-inner">
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          <div className="absolute top-4 right-4 w-4 h-4 bg-blue-400 rounded-full shadow-inner">
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          
          {/* 鼻子 */}
          <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-pink-300 rounded-full"></div>
          
          {/* 嘴巴 - 微笑 */}
          <div className="absolute top-9 left-1/2 transform -translate-x-1/2 w-3 h-2 border-b-2 border-gray-400 rounded-full"></div>
          
          {/* 臉頰 - 更明顯 */}
          <div className="absolute top-6 left-2 w-3 h-3 bg-pink-200 rounded-full opacity-70"></div>
          <div className="absolute top-6 right-2 w-3 h-3 bg-pink-200 rounded-full opacity-70"></div>
        </div>

        {/* 服裝 - 更精緻 */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-14 h-10 bg-gradient-to-b from-purple-300 to-purple-400 rounded-t-full border-2 border-purple-400 shadow-md">
          {/* 吊帶 */}
          <div className="absolute top-0 left-2 w-1.5 h-8 bg-purple-500 rounded-full"></div>
          <div className="absolute top-0 right-2 w-1.5 h-8 bg-purple-500 rounded-full"></div>
          
          {/* 鈕扣 */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></div>
        </div>

        {/* 語音圖標 */}
        {showVoice && (
          <div className={`absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-sm transition-all duration-300 ${isSpeaking ? 'animate-pulse scale-110' : ''}`}>
            {isSpeaking ? '' : ''}
          </div>
        )}

        {/* 思考泡泡 */}
        {isAnimating && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-3 py-2 text-sm border border-gray-200 shadow-lg animate-bounce">
            我想想...
          </div>
        )}

        {/* 愛心特效 */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-red-400 text-xl animate-ping opacity-75">
          
        </div>
      </div>
    </div>
  )
}

// 智能語音AI助手功能
export function QiuBaoVoiceAssistant() {
  const [isVisible, setIsVisible] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [isListening, setIsListening] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [inputText, setInputText] = useState('')
  const navigate = useNavigate()
  const [repos, setRepos] = useState<any>(null)

  useEffect(() => {
    // 延遲顯示球寶
    const timer = setTimeout(() => setIsVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // 載入 adapters
    (async () => {
      const a = await loadAdapters()
      setRepos(a)
    })()
  }, [])

  // 語音喚醒檢測
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 按 Ctrl + Space 喚醒球寶
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        setShowInput(true)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  // 智能回應系統
  const processCommand = async (text: string) => {
    const lowerText = text.toLowerCase()
    const user = authRepo.getCurrentUser()
    
    // 訂單相關命令
    if (lowerText.includes('訂單') || lowerText.includes('工單')) {
      if (lowerText.includes('上午') || lowerText.includes('今天')) {
        navigate('/orders')
        return "好的！我幫您打開今天的訂單列表 "
      }
      if (lowerText.includes('明天')) {
        navigate('/schedule')
        return "我幫您查看明天的排班表 "
      }
      return "您想查看哪個時間的訂單呢？我可以幫您導航到訂單管理或排班表 "
    }

    // 打電話相關
    if (lowerText.includes('打電話') || lowerText.includes('聯絡') || lowerText.includes('電話')) {
      return "我可以幫您找到客戶電話，但實際撥打電話需要您手動操作喔 "
    }

    // 導航相關
    if (lowerText.includes('導航') || lowerText.includes('地址') || lowerText.includes('地圖')) {
      return "我可以幫您打開 Google 地圖，請告訴我客戶地址 "
    }

    // 排班相關
    if (lowerText.includes('排班') || lowerText.includes('行程')) {
      navigate('/schedule')
      return "我幫您打開排班管理頁面 "
    }

    // 通知相關
    if (lowerText.includes('通知') || lowerText.includes('消息')) {
      navigate('/notifications')
      return "我幫您查看通知中心 "
    }

    // 客戶相關
    if (lowerText.includes('客戶') || lowerText.includes('會員')) {
      navigate('/customers')
      return "我幫您打開客戶管理頁面 "
    }

    // 產品相關
    if (lowerText.includes('產品') || lowerText.includes('商品')) {
      navigate('/products')
      return "我幫您打開產品管理頁面 "
    }

    // 薪資相關
    if (lowerText.includes('薪資') || lowerText.includes('薪資')) {
      navigate('/payroll')
      return "我幫您打開薪資管理頁面 "
    }

    // 職人語錄
    if (lowerText.includes('語錄') || lowerText.includes('激勵')) {
      navigate('/quotes')
      return "我幫您打開職人語錄，為您加油打氣！"
    }

    // 問候語
    if (lowerText.includes('你好') || lowerText.includes('早安') || lowerText.includes('晚安')) {
      const hour = new Date().getHours()
      const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'
      return `${greeting}！我是球寶，您的專屬AI助手  需要我幫您什麼忙嗎？`
    }

    // 幫助
    if (lowerText.includes('幫助') || lowerText.includes('功能') || lowerText.includes('能做什麼')) {
      return `我可以幫您：
 查看訂單和排班 
 導航到各個功能頁面 
 提供工作建議 
 為您加油打氣 
試試說「查看今天訂單」或「打開排班表」吧！`
    }

    // 預設回應
    const defaultResponses = [
      "抱歉，我沒有理解您的意思，請再說一次好嗎？",
      "我可以幫您查看訂單、排班、客戶資料等，請告訴我您需要什麼？",
      "我是球寶，您的專屬助手！需要我幫您導航到某個功能嗎？",
      "您可以試試說「查看訂單」或「打開排班表」喔！"
    ]
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
  }

  const handleVoiceClick = async () => {
    if (showInput) {
      // 如果已經在輸入模式，處理輸入的文字
      if (inputText.trim()) {
        const response = await processCommand(inputText)
        setMessages(prev => [...prev, `您：${inputText}`, `球寶：${response}`])
        setInputText('')
        setShowInput(false)
        
        // 語音合成
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(response)
          utterance.lang = 'zh-TW'
          utterance.rate = 0.8
          speechSynthesis.speak(utterance)
        }
      }
    } else {
      // 喚醒球寶
      setShowInput(true)
      const greeting = "您好！我是球寶  請告訴我您需要什麼幫助？"
      setMessages(prev => [...prev, `球寶：${greeting}`])
      
      // 語音合成
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(greeting)
        utterance.lang = 'zh-TW'
        utterance.rate = 0.8
        speechSynthesis.speak(utterance)
      }
    }
  }

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputText.trim()) {
      const response = await processCommand(inputText)
      setMessages(prev => [...prev, `您：${inputText}`, `球寶：${response}`])
      setInputText('')
      setShowInput(false)
      
      // 語音合成
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response)
        utterance.lang = 'zh-TW'
        utterance.rate = 0.8
        speechSynthesis.speak(utterance)
      }
    }
  }

  if (!isVisible) return null

  return (
    <>
      <QiuBao 
        showVoice={true} 
        onVoiceClick={handleVoiceClick}
        className="bottom-20 right-20"
      />
      
      {/* 輸入框 */}
      {showInput && (
        <div className="fixed bottom-32 right-20 z-50 w-80">
          <form onSubmit={handleInputSubmit} className="bg-white rounded-lg p-4 shadow-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg"></span>
              <span className="text-sm font-medium text-gray-700">球寶助手</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="告訴球寶您需要什麼幫助..."
                className="flex-1 rounded border px-3 py-2 text-sm focus:border-purple-300 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="rounded bg-purple-500 px-3 py-2 text-white text-sm hover:bg-purple-600"
              >
                發送
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              提示：按 Ctrl + Space 快速喚醒球寶
            </div>
          </form>
        </div>
      )}
      
      {/* 消息顯示 */}
      {messages.length > 0 && (
        <div className="fixed bottom-40 right-20 z-50 max-w-xs">
          {messages.slice(-6).map((msg, index) => (
            <div 
              key={index}
              className={`bg-white rounded-lg p-3 mb-2 shadow-lg border border-purple-200 animate-fade-in ${
                msg.startsWith('您：') ? 'ml-8' : 'mr-8'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{msg.startsWith('您：') ? '' : ''}</span>
                <span className="text-sm text-gray-700">{msg}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
