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


