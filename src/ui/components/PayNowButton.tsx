import React, { useState } from 'react'
import { startNewebPayPayment } from '../../utils/payment/newebpay'

type Props = {
  orderId: string
  amount: number
  email: string
  label?: string
  disabled?: boolean
  payMethod?: 'CREDIT' | 'APPLEPAY' | 'BOTH'
  itemDesc?: string
}

export function PayNowButton(props: Props) {
  const { orderId, amount, email } = props
  const [loading, setLoading] = useState(false)
  const label = props.label || '信用卡 / Apple Pay 付款'

  async function onClick() {
    try {
      setLoading(true)
      await startNewebPayPayment({
        orderId,
        amount,
        email,
        itemDesc: props.itemDesc,
        payMethod: props.payMethod || 'BOTH'
      })
    } catch (err) {
      const message = (err && (err as Error).message) || '付款建立失敗'
      // eslint-disable-next-line no-alert
      alert(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={onClick} disabled={loading || !!props.disabled} className="rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-2 disabled:opacity-60">
      {loading ? '前往付款中⋯' : label}
    </button>
  )
}

export default PayNowButton


