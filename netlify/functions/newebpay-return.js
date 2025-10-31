/* NewebPay Return URL（瀏覽器導回） */
const crypto = require('crypto')
const querystring = require('querystring')

function ensure(value, name) { if (!value) throw new Error(`Missing ${name}`); return value }
function padKey(key, target) { if (Buffer.byteLength(key, 'utf8') === target) return key; const buf = Buffer.alloc(target, 0); Buffer.from(key,'utf8').copy(buf); return buf }
function aesDecrypt(hexCipher, key, iv) { const k=padKey(key,32); const i=padKey(iv,16); const d=crypto.createDecipheriv('aes-256-cbc',k,i); const a=d.update(hexCipher,'hex','utf8'); const b=d.final('utf8'); return a+b }
function sha256HexUpper(s){ return crypto.createHash('sha256').update(s,'utf8').digest('hex').toUpperCase() }

exports.handler = async (event) => {
  try {
    const HASH_KEY = ensure(process.env.NEWEBPAY_HASH_KEY, 'NEWEBPAY_HASH_KEY')
    const HASH_IV = ensure(process.env.NEWEBPAY_HASH_IV, 'NEWEBPAY_HASH_IV')
    const isForm = (event.httpMethod === 'POST') && (event.headers['content-type']||'').includes('application/x-www-form-urlencoded')
    const payload = isForm ? querystring.parse(event.body || '') : (event.httpMethod === 'GET' ? event.queryStringParameters : {})
    const tradeInfo = payload.TradeInfo
    const tradeSha = payload.TradeSha
    let pairs = {}
    let ok = false
    let message = ''
    if (tradeInfo && tradeSha) {
      const expectSha = sha256HexUpper(`HashKey=${HASH_KEY}&${tradeInfo}&HashIV=${HASH_IV}`)
      if (expectSha === tradeSha) {
        const kvText = aesDecrypt(tradeInfo, HASH_KEY, HASH_IV)
        pairs = querystring.parse(kvText)
        ok = String(pairs.Status || '').toUpperCase() === 'SUCCESS'
        message = ok ? '付款成功' : '付款失敗'
      } else message = '回傳驗證失敗（TradeSha 不一致）'
    } else message = '缺少回傳參數'

    const orderNo = pairs.MerchantOrderNo || ''
    const amt = pairs.Amt || ''
    const card6No = pairs.Card6No || ''
    const card4No = pairs.Card4No || ''
    const html = `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>付款結果</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px}.ok{color:#1a7f37}.err{color:#b91c1c}.box{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:12px}.kv{margin:4px 0;color:#374151}.btn{display:inline-block;margin-top:16px;padding:10px 16px;border:1px solid #111827;border-radius:6px;text-decoration:none;color:#111827}</style></head><body>
  <h2 class="${ok ? 'ok':'err'}">${message}</h2>
  <div class="box">
    <div class="kv">訂單編號：${orderNo}</div>
    <div class="kv">金額：${amt}</div>
    ${card6No || card4No ? `<div class="kv">卡號：${card6No}******${card4No}</div>` : ''}
  </div>
  <a class="btn" href="/">返回首頁</a>
</body></html>`
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html }
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Server Error' }
  }
}




