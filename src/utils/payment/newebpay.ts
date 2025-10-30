export type NewebPayCreateResponse = {
  action: string
  method: 'POST'
  fields: Record<string, string>
}

export type StartPaymentParams = {
  orderId: string
  amount: number
  email: string
  itemDesc?: string
  payMethod?: 'CREDIT' | 'APPLEPAY' | 'BOTH'
  returnUrl?: string
  instFlag?: '3' | '6'
}

function buildAndSubmitForm(action: string, fields: Record<string, string>): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  Object.entries(fields).forEach(([k, v]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = String(v)
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}

export async function startNewebPayPayment(params: StartPaymentParams): Promise<void> {
  const { orderId, amount, email } = params
  if (!orderId) throw new Error('orderId required')
  if (!(amount > 0)) throw new Error('amount must be > 0')
  if (!email) throw new Error('email required')

  const res = await fetch('/.netlify/functions/newebpay-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      amount,
      email,
      itemDesc: params.itemDesc || `訂單#${orderId}`,
      payMethod: params.payMethod || 'BOTH',
      returnUrl: params.returnUrl || `${location.origin}/.netlify/functions/newebpay-return`,
      instFlag: params.instFlag
    })
  })
  if (!res.ok) throw new Error(await res.text())
  const payload = (await res.json()) as NewebPayCreateResponse
  if (!payload || !payload.action || !payload.fields) throw new Error('invalid response')
  buildAndSubmitForm(payload.action, payload.fields)
}


