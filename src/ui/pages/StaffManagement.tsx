import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, UserPlus, Mail, Phone, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

interface StaffData {
  name: string
  email: string
  phone: string
  role: 'support' | 'sales' // 移除 admin 和 technician
  password: string
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [formData, setFormData] = useState<StaffData>({
    name: '',
    email: '',
    phone: '',
    role: 'support', // 預設為客服
    password: ''
  })

  useEffect(() => {
    loadStaffList()
  }, [])

  const loadStaffList = async () => {
    setLoading(true)
    try {
      const adapters = await import('../../adapters')
      const { authRepo } = await adapters.loadAdapters()
      const staff = await authRepo.getStaffList()
      setStaffList(staff)
    } catch (error) {
      toast.error('載入員工列表失敗')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('請填寫所有必填欄位')
      return
    }

    // 使用預設密碼 a123123，除非用戶特別指定了其他密碼
    const password = formData.password || 'a123123'

    setLoading(true)
    try {
      const adapters = await import('../../adapters')
      const { authRepo } = await adapters.loadAdapters()
      await authRepo.createStaffAccount({
        ...formData,
        password: password
      })
      
      toast.success('客服帳號建立成功！')
      setShowAddModal(false)
      setFormData({ name: '', email: '', phone: '', role: 'support', password: '' })
      loadStaffList()
    } catch (error: any) {
      toast.error(error.message || '建立客服帳號失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStaff) return

    setLoading(true)
    try {
      const adapters = await import('../../adapters')
      const { authRepo } = await adapters.loadAdapters()
      
      // 準備更新資料
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role
      }
      
      // 如果有輸入密碼且不是預設佔位符，加入更新資料
      if (formData.password && formData.password.trim() && formData.password !== '********') {
        updateData.password = formData.password.trim()
      }
      
      await authRepo.updateStaff(selectedStaff.id, updateData)
      
      toast.success('員工資料更新成功！')
      setShowEditModal(false)
      setSelectedStaff(null)
      setFormData({ name: '', email: '', phone: '', role: 'support', password: '' })
      loadStaffList()
    } catch (error: any) {
      toast.error(error.message || '更新員工資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`確定要刪除客服「${staffName}」嗎？此操作無法復原。`)) {
      return
    }

    setLoading(true)
    try {
      const adapters = await import('../../adapters')
      const { authRepo } = await adapters.loadAdapters()
      await authRepo.deleteStaff(staffId)
      
      toast.success('客服帳號刪除成功！')
      loadStaffList()
    } catch (error: any) {
      toast.error(error.message || '刪除客服帳號失敗')
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (staff: any) => {
    setSelectedStaff(staff)
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      password: '********' // 顯示預設密碼佔位符
    })
    setShowEditModal(true)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'support': return '客服'
      case 'sales': return '業務'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'support': return 'bg-blue-100 text-blue-800'
      case 'sales': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">客服/業務管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            管理系統中的客服和業務帳號
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          新增客服/業務
        </button>
      </div>

      {/* 員工列表 */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-lg">載入中...</div>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">沒有員工資料</h3>
            <p className="mt-1 text-sm text-gray-500">
              開始新增您的第一個客服帳號
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    聯絡資訊
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {staff.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {staff.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {staff.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {staff.email}
                        </div>
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {staff.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(staff.role)}`}>
                        {getRoleLabel(staff.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        啟用中
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(staff)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.id, staff.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增客服 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新增客服/業務帳號</h3>
              <form onSubmit={handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">姓名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">電話</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">角色</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="support">客服</option>
                    <option value="sales">業務</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">密碼（選填）</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="留空使用預設密碼 a123123"
                  />
                  <p className="mt-1 text-xs text-gray-500">留空將使用預設密碼：a123123</p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '建立中...' : '建立帳號'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 編輯客服 Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">編輯客服/業務資料</h3>
              <form onSubmit={handleEditStaff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">姓名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email 無法修改</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">電話</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">角色</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="support">客服</option>
                    <option value="sales">業務</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">密碼（選填）</label>
                  <input
                    type="password"
                    value={formData.password === '********' ? '' : formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="留空不修改密碼"
                  />
                  <p className="mt-1 text-xs text-gray-500">留空將保持原密碼不變，輸入新密碼可更新</p>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, password: 'a123123a'})}
                      className="text-xs text-blue-600 underline hover:text-blue-700"
                    >
                      重置為預設密碼
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, password: ''})}
                      className="text-xs text-red-600 underline hover:text-red-700"
                    >
                      清空密碼欄位
                    </button>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '更新中...' : '更新資料'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

