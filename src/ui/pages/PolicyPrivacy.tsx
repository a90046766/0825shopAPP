import React from 'react'

export default function PolicyPrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">隱私權政策</h1>
        <div className="prose prose-sm md:prose-base max-w-none text-gray-800">
          <h3>蒐集之個人資料</h3>
          <ul>
            <li>身分識別：姓名、電話、Email、會員編號（MOxxxx）。</li>
            <li>交易資料：訂單內容、付款方式、發票資訊、服務地址。</li>
            <li>服務紀錄：客服往來、技師簽名/照片（清洗前後紀錄）。</li>
            <li>裝置資訊與 Cookies：用於改善使用體驗與故障診斷。</li>
          </ul>
          <h3>使用目的</h3>
          <p>會員管理、訂單履約、售後服務、開立發票、回饋/促銷通知（選擇性）、內部統計與服務改善。</p>
          <h3>法律基礎</h3>
          <p>履行契約、取得同意（如行銷通知）、合法利益（安全與防詐）、遵循法定義務（發票/稅務）。</p>
          <h3>資料分享與委外</h3>
          <p>僅於履約必要或法令要求時提供予第三方（如金流/物流/雲端平台 Supabase、Netlify/技師合作夥伴）；並要求其善盡保密義務。</p>
          <h3>國際傳輸</h3>
          <p>本網站採用雲端服務，可能發生跨境資料傳輸；將以業界通行安全標準保護。</p>
          <h3>保存期間</h3>
          <p>依目的所需或法令規定之最短必要期間（例如會計稅務 5–7 年）。</p>
          <h3>資安措施</h3>
          <p>採用權限控管、加密傳輸、日誌稽核等；定期檢視供應商安全更新。</p>
          <h3>您的權利</h3>
          <p>依個資法得行使查詢/閱覽、製給複製本、補充或更正、停止蒐集/處理/利用、刪除等權利；請來信 Email：a90046766@gmail.com。</p>
          <h3>Cookies 與追蹤</h3>
          <p>用於登入狀態維持、偏好設定與效能分析；您可於瀏覽器管理或拒絕。</p>
          <h3>未成年人</h3>
          <p>未滿 20 歲者須經法定代理人同意後方可使用本服務。</p>
          <h3>政策更新</h3>
          <p>如有重大變更將公告於網站；持續使用即視為同意更新版本。</p>
        </div>
      </div>
    </div>
  )
}


