/* NewebPay start page (GET): 以 URL 參數產生自動送出表單，適合做 QR 連結 */
const crypto = require('crypto')

function ensure(value, name) { if (!value) throw new Error(`Missing ${name}`); return value }
function padKey(key, target) { if (Buffer.byteLength(key, 'utf8') === target) return key; const buf = Buffer.alloc(target, 0); Buffer.from(key,'utf8').copy(buf); return buf }
function aesEncrypt(plainText, key, iv) { const k=padKey(key,32); const i=padKey(iv,16); const c=crypto.createCipheriv('aes-256-cbc',k,i); return c.update(plainText,'utf8','hex') + c.final('hex') }
function sha256HexUpper(s){ return crypto.createHash('sha256').update(s,'utf8').digest('hex').toUpperCase() }
function buildKvString(params){ const keys=Object.keys(params).sort(); return keys.map(k=>`${k}=${String(params[k]??'')}`).join('&') }
function gatewayBase(env){ return env==='test' ? 'https://ccore.newebpay.com' : 'https://core.newebpay.com' }

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' }
    const HASH_KEY = ensure(process.env.NEWEBPAY_HASH_KEY, 'NEWEBPAY_HASH_KEY')
    const HASH_IV = ensure(process.env.NEWEBPAY_HASH_IV, 'NEWEBPAY_HASH_IV')
    const MERCHANT_ID = ensure(process.env.NEWEBPAY_MERCHANT_ID, 'NEWEBPAY_MERCHANT_ID')
    const ENV = (process.env.NEWEBPAY_ENV || 'prod').toLowerCase()

    const q = event.queryStringParameters || {}
    const orderId = ensure(q.orderId, 'orderId')
    const amount = Math.round(Number(ensure(q.amount,'amount'))||0)
    if (!(amount>0)) return { statusCode: 400, body: 'amount must be > 0' }
    const email = q.email ? String(q.email) : ''
    const itemDesc = (q.desc ? String(q.desc) : `訂單#${orderId}`).slice(0,50)

    const nowTs = Math.floor(Date.now()/1000)
    const nonce = Math.random().toString(36).slice(2,8)
    const merchantOrderNo = `${String(orderId)}_${nonce}`.replace(/-/g,'_').replace(/[^A-Za-z0-9_]/g,'').slice(0,29)

    const baseParams = {
      MerchantID: MERCHANT_ID,
      RespondType: 'JSON',
      TimeStamp: String(nowTs),
      Version: '2.0',
      LangType: 'zh-tw',
      MerchantOrderNo: merchantOrderNo,
      Amt: String(amount),
      ItemDesc: itemDesc,
      LoginType: '0',
      TradeLimit: '900'
    }
    if (email) baseParams.Email = email
    // 預設同時開信用卡與 Apple Pay
    baseParams.CREDIT = 1
    baseParams.APPLEPAY = 1

    const kv = buildKvString(baseParams)
    const tradeInfo = aesEncrypt(kv, HASH_KEY, HASH_IV)
    const tradeSha = sha256HexUpper(`HashKey=${HASH_KEY}&${tradeInfo}&HashIV=${HASH_IV}`)
    const action = `${gatewayBase(ENV)}/MPG/mpg_gateway`

    const html = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>前往付款</title></head><body>
      <form id="f" method="POST" action="${action}">
        <input type="hidden" name="MerchantID" value="${MERCHANT_ID}" />
        <input type="hidden" name="TradeInfo" value="${tradeInfo}" />
        <input type="hidden" name="TradeSha" value="${tradeSha}" />
        <input type="hidden" name="Version" value="2.0" />
      </form>
      <script>document.getElementById('f').submit()</script>
      <noscript>
        <p>即將前往金流付款頁，若未自動跳轉，請按下方按鈕：</p>
        <button type="submit" form="f">前往付款</button>
      </noscript>
    </body></html>`

    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: html }
  } catch (e) {
    return { statusCode: 500, body: e.message || 'Server Error' }
  }
}


