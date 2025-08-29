// 台灣縣市和區域資料
export const TAIWAN_CITIES = {
  '台北市': ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
  '新北市': ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區', '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'],
  '桃園市': ['桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '龜山區', '八德區', '大園區', '平鎮區', '新屋區', '觀音區', '復興區'],
  '台中市': ['中區', '東區', '南區', '西區', '北區', '北屯區', '西屯區', '南屯區', '太平區', '大里區', '霧峰區', '烏日區', '豐原區', '后里區', '石岡區', '東勢區', '和平區', '新社區', '潭子區', '大雅區', '神岡區', '大肚區', '沙鹿區', '龍井區', '梧棲區', '清水區', '大甲區', '外埔區', '大安區'],
  '台南市': ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區'],
  '高雄市': ['楠梓區', '左營區', '鼓山區', '三民區', '鹽埕區', '前金區', '新興區', '苓雅區', '前鎮區', '旗津區', '小港區', '鳳山區', '大寮區', '鳥松區', '林園區', '仁武區', '大樹區', '大社區', '岡山區', '路竹區', '橋頭區', '梓官區', '彌陀區', '永安區', '燕巢區', '田寮區', '阿蓮區', '茄萣區', '湖內區', '旗山區', '美濃區', '內門區', '杉林區', '甲仙區', '六龜區', '茂林區', '桃源區', '那瑪夏區'],
  '基隆市': ['仁愛區', '中正區', '信義區', '中山區', '安樂區', '暖暖區', '七堵區'],
  '新竹市': ['東區', '北區', '香山區'],
  '新竹縣': ['竹北市', '竹東鎮', '新埔鎮', '關西鎮', '湖口鄉', '新豐鄉', '芎林鄉', '橫山鄉', '北埔鄉', '寶山鄉', '峨眉鄉', '尖石鄉', '五峰鄉'],
  '苗栗縣': ['苗栗市', '頭份市', '苑裡鎮', '通霄鎮', '竹南鎮', '後龍鎮', '卓蘭鎮', '大湖鄉', '公館鄉', '銅鑼鄉', '南庄鄉', '頭屋鄉', '三義鄉', '西湖鄉', '造橋鄉', '三灣鄉', '獅潭鄉', '泰安鄉'],
  '彰化縣': ['彰化市', '員林市', '和美鎮', '鹿港鎮', '溪湖鎮', '二林鎮', '田中鎮', '北斗鎮', '花壇鄉', '芬園鄉', '大村鄉', '永靖鄉', '伸港鄉', '線西鄉', '福興鄉', '秀水鄉', '埔心鄉', '埔鹽鄉', '大城鄉', '芳苑鄉', '竹塘鄉', '社頭鄉', '二水鄉', '田尾鄉', '埤頭鄉', '溪州鄉'],
  '南投縣': ['南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉', '鹿谷鄉', '中寮鄉', '魚池鄉', '國姓鄉', '水里鄉', '信義鄉', '仁愛鄉'],
  '雲林縣': ['斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮', '古坑鄉', '大埤鄉', '莿桐鄉', '林內鄉', '二崙鄉', '崙背鄉', '麥寮鄉', '東勢鄉', '褒忠鄉', '台西鄉', '元長鄉', '四湖鄉', '口湖鄉', '水林鄉'],
  '嘉義市': ['東區', '西區'],
  '嘉義縣': ['太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '溪口鄉', '新港鄉', '六腳鄉', '東石鄉', '義竹鄉', '鹿草鄉', '水上鄉', '中埔鄉', '竹崎鄉', '梅山鄉', '番路鄉', '大埔鄉', '阿里山鄉'],
  '屏東縣': ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉', '麟洛鄉', '九如鄉', '里港鄉', '鹽埔鄉', '高樹鄉', '萬巒鄉', '內埔鄉', '竹田鄉', '新埤鄉', '枋寮鄉', '新園鄉', '崁頂鄉', '林邊鄉', '南州鄉', '佳冬鄉', '琉球鄉', '車城鄉', '滿州鄉', '枋山鄉', '三地門鄉', '霧台鄉', '瑪家鄉', '泰武鄉', '來義鄉', '春日鄉', '獅子鄉', '牡丹鄉'],
  '宜蘭縣': ['宜蘭市', '羅東鎮', '蘇澳鎮', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '冬山鄉', '五結鄉', '三星鄉', '大同鄉', '南澳鄉'],
  '花蓮縣': ['花蓮市', '鳳林鎮', '玉里鎮', '新城鄉', '吉安鄉', '壽豐鄉', '光復鄉', '豐濱鄉', '瑞穗鄉', '富里鄉', '秀林鄉', '萬榮鄉', '卓溪鄉'],
  '台東縣': ['台東市', '成功鎮', '關山鎮', '卑南鄉', '鹿野鄉', '池上鄉', '東河鄉', '長濱鄉', '太麻里鄉', '大武鄉', '綠島鄉', '海端鄉', '延平鄉', '金峰鄉', '達仁鄉', '蘭嶼鄉'],
  '澎湖縣': ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'],
  '金門縣': ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉', '烏坵鄉'],
  '連江縣': ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉']
}

// 從地址中提取縣市和區域
export function extractLocationFromAddress(address: string): { city: string; district: string; address: string } {
  if (!address) return { city: '', district: '', address: '' }
  
  // 移除空白字符
  const cleanAddress = address.trim()
  
  // 尋找縣市
  for (const [city, districts] of Object.entries(TAIWAN_CITIES)) {
    if (cleanAddress.includes(city)) {
      // 尋找區域
      for (const district of districts) {
        if (cleanAddress.includes(district)) {
          // 提取詳細地址（去除縣市和區域）
          const detailAddress = cleanAddress
            .replace(city, '')
            .replace(district, '')
            .trim()
          
          return {
            city,
            district,
            address: detailAddress
          }
        }
      }
      
      // 如果找到縣市但沒找到區域，返回縣市和剩餘地址
      const detailAddress = cleanAddress.replace(city, '').trim()
      return {
        city,
        district: '',
        address: detailAddress
      }
    }
  }
  
  // 如果都沒找到，返回原始地址
  return {
    city: '',
    district: '',
    address: cleanAddress
  }
}

// 格式化地址顯示
export function formatAddressDisplay(city: string, district: string, address: string): string {
  const parts = []
  if (city) parts.push(city)
  if (district) parts.push(district)
  if (address) parts.push(address)
  return parts.join('')
}

// 生成 Google Maps 連結
export function generateGoogleMapsLink(city: string, district: string, address: string): string {
  const fullAddress = formatAddressDisplay(city, district, address)
  const encodedAddress = encodeURIComponent(fullAddress)
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
}

// 計算訂單數量（根據服務項目）
export function calculateOrderQuantity(serviceItems: any[]): string {
  if (!serviceItems || serviceItems.length === 0) return '0'
  
  const totalQuantity = serviceItems.reduce((sum, item) => {
    return sum + (item.quantity || 0)
  }, 0)
  
  return totalQuantity.toString()
}

// 格式化技師顯示
export function formatTechniciansDisplay(assignedTechnicians: string[]): string {
  if (!assignedTechnicians || assignedTechnicians.length === 0) return ''
  
  return assignedTechnicians.join(' / ')
}

// 計算結案金額
export function calculateFinalAmount(serviceItems: any[], status: string): number {
  if (status === 'canceled') return 0
  
  if (!serviceItems || serviceItems.length === 0) return 0
  
  return serviceItems.reduce((sum, item) => {
    return sum + ((item.unitPrice || 0) * (item.quantity || 0))
  }, 0)
}

// 非標準服務區定義（偏遠地區、山區等）
export const NON_STANDARD_SERVICE_AREAS = {
  // 台北市
  '台北市': ['烏來區'],
  
  // 新北市
  '新北市': ['平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'],
  
  // 桃園市
  '桃園市': ['復興區'],
  
  // 台中市
  '台中市': ['和平區'],
  
  // 台南市
  '台南市': ['左鎮區', '玉井區', '楠西區', '南化區', '龍崎區'],
  
  // 高雄市
  '高雄市': ['田寮區', '阿蓮區', '內門區', '杉林區', '甲仙區', '六龜區', '茂林區', '桃源區', '那瑪夏區'],
  
  // 新竹縣
  '新竹縣': ['尖石鄉', '五峰鄉'],
  
  // 苗栗縣
  '苗栗縣': ['泰安鄉'],
  
  // 南投縣
  '南投縣': ['信義鄉', '仁愛鄉'],
  
  // 雲林縣
  '雲林縣': ['古坑鄉'],
  
  // 嘉義縣
  '嘉義縣': ['阿里山鄉'],
  
  // 屏東縣
  '屏東縣': ['三地門鄉', '霧台鄉', '瑪家鄉', '泰武鄉', '來義鄉', '春日鄉', '獅子鄉', '牡丹鄉'],
  
  // 宜蘭縣
  '宜蘭縣': ['大同鄉', '南澳鄉'],
  
  // 花蓮縣
  '花蓮縣': ['秀林鄉', '萬榮鄉', '卓溪鄉'],
  
  // 台東縣
  '台東縣': ['海端鄉', '延平鄉', '金峰鄉', '達仁鄉', '蘭嶼鄉'],
  
  // 澎湖縣
  '澎湖縣': ['望安鄉', '七美鄉'],
  
  // 金門縣
  '金門縣': ['烏坵鄉'],
  
  // 連江縣
  '連江縣': ['莒光鄉', '東引鄉']
}

// 驗證地址是否為非標準服務區
export function validateServiceArea(city: string, district: string): { 
  isValid: boolean; 
  message: string; 
  isNonStandard: boolean 
} {
  if (!city || !district) {
    return {
      isValid: false,
      message: '請選擇完整的縣市和區域',
      isNonStandard: false
    }
  }
  
  // 檢查是否為非標準服務區
  const nonStandardDistricts = NON_STANDARD_SERVICE_AREAS[city as keyof typeof NON_STANDARD_SERVICE_AREAS]
  
  if (nonStandardDistricts && nonStandardDistricts.includes(district)) {
    return {
      isValid: false,
      message: '本服務無法服務非標準服務區，請見諒',
      isNonStandard: true
    }
  }
  
  return {
    isValid: true,
    message: '',
    isNonStandard: false
  }
}

// 驗證完整地址是否為非標準服務區
export function validateAddressServiceArea(address: string): { 
  isValid: boolean; 
  message: string; 
  isNonStandard: boolean 
} {
  const { city, district } = extractLocationFromAddress(address)
  return validateServiceArea(city, district)
}
