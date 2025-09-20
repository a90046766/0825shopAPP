import type { Order } from '../core/repository'
import { supabase } from '../utils/supabase'

/**
 * 在訂單結案後，自動推播「評價提示 +50 點」通知（7 天有效），並避免重複推送。
 * 規則：
 * - 目標對象為該訂單的會員 Email（優先使用 order.customerEmail，其次透過 memberId 查詢）
 * - 防重條件：同會員 + 同 orderId + kind=review_prompt 若已存在則不再推送
 * - 有效期：7 天（expires_at）
 */
export async function applyPointsOnOrderCompletion(order: Order, repos: any): Promise<void> {
  try {
    // 1) 解析目標 Email
    let targetEmail = String(order.customerEmail || '').toLowerCase()
    try {
      if (!targetEmail && order.memberId && repos?.memberRepo?.get) {
        const m = await repos.memberRepo.get(order.memberId)
        if (m?.email) targetEmail = String(m.email).toLowerCase()
      }
    } catch {}
    if (!targetEmail) return

    // 2) 防重：查詢近期該用戶的通知並比對 body JSON（kind=review_prompt && orderId 匹配）
    try {
      const { data: prior, error: priorErr } = await supabase
        .from('notifications')
        .select('id, body, target, target_user_email, created_at')
        .eq('target', 'user')
        .eq('target_user_email', targetEmail)
        .order('created_at', { ascending: false })
        .limit(100)
      if (!priorErr && Array.isArray(prior)) {
        const exists = prior.some((row: any) => {
          try {
            const b = row?.body
            if (!b || typeof b !== 'string' || !b.trim().startsWith('{')) return false
            const j = JSON.parse(b)
            return j?.kind === 'review_prompt' && String(j?.orderId || '') === String(order.id || '')
          } catch { return false }
        })
        if (exists) return
      }
    } catch {}

    // 3) 讀取設定：reviewBonusPoints，預設 50
    let bonusPoints = 50
    try {
      if (repos?.settingsRepo?.get) {
        const s = await repos.settingsRepo.get()
        if (typeof s?.reviewBonusPoints === 'number') bonusPoints = s.reviewBonusPoints
      }
    } catch {}

    // 4) 組合通知內容（JSON 放在 body，MemberBell 會解析 data.kind === 'review_prompt'）
    const bodyJson = {
      kind: 'review_prompt',
      orderId: order.id,
      bonus: bonusPoints,
      options: [
        { label: 'Google 評論', url: 'https://g.page/r/942clean/review' },
        { label: 'Facebook 評價', url: 'https://www.facebook.com/942clean/reviews' }
      ]
    }

    const nowIso = new Date().toISOString()
    const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // 5) 寫入通知（立即送出 + 到期時間）
    if (repos?.notificationRepo?.push) {
      await repos.notificationRepo.push({
        title: '完成服務回饋 +50 點',
        body: JSON.stringify(bodyJson),
        level: 'success',
        target: 'user',
        targetUserEmail: targetEmail,
        sentAt: nowIso,
        expiresAt: expiresIso,
      } as any)
    } else {
      // 後備方案：直接呼叫 Supabase
      await supabase.from('notifications').insert({
        title: '完成服務回饋 +50 點',
        body: JSON.stringify(bodyJson),
        level: 'success',
        target: 'user',
        target_user_email: targetEmail,
        sent_at: nowIso,
        expires_at: expiresIso,
        created_at: nowIso,
      } as any)
    }
  } catch (error) {
    try { console.warn('applyPointsOnOrderCompletion failed:', (error as any)?.message || error) } catch {}
  }
}

import type { Order } from '../core/repository'
import { loadAdapters } from '../adapters'

function calcSubTotal(order: Order): number {
  try {
    return (order.serviceItems || []).reduce((sum: number, it: any) => sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0), 0)
  } catch {
    return 0
  }
}

function calcNetAmount(order: Order): number {
  const sub = calcSubTotal(order)
  const deduct = Number(order.pointsDeductAmount || 0)
  return Math.max(0, sub - deduct)
}

