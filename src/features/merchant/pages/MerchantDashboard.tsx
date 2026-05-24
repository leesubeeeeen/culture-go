import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import { useAuth } from '../../auth/AuthContext'
import type { MerchantVerification } from '../../../types'
import MerchantVerificationScreen from './MerchantVerificationScreen'
import MonsterRequestScreen from '../components/MonsterRequestScreen'
import QRScannerScreen from '../components/QRScannerScreen'
import CouponDashboard from '../components/CouponDashboard'
import CouponRegisterScreen from '../components/CouponRegisterScreen'

type Tab = 'monster' | 'qr' | 'coupons' | 'coupon-register'

const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: 'monster',          emoji: '🐉', label: '몬스터 신청' },
  { key: 'qr',              emoji: '📷', label: 'QR 스캔' },
  { key: 'coupons',         emoji: '🎟️', label: '쿠폰 현황' },
  { key: 'coupon-register', emoji: '🎫', label: '쿠폰 등록' },
]

export default function MerchantDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('monster')
  // undefined: 로딩 중 | null: 미인증 | object: 인증 완료
  const [verification, setVerification] = useState<MerchantVerification | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'merchants', user.id), (snap) => {
      setVerification(
        snap.exists()
          ? ({ uid: snap.id, ...snap.data(), createdAt: snap.data().createdAt?.toDate?.() ?? new Date() } as MerchantVerification)
          : null
      )
    })
    return unsub
  }, [user])

  if (verification === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-5xl animate-bounce">🐾</span>
      </div>
    )
  }

  if (verification === null) {
    return <MerchantVerificationScreen onVerified={() => { /* onSnapshot이 자동으로 verification을 갱신함 */ }} />
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-5 pt-12 pb-4 shrink-0">
        <p className="text-xs font-bold text-amber-500 mb-0.5">인증된 상인</p>
        <h1 className="text-2xl font-black text-gray-900">{verification.shopName}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{verification.category}</p>
      </header>

      <nav className="flex px-5 gap-1 shrink-0 border-b border-gray-100">
        {TABS.map(({ key, emoji, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-bold transition-colors ${
              tab === key ? 'text-gray-900' : 'text-gray-300'
            }`}
          >
            <span className="text-lg leading-none">{emoji}</span>
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {tab === 'monster' && (
          <MonsterRequestScreen
            shopId={verification.shopId}
            shopName={verification.shopName}
            category={verification.category}
            lat={verification.lat}
            lng={verification.lng}
          />
        )}
        {tab === 'qr'              && <QRScannerScreen />}
        {tab === 'coupons'         && <CouponDashboard shopId={verification.shopId} />}
        {tab === 'coupon-register' && (
          <CouponRegisterScreen shopId={verification.shopId} shopName={verification.shopName} />
        )}
      </div>
    </div>
  )
}
