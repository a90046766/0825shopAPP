// 服務數量標示工具函數
// 根據用戶需求：一台分離式冷氣是1分，一台吊隱是1吊，一台洗衣機是1直，一台四方吹是1吹，一台抽油煙機是1抽，一個出風口是1出，1台室外機是1外，車馬費是1馬

export interface ServiceQuantity {
  notation: string // 標示符號
  count: number // 數量
  description: string // 描述
}

// 服務項目對應的標示符號
const SERVICE_NOTATIONS: Record<string, string> = {
  // 冷氣相關
  '分離式冷氣': '分',
  '分離式冷氣清洗': '分',
  '分離式冷氣保養': '分',
  '特殊分離式': '分',
  '吊隱式冷氣': '吊',
  '吊隱式冷氣清洗': '吊',
  '吊隱式冷氣保養': '吊',
  '吊隱特殊': '吊',
  '四方吹': '吹',
  '四方吹清洗': '吹',
  '四方吹保養': '吹',
  '室外機': '外',
  '室外機清洗': '外',
  '室外機保養': '外',
  
  // 洗衣機相關
  '洗衣機': '直',
  '洗衣機清洗': '直',
  '洗衣機保養': '直',
  '直立洗衣機': '直',
  '直立洗衣機清洗': '直',
  '直立洗衣機保養': '直',
  '滾筒洗衣機': '直',
  '滾筒洗衣機清洗': '直',
  '滾筒洗衣機保養': '直',
  
  // 抽油煙機相關
  '抽油煙機': '抽',
  '抽油煙機清洗': '抽',
  '抽油煙機保養': '抽',
  '一般抽油煙機': '抽',
  '一般抽油煙機清洗': '抽',
  '一般抽油煙機保養': '抽',
  '隱藏抽油煙機': '抽',
  '隱藏抽油煙機清洗': '抽',
  '隱藏抽油煙機保養': '抽',
  '倒T型抽油煙機': '抽',
  '倒T型抽油煙機清洗': '抽',
  '倒T型抽油煙機保養': '抽',
  '傳統雙渦輪抽油煙機': '抽',
  '傳統雙渦輪抽油煙機清洗': '抽',
  '傳統雙渦輪抽油煙機保養': '抽',
  
  // 其他設備
  '出風口': '出',
  '出風口清洗': '出',
  '出風口保養': '出',
  '管路施工': '出',
  '不鏽鋼水塔': '出',
  '不鏽鋼水塔清洗': '出',
  '不鏽鋼水塔保養': '出',
  '水泥水塔': '出',
  '水泥水塔清洗': '出',
  '水泥水塔保養': '出',
  
  // 費用相關
  '車馬費': '馬',
  '交通費': '馬',
  '服務費': '馬',
  
  // 其他服務
  '居家清潔': '清',
  '居家清潔服務': '清',
  '居家消毒': '消',
  '居家消毒服務': '消',
  '專業清洗': '專',
  '專業清洗服務': '專',
  '家電服務': '電',
  '家電維修': '修',
  '二手家電': '二',
  '二手家電服務': '二'
}

// 將服務項目轉換為數量標示
export function convertServiceToQuantity(serviceItems: any[]): ServiceQuantity[] {
  const quantities: Record<string, ServiceQuantity> = {}
  
  for (const item of serviceItems) {
    const serviceName = item.name || item.productName || ''
    const quantity = item.quantity || 1
    
    // 尋找對應的標示符號
    let notation = '項' // 預設標示
    for (const [key, value] of Object.entries(SERVICE_NOTATIONS)) {
      if (serviceName.includes(key)) {
        notation = value
        break
      }
    }
    
    // 累積相同標示的數量
    if (quantities[notation]) {
      quantities[notation].count += quantity
    } else {
      quantities[notation] = {
        notation,
        count: quantity,
        description: getQuantityDescription(notation, quantity)
      }
    }
  }
  
  return Object.values(quantities)
}

// 獲取數量描述
function getQuantityDescription(notation: string, count: number): string {
  const descriptions: Record<string, string> = {
    '分': '分離式冷氣',
    '吊': '吊隱式冷氣',
    '直': '洗衣機',
    '吹': '四方吹',
    '抽': '抽油煙機',
    '出': '出風口/管路',
    '外': '室外機',
    '馬': '車馬費',
    '清': '居家清潔',
    '消': '居家消毒',
    '專': '專業清洗',
    '電': '家電服務',
    '修': '家電維修',
    '二': '二手家電',
    '項': '其他服務'
  }
  
  const description = descriptions[notation] || '其他服務'
  return `${count}${notation} (${description})`
}

// 格式化服務數量顯示
export function formatServiceQuantity(serviceItems: any[]): string {
  const quantities = convertServiceToQuantity(serviceItems)
  return quantities.map(q => `${q.count}${q.notation}`).join(' ')
}

// 格式化服務數量詳細顯示
export function formatServiceQuantityDetailed(serviceItems: any[]): string {
  const quantities = convertServiceToQuantity(serviceItems)
  return quantities.map(q => q.description).join('、')
}

// 獲取服務項目總數量
export function getTotalServiceQuantity(serviceItems: any[]): number {
  return serviceItems.reduce((total, item) => total + (item.quantity || 1), 0)
}

// 檢查是否為特定類型的服務
export function isServiceType(serviceName: string, type: string): boolean {
  return serviceName.includes(type)
}

// 獲取服務類型標示
export function getServiceNotation(serviceName: string): string {
  for (const [key, value] of Object.entries(SERVICE_NOTATIONS)) {
    if (serviceName.includes(key)) {
      return value
    }
  }
  return '項'
}