function calcEarnPointsByNetAmount(netAmount: number): number {
  // 規則：$100 = 1 點（四捨五入改為無條件捨去）
  return Math.floor((Number(netAmount) || 0) / 100)
}

function hasTag(note: string | undefined, tag: string): boolean {
  return typeof note === 'string' && note.includes(tag)
}

function appendTag(note: string | undefined, tag: string): string {
  const base = (note || '').trim()
  return base ? `${base}\n${tag}` : tag
}

export async function applyPointsOnOrderCompletion(order: Order, injectedRepos?: any): Promise<{ usedApplied: number; earnedApplied: number; refAward?: { code: string; points: number } }> {
  const repos = injectedRepos || (await loadAdapters())
  const result: { usedApplied: number; earnedApplied: number; refAward?: { code: string; points: number } } = { usedApplied: 0, earnedApplied: 0 }
  try {
    if (!order?.memberId) return result
    const member = await repos.memberRepo.get(order.memberId)
    if (!member) return result

    let note = order.note || ''
    let updatedMemberPoints = Number(member.points || 0)

    // 1) 扣除使用的積分（僅在尚未扣除時執行）
    const USED_TAG = '[points-used-applied]'
    const used = Math.max(0, Number(order.pointsUsed || 0))
    if (used > 0 && !hasTag(note, USED_TAG)) {
      const canUse = Math.min(used, updatedMemberPoints)
      if (canUse > 0) {
        updatedMemberPoints -= canUse
        result.usedApplied = canUse
        note = appendTag(note, `${USED_TAG} -${canUse}`)
      } else {
        note = appendTag(note, `${USED_TAG} -0(餘額不足)`) // 紀錄嘗試但未扣成功
      }
    }

    // 2) 發放回饋積分（僅在尚未發放時執行）
    const EARN_TAG = '[points-earned-applied]'
    if (!hasTag(note, EARN_TAG)) {
      const net = calcNetAmount(order)
      const earn = Math.max(0, calcEarnPointsByNetAmount(net))
      if (earn > 0) {
        updatedMemberPoints += earn
        result.earnedApplied = earn
        note = appendTag(note, `${EARN_TAG} +${earn}`)
      } else {
        note = appendTag(note, `${EARN_TAG} +0`)
      }
    }

    // 3) 推薦碼積分（技師 SRxxx / 會員 MOxxxx；每滿 300 元 +1）
    try {
      const ref = String(order.referrerCode || '').toUpperCase().trim()
      if (ref) {
        const award = Math.floor(calcNetAmount(order) / 300)
        if (award > 0) {
          if (ref.startsWith('SR')) {
            try {
              const techs = await repos.technicianRepo.list()
              const hit = (techs || []).find((t: any) => String(t.code || '').toUpperCase() === ref)
              if (hit) {
                await repos.technicianRepo.upsert({ ...hit, points: Number(hit.points || 0) + award })
                result.refAward = { code: ref, points: award }
                note = appendTag(note, `[points-ref-tech:${ref}] +${award}`)
              }
            } catch {}
          } else if (ref.startsWith('MO')) {
            try {
              const refMember = await repos.memberRepo.findByCode(ref)
              if (refMember) {
                await repos.memberRepo.upsert({ ...refMember, points: Number(refMember.points || 0) + award })
                result.refAward = { code: ref, points: award }
                note = appendTag(note, `[points-ref-member:${ref}] +${award}`)
              }
            } catch {}
          } else if (ref.startsWith('SE')) {
            // Staff ref_code 目前資料庫欄位可能不存在，僅留紀錄避免重複發放
            note = appendTag(note, `[points-ref-staff:${ref}] +0(pending)`)
          }
        } else {
          note = appendTag(note, `[points-ref:${ref}] +0`)
        }
      }
    } catch {}

    // 4) 寫回會員積分與訂單備註（避免重複發放/扣除）
    await repos.memberRepo.upsert({ ...member, points: updatedMemberPoints })
    await repos.orderRepo.update(order.id, { note })
  } catch (err) {
    console.warn('applyPointsOnOrderCompletion error:', err)
  }
  return result
}


