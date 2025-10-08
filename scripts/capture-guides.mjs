import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ====== 可調參數 ======
const BASE_URL = process.env.CAPTURE_BASE_URL || 'https://store.942clean.com.tw'
const VIEWPORT = { width: 1440, height: 900 }

// 測試帳密（由使用者提供）
const CREDS = {
  technician: { email: 'jason660628@yahoo.com.tw', password: 'a123123' },
  support: { email: 'qyome168@gmail.com', password: 'a123123' },
  sales: { email: 'a42868756@gmail.com', password: 'a123123' },
  member: { email: 'a13788051@gmail.com', password: 'a123123' }
}

// 導出目錄：OneDrive 桌面 \tec，若找不到 OneDrive，退回使用者桌面，再退回專案內 captures
function resolveOutputDir() {
  const home = os.homedir()
  const candidates = []
  const oneDrive = process.env.OneDrive || path.join(home, 'OneDrive')
  candidates.push(path.join(oneDrive, 'Desktop', 'tec'))
  candidates.push(path.join(oneDrive, '桌面', 'tec'))
  candidates.push(path.join(home, 'Desktop', 'tec'))
  candidates.push(path.join(home, '桌面', 'tec'))
  candidates.push(path.join(__dirname, '..', 'captures', 'tec'))
  for (const p of candidates) {
    try { fs.mkdirSync(p, { recursive: true }); return p } catch {}
  }
  // 最終兜底
  return path.join(__dirname, '..', 'captures', 'tec')
}

async function ensureLoggedOut(page) {
  try { await page.context().clearCookies() } catch {}
  try { await page.evaluate(() => localStorage.clear()) } catch {}
}

async function loginStaff(page, email, password) {
  await ensureLoggedOut(page)
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForURL(/\/(dispatch|orders|schedule|reservations)/, { timeout: 15000 }).catch(()=>{})
  ])
}

async function loginMember(page, email, password) {
  await ensureLoggedOut(page)
  await page.goto(BASE_URL + '/login/member', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForURL(/\/store(\/.*)?$/, { timeout: 15000 }).catch(()=>{})
  ])
}

async function capture(page, route, outDir, name) {
  const url = route.startsWith('http') ? route : (BASE_URL + route)
  await page.goto(url, { waitUntil: 'networkidle' })
  // 小等一下動畫/字型
  await page.waitForTimeout(800)
  const safe = name.replace(/[^a-zA-Z0-9_-]+/g, '_')
  const out = path.join(outDir, `${safe}.png`)
  await page.screenshot({ path: out, fullPage: true })
  console.log('✓ 截圖完成:', out)
}

async function run() {
  const outDir = resolveOutputDir()
  console.log('輸出資料夾:', outDir)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: VIEWPORT })
  const page = await context.newPage()

  try {
    // 1) 技師
    console.log('\n[技師] 登入中...')
    await loginStaff(page, CREDS.technician.email, CREDS.technician.password)
    await capture(page, '/dispatch', outDir, 'technician_dispatch')
    await capture(page, '/schedule', outDir, 'technician_schedule')

    // 2) 客服（支援）
    console.log('\n[客服] 登入中...')
    await loginStaff(page, CREDS.support.email, CREDS.support.password)
    await capture(page, '/dispatch', outDir, 'support_dispatch')
    await capture(page, '/orders', outDir, 'support_orders')
    await capture(page, '/reservations', outDir, 'support_reservations')
    await capture(page, '/report-center', outDir, 'support_report_center')

    // 3) 業務
    console.log('\n[業務] 登入中...')
    await loginStaff(page, CREDS.sales.email, CREDS.sales.password)
    await capture(page, '/orders', outDir, 'sales_orders')
    await capture(page, '/reservations', outDir, 'sales_reservations')

    // 4) 會員
    console.log('\n[會員] 登入中...')
    await loginMember(page, CREDS.member.email, CREDS.member.password)
    await capture(page, '/store', outDir, 'member_store_home')
    await capture(page, '/store/products', outDir, 'member_store_products')
    await capture(page, '/store/cart', outDir, 'member_store_cart')
    await capture(page, '/store/member/orders', outDir, 'member_orders')

  } catch (e) {
    console.error('截圖流程錯誤：', e?.message || e)
  } finally {
    await context.close()
    await browser.close()
  }
}

run().catch(err => { console.error(err); process.exit(1) })








