import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../../config/firebase'
import type { UserInventory, Coupon } from '../../../types'
import { getUserId } from '../../../utils/userId'
import BookTab from '../components/BookTab'
import CouponTab from '../components/CouponTab'

type Tab = 'book' | 'coupons'

export default function InventoryPage() {
  const [tab, setTab]           = useState<Tab>('book')
  const [inventory, setInventory] = useState<UserInventory[]>([])
  const [coupons, setCoupons]   = useState<Coupon[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const userId = getUserId()

  useEffect(() => {
    const q = query(collection(db, 'user_inventory'), where('userId', '==', userId))
    return onSnapshot(q, (snap) => {
      setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserInventory)))
    })
  }, [userId])

  useEffect(() => {
    const q = query(collection(db, 'coupons'), where('userId', '==', userId))
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      })) as Coupon[]
      data.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setCoupons(data)
    })
  }, [userId])

  const clearInventory = async () => {
    if (!window.confirm('도감의 몬스터를 전부 삭제하시겠습니까?')) return
    setIsClearing(true)
    try {
      const q    = query(collection(db, 'user_inventory'), where('userId', '==', userId))
      const snap = await getDocs(q)
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'user_inventory', d.id))))
    } catch (err) {
      console.error('도감 초기화 에러:', err)
    } finally {
      setIsClearing(false)
    }
  }

  const unusedCouponCount = coupons.filter((c) => !c.isUsed).length

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-5 pt-12 pb-4 shrink-0 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-gray-900">도감 & 쿠폰함</h1>
          <p className="text-sm text-gray-400 mt-0.5">포획한 몬스터와 발급된 쿠폰을 확인하세요</p>
        </div>
        <button
          onClick={clearInventory}
          disabled={isClearing}
          className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-1.5 font-bold active:scale-95 transition-all disabled:opacity-50 shrink-0 mt-1"
        >
          {isClearing ? '청소중...' : '🧹 초기화'}
        </button>
      </header>

      <nav className="flex px-5 gap-1 shrink-0 border-b border-gray-100">
        {([
          { key: 'book',    label: '도감',   badge: inventory.length },
          { key: 'coupons', label: '쿠폰함', badge: unusedCouponCount },
        ] as { key: Tab; label: string; badge: number }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex-1 py-3 text-sm font-bold transition-colors ${
              tab === key ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {label}
              {badge > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none font-black ${
                  tab === key ? 'bg-amber-400 text-gray-900' : 'bg-gray-100 text-gray-400'
                }`}>
                  {badge}
                </span>
              )}
            </span>
            {tab === key && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {tab === 'book'    && <BookTab    inventory={inventory} />}
        {tab === 'coupons' && <CouponTab  coupons={coupons} />}
      </div>
    </div>
  )
}
