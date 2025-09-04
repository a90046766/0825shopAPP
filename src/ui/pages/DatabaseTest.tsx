import React, { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'

export default function DatabaseTestPage() {
  const [tables, setTables] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 檢查資料庫表格
  const checkTables = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 檢查 members 表格
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .limit(5)
      
      if (membersError) {
        console.error('Members table error:', membersError)
        setError(`Members table error: ${membersError.message}`)
      } else {
        setMembers(membersData || [])
      }

      // 檢查 member_applications 表格
      const { data: appsData, error: appsError } = await supabase
        .from('member_applications')
        .select('*')
        .limit(5)
      
      if (appsError) {
        console.error('Member applications table error:', appsError)
        setError(`Member applications table error: ${appsError.message}`)
      } else {
        setApplications(appsData || [])
      }

      // 嘗試獲取表格列表（如果權限允許）
      try {
        const { data: tablesData, error: tablesError } = await supabase
          .rpc('get_tables')
          .select('*')
        
        if (!tablesError && tablesData) {
          setTables(tablesData)
        }
      } catch (e) {
        console.log('無法獲取表格列表（權限限制）')
      }

    } catch (err: any) {
      setError(err.message || '檢查資料庫失敗')
    } finally {
      setLoading(false)
    }
  }

  // 測試會員註冊
  const testMemberRegistration = async () => {
    setLoading(true)
    setError('')
    
    try {
      const testMember = {
        name: `測試會員${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        phone: '0912345678',
        referrer_code: 'SR001'
      }

      const { data, error } = await supabase
        .from('member_applications')
        .insert(testMember)
        .select()
        .single()

      if (error) {
        setError(`註冊失敗: ${error.message}`)
      } else {
        alert('測試會員註冊成功！')
        checkTables() // 重新載入資料
      }
    } catch (err: any) {
      setError(err.message || '測試註冊失敗')
    } finally {
      setLoading(false)
    }
  }

  // 測試會員創建
  const testMemberCreation = async () => {
    setLoading(true)
    setError('')
    
    try {
      // 生成會員編號
      const memberCode = `MO${String(Math.floor(Math.random()*9000)+1000)}`
      
      const testMember = {
        code: memberCode,
        name: `正式會員${Date.now()}`,
        email: `member${Date.now()}@example.com`,
        phone: '0987654321',
        referrer_code: 'SE001',
        referrer_type: 'sales'
      }

      const { data, error } = await supabase
        .from('members')
        .insert(testMember)
        .select()
        .single()

      if (error) {
        setError(`創建失敗: ${error.message}`)
      } else {
        alert(`測試會員創建成功！會員編號：${memberCode}`)
        checkTables() // 重新載入資料
      }
    } catch (err: any) {
      setError(err.message || '測試創建失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkTables()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">資料庫測試頁面</h1>
        
        {/* 控制按鈕 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">測試控制</h2>
          <div className="flex gap-4">
            <button
              onClick={checkTables}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '檢查中...' : '檢查資料庫'}
            </button>
            <button
              onClick={testMemberRegistration}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              測試會員註冊
            </button>
            <button
              onClick={testMemberCreation}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              測試會員創建
            </button>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 表格列表 */}
        {tables.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">資料庫表格</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <code className="text-sm">{table.table_name}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 會員申請列表 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">會員申請列表</h2>
          {applications.length === 0 ? (
            <p className="text-gray-500">暫無會員申請</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">介紹人</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申請時間</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.referrer_code || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          app.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.status === 'pending' ? '待審核' :
                           app.status === 'approved' ? '已通過' : '已拒絕'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(app.applied_at).toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 正式會員列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">正式會員列表</h2>
          {members.length === 0 ? (
            <p className="text-gray-500">暫無正式會員</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">會員編號</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">積分</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新時間</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{member.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.points || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(member.updated_at).toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
