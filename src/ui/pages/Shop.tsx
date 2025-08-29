import React, { Suspense, lazy } from 'react'

const StoreProductsPage = lazy(() => import('../../../storecart/src/pages/Products'))

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">載入中...</div>}>
      <StoreProductsPage />
    </Suspense>
  )
}


