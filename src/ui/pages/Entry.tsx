import React from 'react'
import { Link } from 'react-router-dom'

export default function EntryPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-card text-center">
        <h1 className="text-2xl font-bold text-gray-900">歡迎來到日式洗濯</h1>
        <p className="mt-2 text-gray-600">請選擇您要前往的入口</p>
        <div className="mt-6 grid grid-cols-1 gap-3">
          <Link to="/store" className="rounded-xl bg-brand-600 px-4 py-3 text-white hover:bg-brand-700">前往購物站</Link>
          <Link to="/login/member" className="rounded-xl bg-gray-900 px-4 py-3 text-white hover:bg-gray-800">會員登入</Link>
          <Link to="/register/member" className="rounded-xl bg-gray-100 px-4 py-3 text-gray-800 hover:bg-gray-200">註冊</Link>
        </div>
      </div>
    </div>
  )
}


