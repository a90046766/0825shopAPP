// 時間重疊檢查
export function overlaps(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(`2000-01-01T${start1}`).getTime()
  const e1 = new Date(`2000-01-01T${end1}`).getTime()
  const s2 = new Date(`2000-01-01T${start2}`).getTime()
  const e2 = new Date(`2000-01-01T${end2}`).getTime()
  return s1 < e2 && s2 < e1
}

// 節流函數
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }
}

// 快取函數
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  ttl: number = 5 * 60 * 1000 // 預設 5 分鐘
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>()
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)
    const now = Date.now()
    const cached = cache.get(key)
    
    if (cached && now - cached.timestamp < ttl) {
      return cached.value
    }
    
    const result = func(...args)
    cache.set(key, { value: result, timestamp: now })
    
    return result
  }) as T
}

// 防抖函數
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}


