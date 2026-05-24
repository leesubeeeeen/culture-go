import { useEffect, useState, useMemo } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs, deleteDoc
} from 'firebase/firestore'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../../../config/firebase'
import type { UserInventory, Coupon } from '../../../types'
import { getUserId } from '../../../utils/userId'

type Tab = 'monsters' | 'coupons'

const FUSION_REQUIRED = 3

interface InventoryGroup {
  monsterId: string
  monsterName: string
  monsterImageUrl: string
  category: string
  shopId: string
  shopName: string
  totalCount: number      // 미융합 문서 count 합계
  unfusedDocIds: string[] // 융합 처리에 필요한 doc ID 목록
}

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>('monsters')
  const [inventory, setInventory] = useState<UserInventory[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [fusingId, setFusingId] = useState<string | null>(null)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
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

  // monsterId 기준 그룹핑 — 미융합 count가 0인 그룹은 제외
  const grouped = useMemo<InventoryGroup[]>(() => {
    const map = new Map<string, InventoryGroup>()
    for (const item of inventory) {
      if (item.isFused) continue // 이미 융합된 doc은 집계에서 제외
      const existing = map.get(item.monsterId)
      if (existing) {
        existing.totalCount += item.count
        existing.unfusedDocIds.push(item.id)
      } else {
        map.set(item.monsterId, {
          monsterId: item.monsterId,
          monsterName: item.monsterName,
          monsterImageUrl: item.monsterImageUrl,
          category: item.category,
          shopId: item.shopId,
          shopName: item.shopName,
          totalCount: item.count,
          unfusedDocIds: [item.id],
        })
      }
    }
    // totalCount가 0이면 노출하지 않음 (안전장치)
    return Array.from(map.values()).filter((g) => g.totalCount > 0)
  }, [inventory])

  const clearMyInventory = async () => {
    if (!window.confirm('정말로 도감의 몬스터들을 전부 삭제하고 초기화하시겠습니까?')) return
    setIsClearing(true)
    try {
      const q = query(collection(db, 'user_inventory'), where('userId', '==', userId))
      const snapshot = await getDocs(q)
      await Promise.all(snapshot.docs.map((d) => deleteDoc(doc(db, 'user_inventory', d.id))))
      sessionStorage.removeItem('DEMO_TOWISO_COUNT')
      alert('도감이 깨끗하게 비워졌습니다! 처음부터 다시 테스트해보세요. 🧼')
    } catch (err) {
      console.error('도감 초기화 에러:', err)
      alert('초기화 중 오류가 발생했습니다.')
    } finally {
      setIsClearing(false)
    }
  }

  const handleFusion = async (group: InventoryGroup) => {
    if (group.totalCount < FUSION_REQUIRED || fusingId) return
    setFusingId(group.monsterId)
    try {
      await addDoc(collection(db, 'coupons'), {
        userId,
        shopId: group.shopId,
        shopName: group.shopName || '상점',
        title: `${group.monsterName} 융합 쿠폰 — 특별 할인`,
        category: group.category,
        isUsed: false,
        createdAt: serverTimestamp(),
      })
      // 그룹의 미융합 doc 전부 isFused=true 처리 → 카드에서 사라짐
      await Promise.all(
        group.unfusedDocIds.map((id) => updateDoc(doc(db, 'user_inventory', id), { isFused: true }))
      )
      setTab('coupons')
    } catch (err) {
      console.error('fusion error', err)
      alert('융합 중 오류가 발생했습니다.')
    } finally {
      setFusingId(null)
    }
  }

  const unusedCount = coupons.filter((c) => !c.isUsed).length

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-5 pt-12 pb-4 shrink-0 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-gray-900">도감 & 쿠폰함</h1>
          <p className="text-sm text-gray-400 mt-0.5">포획한 몬스터와 발급된 쿠폰을 확인하세요</p>
        </div>
        <button
          onClick={clearMyInventory}
          disabled={isClearing}
          className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-1.5 font-bold hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50 shrink-0 mt-1"
        >
          {isClearing ? '청소중...' : '🧹 도감 초기화'}
        </button>
      </header>

      <nav className="flex px-5 gap-1 shrink-0 border-b border-gray-100">
        {([
          { key: 'monsters', label: '도감', badge: grouped.length },
          { key: 'coupons', label: '쿠폰함', badge: unusedCount },
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
        {tab === 'monsters' && (
          <div className="p-4 flex flex-col gap-2.5">
            {grouped.length === 0 ? (
              <EmptyState emoji="🐾" message="아직 잡은 몬스터가 없어요!" sub="지도로 나가서 몬스터를 포획해보세요." />
            ) : (
              grouped.map((group) => (
                <MonsterCard
                  key={group.monsterId}
                  group={group}
                  onFuse={handleFusion}
                  isFusing={fusingId === group.monsterId}
                />
              ))
            )}
          </div>
        )}

        {tab === 'coupons' && (
          <div className="p-4 flex flex-col gap-2.5">
            {coupons.length === 0 ? (
              <EmptyState emoji="🎟️" message="보유한 쿠폰이 없어요!" sub="몬스터 3마리를 융합하면 쿠폰이 발급됩니다." />
            ) : (
              coupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} onClick={() => setSelectedCoupon(coupon)} />
              ))
            )}
          </div>
        )}
      </div>

      {selectedCoupon && (
        <div
          className="absolute inset-0 bg-black/30 flex items-end z-20"
          onClick={() => setSelectedCoupon(null)}
        >
          <div
            className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
            <div className="text-center">
              <h2 className="font-black text-lg text-gray-900">{selectedCoupon.title}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{selectedCoupon.shopName}</p>
            </div>
            {selectedCoupon.isUsed ? (
              <div className="bg-gray-50 rounded-2xl px-12 py-8 flex flex-col items-center gap-2 border border-gray-100">
                <span className="text-5xl">✅</span>
                <p className="font-bold text-gray-400 text-sm mt-1">사용 완료된 쿠폰입니다</p>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 rounded-2xl p-5 border-2 border-amber-200">
                  <QRCodeSVG value={selectedCoupon.id} size={180} />
                </div>
                <p className="text-xs text-gray-400 text-center">이 QR 코드를 상인에게 보여주세요</p>
              </>
            )}
            <p className="text-xs text-gray-300">쿠폰 ID: {selectedCoupon.id.slice(0, 12)}...</p>
            <button
              onClick={() => setSelectedCoupon(null)}
              className="w-full py-3.5 rounded-2xl bg-gray-100 font-semibold text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MonsterCard({
  group,
  onFuse,
  isFusing,
}: {
  group: InventoryGroup
  onFuse: (group: InventoryGroup) => void
  isFusing: boolean
}) {
  const canFuse = group.totalCount >= FUSION_REQUIRED
  const displayCount = Math.min(group.totalCount, FUSION_REQUIRED)

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
      <div className="w-14 h-14 rounded-xl border border-amber-200 overflow-hidden bg-amber-50 flex items-center justify-center shrink-0">
        {group.monsterImageUrl ? (
          <img src={group.monsterImageUrl} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">🐾</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 truncate">{group.monsterName}</p>
        <p className="text-xs text-gray-400">{group.category}</p>
        <div className="flex items-center gap-1 mt-1.5">
          {Array.from({ length: FUSION_REQUIRED }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-black ${
                i < displayCount ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-300'
              }`}
            >
              {i < displayCount ? '★' : '☆'}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-1">{group.totalCount}/{FUSION_REQUIRED}</span>
        </div>
      </div>

      {canFuse && (
        <button
          onClick={() => onFuse(group)}
          disabled={isFusing}
          className="bg-amber-400 hover:bg-amber-500 active:scale-95 transition-all text-gray-900 text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50 shrink-0"
        >
          {isFusing ? '융합중...' : '✨ 융합!'}
        </button>
      )}
    </div>
  )
}

function CouponCard({ coupon, onClick }: { coupon: Coupon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
          {coupon.createdAt instanceof Date ? coupon.createdAt.toLocaleDateString('ko-KR') : ''}
        </p>
      </div>
      {!coupon.isUsed && (
        <span className="text-xs bg-green-50 text-green-600 font-semibold px-2 py-1 rounded-full border border-green-100 shrink-0">
          미사용
        </span>
      )}
    </button>
  )
}

function EmptyState({ emoji, message, sub }: { emoji: string; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="font-bold text-gray-600 mt-2">{message}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  )
}
