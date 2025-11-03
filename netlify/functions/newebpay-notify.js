/* NewebPay server-to-server Notify 回調處理 */
const crypto = require('crypto')
const querystring = require('querystring')

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
function aesDecrypt(hexCipher, key, iv) {
  const k = padKey(key, 32)
  const i = padKey(iv, 16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', k, i)
  const dec1 = decipher.update(hexCipher, 'hex', 'utf8')
  const dec2 = decipher.final('utf8')
  return dec1 + dec2
}
function sha256HexUpper(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase()
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
    const HASH_KEY = ensure(process.env.NEWEBPAY_HASH_KEY, 'NEWEBPAY_HASH_KEY')
    const HASH_IV = ensure(process.env.NEWEBPAY_HASH_IV, 'NEWEBPAY_HASH_IV')
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    const isForm = (event.headers['content-type'] || '').includes('application/x-www-form-urlencoded')
    const body = isForm ? querystring.parse(event.body || '') : (JSON.parse(event.body || '{}'))
    const tradeInfo = body.TradeInfo
    const tradeSha = body.TradeSha
    if (!tradeInfo || !tradeSha) return { statusCode: 400, body: 'Missing TradeInfo/TradeSha' }

    const expectSha = sha256HexUpper(`HashKey=${HASH_KEY}&${tradeInfo}&HashIV=${HASH_IV}`)
    if (expectSha !== tradeSha) return { statusCode: 400, body: 'TradeSha Mismatch' }

    const kvText = aesDecrypt(tradeInfo, HASH_KEY, HASH_IV)
    const pairs = querystring.parse(kvText)
    console.log('[newebpay-notify]', { status: body.Status, result: pairs })

    // 僅在交易成功時更新訂單狀態
    try {
      if (String(body.Status).toUpperCase() === 'SUCCESS' && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
        // 解析 orderId：我們的 MerchantOrderNo 為 `${orderId}_${nonce}`
        const mo = String(pairs.MerchantOrderNo || '')
        const orderId = mo.split('_')[0] || ''
        if (orderId) {
          await supabase.from('orders').update({ payment_status: 'paid', payment_method: 'online' }).or(`order_number.eq.${orderId},id.eq.${orderId}`)
        }
      }
    } catch (e) {
      console.warn('[newebpay-notify] update paid failed:', e?.message || e)
    }

    return { statusCode: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'SUCCESS' }
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Server Error' }
  }
}





