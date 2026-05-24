import { useState } from 'react'
import type { Coupon } from '../../../types'
import QrCodeModal from './QrCodeModal'

interface Props {
  coupons: Coupon[]
}

export default function CouponTab({ coupons }: Props) {
  const [selected, setSelected] = useState<Coupon | null>(null)

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
        <span className="text-5xl">🎟️</span>
        <p className="font-bold text-gray-600 mt-2">보유한 쿠폰이 없어요!</p>
        <p className="text-xs text-gray-400">몬스터 3마리를 모아 융합하면 쿠폰이 발급됩니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 flex flex-col gap-2.5">
        {coupons.map((coupon) => (
          <button
            key={coupon.id}
            onClick={() => setSelected(coupon)}
            className={`w-full flex items-center gap-3.5 border rounded-2xl p-3.5 text-left active:scale-[0.98] transition-all shadow-sm ${
              coupon.isUsed ? 'bg-gray-50 border-gray-100' : 'bg-white border-amber-100'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
              coupon.isUsed ? 'bg-gray-100' : 'bg-amber-50'
            }`}>
              {coupon.isUsed ? '✅' : '🎟️'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm truncate ${coupon.isUsed ? 'text-gray-400' : 'text-gray-900'}`}>
                {coupon.title}
              </p>
              <p className="text-xs text-gray-400">{coupon.shopName}</p>
              <p className="text-xs text-gray-300 mt-0.5">
                {coupon.createdAt instanceof Date
                  ? coupon.createdAt.toLocaleDateString('ko-KR')
                  : ''}
              </p>
            </div>
            {!coupon.isUsed && (
              <span className="text-xs bg-green-50 text-green-600 font-semibold px-2 py-1 rounded-full border border-green-100 shrink-0">
                미사용
              </span>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <QrCodeModal coupon={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
