import React from 'react'
import { Link } from 'react-router-dom'
import { getMemberUser } from '../../utils/memberAuth'

export default function ShopTopBar(){
  const member = getMemberUser()
  const name = member?.name || ''
  const code = member?.code || ''
  return (
    <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">👋</span>
          {name ? (
            <>
              <span className="font-medium">歡迎回來，{name}</span>
              {code ? (
                <span className="rounded-full bg-white/20 px-2 py-1 font-mono text-xs">{code}</span>
              ) : null}
            </>
          ) : (
            <span className="font-medium">歡迎光臨 日式洗濯購物站</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {name ? (
            <Link to="/store/member/orders" className="rounded-lg bg-white/20 px-3 py-1 font-medium transition-colors duration-300 hover:bg-white/30">前往會員中心</Link>
          ) : (
            <>
              <Link to="/login/member" className="rounded-lg bg-white/20 px-3 py-1 font-medium transition-colors duration-300 hover:bg-white/30">登入</Link>
              <Link to="/register/member" className="rounded-lg bg-white/20 px-3 py-1 font-medium transition-colors duration-300 hover:bg-white/30">註冊</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


