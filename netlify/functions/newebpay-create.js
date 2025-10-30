/*
  NewebPay create payment payload (信用卡/Apple Pay 一次性付款)
  - 前端以 POST 呼叫本 Function 取得要送往藍新的表單欄位
  - 需於 Netlify 環境變數設定：
    NEWEBPAY_HASH_KEY
    NEWEBPAY_HASH_IV
    NEWEBPAY_MERCHANT_ID
    NEWEBPAY_ENV (prod|test) 省略則預設 prod
*/

const crypto = require('crypto')

function ensure(value, name) {
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function padKey(key, target) {
  if (Buffer.byteLength(key, 'utf8') === target) return key
  const buf = Buffer.alloc(target, 0)
  Buffer.from(key, 'utf8').copy(buf)
  return buf
}

function aesEncrypt(plainText, key, iv) {
  const k = padKey(key, 32)
  const i = padKey(iv, 16)
  const cipher = crypto.createCipheriv('aes-256-cbc', k, i)
  const enc1 = cipher.update(plainText, 'utf8', 'hex')
  const enc2 = cipher.final('hex')
  return enc1 + enc2
}

function sha256HexUpper(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase()
}

function buildKvString(params) {
  // 依 key 排序產出原始 KV 字串（NewebPay 建議以原始值加密，不先 URL 編碼）
  const keys = Object.keys(params).sort()
  return keys.map(k => `${k}=${String(params[k] ?? '')}`).join('&')
}

function gatewayBase(env) {
  return env === 'test' ? 'https://ccore.newebpay.com' : 'https://core.newebpay.com'
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const HASH_KEY = ensure(process.env.NEWEBPAY_HASH_KEY, 'NEWEBPAY_HASH_KEY')
    const HASH_IV = ensure(process.env.NEWEBPAY_HASH_IV, 'NEWEBPAY_HASH_IV')
    const MERCHANT_ID = ensure(process.env.NEWEBPAY_MERCHANT_ID, 'NEWEBPAY_MERCHANT_ID')
    const ENV = (process.env.NEWEBPAY_ENV || 'prod').toLowerCase()

    const nowTs = Math.floor(Date.now() / 1000)
    const host = event.headers['x-forwarded-host'] || event.headers.host
    const proto = (event.headers['x-forwarded-proto'] || 'https')
    const baseUrl = `${proto}://${host}`

    let body
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return { statusCode: 400, body: 'Invalid JSON' }
    }

    const orderId = ensure(body.orderId, 'orderId')
    const amount = Math.round(Number(ensure(body.amount, 'amount')) || 0)
    if (!(amount > 0)) return { statusCode: 400, body: 'amount must be > 0' }
    const email = ensure(body.email, 'email')
    const itemDescRaw = body.itemDesc || '訂單付款'
    const itemDesc = (String(itemDescRaw).slice(0, 50)) || '訂單付款'
    const tradeLimit = Math.max(60, Math.min(900, Number(body.tradeLimit || 900)))
    const loginType = 0
    const payMethod = (body.payMethod || 'BOTH').toUpperCase() // CREDIT | APPLEPAY | BOTH
    const instFlagRaw = body.instFlag
    const returnUrl = body.returnUrl || `${baseUrl}/.netlify/functions/newebpay-return`
    const notifyUrl = `${baseUrl}/.netlify/functions/newebpay-notify`

    const nonce = Math.random().toString(36).slice(2, 8)
    // 藍新規範：英數＋底線，移除其他符號並將連字號轉底線
    const merchantOrderNo = (body.merchantOrderNo || `${orderId}_${nonce}`)
      .replace(/-/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')
      .slice(0, 29)

    const baseParams = {
      MerchantID: MERCHANT_ID,
      RespondType: 'JSON',
      TimeStamp: String(nowTs),
      Version: '2.0',
      LangType: 'zh-tw',
      MerchantOrderNo: merchantOrderNo,
      Amt: String(amount),
      ItemDesc: itemDesc,
      Email: email,
      LoginType: String(loginType),
      TradeLimit: String(tradeLimit),
      NotifyURL: notifyUrl,
      ReturnURL: returnUrl
    }

    if (payMethod === 'CREDIT' || payMethod === 'BOTH') baseParams.CREDIT = 1
    if (payMethod === 'APPLEPAY' || payMethod === 'BOTH') baseParams.APPLEPAY = 1

    // 可選分期（3 或 6）
    if (instFlagRaw === 3 || instFlagRaw === '3') {
      baseParams.InstFlag = '3'
      baseParams.CREDIT = 1
    } else if (instFlagRaw === 6 || instFlagRaw === '6') {
      baseParams.InstFlag = '6'
      baseParams.CREDIT = 1
    }

    const kv = buildKvString(baseParams)
    const tradeInfo = aesEncrypt(kv, HASH_KEY, HASH_IV)
    const tradeSha = sha256HexUpper(`HashKey=${HASH_KEY}&${tradeInfo}&HashIV=${HASH_IV}`)

    const action = `${gatewayBase(ENV)}/MPG/mpg_gateway`
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        method: 'POST',
        fields: {
          MerchantID: MERCHANT_ID,
          TradeInfo: tradeInfo,
          TradeSha: tradeSha,
          Version: '2.0'
        }
      })
    }
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Server Error' }
  }
}


