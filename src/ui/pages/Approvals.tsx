import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Badge, Modal, Textarea, Select } from '../kit'
import { loadAdapters } from '../../adapters'
import { authRepo } from '../../adapters/local/auth'
import { can } from '../../utils/permissions'
import { 
  MemberApplication, 
  TechnicianApplication, 
  StaffApplication,
  User 
} from '../../core/repository'

export default function Approvals() {
  const navigate = useNavigate()
  const user = authRepo.getCurrentUser()
  const [memberApplicationRepo, setMemberApplicationRepo] = useState<any>(null)
  const [technicianApplicationRepo, setTechnicianApplicationRepo] = useState<any>(null)
  const [staffApplicationRepo, setStaffApplicationRepo] = useState<any>(null)
  
  const [memberApplications, setMemberApplications] = useState<MemberApplication[]>([])
  const [technicianApplications, setTechnicianApplications] = useState<TechnicianApplication[]>([])
  const [staffApplications, setStaffApplications] = useState<StaffApplication[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedApplication, setSelectedApplication] = useState<{
    type: 'member' | 'technician' | 'staff'
    app: MemberApplication | TechnicianApplication | StaffApplication
  } | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    if (!user || !can(user, 'admin')) {
      navigate('/')
      return
    }
    
    loadAdapters().then(adapters => {
      setMemberApplicationRepo(adapters.memberApplicationRepo)
      setTechnicianApplicationRepo(adapters.technicianApplicationRepo)
      setStaffApplicationRepo(adapters.staffApplicationRepo)
      loadApplications()
    })
  }, [user])

  const loadApplications = async () => {
    if (!memberApplicationRepo || !technicianApplicationRepo || !staffApplicationRepo) return
    
    try {
      setLoading(true)
      const [members, technicians, staff] = await Promise.all([
        memberApplicationRepo.listPending(),
        technicianApplicationRepo.listPending(),
        staffApplicationRepo.listPending()
      ])
      
      setMemberApplications(members)
      setTechnicianApplications(technicians)
      setStaffApplications(staff)
    } catch (error) {
      console.error('載入申請失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = (type: 'member' | 'technician' | 'staff', app: any) => {
    setSelectedApplication({ type, app })
    setReviewNotes('')
    setReviewAction('approve')
    setShowReviewModal(true)
  }

  const submitReview = async () => {
    if (!selectedApplication || !user) return
    
    try {
      const { type, app } = selectedApplication
      
      if (reviewAction === 'approve') {
        if (type === 'member') {
          await memberApplicationRepo.approve(app.id)
        } else if (type === 'technician') {
          await technicianApplicationRepo.approve(app.id)
        } else if (type === 'staff') {
          await staffApplicationRepo.approve(app.id)
        }
      } else {
        if (type === 'member') {
          await memberApplicationRepo.reject(app.id)
        } else if (type === 'technician') {
          await technicianApplicationRepo.reject(app.id)
        } else if (type === 'staff') {
          await staffApplicationRepo.reject(app.id)
        }
      }
      
      setShowReviewModal(false)
      setSelectedApplication(null)
      loadApplications()
    } catch (error) {
      console.error('審核失敗:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge color="yellow">待審核</Badge>
      case 'approved':
        return <Badge color="green">已通過</Badge>
      case 'rejected':
        return <Badge color="red">已拒絕</Badge>
      default:
        return <Badge color="gray">未知</Badge>
    }
  }

  const getRegionText = (region: string) => {
    switch (region) {
      case 'north': return '北區'
      case 'central': return '中區'
      case 'south': return '南區'
      case 'all': return '全區'
      default: return region
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'support': return '客服'
      case 'sales': return '業務'
      default: return role
    }
  }

  if (!user || !can(user, 'admin')) {
    return <div className="p-4">權限不足</div>
  }

  if (loading) {
    return <div className="p-4">載入中...</div>
  }

  const totalPending = memberApplications.length + technicianApplications.length + staffApplications.length

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">待審核申請</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">總計待審核:</span>
          <Badge color="yellow">{totalPending}</Badge>
        </div>
      </div>

      {/* 會員申請 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">會員申請</h2>
          <Badge color="yellow">{memberApplications.length}</Badge>
        </div>
        
        {memberApplications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暫無待審核的會員申請</p>
        ) : (
          <div className="space-y-3">
            {memberApplications.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{app.name}</div>
                  <div className="text-sm text-gray-600">
                    {app.email && `信箱: ${app.email}`}
                    {app.phone && `電話: ${app.phone}`}
                    {app.referrerCode && `推薦人: ${app.referrerCode}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    申請時間: {new Date(app.appliedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(app.status)}
                  <Button 
                    size="sm" 
                    onClick={() => handleReview('member', app)}
                    disabled={app.status !== 'pending'}
                  >
                    審核
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 技師申請 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">技師申請</h2>
          <Badge color="yellow">{technicianApplications.length}</Badge>
        </div>
        
        {technicianApplications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暫無待審核的技師申請</p>
        ) : (
          <div className="space-y-3">
            {technicianApplications.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{app.name}</div>
                  <div className="text-sm text-gray-600">
                    信箱: {app.email} | 電話: {app.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    服務區域: {getRegionText(app.region)}
                    {app.shortName && ` | 簡稱: ${app.shortName}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    申請時間: {new Date(app.appliedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(app.status)}
                  <Button 
                    size="sm" 
                    onClick={() => handleReview('technician', app)}
                    disabled={app.status !== 'pending'}
                  >
                    審核
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 客服申請 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">客服申請</h2>
          <Badge color="yellow">{staffApplications.length}</Badge>
        </div>
        
        {staffApplications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暫無待審核的客服申請</p>
        ) : (
          <div className="space-y-3">
            {staffApplications.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{app.name}</div>
                  <div className="text-sm text-gray-600">
                    信箱: {app.email} | 電話: {app.phone}
                  </div>
                  <div className="text-sm text-gray-600">
                    職位: {getRoleText(app.role)}
                    {app.shortName && ` | 簡稱: ${app.shortName}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    申請時間: {new Date(app.appliedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(app.status)}
                  <Button 
                    size="sm" 
                    onClick={() => handleReview('staff', app)}
                    disabled={app.status !== 'pending'}
                  >
                    審核
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 審核模態框 */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`審核申請 - ${selectedApplication?.app.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">審核結果</label>
            <Select
              value={reviewAction}
              onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject')}
            >
              <option value="approve">通過</option>
              <option value="reject">拒絕</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">審核備註</label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="請輸入審核備註..."
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              取消
            </Button>
            <Button onClick={submitReview}>
              {reviewAction === 'approve' ? '通過' : '拒絕'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
