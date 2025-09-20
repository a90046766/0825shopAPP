import React from 'react'
import { Link } from 'react-router-dom'

export default function ACFeesPage(){
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white py-8">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">冷氣非標準安裝費用（參考）</h1>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/store/products?category=new" className="rounded bg-white/20 px-3 py-1 hover:bg-white/25">前往冷氣商品</Link>
            <Link to="/store" className="rounded bg-white/20 px-3 py-1 hover:bg-white/25">返回購物站</Link>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        <div className="rounded-2xl bg-white p-4 md:p-6 shadow-sm border">
          <div className="text-sm text-gray-600 mb-3">以下為日式洗濯彙整之參考價（由多家通路平均），實際費用依現場丈量與品牌規格為準。</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded border p-3">
              <div className="font-medium">鑽牆打孔（單孔）</div>
              <div className="text-gray-500 text-xs">含一般紅磚/輕隔間，不含鋼筋混凝土</div>
              <div className="mt-1 font-semibold">NT$ 1,200</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">加長銅管（每公尺）</div>
              <div className="text-gray-500 text-xs">含保溫與纏繞施工</div>
              <div className="mt-1 font-semibold">NT$ 650</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">高空作業加價（單次）</div>
              <div className="text-gray-500 text-xs">3樓以上無室外平台，需安全作業措施</div>
              <div className="mt-1 font-semibold">NT$ 2,000</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">室外機架（鐵架/壁掛）</div>
              <div className="text-gray-500 text-xs">含安裝，但不含特殊防震需求</div>
              <div className="mt-1 font-semibold">NT$ 1,800</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">排水延長/改管（每公尺）</div>
              <div className="text-gray-500 text-xs">含材料與隱藏處理（可視現場）</div>
              <div className="mt-1 font-semibold">NT$ 250</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">線槽/美化裝飾（每公尺）</div>
              <div className="text-gray-500 text-xs">PVC 線槽，含固定與美化</div>
              <div className="mt-1 font-semibold">NT$ 300</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">舊機拆卸（單台）</div>
              <div className="text-gray-500 text-xs">含搬運至一樓，樓層加價另計</div>
              <div className="mt-1 font-semibold">NT$ 1,000</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium">偏遠/跨區出勤（單次）</div>
              <div className="text-gray-500 text-xs">以公司公告區域表為準</div>
              <div className="mt-1 font-semibold">NT$ 600</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">如需其他項目（如補洞、防水、泥作等），由現場另行報價。</div>
        </div>
      </div>
    </div>
  )
}




