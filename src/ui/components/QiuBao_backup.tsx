import React, { useState, useEffect } from 'react'

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
        const newX = Math.random() * (window.innerWidth - 100)
        const newY = Math.random() * (window.innerHeight - 100)
        setPosition({ x: newX, y: newY })
        setTimeout(() => setIsAnimating(false), 1000)
      }
    }, 10000) // 每10秒移動一次

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
      {/* 球寶主體 */}
      <div className="relative">
        {/* 貓咪身體 */}
        <div className="w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-full border-2 border-purple-200 shadow-lg">
          {/* 耳朵 */}
          <div className="absolute -top-2 -left-1 w-4 h-4 bg-white rounded-full border border-purple-200"></div>
          <div className="absolute -top-2 -right-1 w-4 h-4 bg-white rounded-full border border-purple-200"></div>
          
          {/* 眼睛 */}
          <div className="absolute top-3 left-3 w-3 h-3 bg-blue-400 rounded-full"></div>
          <div className="absolute top-3 right-3 w-3 h-3 bg-blue-400 rounded-full"></div>
          
          {/* 鼻子 */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-300 rounded-full"></div>
          
          {/* 嘴巴 */}
          <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-2 h-1 border-b-2 border-gray-400 rounded-full"></div>
          
          {/* 臉頰 */}
          <div className="absolute top-5 left-1 w-2 h-2 bg-pink-200 rounded-full opacity-60"></div>
          <div className="absolute top-5 right-1 w-2 h-2 bg-pink-200 rounded-full opacity-60"></div>
        </div>

        {/* 服裝 */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-8 bg-purple-300 rounded-t-full border border-purple-400">
          {/* 吊帶 */}
          <div className="absolute top-0 left-1 w-1 h-6 bg-purple-400 rounded-full"></div>
          <div className="absolute top-0 right-1 w-1 h-6 bg-purple-400 rounded-full"></div>
          
          {/* 鈕扣 */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full"></div>
        </div>

        {/* 語音圖標 */}
        {showVoice && (
          <div className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs transition-all duration-300 ${isSpeaking ? 'animate-pulse scale-110' : ''}`}>
            {isSpeaking ? '🎤' : '🔊'}
          </div>
        )}

        {/* 思考泡泡 */}
        {isAnimating && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-2 py-1 text-xs border border-gray-200 shadow-md animate-bounce">
            我想想...
          </div>
        )}

        {/* 愛心特效 */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-red-400 text-lg animate-ping opacity-75">
          ❤️
        </div>
      </div>
    </div>
  )
}

// 語音AI助手功能
export function QiuBaoVoiceAssistant() {
  const [isVisible, setIsVisible] = useState(false)
  const [messages, setMessages] = useState<string[]>([])

  const handleVoiceClick = () => {
    const responses = [
      "您好！我是球寶，您的專屬AI助手 🐱",
      "需要我幫您什麼忙嗎？",
      "讓我來協助您完成工作吧！",
      "有任何問題都可以問我喔～",
      "我是您最貼心的小幫手！"
    ]
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    setMessages(prev => [...prev, randomResponse])
    
    // 語音合成（如果瀏覽器支援）
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(randomResponse)
      utterance.lang = 'zh-TW'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  useEffect(() => {
    // 延遲顯示球寶
    const timer = setTimeout(() => setIsVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <>
      <QiuBao 
        showVoice={true} 
        onVoiceClick={handleVoiceClick}
        className="bottom-20 right-20"
      />
      
      {/* 消息顯示 */}
      {messages.length > 0 && (
        <div className="fixed bottom-32 right-20 z-50 max-w-xs">
          {messages.slice(-3).map((msg, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg p-3 mb-2 shadow-lg border border-purple-200 animate-fade-in"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">🐱</span>
                <span className="text-sm text-gray-700">{msg}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
