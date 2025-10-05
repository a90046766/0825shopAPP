const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: CORS, body: '' }
    }
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' }
    }

    const uncode = process.env.EINVOICE_UNCODE || process.env.VITE_EINVOICE_UNCODE
    const idno = process.env.EINVOICE_IDNO || process.env.VITE_EINVOICE_IDNO
    const password = process.env.EINVOICE_PASSWORD || process.env.VITE_EINVOICE_PASSWORD

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: !!uncode && !!idno && !!password,
        EINVOICE_UNCODE_present: !!uncode,
        EINVOICE_IDNO_present: !!idno,
        EINVOICE_PASSWORD_present: !!password
      })
    }
  } catch (err) {
    const message = (err && err.message) ? err.message : 'Server error'
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: message }) }
  }
}


